import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SystemDB } from '../system.ts';
import { Workspaces } from '../workspaces.ts';
import { accountRoutes } from '../account.ts';
import { apiRoutes } from '../api.ts';
import { authenticate } from '../auth.ts';
import { HttpError, Router, type Ctx } from '../http.ts';

/** A tiny in-process client: route lookup, auth and the handler, without a socket. */
export function harness() {
  const dir = mkdtempSync(join(tmpdir(), 'throughline-acct-'));
  const sys = new SystemDB(dir);
  const ws = new Workspaces(sys, dir);
  const router = new Router();
  accountRoutes(router, sys, ws);
  apiRoutes(router, sys, ws);
  const call = async (method: string, path: string, opts: { session?: string; workspace?: string; body?: unknown } = {}) => {
    const url = new URL(`http://localhost${path}`);
    const hit = router.match(method, url.pathname);
    if (!hit) throw new Error(`no route ${method} ${path}`);
    const headers: Record<string, string> = {};
    if (opts.session) headers.cookie = `tl_session=${opts.session}`;
    if (opts.workspace) headers['x-tl-workspace'] = opts.workspace;
    const res: any = { headers: {} as Record<string, string | string[]>, setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; } };
    const ctx = { req: { headers, socket: {} } as any, res, url, params: hit.params, body: async () => opts.body ?? {} } as Ctx;
    authenticate(ctx, hit.route.need, sys, ws);
    try {
      return { status: 200, body: await hit.route.handler(ctx) as any, headers: res.headers };
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, body: { error: err.message } as any, headers: res.headers };
      throw err;
    }
  };
  const user = (name: string) => {
    const u = sys.createUser({ email: `${name}@example.com`, name, password: 'correct horse battery' });
    return { user: u, session: sys.createSession(u.id) };
  };
  return { dir, sys, ws, call, user, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('reset links: admins can reset members they fully administer, once, then sessions end', async () => {
  const h = harness();
  try {
    const owner = h.user('olga');
    const admin = h.user('ade');
    const member = h.user('mo');
    const team = h.ws.create({ name: 'Team', kind: 'team', owner: owner.user, sample: 'empty' });
    h.sys.addMember(team.id, admin.user.id, 'admin');
    h.sys.addMember(team.id, member.user.id, 'editor');

    // The admin can reset the editor…
    const r1 = await h.call('POST', `/api/admin/members/${member.user.id}/reset-link`, { session: admin.session, workspace: team.id });
    assert.equal(r1.status, 200);
    // …but not the owner.
    const r2 = await h.call('POST', `/api/admin/members/${owner.user.id}/reset-link`, { session: admin.session, workspace: team.id });
    assert.equal(r2.status, 403);
    // Not once the editor also belongs to a workspace the admin doesn't run.
    const elsewhere = h.ws.create({ name: 'Elsewhere', kind: 'team', owner: h.user('zed').user, sample: 'empty' });
    h.sys.addMember(elsewhere.id, member.user.id, 'viewer');
    const r3 = await h.call('POST', `/api/admin/members/${member.user.id}/reset-link`, { session: admin.session, workspace: team.id });
    assert.equal(r3.status, 403);
    assert.match(r3.body.error, /npm run reset-password/);

    // The first link still works (issued before) and signs the member in with a new password.
    const info = await h.call('GET', `/api/password-reset/${r1.body.token}`);
    assert.equal(info.body.email, 'mo@example.com');
    const short = await h.call('POST', `/api/password-reset/${r1.body.token}`, { body: { password: 'short' } });
    assert.equal(short.status, 422);
    const ok = await h.call('POST', `/api/password-reset/${r1.body.token}`, { body: { password: 'a brand new password' } });
    assert.equal(ok.status, 200);
    assert.ok(h.sys.checkPassword('mo@example.com', 'a brand new password'));
    assert.equal(h.sys.session(member.session), undefined, 'old sessions are signed out');
    const again = await h.call('POST', `/api/password-reset/${r1.body.token}`, { body: { password: 'another new password' } });
    assert.equal(again.status, 422, 'links work once');
  } finally { h.done(); }
});

test('a newer reset link replaces older ones', () => {
  const h = harness();
  try {
    const u = h.user('pat').user;
    const a = h.sys.createResetLink(u.id, 'operator');
    const b = h.sys.createResetLink(u.id, 'operator');
    assert.equal(h.sys.resetFor(a.token), undefined);
    assert.equal(h.sys.resetFor(b.token)?.id, u.id);
  } finally { h.done(); }
});

test('download my data includes account, workspaces, comments and activity', async () => {
  const h = harness();
  try {
    const me = h.user('dee');
    const w = h.ws.create({ name: 'Mine', kind: 'personal', owner: me.user, sample: 'empty' });
    await h.call('POST', '/api/entities', { session: me.session, workspace: w.id, body: { type: 'decision', title: 'Go with Workday' } });
    const req = h.ws.store(w.id).byType('decision')[0];
    await h.call('POST', '/api/entities', { session: me.session, workspace: w.id, body: { type: 'comment', entityId: req.id, body: 'Agreed in steering' } });
    const r = await h.call('GET', '/api/me/export', { session: me.session });
    assert.match(String(r.headers['content-disposition']), /attachment/);
    assert.equal(r.body.account.email, 'dee@example.com');
    assert.equal(r.body.workspaces[0].comments[0].body, 'Agreed in steering');
    assert.ok(r.body.workspaces[0].activity.some((a: { summary: string }) => /Created decision/.test(a.summary)));
    assert.equal(r.body.workspaces[0].stakeholderRecord.userId, me.user.id);
  } finally { h.done(); }
});

test('deleting an account removes solo workspaces and anonymises shared ones', async () => {
  const h = harness();
  try {
    const owner = h.user('ola');
    const leaver = h.user('lee');
    const team = h.ws.create({ name: 'Team', kind: 'team', owner: owner.user, sample: 'empty' });
    h.sys.addMember(team.id, leaver.user.id, 'editor');
    h.ws.linkMember(team.id, leaver.user);
    const solo = h.ws.create({ name: 'Lee personal', kind: 'personal', owner: leaver.user, sample: 'empty' });
    const store = h.ws.store(team.id);
    const d = store.create('decision', { title: 'Retire the chatbot' }, { id: leaver.user.id, name: 'lee' });
    await h.call('POST', '/api/entities', { session: leaver.session, workspace: team.id, body: { type: 'comment', entityId: d.id, body: 'Ping @ola', mentions: [owner.user.id] } });

    const wrong = await h.call('DELETE', '/api/me', { session: leaver.session, body: { password: 'nope' } });
    assert.equal(wrong.status, 401);
    const gone = await h.call('DELETE', '/api/me', { session: leaver.session, body: { password: 'correct horse battery' } });
    assert.equal(gone.status, 200);

    assert.equal(h.sys.userByEmail('lee@example.com'), undefined);
    assert.equal(h.sys.workspace(solo.id), undefined, 'the solo workspace is gone');
    assert.ok(!existsSync(join(h.dir, 'workspaces', `${solo.id}.db`)), 'and so is its file');
    const comment = store.byType('comment')[0];
    assert.equal(comment.author, 'Former member');
    assert.equal(comment.authorId, undefined);
    assert.ok(store.activity({ limit: 50 }).every((a) => a.actor !== 'lee' && a.actorId !== leaver.user.id), 'no trace in the trail');
    assert.ok(!store.byType('stakeholder').some((s) => s.userId === leaver.user.id));
    assert.equal(h.sys.members(team.id).length, 1);
  } finally { h.done(); }
});

test('the only owner of a shared workspace must hand it over before leaving', async () => {
  const h = harness();
  try {
    const owner = h.user('solo');
    const team = h.ws.create({ name: 'Shared', kind: 'team', owner: owner.user, sample: 'empty' });
    h.sys.addMember(team.id, h.user('other').user.id, 'editor');
    const r = await h.call('DELETE', '/api/me', { session: owner.session, body: { password: 'correct horse battery' } });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /only owner of “Shared”/);
  } finally { h.done(); }
});
