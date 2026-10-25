// Backlog import from Jira and Azure DevOps CSV exports, and a Jira-friendly CSV export.
// Re-importing the same export updates stories by their Jira / ADO key instead of duplicating them.

import type { Entity } from '../schema.ts';

/** RFC 4180-ish CSV (also accepts tabs), tolerant of quoted newlines. Empty rows are dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === '\t') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export type IssueSource = 'jira' | 'ado' | 'generic';

/** Column names per tool, lower-cased. The first that exists wins. */
const COLUMNS = {
  key: ['issue key', 'key', 'id', 'work item id'],
  title: ['summary', 'title', 'name'],
  type: ['issue type', 'work item type', 'type'],
  status: ['status', 'state'],
  points: ['custom field (story points)', 'custom field (story point estimate)', 'story points', 'story point estimate', 'effort', 'size', 'estimate', 'points'],
  description: ['description'],
  acceptance: ['custom field (acceptance criteria)', 'acceptance criteria', 'acceptance'],
  sprint: ['sprint', 'iteration path', 'iteration'],
  labels: ['labels', 'tags', 'label'],
  done: ['resolved', 'closed date', 'resolved date', 'done date', 'completed'],
  severity: ['priority', 'severity'],
  parent: ['parent', 'parent id', 'custom field (epic link)', 'epic link', 'parent summary'],
} as const;

type Col = keyof typeof COLUMNS;

export function detectSource(header: string[]): IssueSource {
  const h = header.map((x) => x.trim().toLowerCase());
  if (h.includes('issue key') || h.includes('issue type') || h.some((x) => x.startsWith('custom field ('))) return 'jira';
  if (h.includes('work item type') || h.includes('iteration path') || h.includes('area path')) return 'ado';
  return 'generic';
}

const STATUS: [RegExp, string][] = [
  [/^(done|closed|resolved|complete|completed|released|shipped|removed)$/i, 'done'],
  [/(review|testing|qa|verify|validation|uat|ready for test)/i, 'in-review'],
  [/(ready|approved|selected|refined|groomed)/i, 'ready'],
  [/(progress|active|doing|development|committed|implement)/i, 'in-progress'],
];

export function mapStatus(s: string | undefined): string {
  const v = (s ?? '').trim();
  for (const [re, to] of STATUS) if (re.test(v)) return to;
  return 'backlog';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Dates as Jira (20/Oct/26 3:14 PM), Azure DevOps (10/20/2026 3:14:00 PM) and ISO write them. */
export function parseToolDate(s: string | undefined): string | undefined {
  const v = (s ?? '').trim();
  if (!v) return undefined;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const jira = v.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})/);
  if (jira) {
    const m = MONTHS.indexOf(jira[2].toLowerCase());
    if (m >= 0) {
      const y = jira[3].length === 2 ? 2000 + Number(jira[3]) : Number(jira[3]);
      return `${y}-${String(m + 1).padStart(2, '0')}-${jira[1].padStart(2, '0')}`;
    }
  }
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  return undefined;
}

/** Azure DevOps exports rich text as HTML; Jira as wiki markup. Keep readable plain text. */
export function plainText(s: string | undefined): string {
  return (s ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\{(noformat|code)[^}]*\}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Pull "As a …, I want …, so that …" out of free text when it is there. */
export function storyParts(text: string): { asA?: string; iWant?: string; soThat?: string } {
  const m = text.match(/as an?\s+(.+?),?\s+i (?:want|need|would like)(?: to)?\s+(.+?)(?:,?\s+so (?:that|i can)\s+(.+?))?(?:[.\n]|$)/i);
  if (!m) return {};
  return { asA: m[1].trim(), iWant: m[2].trim(), soThat: m[3]?.trim() };
}

/** Gherkin or an "Acceptance criteria" section inside a description. */
function acceptanceFrom(text: string): string | undefined {
  const section = text.match(/acceptance criteria:?\s*\n([\s\S]+)/i);
  if (section) return section[1].trim();
  if (/^\s*given\b[\s\S]*\bthen\b/im.test(text)) return text.slice(text.search(/^\s*given\b/im)).trim();
  return undefined;
}

export interface ImportPlan {
  source: IssueSource;
  creates: Record<string, unknown>[];
  updates: { id: string; key: string; data: Record<string, unknown> }[];
  defects: Record<string, unknown>[];
  skipped: { reason: string; count: number }[];
  /** Columns the plan used, for showing the mapping. */
  mapped: Partial<Record<Col, string>>;
  warnings: string[];
}

const SEVERITY: [RegExp, string][] = [[/(highest|critical|blocker|^1)/i, 's1-critical'], [/(high|major|^2)/i, 's2-major'], [/(low|minor|^4|trivial|lowest)/i, 's4-trivial']];

/**
 * Turn a Jira or Azure DevOps CSV export into stories (and defects for bugs).
 * Stories already in the workspace with the same key are updated, not duplicated.
 */
export function planIssueImport(rows: string[][], existing: Entity[], opts: { bugsAsDefects?: boolean } = {}): ImportPlan {
  const [header = [], ...body] = rows;
  const h = header.map((x) => x.trim().toLowerCase());
  const source = detectSource(header);
  const mapped: Partial<Record<Col, string>> = {};
  const idx = {} as Record<Col, number[]>;
  for (const col of Object.keys(COLUMNS) as Col[]) {
    const name = COLUMNS[col].find((n) => h.includes(n));
    idx[col] = name ? h.flatMap((x, i) => (x === name ? [i] : [])) : [];
    if (name) mapped[col] = header[h.indexOf(name)].trim();
  }
  const one = (r: string[], c: Col) => idx[c].map((i) => r[i]?.trim()).filter(Boolean).pop();
  const all = (r: string[], c: Col) => idx[c].flatMap((i) => (r[i] ?? '').split(/[;,]\s*/)).map((x) => x.trim()).filter(Boolean);

  const byKey = new Map(existing.filter((e) => e.type === 'story' && e.externalKey).map((e) => [String(e.externalKey).toLowerCase(), e]));
  const plan: ImportPlan = { source, creates: [], updates: [], defects: [], skipped: [], mapped, warnings: [] };
  const skip = new Map<string, number>();
  const seen = new Set<string>();
  if (!idx.title.length) { plan.warnings.push('No Summary / Title column found — nothing can be imported.'); return plan; }
  if (!idx.key.length) plan.warnings.push('No Issue key / ID column: re-importing later will create duplicates.');

  for (const r of body) {
    const title = one(r, 'title');
    if (!title) { skip.set('no title', (skip.get('no title') ?? 0) + 1); continue; }
    const key = one(r, 'key');
    if (key) {
      if (seen.has(key.toLowerCase())) { skip.set('duplicate row', (skip.get('duplicate row') ?? 0) + 1); continue; }
      seen.add(key.toLowerCase());
    }
    const type = (one(r, 'type') ?? 'story').toLowerCase();
    if (/epic|feature|initiative/.test(type)) { skip.set('epics and features (track these as bets)', (skip.get('epics and features (track these as bets)') ?? 0) + 1); continue; }
    const description = plainText(one(r, 'description'));
    const done = parseToolDate(one(r, 'done'));
    if (/bug|defect/.test(type) && opts.bugsAsDefects !== false) {
      const sev = one(r, 'severity') ?? '';
      const status = mapStatus(one(r, 'status'));
      plan.defects.push({
        title, detail: [key && `${key}`, description].filter(Boolean).join('\n\n') || undefined,
        status: status === 'done' ? 'closed' : status === 'in-progress' || status === 'in-review' ? 'in-progress' : 'new',
        severity: SEVERITY.find(([re]) => re.test(sev))?.[1] ?? 's3-minor', foundIn: 'production', reportedAt: parseToolDate(r[h.indexOf('created')]),
      });
      continue;
    }
    const pointsRaw = one(r, 'points');
    const points = pointsRaw && Number.isFinite(Number(pointsRaw)) ? Number(pointsRaw) : undefined;
    const status = mapStatus(one(r, 'status'));
    const sprintRaw = one(r, 'sprint');
    const data: Record<string, unknown> = {
      title,
      status,
      ...storyParts(`${title}\n${description}`),
      description: description || undefined,
      acceptance: plainText(one(r, 'acceptance')) || acceptanceFrom(description),
      estimate: points,
      sprint: sprintRaw ? sprintRaw.split('\\').pop() : undefined,
      externalKey: key,
      tags: [...new Set(all(r, 'labels').map((t) => t.toLowerCase()))],
      doneAt: status === 'done' ? done : undefined,
    };
    for (const k of Object.keys(data)) if (data[k] === undefined || data[k] === '' || (Array.isArray(data[k]) && !(data[k] as unknown[]).length)) delete data[k];
    const match = key ? byKey.get(key.toLowerCase()) : undefined;
    if (match) {
      // Only overwrite what the tool owns; keep links and notes made in Throughline.
      const patch: Record<string, unknown> = {};
      for (const k of ['title', 'status', 'estimate', 'sprint', 'doneAt', 'acceptance'] as const) {
        if (data[k] !== undefined && JSON.stringify(data[k]) !== JSON.stringify(match[k]) && !(k === 'acceptance' && match.acceptance)) patch[k] = data[k];
      }
      if (Object.keys(patch).length) plan.updates.push({ id: match.id, key: key!, data: patch });
      else skip.set('unchanged', (skip.get('unchanged') ?? 0) + 1);
    } else plan.creates.push(data);
  }
  plan.skipped = [...skip].map(([reason, count]) => ({ reason, count }));
  const doneNoDate = plan.creates.filter((s) => s.status === 'done' && !s.doneAt).length;
  if (doneNoDate) plan.warnings.push(`${doneNoDate} done ${doneNoDate === 1 ? 'story has' : 'stories have'} no resolved date, so the forecast can't use them as throughput. Include the Resolved / Closed Date column.`);
  return plan;
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Stories as a CSV Jira's importer (and Azure DevOps "Import work items") can map directly. */
export function storiesToCsv(stories: Entity[]): string {
  const head = ['Summary', 'Issue Type', 'Description', 'Acceptance Criteria', 'Story Points', 'Labels', 'Sprint', 'Throughline key'];
  const lines = stories.map((s) => {
    const narrative = s.asA || s.iWant ? `As a ${s.asA ?? '…'}, I want ${s.iWant ?? '…'}${s.soThat ? ` so that ${s.soThat}` : ''}.` : '';
    const description = [narrative, s.description].filter(Boolean).join('\n\n');
    return [s.title, 'Story', description, s.acceptance, s.estimate, ((s.tags ?? []) as string[]).join(' '), s.sprint, s.key].map(csvCell).join(',');
  });
  return [head.join(','), ...lines].join('\n');
}
