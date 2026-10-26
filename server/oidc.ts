import { createHash, createPublicKey, randomBytes, verify as verifySig, type webcrypto } from 'node:crypto';

type JsonWebKey = webcrypto.JsonWebKey;
import { HttpError, type Ctx, type Router } from './http.ts';
import { setSessionCookie } from './auth.ts';
import { broadcast } from './live.ts';
import { baseUrl } from './mail.ts';
import { normalizeEmail, type SystemDB, type User } from './system.ts';
import type { Workspaces } from './workspaces.ts';

// Single sign-on with OpenID Connect (authorization code flow + PKCE). Works with any
// standards-compliant provider: Entra ID, Okta, Google Workspace, Auth0, Keycloak…
//
//   GT_OIDC_ISSUER        e.g. https://login.microsoftonline.com/<tenant>/v2.0
//   GT_OIDC_CLIENT_ID     the app registration's client id
//   GT_OIDC_CLIENT_SECRET its secret (omit for public clients)
//   GT_OIDC_NAME          label on the button, e.g. "Microsoft" (default "single sign-on")
//   GT_OIDC_DOMAINS       optional comma list; only these email domains may sign up through SSO
//   GT_PUBLIC_URL         where people reach Goldthread; the redirect URI is <it>/api/auth/oidc/callback

export interface OidcConfig { issuer: string; clientId: string; clientSecret?: string; name: string; domains: string[] }

export function oidcConfig(env = process.env): OidcConfig | null {
  if (!env.GT_OIDC_ISSUER || !env.GT_OIDC_CLIENT_ID) return null;
  return {
    issuer: env.GT_OIDC_ISSUER.replace(/\/$/, ''),
    clientId: env.GT_OIDC_CLIENT_ID,
    clientSecret: env.GT_OIDC_CLIENT_SECRET || undefined,
    name: env.GT_OIDC_NAME || 'single sign-on',
    domains: (env.GT_OIDC_DOMAINS ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
  };
}

interface Discovery { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string; token_endpoint_auth_methods_supported?: string[] }

const cache = new Map<string, { at: number; value: unknown }>();
async function cachedJson<T>(url: string, maxAgeMs = 3_600_000, force = false): Promise<T> {
  const hit = cache.get(url);
  if (hit && !force && Date.now() - hit.at < maxAgeMs) return hit.value as T;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const value = await res.json();
  cache.set(url, { at: Date.now(), value });
  return value as T;
}

const discover = (issuer: string) => cachedJson<Discovery>(`${issuer}/.well-known/openid-configuration`);
const b64url = (b: Buffer) => b.toString('base64url');

export interface IdClaims { iss: string; aud: string | string[]; sub: string; exp: number; iat?: number; nonce?: string; email?: string; email_verified?: boolean; name?: string; preferred_username?: string }

/** Check an ID token's signature (RS256 or ES256, against the provider's keys) and its claims. */
export async function verifyIdToken(token: string, opts: { issuer: string; audience: string; nonce: string; jwksUri: string; now?: number }): Promise<IdClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('The ID token is malformed.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg: string; kid?: string };
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as IdClaims;
  if (header.alg !== 'RS256' && header.alg !== 'ES256') throw new Error(`Unsupported signing algorithm ${header.alg}.`);
  const findKey = async (force: boolean) => {
    const { keys } = await cachedJson<{ keys: (JsonWebKey & { kid?: string; use?: string })[] }>(opts.jwksUri, 3_600_000, force);
    return keys.find((k) => (header.kid ? k.kid === header.kid : true) && (!k.use || k.use === 'sig') && (header.alg === 'RS256' ? k.kty === 'RSA' : k.kty === 'EC'));
  };
  // Providers rotate keys; an unknown key id means "fetch the key set again".
  const jwk = (await findKey(false)) ?? (await findKey(true));
  if (!jwk) throw new Error('The ID token was signed with an unknown key.');
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = Buffer.from(parts[2], 'base64url');
  const ok = header.alg === 'RS256' ? verifySig('sha256', data, key, sig) : verifySig('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, sig);
  if (!ok) throw new Error('The ID token signature is not valid.');
  const now = (opts.now ?? Date.now()) / 1000;
  if (claims.iss !== opts.issuer) throw new Error('The ID token comes from a different issuer.');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(opts.audience)) throw new Error('The ID token is for a different application.');
  if (typeof claims.exp !== 'number' || claims.exp < now - 60) throw new Error('The ID token has expired.');
  if (claims.nonce !== opts.nonce) throw new Error('The sign-in response does not match this request.');
  return claims;
}

/** Pending sign-ins, keyed by state. Single-process; they expire after 10 minutes. */
const pending = new Map<string, { nonce: string; verifier: string; invite?: string; at: number }>();
const sweep = () => { for (const [k, v] of pending) if (Date.now() - v.at > 600_000) pending.delete(k); };

const redirect = (ctx: Ctx, to: string) => { ctx.res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' }); ctx.res.end(); };
const fail = (ctx: Ctx, message: string) => redirect(ctx, `/#/?sso_error=${encodeURIComponent(message)}`);

export function oidcRoutes(r: Router, sys: SystemDB, workspaces: Workspaces) {
  r.add('GET', '/api/auth/oidc/start', 'none', async (ctx) => {
    const cfg = oidcConfig();
    if (!cfg) throw new HttpError(404, 'Single sign-on is not set up on this server.');
    let d: Discovery;
    try { d = await discover(cfg.issuer); } catch (err) { return fail(ctx, `Could not reach the sign-in provider: ${(err as Error).message}`); }
    sweep();
    const state = b64url(randomBytes(18)), nonce = b64url(randomBytes(18)), verifier = b64url(randomBytes(32));
    const invite = ctx.url.searchParams.get('invite') ?? undefined;
    pending.set(state, { nonce, verifier, invite, at: Date.now() });
    const u = new URL(d.authorization_endpoint);
    u.search = new URLSearchParams({
      response_type: 'code', client_id: cfg.clientId, redirect_uri: `${baseUrl(ctx.req)}/api/auth/oidc/callback`,
      scope: 'openid email profile', state, nonce,
      code_challenge: b64url(createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256',
    }).toString();
    redirect(ctx, u.toString());
  });

  r.add('GET', '/api/auth/oidc/callback', 'none', async (ctx) => {
    const cfg = oidcConfig();
    if (!cfg) throw new HttpError(404, 'Single sign-on is not set up on this server.');
    const q = ctx.url.searchParams;
    const flow = pending.get(q.get('state') ?? '');
    pending.delete(q.get('state') ?? '');
    if (q.get('error')) return fail(ctx, q.get('error_description') ?? q.get('error')!);
    if (!flow || Date.now() - flow.at > 600_000) return fail(ctx, 'That sign-in took too long or was already used. Try again.');
    let claims: IdClaims;
    try {
      const d = await discover(cfg.issuer);
      const body = new URLSearchParams({ grant_type: 'authorization_code', code: q.get('code') ?? '', redirect_uri: `${baseUrl(ctx.req)}/api/auth/oidc/callback`, code_verifier: flow.verifier, client_id: cfg.clientId });
      const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
      const basicOnly = d.token_endpoint_auth_methods_supported?.length && !d.token_endpoint_auth_methods_supported.includes('client_secret_post');
      if (cfg.clientSecret) {
        if (basicOnly) headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`).toString('base64')}`;
        else body.set('client_secret', cfg.clientSecret);
      }
      const res = await fetch(d.token_endpoint, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) });
      const tok = await res.json().catch(() => ({})) as { id_token?: string; error?: string; error_description?: string };
      if (!res.ok || !tok.id_token) throw new Error(tok.error_description ?? tok.error ?? `the token endpoint answered ${res.status}`);
      claims = await verifyIdToken(tok.id_token, { issuer: d.issuer ?? cfg.issuer, audience: cfg.clientId, nonce: flow.nonce, jwksUri: d.jwks_uri });
    } catch (err) {
      return fail(ctx, `Sign-in failed: ${(err as Error).message}`);
    }
    const email = normalizeEmail(claims.email ?? claims.preferred_username);
    if (!email.includes('@')) return fail(ctx, 'Your sign-in provider did not share an email address.');
    if (claims.email_verified === false) return fail(ctx, `${email} is not verified with your sign-in provider.`);

    const invite = flow.invite ? sys.inviteByToken(flow.invite) : undefined;
    const usableInvite = invite && !invite.revoked && !invite.acceptedAt && invite.expiresAt > new Date().toISOString() && invite.email === email ? invite : undefined;
    if (flow.invite && !usableInvite) return fail(ctx, `This invite is not for ${email}, or it has expired.`);

    let user: User | undefined = sys.userByEmail(email);
    if (user && user.status !== 'active') return fail(ctx, 'This account is disabled.');
    if (user?.demo) return fail(ctx, 'Demo accounts cannot use single sign-on.');
    if (!user) {
      const domain = email.split('@')[1];
      const allowed = usableInvite || (cfg.domains.length ? cfg.domains.includes(domain) : process.env.GT_SIGNUP !== 'invite-only');
      if (!allowed) return fail(ctx, `There is no Goldthread account for ${email}. Ask an admin for an invite.`);
      user = sys.createUser({ email, name: (claims.name ?? email.split('@')[0]).slice(0, 80), prefs: { persona: 'both' } });
      if (!usableInvite) workspaces.create({ name: `${user.name.split(' ')[0]}'s workspace`, kind: 'personal', owner: user, sample: 'empty' });
    }
    let workspaceId = sys.workspacesOf(user.id)[0]?.id;
    if (usableInvite && !sys.membership(usableInvite.workspaceId, user.id)) {
      sys.addMember(usableInvite.workspaceId, user.id, usableInvite.role);
      sys.markInviteAccepted(usableInvite.id, user.id);
      workspaces.linkMember(usableInvite.workspaceId, user);
      const store = workspaces.store(usableInvite.workspaceId);
      for (const teamId of usableInvite.teamIds) {
        const team = store.get(teamId);
        if (team?.type === 'team') store.update(team.id, { memberUserIds: [...new Set([...(team.memberUserIds ?? []), user.id])] }, { id: user.id, name: user.name });
      }
      broadcast(usableInvite.workspaceId, [{ op: 'members' }]);
      workspaceId = usableInvite.workspaceId;
    }
    setSessionCookie(ctx.req, ctx.res, sys.createSession(user.id, workspaceId));
    redirect(ctx, '/#/today');
  });
}
