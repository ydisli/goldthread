import { useMemo, useSyncExternalStore } from 'react';
import { Graph } from '../../core/graph.ts';
import type { Entity } from '../../core/schema.ts';

export interface Settings {
  workspaceName: string;
  productName: string;
  currency: string;
  ourCapabilities?: Record<string, number>;
  [k: string]: unknown;
}

export interface Activity {
  id: number;
  at: string;
  actor: string;
  actorId?: string;
  entityId: string;
  entityType: string;
  action: 'create' | 'update' | 'delete';
  summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';
export type Persona = 'po' | 'ba' | 'both';
export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export interface Prefs { persona?: Persona; pinned?: string[]; dismissedGuides?: string[]; seenMentions?: string[]; book?: Record<string, string>; [k: string]: unknown }
export interface Me { id: string; email: string; name: string; title?: string; demo: boolean; prefs: Prefs; hasPassword?: boolean }
export interface WorkspaceRef { id: string; name: string; kind: 'personal' | 'team'; demo: boolean; role: Role }
export interface Member { userId: string; name: string; email: string; role: Role }
export interface DemoAccount { id: string; name: string; title?: string; role: Role }

export interface AuthState {
  user: Me | null;
  workspaces: WorkspaceRef[];
  current: WorkspaceRef | null;
  signup: 'open' | 'invite-only';
  demo: DemoAccount[];
  firstRun: boolean;
}

type Status = 'loading' | 'auth' | 'ready' | 'offline' | 'error';

interface State {
  status: Status;
  error?: string;
  auth: AuthState | null;
  entities: Map<string, Entity>;
  settings: Settings;
  members: Member[];
  role: Role;
  ai: { enabled: boolean; provider?: string; model?: string };
  version: number;
  live: boolean;
}

let state: State = {
  status: 'loading',
  auth: null,
  entities: new Map(),
  settings: { workspaceName: 'Throughline', productName: '', currency: '$' },
  members: [],
  role: 'viewer',
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
  readonly data?: any;
  constructor(status: number, message: string, errors?: string[], data?: any) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}

/** Someone else changed fields you were editing; nothing was saved. */
export interface Conflict {
  by: string;
  current: Entity;
  fields: { key: string; label: string; theirs: unknown; yours: unknown }[];
}

export function conflictOf(err: unknown): Conflict | null {
  return err instanceof ApiError && err.status === 409 && err.data?.conflict ? (err.data.conflict as Conflict) : null;
}

const WS_KEY = 'tl.workspace';
let currentWs: string | null = (() => { try { return localStorage.getItem(WS_KEY); } catch { return null; } })();

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(currentWs ? { 'X-TL-Workspace': currentWs } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let body: any;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }
  if (res.status === 401 && !path.startsWith('/api/auth/') && !path.startsWith('/api/invites/')) {
    void boot();
  }
  if (!res.ok) throw new ApiError(res.status, body?.error ?? res.statusText, body?.errors, body);
  return body as T;
}

// ---------------- boot, auth & workspace loading ----------------

const CACHE_KEY = 'tl.workspace.cache.v2';

export async function boot() {
  let auth: AuthState;
  try {
    auth = await api<AuthState>('/api/auth/state');
  } catch (err) {
    return offlineFallback(err);
  }
  if (!auth.user) {
    disconnectLive();
    set({ status: 'auth', auth, entities: new Map(), members: [] });
    return;
  }
  const preferred = auth.workspaces.find((w) => w.id === currentWs) ?? auth.current ?? auth.workspaces[0];
  setCurrentWs(preferred?.id ?? null);
  set({ auth: { ...auth, current: preferred ?? null } });
  if (!preferred) { set({ status: 'ready', entities: new Map() }); return; }
  await loadWorkspace();
  connectLive();
}

function setCurrentWs(id: string | null) {
  currentWs = id;
  try { if (id) localStorage.setItem(WS_KEY, id); else localStorage.removeItem(WS_KEY); } catch { /* storage unavailable */ }
}

export async function loadWorkspace() {
  try {
    const ws = await api<{ settings: Settings; entities: Entity[]; ai: State['ai']; role: Role; members: Member[] }>('/api/workspace');
    set({ status: 'ready', entities: new Map(ws.entities.map((e) => [e.id, e])), settings: ws.settings, ai: ws.ai, role: ws.role, members: ws.members, error: undefined });
    document.documentElement.dataset.role = ws.role;
    try { localStorage.setItem(`${CACHE_KEY}.${currentWs}`, JSON.stringify({ settings: ws.settings, entities: ws.entities, members: ws.members })); } catch { /* quota or private mode */ }
  } catch (err) {
    if ((err as ApiError).status === 403) {
      // Removed from this workspace — fall back to another one.
      setCurrentWs(null);
      return boot();
    }
    offlineFallback(err);
  }
}

function offlineFallback(err: unknown) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${CACHE_KEY}.${currentWs}`) ?? 'null');
    if (cached) {
      set({ status: 'offline', entities: new Map((cached.entities as Entity[]).map((e) => [e.id, e])), settings: cached.settings, members: cached.members ?? [] });
      return;
    }
  } catch { /* ignore */ }
  set({ status: 'error', error: (err as Error).message });
}

export async function switchWorkspace(id: string) {
  await api('/api/session/workspace', { method: 'POST', json: { workspaceId: id } });
  setCurrentWs(id);
  disconnectLive();
  set({ status: 'loading', auth: state.auth ? { ...state.auth, current: state.auth.workspaces.find((w) => w.id === id) ?? null } : null });
  await boot();
}

export async function login(email: string, password: string) {
  const r = await api<{ workspaceId?: string }>('/api/auth/login', { method: 'POST', json: { email, password } });
  setCurrentWs(r.workspaceId ?? null);
  await boot();
}

export async function demoLogin(userId: string) {
  const r = await api<{ workspaceId?: string }>('/api/auth/demo', { method: 'POST', json: { userId } });
  setCurrentWs(r.workspaceId ?? null);
  await boot();
}

export async function signup(data: { name: string; email: string; password: string; persona: Persona; sample: string; workspaceName?: string; title?: string }) {
  const r = await api<{ workspaceId: string }>('/api/auth/signup', { method: 'POST', json: data });
  setCurrentWs(r.workspaceId);
  await boot();
}

export async function acceptInvite(token: string, data: Record<string, unknown>) {
  const r = await api<{ workspaceId: string }>(`/api/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', json: data });
  setCurrentWs(r.workspaceId);
  await boot();
}

export async function resetPassword(token: string, password: string) {
  const r = await api<{ workspaceId?: string }>(`/api/password-reset/${encodeURIComponent(token)}`, { method: 'POST', json: { password } });
  setCurrentWs(r.workspaceId ?? null);
  await boot();
}

/** Delete the signed-in account (see DELETE /api/me for what happens to workspaces). */
export async function deleteAccount(body: { password?: string; confirm?: string }) {
  await api('/api/me', { method: 'DELETE', json: body });
  setCurrentWs(null);
  disconnectLive();
  await boot();
}

export async function logout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  setCurrentWs(null);
  disconnectLive();
  await boot();
}

export async function updateMe(patch: { name?: string; title?: string; prefs?: Prefs }) {
  const me = await api<Me>('/api/me', { method: 'PATCH', json: patch });
  if (state.auth) set({ auth: { ...state.auth, user: me } });
  return me;
}

export async function refreshAuth() {
  const auth = await api<AuthState>('/api/auth/state');
  set({ auth: { ...auth, current: auth.workspaces.find((w) => w.id === currentWs) ?? auth.current } });
}

// ---------------- live sync ----------------

let source: EventSource | null = null;
export function connectLive() {
  if (source || !currentWs) return;
  source = new EventSource(`/api/events?ws=${encodeURIComponent(currentWs)}`);
  source.onopen = () => set({ live: true });
  source.onerror = () => set({ live: false });
  source.onmessage = (ev) => {
    const changes = JSON.parse(ev.data) as ({ op: 'upsert'; entity: Entity } | { op: 'delete'; id: string } | { op: 'reset' } | { op: 'settings' } | { op: 'members' })[];
    let entities: Map<string, Entity> | null = null;
    for (const c of changes) {
      if (c.op === 'reset' || c.op === 'settings' || c.op === 'members') { void loadWorkspace(); void refreshAuth(); return; }
      entities ??= new Map(state.entities);
      if (c.op === 'upsert') entities.set(c.entity.id, c.entity);
      else entities.delete(c.id);
    }
    if (entities) set({ entities });
  };
}

function disconnectLive() {
  source?.close();
  source = null;
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

/**
 * Save changes. Pass `prev` (the values you started from, for the fields you changed) to be
 * told about a conflicting edit instead of overwriting it: the call then fails with a Conflict.
 */
export async function updateEntity(id: string, patch: Record<string, unknown>, opts: { prev?: Record<string, unknown> } = {}): Promise<Entity> {
  const json = opts.prev ? { ...patch, $prev: opts.prev } : patch;
  const e = await api<Entity>(`/api/entities/${encodeURIComponent(id)}`, { method: 'PATCH', json });
  upsert([e]);
  return e;
}

export async function deleteEntity(id: string): Promise<void> {
  await api(`/api/entities/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const entities = new Map(state.entities);
  entities.delete(id);
  set({ entities });
}

/** Deletes are soft: bring an entity back (used by Undo and Recently deleted). */
export async function restoreEntity(id: string): Promise<Entity> {
  const e = await api<Entity>(`/api/entities/${encodeURIComponent(id)}/restore`, { method: 'POST' });
  upsert([e]);
  return e;
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

export function getState(): State {
  return state;
}

let graphCache: { version: number; graph: Graph } | null = null;
export function getGraph(): Graph {
  if (!graphCache || graphCache.version !== state.version) graphCache = { version: state.version, graph: new Graph(state.entities.values(), { meUserId: state.auth?.user?.id }) };
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

export function useMe(): Me | null {
  return useStore().auth?.user ?? null;
}

/** Does the signed-in person have at least this role here? */
export function useCan(role: Role): boolean {
  return ROLE_RANK[useStore().role] >= ROLE_RANK[role];
}

export function can(role: Role): boolean {
  return ROLE_RANK[state.role] >= ROLE_RANK[role];
}

/** "Now" for all analyses. */
export function now(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
