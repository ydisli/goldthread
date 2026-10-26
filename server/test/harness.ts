import { mkdtempSync, rmSync } from 'node:fs';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SystemDB } from '../system.ts';
import { Workspaces } from '../workspaces.ts';
import { accountRoutes } from '../account.ts';
import { apiRoutes } from '../api.ts';
import { aiRoutes } from '../ai.ts';
import { oidcRoutes } from '../oidc.ts';
import { integrationRoutes } from '../integrations.ts';
import { fileRoutes } from '../files.ts';
import { authenticate } from '../auth.ts';
import { HttpError, Router, type Ctx } from '../http.ts';

/** A tiny in-process client: route lookup, auth and the handler, without a socket. */
export function harness() {
  const dir = mkdtempSync(join(tmpdir(), 'throughline-acct-'));
  const sys = new SystemDB(dir);
  const ws = new Workspaces(sys, dir);
  const router = new Router();
  accountRoutes(router, sys, ws);
  apiRoutes(router, sys, ws);
  aiRoutes(router, sys);
  oidcRoutes(router, sys, ws);
  integrationRoutes(router, sys, ws);
  fileRoutes(router, ws);
  const call = async (method: string, path: string, opts: { session?: string; workspace?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {}) => {
    const url = new URL(`http://localhost${path}`);
    const hit = router.match(method, url.pathname);
    if (!hit) throw new Error(`no route ${method} ${path}`);
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.session) headers.cookie = `tl_session=${opts.session}`;
    if (opts.workspace) headers['x-tl-workspace'] = opts.workspace;
    const res: any = {
      headers: {} as Record<string, string | string[]>, statusCode: 200, headersSent: false,
      setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; },
      writeHead(status: number, h: Record<string, string> = {}) { this.statusCode = status; for (const [k, v] of Object.entries(h)) this.headers[k.toLowerCase()] = v; this.headersSent = true; return this; },
      end() { this.headersSent = true; },
    };
    const req = Object.assign(Readable.from(opts.raw !== undefined ? [Buffer.from(opts.raw)] : []), { headers, socket: {} });
    const ctx = { req: req as any, res, url, params: hit.params, body: async () => opts.body ?? {} } as Ctx;
    authenticate(ctx, hit.route.need, sys, ws);
    try {
      const body = await hit.route.handler(ctx) as any;
      return { status: res.headersSent ? res.statusCode : 200, body, headers: res.headers };
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, body: { error: err.message, ...(err.data ?? {}) } as any, headers: res.headers };
      throw err;
    }
  };
  const user = (name: string) => {
    const u = sys.createUser({ email: `${name}@example.com`, name, password: 'correct horse battery' });
    return { user: u, session: sys.createSession(u.id, undefined) };
  };
  return { dir, sys, ws, call, user, done: () => rmSync(dir, { recursive: true, force: true }) };
}

