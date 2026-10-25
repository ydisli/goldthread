import type { Entity } from '../schema.ts';
import { addDays, daysBetween, isoDate, parseDate, percentile, seededRandom } from '../util.ts';

/** Weekly throughput samples: stories done per week over the last `weeks` weeks. */
export function weeklyThroughput(stories: Entity[], now: Date, weeks = 12): number[] {
  const samples = new Array(weeks).fill(0);
  for (const s of stories) {
    if (s.status !== 'done' || !s.doneAt) continue;
    const ago = daysBetween(s.doneAt, now);
    if (ago < 0 || ago >= weeks * 7) continue;
    samples[weeks - 1 - Math.floor(ago / 7)]++;
  }
  return samples;
}

export interface Forecast {
  remaining: number;
  samples: number[];
  trials: number;
  weeks: { p50: number; p70: number; p85: number; p95: number };
  dates: { p50: string; p70: string; p85: string; p95: string };
  histogram: { weeks: number; count: number }[];
  /** Probability of finishing by the given date (if provided). */
  probabilityBy?: number;
}

/** Monte Carlo forecast: how many weeks until `remaining` items are done. */
export function monteCarlo(remaining: number, samples: number[], now: Date, opts: { trials?: number; seed?: number; targetDate?: string } = {}): Forecast | null {
  const trials = opts.trials ?? 5000;
  const usable = samples.filter((x) => x >= 0);
  if (remaining <= 0) {
    const d = isoDate(now);
    return { remaining: 0, samples, trials, weeks: { p50: 0, p70: 0, p85: 0, p95: 0 }, dates: { p50: d, p70: d, p85: d, p95: d }, histogram: [], probabilityBy: 1 };
  }
  if (!usable.length || usable.every((x) => x === 0)) return null;
  const rnd = seededRandom(opts.seed ?? 42);
  const results: number[] = [];
  const MAX_WEEKS = 260;
  for (let t = 0; t < trials; t++) {
    let left = remaining, w = 0;
    while (left > 0 && w < MAX_WEEKS) {
      left -= usable[Math.floor(rnd() * usable.length)];
      w++;
    }
    results.push(w);
  }
  results.sort((a, b) => a - b);
  const p = (q: number) => Math.ceil(percentile(results, q));
  const weeks = { p50: p(50), p70: p(70), p85: p(85), p95: p(95) };
  const toDate = (w: number) => addDays(now, w * 7);
  const hist = new Map<number, number>();
  for (const r of results) hist.set(r, (hist.get(r) ?? 0) + 1);
  let probabilityBy: number | undefined;
  if (opts.targetDate) {
    const weeksAvail = daysBetween(now, opts.targetDate) / 7;
    probabilityBy = results.filter((r) => r <= weeksAvail).length / trials;
  }
  return {
    remaining, samples, trials, weeks,
    dates: { p50: toDate(weeks.p50), p70: toDate(weeks.p70), p85: toDate(weeks.p85), p95: toDate(weeks.p95) },
    histogram: [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([weeks, count]) => ({ weeks, count })),
    probabilityBy,
  };
}

/** Stories belonging to a bet or release. */
export function scopeStories(stories: Entity[], scope: Entity): Entity[] {
  if (scope.type === 'bet') return stories.filter((s) => s.betId === scope.id);
  if (scope.type === 'release') {
    const bets = new Set<string>(scope.betIds ?? []);
    return stories.filter((s) => s.releaseId === scope.id || (s.betId && bets.has(s.betId) && !s.releaseId));
  }
  return [];
}

export interface ScopeCreep { original: number; added: number; addedIds: string[]; ratio: number }

/** Stories added to a bet after it was committed (startDate). */
export function scopeCreep(stories: Entity[], bet: Entity): ScopeCreep | null {
  const start = parseDate(bet.startDate);
  if (!start) return null;
  const inScope = stories.filter((s) => s.betId === bet.id);
  const added = inScope.filter((s) => (parseDate(s.createdAt?.slice(0, 10)) ?? start) > start);
  const original = inScope.length - added.length;
  return { original, added: added.length, addedIds: added.map((s) => s.id), ratio: original ? added.length / original : 0 };
}

/**
 * Forecast for a bet or release from team (or overall) throughput. When a
 * team has several bets in delivery, its throughput is split evenly between
 * them (`concurrent`).
 */
export function forecastScope(allStories: Entity[], scope: Entity, now: Date, opts: { targetDate?: string; concurrent?: number } = {}): Forecast | null {
  const stories = scopeStories(allStories, scope);
  const remaining = stories.filter((s) => s.status !== 'done').length;
  const teamId = scope.teamId;
  let samples = weeklyThroughput(teamId ? allStories.filter((s) => s.teamId === teamId) : allStories, now);
  if (samples.every((x) => x === 0)) samples = weeklyThroughput(allStories, now);
  const share = 1 / Math.max(1, opts.concurrent ?? 1);
  return monteCarlo(remaining, samples.map((x) => x * share), now, { targetDate: opts.targetDate ?? scope.targetDate });
}

/** Number of bets in delivery sharing the bet's team (at least 1). */
export function concurrency(bets: Entity[], bet: Entity): number {
  if (!bet.teamId) return 1;
  return Math.max(1, bets.filter((b) => b.teamId === bet.teamId && b.status === 'in-delivery').length);
}
