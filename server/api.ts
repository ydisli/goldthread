import { HttpError, type Router, type WCtx } from './http.ts';
import { actorOf } from './auth.ts';
import { broadcast, subscribe, type Change } from './live.ts';
import type { SystemDB } from './system.ts';
import type { Workspaces, Sample } from './workspaces.ts';
import { aiStatus } from './ai.ts';
import { Graph } from '../core/graph.ts';
import { ENTITY_MAP, type Entity } from '../core/schema.ts';
import { dailyBrief } from '../core/engines/brief.ts';
import { SearchIndex } from '../core/engines/search.ts';
import { lint, lintSummary } from '../core/engines/lint.ts';
import { completeness, completenessScore } from '../core/engines/completeness.ts';
import { reviewSpec } from '../core/engines/review.ts';
import { similar } from '../core/engines/clustering.ts';
import { isoDate } from '../core/util.ts';
import { baseUrl } from './mail.ts';
import { notifyApproval, notifyMentions } from './notify.ts';

export const graphFor = (ctx: WCtx) => new Graph(ctx.ws.store.all(), { meUserId: ctx.user.id });

/** Workspace content routes: entities, activity, search, brief, capture, live sync. */
export function apiRoutes(r: Router, sys: SystemDB, workspaces: Workspaces) {
  const wsId = (ctx: WCtx) => ctx.ws.workspace.id;

  r.add('GET', '/api/workspace', 'viewer', (ctx) => {
    const store = ctx.ws.store;
    return {
      settings: store.settings(),
      entities: store.all(),
      workspace: { id: ctx.ws.workspace.id, name: ctx.ws.workspace.name, kind: ctx.ws.workspace.kind, demo: ctx.ws.workspace.demo },
      role: ctx.ws.role,
      members: sys.members(wsId(ctx)).map((m) => ({ userId: m.userId, name: m.user.name, email: m.user.email, role: m.role })),
      serverTime: new Date().toISOString(),
      ai: aiStatus(sys, wsId(ctx)),
    };
  });

  r.add('GET', '/api/entities', 'viewer', (ctx) => {
    const type = ctx.url.searchParams.get('type');
    return type ? ctx.ws.store.byType(type) : ctx.ws.store.all();
  }, { cors: true });

  r.add('GET', '/api/entities/:id', 'viewer', (ctx) => {
    const e = ctx.ws.store.get(ctx.params.id);
    if (!e) throw new HttpError(404, 'Not found');
    return e;
  }, { cors: true });

  // Viewers may comment; everything else needs edit rights.
  r.add('POST', '/api/entities', 'viewer', async (ctx) => {
    const { type, ...fields } = (await ctx.body()) ?? {};
    if (type !== 'comment' && ctx.ws.role === 'viewer') throw new HttpError(403, 'Your role (viewer) can\'t edit. Comments are fine.');
    // A comment is always signed by whoever posts it; mentions must be members of this workspace.
    if (type === 'comment') {
      fields.author = ctx.user.name;
      fields.authorId = ctx.user.id;
      const members = new Set(sys.members(wsId(ctx)).map((m) => m.userId));
      fields.mentions = Array.isArray(fields.mentions) ? [...new Set(fields.mentions as string[])].filter((id) => members.has(id) && id !== ctx.user.id) : [];
    }
    const e = ctx.ws.store.create(type, fields, actorOf(ctx));
    broadcast(wsId(ctx), [{ op: 'upsert', entity: e }]);
    if (type === 'comment') notifyMentions(sys, e, ctx.ws.store.get(e.entityId), ctx.ws.workspace.name, baseUrl(ctx.req));
    if (type === 'approval') notifyApproval(sys, e, graphFor(ctx), ctx.ws.workspace.name, baseUrl(ctx.req));
    return e;
  });

  /**
   * `$prev` (optional) holds the values the client last saw for the fields it is changing.
   * If someone else changed one of those fields since, nothing is saved and the conflict is returned.
   */
  r.add('PATCH', '/api/entities/:id', 'editor', async (ctx) => {
    const { $prev, ...patch } = (await ctx.body()) ?? {};
    if ($prev && typeof $prev === 'object') {
      const cur = ctx.ws.store.get(ctx.params.id);
      if (!cur) throw new HttpError(404, 'Not found');
      const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      const clashing = Object.keys($prev).filter((k) => k in patch && !same(cur[k], $prev[k]) && !same(cur[k], patch[k]));
      if (clashing.length) {
        const by = ctx.ws.store.activity({ entityId: cur.id, limit: 1 })[0]?.actor ?? 'Someone';
        const def = ENTITY_MAP[cur.type];
        throw new HttpError(409, `${by} changed ${clashing.length === 1 ? 'a field' : 'some fields'} you were editing.`, {
          conflict: { by, current: cur, fields: clashing.map((k) => ({ key: k, label: def?.fields.find((f) => f.key === k)?.label ?? k, theirs: cur[k] ?? null, yours: patch[k] ?? null })) },
        });
      }
    }
    const e = ctx.ws.store.update(ctx.params.id, patch, actorOf(ctx));
    broadcast(wsId(ctx), [{ op: 'upsert', entity: e }]);
    return e;
  });

  r.add('DELETE', '/api/entities/:id', 'editor', (ctx) => {
    const e = ctx.ws.store.delete(ctx.params.id, actorOf(ctx));
    if (!e) throw new HttpError(404, 'Not found');
    broadcast(wsId(ctx), [{ op: 'delete', id: ctx.params.id }]);
    return { ok: true };
  });

  r.add('GET', '/api/trash', 'editor', (ctx) => ctx.ws.store.trash(Number(ctx.url.searchParams.get('limit') ?? 50)));

  r.add('POST', '/api/entities/:id/restore', 'editor', (ctx) => {
    const e = ctx.ws.store.restore(ctx.params.id, actorOf(ctx));
    if (!e) throw new HttpError(404, 'Nothing to restore');
    broadcast(wsId(ctx), [{ op: 'upsert', entity: e }]);
    return e;
  });

  /** Several creates/updates/deletes in one transaction. `$n` refers to the id created by op n. */
  r.add('POST', '/api/batch', 'editor', async (ctx) => {
    const ops = (await ctx.body()) as { op: 'create' | 'update' | 'delete'; type?: string; id?: string; data?: Record<string, unknown> }[];
    if (!Array.isArray(ops)) throw new HttpError(400, 'Expected an array of operations');
    if (ops.length > 1000) throw new HttpError(413, 'At most 1,000 operations per batch');
    const store = ctx.ws.store;
    const actor = actorOf(ctx);
    const created: string[] = [];
    const resolveRefs = (v: unknown): unknown => {
      if (typeof v === 'string' && /^\$\d+$/.test(v)) return created[Number(v.slice(1))] ?? v;
      if (Array.isArray(v)) return v.map(resolveRefs);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveRefs(x)]));
      return v;
    };
    const changes: Change[] = [];
    const results = store.transaction(() => ops.map((o) => {
      const data = resolveRefs(o.data ?? {}) as Record<string, unknown>;
      const id = resolveRefs(o.id) as string | undefined;
      if (o.op === 'create') {
        const e = store.create(o.type!, data, actor);
        created.push(e.id);
        changes.push({ op: 'upsert', entity: e });
        return e;
      }
      created.push(id ?? '');
      if (o.op === 'update') {
        const e = store.update(id!, data, actor);
        changes.push({ op: 'upsert', entity: e });
        return e;
      }
      store.delete(id!, actor);
      changes.push({ op: 'delete', id: id! });
      return { id, deleted: true };
    }));
    broadcast(wsId(ctx), changes);
    return results;
  });

  r.add('GET', '/api/activity', 'viewer', (ctx) => ctx.ws.store.activity({ entityId: ctx.url.searchParams.get('entityId') ?? undefined, limit: Number(ctx.url.searchParams.get('limit') ?? 100) }));

  r.add('GET', '/api/settings', 'viewer', (ctx) => ctx.ws.store.settings());
  r.add('PATCH', '/api/settings', 'admin', async (ctx) => {
    const { captureToken: _t, ...patch } = await ctx.body();
    ctx.ws.store.setSettings(patch);
    broadcast(wsId(ctx), [{ op: 'settings' }]);
    return ctx.ws.store.settings();
  });

  r.add('POST', '/api/reset', 'admin', async (ctx) => {
    const b = await ctx.body();
    const sample: Sample = ['it', 'saas', 'empty'].includes(b?.sample) ? b.sample : 'it';
    workspaces.fill(ctx.ws.store, sample, ctx.ws.workspace.name, { me: ctx.user });
    for (const m of sys.members(wsId(ctx))) workspaces.linkMember(wsId(ctx), m.user);
    broadcast(wsId(ctx), [{ op: 'reset' }]);
    return { ok: true };
  });

  r.add('GET', '/api/export', 'editor', (ctx) => {
    ctx.res.setHeader('Content-Disposition', `attachment; filename="throughline-${ctx.ws.workspace.name.replace(/[^\w-]+/g, '-').toLowerCase()}-${isoDate(new Date())}.json"`);
    return ctx.ws.store.exportAll();
  }, { cors: true });

  r.add('POST', '/api/import', 'admin', async (ctx) => {
    const dump = await ctx.body();
    if (!Array.isArray(dump?.entities)) throw new HttpError(400, 'Expected { entities: [...] }');
    for (const e of dump.entities) if (!ENTITY_MAP[e.type] || !e.id) throw new HttpError(400, `Invalid entity ${e.id ?? ''}`);
    ctx.ws.store.importAll(dump, actorOf(ctx));
    for (const m of sys.members(wsId(ctx))) workspaces.linkMember(wsId(ctx), m.user);
    broadcast(wsId(ctx), [{ op: 'reset' }]);
    return { ok: true, count: dump.entities.length };
  });

  r.add('GET', '/api/brief', 'viewer', (ctx) => dailyBrief(graphFor(ctx), new Date()), { cors: true });

  r.add('GET', '/api/search', 'viewer', (ctx) => {
    const q = ctx.url.searchParams.get('q') ?? '';
    return new SearchIndex(ctx.ws.store.all()).search(q, Number(ctx.url.searchParams.get('limit') ?? 20))
      .map((h) => ({ id: h.entity.id, type: h.entity.type, key: h.entity.key, title: h.entity[ENTITY_MAP[h.entity.type].titleField], snippet: h.snippet, score: h.score }));
  }, { cors: true });

  r.add('POST', '/api/lint', 'viewer', async (ctx) => {
    const { text = '' } = await ctx.body();
    const issues = lint(String(text), { glossary: ctx.ws.store.byType('glossaryTerm') });
    const items = completeness(String(text));
    return { summary: lintSummary(String(text), issues), issues, completeness: { score: completenessScore(items), items }, review: reviewSpec(String(text)) };
  }, { cors: true });

  /** Quick capture from the CLI, the browser extension, chat bots and scripts. */
  r.add('POST', '/api/capture', 'editor', async (ctx) => {
    const b = await ctx.body();
    const kind = String(b.kind ?? 'evidence');
    const text = String(b.text ?? '').trim();
    if (!text) throw new HttpError(400, 'text is required');
    const store = ctx.ws.store;
    const actor = actorOf(ctx);
    const today = isoDate(new Date());
    const people = store.byType('stakeholder');
    const from = b.from ? people.find((p) => String(p.name).toLowerCase().includes(String(b.from).toLowerCase())) : undefined;
    const title = text.split('\n')[0].slice(0, 200);
    const detail = b.detail ?? (text.length > title.length ? text : undefined);
    let e: Entity;
    if (kind === 'request') e = store.create('request', { title, description: detail, requesterId: from?.id, receivedAt: today, status: 'new' }, actor);
    else if (kind === 'interaction') {
      if (!from) throw new HttpError(400, 'Interactions need "from" matching a stakeholder name');
      e = store.create('interaction', { title, summary: detail, date: today, stakeholderIds: [from.id], kind: b.channel ?? 'chat', sentiment: Number(b.sentiment ?? 0) }, actor);
    } else if (kind === 'decision') e = store.create('decision', { title, context: detail, date: today, status: 'proposed' }, actor);
    else if (kind === 'risk') e = store.create('raid', { title, description: detail, kind: 'risk', status: 'open', ownerId: from?.id }, actor);
    else if (kind === 'idea') e = store.create('bet', { title, hypothesis: detail, status: 'idea', horizon: 'later' }, actor);
    else e = store.create('evidence', { title, detail, source: b.source ?? 'internal', kind: b.evidenceKind ?? 'said', account: b.account, reach: b.reach ? Number(b.reach) : undefined, url: b.url, date: today, relayedById: from?.id, tags: b.tags ?? [] }, actor);
    broadcast(wsId(ctx), [{ op: 'upsert', entity: e }]);
    const dupes = similar(text, store.byType(e.type).filter((x) => x.id !== e.id)).slice(0, 3).map((d) => ({ id: d.entity.id, title: d.entity.title, similarity: d.similarity }));
    return { entity: e, similar: dupes };
  }, { cors: true });

  r.add('GET', '/api/events', 'viewer', (ctx) => {
    ctx.res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    ctx.res.write(': connected\n\n');
    subscribe(wsId(ctx), ctx.res, (fn) => ctx.req.on('close', fn));
    return undefined;
  });
}
