import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize as normalizePath, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, ValidationError } from './db.ts';
import { seedWorkspace } from './seed.ts';
import { aiRoutes, aiStatus } from './ai.ts';
import { HttpError } from './http.ts';
import { Graph } from '../core/graph.ts';
import { ENTITY_MAP, type Entity } from '../core/schema.ts';
import { dailyBrief } from '../core/engines/brief.ts';
import { SearchIndex } from '../core/engines/search.ts';
import { lint, lintSummary } from '../core/engines/lint.ts';
import { completeness, completenessScore } from '../core/engines/completeness.ts';
import { reviewSpec } from '../core/engines/review.ts';
import { similar } from '../core/engines/clustering.ts';
import { isoDate } from '../core/util.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DEV = flag('dev');
const PORT = Number(process.env.PORT ?? opt('port', '4300'));
const HOST = process.env.HOST ?? opt('host', '127.0.0.1');
const DB_FILE = process.env.TL_DB ?? opt('db', join(ROOT, 'data', 'throughline.db'));

export const store = new Store(DB_FILE);

if (flag('reset-only')) {
  seedWorkspace(store, new Date());
  console.log(`Seeded demo workspace into ${DB_FILE}`);
  process.exit(0);
}
if (store.isEmpty() && !flag('empty')) {
  seedWorkspace(store, new Date());
  console.log('Seeded demo workspace (Northwind Pay).');
}

// ---------------- live sync (Server-Sent Events) ----------------

type Change = { op: 'upsert'; entity: Entity } | { op: 'delete'; id: string } | { op: 'reset' } | { op: 'settings' };
const clients = new Set<ServerResponse>();
function broadcast(changes: Change[]) {
  const payload = `data: ${JSON.stringify(changes)}\n\n`;
  for (const c of clients) c.write(payload);
}
setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 25_000).unref();

// ---------------- helpers ----------------


function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(json);
}

async function readBody(req: IncomingMessage, limit = 20 * 1024 * 1024): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new HttpError(413, 'Payload too large');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

const actorOf = (req: IncomingMessage) => String(req.headers['x-tl-actor'] ?? 'web').slice(0, 40);

function tokenOk(req: IncomingMessage, url: URL): boolean {
  const token = req.headers['x-tl-token'] ?? url.searchParams.get('token');
  return !!token && token === store.getSetting('captureToken');
}

function graph(): Graph {
  return new Graph(store.all());
}

// ---------------- routes ----------------

type Handler = (ctx: { req: IncomingMessage; res: ServerResponse; url: URL; params: Record<string, string>; body: () => Promise<any> }) => Promise<unknown> | unknown;
const routes: { method: string; pattern: RegExp; keys: string[]; handler: Handler; cors?: boolean }[] = [];
function route(method: string, path: string, handler: Handler, opts: { cors?: boolean } = {}) {
  const keys: string[] = [];
  const pattern = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, pattern, keys, handler, cors: opts.cors });
}

route('GET', '/api/health', () => ({ ok: true, name: 'throughline', version: '0.1.0', ai: aiStatus() }), { cors: true });

route('GET', '/api/workspace', () => {
  const { captureToken: _t, ...settings } = store.settings();
  return { settings, entities: store.all(), serverTime: new Date().toISOString(), ai: aiStatus() };
});

route('GET', '/api/entities', ({ url }) => {
  const type = url.searchParams.get('type');
  return type ? store.byType(type) : store.all();
});

route('GET', '/api/entities/:id', ({ params }) => {
  const e = store.get(params.id);
  if (!e) throw new HttpError(404, 'Not found');
  return e;
});

route('POST', '/api/entities', async ({ req, body }) => {
  const b = await body();
  const { type, ...fields } = b ?? {};
  const e = store.create(type, fields, actorOf(req));
  broadcast([{ op: 'upsert', entity: e }]);
  return e;
});

route('PATCH', '/api/entities/:id', async ({ req, params, body }) => {
  const e = store.update(params.id, await body(), actorOf(req));
  broadcast([{ op: 'upsert', entity: e }]);
  return e;
});

route('DELETE', '/api/entities/:id', ({ req, params }) => {
  const e = store.delete(params.id, actorOf(req));
  if (!e) throw new HttpError(404, 'Not found');
  broadcast([{ op: 'delete', id: params.id }]);
  return { ok: true };
});

/** Several creates/updates/deletes in one transaction. `$n` refers to the id created by op n. */
route('POST', '/api/batch', async ({ req, body }) => {
  const ops = (await body()) as { op: 'create' | 'update' | 'delete'; type?: string; id?: string; data?: Record<string, unknown> }[];
  if (!Array.isArray(ops)) throw new HttpError(400, 'Expected an array of operations');
  const actor = actorOf(req);
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
  broadcast(changes);
  return results;
});

route('GET', '/api/activity', ({ url }) => store.activity({ entityId: url.searchParams.get('entityId') ?? undefined, limit: Number(url.searchParams.get('limit') ?? 100) }));

route('GET', '/api/settings', () => store.settings());
route('PATCH', '/api/settings', async ({ body }) => {
  const { captureToken: _t, ...patch } = await body();
  store.setSettings(patch);
  broadcast([{ op: 'settings' }]);
  const { captureToken: _x, ...settings } = store.settings();
  return settings;
});

route('POST', '/api/reset', async ({ body }) => {
  const b = await body();
  store.clear();
  if (!b?.empty) seedWorkspace(store, new Date());
  broadcast([{ op: 'reset' }]);
  return { ok: true };
});

route('GET', '/api/export', ({ res }) => {
  const dump = store.exportAll();
  res.setHeader('Content-Disposition', `attachment; filename="throughline-${isoDate(new Date())}.json"`);
  return dump;
});

route('POST', '/api/import', async ({ req, body }) => {
  const dump = await body();
  if (!Array.isArray(dump?.entities)) throw new HttpError(400, 'Expected { entities: [...] }');
  for (const e of dump.entities) if (!ENTITY_MAP[e.type] || !e.id) throw new HttpError(400, `Invalid entity ${e.id ?? ''}`);
  store.importAll(dump, actorOf(req));
  broadcast([{ op: 'reset' }]);
  return { ok: true, count: dump.entities.length };
});

route('GET', '/api/brief', () => dailyBrief(graph(), new Date()), { cors: true });

route('GET', '/api/search', ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  return new SearchIndex(store.all()).search(q, Number(url.searchParams.get('limit') ?? 20)).map((h) => ({ id: h.entity.id, type: h.entity.type, key: h.entity.key, title: h.entity[ENTITY_MAP[h.entity.type].titleField], snippet: h.snippet, score: h.score }));
}, { cors: true });

route('POST', '/api/lint', async ({ body }) => {
  const { text = '' } = await body();
  const glossary = store.byType('glossaryTerm');
  const issues = lint(String(text), { glossary });
  const items = completeness(String(text));
  return { summary: lintSummary(String(text), issues), issues, completeness: { score: completenessScore(items), items }, review: reviewSpec(String(text)) };
}, { cors: true });

/**
 * Capture endpoint used by the CLI, the browser extension and chat/email
 * integrations. Requires the workspace capture token.
 */
route('POST', '/api/capture', async ({ req, body }) => {
  const b = await body();
  const kind = String(b.kind ?? 'evidence');
  const text = String(b.text ?? '').trim();
  if (!text) throw new HttpError(400, 'text is required');
  const actor = String(b.actor ?? req.headers['x-tl-actor'] ?? 'capture').slice(0, 40);
  const today = isoDate(new Date());
  const people = store.byType('stakeholder');
  const from = b.from ? people.find((p) => String(p.name).toLowerCase().includes(String(b.from).toLowerCase())) : undefined;
  let e: Entity;
  if (kind === 'request') {
    e = store.create('request', { title: text.slice(0, 140), description: b.detail ?? (text.length > 140 ? text : undefined), requesterId: from?.id, receivedAt: today, status: 'new' }, actor);
  } else if (kind === 'interaction') {
    if (!from) throw new HttpError(400, 'Interactions need "from" matching a stakeholder name');
    e = store.create('interaction', { title: text.slice(0, 140), summary: b.detail ?? text, date: today, stakeholderIds: [from.id], kind: b.channel ?? 'chat', sentiment: Number(b.sentiment ?? 0) }, actor);
  } else if (kind === 'decision') {
    e = store.create('decision', { title: text.slice(0, 140), context: b.detail, date: today, status: 'proposed' }, actor);
  } else {
    e = store.create('evidence', {
      title: text.slice(0, 200), detail: b.detail ?? (text.length > 200 ? text : undefined), source: b.source ?? 'internal', kind: b.evidenceKind ?? 'said',
      account: b.account, url: b.url, date: today, relayedById: from?.id, tags: b.tags ?? [],
    }, actor);
  }
  broadcast([{ op: 'upsert', entity: e }]);
  const dupes = similar(text, store.byType(e.type).filter((x) => x.id !== e.id)).slice(0, 3).map((d) => ({ id: d.entity.id, title: d.entity.title, similarity: d.similarity }));
  return { entity: e, similar: dupes };
}, { cors: true });

route('GET', '/api/events', ({ req, res }) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write(': connected\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
  return undefined;
});

for (const r of aiRoutes(store)) route(r.method, r.path, r.handler as Handler);

// ---------------- static / dev server ----------------

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

let vite: any = null;
if (DEV) {
  const { createServer: createVite } = await import('vite');
  vite = await createVite({ configFile: join(ROOT, 'web', 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });
}

const DIST = join(ROOT, 'web', 'dist');
function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL) {
  let file = normalizePath(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Web app not built. Run `npm run build`, or start with `npm run dev`.');
    return;
  }
  const ext = extname(file);
  const immutable = /\/assets\//.test(url.pathname);
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    const match = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
    const corsRoute = routes.find((r) => r.cors && r.pattern.test(url.pathname));
    // Cross-origin calls (browser extension, other tools) are allowed only on
    // capture/read endpoints and only with the workspace token.
    const origin = req.headers.origin;
    const sameOrigin = !origin || origin === `http://${req.headers.host}`;
    if (req.method === 'OPTIONS' && corsRoute) {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-TL-Token, X-TL-Actor', 'Access-Control-Allow-Methods': 'GET, POST' }).end();
      return;
    }
    const corsHeaders: Record<string, string> = corsRoute && !sameOrigin ? { 'Access-Control-Allow-Origin': '*' } : {};
    if (!match) return send(res, 404, { error: 'Not found' }, corsHeaders);
    const isCapture = url.pathname === '/api/capture';
    if ((isCapture || !sameOrigin) && !tokenOk(req, url) && url.pathname !== '/api/health') {
      return send(res, 401, { error: 'Missing or invalid X-TL-Token (see Settings → Integrations)' }, corsHeaders);
    }
    if (!sameOrigin && !match.cors) return send(res, 403, { error: 'Cross-origin access not allowed for this endpoint' });
    const params: Record<string, string> = {};
    const m = match.pattern.exec(url.pathname)!;
    match.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    try {
      const out = await match.handler({ req, res, url, params, body: () => readBody(req) });
      if (out !== undefined && !res.headersSent) send(res, 200, out, corsHeaders);
    } catch (err) {
      if (err instanceof ValidationError) return send(res, 422, { error: err.message, errors: err.errors }, corsHeaders);
      if (err instanceof HttpError) return send(res, err.status, { error: err.message }, corsHeaders);
      console.error(err);
      send(res, 500, { error: (err as Error).message ?? 'Server error' }, corsHeaders);
    }
    return;
  }
  if (vite) vite.middlewares(req, res, () => res.writeHead(404).end());
  else serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`Throughline running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}${DEV ? ' (dev)' : ''}`);
  console.log(`Capture token: ${store.getSetting('captureToken')}  (CLI: TL_TOKEN, extension: Options)`);
  const ai = aiStatus();
  console.log(ai.enabled ? `AI: Claude enabled (${ai.model})` : 'AI: deterministic engines only (set ANTHROPIC_API_KEY to enable Claude)');
});
