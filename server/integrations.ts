import { HttpError, type Router, type WCtx } from './http.ts';
import { actorOf } from './auth.ts';
import { broadcast } from './live.ts';
import type { SystemDB } from './system.ts';
import type { Workspaces } from './workspaces.ts';
import { adoTest, jiraTest, runSync, type AdoConfig, type JiraConfig, type SyncKind } from './sync.ts';

// Workspace integrations: settings (admins), status (everyone), sync now (editors).
// Secrets are encrypted at rest and never sent back to the browser.

const KINDS = ['jira', 'ado'] as const;
type Kind = (typeof KINDS)[number];

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isUrl = (v: string) => /^https?:\/\/[^\s]+$/.test(v);

function cleanConfig(kind: Kind, c: Record<string, unknown>): JiraConfig | AdoConfig {
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
    return [k, i ? { connected: !!i.secret, config: i.config, status: i.status } : null];
  })));

  r.add('PUT', '/api/admin/integrations/:kind', 'admin', async (ctx: WCtx) => {
    const kind = kindOf(ctx);
    const b = (await ctx.body()) ?? {};
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

  r.add('POST', '/api/admin/integrations/:kind/test', 'admin', async (ctx: WCtx) => {
    const kind = kindOf(ctx);
    const i = sys.integration<JiraConfig & AdoConfig>(ctx.ws.workspace.id, kind);
    if (!i?.secret) throw new HttpError(409, 'Save the connection first.');
    try {
      return { ok: true, message: kind === 'jira' ? await jiraTest(i.config, i.secret) : await adoTest(i.config, i.secret) };
    } catch (err) { throw new HttpError(502, (err as Error).message); }
  });

  r.add('POST', '/api/integrations/:kind/sync', 'editor', async (ctx: WCtx) => {
    const kind = kindOf(ctx) as SyncKind;
    const b = (await ctx.body()) ?? {};
    const result = await runSync(sys, ctx.ws.store, ctx.ws.workspace.id, kind, { push: b.push === true ? true : undefined, actor: actorOf(ctx) });
    if (result.created || result.updated || result.defects || result.pushed) broadcast(ctx.ws.workspace.id, [{ op: 'reset' }]);
    if (result.error) throw new HttpError(502, result.error);
    return result;
  });
}

/** Scheduled pulls: each connected workspace syncs every `intervalMinutes` (0 = only on demand). */
export async function scheduledSyncs(sys: SystemDB, workspaces: Workspaces, now = Date.now()) {
  for (const kind of KINDS) {
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
