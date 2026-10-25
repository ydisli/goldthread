/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Inverse standard normal CDF (Acklam's algorithm). */
export function normalInv(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError('p must be in (0,1)');
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Sample size per variant for a two-sided two-proportion test.
 * baseline and mde are fractions (0.12 = 12%); mde is relative lift.
 */
export function sampleSizePerVariant(baseline: number, mdeRelative: number, alpha = 0.05, power = 0.8): number | null {
  if (!(baseline > 0 && baseline < 1) || !(mdeRelative > 0)) return null;
  const p1 = baseline, p2 = baseline * (1 + mdeRelative);
  if (p2 >= 1) return null;
  const za = normalInv(1 - alpha / 2), zb = normalInv(power);
  const pbar = (p1 + p2) / 2;
  const n = (za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2;
  return Math.ceil(n);
}

export interface ZTest {
  p1: number; p2: number; lift: number; z: number; pValue: number;
  ci: [number, number]; significant: boolean;
}

/** Two-proportion z-test (control vs variant). */
export function twoProportionTest(n1: number, x1: number, n2: number, x2: number, alpha = 0.05): ZTest | null {
  if (!(n1 > 0 && n2 > 0) || x1 < 0 || x2 < 0 || x1 > n1 || x2 > n2) return null;
  const p1 = x1 / n1, p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const zc = normalInv(1 - alpha / 2);
  return { p1, p2, lift: p1 ? (p2 - p1) / p1 : 0, z, pValue, ci: [p2 - p1 - zc * seDiff, p2 - p1 + zc * seDiff], significant: pValue < alpha };
}
