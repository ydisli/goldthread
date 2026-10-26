import type { Entity } from '../schema.ts';
import { tokenize, stem } from '../util.ts';

export interface Contradiction {
  aId: string;
  bId: string;
  kind: 'polarity' | 'antonym' | 'numeric';
  reason: string;
  score: number;
}

const NEGATION = /\b(cannot|can't|can not|must not|mustn't|shall not|will not|won't|never|not allowed|not permitted|prohibited|forbidden|may not|no one|nobody|disallow\w*|prevent\w*|block\w*)\b/i;

// Pairs of concepts that cannot both hold for the same subject.
const ANTONYMS: [string[], string[]][] = [
  [['delete', 'remove', 'purge', 'erase'], ['immutable', 'retain', 'retained', 'preserve', 'preserved', 'kept', 'archive']],
  [['edit', 'modify', 'change', 'update', 'overwrite'], ['immutable', 'read-only', 'readonly', 'locked', 'frozen']],
  [['public', 'anyone', 'unauthenticated', 'anonymous'], ['private', 'authenticated', 'restricted', 'internal']],
  [['allow', 'enable', 'permit'], ['prohibit', 'forbid', 'deny', 'disable', 'block']],
  [['show', 'display', 'visible'], ['hide', 'hidden', 'mask', 'masked', 'redact', 'redacted']],
  [['synchronous', 'immediately', 'instant'], ['asynchronous', 'background', 'queued', 'batch']],
];

const UNIT_ALIASES: Record<string, string> = {
  s: 'seconds', sec: 'seconds', secs: 'seconds', second: 'seconds', seconds: 'seconds',
  ms: 'ms', millisecond: 'ms', milliseconds: 'ms',
  min: 'minutes', mins: 'minutes', minute: 'minutes', minutes: 'minutes',
  h: 'hours', hr: 'hours', hrs: 'hours', hour: 'hours', hours: 'hours',
  day: 'days', days: 'days', week: 'weeks', weeks: 'weeks', month: 'months', months: 'months', year: 'years', years: 'years',
  row: 'rows', rows: 'rows', record: 'rows', records: 'rows', item: 'items', items: 'items',
  mb: 'MB', gb: 'GB', kb: 'KB', '%': '%', percent: '%', users: 'users', user: 'users', invoices: 'invoices', invoice: 'invoices',
};

const MODAL_WORDS = new Set(['shall', 'must', 'can', 'cannot', 'allow', 'allowed', 'system', 'user', 'able', 'never', 'always', 'permit', 'prohibit']);

function text(e: Entity): string {
  return [e.title, e.statement].filter(Boolean).join('. ');
}

function keyTerms(s: string): Set<string> {
  return new Set(tokenize(s).filter((w) => !MODAL_WORDS.has(w) && w.length > 2));
}

function quantities(s: string): { value: number; unit: string }[] {
  const out: { value: number; unit: string }[] = [];
  for (const m of s.toLowerCase().matchAll(/(\d[\d,.]*)\s*(%|[a-z]+)/g)) {
    const unit = UNIT_ALIASES[m[2]];
    if (!unit) continue;
    const value = Number(m[1].replace(/,/g, ''));
    if (!Number.isNaN(value)) out.push({ value, unit });
  }
  return out;
}

function hasAny(words: Set<string>, list: string[]): boolean {
  return list.some((w) => words.has(stem(w)) || words.has(w));
}

/** Find pairs of requirements that likely contradict each other. */
export function findContradictions(requirements: Entity[]): Contradiction[] {
  // Terms become small integers so pairs compare sorted arrays instead of building sets.
  const ids = new Map<string, number>();
  const idOf = (w: string) => { let n = ids.get(w); if (n === undefined) ids.set(w, (n = ids.size)); return n; };
  const items = requirements
    .filter((r) => r.status !== 'deprecated')
    .map((r) => {
      const t = text(r);
      const terms = keyTerms(t);
      const all = new Set(tokenize(t, { keepStop: true }));
      return {
        r, neg: NEGATION.test(t), terms, q: quantities(t),
        termIds: Int32Array.from([...terms].map(idOf)).sort(),
        // Which side of each antonym pair this requirement uses.
        sides: ANTONYMS.map(([x, y]) => (hasAny(all, x) ? 1 : 0) | (hasAny(all, y) ? 2 : 0)),
        all,
      };
    });
  // Candidate pairs share at least one key term: an inverted index avoids the rest.
  const postings = new Map<number, number[]>();
  items.forEach((it, i) => { for (const t of it.termIds) { const l = postings.get(t); if (l) l.push(i); else postings.set(t, [i]); } });
  const out: Contradiction[] = [];
  const sharedWords = (a: typeof items[number], b: typeof items[number]) => [...a.terms].filter((w) => b.terms.has(w));
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const candidates = new Set<number>();
    for (const t of a.termIds) for (const j of postings.get(t)!) if (j > i) candidates.add(j);
    for (const j of [...candidates].sort((x, y) => x - y)) {
      const b = items[j];
      let inter = 0;
      for (let x = 0, y = 0; x < a.termIds.length && y < b.termIds.length;) {
        if (a.termIds[x] === b.termIds[y]) { inter++; x++; y++; } else if (a.termIds[x] < b.termIds[y]) x++; else y++;
      }
      const overlap = inter / (a.termIds.length + b.termIds.length - inter);

      // 1. Same subject, opposite polarity.
      if (a.neg !== b.neg && overlap >= 0.3 && inter >= 2) {
        out.push({ aId: a.r.id, bId: b.r.id, kind: 'polarity', score: overlap, reason: `One allows and the other forbids an action on the same subject (${sharedWords(a, b).slice(0, 4).join(', ')}).` });
        continue;
      }
      // 2. Antonym concepts on a shared subject.
      if (overlap >= 0.1) {
        const k = a.sides.findIndex((sa, n) => ((sa & 1) && (b.sides[n] & 2)) || ((sa & 2) && (b.sides[n] & 1)));
        if (k >= 0) {
          const [x, y] = ANTONYMS[k];
          const wa = [...x, ...y].find((w) => a.all.has(stem(w)) || a.all.has(w));
          const wb = [...x, ...y].find((w) => b.all.has(stem(w)) || b.all.has(w));
          out.push({ aId: a.r.id, bId: b.r.id, kind: 'antonym', score: overlap + 0.2, reason: `"${wa}" vs "${wb}" on ${sharedWords(a, b).slice(0, 3).join(', ')}.` });
          continue;
        }
      }
      // 3. Same unit, different numbers, similar subject.
      if (overlap >= 0.25) {
        for (const qa of a.q) {
          const qb = b.q.find((q) => q.unit === qa.unit && q.value !== qa.value);
          if (qb) {
            out.push({ aId: a.r.id, bId: b.r.id, kind: 'numeric', score: overlap, reason: `${qa.value} ${qa.unit} vs ${qb.value} ${qb.unit} for ${sharedWords(a, b).slice(0, 3).join(', ')}.` });
            break;
          }
        }
      }
    }
  }
  return out.sort((x, y) => y.score - x.score);
}
