import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SystemDB } from '../system.ts';
import { Workspaces } from '../workspaces.ts';
import { accountRoutes } from '../account.ts';
import { apiRoutes } from '../api.ts';
import { aiRoutes } from '../ai.ts';
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
  const call = async (method: string, path: string, opts: { session?: string; workspace?: string; body?: unknown } = {}) => {
    const url = new URL(`http://localhost${path}`);
    const hit = router.match(method, url.pathname);
    if (!hit) throw new Error(`no route ${method} ${path}`);
    const headers: Record<string, string> = {};
    if (opts.session) headers.cookie = `tl_session=${opts.session}`;
    if (opts.workspace) headers['x-tl-workspace'] = opts.workspace;
    const res: any = { headers: {} as Record<string, string | string[]>, setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; } };
    const ctx = { req: { headers, socket: {} } as any, res, url, params: hit.params, body: async () => opts.body ?? {} } as Ctx;
    authenticate(ctx, hit.route.need, sys, ws);
    try {
      return { status: 200, body: await hit.route.handler(ctx) as any, headers: res.headers };
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

