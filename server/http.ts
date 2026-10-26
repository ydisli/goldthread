import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Store } from './db.ts';
import type { Role, User, Workspace } from './system.ts';

/** An error that the router turns into an HTTP status + JSON message. */
export class HttpError extends Error {
  readonly status: number;
  /** Extra fields for the JSON body (e.g. the details of an edit conflict). */
  readonly data?: Record<string, unknown>;
  constructor(status: number, message: string, data?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

export async function readBody(req: IncomingMessage, limit = 20 * 1024 * 1024): Promise<any> {
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

/** What a route requires: nothing, a signed-in user, or a minimum workspace role. */
export type Need = 'none' | 'user' | Role;

export interface WsCtx {
  workspace: Workspace;
  /** The member's role, reduced to viewer for read-only tokens. */
  role: Role;
  store: Store;
}

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  body: () => Promise<any>;
  user?: User;
  sessionHash?: string;
  sessionWorkspaceId?: string;
  via?: 'session' | 'token';
  ws?: WsCtx;
}

/** Context for routes that declared a workspace role (always has user + ws). */
export type WCtx = Ctx & { user: User; ws: WsCtx };
export type UCtx = Ctx & { user: User };

export interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  need: Need;
  /** Reachable cross-origin with an API token (extension, other tools). */
  cors?: boolean;
  handler: (ctx: any) => unknown;
}

export class Router {
  readonly routes: Route[] = [];

  add<N extends Need>(method: string, path: string, need: N, handler: (ctx: N extends 'none' ? Ctx : N extends 'user' ? UCtx : WCtx) => unknown, opts: { cors?: boolean } = {}) {
    const keys: string[] = [];
    const pattern = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    this.routes.push({ method, pattern, keys, need, handler, cors: opts.cors });
  }

  match(method: string, pathname: string): { route: Route; params: Record<string, string> } | undefined {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.pattern.exec(pathname);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
    return undefined;
  }

  corsAllowed(pathname: string): boolean {
    return this.routes.some((r) => r.cors && r.pattern.test(pathname));
  }
}
