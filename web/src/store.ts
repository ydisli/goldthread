import { useMemo, useSyncExternalStore } from 'react';
import { Graph } from '../../core/graph.ts';
import type { Entity } from '../../core/schema.ts';

export interface Settings {
  workspaceName: string;
  productName: string;
  currency: string;
  userName?: string;
  ourCapabilities?: Record<string, number>;
  [k: string]: unknown;
}

export interface Activity {
  id: number;
  at: string;
  actor: string;
  entityId: string;
  entityType: string;
  action: 'create' | 'update' | 'delete';
  summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

type Status = 'loading' | 'ready' | 'offline' | 'error';

interface State {
  status: Status;
  error?: string;
  entities: Map<string, Entity>;
  settings: Settings;
  ai: { enabled: boolean; model?: string };
  version: number;
  live: boolean;
}

let state: State = {
  status: 'loading',
  entities: new Map(),
  settings: { workspaceName: 'Throughline', productName: '', currency: '$' },
  ai: { enabled: false },
  version: 0,
  live: false,
};
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const set = (patch: Partial<State>) => { state = { ...state, ...patch, version: state.version + 1 }; emit(); };

// ---------------- API ----------------

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: string[];
  constructor(status: number, message: string, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: { 'Content-Type': 'application/json', 'X-TL-Actor': state.settings.userName ?? 'web', ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? res.statusText, body?.errors);
  return body as T;
}

// ---------------- load & live sync ----------------

const CACHE_KEY = 'tl.workspace.v1';

export async function load() {
  try {
    const ws = await api<{ settings: Settings; entities: Entity[]; ai: State['ai'] }>('/api/workspace');
    set({ status: 'ready', entities: new Map(ws.entities.map((e) => [e.id, e])), settings: ws.settings, ai: ws.ai, error: undefined });
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ settings: ws.settings, entities: ws.entities })); } catch { /* storage unavailable */ }
  } catch (err) {
    // Offline: fall back to the last cached workspace (read-only).
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
      if (cached) {
        set({ status: 'offline', entities: new Map((cached.entities as Entity[]).map((e) => [e.id, e])), settings: cached.settings });
        return;
      }
    } catch { /* ignore */ }
    set({ status: 'error', error: (err as Error).message });
  }
}

let source: EventSource | null = null;
export function connectLive() {
  if (source) return;
  source = new EventSource('/api/events');
  source.onopen = () => set({ live: true });
  source.onerror = () => set({ live: false });
  source.onmessage = (ev) => {
    const changes = JSON.parse(ev.data) as ({ op: 'upsert'; entity: Entity } | { op: 'delete'; id: string } | { op: 'reset' } | { op: 'settings' })[];
    let entities: Map<string, Entity> | null = null;
    for (const c of changes) {
      if (c.op === 'reset' || c.op === 'settings') { void load(); return; }
      entities ??= new Map(state.entities);
      if (c.op === 'upsert') entities.set(c.entity.id, c.entity);
      else entities.delete(c.id);
    }
    if (entities) set({ entities });
  };
}

// ---------------- mutations ----------------

function upsert(list: Entity[]) {
  const entities = new Map(state.entities);
  for (const e of list) entities.set(e.id, e);
  set({ entities });
}

export async function createEntity(type: string, data: Record<string, unknown>): Promise<Entity> {
  const e = await api<Entity>('/api/entities', { method: 'POST', json: { type, ...data } });
  upsert([e]);
  return e;
}

export async function updateEntity(id: string, patch: Record<string, unknown>): Promise<Entity> {
  const e = await api<Entity>(`/api/entities/${encodeURIComponent(id)}`, { method: 'PATCH', json: patch });
  upsert([e]);
  return e;
}

export async function deleteEntity(id: string): Promise<void> {
  await api(`/api/entities/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const entities = new Map(state.entities);
  entities.delete(id);
  set({ entities });
}

export type BatchOp = { op: 'create'; type: string; data: Record<string, unknown> } | { op: 'update'; id: string; data: Record<string, unknown> } | { op: 'delete'; id: string };

/** Several changes in one transaction; "$n" in data refers to the id created by op n. */
export async function batch(ops: BatchOp[]): Promise<Entity[]> {
  const out = await api<Entity[]>('/api/batch', { method: 'POST', json: ops });
  const entities = new Map(state.entities);
  out.forEach((e, i) => {
    if ((e as any).deleted) entities.delete(e.id);
    else if (ops[i].op !== 'delete') entities.set(e.id, e);
  });
  set({ entities });
  return out;
}

export async function updateSettings(patch: Partial<Settings>) {
  const settings = await api<Settings>('/api/settings', { method: 'PATCH', json: patch });
  set({ settings });
}

// ---------------- hooks ----------------

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state);
}

let graphCache: { version: number; graph: Graph } | null = null;
export function getGraph(): Graph {
  if (!graphCache || graphCache.version !== state.version) graphCache = { version: state.version, graph: new Graph(state.entities.values()) };
  return graphCache.graph;
}

/** The Intent Graph, rebuilt only when the workspace changes. */
export function useGraph(): Graph {
  const s = useStore();
  return useMemo(() => getGraph(), [s.version]);
}

export function useEntity(id: string | undefined): Entity | undefined {
  const s = useStore();
  return id ? s.entities.get(id) : undefined;
}

export function useSettings(): Settings {
  return useStore().settings;
}

/** "Now" for all analyses. */
export function now(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
