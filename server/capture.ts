import type { Entity } from '../core/schema.ts';
import { isoDate } from '../core/util.ts';
import { similar } from '../core/engines/clustering.ts';
import type { Actor, Store } from './db.ts';

export type CaptureKind = 'evidence' | 'request' | 'interaction' | 'decision' | 'risk' | 'idea';

export interface CaptureInput {
  kind?: string;
  text: string;
  detail?: string;
  /** A stakeholder's name (partial match) or email address. */
  from?: string;
  source?: string;
  evidenceKind?: string;
  account?: string;
  reach?: number;
  url?: string;
  channel?: string;
  sentiment?: number;
  tags?: string[];
}

/** "Request: …", "Decision: …", "Risk: …", "Idea: …" at the start choose the kind. */
export function kindFromPrefix(text: string): { kind?: CaptureKind; text: string } {
  const m = /^\s*(request|decision|risk|idea|signal)\s*[:\-–]\s*/i.exec(text);
  if (!m) return { text };
  const k = m[1].toLowerCase();
  return { kind: (k === 'signal' ? 'evidence' : k) as CaptureKind, text: text.slice(m[0].length) };
}

/** Quick capture shared by the web app, the API, the CLI, MCP, chat apps and email-in. */
export function capture(store: Store, input: CaptureInput, actor: Actor): { entity: Entity; similar: { id: string; title: string; similarity: number }[] } {
  const kind = String(input.kind ?? 'evidence');
  const text = input.text.trim();
  if (!text) throw new Error('text is required');
  const today = isoDate(new Date());
  const people = store.byType('stakeholder');
  const who = String(input.from ?? '').trim().toLowerCase();
  const from = who ? people.find((p) => String(p.email ?? '').toLowerCase() === who) ?? people.find((p) => String(p.name).toLowerCase().includes(who)) : undefined;
  const title = text.split('\n')[0].slice(0, 200);
  const detail = input.detail ?? (text.length > title.length ? text : undefined);
  let e: Entity;
  if (kind === 'request') e = store.create('request', { title, description: detail, requesterId: from?.id, receivedAt: today, status: 'new' }, actor);
  else if (kind === 'interaction') {
    if (!from) throw new Error('Interactions need "from" matching a stakeholder name');
    e = store.create('interaction', { title, summary: detail, date: today, stakeholderIds: [from.id], kind: input.channel ?? 'chat', sentiment: Number(input.sentiment ?? 0) }, actor);
  } else if (kind === 'decision') e = store.create('decision', { title, context: detail, date: today, status: 'proposed' }, actor);
  else if (kind === 'risk') e = store.create('raid', { title, description: detail, kind: 'risk', status: 'open', ownerId: from?.id }, actor);
  else if (kind === 'idea') e = store.create('bet', { title, hypothesis: detail, status: 'idea', horizon: 'later' }, actor);
  else e = store.create('evidence', { title, detail, source: input.source ?? 'internal', kind: input.evidenceKind ?? 'said', account: input.account, reach: input.reach ? Number(input.reach) : undefined, url: input.url, date: today, relayedById: from?.id, tags: input.tags ?? [] }, actor);
  const dupes = similar(text, store.byType(e.type).filter((x) => x.id !== e.id)).slice(0, 3).map((d) => ({ id: d.entity.id, title: String(d.entity.title), similarity: d.similarity }));
  return { entity: e, similar: dupes };
}
