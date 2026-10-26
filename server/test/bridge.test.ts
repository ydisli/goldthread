import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { SystemDB } from '../system.ts';
import { Workspaces } from '../workspaces.ts';

const ROOT = new URL('../../', import.meta.url).pathname;

const freePort = () => new Promise<number>((resolve) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => resolve(p)); });
});

async function waitFor(url: string, ms = 15_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not start: ${url}`);
}

// The stdio bridge is what Claude Desktop, Cursor and others launch. This runs the real
// server and the real bridge as processes and talks JSON-RPC over the bridge's stdin/stdout,
// exactly as an MCP client does. (It does not drive Claude Desktop itself.)
test('MCP stdio bridge: initialize, list tools, search and capture through a running server', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'throughline-bridge-'));
  const procs: ChildProcess[] = [];
  try {
    const sys = new SystemDB(dir);
    const ws = new Workspaces(sys, dir);
    const u = sys.createUser({ email: 'ana@example.com', name: 'Ana', password: 'correct horse battery' });
    const w = ws.create({ name: 'ServiceHub', kind: 'team', owner: u, sample: 'it' });
    const { token } = sys.createToken({ userId: u.id, workspaceId: w.id, name: 'bridge test', scope: 'write' });

    const port = await freePort();
    const server = spawn(process.execPath, [join(ROOT, 'server/index.ts'), '--port', String(port)], { env: { ...process.env, TL_DATA: dir, TL_DEMO: '0' }, stdio: 'ignore' });
    procs.push(server);
    await waitFor(`http://127.0.0.1:${port}/api/health`);

    const bridge = spawn(process.execPath, [join(ROOT, 'mcp/stdio.ts')], { env: { ...process.env, TL_URL: `http://127.0.0.1:${port}`, TL_TOKEN: token }, stdio: ['pipe', 'pipe', 'inherit'] });
    procs.push(bridge);
    const replies = new Map<number, any>();
    const waiters = new Map<number, (v: any) => void>();
    createInterface({ input: bridge.stdout! }).on('line', (line) => {
      const msg = JSON.parse(line);
      replies.set(msg.id, msg);
      waiters.get(msg.id)?.(msg);
    });
    let nextId = 1;
    const rpc = (method: string, params?: unknown) => new Promise<any>((resolve, reject) => {
      const id = nextId++;
      waiters.set(id, resolve);
      setTimeout(() => reject(new Error(`no reply to ${method}`)), 10_000);
      bridge.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });

    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test-client', version: '1' } });
    assert.equal(init.result.serverInfo.name, 'throughline');
    bridge.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    const tools = await rpc('tools/list');
    assert.ok(tools.result.tools.some((t: { name: string }) => t.name === 'read_guide'));
    const found = await rpc('tools/call', { name: 'search', arguments: { query: 'leaver deprovisioning' } });
    assert.match(found.result.content[0].text, /REQ-5/);
    const cap = await rpc('tools/call', { name: 'capture', arguments: { kind: 'evidence', text: 'Captured through the bridge' } });
    assert.equal(cap.result.structuredContent.created.type, 'evidence');
    assert.ok(ws.store(w.id).byType('evidence').some((e) => e.title === 'Captured through the bridge'), 'it landed in the workspace');
    const trail = ws.store(w.id).activity({ limit: 1 })[0];
    assert.match(trail.actor, /Ana \(MCP\)/, 'attributed to the token owner, via MCP');
  } finally {
    for (const p of procs) p.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MCP stdio bridge: a bad token comes back as a JSON-RPC error, not a crash', async () => {
  const bridge = spawn(process.execPath, [join(ROOT, 'mcp/stdio.ts')], { env: { ...process.env, TL_URL: 'http://127.0.0.1:9', TL_TOKEN: 'tl_nope' }, stdio: ['pipe', 'pipe', 'ignore'] });
  try {
    const line = await new Promise<string>((resolve) => {
      createInterface({ input: bridge.stdout! }).once('line', resolve);
      bridge.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list' })}\n`);
    });
    const msg = JSON.parse(line);
    assert.equal(msg.id, 7);
    assert.match(msg.error.message, /Cannot reach Throughline/);
  } finally { bridge.kill(); }
});
