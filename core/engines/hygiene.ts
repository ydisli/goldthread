import type { Entity } from '../schema.ts';
import { daysBetween, jaccard, tokenize } from '../util.ts';

export interface InvestCheck { key: 'I' | 'N' | 'V' | 'E' | 'S' | 'T'; label: string; ok: boolean; hint: string }

export function hasGherkin(ac: string | undefined): boolean {
  if (!ac) return false;
  return /\bgiven\b/i.test(ac) && /\bwhen\b/i.test(ac) && /\bthen\b/i.test(ac);
}

export interface GherkinIssue { scenario: number; message: string }

/** Validate Given/When/Then structure of each scenario. */
export function validateGherkin(ac: string | undefined): GherkinIssue[] {
  if (!ac?.trim()) return [{ scenario: 0, message: 'No acceptance criteria.' }];
  const issues: GherkinIssue[] = [];
  const blocks = ac.split(/\n(?=\s*(?:scenario|#+\s*scenario)\b)|\n\s*\n/i).map((b) => b.trim()).filter(Boolean);
  blocks.forEach((b, i) => {
    const has = (k: string) => new RegExp(`^\\s*[-*]?\\s*(?:${k})\\b`, 'im').test(b);
    if (!has('given')) issues.push({ scenario: i + 1, message: `Scenario ${i + 1} has no Given (context).` });
    if (!has('when')) issues.push({ scenario: i + 1, message: `Scenario ${i + 1} has no When (action).` });
    if (!has('then')) issues.push({ scenario: i + 1, message: `Scenario ${i + 1} has no Then (outcome).` });
    if ((b.match(/^\s*[-*]?\s*when\b/gim) ?? []).length > 1) issues.push({ scenario: i + 1, message: `Scenario ${i + 1} has several Whens — split it.` });
  });
  return issues;
}

/** INVEST check for a user story. */
export function invest(s: Entity): InvestCheck[] {
  const deps = (s.dependsOnIds ?? []).length;
  const est = Number(s.estimate);
  const text = `${s.title ?? ''} ${s.iWant ?? ''}`;
  return [
    { key: 'I', label: 'Independent', ok: deps === 0, hint: deps ? `Depends on ${deps} other ${deps === 1 ? 'story' : 'stories'}.` : 'No dependencies.' },
    { key: 'N', label: 'Negotiable', ok: !/\b(pixel|exact(ly)? as|must use (react|sql|redis)|button colou?r)\b/i.test(text), hint: 'Describes the need, not the implementation.' },
    { key: 'V', label: 'Valuable', ok: !!s.soThat?.trim(), hint: s.soThat ? 'Has a "so that".' : 'Missing "so that" — whose value?' },
    { key: 'E', label: 'Estimable', ok: est > 0, hint: est > 0 ? `${est} points.` : 'Not estimated.' },
    { key: 'S', label: 'Small', ok: est > 0 && est <= 8, hint: est > 8 ? `${est} points — split it.` : est > 0 ? 'Fits in a sprint.' : 'Unknown size.' },
    { key: 'T', label: 'Testable', ok: hasGherkin(s.acceptance), hint: hasGherkin(s.acceptance) ? 'Has Given/When/Then.' : 'No Given/When/Then acceptance criteria.' },
  ];
}

/** SPIDR splitting hints (Spike, Path, Interface, Data, Rules). */
export function splitHints(s: Entity): string[] {
  const t = `${s.title ?? ''} ${s.iWant ?? ''} ${s.acceptance ?? ''}`;
  const hints: string[] = [];
  const formats = t.match(/\b(csv|xlsx|pdf|json|xml|excel)\b/gi);
  if (formats && new Set(formats.map((f) => f.toLowerCase())).size > 1) hints.push(`Data: split by format (${[...new Set(formats.map((f) => f.toUpperCase()))].join(' / ')}) — ship the most-requested first.`);
  if (/\b(and|or)\b/i.test(s.iWant ?? '')) hints.push('Path: the "I want" contains and/or — one story per path.');
  if (/\b(web|mobile|api|ios|android)\b.*\b(web|mobile|api|ios|android)\b/i.test(t)) hints.push('Interface: split by channel (web first, then API/mobile).');
  if ((t.match(/\b(if|unless|except|when)\b/gi) ?? []).length >= 3) hints.push('Rules: several business rules — implement the simplest rule first, add the others as stories.');
  if (/\b(investigate|unknown|research|spike|evaluate)\b/i.test(t)) hints.push('Spike: time-box the unknown first, then estimate.');
  if (Number(s.estimate) > 8 && !hints.length) hints.push('Large story — split by workflow step or by happy path vs edge cases.');
  return hints;
}

export interface HygieneReport {
  score: number;
  duplicates: { a: Entity; b: Entity; similarity: number }[];
  stale: Entity[];
  orphans: Entity[];
  noAcceptance: Entity[];
  oversized: Entity[];
  cycles: string[][];
  unestimated: Entity[];
  blockedByLater: { story: Entity; dependency: Entity }[];
}

/** Backlog hygiene scan over stories that are not done. */
export function backlogHygiene(stories: Entity[], now: Date, staleDays = 90): HygieneReport {
  const open = stories.filter((s) => s.status !== 'done');
  const tok = new Map(open.map((s) => [s.id, new Set(tokenize(`${s.title} ${s.iWant ?? ''}`))]));
  const duplicates: HygieneReport['duplicates'] = [];
  for (let i = 0; i < open.length; i++)
    for (let j = i + 1; j < open.length; j++) {
      const sim = jaccard(tok.get(open[i].id)!, tok.get(open[j].id)!);
      if (sim >= 0.6) duplicates.push({ a: open[i], b: open[j], similarity: sim });
    }
  const stale = open.filter((s) => s.status === 'backlog' && daysBetween((s.updatedAt ?? s.createdAt ?? '').slice(0, 10), now) > staleDays);
  const orphans = open.filter((s) => !s.betId && !(s.requirementIds ?? []).length);
  const noAcceptance = open.filter((s) => ['ready', 'in-progress', 'backlog'].includes(s.status) && !hasGherkin(s.acceptance));
  const oversized = open.filter((s) => Number(s.estimate) > 13);
  const unestimated = open.filter((s) => s.status === 'ready' && !(Number(s.estimate) > 0));
  const cycles = findCycles(stories);
  const byId = new Map(stories.map((s) => [s.id, s]));
  const blockedByLater: HygieneReport['blockedByLater'] = [];
  for (const s of open) {
    for (const d of (s.dependsOnIds ?? []) as string[]) {
      const dep = byId.get(d);
      if (dep && dep.status !== 'done' && s.status === 'ready' && dep.status === 'backlog') blockedByLater.push({ story: s, dependency: dep });
    }
  }
  const n = Math.max(1, open.length);
  const penalty = (duplicates.length * 2 + stale.length + orphans.length * 1.5 + noAcceptance.length + oversized.length + cycles.length * 5 + unestimated.length + blockedByLater.length * 2) / n;
  const score = Math.max(0, Math.round(100 - penalty * 40));
  return { score, duplicates, stale, orphans, noAcceptance, oversized, cycles, unestimated, blockedByLater };
}

export function findCycles(stories: Entity[]): string[][] {
  const adj = new Map(stories.map((s) => [s.id, (s.dependsOnIds ?? []) as string[]]));
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    color.set(id, 1);
    stack.push(id);
    for (const n of adj.get(id) ?? []) {
      if (!adj.has(n)) continue;
      if (color.get(n) === 1) {
        const cycle = stack.slice(stack.indexOf(n));
        const key = [...cycle].sort().join(',');
        if (!seen.has(key)) { seen.add(key); cycles.push(cycle); }
      } else if (!color.get(n)) visit(n);
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const id of adj.keys()) if (!color.get(id)) visit(id);
  return cycles;
}

/** Definition of Ready for a story. */
export function readiness(s: Entity): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!s.asA || !s.iWant) missing.push('User story statement (as a / I want)');
  if (!s.soThat) missing.push('"So that" (value)');
  if (!hasGherkin(s.acceptance)) missing.push('Given/When/Then acceptance criteria');
  if (!(Number(s.estimate) > 0)) missing.push('Estimate');
  if (Number(s.estimate) > 8) missing.push('Small enough (≤ 8 points)');
  if (!s.betId && !(s.requirementIds ?? []).length) missing.push('Link to a bet or requirement');
  return { ok: missing.length === 0, missing };
}
