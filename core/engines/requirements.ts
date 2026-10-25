import type { Entity } from '../schema.ts';

export interface SnapshotItem { id: string; key?: string; title: string; statement?: string; priority?: string; version?: number }

export function snapshotRequirements(reqs: Entity[]): SnapshotItem[] {
  return reqs
    .filter((r) => r.status !== 'deprecated')
    .map((r) => ({ id: r.id, key: r.key, title: r.title, statement: r.statement, priority: r.priority, version: r.version ?? 1 }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }));
}

export interface BaselineDiff {
  added: SnapshotItem[];
  removed: SnapshotItem[];
  changed: { before: SnapshotItem; after: SnapshotItem; fields: string[] }[];
  unchanged: number;
}

/** Diff two requirement snapshots (baseline vs baseline, or baseline vs current). */
export function diffSnapshots(before: SnapshotItem[], after: SnapshotItem[]): BaselineDiff {
  const b = new Map(before.map((x) => [x.id, x]));
  const a = new Map(after.map((x) => [x.id, x]));
  const added = after.filter((x) => !b.has(x.id));
  const removed = before.filter((x) => !a.has(x.id));
  const changed: BaselineDiff['changed'] = [];
  let unchanged = 0;
  for (const x of after) {
    const y = b.get(x.id);
    if (!y) continue;
    const fields = (['title', 'statement', 'priority'] as const).filter((f) => (x[f] ?? '') !== (y[f] ?? ''));
    if (fields.length) changed.push({ before: y, after: x, fields });
    else unchanged++;
  }
  return { added, removed, changed, unchanged };
}

/** Word-level diff for showing statement changes. */
export function wordDiff(a: string, b: string): { text: string; op: 'same' | 'add' | 'del' }[] {
  const x = a.split(/(\s+)/), y = b.split(/(\s+)/);
  const n = x.length, m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { text: string; op: 'same' | 'add' | 'del' }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ text: x[i], op: 'same' }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ text: x[i], op: 'del' }); i++; }
    else { out.push({ text: y[j], op: 'add' }); j++; }
  }
  while (i < n) out.push({ text: x[i++], op: 'del' });
  while (j < m) out.push({ text: y[j++], op: 'add' });
  // Merge adjacent runs.
  const merged: typeof out = [];
  for (const p of out) {
    const last = merged[merged.length - 1];
    if (last && last.op === p.op) last.text += p.text;
    else merged.push({ ...p });
  }
  return merged;
}

/** Fields that bump a requirement's version when edited. */
export const VERSIONED_FIELDS = ['title', 'statement', 'acceptance', 'priority'];

/** Returns the patch extended with version + history if a versioned field changed. */
export function versionPatch(current: Entity, patch: Record<string, unknown>, at: string): Record<string, unknown> {
  const changed = VERSIONED_FIELDS.some((f) => f in patch && (patch[f] ?? '') !== (current[f] ?? ''));
  if (!changed || !['approved', 'implemented', 'verified', 'in-review'].includes(current.status)) return patch;
  const history = [...((current.history ?? []) as unknown[]), { version: current.version ?? 1, title: current.title, statement: current.statement, priority: current.priority, at }];
  return { ...patch, version: (current.version ?? 1) + 1, history };
}
