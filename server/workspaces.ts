import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from './db.ts';
import { seedWorkspace, type SeedPeople } from './seed.ts';
import { seedPaymentsWorkspace } from './seed-payments.ts';
import type { SystemDB, User, Workspace } from './system.ts';

/** it = internal IT product (ServiceHub), saas = customer-facing SaaS (Ledgerly). */
export type Sample = 'it' | 'saas' | 'empty';

/** Opens and caches one SQLite store per workspace. */
export class Workspaces {
  private stores = new Map<string, Store>();
  readonly sys: SystemDB;
  private dir: string;

  constructor(sys: SystemDB, dataDir: string) {
    this.sys = sys;
    this.dir = join(dataDir, 'workspaces');
    mkdirSync(this.dir, { recursive: true });
  }

  store(workspaceId: string): Store {
    let s = this.stores.get(workspaceId);
    if (!s) {
      s = new Store(join(this.dir, `${workspaceId}.db`));
      this.stores.set(workspaceId, s);
    }
    return s;
  }

  /** Create a workspace, make `owner` its owner, optionally fill it with the IT sample. */
  create(input: { name: string; kind: 'personal' | 'team'; owner: User; sample: Sample; demo?: boolean; people?: SeedPeople; id?: string }): Workspace {
    const ws = this.sys.createWorkspace({ name: input.name, kind: input.kind, createdBy: input.owner.id, demo: input.demo, id: input.id });
    this.sys.addMember(ws.id, input.owner.id, 'owner');
    const store = this.store(ws.id);
    this.fill(store, input.sample, input.name, input.people ?? { me: input.owner });
    this.linkMember(ws.id, input.owner);
    return ws;
  }

  /** Replace a workspace's content with the sample or nothing. */
  fill(store: Store, sample: Sample, name: string, people: SeedPeople) {
    store.clear();
    if (sample === 'it') seedWorkspace(store, new Date(), people);
    else if (sample === 'saas') seedPaymentsWorkspace(store, new Date(), people);
    else store.setSettings({ workspaceName: name, productName: name, currency: '$' });
  }

  /**
   * Make sure the member has a stakeholder record in the workspace, so "me"
   * works in every view: link by user id, then by email, else create one.
   */
  linkMember(workspaceId: string, user: User) {
    const store = this.store(workspaceId);
    const people = store.byType('stakeholder');
    if (people.some((s) => s.userId === user.id)) return;
    const byEmail = people.find((s) => String(s.email ?? '').toLowerCase() === user.email);
    if (byEmail) {
      store.update(byEmail.id, { userId: user.id }, 'system');
      return;
    }
    store.create('stakeholder', {
      name: user.name, email: user.email, title: user.title, kind: 'internal', userId: user.id,
      power: 3, interest: 4, currentEngagement: 'supportive', desiredEngagement: 'supportive',
    }, 'system');
  }

  /** Archive: the workspace disappears for everyone; the data file is kept. */
  archive(ws: Workspace) {
    this.sys.archiveWorkspace(ws.id);
    const file = join(this.dir, `${ws.id}.db`);
    this.stores.get(ws.id)?.close();
    this.stores.delete(ws.id);
    const archive = join(this.dir, '..', 'archive');
    mkdirSync(archive, { recursive: true });
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(file + suffix)) renameSync(file + suffix, join(archive, `${ws.id}.db${suffix}`));
    }
  }
}
