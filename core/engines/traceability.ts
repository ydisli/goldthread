import type { Graph } from '../graph.ts';
import { ENTITY_MAP, type Entity } from '../schema.ts';
import { uniq } from '../util.ts';

export interface TraceRow {
  requirement: Entity;
  stories: Entity[];
  tests: Entity[];
  releases: Entity[];
  defects: Entity[];
  bet?: Entity;
  testStatus: { pass: number; fail: number; blocked: number; notRun: number };
  gaps: ('no-story' | 'no-test' | 'failing-test' | 'not-released' | 'no-source' | 'requirement-defects')[];
}

/** Requirements traceability matrix, generated from the graph. */
export function traceMatrix(g: Graph): { rows: TraceRow[]; orphanTests: Entity[]; orphanStories: Entity[]; coverage: { story: number; test: number; pass: number } } {
  const reqs = g.all('requirement').filter((r) => r.status !== 'deprecated');
  const rows: TraceRow[] = reqs.map((r) => {
    const stories = g.referencing(r.id, 'story', 'requirementIds');
    const tests = uniq([
      ...g.referencing(r.id, 'testCase', 'requirementIds'),
      ...stories.flatMap((s) => g.referencing(s.id, 'testCase', 'storyIds')),
    ]);
    const releases = uniq(stories.map((s) => g.get(s.releaseId)).filter((x): x is Entity => !!x));
    const defects = uniq([...g.referencing(r.id, 'defect', 'requirementId'), ...stories.flatMap((s) => g.referencing(s.id, 'defect', 'storyId'))]);
    const testStatus = {
      pass: tests.filter((t) => t.status === 'pass').length,
      fail: tests.filter((t) => t.status === 'fail').length,
      blocked: tests.filter((t) => t.status === 'blocked').length,
      notRun: tests.filter((t) => !t.status || t.status === 'not-run').length,
    };
    const gaps: TraceRow['gaps'] = [];
    if (!stories.length) gaps.push('no-story');
    if (!tests.length) gaps.push('no-test');
    if (testStatus.fail) gaps.push('failing-test');
    if (stories.length && !releases.length) gaps.push('not-released');
    if (!(r.sourceIds ?? []).length) gaps.push('no-source');
    if (defects.some((d) => d.rootCause === 'requirement')) gaps.push('requirement-defects');
    return { requirement: r, stories, tests, releases, defects, bet: g.get(r.betId), testStatus, gaps };
  });
  const orphanTests = g.all('testCase').filter((t) => !(t.requirementIds ?? []).length && !(t.storyIds ?? []).length);
  const orphanStories = g.all('story').filter((s) => !(s.requirementIds ?? []).length && !s.betId);
  const n = Math.max(1, rows.length);
  return {
    rows, orphanTests, orphanStories,
    coverage: {
      story: rows.filter((r) => r.stories.length).length / n,
      test: rows.filter((r) => r.tests.length).length / n,
      pass: rows.filter((r) => r.tests.length && r.testStatus.pass === r.tests.length).length / n,
    },
  };
}

export interface Impact {
  root: Entity;
  byType: { type: string; label: string; items: { entity: Entity; depth: number; via: Entity[] }[] }[];
  stakeholders: { stakeholder: Entity; reasons: string[] }[];
  total: number;
}

/** Ripple analysis: everything that may be affected if `id` changes. */
export function impactAnalysis(g: Graph, id: string, depth = 3): Impact | null {
  const root = g.get(id);
  if (!root) return null;
  const reached = g.traverse(id, depth);
  const groups = new Map<string, { entity: Entity; depth: number; via: Entity[] }[]>();
  for (const r of reached) {
    if (r.entity.type === 'stakeholder' || r.entity.type === 'interaction') continue;
    const list = groups.get(r.entity.type);
    if (list) list.push(r);
    else groups.set(r.entity.type, [r]);
  }
  // Stakeholders: owners, approvers, deciders, requesters, promisees, RACI members of anything affected.
  const affected = [root, ...reached.map((r) => r.entity)];
  const reasons = new Map<string, Set<string>>();
  const note = (sid: string | undefined, why: string) => {
    if (!sid || !g.get(sid)) return;
    if (!reasons.has(sid)) reasons.set(sid, new Set());
    reasons.get(sid)!.add(why);
  };
  for (const e of affected) {
    const label = ENTITY_MAP[e.type]?.label ?? e.type;
    note(e.ownerId, `owns ${label.toLowerCase()} "${e.title ?? e.name}"`);
    if (e.type === 'approval') for (const a of e.approvers ?? []) note(a.stakeholderId, `approver on "${e.title}"`);
    if (e.type === 'decision') for (const d of e.deciderIds ?? []) note(d, `decided "${e.title}"`);
    if (e.type === 'request') note(e.requesterId, `requested "${e.title}"`);
    if (e.type === 'commitment') note(e.toId, `was promised "${e.title}"`);
    if (e.type === 'testCase') note(e.testerId, `tests "${e.title}"`);
    if (e.type === 'changeRequest') note(e.requestedById, `requested change "${e.title}"`);
  }
  for (const m of g.all('raci')) {
    if (affected.some((e) => e.id === m.scopeId)) {
      for (const a of m.activities ?? []) for (const [sid, role] of Object.entries((m.assignments?.[a] ?? {}) as Record<string, string>)) if (role === 'A' || role === 'R') note(sid, `${role} for "${a}"`);
    }
  }
  const order = ['requirement', 'story', 'testCase', 'decisionTable', 'useCase', 'stateModel', 'decision', 'spec', 'bet', 'release', 'commitment', 'request', 'approval', 'defect', 'feature', 'raid'];
  const byType = [...groups.entries()]
    .sort((a, b) => (order.indexOf(a[0]) + 100) % 100 - (order.indexOf(b[0]) + 100) % 100)
    .map(([type, items]) => ({ type, label: ENTITY_MAP[type]?.plural ?? type, items: items.sort((a, b) => a.depth - b.depth) }));
  return {
    root, byType,
    stakeholders: [...reasons.entries()].map(([sid, rs]) => ({ stakeholder: g.get(sid)!, reasons: [...rs] })),
    total: reached.length,
  };
}

/** Short markdown impact summary for a change request. */
export function impactSummary(g: Graph, requirementIds: string[]): string {
  const lines: string[] = [];
  for (const id of requirementIds) {
    const imp = impactAnalysis(g, id, 2);
    if (!imp) continue;
    lines.push(`### ${imp.root.key ?? ''} ${imp.root.title}`);
    for (const grp of imp.byType) lines.push(`- **${grp.label}:** ${grp.items.slice(0, 6).map((i) => i.entity.key ?? i.entity.title ?? i.entity.name).join(', ')}${grp.items.length > 6 ? ` +${grp.items.length - 6}` : ''}`);
    if (imp.stakeholders.length) lines.push(`- **People to inform:** ${imp.stakeholders.map((s) => s.stakeholder.name).join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}
