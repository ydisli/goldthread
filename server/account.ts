import { HttpError, type Router, type Ctx, type UCtx, type WCtx } from './http.ts';
import { actorOf, checkRateLimit, clearFailures, clearSessionCookie, recordFailure, setSessionCookie } from './auth.ts';
import { broadcast } from './live.ts';
import { isEmail, normalizeEmail, ROLE_RANK, ROLES, validatePassword, type AiProvider, type Persona, type Role, type SystemDB, type User } from './system.ts';
import type { Sample, Workspaces } from './workspaces.ts';
import { demoEnabled } from './demo.ts';
import { MCP_TOOL_NAMES } from './mcp.ts';
import { resolve } from 'node:path';

const signupPolicy = () => (process.env.TL_SIGNUP === 'invite-only' ? 'invite-only' : 'open');

function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, title: u.title, demo: u.demo, prefs: u.prefs };
}

function originOf(ctx: Ctx): string {
  const proto = ctx.req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${ctx.req.headers.host}`;
}

const SAMPLES: Sample[] = ['it', 'saas', 'empty'];

export function accountRoutes(r: Router, sys: SystemDB, workspaces: Workspaces) {
  // ---------------- sign-in state ----------------

  r.add('GET', '/api/auth/state', 'none', (ctx) => {
    const user = ctx.user;
    const list = user ? sys.workspacesOf(user.id) : [];
    const requested = ctx.req.headers['x-tl-workspace'];
    const current = list.find((w) => w.id === requested) ?? list.find((w) => w.id === ctx.sessionWorkspaceId) ?? list[0];
    return {
      user: user ? publicUser(user) : null,
      workspaces: list.map((w) => ({ id: w.id, name: w.name, kind: w.kind, demo: w.demo, role: w.role })),
      current: current ? { id: current.id, name: current.name, kind: current.kind, demo: current.demo, role: current.role } : null,
      signup: signupPolicy(),
      demo: demoEnabled() ? sys.demoUsers().map((u) => ({ id: u.id, name: u.name, title: u.title, role: u.role })) : [],
      firstRun: sys.countUsers() === 0,
    };
  });

  r.add('POST', '/api/auth/login', 'none', async (ctx) => {
    const { email, password } = await ctx.body();
    const key = `${ctx.req.socket.remoteAddress}|${normalizeEmail(email)}`;
    checkRateLimit(key);
    const user = sys.checkPassword(String(email ?? ''), String(password ?? ''));
    if (!user) {
      recordFailure(key);
      throw new HttpError(401, 'Email or password is not right.');
    }
    clearFailures(key);
    const first = sys.workspacesOf(user.id)[0];
    setSessionCookie(ctx.req, ctx.res, sys.createSession(user.id, first?.id));
    return { ok: true, workspaceId: first?.id };
  });

  r.add('POST', '/api/auth/demo', 'none', async (ctx) => {
    if (!demoEnabled()) throw new HttpError(404, 'Demo mode is off.');
    const { userId } = await ctx.body();
    const user = sys.demoUsers().find((u) => u.id === userId);
    if (!user) throw new HttpError(404, 'Unknown demo account.');
    const first = sys.workspacesOf(user.id)[0];
    setSessionCookie(ctx.req, ctx.res, sys.createSession(user.id, first?.id));
    return { ok: true, workspaceId: first?.id };
  });

  r.add('POST', '/api/auth/signup', 'none', async (ctx) => {
    if (signupPolicy() !== 'open') throw new HttpError(403, 'Sign-up is invite-only on this server. Ask an admin for an invite link.');
    const b = await ctx.body();
    const name = String(b.name ?? '').trim();
    const email = normalizeEmail(b.email);
    if (!name) throw new HttpError(422, 'Tell us your name.');
    if (!isEmail(email)) throw new HttpError(422, 'Enter a valid email address.');
    const pwErr = validatePassword(b.password);
    if (pwErr) throw new HttpError(422, pwErr);
    if (sys.userByEmail(email)) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
    const persona: Persona = ['po', 'ba', 'both'].includes(b.persona) ? b.persona : 'both';
    const sample: Sample = SAMPLES.includes(b.sample) ? b.sample : 'it';
    const user = sys.createUser({ email, name, password: b.password, title: b.title ? String(b.title).slice(0, 80) : persona === 'ba' ? 'Business Analyst' : 'Product Owner', prefs: { persona } });
    const ws = workspaces.create({ name: String(b.workspaceName ?? '').trim() || `${name.split(' ')[0]}'s workspace`, kind: 'personal', owner: user, sample });
    setSessionCookie(ctx.req, ctx.res, sys.createSession(user.id, ws.id));
    return { ok: true, workspaceId: ws.id };
  });

  r.add('POST', '/api/auth/logout', 'none', (ctx) => {
    if (ctx.sessionHash) sys.deleteSession(ctx.sessionHash);
    clearSessionCookie(ctx.res);
    return { ok: true };
  });

  // ---------------- invites (public side) ----------------

  const openInvite = (token: string) => {
    const inv = sys.inviteByToken(token);
    if (!inv || inv.revoked) throw new HttpError(404, 'This invite link is not valid. Ask for a new one.');
    if (inv.acceptedAt) throw new HttpError(410, 'This invite has already been used.');
    if (inv.expiresAt < new Date().toISOString()) throw new HttpError(410, 'This invite has expired. Ask for a new one.');
    const ws = sys.workspace(inv.workspaceId);
    if (!ws) throw new HttpError(410, 'This workspace no longer exists.');
    return { inv, ws };
  };

  r.add('GET', '/api/invites/:token', 'none', (ctx) => {
    const { inv, ws } = openInvite(ctx.params.token);
    return { workspaceName: ws.name, email: inv.email, role: inv.role, invitedBy: sys.user(inv.createdBy)?.name, accountExists: !!sys.userByEmail(inv.email), signedInAs: ctx.user?.email ?? null };
  });

  r.add('POST', '/api/invites/:token/accept', 'none', async (ctx) => {
    const { inv, ws } = openInvite(ctx.params.token);
    const b = await ctx.body();
    let user = ctx.user;
    if (user && user.email !== inv.email) throw new HttpError(409, `This invite is for ${inv.email}. Sign out first, or ask for an invite to ${user.email}.`);
    if (!user) {
      const existing = sys.userByEmail(inv.email);
      if (existing) {
        user = sys.checkPassword(inv.email, String(b.password ?? ''));
        if (!user) throw new HttpError(401, 'Sign in with your existing password to accept.');
      } else {
        const name = String(b.name ?? '').trim();
        if (!name) throw new HttpError(422, 'Tell us your name.');
        const pwErr = validatePassword(b.password);
        if (pwErr) throw new HttpError(422, pwErr);
        user = sys.createUser({ email: inv.email, name, password: b.password, prefs: { persona: ['po', 'ba', 'both'].includes(b.persona) ? b.persona : 'both' } });
      }
    }
    sys.addMember(ws.id, user.id, inv.role);
    sys.markInviteAccepted(inv.id, user.id);
    workspaces.linkMember(ws.id, user);
    const store = workspaces.store(ws.id);
    for (const teamId of inv.teamIds) {
      const team = store.get(teamId);
      if (team?.type === 'team') store.update(team.id, { memberUserIds: [...new Set([...(team.memberUserIds ?? []), user.id])] }, { id: user.id, name: user.name });
    }
    if (ctx.sessionHash) sys.setSessionWorkspace(ctx.sessionHash, ws.id);
    else setSessionCookie(ctx.req, ctx.res, sys.createSession(user.id, ws.id));
    broadcast(ws.id, [{ op: 'members' }]);
    return { ok: true, workspaceId: ws.id };
  });

  // ---------------- me ----------------

  r.add('GET', '/api/me', 'user', (ctx: UCtx) => publicUser(ctx.user));

  r.add('PATCH', '/api/me', 'user', async (ctx: UCtx) => {
    const b = await ctx.body();
    const prefs = b.prefs && typeof b.prefs === 'object' ? b.prefs : undefined;
    sys.updateUser(ctx.user.id, { name: typeof b.name === 'string' ? b.name.slice(0, 80) : undefined, title: typeof b.title === 'string' ? b.title.slice(0, 80) : undefined, prefs });
    const u = sys.user(ctx.user.id)!;
    // Keep linked stakeholder records in sync with the account name.
    if (typeof b.name === 'string' || typeof b.title === 'string') {
      for (const w of sys.workspacesOf(u.id)) {
        const st = workspaces.store(w.id);
        const me = st.byType('stakeholder').find((s) => s.userId === u.id);
        if (me && (me.name !== u.name || (u.title && me.title !== u.title))) st.update(me.id, { name: u.name, ...(u.title ? { title: u.title } : {}) }, { id: u.id, name: u.name });
      }
    }
    return publicUser(u);
  });

  r.add('POST', '/api/me/password', 'user', async (ctx: UCtx) => {
    const { current, next } = await ctx.body();
    if (!sys.checkPassword(ctx.user.email, String(current ?? ''))) throw new HttpError(401, 'Your current password is not right.');
    const err = validatePassword(next);
    if (err) throw new HttpError(422, err);
    sys.setPassword(ctx.user.id, next);
    setSessionCookie(ctx.req, ctx.res, sys.createSession(ctx.user.id, sys.workspacesOf(ctx.user.id)[0]?.id));
    return { ok: true };
  });

  r.add('GET', '/api/me/tokens', 'user', (ctx: UCtx) => sys.tokens(ctx.user.id).map((t) => ({ ...t, workspaceName: sys.workspace(t.workspaceId)?.name })));

  r.add('POST', '/api/me/tokens', 'viewer', async (ctx: WCtx) => {
    const { name, scope } = await ctx.body();
    if (ctx.via === 'token') throw new HttpError(403, 'Create tokens from the web app.');
    const s: 'read' | 'write' = scope === 'write' && ROLE_RANK[ctx.ws.role] >= ROLE_RANK.editor ? 'write' : 'read';
    const { token, record } = sys.createToken({ userId: ctx.user.id, workspaceId: ctx.ws.workspace.id, name: String(name ?? 'Token').slice(0, 60), scope: s });
    return { token, ...record, workspaceName: ctx.ws.workspace.name };
  });

  r.add('DELETE', '/api/me/tokens/:id', 'user', (ctx: UCtx) => {
    sys.revokeToken(ctx.user.id, ctx.params.id);
    return { ok: true };
  });

  /** Where the local bridges live, so the web app can show copy-paste configs. */
  r.add('GET', '/api/connect-info', 'user', () => ({
    mcpBridge: resolve('mcp/stdio.ts'),
    cli: resolve('cli/tl.ts'),
    extension: resolve('extension'),
    mcpTools: MCP_TOOL_NAMES,
  }));

  // ---------------- workspaces ----------------

  r.add('GET', '/api/workspaces', 'user', (ctx: UCtx) => sys.workspacesOf(ctx.user.id).map((w) => ({ id: w.id, name: w.name, kind: w.kind, demo: w.demo, role: w.role, members: sys.members(w.id).length })));

  r.add('POST', '/api/workspaces', 'user', async (ctx: UCtx) => {
    const b = await ctx.body();
    const name = String(b.name ?? '').trim();
    if (!name) throw new HttpError(422, 'Give the workspace a name.');
    const sample: Sample = SAMPLES.includes(b.sample) ? b.sample : 'empty';
    const ws = workspaces.create({ name, kind: b.kind === 'personal' ? 'personal' : 'team', owner: ctx.user, sample });
    if (ctx.sessionHash) sys.setSessionWorkspace(ctx.sessionHash, ws.id);
    return { id: ws.id, name: ws.name, kind: ws.kind, role: 'owner' };
  });

  r.add('POST', '/api/session/workspace', 'user', async (ctx: UCtx) => {
    const { workspaceId } = await ctx.body();
    if (!sys.membership(workspaceId, ctx.user.id)) throw new HttpError(403, 'You are not a member of that workspace.');
    if (ctx.sessionHash) sys.setSessionWorkspace(ctx.sessionHash, workspaceId);
    return { ok: true };
  });

  // ---------------- admin: members, invites, workspace, AI ----------------

  r.add('GET', '/api/admin/members', 'admin', (ctx: WCtx) => {
    const store = ctx.ws.store;
    const teams = store.byType('team');
    return sys.members(ctx.ws.workspace.id).map((m) => ({
      userId: m.userId, name: m.user.name, email: m.user.email, title: m.user.title, status: m.user.status, demo: m.user.demo, role: m.role, joinedAt: m.joinedAt,
      teamIds: teams.filter((t) => (t.memberUserIds ?? []).includes(m.userId)).map((t) => t.id),
    }));
  });

  const assertRoleChange = (ctx: WCtx, targetUserId: string, nextRole: Role | null) => {
    const target = sys.membership(ctx.ws.workspace.id, targetUserId);
    if (!target) throw new HttpError(404, 'Not a member.');
    const actingOwner = ctx.ws.role === 'owner';
    if (!actingOwner && (target.role === 'owner' || target.role === 'admin' || nextRole === 'owner' || nextRole === 'admin')) {
      throw new HttpError(403, 'Only owners can change admins and owners.');
    }
    const demotingOwner = target.role === 'owner' && nextRole !== 'owner';
    if (demotingOwner && sys.owners(ctx.ws.workspace.id) <= 1) throw new HttpError(409, 'A workspace needs at least one owner. Make someone else owner first.');
  };

  r.add('PATCH', '/api/admin/members/:userId', 'admin', async (ctx: WCtx) => {
    const { role } = await ctx.body();
    if (!ROLES.includes(role)) throw new HttpError(422, 'Unknown role.');
    assertRoleChange(ctx, ctx.params.userId, role);
    sys.setRole(ctx.ws.workspace.id, ctx.params.userId, role);
    broadcast(ctx.ws.workspace.id, [{ op: 'members' }]);
    return { ok: true };
  });

  r.add('DELETE', '/api/admin/members/:userId', 'admin', (ctx: WCtx) => {
    assertRoleChange(ctx, ctx.params.userId, null);
    sys.removeMember(ctx.ws.workspace.id, ctx.params.userId);
    // Remove from teams; their stakeholder record stays (history).
    const store = ctx.ws.store;
    for (const t of store.byType('team')) {
      if ((t.memberUserIds ?? []).includes(ctx.params.userId)) store.update(t.id, { memberUserIds: (t.memberUserIds as string[]).filter((x) => x !== ctx.params.userId) }, actorOf(ctx));
    }
    broadcast(ctx.ws.workspace.id, [{ op: 'members' }]);
    return { ok: true };
  });

  r.add('GET', '/api/admin/invites', 'admin', (ctx: WCtx) => sys.invites(ctx.ws.workspace.id).map((i) => ({ ...i, invitedBy: sys.user(i.createdBy)?.name })));

  r.add('POST', '/api/admin/invites', 'admin', async (ctx: WCtx) => {
    const b = await ctx.body();
    const role: Role = ROLES.includes(b.role) ? b.role : 'editor';
    if (ROLE_RANK[role] >= ROLE_RANK.admin && ctx.ws.role !== 'owner') throw new HttpError(403, 'Only owners can invite admins and owners.');
    const email = normalizeEmail(b.email);
    if (!isEmail(email)) throw new HttpError(422, 'Enter a valid email address.');
    const existing = sys.userByEmail(email);
    if (existing && sys.membership(ctx.ws.workspace.id, existing.id)) throw new HttpError(409, `${email} is already a member.`);
    const teamIds = Array.isArray(b.teamIds) ? b.teamIds.filter((t: unknown) => typeof t === 'string') : [];
    const { invite, token } = sys.createInvite({ workspaceId: ctx.ws.workspace.id, email, role, teamIds, createdBy: ctx.user.id });
    return { ...invite, link: `${originOf(ctx)}/#/join/${token}` };
  });

  r.add('DELETE', '/api/admin/invites/:id', 'admin', (ctx: WCtx) => {
    sys.revokeInvite(ctx.ws.workspace.id, ctx.params.id);
    return { ok: true };
  });

  r.add('PATCH', '/api/admin/workspace', 'admin', async (ctx: WCtx) => {
    const { name } = await ctx.body();
    if (typeof name !== 'string' || !name.trim()) throw new HttpError(422, 'Give the workspace a name.');
    sys.renameWorkspace(ctx.ws.workspace.id, name);
    ctx.ws.store.setSettings({ workspaceName: name.trim() });
    broadcast(ctx.ws.workspace.id, [{ op: 'settings' }]);
    return { ok: true };
  });

  r.add('DELETE', '/api/admin/workspace', 'owner', (ctx: WCtx) => {
    if (sys.workspacesOf(ctx.user.id).length <= 1) throw new HttpError(409, 'You can\'t archive your only workspace. Create another one first.');
    broadcast(ctx.ws.workspace.id, [{ op: 'reset' }]);
    workspaces.archive(ctx.ws.workspace);
    return { ok: true };
  });

  r.add('GET', '/api/admin/ai', 'admin', (ctx: WCtx) => {
    const cfg = sys.aiConfig(ctx.ws.workspace.id);
    const envKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
    return { provider: cfg?.provider ?? (envKey ? 'anthropic' : 'none'), model: cfg?.model ?? '', baseUrl: cfg?.baseUrl ?? '', hasKey: !!cfg?.apiKey, envAnthropicKey: envKey };
  });

  r.add('PUT', '/api/admin/ai', 'admin', async (ctx: WCtx) => {
    const b = await ctx.body();
    const provider: AiProvider = ['none', 'anthropic', 'openai-compatible'].includes(b.provider) ? b.provider : 'none';
    if (provider === 'openai-compatible' && b.baseUrl && !/^https?:\/\//.test(b.baseUrl)) throw new HttpError(422, 'Base URL must start with http:// or https://');
    sys.setAiConfig(ctx.ws.workspace.id, { provider, model: b.model ? String(b.model).slice(0, 100) : undefined, baseUrl: b.baseUrl ? String(b.baseUrl).replace(/\/$/, '') : undefined, apiKey: b.apiKey === undefined ? undefined : b.apiKey }, ctx.user.id);
    broadcast(ctx.ws.workspace.id, [{ op: 'settings' }]);
    return { ok: true };
  });
}
