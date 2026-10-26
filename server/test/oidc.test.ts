import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { harness } from './harness.ts';
import { json, standIn } from './standin.ts';

// A local OpenID Connect provider stand-in: discovery, a key set, and a token endpoint that
// checks PKCE and the client secret and signs real RS256 ID tokens. It exercises Goldthread's
// side of the flow; real providers (Entra ID, Okta, Google) are not contacted here.

const CLIENT = 'goldthread-test', SECRET = 'idp-secret';

function makeIdp() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const codes = new Map<string, { claims: Record<string, unknown>; challenge: string; signWith: KeyObject }>();
  return { privateKey, publicKey, other, codes };
}

function signJwt(claims: Record<string, unknown>, key: KeyObject) {
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${h}.${p}.${sign('sha256', Buffer.from(`${h}.${p}`), key).toString('base64url')}`;
}

async function withIdp(fn: (ctx: { url: string; idp: ReturnType<typeof makeIdp> }) => Promise<void>, env: Record<string, string> = {}) {
  const idp = makeIdp();
  const srv = await standIn((req, res) => {
    const base = `http://${req.headers.host}`;
    if (req.path === '/.well-known/openid-configuration') return json(res, 200, { issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, jwks_uri: `${base}/jwks`, token_endpoint_auth_methods_supported: ['client_secret_post'] });
    if (req.path === '/jwks') return json(res, 200, { keys: [{ ...idp.publicKey.export({ format: 'jwk' }), kid: 'k1', use: 'sig', alg: 'RS256' }] });
    if (req.path === '/token') {
      const f = new URLSearchParams(req.raw);
      const grant = idp.codes.get(f.get('code') ?? '');
      if (!grant || f.get('client_secret') !== SECRET || f.get('client_id') !== CLIENT) return json(res, 400, { error: 'invalid_grant' });
      const pkce = createHash('sha256').update(f.get('code_verifier') ?? '').digest('base64url');
      if (pkce !== grant.challenge) return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return json(res, 200, { access_token: 'at', token_type: 'Bearer', id_token: signJwt(grant.claims, grant.signWith) });
    }
    json(res, 404, {});
  });
  const saved = { ...process.env };
  Object.assign(process.env, { GT_OIDC_ISSUER: srv.url, GT_OIDC_CLIENT_ID: CLIENT, GT_OIDC_CLIENT_SECRET: SECRET, GT_OIDC_NAME: 'Test IdP', GT_PUBLIC_URL: 'https://goldthread.example.com', ...env });
  try { await fn({ url: srv.url, idp }); } finally {
    for (const k of ['GT_OIDC_ISSUER', 'GT_OIDC_CLIENT_ID', 'GT_OIDC_CLIENT_SECRET', 'GT_OIDC_NAME', 'GT_PUBLIC_URL', 'GT_OIDC_DOMAINS', 'GT_SIGNUP']) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    await srv.close();
  }
}

/** Start sign-in, play the provider's part, and finish on the callback. */
async function signIn(h: ReturnType<typeof harness>, idp: ReturnType<typeof makeIdp>, issuer: string, claims: Record<string, unknown>, opts: { invite?: string; tamper?: (c: Record<string, unknown>) => void; signWith?: KeyObject } = {}) {
  const start = await h.call('GET', `/api/auth/oidc/start${opts.invite ? `?invite=${opts.invite}` : ''}`);
  assert.equal(start.status, 302);
  const auth = new URL(String(start.headers.location));
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(auth.searchParams.get('redirect_uri'), 'https://goldthread.example.com/api/auth/oidc/callback');
  const full = { iss: issuer, aud: CLIENT, sub: 'sub-1', email_verified: true, nonce: auth.searchParams.get('nonce'), iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...claims };
  opts.tamper?.(full);
  idp.codes.set('code-1', { claims: full, challenge: auth.searchParams.get('code_challenge')!, signWith: opts.signWith ?? idp.privateKey });
  return h.call('GET', `/api/auth/oidc/callback?code=code-1&state=${auth.searchParams.get('state')}`);
}

test('SSO: a new person from an allowed domain gets an account and a session', () => withIdp(async ({ url, idp }) => {
  const h = harness();
  try {
    const state = await h.call('GET', '/api/auth/state');
    assert.deepEqual(state.body.sso, { name: 'Test IdP' });
    const r = await signIn(h, idp, url, { email: 'Sam.Lee@Example.com', name: 'Sam Lee' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, '/#/today');
    assert.match(String(r.headers['set-cookie']), /gt_session=/);
    const u = h.sys.userByEmail('sam.lee@example.com')!;
    assert.equal(u.name, 'Sam Lee');
    assert.equal(u.hasPassword, false);
    assert.equal(h.sys.workspacesOf(u.id).length, 1, 'with a personal workspace');
    // Signing in again finds the same account.
    const again = await signIn(h, idp, url, { email: 'sam.lee@example.com', name: 'Sam Lee' });
    assert.equal(again.headers.location, '/#/today');
    assert.equal(h.sys.allUsers().length, 1);
  } finally { h.done(); }
}, { GT_OIDC_DOMAINS: 'example.com' }));

test('SSO: other domains, forged tokens, replayed and mismatched responses are refused', () => withIdp(async ({ url, idp }) => {
  const h = harness();
  try {
    const err = (r: { headers: Record<string, unknown> }) => decodeURIComponent(String(r.headers.location).split('sso_error=')[1] ?? '');
    assert.match(err(await signIn(h, idp, url, { email: 'x@elsewhere.org' })), /no Goldthread account for x@elsewhere.org/);
    assert.match(err(await signIn(h, idp, url, { email: 'a@example.com' }, { signWith: idp.other })), /signature is not valid/);
    assert.match(err(await signIn(h, idp, url, { email: 'a@example.com' }, { tamper: (c) => { c.nonce = 'other'; } })), /does not match this request/);
    assert.match(err(await signIn(h, idp, url, { email: 'a@example.com' }, { tamper: (c) => { c.aud = 'someone-else'; } })), /different application/);
    assert.match(err(await signIn(h, idp, url, { email: 'a@example.com' }, { tamper: (c) => { c.exp = 1; } })), /expired/);
    assert.match(err(await signIn(h, idp, url, { email: 'a@example.com', email_verified: false })), /not verified/);
    const unknownState = await h.call('GET', '/api/auth/oidc/callback?code=code-1&state=made-up');
    assert.match(err(unknownState), /took too long or was already used/);
    assert.equal(h.sys.allUsers().length, 0, 'nobody got in');
  } finally { h.done(); }
}, { GT_OIDC_DOMAINS: 'example.com' }));

test('SSO: accepting an invite through the provider joins the workspace', () => withIdp(async ({ url, idp }) => {
  const h = harness();
  try {
    const owner = h.user('olga');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    const { token } = h.sys.createInvite({ workspaceId: w.id, email: 'guest@partner.org', role: 'viewer', createdBy: owner.user.id });
    const wrong = await signIn(h, idp, url, { email: 'someone@partner.org' }, { invite: token });
    assert.match(String(wrong.headers.location), /sso_error=.*not%20for%20someone%40partner.org/);
    const ok = await signIn(h, idp, url, { email: 'guest@partner.org', name: 'Guest' }, { invite: token });
    assert.equal(ok.headers.location, '/#/today');
    const guest = h.sys.userByEmail('guest@partner.org')!;
    assert.equal(h.sys.membership(w.id, guest.id)?.role, 'viewer');
    assert.equal(h.sys.workspacesOf(guest.id).length, 1, 'no extra personal workspace for invited people');
  } finally { h.done(); }
}, { GT_SIGNUP: 'invite-only' }));
