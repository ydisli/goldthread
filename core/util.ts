export const DAY_MS = 86_400_000;

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string | Date | undefined | null): Date | null {
  if (!s) return null;
  if (s instanceof Date) return s;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string | Date, b: string | Date): number {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db) return NaN;
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

export function addDays(s: string | Date, n: number): string {
  const d = parseDate(s) ?? new Date();
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return isoDate(out);
}

export function newId(prefix = 'e'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function sum(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

export function mean(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : 0;
}

/** Percentile with linear interpolation, p in [0, 100]. */
export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Deterministic PRNG (mulberry32) so simulations are reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fmtMoney(n: number | undefined | null, currency = '$'): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}${currency}${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}${currency}${(a / 1_000).toFixed(a >= 100_000 ? 0 : 1)}k`;
  return `${sign}${currency}${Math.round(a)}`;
}

/** "$1.2M ARR · 340 people" — whichever measures of impact are present. */
export function impactText(arr: number, people: number): string {
  const parts: string[] = [];
  if (people > 0) parts.push(`${people.toLocaleString('en-US')} ${people === 1 ? 'person' : 'people'}`);
  if (arr > 0) parts.push(`${fmtMoney(arr)} ARR`);
  return parts.join(' · ') || 'impact not sized';
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const STOPWORDS = new Set(`a about above after again against all am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have having he her here hers
herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or
other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there
these they this those through to too under until up very was we were what when where which while who whom why will with
would you your yours yourself yourselves shall must may might also via per etc get got us let lets need needs want wants
able like really one two make made every much many want using use used`.split(/\s+/));

/** Light stemmer: strips common English suffixes so "exports"/"exporting" match. */
export function stem(w: string): string {
  if (w.length <= 4) return w;
  let out = w;
  for (const suf of ['ations', 'ation', 'ings', 'ing', 'ers', 'ies', 'ied', 'ed', 'es', 's', 'ly']) {
    if (!w.endsWith(suf) || w.length - suf.length < 3) continue;
    const base = w.slice(0, -suf.length);
    if (suf === 'ies' || suf === 'ied') out = `${base}y`;
    // "boxes" → "box", but "invoices" → "invoice" (then the trailing e goes below).
    else if (suf === 'es') out = /(s|x|z|ch|sh)$/.test(base) ? base : w.slice(0, -1);
    else out = base;
    break;
  }
  // Drop a trailing "e" so "delete"/"deleted" and "invoice"/"invoices" share a stem.
  return out.length > 4 && out.endsWith('e') ? out.slice(0, -1) : out;
}

export function tokenize(text: string | undefined | null, opts: { stem?: boolean; keepStop?: boolean } = {}): string[] {
  if (!text) return [];
  const words = text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/);
  const out: string[] = [];
  for (const w of words) {
    if (!w || w.length < 2) continue;
    if (!opts.keepStop && STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w) && !opts.keepStop) continue;
    out.push(opts.stem === false ? w : stem(w));
  }
  return out;
}

/**
 * All pairs of sets with Jaccard similarity ≥ `threshold`, without comparing every pair:
 * the classic prefix filter. Tokens are ordered rarest first; two sets can only reach the
 * threshold if they share a token among the first |A| − ⌈t·|A|⌉ + 1 of either. Exact.
 */
export function similarPairs<T>(sets: Set<T>[], threshold: number): { i: number; j: number; similarity: number }[] {
  const df = new Map<T, number>();
  for (const s of sets) for (const t of s) df.set(t, (df.get(t) ?? 0) + 1);
  const order = (s: Set<T>) => [...s].sort((x, y) => (df.get(x)! - df.get(y)!) || (String(x) < String(y) ? -1 : 1));
  const index = new Map<T, number[]>();
  const out: { i: number; j: number; similarity: number }[] = [];
  sets.forEach((s, i) => {
    if (!s.size) return;
    const toks = order(s);
    const prefix = toks.length - Math.ceil(threshold * toks.length) + 1;
    const seen = new Set<number>();
    for (let k = 0; k < prefix; k++) {
      for (const j of index.get(toks[k]) ?? []) {
        if (seen.has(j)) continue;
        seen.add(j);
        const sim = jaccard(sets[j], s);
        if (sim >= threshold) out.push({ i: j, j: i, similarity: sim });
      }
    }
    for (let k = 0; k < prefix; k++) { const l = index.get(toks[k]); if (l) l.push(i); else index.set(toks[k], [i]); }
  });
  return out;
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function uniq<T>(xs: Iterable<T>): T[] {
  return [...new Set(xs)];
}

export function groupBy<T, K extends string | number>(xs: T[], key: (x: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const x of xs) {
    const k = key(x);
    (out[k] ??= []).push(x);
  }
  return out;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function truncate(s: string | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
