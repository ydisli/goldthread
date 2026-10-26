import { test } from 'node:test';

process.env.GT_DEMO = '1';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { redact } from '../ai.ts';
import { Store, ValidationError } from '../db.ts';
import { SystemDB, hashPassword, verifyPassword } from '../system.ts';
import { Workspaces } from '../workspaces.ts';
import { ensureDemo, DEMO_WORKSPACE_ID } from '../demo.ts';
import { authenticate } from '../auth.ts';
import { HttpError, type Ctx, type WCtx } from '../http.ts';
import { mcpHandler } from '../mcp.ts';
import { Graph } from '../../core/graph.ts';
import { dailyBrief } from '../../core/engines/brief.ts';
import { findContradictions } from '../../core/engines/contradictions.ts';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'goldthread-test-'));
}

function fakeCtx(headers: Record<string, string> = {}, body: unknown = {}): Ctx & { sent?: { status: number; body: string } } {
  const res: any = {
    headers: {} as Record<string, string>, statusCode: 0, body: '',
    setHeader(k: string, v: string) { this.headers[k] = v; },
    writeHead(status: number) { this.statusCode = status; return this; },
    end(b?: string) { this.body = b ?? ''; },
  };
  return { req: { headers, socket: {} } as any, res, url: new URL('http://localhost/api/x'), params: {}, body: async () => body };
}

test('redact strips emails, phone numbers and IBANs before model calls', () => {
  const out = redact('Mail jane.doe@contoso.com or call +44 20 7946 0958, IBAN DE89 3704 0044 0532 0130 00.');
  assert.ok(!out.includes('jane.doe'));
  assert.ok(!out.includes('7946'));
  assert.ok(!out.includes('DE89'));
});

test('store: keys, versioning, soft delete with attributed activity', () => {
  const s = new Store(':memory:');
  const a = s.create('requirement', { title: 'Export', statement: 'v1', status: 'approved' }, { id: 'u1', name: 'Ana' });
  const b = s.create('requirement', { title: 'Import' }, 'tester');
  assert.equal(a.key, 'REQ-1');
  assert.equal(b.key, 'REQ-2');
  const a2 = s.update(a.id, { statement: 'v2' }, { id: 'u1', name: 'Ana' });
  assert.equal(a2.version, 2);
  s.delete(b.id, 'tester');
  assert.equal(s.get(b.id), undefined);
  const log = s.activity({ limit: 10 });
  assert.deepEqual(log.map((x) => x.action), ['delete', 'update', 'create', 'create']);
  assert.equal(log[1].actorId, 'u1');
  assert.throws(() => s.create('stakeholder', { power: 9 }), ValidationError);
  assert.deepEqual(s.trash().map((e) => e.id), [b.id]);
  const back = s.restore(b.id, 'tester');
  assert.equal(back?.key, 'REQ-2');
  assert.equal(s.get(b.id)?.title, 'Import');
  assert.equal(s.trash().length, 0);
  assert.equal(s.restore(b.id), undefined, 'only deleted items can be restored');
  assert.match(s.activity({ entityId: b.id, limit: 1 })[0].summary, /^Restored requirement/);
});

test('passwords are salted scrypt hashes', () => {
  const h = hashPassword('correct horse battery');
  assert.notEqual(h, hashPassword('correct horse battery'));
  assert.ok(verifyPassword('correct horse battery', h));
  assert.ok(!verifyPassword('wrong', h));
});

test('system: users, sessions, invites, tokens, encrypted AI keys', () => {
  const dir = tempDir();
  try {
    const sys = new SystemDB(dir);
    const u = sys.createUser({ email: 'Ana@Example.com', name: 'Ana', password: 'a-long-password' });
    assert.equal(u.email, 'ana@example.com');
    assert.throws(() => sys.createUser({ email: 'ana@example.com', name: 'Dup' }), /already exists/);
    assert.ok(sys.checkPassword('ana@example.com', 'a-long-password'));
    assert.equal(sys.checkPassword('ana@example.com', 'nope'), undefined);
    const ws = sys.createWorkspace({ name: 'Team', kind: 'team', createdBy: u.id });
    sys.addMember(ws.id, u.id, 'owner');
    const token = sys.createSession(u.id, ws.id);
    assert.equal(sys.session(token)?.userId, u.id);
    const { invite, token: inviteToken } = sys.createInvite({ workspaceId: ws.id, email: 'bo@example.com', role: 'editor', createdBy: u.id });
    assert.equal(sys.inviteByToken(inviteToken)?.id, invite.id);
    assert.equal(sys.invites(ws.id).length, 1);
    const api = sys.createToken({ userId: u.id, workspaceId: ws.id, name: 'CLI', scope: 'read' });
    assert.match(api.token, /^gt_[0-9a-f]{8}_/);
    assert.equal(sys.resolveToken(api.token)?.scope, 'read');
    sys.revokeToken(u.id, api.record.id);
    assert.equal(sys.resolveToken(api.token), undefined);
    sys.setAiConfig(ws.id, { provider: 'openai-compatible', model: 'llama3.1', baseUrl: 'http://localhost:11434/v1', apiKey: 'secret-key' }, u.id);
    assert.equal(sys.aiConfig(ws.id)?.apiKey, 'secret-key');
    sys.setAiConfig(ws.id, { provider: 'openai-compatible', model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' }, u.id);
    assert.equal(sys.aiConfig(ws.id)?.apiKey, 'secret-key', 'omitting the key keeps it');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('demo workspace: IT sample with linked accounts, consistent references, live brief', () => {
  const dir = tempDir();
  try {
    const sys = new SystemDB(dir);
    const ws = new Workspaces(sys, dir);
    ensureDemo(sys, ws);
    const store = ws.store(DEMO_WORKSPACE_ID);
    const all = store.all();
    assert.ok(all.length > 300, `only ${all.length} entities`);
    const ids = new Set(all.map((e) => e.id));
    const dangling: string[] = [];
    for (const e of all) for (const [k, v] of Object.entries(e)) {
      if (/Ids?$/.test(k) && !['id', 'mapStepId', 'sliceId', 'userId', 'memberUserIds', 'authorId'].includes(k)) {
        for (const id of Array.isArray(v) ? v : [v]) if (typeof id === 'string' && !ids.has(id)) dangling.push(`${e.id}.${k}=${id}`);
      }
    }
    assert.deepEqual(dangling, []);
    const members = sys.members(DEMO_WORKSPACE_ID);
    assert.equal(members.length, 5);
    for (const m of members) assert.ok(store.byType('stakeholder').some((s) => s.userId === m.userId), `${m.user.name} has a stakeholder record`);
    const alex = members.find((m) => m.role === 'owner')!.user;
    const g = new Graph(all, { meUserId: alex.id });
    assert.equal(g.me?.name, 'Alex Rivera');
    const brief = dailyBrief(g, new Date());
    assert.ok(brief.some((i) => i.id.startsWith('appr-me-')), 'owner has approvals waiting');
    assert.ok(brief.some((i) => i.id.startsWith('com-')), 'promises at risk');
    assert.ok(findContradictions(store.byType('requirement')).length >= 2, 'the sample carries deliberate contradictions');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auth: roles are enforced per workspace and read tokens cannot write', () => {
  const dir = tempDir();
  try {
    const sys = new SystemDB(dir);
    const ws = new Workspaces(sys, dir);
    ensureDemo(sys, ws);
    const viewer = sys.members(DEMO_WORKSPACE_ID).find((m) => m.role === 'viewer')!.user;
    const editor = sys.members(DEMO_WORKSPACE_ID).find((m) => m.role === 'editor')!.user;
    const session = sys.createSession(viewer.id, DEMO_WORKSPACE_ID);
    const ctx = fakeCtx({ cookie: `gt_session=${session}` });
    authenticate(ctx, 'viewer', sys, ws);
    assert.equal(ctx.ws?.role, 'viewer');
    assert.throws(() => authenticate(fakeCtx({ cookie: `gt_session=${session}` }), 'editor', sys, ws), (e: unknown) => e instanceof HttpError && e.status === 403);
    assert.throws(() => authenticate(fakeCtx({}), 'viewer', sys, ws), (e: unknown) => e instanceof HttpError && e.status === 401);
    const read = sys.createToken({ userId: editor.id, workspaceId: DEMO_WORKSPACE_ID, name: 'r', scope: 'read' }).token;
    assert.throws(() => authenticate(fakeCtx({ authorization: `Bearer ${read}` }), 'editor', sys, ws), /read-only/);
    const write = sys.createToken({ userId: editor.id, workspaceId: DEMO_WORKSPACE_ID, name: 'w', scope: 'write' }).token;
    const c2 = fakeCtx({ authorization: `Bearer ${write}` });
    authenticate(c2, 'editor', sys, ws);
    assert.equal(c2.ws?.role, 'editor');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MCP: initialize, list tools, call search and capture', async () => {
  const dir = tempDir();
  try {
    const sys = new SystemDB(dir);
    const ws = new Workspaces(sys, dir);
    ensureDemo(sys, ws);
    const owner = sys.members(DEMO_WORKSPACE_ID).find((m) => m.role === 'owner')!.user;
    const token = sys.createToken({ userId: owner.id, workspaceId: DEMO_WORKSPACE_ID, name: 'mcp', scope: 'write' }).token;
    const call = async (body: unknown) => {
      const ctx = fakeCtx({ authorization: `Bearer ${token}` }, body);
      authenticate(ctx, 'viewer', sys, ws);
      await mcpHandler(ctx as WCtx, ctx.res);
      return JSON.parse((ctx.res as any).body || 'null');
    };
    const init = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    assert.equal(init.result.serverInfo.name, 'goldthread');
    const list = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = list.result.tools.map((t: { name: string }) => t.name);
    for (const n of ['search', 'get_item', 'daily_brief', 'prepare_meeting', 'forecast', 'capture', 'create_item', 'check_process', 'guide_contents', 'read_guide']) assert.ok(names.includes(n), n);
    const search = await call({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search', arguments: { query: 'leaver deprovisioning' } } });
    assert.match(search.result.content[0].text, /REQ-5/);
    const item = await call({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_item', arguments: { id_or_key: 'REQ-4' } } });
    assert.equal(item.result.structuredContent.key, 'REQ-4');
    const cap = await call({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'capture', arguments: { kind: 'evidence', text: 'Contractors need laptops too', account: 'IT' } } });
    assert.equal(cap.result.structuredContent.created.type, 'evidence');
    const chapter = await call({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'read_guide', arguments: { id: 'forecasting' } } });
    assert.equal(chapter.result.structuredContent.title, 'Planning and forecasting honestly');
    assert.ok(chapter.result.structuredContent.quiz.every((q: { answer?: string }) => q.answer));
    const bad = await call({ jsonrpc: '2.0', id: 6, method: 'nope' });
    assert.equal(bad.error.code, -32601);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
