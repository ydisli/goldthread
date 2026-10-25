import type { Entity } from '../schema.ts';
import { tokenize, jaccard, stem } from '../util.ts';

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
  const items = requirements
    .filter((r) => r.status !== 'deprecated')
    .map((r) => {
      const t = text(r);
      return { r, t, neg: NEGATION.test(t), terms: keyTerms(t), all: new Set(tokenize(t, { keepStop: true })), q: quantities(t) };
    });
  const out: Contradiction[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const overlap = jaccard(a.terms, b.terms);
      const shared = [...a.terms].filter((w) => b.terms.has(w));
      if (shared.length < 1) continue;

      // 1. Same subject, opposite polarity.
      if (a.neg !== b.neg && overlap >= 0.3 && shared.length >= 2) {
        out.push({ aId: a.r.id, bId: b.r.id, kind: 'polarity', score: overlap, reason: `One allows and the other forbids an action on the same subject (${shared.slice(0, 4).join(', ')}).` });
        continue;
      }
      // 2. Antonym concepts on a shared subject.
      let found = false;
      for (const [x, y] of ANTONYMS) {
        if ((hasAny(a.all, x) && hasAny(b.all, y)) || (hasAny(a.all, y) && hasAny(b.all, x))) {
          if (overlap >= 0.1) {
            const wa = [...x, ...y].find((w) => a.all.has(stem(w)) || a.all.has(w));
            const wb = [...x, ...y].find((w) => b.all.has(stem(w)) || b.all.has(w));
            out.push({ aId: a.r.id, bId: b.r.id, kind: 'antonym', score: overlap + 0.2, reason: `"${wa}" vs "${wb}" on ${shared.slice(0, 3).join(', ')}.` });
            found = true;
            break;
          }
        }
      }
      if (found) continue;
      // 3. Same unit, different numbers, similar subject.
      if (overlap >= 0.25) {
        for (const qa of a.q) {
          const qb = b.q.find((q) => q.unit === qa.unit && q.value !== qa.value);
          if (qb) {
            out.push({ aId: a.r.id, bId: b.r.id, kind: 'numeric', score: overlap, reason: `${qa.value} ${qa.unit} vs ${qb.value} ${qb.unit} for ${shared.slice(0, 3).join(', ')}.` });
            break;
          }
        }
      }
    }
  }
  return out.sort((x, y) => y.score - x.score);
}
