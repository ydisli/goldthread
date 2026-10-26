import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize as normalizePath, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationError } from './db.ts';
import { HttpError, Router, readBody, send, type Ctx, type WCtx } from './http.ts';
import { authenticate, bearerToken } from './auth.ts';
import { SystemDB } from './system.ts';
import { Workspaces } from './workspaces.ts';
import { ensureDemo, resetDemo } from './demo.ts';
import { accountRoutes } from './account.ts';
import { apiRoutes } from './api.ts';
import { aiRoutes } from './ai.ts';
import { mcpHandler } from './mcp.ts';

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
const DATA = resolve(process.env.TL_DATA ?? opt('data', join(ROOT, 'data')));

// Demo accounts share a published password, so they are on for development only unless asked for.
if (process.env.TL_DEMO === undefined) process.env.TL_DEMO = DEV || flag('reset-only') ? '1' : '0';

export const sys = new SystemDB(DATA);
export const workspaces = new Workspaces(sys, DATA);
ensureDemo(sys, workspaces);

// Operator escape hatch: `npm run reset-password -- someone@example.com` prints a one-time link.
if (flag('reset-password')) {
  const email = opt('reset-password', '');
  const user = sys.userByEmail(email);
  if (!user) { console.error(`No account for "${email}".`); process.exit(1); }
  const { token, expiresAt } = sys.createResetLink(user.id, 'operator');
  const base = (process.env.TL_PUBLIC_URL ?? `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`).replace(/\/$/, '');
  console.log(`Password reset link for ${user.name} <${user.email}>, valid until ${expiresAt}:\n${base}/#/reset/${token}`);
  process.exit(0);
}

if (flag('reset-only')) {
  console.log(resetDemo(sys, workspaces) ? 'Reset the ServiceHub demo workspace.' : 'No demo workspace to reset (TL_DEMO=0, or this install started without one).');
  process.exit(0);
}

const router = new Router();
accountRoutes(router, sys, workspaces);
apiRoutes(router, sys, workspaces);
aiRoutes(router, sys);
router.add('GET', '/api/health', 'none', () => ({ ok: true, name: 'throughline', version: '0.2.0' }), { cors: true });

// ---------------- request handling ----------------

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

let vite: any = null;
const DIST = join(ROOT, 'web', 'dist');

function serveStatic(res: ServerResponse, url: URL) {
  let file = normalizePath(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Web app not built. Run `npm run build`, or start with `npm run dev`.');
    return;
  }
  const immutable = /\/assets\//.test(url.pathname);
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
  createReadStream(file).pipe(res);
}

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-TL-Token, X-TL-Actor, Mcp-Protocol-Version, Mcp-Session-Id', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE' };

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL) {
  const origin = req.headers.origin;
  const sameOrigin = !origin || origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`;
  const isMcp = url.pathname === '/mcp';
  const corsOk = isMcp || router.corsAllowed(url.pathname);
  const cors: Record<string, string> = !sameOrigin && corsOk ? { 'Access-Control-Allow-Origin': '*' } : {};
  if (req.method === 'OPTIONS') {
    if (corsOk) res.writeHead(204, CORS_HEADERS).end();
    else res.writeHead(403).end();
    return;
  }
  // Cross-origin calls are only allowed with an API token, and only on capture/read endpoints and MCP.
  if (!sameOrigin && (!corsOk || !bearerToken(req, url))) return send(res, 403, { error: 'Cross-origin requests need an API token and are limited to capture, read and MCP endpoints.' }, cors);

  const ctx: Ctx = { req, res, url, params: {}, body: () => readBody(req) };
  try {
    if (isMcp) {
      if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST', ...cors }).end(); return; }
      authenticate(ctx, 'viewer', sys, workspaces);
      for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
      await mcpHandler(ctx as WCtx, res);
      return;
    }
    const m = router.match(req.method ?? 'GET', url.pathname);
    if (!m) return send(res, 404, { error: 'Not found' }, cors);
    ctx.params = m.params;
    authenticate(ctx, m.route.need, sys, workspaces);
    const out = await m.route.handler(ctx);
    if (out !== undefined && !res.headersSent) send(res, 200, out, cors);
  } catch (err) {
    if (res.headersSent) return;
    if (err instanceof ValidationError) return send(res, 422, { error: err.message, errors: err.errors }, cors);
    if (err instanceof HttpError) return send(res, err.status, { error: err.message }, cors);
    const msg = (err as Error).message ?? 'Server error';
    // Store-level problems with user input (e.g. duplicate email) surface as 422.
    if (/already exists|valid email|Unknown type|Not found:/.test(msg)) return send(res, 422, { error: msg }, cors);
    console.error(err);
    send(res, 500, { error: msg }, cors);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname.startsWith('/api/') || url.pathname === '/mcp') { void handleApi(req, res, url); return; }
  if (vite) vite.middlewares(req, res, () => res.writeHead(404).end());
  else serveStatic(res, url);
});

// Dev: Vite runs as middleware and shares this server for hot reload, so a
// second copy on another PORT needs no extra ports.
if (DEV) {
  const { createServer: createVite } = await import('vite');
  vite = await createVite({ configFile: join(ROOT, 'web', 'vite.config.ts'), server: { middlewareMode: true, ws: { server } }, appType: 'spa' });
}

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — Throughline is probably already running at http://${HOST}:${PORT}.`);
    console.error(`Open that URL, stop the other process, or start a second copy with: PORT=${PORT + 1} npm run dev`);
  } else {
    console.error(`Could not start the server: ${err.message}`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const where = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  console.log(`Throughline running at ${where}${DEV ? ' (dev)' : ''}`);
  console.log(`Data: ${DATA}`);
  console.log(`MCP endpoint for AI assistants: ${where}/mcp (create a token under Settings → Access & tokens)`);
});
