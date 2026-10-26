import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaultsFor, ENTITY_MAP, validate, type Entity } from '../core/schema.ts';
import { approvalStatus, type Approver } from '../core/engines/stakeholders.ts';
import { versionPatch } from '../core/engines/requirements.ts';
import { newId } from '../core/util.ts';
import { validateCustom, type Customisation } from '../core/custom.ts';

/** Who made a change: a person (with user id) or a system process. */
export type Actor = string | { id?: string; name: string };
const actorName = (a: Actor) => (typeof a === 'string' ? a : a.name);
const actorId = (a: Actor) => (typeof a === 'string' ? null : a.id ?? null);

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

export interface Settings {
  workspaceName: string;
  productName: string;
  currency: string;
  [k: string]: unknown;
}

export class ValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join('; '));
    this.errors = errors;
  }
}

const RESERVED = new Set(['id', 'type', 'createdAt', 'updatedAt', 'key']);

/** SQLite-backed entity store with an append-only activity trail. */
export class Store {
  private db: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS entities_type ON entities(type);
      CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL,
        entity_id TEXT NOT NULL, entity_type TEXT NOT NULL, action TEXT NOT NULL, summary TEXT NOT NULL, changes TEXT
      );
      CREATE INDEX IF NOT EXISTS activity_entity ON activity(entity_id);
      CREATE TABLE IF NOT EXISTS counters (prefix TEXT PRIMARY KEY, n INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    // Migration: attribute changes to user accounts.
    const cols = this.db.prepare('PRAGMA table_info(activity)').all() as { name: string }[];
    if (!cols.some((c) => c.name === 'actor_id')) this.db.exec('ALTER TABLE activity ADD COLUMN actor_id TEXT');
  }

  close() {
    this.db.close();
  }

  isEmpty(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM entities WHERE deleted = 0').get() as { n: number };
    return row.n === 0;
  }

  all(): Entity[] {
    const rows = this.db.prepare('SELECT * FROM entities WHERE deleted = 0').all() as any[];
    return rows.map(rowToEntity);
  }

  byType(type: string): Entity[] {
    return (this.db.prepare('SELECT * FROM entities WHERE deleted = 0 AND type = ?').all(type) as any[]).map(rowToEntity);
  }

  get(id: string): Entity | undefined {
    if (!id) return undefined;
    const row = this.db.prepare('SELECT * FROM entities WHERE id = ? AND deleted = 0').get(id) as any;
    return row ? rowToEntity(row) : undefined;
  }

  private nextKey(prefix: string): string {
    this.db.prepare('INSERT INTO counters(prefix, n) VALUES (?, 1) ON CONFLICT(prefix) DO UPDATE SET n = n + 1').run(prefix);
    const row = this.db.prepare('SELECT n FROM counters WHERE prefix = ?').get(prefix) as { n: number };
    return `${prefix}-${row.n}`;
  }

  create(type: string, input: Record<string, unknown>, actor: Actor = 'system', opts: { id?: string; createdAt?: string; skipActivity?: boolean } = {}): Entity {
    const def = ENTITY_MAP[type];
    if (!def) throw new ValidationError([`Unknown type "${type}"`]);
    const data: Record<string, unknown> = { ...defaultsFor(type) };
    for (const [k, v] of Object.entries(input)) if (!RESERVED.has(k)) data[k] = v;
    normalize(type, data);
    const errors = validate(type, data);
    if (errors.length) throw new ValidationError(errors);
    if (def.keyPrefix) data.key = (input.key as string) ?? this.nextKey(def.keyPrefix);
    const now = new Date().toISOString();
    const id = opts.id ?? newId(type.slice(0, 3));
    const createdAt = opts.createdAt ?? now;
    this.db.prepare('INSERT INTO entities(id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, type, JSON.stringify(data), createdAt, createdAt);
    const e = { id, type, createdAt, updatedAt: createdAt, ...data } as Entity;
    if (!opts.skipActivity) this.log(actor, e, 'create', `Created ${def.label.toLowerCase()} "${titleFor(e)}"`);
    return e;
  }

  update(id: string, patch: Record<string, unknown>, actor: Actor = 'system', opts: { silent?: boolean } = {}): Entity {
    const current = this.get(id);
    if (!current) throw new ValidationError([`Not found: ${id}`]);
    const def = ENTITY_MAP[current.type];
    let clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (!RESERVED.has(k)) clean[k] = v;
    if (current.type === 'requirement') clean = versionPatch(current, clean, new Date().toISOString().slice(0, 10));
    const { id: _i, type: _t, createdAt: _c, updatedAt: _u, ...currentData } = current;
    const data: Record<string, unknown> = { ...currentData, ...clean };
    for (const [k, v] of Object.entries(data)) if (v === null) delete data[k];
    normalize(current.type, data);
    const errors = validate(current.type, data);
    if (errors.length) throw new ValidationError(errors);
    const now = new Date().toISOString();
    this.db.prepare('UPDATE entities SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(data), now, id);
    const next = { id, type: current.type, createdAt: current.createdAt, updatedAt: now, ...data } as Entity;
    const changes: Activity['changes'] = {};
    for (const k of Object.keys(clean)) {
      if (JSON.stringify(current[k]) !== JSON.stringify(data[k])) changes[k] = { from: compact(current[k]), to: compact(data[k]) };
    }
    if (Object.keys(changes).length && !opts.silent) {
      const labels = Object.keys(changes).map((k) => def.fields.find((f) => f.key === k)?.label ?? k);
      this.log(actor, next, 'update', `Updated ${labels.slice(0, 4).join(', ')}${labels.length > 4 ? '…' : ''}`, changes);
    }
    return next;
  }

  delete(id: string, actor: Actor = 'system'): Entity | undefined {
    const current = this.get(id);
    if (!current) return undefined;
    this.db.prepare('UPDATE entities SET deleted = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    this.log(actor, current, 'delete', `Deleted ${ENTITY_MAP[current.type]?.label.toLowerCase() ?? current.type} "${titleFor(current)}"`);
    return current;
  }

  /** Recently deleted entities, newest first. Deletes are soft, so anything here can be restored. */
  trash(limit = 50): (Entity & { deletedAt: string })[] {
    const rows = this.db.prepare('SELECT * FROM entities WHERE deleted = 1 ORDER BY updated_at DESC LIMIT ?').all(Math.min(200, limit)) as any[];
    return rows.map((r) => ({ ...rowToEntity(r), deletedAt: r.updated_at }));
  }

  restore(id: string, actor: Actor = 'system'): Entity | undefined {
    const row = this.db.prepare('SELECT * FROM entities WHERE id = ? AND deleted = 1').get(id) as any;
    if (!row) return undefined;
    const at = new Date().toISOString();
    this.db.prepare('UPDATE entities SET deleted = 0, updated_at = ? WHERE id = ?').run(at, id);
    const e = { ...rowToEntity(row), updatedAt: at };
    this.log(actor, e, 'update', `Restored ${ENTITY_MAP[e.type]?.label.toLowerCase() ?? e.type} "${titleFor(e)}"`);
    return e;
  }

  private log(actor: Actor, e: Entity, action: Activity['action'], summary: string, changes?: Activity['changes']) {
    this.db.prepare('INSERT INTO activity(at, actor, actor_id, entity_id, entity_type, action, summary, changes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(new Date().toISOString(), actorName(actor), actorId(actor), e.id, e.type, action, summary, changes ? JSON.stringify(changes) : null);
  }

  /** Everything one account did here, oldest first (for "download my data"). */
  activityBy(actorId: string): Activity[] {
    const rows = this.db.prepare('SELECT * FROM activity WHERE actor_id = ? ORDER BY id').all(actorId) as any[];
    return rows.map((r) => ({ id: r.id, at: r.at, actor: r.actor, actorId: r.actor_id ?? undefined, entityId: r.entity_id, entityType: r.entity_type, action: r.action, summary: r.summary, changes: r.changes ? JSON.parse(r.changes) : undefined }));
  }

  /** After an account is deleted, its name no longer appears in the trail. */
  anonymiseActor(actorId: string, label = 'Former member') {
    this.db.prepare('UPDATE activity SET actor = ?, actor_id = NULL WHERE actor_id = ?').run(label, actorId);
  }

  activity(opts: { entityId?: string; limit?: number } = {}): Activity[] {
    const limit = Math.min(500, opts.limit ?? 100);
    const rows = (opts.entityId
      ? this.db.prepare('SELECT * FROM activity WHERE entity_id = ? ORDER BY id DESC LIMIT ?').all(opts.entityId, limit)
      : this.db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT ?').all(limit)) as any[];
    return rows.map((r) => ({ id: r.id, at: r.at, actor: r.actor, actorId: r.actor_id ?? undefined, entityId: r.entity_id, entityType: r.entity_type, action: r.action, summary: r.summary, changes: r.changes ? JSON.parse(r.changes) : undefined }));
  }

  getSetting(key: string): unknown {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : undefined;
  }

  /**
   * Check values against this workspace's own fields and types (Settings → Workspace). Forms,
   * the API, batches and MCP go through here; quick capture doesn't, so it never blocks on them.
   */
  checkCustom(type: string, data: Record<string, unknown>, changed?: string[]): void {
    const errors = validateCustom(type, data, this.settings().custom as Customisation | undefined, changed);
    if (errors.length) throw new ValidationError(errors);
  }

  settings(): Settings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const out: Record<string, unknown> = { workspaceName: 'My workspace', productName: 'My product', currency: '$' };
    for (const r of rows) out[r.key] = JSON.parse(r.value);
    return out as Settings;
  }

  setSettings(patch: Record<string, unknown>) {
    const stmt = this.db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [k, v] of Object.entries(patch)) stmt.run(k, JSON.stringify(v));
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /** Wipe all entities and activity. */
  clear() {
    this.db.exec('DELETE FROM entities; DELETE FROM activity; DELETE FROM counters;');
  }

  exportAll(): { version: 1; exportedAt: string; settings: Settings; entities: Entity[] } {
    return { version: 1, exportedAt: new Date().toISOString(), settings: this.settings(), entities: this.all() };
  }

  importAll(dump: { settings?: Record<string, unknown>; entities: Entity[] }, actor: Actor = 'import') {
    this.transaction(() => {
      this.clear();
      if (dump.settings) {
        const { captureToken: _t, ...rest } = dump.settings;
        this.setSettings(rest);
      }
      for (const e of dump.entities) {
        const { id, type, createdAt, updatedAt: _u, ...data } = e;
        this.db.prepare('INSERT INTO entities(id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, type, JSON.stringify(data), createdAt, createdAt);
        const def = ENTITY_MAP[type];
        if (def?.keyPrefix && typeof data.key === 'string') {
          const n = Number(String(data.key).split('-').pop());
          if (n) this.db.prepare('INSERT INTO counters(prefix, n) VALUES (?, ?) ON CONFLICT(prefix) DO UPDATE SET n = MAX(n, excluded.n)').run(def.keyPrefix, n);
        }
      }
      this.db.prepare('INSERT INTO activity(at, actor, entity_id, entity_type, action, summary) VALUES (?, ?, ?, ?, ?, ?)').run(new Date().toISOString(), actorName(actor), '-', 'workspace', 'create', `Imported ${dump.entities.length} entities`);
    });
  }
}

function rowToEntity(r: any): Entity {
  return { id: r.id, type: r.type, createdAt: r.created_at, updatedAt: r.updated_at, ...JSON.parse(r.data) };
}

function titleFor(e: Entity): string {
  const def = ENTITY_MAP[e.type];
  const t = String(e[def?.titleField ?? 'title'] ?? '');
  return t.length > 60 ? `${t.slice(0, 59)}…` : t;
}

function compact(v: unknown): unknown {
  if (typeof v === 'string' && v.length > 200) return `${v.slice(0, 199)}…`;
  if (Array.isArray(v) && JSON.stringify(v).length > 300) return `[${v.length} items]`;
  if (v && typeof v === 'object' && JSON.stringify(v).length > 300) return '{…}';
  return v;
}

/** Coerce form values (strings from inputs) to schema types and derive computed fields. */
function normalize(type: string, data: Record<string, unknown>) {
  const def = ENTITY_MAP[type];
  for (const f of def.fields) {
    const v = data[f.key];
    if (v === undefined) continue;
    if (['number', 'scale', 'percent', 'money'].includes(f.kind) && typeof v === 'string') {
      if (v.trim() === '') delete data[f.key];
      else data[f.key] = Number(v);
    }
    if (f.kind === 'date' && typeof v === 'string') {
      if (!v.trim()) delete data[f.key];
      else data[f.key] = v.slice(0, 10);
    }
    if (f.kind === 'ref' && v === '') delete data[f.key];
    if ((f.kind === 'refs' || f.kind === 'tags') && typeof v === 'string') data[f.key] = v.split(',').map((x) => x.trim()).filter(Boolean);
    if (f.kind === 'bool' && typeof v === 'string') data[f.key] = v === 'true';
  }
  if (type === 'approval') data.status = approvalStatus((data.approvers ?? []) as Approver[]);
}
