import type { Entity } from '../core/schema.ts';
import { planIssueImport, type ImportPlan } from '../core/engines/importers.ts';
import type { Store } from './db.ts';
import type { SystemDB } from './system.ts';

// Live sync with Jira Cloud and Azure DevOps over their REST APIs. Pulling reuses the CSV
// importer's mapping (issues become rows), so a sync behaves exactly like re-importing an
// export: new stories are created, known ones updated by key, bugs become defects, and
// links or notes made in Throughline are kept. Pushing creates issues for stories that
// don't have a key yet. Tested against local stand-ins of both APIs, not the real services.

export type SyncKind = 'jira' | 'ado';

export interface JiraConfig {
  site: string; // https://your-company.atlassian.net
  email: string;
  jql: string; // e.g. project = SH AND updated >= -90d ORDER BY updated DESC
  projectKey?: string; // where pushed stories are created
  storyPointsField?: string; // default customfield_10016
  sprintField?: string; // default customfield_10020
  acceptanceField?: string;
  push?: boolean;
  intervalMinutes?: number;
}

export interface AdoConfig {
  org: string; // https://dev.azure.com/your-org
  project: string;
  wiql?: string; // defaults to user stories and bugs changed in the last 90 days
  push?: boolean;
  intervalMinutes?: number;
}

const HEAD = ['Issue key', 'Summary', 'Issue Type', 'Status', 'Story Points', 'Sprint', 'Labels', 'Resolved', 'Description', 'Acceptance Criteria'];

const trimSlash = (s: string) => s.replace(/\/+$/, '');

async function call(url: string, init: RequestInit & { auth: string }, what: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { Accept: 'application/json', Authorization: init.auth, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    throw new Error(`Could not reach ${what}: ${(err as Error).message}`);
  }
  const text = await res.text();
  let body: any;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  if (res.status === 401 || res.status === 403) throw new Error(`${what} rejected the credentials (${res.status}). Check the email, token and permissions.`);
  if (!res.ok) throw new Error(`${what} answered ${res.status}: ${body?.errorMessages?.join(' ') ?? body?.message ?? String(text).slice(0, 200)}`);
  return body;
}

// ---------------- Jira ----------------

/** Atlassian Document Format → plain text with simple lists. */
export function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const kids = (node.content ?? []) as any[];
  switch (node.type) {
    case 'text': return node.text ?? '';
    case 'hardBreak': return '\n';
    case 'paragraph': case 'heading': return `${kids.map(adfToText).join('')}\n`;
    case 'bulletList': return kids.map((li) => `- ${adfToText(li).trim()}\n`).join('');
    case 'orderedList': return kids.map((li, i) => `${i + 1}. ${adfToText(li).trim()}\n`).join('');
    case 'codeBlock': return `${kids.map(adfToText).join('')}\n`;
    default: return kids.map(adfToText).join('');
  }
}

/** Plain text → a minimal Atlassian document (one paragraph per line, "- " lines as a list). */
export function textToAdf(text: string): Record<string, unknown> {
  const content: any[] = [];
  let list: any[] | null = null;
  for (const line of text.split('\n')) {
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    if (item) {
      if (!list) { list = []; content.push({ type: 'bulletList', content: list }); }
      list.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: item[1] }] }] });
      continue;
    }
    list = null;
    content.push(line.trim() ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph', content: [] });
  }
  return { type: 'doc', version: 1, content };
}

const jiraAuth = (cfg: JiraConfig, token: string) => `Basic ${Buffer.from(`${cfg.email}:${token}`).toString('base64')}`;

export async function jiraTest(cfg: JiraConfig, token: string): Promise<string> {
  const me = await call(`${trimSlash(cfg.site)}/rest/api/3/myself`, { auth: jiraAuth(cfg, token) }, 'Jira');
  return `Connected as ${me.displayName ?? me.emailAddress ?? 'your account'}.`;
}

/** Fetch issues for the JQL (paged), as rows the CSV importer understands. */
export async function jiraRows(cfg: JiraConfig, token: string, max = 2000): Promise<string[][]> {
  const sp = cfg.storyPointsField || 'customfield_10016', sprint = cfg.sprintField || 'customfield_10020';
  const fields = ['summary', 'issuetype', 'status', 'labels', 'resolutiondate', 'description', sp, sprint, ...(cfg.acceptanceField ? [cfg.acceptanceField] : [])];
  const rows: string[][] = [HEAD];
  let next: string | undefined;
  do {
    const page = await call(`${trimSlash(cfg.site)}/rest/api/3/search/jql`, {
      method: 'POST', auth: jiraAuth(cfg, token), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql: cfg.jql, fields, maxResults: 100, ...(next ? { nextPageToken: next } : {}) }),
    }, 'Jira');
    for (const it of page.issues ?? []) {
      const f = it.fields ?? {};
      const sprints = Array.isArray(f[sprint]) ? f[sprint] : [];
      const done = f.status?.statusCategory?.key === 'done';
      rows.push([
        it.key, f.summary ?? '', f.issuetype?.name ?? 'Story', done ? 'Done' : f.status?.name ?? '',
        f[sp] === null || f[sp] === undefined ? '' : String(f[sp]), sprints.at(-1)?.name ?? '',
        (f.labels ?? []).join(';'), f.resolutiondate ?? '', adfToText(f.description).trim(),
        cfg.acceptanceField ? adfToText(f[cfg.acceptanceField]).trim() : '',
      ]);
    }
    next = page.isLast === false || page.nextPageToken ? page.nextPageToken : undefined;
  } while (next && rows.length <= max);
  return rows;
}

export async function jiraCreate(cfg: JiraConfig, token: string, story: Entity): Promise<string> {
  if (!cfg.projectKey) throw new Error('Set the Jira project key to create issues.');
  const narrative = story.asA || story.iWant ? `As a ${story.asA ?? '…'}, I want ${story.iWant ?? '…'}${story.soThat ? ` so that ${story.soThat}` : ''}.` : '';
  const text = [narrative, story.description, story.acceptance ? `Acceptance criteria:\n${story.acceptance}` : ''].filter(Boolean).join('\n\n');
  const fields: Record<string, unknown> = {
    project: { key: cfg.projectKey }, issuetype: { name: 'Story' }, summary: story.title,
    description: textToAdf(text || story.title), labels: ((story.tags ?? []) as string[]).map((t) => t.replace(/\s+/g, '-')),
  };
  if (Number(story.estimate) > 0) fields[cfg.storyPointsField || 'customfield_10016'] = Number(story.estimate);
  const out = await call(`${trimSlash(cfg.site)}/rest/api/3/issue`, { method: 'POST', auth: jiraAuth(cfg, token), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }, 'Jira');
  return out.key;
}

// ---------------- Azure DevOps ----------------

const adoAuth = (pat: string) => `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
const adoBase = (cfg: AdoConfig) => `${trimSlash(cfg.org)}/${encodeURIComponent(cfg.project)}/_apis`;
const DEFAULT_WIQL = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] IN ('User Story', 'Product Backlog Item', 'Bug', 'Task') AND [System.ChangedDate] >= @Today - 90 ORDER BY [System.ChangedDate] DESC";

export async function adoTest(cfg: AdoConfig, pat: string): Promise<string> {
  const p = await call(`${trimSlash(cfg.org)}/_apis/projects/${encodeURIComponent(cfg.project)}?api-version=7.1`, { auth: adoAuth(pat) }, 'Azure DevOps');
  return `Connected to ${p.name ?? cfg.project}.`;
}

export async function adoRows(cfg: AdoConfig, pat: string, max = 2000): Promise<string[][]> {
  const q = await call(`${adoBase(cfg)}/wit/wiql?api-version=7.1&$top=${max}`, { method: 'POST', auth: adoAuth(pat), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: cfg.wiql || DEFAULT_WIQL }) }, 'Azure DevOps');
  const ids: number[] = (q.workItems ?? []).map((w: { id: number }) => w.id).slice(0, max);
  const rows: string[][] = [HEAD];
  const fields = ['System.Id', 'System.Title', 'System.WorkItemType', 'System.State', 'Microsoft.VSTS.Scheduling.StoryPoints', 'Microsoft.VSTS.Scheduling.Effort', 'System.IterationPath', 'System.Tags', 'System.Description', 'Microsoft.VSTS.Common.AcceptanceCriteria', 'Microsoft.VSTS.Common.ClosedDate'];
  for (let i = 0; i < ids.length; i += 200) {
    const batch = await call(`${adoBase(cfg)}/wit/workitemsbatch?api-version=7.1`, { method: 'POST', auth: adoAuth(pat), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ids.slice(i, i + 200), fields }) }, 'Azure DevOps');
    for (const w of batch.value ?? []) {
      const f = w.fields ?? {};
      const points = f['Microsoft.VSTS.Scheduling.StoryPoints'] ?? f['Microsoft.VSTS.Scheduling.Effort'];
      rows.push([
        String(f['System.Id'] ?? w.id), f['System.Title'] ?? '', f['System.WorkItemType'] ?? 'User Story', f['System.State'] ?? '',
        points === undefined || points === null ? '' : String(points), String(f['System.IterationPath'] ?? '').split('\\').pop() ?? '',
        String(f['System.Tags'] ?? ''), f['Microsoft.VSTS.Common.ClosedDate'] ?? '', f['System.Description'] ?? '', f['Microsoft.VSTS.Common.AcceptanceCriteria'] ?? '',
      ]);
    }
  }
  return rows;
}

export async function adoCreate(cfg: AdoConfig, pat: string, story: Entity): Promise<string> {
  const narrative = story.asA || story.iWant ? `As a ${story.asA ?? '…'}, I want ${story.iWant ?? '…'}${story.soThat ? ` so that ${story.soThat}` : ''}.` : '';
  const html = (t: string) => t.split('\n').map((l) => `<div>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`).join('');
  const ops: { op: string; path: string; value: unknown }[] = [{ op: 'add', path: '/fields/System.Title', value: story.title }];
  const desc = [narrative, story.description].filter(Boolean).join('\n\n');
  if (desc) ops.push({ op: 'add', path: '/fields/System.Description', value: html(desc) });
  if (story.acceptance) ops.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria', value: html(String(story.acceptance)) });
  if (Number(story.estimate) > 0) ops.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: Number(story.estimate) });
  if ((story.tags ?? []).length) ops.push({ op: 'add', path: '/fields/System.Tags', value: (story.tags as string[]).join('; ') });
  const out = await call(`${adoBase(cfg)}/wit/workitems/$User%20Story?api-version=7.1`, { method: 'POST', auth: adoAuth(pat), headers: { 'Content-Type': 'application/json-patch+json' }, body: JSON.stringify(ops) }, 'Azure DevOps');
  return String(out.id);
}

// ---------------- running a sync ----------------

export interface SyncResult { at: string; created: number; updated: number; defects: number; pushed: number; skipped: number; error?: string; warnings?: string[] }

/** Apply an import plan to a store, as one transaction. */
export function applyPlan(store: Store, plan: ImportPlan, actor: { id?: string; name: string }) {
  store.transaction(() => {
    for (const data of plan.creates) store.create('story', data, actor);
    for (const u of plan.updates) store.update(u.id, u.data, actor);
    for (const data of plan.defects) store.create('defect', data, actor);
    for (const u of plan.defectUpdates) store.update(u.id, u.data, actor);
  });
}

/** Pull (and optionally push) one workspace's integration. Records the result as its status. */
export async function runSync(sys: SystemDB, store: Store, workspaceId: string, kind: SyncKind, opts: { push?: boolean; actor?: { id?: string; name: string } } = {}): Promise<SyncResult> {
  const integ = sys.integration<JiraConfig & AdoConfig>(workspaceId, kind);
  if (!integ?.secret) throw new Error(`${kind === 'jira' ? 'Jira' : 'Azure DevOps'} isn't connected for this workspace.`);
  const actor = opts.actor ?? { name: kind === 'jira' ? 'Jira sync' : 'Azure DevOps sync' };
  const result: SyncResult = { at: new Date().toISOString(), created: 0, updated: 0, defects: 0, pushed: 0, skipped: 0 };
  try {
    const rows = kind === 'jira' ? await jiraRows(integ.config, integ.secret) : await adoRows(integ.config, integ.secret);
    const plan = planIssueImport(rows, [...store.byType('story'), ...store.byType('defect')]);
    applyPlan(store, plan, actor);
    Object.assign(result, { created: plan.creates.length, updated: plan.updates.length + plan.defectUpdates.length, defects: plan.defects.length, skipped: plan.skipped.reduce((t, x) => t + x.count, 0), warnings: plan.warnings });
    if (opts.push ?? integ.config.push) {
      for (const st of store.byType('story').filter((x) => !x.externalKey && x.status !== 'done')) {
        const key = kind === 'jira' ? await jiraCreate(integ.config, integ.secret, st) : await adoCreate(integ.config, integ.secret, st);
        store.update(st.id, { externalKey: key }, actor);
        result.pushed++;
      }
    }
  } catch (err) {
    result.error = (err as Error).message;
  }
  sys.setIntegrationStatus(workspaceId, kind, { lastSync: result });
  return result;
}
