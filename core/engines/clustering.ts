import type { Entity } from '../schema.ts';
import { daysBetween, tokenize, uniq } from '../util.ts';

type Vec = Map<string, number>;

function tfidf(docs: string[][]): Vec[] {
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length;
  return docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v: Vec = new Map();
    let norm = 0;
    for (const [t, c] of tf) {
      const w = (c / d.length) * Math.log(1 + n / (df.get(t) ?? 1));
      v.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    return v;
  });
}

function cosine(a: Vec, b: Vec): number {
  let s = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, w] of small) { const o = big.get(t); if (o) s += w * o; }
  return s;
}

function add(into: Vec, v: Vec) {
  for (const [t, w] of v) into.set(t, (into.get(t) ?? 0) + w);
}

export interface Cluster {
  id: string;
  label: string;
  terms: string[];
  items: Entity[];
  accounts: string[];
  arr: number;
  segments: string[];
  recent: number;
  previous: number;
  trend: 'rising' | 'falling' | 'steady' | 'new';
  sentiment: number;
  didShare: number;
  /** Most common linked opportunity, if any. */
  opportunityId?: string;
}

const textOf = (e: Entity) => `${e.title ?? ''} ${e.title ?? ''} ${e.detail ?? ''} ${(e.tags ?? []).join(' ')}`;

/** Greedy centroid clustering of evidence by TF-IDF cosine similarity. */
export function clusterEvidence(evidence: Entity[], now: Date, threshold = 0.18): Cluster[] {
  if (!evidence.length) return [];
  const docs = evidence.map((e) => tokenize(textOf(e)));
  const vecs = tfidf(docs);
  const clusters: { members: number[]; centroid: Vec }[] = [];
  // Seed order: most recent first, so rising themes form their own clusters.
  const order = evidence.map((_, i) => i).sort((a, b) => String(evidence[b].date).localeCompare(String(evidence[a].date)));
  for (const i of order) {
    let best = -1, bestSim = 0;
    clusters.forEach((c, ci) => {
      const norm = Math.sqrt([...c.centroid.values()].reduce((s, w) => s + w * w, 0)) || 1;
      const sim = cosine(vecs[i], new Map([...c.centroid].map(([t, w]) => [t, w / norm])));
      if (sim > bestSim) { bestSim = sim; best = ci; }
    });
    if (best >= 0 && bestSim >= threshold) {
      clusters[best].members.push(i);
      add(clusters[best].centroid, vecs[i]);
    } else {
      const centroid: Vec = new Map();
      add(centroid, vecs[i]);
      clusters.push({ members: [i], centroid });
    }
  }
  return clusters
    .map((c, ci) => describe(`c${ci}`, c.members.map((i) => evidence[i]), c.centroid, now))
    .sort((a, b) => b.items.length - a.items.length || b.arr - a.arr);
}

function describe(id: string, items: Entity[], centroid: Vec, now: Date): Cluster {
  const terms = [...centroid.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  const accounts = uniq(items.map((e) => e.account).filter(Boolean)) as string[];
  const arrByAccount = new Map<string, number>();
  for (const e of items) if (e.account) arrByAccount.set(e.account, Math.max(arrByAccount.get(e.account) ?? 0, Number(e.arr) || 0));
  const recent = items.filter((e) => e.date && daysBetween(e.date, now) <= 30 && daysBetween(e.date, now) >= 0).length;
  const previous = items.filter((e) => e.date && daysBetween(e.date, now) > 30 && daysBetween(e.date, now) <= 60).length;
  const trend = previous === 0 ? (recent > 0 && items.length === recent ? 'new' : recent > 0 ? 'rising' : 'steady') : recent >= previous * 1.5 ? 'rising' : recent <= previous * 0.5 ? 'falling' : 'steady';
  const opps = new Map<string, number>();
  for (const e of items) for (const o of (e.opportunityIds ?? []) as string[]) opps.set(o, (opps.get(o) ?? 0) + 1);
  const opportunityId = [...opps.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const sentiments = items.map((e) => Number(e.sentiment)).filter((x) => !Number.isNaN(x));
  return {
    id, terms, items, accounts,
    label: terms.slice(0, 3).join(' · '),
    arr: [...arrByAccount.values()].reduce((a, b) => a + b, 0),
    segments: uniq(items.map((e) => e.segment).filter(Boolean)) as string[],
    recent, previous, trend,
    sentiment: sentiments.length ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0,
    didShare: items.filter((e) => e.kind === 'did').length / items.length,
    opportunityId,
  };
}

export interface EvidenceStrength {
  score: number;
  count: number;
  accounts: number;
  segments: number;
  didShare: number;
  recentShare: number;
  arr: number;
  loudest?: { account: string; share: number };
  verdict: 'strong' | 'moderate' | 'weak' | 'anecdotal';
  breakdown: { label: string; points: number; max: number }[];
}

/** How much should we trust the evidence behind an opportunity? */
export function evidenceStrength(items: Entity[], now: Date): EvidenceStrength {
  const count = items.length;
  const accountsList = items.map((e) => e.account).filter(Boolean) as string[];
  const accounts = new Set(accountsList).size;
  const segments = new Set(items.map((e) => e.segment).filter(Boolean)).size;
  const didShare = count ? items.filter((e) => e.kind === 'did').length / count : 0;
  const recentShare = count ? items.filter((e) => e.date && daysBetween(e.date, now) <= 90).length / count : 0;
  const arrByAccount = new Map<string, number>();
  for (const e of items) if (e.account) arrByAccount.set(e.account, Math.max(arrByAccount.get(e.account) ?? 0, Number(e.arr) || 0));
  const arr = [...arrByAccount.values()].reduce((a, b) => a + b, 0);
  const counts = new Map<string, number>();
  for (const a of accountsList) counts.set(a, (counts.get(a) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const loudest = top && count >= 3 && top[1] / count >= 0.3 ? { account: top[0], share: top[1] / count } : undefined;
  const breakdown = [
    { label: 'Volume', points: Math.min(25, count * 2.5), max: 25 },
    { label: 'Distinct accounts', points: Math.min(25, accounts * 4), max: 25 },
    { label: 'Segment diversity', points: Math.min(15, segments * 5), max: 15 },
    { label: 'Behavioural (did) evidence', points: Math.round(didShare * 20), max: 20 },
    { label: 'Recency', points: Math.round(recentShare * 15), max: 15 },
  ];
  let score = Math.round(breakdown.reduce((s, b) => s + b.points, 0));
  if (loudest) score = Math.round(score * (1 - (loudest.share - 0.3)));
  const verdict = score >= 70 ? 'strong' : score >= 45 ? 'moderate' : score >= 20 ? 'weak' : 'anecdotal';
  return { score, count, accounts, segments, didShare, recentShare, arr, loudest, verdict, breakdown };
}

/** Suggest opportunities an unlinked piece of evidence most likely belongs to. */
export function suggestOpportunities(e: Entity, opportunities: Entity[], evidence: Entity[], topN = 3): { opportunity: Entity; similarity: number }[] {
  const docs = [tokenize(textOf(e)), ...opportunities.map((o) => {
    const linked = evidence.filter((x) => (x.opportunityIds ?? []).includes(o.id)).slice(0, 10);
    return tokenize(`${o.title} ${o.title} ${o.description ?? ''} ${linked.map(textOf).join(' ')}`);
  })];
  const v = tfidf(docs);
  return opportunities.map((o, i) => ({ opportunity: o, similarity: cosine(v[0], v[i + 1]) }))
    .filter((x) => x.similarity > 0.05)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

/** Find similar entities by text (used for duplicate detection on capture). */
export function similar(text: string, candidates: Entity[], field = 'title', topN = 5): { entity: Entity; similarity: number }[] {
  const docs = [tokenize(text), ...candidates.map((c) => tokenize(`${c[field] ?? ''} ${c.detail ?? c.description ?? ''}`))];
  const v = tfidf(docs);
  return candidates.map((c, i) => ({ entity: c, similarity: cosine(v[0], v[i + 1]) })).filter((x) => x.similarity > 0.2).sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}
