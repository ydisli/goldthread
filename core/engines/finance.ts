import type { Entity } from '../schema.ts';

export interface BusinessCaseResult {
  flows: { year: number; cost: number; benefit: number; net: number; cumulative: number; discounted: number }[];
  npv: number;
  roi: number;
  paybackYears: number | null;
  irr: number | null;
  totalCost: number;
  totalBenefit: number;
}

export function parseRamp(s: unknown, years: number): number[] {
  const parts = String(s ?? '').split(/[,\s]+/).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  const out: number[] = [];
  for (let i = 0; i < years; i++) out.push((parts[i] ?? parts[parts.length - 1] ?? 100) / 100);
  return out;
}

export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, f, t) => acc + f / (1 + rate) ** t, 0);
}

export function irr(flows: number[]): number | null {
  // Bisection on NPV(rate) = 0 within [-0.99, 10].
  let lo = -0.99, hi = 10;
  const f = (r: number) => npv(r, flows);
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Cash flows, NPV, ROI, payback and IRR for a business case entity. */
export function evaluateBusinessCase(bc: Entity): BusinessCaseResult {
  const years = Math.max(1, Math.min(10, Number(bc.years) || 3));
  const rate = (Number(bc.discountRate) || 0) / 100;
  const ramp = parseRamp(bc.rampUp, years);
  const oneTime = Number(bc.oneTimeCost) || 0, annualCost = Number(bc.annualCost) || 0, annualBenefit = Number(bc.annualBenefit) || 0;
  const flows: BusinessCaseResult['flows'] = [];
  let cumulative = -oneTime;
  flows.push({ year: 0, cost: oneTime, benefit: 0, net: -oneTime, cumulative, discounted: -oneTime });
  for (let y = 1; y <= years; y++) {
    const benefit = annualBenefit * ramp[y - 1];
    const net = benefit - annualCost;
    cumulative += net;
    flows.push({ year: y, cost: annualCost, benefit, net, cumulative, discounted: net / (1 + rate) ** y });
  }
  const nets = flows.map((f) => f.net);
  const totalCost = oneTime + annualCost * years;
  const totalBenefit = flows.reduce((a, f) => a + f.benefit, 0);
  let paybackYears: number | null = null;
  for (let i = 1; i < flows.length; i++) {
    if (flows[i].cumulative >= 0 && flows[i - 1].cumulative < 0) {
      paybackYears = i - 1 + -flows[i - 1].cumulative / flows[i].net;
      break;
    }
  }
  if (oneTime === 0 && flows[1]?.net > 0) paybackYears = 0;
  return { flows, npv: npv(rate, nets), roi: totalCost ? (totalBenefit - totalCost) / totalCost : 0, paybackYears, irr: irr(nets), totalCost, totalBenefit };
}

/** Cost of delay (CD3): cost of delay per week divided by duration in weeks. */
export function cd3(costOfDelayPerWeek: number, durationWeeks: number): number | null {
  if (!costOfDelayPerWeek || !durationWeeks) return null;
  return costOfDelayPerWeek / durationWeeks;
}
