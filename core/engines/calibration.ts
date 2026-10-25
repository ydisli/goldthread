import type { Entity } from '../schema.ts';

const OUTCOME: Record<string, number> = { success: 1, partial: 0.5, failed: 0 };

export interface Calibration {
  n: number;
  brier: number | null;
  buckets: { range: string; predicted: number; actual: number; n: number }[];
  /** Positive = overconfident (predicted > actual), negative = underconfident. */
  bias: number | null;
  verdict: string;
}

/** How well do confidence estimates predict actual results? */
export function calibration(bets: Entity[]): Calibration {
  const scored = bets.filter((b) => b.result in OUTCOME && typeof b.confidence === 'number');
  if (!scored.length) return { n: 0, brier: null, buckets: [], bias: null, verdict: 'No measured bets yet — set check dates and record results.' };
  const brier = scored.reduce((s, b) => s + (b.confidence / 100 - OUTCOME[b.result]) ** 2, 0) / scored.length;
  const ranges: [number, number][] = [[0, 40], [40, 60], [60, 80], [80, 101]];
  const buckets = ranges.map(([lo, hi]) => {
    const inB = scored.filter((b) => b.confidence >= lo && b.confidence < hi);
    return {
      range: `${lo}–${Math.min(hi, 100)}%`,
      predicted: inB.length ? inB.reduce((s, b) => s + b.confidence, 0) / inB.length / 100 : 0,
      actual: inB.length ? inB.reduce((s, b) => s + OUTCOME[b.result], 0) / inB.length : 0,
      n: inB.length,
    };
  }).filter((b) => b.n > 0);
  const bias = scored.reduce((s, b) => s + (b.confidence / 100 - OUTCOME[b.result]), 0) / scored.length;
  const verdict = Math.abs(bias) < 0.1 ? 'Well calibrated.' : bias > 0 ? `Overconfident by ${Math.round(bias * 100)} points on average — discount new estimates or demand more evidence.` : `Underconfident by ${Math.round(-bias * 100)} points — you can afford bolder bets.`;
  return { n: scored.length, brier, buckets, bias, verdict };
}
