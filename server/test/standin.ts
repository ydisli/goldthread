import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Recorded { method: string; path: string; headers: IncomingMessage['headers']; body: any; raw: string }

/**
 * A local stand-in for an external service: answers with `handler` and records every request.
 * Used to test integrations (model providers, mail, SSO, Jira, Slack) without the real service.
 */
export async function standIn(handler: (req: Recorded, res: ServerResponse) => void | Promise<void>) {
  const requests: Recorded[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body: any = raw;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { /* form or text */ }
    const rec = { method: req.method ?? 'GET', path: req.url ?? '/', headers: req.headers, body, raw };
    requests.push(rec);
    await handler(rec, res);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, requests, close: () => new Promise<void>((r) => server.close(() => r())) };
}

export const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
};
