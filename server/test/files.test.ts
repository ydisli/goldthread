import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SystemDB } from '../system.ts';
import { Workspaces } from '../workspaces.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const freePort = () => new Promise<number>((resolve) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => resolve(p)); }); });

// Uploads go through the real HTTP server (streams, limits and headers matter here).
test('attachments: upload, safe download, limits, viewer access, remove and restore', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'goldthread-files-'));
  const sys = new SystemDB(dir);
  const ws = new Workspaces(sys, dir);
  const owner = sys.createUser({ email: 'o@example.com', name: 'Olga', password: 'correct horse battery' });
  const viewer = sys.createUser({ email: 'v@example.com', name: 'Vic', password: 'correct horse battery' });
  const w = ws.create({ name: 'T', kind: 'team', owner, sample: 'empty' });
  sys.addMember(w.id, viewer.id, 'viewer');
  const item = ws.store(w.id).create('decision', { title: 'Retire the chatbot' }, 'test');
  const port = await freePort();
  const server = spawn(process.execPath, [join(ROOT, 'server/index.ts'), '--port', String(port)], { env: { ...process.env, GT_DATA: dir, GT_DEMO: '0' }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  const as = (userId: string) => ({ cookie: `gt_session=${sys.createSession(userId, w.id)}`, 'X-GT-Workspace': w.id });
  try {
    for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
    const ownerH = as(owner.id), viewerH = as(viewer.id);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)]);
    const up = await fetch(`${base}/api/files?entityId=${item.id}&name=${encodeURIComponent('Screen shot – Ü.png')}`, { method: 'POST', headers: { ...ownerH, 'Content-Type': 'image/png' }, body: png });
    assert.equal(up.status, 200);
    const a = await up.json();
    assert.deepEqual([a.type, a.entityId, a.size, a.mime, a.uploadedBy], ['attachment', item.id, png.length, 'image/png', 'Olga']);

    const get = await fetch(`${base}/api/files/${a.id}`, { headers: viewerH });
    assert.equal(get.status, 200, 'viewers can read files');
    assert.equal(get.headers.get('content-type'), 'image/png');
    assert.match(get.headers.get('content-disposition')!, /^inline; filename=".*"; filename\*=UTF-8''Screen%20shot%20%E2%80%93%20%C3%9C.png$/);
    assert.match(get.headers.get('content-security-policy')!, /sandbox/);
    assert.deepEqual(Buffer.from(await get.arrayBuffer()), png);

    const html = await (await fetch(`${base}/api/files?entityId=${item.id}&name=page.html`, { method: 'POST', headers: { ...ownerH, 'Content-Type': 'text/html' }, body: '<script>alert(1)</script>' })).json();
    const htmlGet = await fetch(`${base}/api/files/${html.id}`, { headers: ownerH });
    assert.equal(htmlGet.headers.get('content-type'), 'application/octet-stream', 'never served as HTML');
    assert.match(htmlGet.headers.get('content-disposition')!, /^attachment;/);
    assert.equal(htmlGet.headers.get('x-content-type-options'), 'nosniff');

    assert.equal((await fetch(`${base}/api/files?entityId=${item.id}&name=x.png`, { method: 'POST', headers: { ...viewerH, 'Content-Type': 'image/png' }, body: png })).status, 403, 'viewers cannot upload');
    const big = await fetch(`${base}/api/files?entityId=${item.id}&name=big.bin`, { method: 'POST', headers: { ...ownerH, 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(26 * 1_048_576) }).catch(() => null);
    assert.ok(!big || big.status === 413, 'over 25 MB is refused');
    assert.equal((await fetch(`${base}/api/files?entityId=nope&name=x.png`, { method: 'POST', headers: { ...ownerH, 'Content-Type': 'image/png' }, body: png })).status, 404);

    assert.equal((await fetch(`${base}/api/entities/${a.id}`, { method: 'DELETE', headers: ownerH })).status, 200);
    assert.equal((await fetch(`${base}/api/files/${a.id}`, { headers: ownerH })).status, 404, 'a removed file is not served');
    assert.equal((await fetch(`${base}/api/entities/${a.id}/restore`, { method: 'POST', headers: ownerH })).status, 200);
    assert.equal((await fetch(`${base}/api/files/${a.id}`, { headers: ownerH })).status, 200, 'and comes back on restore');
  } finally {
    server.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
