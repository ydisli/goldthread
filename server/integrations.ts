import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError, readRaw, type Ctx, type Router, type WCtx } from './http.ts';
import { actorOf } from './auth.ts';
import { broadcast } from './live.ts';
import type { SystemDB } from './system.ts';
import type { Workspaces } from './workspaces.ts';
import { adoTest, jiraTest, runSync, type AdoConfig, type JiraConfig, type SyncKind } from './sync.ts';
import { CHAT_EVENTS, chatSecret, postToChat, teamsText, verifySlack, verifyTeams, type ChatSecret } from './chat.ts';
import { capture, kindFromPrefix } from './capture.ts';
import { baseUrl } from './mail.ts';

// Workspace integrations: settings (admins), status (everyone), sync now (editors).
// Secrets are encrypted at rest and never sent back to the browser.

const SYNC_KINDS = ['jira', 'ado'] as const;
const KINDS = ['jira', 'ado', 'slack', 'teams', 'email-in'] as const;
type Kind = (typeof KINDS)[number];
type SyncKindName = (typeof SYNC_KINDS)[number];

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isUrl = (v: string) => /^https?:\/\/[^\s]+$/.test(v);

function cleanConfig(kind: SyncKindName, c: Record<string, unknown>): JiraConfig | AdoConfig {
  const interval = Math.max(0, Math.min(1440, Number(c.intervalMinutes ?? 30) || 0));
  if (kind === 'jira') {
    const cfg: JiraConfig = { site: str(c.site).replace(/\/+$/, ''), email: str(c.email, 200), jql: str(c.jql, 2000), projectKey: str(c.projectKey, 40) || undefined, storyPointsField: str(c.storyPointsField, 60) || undefined, sprintField: str(c.sprintField, 60) || undefined, acceptanceField: str(c.acceptanceField, 60) || undefined, push: c.push === true, intervalMinutes: interval };
    if (!isUrl(cfg.site)) throw new HttpError(422, 'Enter your Jira site address, like https://your-company.atlassian.net');
    if (!cfg.email.includes('@')) throw new HttpError(422, 'Enter the email of the Jira account the API token belongs to.');
    if (!cfg.jql) throw new HttpError(422, 'Enter a JQL query, like: project = SH ORDER BY updated DESC');
    return cfg;
  }
  const cfg: AdoConfig = { org: str(c.org).replace(/\/+$/, ''), project: str(c.project, 200), wiql: str(c.wiql, 4000) || undefined, push: c.push === true, intervalMinutes: interval };
  if (!isUrl(cfg.org)) throw new HttpError(422, 'Enter your organisation address, like https://dev.azure.com/your-org');
  if (!cfg.project) throw new HttpError(422, 'Enter the project name.');
  return cfg;
}

export function integrationRoutes(r: Router, sys: SystemDB, workspaces: Workspaces) {
  const kindOf = (ctx: WCtx): Kind => {
    if (!KINDS.includes(ctx.params.kind as Kind)) throw new HttpError(404, 'Unknown integration.');
    return ctx.params.kind as Kind;
  };

  /** Which integrations are connected, with their last result (no secrets). */
  r.add('GET', '/api/integrations', 'viewer', (ctx: WCtx) => Object.fromEntries(KINDS.map((k) => {
    const i = sys.integration(ctx.ws.workspace.id, k);
    if (!i) return [k, null];
    const chat = k === 'slack' || k === 'teams' ? chatSecret(sys, ctx.ws.workspace.id, k)?.secret : undefined;
    const extra = chat ? { hasWebhook: !!chat.webhookUrl, hasVerification: !!(chat.signingSecret || chat.securityToken) } : {};
    return [k, { connected: !!i.secret, config: i.config, status: i.status, ...extra }];
  })));

  // ---------------- inbound: chat commands and email ----------------

  const inboundStore = (wsId: string) => {
    if (!sys.workspace(wsId)) throw new HttpError(404, 'Unknown workspace.');
    return workspaces.store(wsId);
  };
  const reply = (kind: string, title: string) => `Captured as ${kind === 'evidence' ? 'a signal' : `a ${kind}`}: “${title}”`;

  r.add('POST', '/api/inbound/slack/:ws', 'none', async (ctx: Ctx) => {
    const raw = (await readRaw(ctx.req, 64_000)).toString('utf8');
    const c = chatSecret(sys, ctx.params.ws, 'slack');
    if (!c?.secret.signingSecret || !verifySlack(c.secret.signingSecret, ctx.req.headers, raw)) throw new HttpError(401, 'Bad signature.');
    const f = new URLSearchParams(raw);
    const { kind, text } = kindFromPrefix(f.get('text') ?? '');
    if (!text.trim()) return { response_type: 'ephemeral', text: 'Usage: /goldthread <what you heard>  — or start with request:, decision:, risk: or idea:' };
    const store = inboundStore(ctx.params.ws);
    const out = capture(store, { kind: kind ?? 'evidence', text, source: 'chat', channel: 'chat', from: f.get('user_name') ?? undefined }, { name: `${f.get('user_name') ?? 'someone'} (Slack)` });
    broadcast(ctx.params.ws, [{ op: 'upsert', entity: out.entity }]);
    return { response_type: 'ephemeral', text: reply(out.entity.type, String(out.entity.title)) };
  });

  r.add('POST', '/api/inbound/teams/:ws', 'none', async (ctx: Ctx) => {
    const raw = (await readRaw(ctx.req, 64_000)).toString('utf8');
    const c = chatSecret(sys, ctx.params.ws, 'teams');
    if (!c?.secret.securityToken || !verifyTeams(c.secret.securityToken, ctx.req.headers.authorization, raw)) throw new HttpError(401, 'Bad signature.');
    const msg = JSON.parse(raw || '{}') as { text?: string; from?: { name?: string } };
    const { kind, text } = kindFromPrefix(teamsText(msg.text ?? ''));
    if (!text.trim()) return { type: 'message', text: 'Mention me with what you heard, or start with request:, decision:, risk: or idea:' };
    const store = inboundStore(ctx.params.ws);
    const out = capture(store, { kind: kind ?? 'evidence', text, source: 'chat', channel: 'chat', from: msg.from?.name }, { name: `${msg.from?.name ?? 'someone'} (Teams)` });
    broadcast(ctx.params.ws, [{ op: 'upsert', entity: out.entity }]);
    return { type: 'message', text: reply(out.entity.type, String(out.entity.title)) };
  });

  /** Email-in from Postmark, Mailgun or anything that can POST JSON or a form with from/subject/text. */
  r.add('POST', '/api/inbound/email/:ws/:token', 'none', async (ctx: Ctx) => {
    const secret = sys.integration(ctx.params.ws, 'email-in')?.secret;
    const h = (x: string) => createHash('sha256').update(x).digest();
    if (!secret || !timingSafeEqual(h(secret), h(ctx.params.token))) throw new HttpError(404, 'Not found');
    const raw = (await readRaw(ctx.req, 2_000_000)).toString('utf8');
    const type = String(ctx.req.headers['content-type'] ?? '');
    const b: Record<string, any> = type.includes('json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
    const fromRaw = String(b.FromFull?.Email ?? b.From ?? b.from ?? b.sender ?? '');
    const from = /<([^>]+)>/.exec(fromRaw)?.[1] ?? fromRaw;
    const subject = String(b.Subject ?? b.subject ?? '').trim();
    const body = String(b.StrippedTextReply || b.TextBody || b['stripped-text'] || b['body-plain'] || b.text || '').trim().slice(0, 8000);
    const { kind, text } = kindFromPrefix(subject || body.split('\n')[0] || '');
    if (!text.trim()) return { ok: false, reason: 'empty' };
    const store = inboundStore(ctx.params.ws);
    const out = capture(store, { kind: kind ?? 'evidence', text, detail: body || undefined, source: 'email', channel: 'email', from: from || undefined }, { name: `${from || 'email'} (email)` });
    broadcast(ctx.params.ws, [{ op: 'upsert', entity: out.entity }]);
    return { ok: true, id: out.entity.id, type: out.entity.type };
  });

  r.add('PUT', '/api/admin/integrations/:kind', 'admin', async (ctx: WCtx) => {
    const kind = kindOf(ctx);
    const b = (await ctx.body()) ?? {};
    const wsId = ctx.ws.workspace.id;
    if (kind === 'slack' || kind === 'teams') {
      const prev = chatSecret(sys, wsId, kind)?.secret ?? {};
      const next: ChatSecret = { ...prev };
      for (const k of ['webhookUrl', 'signingSecret', 'securityToken'] as const) if (typeof b[k] === 'string' && b[k].trim()) next[k] = b[k].trim();
      if (next.webhookUrl && !/^https:\/\/\S+$/.test(next.webhookUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(next.webhookUrl)) throw new HttpError(422, 'The webhook address must start with https://');
      if (!next.webhookUrl && !next.signingSecret && !next.securityToken) throw new HttpError(422, kind === 'slack' ? 'Paste an incoming webhook URL, a signing secret, or both.' : 'Paste a Workflows webhook URL, an outgoing webhook security token, or both.');
      const events = Array.isArray(b.config?.events) ? b.config.events.filter((e: string) => (CHAT_EVENTS as readonly string[]).includes(e)) : [...CHAT_EVENTS];
      sys.setIntegration(wsId, kind, { events }, JSON.stringify(next), ctx.user.id);
      return { ok: true };
    }
    if (kind === 'email-in') {
      // The secret is the random part of the inbound address; regenerate to revoke the old one.
      if (b.regenerate || !sys.integration(wsId, kind)?.secret) sys.setIntegration(wsId, kind, {}, randomBytes(18).toString('base64url'), ctx.user.id);
      return { ok: true };
    }
    const config = cleanConfig(kind, b.config ?? {});
    const secret = typeof b.secret === 'string' && b.secret.trim() ? b.secret.trim() : undefined;
    if (!secret && !sys.integration(ctx.ws.workspace.id, kind)?.secret) throw new HttpError(422, kind === 'jira' ? 'Paste an API token from id.atlassian.com → Security → API tokens.' : 'Paste a personal access token with Work Items (read & write) scope.');
    sys.setIntegration(ctx.ws.workspace.id, kind, config as unknown as Record<string, unknown>, secret, ctx.user.id);
    return { ok: true };
  });

  r.add('DELETE', '/api/admin/integrations/:kind', 'admin', (ctx: WCtx) => {
    sys.deleteIntegration(ctx.ws.workspace.id, kindOf(ctx));
    return { ok: true };
  });

  /** The inbound email address's webhook, for configuring the mail provider. Admins only. */
  r.add('GET', '/api/admin/integrations/email-in/address', 'admin', (ctx: WCtx) => {
    const i = sys.integration(ctx.ws.workspace.id, 'email-in');
    if (!i?.secret) throw new HttpError(404, 'Email-in is not set up.');
    return { url: `${baseUrl(ctx.req)}/api/inbound/email/${ctx.ws.workspace.id}/${i.secret}` };
  });

  r.add('POST', '/api/admin/integrations/:kind/test', 'admin', async (ctx: WCtx) => {
    const kind = kindOf(ctx);
    if (kind === 'slack' || kind === 'teams') {
      const sent = await postToChat(sys, ctx.ws.workspace.id, 'test', { title: 'Goldthread is connected', text: `Posts from “${ctx.ws.workspace.name}” will appear here.`, link: `${baseUrl(ctx.req)}/#/today` });
      if (!sent) throw new HttpError(502, String((sys.integration(ctx.ws.workspace.id, kind)?.status.lastPost as { error?: string } | undefined)?.error ?? 'No webhook URL is set.'));
      return { ok: true, message: `Test message posted to ${kind === 'slack' ? 'Slack' : 'Teams'}.` };
    }
    if (kind === 'email-in') throw new HttpError(422, 'Send an email to the address instead.');
    const i = sys.integration<JiraConfig & AdoConfig>(ctx.ws.workspace.id, kind);
    if (!i?.secret) throw new HttpError(409, 'Save the connection first.');
    try {
      return { ok: true, message: kind === 'jira' ? await jiraTest(i.config, i.secret) : await adoTest(i.config, i.secret) };
    } catch (err) { throw new HttpError(502, (err as Error).message); }
  });

  r.add('POST', '/api/integrations/:kind/sync', 'editor', async (ctx: WCtx) => {
    const kind = kindOf(ctx) as SyncKind;
    if (!(SYNC_KINDS as readonly string[]).includes(kind)) throw new HttpError(404, 'Only Jira and Azure DevOps sync.');
    const b = (await ctx.body()) ?? {};
    const result = await runSync(sys, ctx.ws.store, ctx.ws.workspace.id, kind, { push: b.push === true ? true : undefined, actor: actorOf(ctx) });
    if (result.created || result.updated || result.defects || result.pushed) broadcast(ctx.ws.workspace.id, [{ op: 'reset' }]);
    if (result.error) throw new HttpError(502, result.error);
    return result;
  });
}

/** Scheduled pulls: each connected workspace syncs every `intervalMinutes` (0 = only on demand). */
export async function scheduledSyncs(sys: SystemDB, workspaces: Workspaces, now = Date.now()) {
  for (const kind of SYNC_KINDS) {
    for (const wsId of sys.integrationsOfKind(kind)) {
      const i = sys.integration<{ intervalMinutes?: number }>(wsId, kind);
      const every = i?.config.intervalMinutes ?? 30;
      const last = (i?.status.lastSync as { at?: string } | undefined)?.at;
      if (!i?.secret || !every || (last && now - Date.parse(last) < every * 60_000)) continue;
      const res = await runSync(sys, workspaces.store(wsId), wsId, kind);
      if (res.created || res.updated || res.defects || res.pushed) broadcast(wsId, [{ op: 'reset' }]);
    }
  }
}
