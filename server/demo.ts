import type { Role, SystemDB, User, Persona } from './system.ts';
import type { Workspaces } from './workspaces.ts';

/**
 * Demo accounts for the sample workspace. They can sign in with one click from
 * the sign-in page while demo mode is on: by default only under `npm run dev`
 * (TL_DEMO=1 turns it on elsewhere). With demo mode off, demo accounts cannot
 * sign in at all. The shared password below is a test value for local evaluation only.
 */
export const DEMO_PASSWORD = 'servicehub-demo-2026';
export const DEMO_WORKSPACE_ID = 'ws_demo';

const DEMO_USERS: { alias: string; name: string; email: string; title: string; role: Role; persona: Persona }[] = [
  { alias: 'me', name: 'Alex Rivera', email: 'alex.rivera@ashgrove.example', title: 'Product Owner, Employee IT Services', role: 'owner', persona: 'po' },
  { alias: 'jordan', name: 'Jordan Kim', email: 'jordan.kim@ashgrove.example', title: 'Business Analyst, Identity & Access', role: 'editor', persona: 'ba' },
  { alias: 'priya', name: 'Priya Nair', email: 'priya.nair@ashgrove.example', title: 'Engineering Lead, Identity & Access', role: 'editor', persona: 'both' },
  { alias: 'dana', name: 'Dana Whitfield', email: 'dana.whitfield@ashgrove.example', title: 'Chief Information Security Officer', role: 'viewer', persona: 'both' },
  { alias: 'kim', name: 'Kim Lee', email: 'kim.lee@ashgrove.example', title: 'Internal Audit Manager', role: 'viewer', persona: 'both' },
];

export const demoEnabled = () => process.env.TL_DEMO === '1';

/** Installs created before the sample company was renamed keep their demo accounts. */
function migrateDemoEmails(sys: SystemDB) {
  for (const u of DEMO_USERS) {
    const old = sys.userByEmail(u.email.replace('@ashgrove.example', '@northwind.example'));
    if (old && !sys.userByEmail(u.email)) sys.changeEmail(old.id, u.email);
  }
}

/** Create the demo workspace and accounts on a fresh install. */
export function ensureDemo(sys: SystemDB, workspaces: Workspaces) {
  migrateDemoEmails(sys);
  if (!demoEnabled() || sys.workspace(DEMO_WORKSPACE_ID) || sys.countWorkspaces() > 0) return;
  const users: Record<string, User> = {};
  for (const u of DEMO_USERS) {
    users[u.alias] = sys.userByEmail(u.email) ?? sys.createUser({ email: u.email, name: u.name, title: u.title, password: DEMO_PASSWORD, demo: true, prefs: { persona: u.persona } });
  }
  const ws = workspaces.create({
    id: DEMO_WORKSPACE_ID, name: 'ServiceHub (demo)', kind: 'team', owner: users.me, sample: 'it', demo: true,
    people: { me: users.me, users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, v.id])) },
  });
  for (const u of DEMO_USERS.filter((x) => x.alias !== 'me')) {
    sys.addMember(ws.id, users[u.alias].id, u.role);
    workspaces.linkMember(ws.id, users[u.alias]);
  }
  // The BA works in the Identity & Access team.
  const store = workspaces.store(ws.id);
  const team = store.get('team_iam');
  if (team) store.update(team.id, { memberUserIds: [...new Set([...(team.memberUserIds ?? []), users.jordan.id])] }, 'system');
  console.log('Created the ServiceHub demo workspace with 5 demo accounts.');
}

/** Put the demo workspace back to its original content (accounts and access are kept). */
export function resetDemo(sys: SystemDB, workspaces: Workspaces): boolean {
  if (!sys.workspace(DEMO_WORKSPACE_ID)) return false;
  migrateDemoEmails(sys);
  const users: Record<string, string> = {};
  for (const u of DEMO_USERS) { const x = sys.userByEmail(u.email); if (x) users[u.alias] = x.id; }
  const me = sys.userByEmail(DEMO_USERS[0].email);
  if (!me) return false;
  const store = workspaces.store(DEMO_WORKSPACE_ID);
  workspaces.fill(store, 'it', 'ServiceHub (demo)', { me, users });
  for (const m of sys.members(DEMO_WORKSPACE_ID)) workspaces.linkMember(DEMO_WORKSPACE_ID, m.user);
  const team = store.get('team_iam');
  if (team && users.jordan) store.update(team.id, { memberUserIds: [...new Set([...(team.memberUserIds ?? []), users.jordan])] }, 'system');
  return true;
}
