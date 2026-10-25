import type { Entity } from '../schema.ts';
import { seededRandom } from '../util.ts';

export type Method = 'rice' | 'wsjf';

export function rice(b: Entity): number | null {
  const reach = Number(b.reach), impact = Number(b.impact), conf = Number(b.confidence), effort = Number(b.effort);
  if (!reach || !impact || !conf || !effort) return null;
  return (reach * impact * (conf / 100)) / effort;
}

export function wsjf(b: Entity): number | null {
  const bv = Number(b.businessValue), tc = Number(b.timeCriticality), rr = Number(b.riskReduction), js = Number(b.jobSize);
  if (!js || (!bv && !tc && !rr)) return null;
  return (bv + tc + rr) / js;
}

export function score(b: Entity, method: Method): number | null {
  return method === 'rice' ? rice(b) : wsjf(b);
}

export interface Ranked { bet: Entity; score: number; rank: number }

export function rank(bets: Entity[], method: Method): Ranked[] {
  return bets
    .map((bet) => ({ bet, score: score(bet, method) }))
    .filter((x): x is { bet: Entity; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

export interface Flip {
  higherId: string;
  lowerId: string;
  /** Human sentence describing the smallest change that swaps the two. */
  message: string;
  /** Relative change needed (0.15 = 15%). Small = fragile ranking. */
  relativeChange: number;
}

/**
 * Sensitivity analysis: for each adjacent pair in the ranking, find the
 * smallest single-input change to the higher item that would swap them.
 */
export function sensitivity(ranked: Ranked[], method: Method): Flip[] {
  const flips: Flip[] = [];
  for (let i = 0; i < ranked.length - 1; i++) {
    const a = ranked[i], b = ranked[i + 1];
    const candidates: { msg: string; rel: number }[] = [];
    if (method === 'rice') {
      const reach = Number(a.bet.reach), impact = Number(a.bet.impact), conf = Number(a.bet.confidence), effort = Number(a.bet.effort);
      const confFlip = (b.score * effort) / (reach * impact) * 100;
      if (confFlip > 0 && confFlip < conf) candidates.push({ msg: `confidence in "${a.bet.title}" drops below ${Math.round(confFlip)}% (now ${conf}%)`, rel: (conf - confFlip) / conf });
      const effortFlip = (reach * impact * (conf / 100)) / b.score;
      if (effortFlip > effort) candidates.push({ msg: `effort for "${a.bet.title}" grows beyond ${effortFlip.toFixed(1)} person-weeks (now ${effort})`, rel: (effortFlip - effort) / effort });
      const reachFlip = (b.score * effort) / (impact * (conf / 100));
      if (reachFlip < reach) candidates.push({ msg: `reach of "${a.bet.title}" is below ${Math.round(reachFlip)} (now ${reach})`, rel: (reach - reachFlip) / reach });
    } else {
      const js = Number(a.bet.jobSize), num = Number(a.bet.businessValue) + Number(a.bet.timeCriticality) + Number(a.bet.riskReduction);
      const jsFlip = num / b.score;
      if (jsFlip > js) candidates.push({ msg: `job size of "${a.bet.title}" is ${jsFlip.toFixed(1)} or more (now ${js})`, rel: (jsFlip - js) / js });
      const bvNeeded = b.score * js - (num - Number(a.bet.businessValue));
      if (bvNeeded < Number(a.bet.businessValue)) candidates.push({ msg: `business value of "${a.bet.title}" is ${bvNeeded.toFixed(1)} or less (now ${a.bet.businessValue})`, rel: (Number(a.bet.businessValue) - bvNeeded) / Number(a.bet.businessValue) });
    }
    candidates.sort((x, y) => x.rel - y.rel);
    const best = candidates[0];
    if (best) flips.push({ higherId: a.bet.id, lowerId: b.bet.id, message: `#${a.rank} and #${b.rank} swap if ${best.msg}.`, relativeChange: best.rel });
  }
  return flips;
}

/**
 * Ranking stability: perturb each item's inputs according to its own
 * uncertainty (lower confidence → wider spread) and count how often each
 * item lands in the top K.
 */
export function rankingStability(bets: Entity[], method: Method, topK = 3, trials = 2000, seed = 7): Map<string, number> {
  const rnd = seededRandom(seed);
  const counts = new Map<string, number>();
  const base = rank(bets, method);
  for (let t = 0; t < trials; t++) {
    const sampled = base.map(({ bet, score }) => {
      const conf = Math.max(10, Number(bet.confidence) || 50);
      const spread = (100 - conf) / 100; // 0 … 0.9
      // Triangular noise in [-spread, +spread], skewed slightly pessimistic.
      const u = rnd(), v = rnd();
      const noise = (u + v - 1) * spread - spread * 0.1;
      return { id: bet.id, s: score * Math.max(0.05, 1 + noise) };
    });
    sampled.sort((a, b) => b.s - a.s);
    for (const x of sampled.slice(0, topK)) counts.set(x.id, (counts.get(x.id) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const { bet } of base) out.set(bet.id, (counts.get(bet.id) ?? 0) / trials);
  return out;
}
