import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// System database: everything that is not workspace content — people's
// accounts, sessions, workspaces and who can access them, invites, API tokens
// and per-workspace AI settings.

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';
export const ROLES: Role[] = ['owner', 'admin', 'editor', 'viewer'];
export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };
export type Persona = 'po' | 'ba' | 'both';

export interface Prefs {
  persona?: Persona;
  pinned?: string[];
  dismissedGuides?: string[];
  [k: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  name: string;
  title?: string;
  status: 'active' | 'disabled';
  demo: boolean;
  createdAt: string;
  prefs: Prefs;
}

export interface Workspace {
  id: string;
  name: string;
  kind: 'personal' | 'team';
  demo: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Membership { workspaceId: string; userId: string; role: Role; joinedAt: string }

export interface Invite {
  id: string;
  workspaceId: string;
  email: string;
  role: Role;
  teamIds: string[];
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revoked: boolean;
}

export interface ApiToken {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  scope: 'read' | 'write';
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export type AiProvider = 'none' | 'anthropic' | 'openai-compatible';
export interface AiConfig { provider: AiProvider; model?: string; baseUrl?: string; apiKey?: string }

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${randomBytes(9).toString('base64url')}`;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, actual);
}

export function validatePassword(password: string): string | null {
  if (typeof password !== 'string' || password.length < 10) return 'Use at least 10 characters.';
  if (password.length > 200) return 'That password is too long.';
  return null;
}

export function normalizeEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export class SystemDB {
  private db: DatabaseSync;
  private key: Buffer;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(join(dataDir, 'system.db'));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, title TEXT, pw_hash TEXT,
        status TEXT NOT NULL DEFAULT 'active', demo INTEGER NOT NULL DEFAULT 0, prefs TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, created_by TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS memberships (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id), user_id TEXT NOT NULL REFERENCES users(id),
        role TEXT NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY (workspace_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT,
        created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), email TEXT NOT NULL, role TEXT NOT NULL,
        team_ids TEXT NOT NULL DEFAULT '[]', token_hash TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL, accepted_at TEXT, accepted_by TEXT, revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        name TEXT NOT NULL, scope TEXT NOT NULL, prefix TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL, last_used_at TEXT, revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ai_config (
        workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id), provider TEXT NOT NULL, model TEXT, base_url TEXT, key_enc TEXT,
        updated_at TEXT NOT NULL, updated_by TEXT
      );
    `);
    // Secret used to encrypt provider API keys at rest.
    const keyFile = join(dataDir, 'secret.key');
    if (!existsSync(keyFile)) {
      mkdirSync(dirname(keyFile), { recursive: true });
      writeFileSync(keyFile, randomBytes(32).toString('hex'), { mode: 0o600 });
    }
    this.key = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'hex');
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

  // ---------------- users ----------------

  private rowToUser(r: any): User {
    return { id: r.id, email: r.email, name: r.name, title: r.title ?? undefined, status: r.status, demo: !!r.demo, createdAt: r.created_at, prefs: JSON.parse(r.prefs || '{}') };
  }

  createUser(input: { email: string; name: string; password?: string; title?: string; demo?: boolean; prefs?: Prefs }): User {
    const email = normalizeEmail(input.email);
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (this.userByEmail(email)) throw new Error('An account with this email already exists.');
    const u = { id: id('usr'), created_at: now() };
    this.db.prepare('INSERT INTO users(id, email, name, title, pw_hash, demo, prefs, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(u.id, email, input.name.trim(), input.title ?? null, input.password ? hashPassword(input.password) : null, input.demo ? 1 : 0, JSON.stringify(input.prefs ?? {}), u.created_at);
    return this.user(u.id)!;
  }

  user(userId: string): User | undefined {
    const r = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return r ? this.rowToUser(r) : undefined;
  }

  userByEmail(email: string): User | undefined {
    const r = this.db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email));
    return r ? this.rowToUser(r) : undefined;
  }

  checkPassword(email: string, password: string): User | undefined {
    const r = this.db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) as any;
    if (!r || r.status !== 'active') {
      // Spend the same time as a real check so timing doesn't reveal which emails exist.
      verifyPassword(password, 'scrypt$00000000000000000000000000000000$00');
      return undefined;
    }
    return verifyPassword(password, r.pw_hash) ? this.rowToUser(r) : undefined;
  }

  updateUser(userId: string, patch: { name?: string; title?: string; prefs?: Prefs; status?: 'active' | 'disabled' }) {
    const u = this.user(userId);
    if (!u) return;
    this.db.prepare('UPDATE users SET name = ?, title = ?, prefs = ?, status = ? WHERE id = ?')
      .run(patch.name?.trim() || u.name, patch.title ?? u.title ?? null, JSON.stringify({ ...u.prefs, ...(patch.prefs ?? {}) }), patch.status ?? u.status, userId);
  }

  setPassword(userId: string, password: string) {
    this.db.prepare('UPDATE users SET pw_hash = ? WHERE id = ?').run(hashPassword(password), userId);
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  countUsers(opts: { includeDemo?: boolean } = {}): number {
    const r = this.db.prepare(`SELECT COUNT(*) AS n FROM users ${opts.includeDemo ? '' : 'WHERE demo = 0'}`).get() as { n: number };
    return r.n;
  }

  demoUsers(): (User & { role?: Role })[] {
    const rows = this.db.prepare(`
      SELECT u.*, m.role AS role FROM users u
      LEFT JOIN memberships m ON m.user_id = u.id
      LEFT JOIN workspaces w ON w.id = m.workspace_id
      WHERE u.demo = 1 AND w.demo = 1 AND w.archived = 0 ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END, u.name`).all() as any[];
    return rows.map((r) => ({ ...this.rowToUser(r), role: r.role }));
  }

  // ---------------- workspaces & memberships ----------------

  private rowToWorkspace(r: any): Workspace {
    return { id: r.id, name: r.name, kind: r.kind, demo: !!r.demo, createdAt: r.created_at, createdBy: r.created_by };
  }

  createWorkspace(input: { name: string; kind: 'personal' | 'team'; createdBy: string; demo?: boolean; id?: string }): Workspace {
    const w = { id: input.id ?? id('ws'), created_at: now() };
    this.db.prepare('INSERT INTO workspaces(id, name, kind, demo, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(w.id, input.name.trim(), input.kind, input.demo ? 1 : 0, w.created_at, input.createdBy);
    return this.workspace(w.id)!;
  }

  workspace(workspaceId: string): Workspace | undefined {
    const r = this.db.prepare('SELECT * FROM workspaces WHERE id = ? AND archived = 0').get(workspaceId);
    return r ? this.rowToWorkspace(r) : undefined;
  }

  countWorkspaces(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM workspaces WHERE archived = 0').get() as { n: number }).n;
  }

  renameWorkspace(workspaceId: string, name: string) {
    this.db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(name.trim(), workspaceId);
  }

  archiveWorkspace(workspaceId: string) {
    this.db.prepare('UPDATE workspaces SET archived = 1 WHERE id = ?').run(workspaceId);
    this.db.prepare('DELETE FROM sessions WHERE workspace_id = ?').run(workspaceId);
  }

  addMember(workspaceId: string, userId: string, role: Role) {
    this.db.prepare('INSERT INTO memberships(workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?) ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role')
      .run(workspaceId, userId, role, now());
  }

  setRole(workspaceId: string, userId: string, role: Role) {
    this.db.prepare('UPDATE memberships SET role = ? WHERE workspace_id = ? AND user_id = ?').run(role, workspaceId, userId);
  }

  removeMember(workspaceId: string, userId: string) {
    this.db.prepare('DELETE FROM memberships WHERE workspace_id = ? AND user_id = ?').run(workspaceId, userId);
    this.db.prepare('DELETE FROM tokens WHERE workspace_id = ? AND user_id = ?').run(workspaceId, userId);
  }

  membership(workspaceId: string, userId: string): Membership | undefined {
    const r = this.db.prepare('SELECT * FROM memberships WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userId) as any;
    return r ? { workspaceId: r.workspace_id, userId: r.user_id, role: r.role, joinedAt: r.joined_at } : undefined;
  }

  workspacesOf(userId: string): (Workspace & { role: Role })[] {
    const rows = this.db.prepare(`SELECT w.*, m.role FROM workspaces w JOIN memberships m ON m.workspace_id = w.id
      WHERE m.user_id = ? AND w.archived = 0 ORDER BY CASE w.kind WHEN 'personal' THEN 0 ELSE 1 END, w.created_at`).all(userId) as any[];
    return rows.map((r) => ({ ...this.rowToWorkspace(r), role: r.role }));
  }

  members(workspaceId: string): (Membership & { user: User })[] {
    const rows = this.db.prepare(`SELECT m.*, u.id AS uid, u.email, u.name, u.title, u.status, u.demo, u.prefs, u.created_at AS ucreated FROM memberships m
      JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END, u.name`).all(workspaceId) as any[];
    return rows.map((r) => ({
      workspaceId: r.workspace_id, userId: r.user_id, role: r.role, joinedAt: r.joined_at,
      user: { id: r.uid, email: r.email, name: r.name, title: r.title ?? undefined, status: r.status, demo: !!r.demo, createdAt: r.ucreated, prefs: {} },
    }));
  }

  owners(workspaceId: string): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ? AND role = 'owner'").get(workspaceId) as { n: number }).n;
  }

  // ---------------- sessions ----------------

  createSession(userId: string, workspaceId: string | undefined, days = 30): string {
    const token = randomBytes(32).toString('base64url');
    const t = now();
    const expires = new Date(Date.now() + days * 86_400_000).toISOString();
    this.db.prepare('INSERT INTO sessions(id_hash, user_id, workspace_id, created_at, expires_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sha256(token), userId, workspaceId ?? null, t, expires, t);
    return token;
  }

  session(token: string): { userId: string; workspaceId?: string; idHash: string } | undefined {
    const h = sha256(token);
    const r = this.db.prepare('SELECT * FROM sessions WHERE id_hash = ?').get(h) as any;
    if (!r) return undefined;
    if (r.expires_at < now()) {
      this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(h);
      return undefined;
    }
    // Touch at most once a minute.
    if (Date.now() - Date.parse(r.last_seen) > 60_000) this.db.prepare('UPDATE sessions SET last_seen = ? WHERE id_hash = ?').run(now(), h);
    return { userId: r.user_id, workspaceId: r.workspace_id ?? undefined, idHash: h };
  }

  setSessionWorkspace(idHash: string, workspaceId: string) {
    this.db.prepare('UPDATE sessions SET workspace_id = ? WHERE id_hash = ?').run(workspaceId, idHash);
  }

  deleteSession(idHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(idHash);
  }

  // ---------------- invites ----------------

  private rowToInvite(r: any): Invite {
    return { id: r.id, workspaceId: r.workspace_id, email: r.email, role: r.role, teamIds: JSON.parse(r.team_ids || '[]'), createdBy: r.created_by, createdAt: r.created_at, expiresAt: r.expires_at, acceptedAt: r.accepted_at ?? undefined, revoked: !!r.revoked };
  }

  createInvite(input: { workspaceId: string; email: string; role: Role; teamIds?: string[]; createdBy: string; days?: number }): { invite: Invite; token: string } {
    const email = normalizeEmail(input.email);
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    // Replace any open invite for the same email.
    this.db.prepare('UPDATE invites SET revoked = 1 WHERE workspace_id = ? AND email = ? AND accepted_at IS NULL').run(input.workspaceId, email);
    const token = randomBytes(24).toString('base64url');
    const inv = { id: id('inv'), created_at: now(), expires_at: new Date(Date.now() + (input.days ?? 14) * 86_400_000).toISOString() };
    this.db.prepare('INSERT INTO invites(id, workspace_id, email, role, team_ids, token_hash, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(inv.id, input.workspaceId, email, input.role, JSON.stringify(input.teamIds ?? []), sha256(token), input.createdBy, inv.created_at, inv.expires_at);
    return { invite: this.rowToInvite(this.db.prepare('SELECT * FROM invites WHERE id = ?').get(inv.id)), token };
  }

  inviteByToken(token: string): Invite | undefined {
    const r = this.db.prepare('SELECT * FROM invites WHERE token_hash = ?').get(sha256(token));
    return r ? this.rowToInvite(r) : undefined;
  }

  invites(workspaceId: string): Invite[] {
    return (this.db.prepare('SELECT * FROM invites WHERE workspace_id = ? AND revoked = 0 AND accepted_at IS NULL ORDER BY created_at DESC').all(workspaceId) as any[]).map((r) => this.rowToInvite(r));
  }

  revokeInvite(workspaceId: string, inviteId: string) {
    this.db.prepare('UPDATE invites SET revoked = 1 WHERE id = ? AND workspace_id = ?').run(inviteId, workspaceId);
  }

  markInviteAccepted(inviteId: string, userId: string) {
    this.db.prepare('UPDATE invites SET accepted_at = ?, accepted_by = ? WHERE id = ?').run(now(), userId, inviteId);
  }

  // ---------------- API tokens ----------------

  createToken(input: { userId: string; workspaceId: string; name: string; scope: 'read' | 'write' }): { token: string; record: ApiToken } {
    const secret = randomBytes(24).toString('base64url');
    const prefix = randomBytes(4).toString('hex');
    const token = `tl_${prefix}_${secret}`;
    const t = { id: id('tok'), created_at: now() };
    this.db.prepare('INSERT INTO tokens(id, user_id, workspace_id, name, scope, prefix, token_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(t.id, input.userId, input.workspaceId, input.name.trim() || 'Token', input.scope, prefix, sha256(token), t.created_at);
    return { token, record: this.tokens(input.userId).find((x) => x.id === t.id)! };
  }

  tokens(userId: string): ApiToken[] {
    return (this.db.prepare('SELECT * FROM tokens WHERE user_id = ? AND revoked = 0 ORDER BY created_at DESC').all(userId) as any[])
      .map((r) => ({ id: r.id, userId: r.user_id, workspaceId: r.workspace_id, name: r.name, scope: r.scope, prefix: r.prefix, createdAt: r.created_at, lastUsedAt: r.last_used_at ?? undefined }));
  }

  revokeToken(userId: string, tokenId: string) {
    this.db.prepare('UPDATE tokens SET revoked = 1 WHERE id = ? AND user_id = ?').run(tokenId, userId);
  }

  resolveToken(token: string): { userId: string; workspaceId: string; scope: 'read' | 'write'; id: string } | undefined {
    const r = this.db.prepare('SELECT * FROM tokens WHERE token_hash = ? AND revoked = 0').get(sha256(token)) as any;
    if (!r) return undefined;
    if (!r.last_used_at || Date.now() - Date.parse(r.last_used_at) > 60_000) this.db.prepare('UPDATE tokens SET last_used_at = ? WHERE id = ?').run(now(), r.id);
    return { userId: r.user_id, workspaceId: r.workspace_id, scope: r.scope, id: r.id };
  }

  // ---------------- AI provider settings ----------------

  private encrypt(plain: string): string {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return [iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
  }

  private decrypt(blob: string): string {
    const [iv, tag, data] = blob.split('.').map((x) => Buffer.from(x, 'base64'));
    const d = createDecipheriv('aes-256-gcm', this.key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
  }

  aiConfig(workspaceId: string): AiConfig | undefined {
    const r = this.db.prepare('SELECT * FROM ai_config WHERE workspace_id = ?').get(workspaceId) as any;
    if (!r) return undefined;
    let apiKey: string | undefined;
    try { apiKey = r.key_enc ? this.decrypt(r.key_enc) : undefined; } catch { apiKey = undefined; }
    return { provider: r.provider, model: r.model ?? undefined, baseUrl: r.base_url ?? undefined, apiKey };
  }

  setAiConfig(workspaceId: string, cfg: { provider: AiProvider; model?: string; baseUrl?: string; apiKey?: string | null }, by: string) {
    const current = this.db.prepare('SELECT key_enc FROM ai_config WHERE workspace_id = ?').get(workspaceId) as any;
    // apiKey: undefined = keep, null/'' = clear, string = replace.
    const keyEnc = cfg.apiKey === undefined ? current?.key_enc ?? null : cfg.apiKey ? this.encrypt(cfg.apiKey) : null;
    this.db.prepare(`INSERT INTO ai_config(workspace_id, provider, model, base_url, key_enc, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id) DO UPDATE SET provider = excluded.provider, model = excluded.model, base_url = excluded.base_url, key_enc = excluded.key_enc, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .run(workspaceId, cfg.provider, cfg.model || null, cfg.baseUrl || null, keyEnc, now(), by);
  }
}
