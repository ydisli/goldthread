import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError, type Ctx, type Need } from './http.ts';
import { ROLE_RANK, type Role, type SystemDB } from './system.ts';
import type { Workspaces } from './workspaces.ts';

export const SESSION_COOKIE = 'tl_session';
const SESSION_DAYS = 30;

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isHttps(req: IncomingMessage): boolean {
  return req.headers['x-forwarded-proto'] === 'https' || (req.socket as { encrypted?: boolean }).encrypted === true;
}

export function setSessionCookie(req: IncomingMessage, res: ServerResponse, token: string) {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_DAYS * 86_400}`];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: ServerResponse) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** API token from `Authorization: Bearer`, `X-TL-Token` or `?token=` (for EventSource). */
export function bearerToken(req: IncomingMessage, url: URL): string | undefined {
  const auth = String(req.headers.authorization ?? '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const header = req.headers['x-tl-token'];
  if (typeof header === 'string' && header) return header;
  return url.searchParams.get('token') ?? undefined;
}

// ---------------- brute-force protection ----------------

const attempts = new Map<string, { n: number; until: number }>();

export function checkRateLimit(key: string) {
  const a = attempts.get(key);
  if (a && a.until > Date.now() && a.n >= 8) throw new HttpError(429, 'Too many attempts. Wait a minute and try again.');
}

export function recordFailure(key: string) {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { n: 1, until: Date.now() + 60_000 });
  else a.n++;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}

// ---------------- request authentication ----------------

/**
 * Resolve who is calling and in which workspace, then check the route's
 * requirement. Session users pick a workspace with the `X-TL-Workspace`
 * header (falling back to the session's last workspace); API tokens are bound
 * to one workspace.
 */
export function authenticate(ctx: Ctx, need: Need, sys: SystemDB, workspaces: Workspaces) {
  const { req, url } = ctx;
  const token = bearerToken(req, url);
  let workspaceId: string | undefined;
  let tokenScope: 'read' | 'write' | undefined;

  if (token) {
    const t = sys.resolveToken(token);
    if (!t) throw new HttpError(401, 'Invalid or revoked API token. Create a new one under Settings → Tokens & integrations.');
    ctx.user = sys.user(t.userId);
    ctx.via = 'token';
    workspaceId = t.workspaceId;
    tokenScope = t.scope;
  } else {
    const cookie = parseCookies(req)[SESSION_COOKIE];
    const s = cookie ? sys.session(cookie) : undefined;
    if (s) {
      ctx.user = sys.user(s.userId);
      ctx.sessionHash = s.idHash;
      ctx.sessionWorkspaceId = s.workspaceId;
      ctx.via = 'session';
      const requested = req.headers['x-tl-workspace'];
      workspaceId = (typeof requested === 'string' && requested) || url.searchParams.get('ws') || s.workspaceId;
    }
  }

  if (ctx.user && ctx.user.status !== 'active') throw new HttpError(403, 'This account is disabled.');
  if (need === 'none') return;
  if (!ctx.user) throw new HttpError(401, 'Sign in to continue.');
  if (need === 'user') return;

  // Workspace role required.
  let memberships = sys.workspacesOf(ctx.user.id);
  if (!workspaceId) workspaceId = memberships[0]?.id;
  const m = memberships.find((w) => w.id === workspaceId);
  if (!m) {
    memberships = [];
    throw new HttpError(403, 'You are not a member of this workspace.');
  }
  let role: Role = m.role;
  if (tokenScope === 'read') role = 'viewer';
  ctx.ws = { workspace: m, role, store: workspaces.store(m.id) };
  if (ROLE_RANK[role] < ROLE_RANK[need]) {
    const label = need === 'editor' ? 'edit' : need === 'admin' ? 'manage this workspace' : need === 'owner' ? 'do this (owners only)' : 'view this';
    throw new HttpError(403, tokenScope === 'read' && need !== 'viewer' ? 'This API token is read-only.' : `Your role (${m.role}) can't ${label}.`);
  }
}

export function actorOf(ctx: Ctx): { id?: string; name: string } {
  const via = ctx.via === 'token' ? ` (${String(ctx.req.headers['x-tl-actor'] ?? 'API')})` : '';
  return { id: ctx.user?.id, name: `${ctx.user?.name ?? 'system'}${via}` };
}
