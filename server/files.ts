import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { HttpError, readRaw, type Router, type WCtx } from './http.ts';
import { actorOf } from './auth.ts';
import { broadcast } from './live.ts';
import type { Workspaces } from './workspaces.ts';

// Attachments: files on any item, stored on disk next to the workspace database and
// described by an `attachment` item (so they have history, undo and restore like
// everything else). Files are served with a sandbox policy and never executed.

export const MAX_UPLOAD = 25 * 1_048_576;

/** Types a browser may show inline; everything else downloads. Never HTML or SVG (scripts). */
const INLINE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']);

const asciiName = (s: string) => s.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

export function fileRoutes(r: Router, workspaces: Workspaces) {
  r.add('POST', '/api/files', 'editor', async (ctx: WCtx) => {
    const entityId = ctx.url.searchParams.get('entityId') ?? '';
    const name = (ctx.url.searchParams.get('name') ?? '').replace(/[/\\]/g, '_').trim().slice(0, 200);
    if (!name) throw new HttpError(422, 'The file needs a name.');
    const on = ctx.ws.store.get(entityId);
    if (!on) throw new HttpError(404, 'That item does not exist.');
    const data = await readRaw(ctx.req, MAX_UPLOAD);
    if (!data.length) throw new HttpError(422, 'The file is empty.');
    const dir = workspaces.filesDir(ctx.ws.workspace.id);
    mkdirSync(dir, { recursive: true });
    const fileId = randomBytes(16).toString('hex');
    writeFileSync(join(dir, fileId), data, { mode: 0o600 });
    const mime = String(ctx.req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() || 'application/octet-stream';
    const e = ctx.ws.store.create('attachment', { entityId, name, size: data.length, mime, fileId, uploadedBy: ctx.user.name }, actorOf(ctx));
    broadcast(ctx.ws.workspace.id, [{ op: 'upsert', entity: e }]);
    return e;
  });

  r.add('GET', '/api/files/:id', 'viewer', (ctx: WCtx) => {
    const a = ctx.ws.store.get(ctx.params.id);
    if (!a || a.type !== 'attachment' || !/^[0-9a-f]{32}$/.test(String(a.fileId))) throw new HttpError(404, 'File not found.');
    const path = join(workspaces.filesDir(ctx.ws.workspace.id), String(a.fileId));
    if (!existsSync(path)) throw new HttpError(404, 'The file is missing on the server.');
    const mime = String(a.mime || 'application/octet-stream');
    const inline = INLINE.has(mime) && ctx.url.searchParams.get('download') !== '1';
    ctx.res.writeHead(200, {
      'Content-Type': inline ? mime : 'application/octet-stream',
      'Content-Length': String(statSync(path).size),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${asciiName(String(a.name))}"; filename*=UTF-8''${encodeURIComponent(String(a.name))}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      'Cache-Control': 'private, max-age=3600',
    });
    createReadStream(path).pipe(ctx.res);
  });
}
