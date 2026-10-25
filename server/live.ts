import type { ServerResponse } from 'node:http';
import type { Entity } from '../core/schema.ts';

// Live sync over Server-Sent Events, one channel per workspace.

export type Change = { op: 'upsert'; entity: Entity } | { op: 'delete'; id: string } | { op: 'reset' } | { op: 'settings' } | { op: 'members' };

const channels = new Map<string, Set<ServerResponse>>();

export function subscribe(workspaceId: string, res: ServerResponse, onClose: (fn: () => void) => void) {
  let set = channels.get(workspaceId);
  if (!set) channels.set(workspaceId, (set = new Set()));
  set.add(res);
  onClose(() => set!.delete(res));
}

export function broadcast(workspaceId: string, changes: Change[]) {
  const payload = `data: ${JSON.stringify(changes)}\n\n`;
  for (const c of channels.get(workspaceId) ?? []) c.write(payload);
}

setInterval(() => {
  for (const set of channels.values()) for (const c of set) c.write(': ping\n\n');
}, 25_000).unref();
