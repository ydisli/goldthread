#!/usr/bin/env node
// Stdio bridge for MCP clients that launch local commands (Claude Desktop,
// Claude Code, Cursor, VS Code). It forwards JSON-RPC messages to a running
// Goldthread server's /mcp endpoint using your personal API token.
//
//   GT_URL=http://127.0.0.1:4300 GT_TOKEN=gt_xxx node mcp/stdio.ts

import { createInterface } from 'node:readline';

const URL_BASE = (process.env.GT_URL ?? 'http://127.0.0.1:4300').replace(/\/$/, '');
const TOKEN = process.env.GT_TOKEN ?? '';

if (!TOKEN) {
  process.stderr.write('Goldthread MCP: set GT_TOKEN (Settings → Tokens & integrations in the web app).\n');
}

const write = (msg: unknown) => process.stdout.write(`${JSON.stringify(msg)}\n`);

async function forward(line: string) {
  let msg: { id?: string | number | null };
  try {
    msg = JSON.parse(line);
  } catch {
    write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  try {
    const res = await fetch(`${URL_BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${TOKEN}`, 'X-GT-Actor': 'MCP' },
      body: line,
    });
    if (res.status === 202) return;
    const text = await res.text();
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try { message = JSON.parse(text).error ?? message; } catch { /* not JSON */ }
      if (msg.id !== undefined && msg.id !== null) write({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message } });
      return;
    }
    process.stdout.write(`${text}\n`);
  } catch (err) {
    if (msg.id !== undefined && msg.id !== null) write({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Cannot reach Goldthread at ${URL_BASE}: ${(err as Error).message}` } });
  }
}

const rl = createInterface({ input: process.stdin });
const queue: Promise<void>[] = [];
rl.on('line', (line) => { if (line.trim()) queue.push(forward(line)); });
rl.on('close', () => { void Promise.all(queue).then(() => process.exit(0)); });
