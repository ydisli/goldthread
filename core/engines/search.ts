import { ENTITY_MAP, type Entity } from '../schema.ts';
import { tokenize } from '../util.ts';

export interface SearchHit { entity: Entity; score: number; snippet: string; field: string }

const SKIP_TYPES = new Set(['comment']);

function textFields(e: Entity): [string, string][] {
  const def = ENTITY_MAP[e.type];
  if (!def) return [];
  const out: [string, string][] = [];
  for (const f of def.fields) {
    const v = e[f.key];
    if (typeof v === 'string' && ['text', 'longtext', 'markdown', 'url'].includes(f.kind)) out.push([f.key, v]);
    if (f.kind === 'tags' && Array.isArray(v)) out.push([f.key, v.join(' ')]);
  }
  if (e.key) out.push(['key', e.key]);
  return out;
}

export class SearchIndex {
  private docs: { e: Entity; fields: [string, string][]; tokens: Map<string, number>; len: number }[] = [];
  private df = new Map<string, number>();
  private avgLen = 1;

  constructor(entities: Entity[]) {
    for (const e of entities) {
      if (SKIP_TYPES.has(e.type)) continue;
      const fields = textFields(e);
      const tokens = new Map<string, number>();
      let len = 0;
      for (const [k, v] of fields) {
        const weight = k === ENTITY_MAP[e.type]?.titleField || k === 'key' ? 3 : 1;
        for (const t of tokenize(v)) { tokens.set(t, (tokens.get(t) ?? 0) + weight); len++; }
      }
      this.docs.push({ e, fields, tokens, len });
      for (const t of tokens.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.avgLen = this.docs.reduce((s, d) => s + d.len, 0) / Math.max(1, this.docs.length);
  }

  /** BM25 search. Supports `type:stakeholder` filters and exact keys like REQ-12. */
  search(query: string, limit = 20): SearchHit[] {
    let q = query;
    const typeFilter: string[] = [];
    q = q.replace(/\btype:(\w+)/g, (_, t) => { typeFilter.push(t); return ''; });
    const keyMatch = /\b([A-Z]{2,4}-\d+)\b/.exec(query);
    const terms = tokenize(q);
    if (!terms.length && !keyMatch && !typeFilter.length) return [];
    const N = this.docs.length, k1 = 1.4, b = 0.75;
    const hits: SearchHit[] = [];
    for (const d of this.docs) {
      if (typeFilter.length && !typeFilter.some((t) => d.e.type.toLowerCase() === t.toLowerCase())) continue;
      let score = 0;
      for (const t of terms) {
        const tf = d.tokens.get(t);
        if (!tf) {
          // Prefix match for partial words while typing.
          const pref = [...d.tokens.keys()].find((k) => k.startsWith(t) && t.length >= 3);
          if (pref) score += 0.5;
          continue;
        }
        const idf = Math.log(1 + (N - (this.df.get(t) ?? 0) + 0.5) / ((this.df.get(t) ?? 0) + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.len) / this.avgLen)));
      }
      if (keyMatch && d.e.key === keyMatch[1]) score += 50;
      if (!terms.length && typeFilter.length) score = 1;
      if (score <= 0) continue;
      const { field, snippet } = snippetFor(d.fields, terms);
      hits.push({ entity: d.e, score, snippet, field });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

function snippetFor(fields: [string, string][], terms: string[]): { field: string; snippet: string } {
  // Prefer a match in the body over repeating the title.
  const ordered = [...fields.slice(1), ...fields.slice(0, 1)];
  for (const [k, v] of ordered) {
    const lower = v.toLowerCase();
    const idx = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (idx !== undefined) {
      const start = Math.max(0, idx - 60);
      return { field: k, snippet: `${start > 0 ? '…' : ''}${v.slice(start, idx + 120).replace(/\s+/g, ' ')}${idx + 120 < v.length ? '…' : ''}` };
    }
  }
  return { field: fields[0]?.[0] ?? '', snippet: (fields[0]?.[1] ?? '').slice(0, 160) };
}
