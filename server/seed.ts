import type { Store } from './db.ts';
import { addDays, seededRandom } from '../core/util.ts';

/** Who the sample is for: "me" becomes the product owner; demo users map to people in the story. */
export interface SeedPeople {
  me: { id: string; name: string; email: string; title?: string };
  /** Stakeholder alias → user id, for demo accounts that play roles in the sample. */
  users?: Record<string, string>;
}

/**
 * IT sample workspace: "ServiceHub", the employee IT portal of the fictional
 * Ashgrove Group (1,900 employees). The product team automates the identity
 * lifecycle (joiner–mover–leaver), password self-service and access requests,
 * under SOX audit pressure. All names are fictional; dates are relative to `now`.
 */
export function seedWorkspace(store: Store, now: Date, people: SeedPeople) {
  const d = (n: number) => addDays(now, n);
  const ts = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  const put = (id: string, type: string, data: Record<string, unknown>, createdDaysAgo = 30) =>
    store.create(type, data, 'seed', { id, createdAt: ts(createdDaysAgo), skipActivity: true });
  const uid = (alias: string) => people.users?.[alias];

  store.transaction(() => {
    store.setSettings({
      workspaceName: 'ServiceHub', productName: 'ServiceHub', currency: '$',
      ourCapabilities: { 'Self-service portal': 2, 'Access requests & approvals': 1, 'Workflow automation': 2, 'Knowledge deflection': 1, 'Asset management (CMDB)': 1, 'Identity governance': 1 },
    });

    // ---------------- People ----------------
    const S = (id: string, data: Record<string, unknown>) => put(`stk_${id}`, 'stakeholder', { kind: 'internal', ...data }, 200);
    S('me', { name: people.me.name, email: people.me.email, title: people.me.title ?? 'Product Owner, Employee IT Services', orgUnit: 'IT — Digital Workplace', power: 3, interest: 5, legitimacy: true, currentEngagement: 'leading', desiredEngagement: 'leading', preferredChannel: 'teams', userId: people.me.id });
    S('morgan', { name: 'Morgan Blake', title: 'Chief Information Officer', orgUnit: 'IT leadership', power: 5, interest: 3, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Cut IT cost per employee by 10%\nA clean SOX ITGC audit\nIT seen as an enabler, not a blocker', concerns: 'Onboarding complaints reaching the exec team', preferredChannel: 'meeting', influencedBy: ['stk_dana'] });
    S('dana', { name: 'Dana Whitfield', title: 'Chief Information Security Officer', orgUnit: 'Security', email: 'dana.whitfield@ashgrove.example', power: 5, interest: 5, legitimacy: true, urgency: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Least-privilege access everywhere\nMFA on every account\nNo orphaned accounts', concerns: 'Managers approving access they don\'t understand\nSMS codes are phishable', preferredChannel: 'async-doc', influencedBy: ['stk_kim'], userId: uid('dana') });
    S('priya', { name: 'Priya Nair', title: 'Engineering Lead, Identity & Access', orgUnit: 'IT — Identity & Access', email: 'priya.nair@ashgrove.example', power: 4, interest: 5, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Retire the legacy LDAP scripts\nSustainable on-call', concerns: 'Workday data quality\nScope creep after commitment', preferredChannel: 'teams', influencedBy: ['stk_marcus'], userId: uid('priya') });
    S('tomas', { name: 'Tomás Herrera', title: 'Service Desk Manager', orgUnit: 'IT — Service Desk', email: 'tomas.herrera@ashgrove.example', power: 3, interest: 5, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'supportive', goals: 'Fewer password tickets\nAgents working on real problems', concerns: 'Hearing about releases from users first', preferredChannel: 'teams', userId: uid('tomas') });
    S('grace', { name: 'Grace Okoye', title: 'Infrastructure & Endpoint Manager', orgUnit: 'IT — Infrastructure', power: 4, interest: 4, legitimacy: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Zero-touch laptop provisioning', concerns: 'Autopilot profiles are owned by a different team', preferredChannel: 'meeting' });
    S('hannah', { name: 'Hannah Lee', title: 'HR Operations Director', orgUnit: 'HR', power: 4, interest: 4, legitimacy: true, urgency: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Great first week for every hire\nStop re-keying data into IT forms', concerns: 'HR gets blamed for wrong access caused by bad job codes', preferredChannel: 'meeting', influencedBy: ['stk_morgan'] });
    S('daniel', { name: 'Daniel Brooks', title: 'VP Sales', orgUnit: 'Sales', power: 5, interest: 4, legitimacy: true, urgency: true, currentEngagement: 'resistant', desiredEngagement: 'supportive', goals: '120 new reps selling from week one in January', concerns: 'New reps lose three days waiting for laptops and logins\nIT dates keep slipping', preferredChannel: 'phone', influencedBy: ['stk_morgan'] });
    S('elena', { name: 'Elena Petrova', title: 'Data Protection Officer', orgUnit: 'Legal & Compliance', power: 4, interest: 2, legitimacy: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Data minimisation for leavers', concerns: 'Leaver mailboxes kept longer than needed (GDPR)', preferredChannel: 'email' });
    S('kim', { name: 'Kim Lee', title: 'Internal Audit Manager', orgUnit: 'Internal Audit', email: 'kim.lee@ashgrove.example', power: 4, interest: 3, legitimacy: true, urgency: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'SOX ITGC evidence on time', concerns: '37 orphaned accounts found last quarter\nAccess reviews done in spreadsheets', preferredChannel: 'email', userId: uid('kim') });
    S('marcus', { name: 'Marcus Feld', title: 'Enterprise Architect', orgUnit: 'IT — Architecture', power: 3, interest: 4, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'One identity platform, no point-to-point scripts', preferredChannel: 'async-doc' });
    S('sofia', { name: 'Sofia Rossi', title: 'Finance Controller', orgUnit: 'Finance', power: 3, interest: 3, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Fewer unused SaaS licences', preferredChannel: 'email' });
    S('lucas', { name: 'Lucas Fernández', title: 'Data & Analytics Lead', orgUnit: 'IT — Data', power: 2, interest: 4, currentEngagement: 'supportive', desiredEngagement: 'supportive', goals: 'Every bet has a tracking plan', preferredChannel: 'teams' });
    S('aisha', { name: 'Aisha Rahman', title: 'UX Designer', orgUnit: 'IT — Digital Workplace', power: 2, interest: 5, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Research with frontline staff, not just office workers', preferredChannel: 'meeting' });
    S('raj', { name: 'Raj Patel', title: 'Account Manager', orgUnit: 'Keyline Identity (vendor)', account: 'Keyline Identity', kind: 'vendor', power: 3, interest: 3, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Renew the IAM licence in March', preferredChannel: 'email' });
    S('olivia', { name: 'Olivia Hart', title: 'Warehouse Operations Manager', orgUnit: 'Warehouse Ops', power: 2, interest: 5, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Shift starts on time — nobody locked out of a scanner', concerns: '680 frontline staff share devices and have no company phone', preferredChannel: 'meeting' });
    S('noah', { name: 'Noah Williams', title: 'IT Change Manager (CAB chair)', orgUnit: 'IT — Service Management', power: 3, interest: 4, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'No unplanned outages from changes', concerns: 'Automated provisioning changes bypassing CAB', preferredChannel: 'email' });

    // ---------------- Strategy ----------------
    put('vis_main', 'vision', {
      title: 'ServiceHub', horizon: '2027',
      vision: 'Every employee is productive from minute one — and never has to wait on IT.',
      targetGroup: 'All 1,900 Ashgrove employees and contractors; first new hires, frontline warehouse staff and managers.',
      needs: 'Accounts, laptop and access ready on day one\nFix common problems without a ticket\nKnow what is happening with a request',
      product: 'Employee IT portal: identity lifecycle, password self-service, access requests, knowledge and tickets.',
      businessGoals: 'Day-one productivity for 600 hires a year\n40% fewer service desk tickets\nClean SOX ITGC audit',
    }, 300);
    put('team_iam', 'team', { name: 'Identity & Access', people: 6, capacity: 72, targetFeature: 60, targetDebt: 25, targetMaintenance: 15, leadId: 'stk_priya', memberUserIds: [people.me.id, uid('priya')].filter(Boolean) }, 300);
    put('team_sd', 'team', { name: 'Service Desk Experience', people: 4, capacity: 48, targetFeature: 65, targetDebt: 15, targetMaintenance: 20, leadId: 'stk_tomas', memberUserIds: [people.me.id, uid('tomas')].filter(Boolean) }, 300);
    put('team_plat', 'team', { name: 'Platform & Automation', people: 5, capacity: 60, targetFeature: 40, targetDebt: 40, targetMaintenance: 20, leadId: 'stk_marcus', memberUserIds: [] }, 300);

    put('met_ns', 'metric', { name: 'Time to productive (new hires)', level: 'north-star', definition: 'Hours from the HR start time until the new hire has laptop, accounts and all role access. Median, trailing 30 days.', current: 72, target: 8, unit: 'hours', direction: 'down', source: 'ServiceHub provisioning log + HR start dates', ownerId: 'stk_me' }, 300);
    put('met_access', 'metric', { name: 'Access request lead time', level: 'input', parentId: 'met_ns', definition: 'Median hours from access request to provisioned.', current: 46, target: 4, unit: 'hours', direction: 'down', eventName: 'access_provisioned' }, 300);
    put('met_selfservice', 'metric', { name: 'Self-service resolution rate', level: 'input', definition: '% of issues resolved in the portal without an agent.', current: 34, target: 60, unit: '%', direction: 'up', eventName: 'issue_resolved_self_service', ownerId: 'stk_tomas' }, 300);
    put('met_pwd', 'metric', { name: 'Password reset tickets / month', level: 'output', parentId: 'met_selfservice', definition: 'Service desk tickets categorised "password / lockout".', current: 1450, target: 300, unit: 'tickets', direction: 'down', source: 'ITSM', ownerId: 'stk_tomas' }, 300);
    put('met_tickets', 'metric', { name: 'Tickets per employee per month', level: 'input', definition: 'All service desk tickets ÷ active employees.', current: 1.8, target: 1.0, unit: 'tickets', direction: 'down' }, 300);
    put('met_orphans', 'metric', { name: 'Orphaned accounts', level: 'guardrail', definition: 'Active accounts with no active HR record, at quarter end.', current: 37, target: 0, unit: 'accounts', direction: 'down', ownerId: 'stk_dana' }, 300);
    put('met_cfr', 'metric', { name: 'Change failure rate', level: 'guardrail', definition: '% of production changes causing an incident or rollback.', current: 18, target: 10, unit: '%', direction: 'down', ownerId: 'stk_noah' }, 300);
    put('met_csat', 'metric', { name: 'Employee IT satisfaction', level: 'health', definition: 'Average rating on the post-ticket and quarterly IT survey.', current: 3.6, target: 4.3, unit: '/5', direction: 'up' }, 300);

    put('obj_dayone', 'objective', { title: 'New hires are productive on day one', period: '2026-Q4', pillar: 'Day-one ready', ownerId: 'stk_me', status: 'at-risk', description: '600 hires a year, 120 of them in the January sales cohort.' }, 90);
    put('obj_self', 'objective', { title: 'Employees fix common issues themselves', period: '2026-Q4', pillar: 'Self-service first', ownerId: 'stk_tomas', status: 'on-track' }, 90);
    put('obj_audit', 'objective', { title: 'Pass the SOX ITGC audit without findings', period: '2026-Q4', pillar: 'Trusted access', ownerId: 'stk_dana', status: 'at-risk' }, 90);
    put('kr_ttp', 'keyResult', { title: 'Time to productive from 72h to 24h', objectiveId: 'obj_dayone', metricId: 'met_ns', baseline: 72, target: 24, current: 54, unit: 'hours', dueDate: d(67), confidence: 45 }, 90);
    put('kr_dayone', 'keyResult', { title: '95% of hires have laptop and access on day one', objectiveId: 'obj_dayone', baseline: 40, target: 95, current: 61, unit: '%', dueDate: d(67), confidence: 38 }, 90);
    put('kr_self', 'keyResult', { title: 'Self-service resolution from 34% to 50%', objectiveId: 'obj_self', metricId: 'met_selfservice', baseline: 34, target: 50, current: 38, unit: '%', dueDate: d(67), confidence: 55 }, 90);
    put('kr_pwd', 'keyResult', { title: 'Password reset tickets from 1,450 to 600 a month', objectiveId: 'obj_self', metricId: 'met_pwd', baseline: 1450, target: 600, current: 1210, unit: 'tickets', dueDate: d(67), confidence: 62 }, 90);
    put('kr_reviews', 'keyResult', { title: '100% of quarterly access reviews completed', objectiveId: 'obj_audit', baseline: 60, target: 100, current: 72, unit: '%', dueDate: d(67), confidence: 52 }, 90);
    put('kr_orphans', 'keyResult', { title: 'Zero orphaned accounts at quarter end', objectiveId: 'obj_audit', metricId: 'met_orphans', baseline: 37, target: 0, current: 21, unit: 'accounts', dueDate: d(67), confidence: 35 }, 90);

    put('cmp_snow', 'competitor', { name: 'Stratus ITSM (buy)', positioning: 'Enterprise ITSM + IGA suite — the "buy" option', strengths: 'Mature workflows, CMDB\nIdentity governance add-on', weaknesses: '$1.2M/yr licence quote\n9-month implementation\nHeavy customisation needed for Workday', pricing: 'Per agent + per fulfiller', threat: 4, capabilities: { 'Self-service portal': 3, 'Access requests & approvals': 3, 'Workflow automation': 3, 'Knowledge deflection': 2, 'Asset management (CMDB)': 3, 'Identity governance': 2 } }, 200);
    put('cmp_jsm', 'competitor', { name: 'Trackwell Service Desk', positioning: 'ITSM the engineering org already uses', strengths: 'Cheap, already licensed for Engineering', weaknesses: 'No identity lifecycle\nWeak for frontline staff', pricing: 'Per agent', threat: 3, capabilities: { 'Self-service portal': 2, 'Access requests & approvals': 1, 'Workflow automation': 2, 'Knowledge deflection': 2, 'Asset management (CMDB)': 2, 'Identity governance': 0 } }, 200);
    put('cmp_fresh', 'competitor', { name: 'Breezedesk', positioning: 'Mid-market ITSM, quick to set up', strengths: 'Good portal UX', weaknesses: 'Limited Entra ID / Workday integration', pricing: 'Per agent', threat: 2, capabilities: { 'Self-service portal': 3, 'Access requests & approvals': 2, 'Workflow automation': 2, 'Knowledge deflection': 2, 'Asset management (CMDB)': 2, 'Identity governance': 0 } }, 200);

    put('td_ldap', 'techDebt', { title: 'Legacy LDAP sync scripts (cron, no monitoring)', area: 'Identity', description: '14 bash/PowerShell scripts sync accounts nightly; 3% of users fail silently.', businessImpact: 'Wrong or missing access for new hires; audit cannot trust the logs.', interest: 'high', effort: 8, teamId: 'team_plat', status: 'scheduled' }, 160);
    put('td_chains', 'techDebt', { title: 'Hard-coded approval chains in ITSM workflows', area: 'Workflows', businessImpact: 'Every org change needs a developer; approvals go to people who left.', interest: 'medium', effort: 5, teamId: 'team_iam', status: 'identified' }, 120);
    put('td_testenv', 'techDebt', { title: 'No test environment for the Workday integration', area: 'Integrations', businessImpact: 'Every change is tested on real hires.', interest: 'high', effort: 4, teamId: 'team_plat', status: 'identified' }, 90);
    put('td_e2e', 'techDebt', { title: 'Flaky end-to-end tests (40 min)', area: 'Quality', businessImpact: 'Releases slip a day; people skip the suite.', interest: 'medium', effort: 5, teamId: 'team_plat', status: 'in-progress' }, 60);

    // ---------------- Discover ----------------
    put('per_sam', 'persona', { name: 'Sam, new sales rep', role: 'Joiner', segment: 'Sales', goals: 'Start calling customers in week one', pains: 'No laptop on day one\nMissing CRM access for days', jobs: 'When I start a new job, I want everything to work on day one, so I can make a good first impression.', quote: 'I spent my first three days waiting for logins.' }, 200);
    put('per_maria', 'persona', { name: 'Maria, hiring manager', role: 'Manager', segment: 'All departments', goals: 'New people productive fast', pains: 'Doesn\'t know which access to request\nChases IT by email', jobs: 'When someone joins my team, I want their access sorted without me knowing system names, so I can focus on onboarding them.' }, 200);
    put('per_leo', 'persona', { name: 'Leo, service desk agent', role: 'Agent', segment: 'IT', goals: 'Solve real problems', pains: 'Half the day is password resets and access tickets', jobs: 'When a ticket arrives, I want routine ones to have solved themselves, so I can help people with real issues.' }, 200);
    put('per_kai', 'persona', { name: 'Kai, warehouse associate', role: 'Frontline worker', segment: 'Warehouse Ops', goals: 'Start the shift on time', pains: 'Shared scanner, no company phone, locked out after holidays', jobs: 'When I can\'t sign in at the start of a shift, I want to get back in on the spot, so I don\'t lose pay or hold up my team.' }, 200);

    put('opp_onboard', 'opportunity', { title: 'New hires wait days for laptops, accounts and access', description: 'Average 72 hours to be fully productive; managers chase IT by email.', metricId: 'met_ns', objectiveId: 'obj_dayone', personaIds: ['per_sam', 'per_maria'], status: 'prioritized' }, 150);
    put('opp_access', 'opportunity', { title: 'Access requests bounce between managers and system owners', parentId: 'opp_onboard', metricId: 'met_access', personaIds: ['per_maria'], status: 'prioritized' }, 150);
    put('opp_laptop', 'opportunity', { title: 'Laptops are imaged by hand and arrive late', parentId: 'opp_onboard', personaIds: ['per_sam'], status: 'exploring' }, 150);
    put('opp_password', 'opportunity', { title: 'People get locked out and can\'t get back in without a ticket', metricId: 'met_pwd', objectiveId: 'obj_self', personaIds: ['per_kai', 'per_leo'], status: 'prioritized' }, 150);
    put('opp_kb', 'opportunity', { title: 'People can\'t find answers, so they open tickets', metricId: 'met_selfservice', objectiveId: 'obj_self', personaIds: ['per_leo'], status: 'exploring' }, 150);
    put('opp_audit', 'opportunity', { title: 'Leavers keep access and reviews are done in spreadsheets', metricId: 'met_orphans', objectiveId: 'obj_audit', status: 'prioritized' }, 150);
    put('opp_status', 'opportunity', { title: 'Employees don\'t know what is happening with their request', status: 'parked' }, 150);

    const HEADCOUNT: Record<string, number> = { Sales: 420, Finance: 95, 'Warehouse Ops': 680, Engineering: 310, HR: 40, 'Customer Support': 160, Marketing: 75, Legal: 25, IT: 120 };
    let evN = 0;
    const EV = (title: string, source: string, dept: string | undefined, daysAgo: number, opps: string[], extra: Record<string, unknown> = {}) => {
      evN++;
      const reach = (extra.reach as number | undefined) ?? (dept ? Math.round((HEADCOUNT[dept] ?? 50) * 0.4) : undefined);
      put(`ev_${evN}`, 'evidence', { title, source, account: dept, segment: dept === 'Warehouse Ops' ? 'frontline' : dept ? 'office' : undefined, reach, date: d(-daysAgo), kind: ['analytics', 'monitoring', 'audit'].includes(source) ? 'did' : 'said', opportunityIds: opps, sentiment: -1, ...extra }, daysAgo);
    };
    // Onboarding & access — rising.
    EV('My first three days were spent waiting for logins', 'survey', 'Sales', 3, ['opp_onboard'], { personaId: 'per_sam', sentiment: -2, reach: 120 });
    EV('Laptop arrived on day four; I shadowed a colleague until then', 'interview', 'Sales', 4, ['opp_onboard', 'opp_laptop'], { personaId: 'per_sam', relayedById: 'stk_daniel' });
    EV('Median time to productive for September hires was 72 hours', 'analytics', undefined, 5, ['opp_onboard'], { reach: 58, sentiment: 0, detail: 'Provisioning log joined with Workday start dates, 58 hires.' });
    EV('I emailed IT a list of systems and half of them were missed', 'interview', 'Finance', 6, ['opp_access'], { personaId: 'per_maria' });
    EV('Access requests wait 46 hours on average for system owner approval', 'analytics', undefined, 7, ['opp_access'], { reach: 1900, sentiment: 0 });
    EV('Which access does a new marketing analyst need? Nobody knows', 'support', 'Marketing', 9, ['opp_access'], { personaId: 'per_maria' });
    EV('New support agents can\'t log into Zendesk until day 3', 'support', 'Customer Support', 11, ['opp_onboard', 'opp_access'], { relayedById: 'stk_tomas' });
    EV('HR re-keys every hire into the IT request form', 'interview', 'HR', 12, ['opp_onboard'], { relayedById: 'stk_hannah' });
    EV('38% of onboarding tickets are re-opened for missing access', 'analytics', undefined, 15, ['opp_access'], { reach: 230, sentiment: -1 });
    EV('January sales cohort: 120 reps must sell from week one', 'internal', 'Sales', 18, ['opp_onboard'], { relayedById: 'stk_daniel', sentiment: -1, reach: 120 });
    EV('Imaging a laptop takes 3 hours of engineer time', 'monitoring', 'IT', 22, ['opp_laptop'], { sentiment: 0 });
    EV('Engineers wait a week for production access approvals', 'survey', 'Engineering', 40, ['opp_access']);
    EV('Contractors are set up with personal email addresses', 'audit', 'IT', 45, ['opp_onboard', 'opp_audit'], { relayedById: 'stk_kim' });
    // Passwords & lockouts.
    EV('Password resets are 31% of all service desk tickets', 'analytics', undefined, 6, ['opp_password'], { reach: 1450, sentiment: -1, detail: '1,450 of 4,680 tickets in September.' });
    EV('Locked out after holiday — couldn\'t clock in for 40 minutes', 'interview', 'Warehouse Ops', 8, ['opp_password'], { personaId: 'per_kai', relayedById: 'stk_olivia', sentiment: -2, reach: 680 });
    EV('Frontline staff have no company phone for MFA', 'interview', 'Warehouse Ops', 14, ['opp_password'], { relayedById: 'stk_olivia', reach: 680 });
    EV('Average wait for a password reset is 4 hours', 'monitoring', undefined, 20, ['opp_password'], { reach: 1450 });
    EV('Monday mornings: 300 lockout calls before 9am', 'support', 'IT', 26, ['opp_password'], { relayedById: 'stk_tomas' });
    EV('I reset my password every 90 days and forget it every time', 'survey', 'Finance', 31, ['opp_password'], { sentiment: -1 });
    EV('Self-service reset pilot: 72% of resets completed without help', 'analytics', undefined, 33, ['opp_password'], { sentiment: 1, reach: 150 });
    // Knowledge.
    EV('I didn\'t know there was a VPN guide, so I opened a ticket', 'survey', 'Marketing', 10, ['opp_kb']);
    EV('Portal search returns 0 results for "printer" and "VPN"', 'analytics', undefined, 16, ['opp_kb'], { reach: 900, sentiment: -1 });
    EV('Agents answer the same 20 questions every week', 'interview', 'IT', 28, ['opp_kb'], { personaId: 'per_leo', relayedById: 'stk_tomas' });
    EV('The chatbot never understands my question', 'survey', 'Customer Support', 36, ['opp_kb'], { sentiment: -2 });
    EV('Knowledge articles are 2+ years old', 'audit', 'IT', 50, ['opp_kb']);
    // Audit & leavers.
    EV('37 orphaned accounts found in the Q3 access review', 'audit', 'IT', 24, ['opp_audit'], { relayedById: 'stk_kim', sentiment: -2, reach: 37 });
    EV('Access reviews are 40 spreadsheets emailed to managers', 'interview', 'Finance', 30, ['opp_audit'], { relayedById: 'stk_kim' });
    EV('A leaver still had VPN access 11 days after leaving', 'audit', 'Sales', 34, ['opp_audit'], { sentiment: -2, reach: 1 });
    EV('Movers keep access from their old role for months', 'audit', 'Finance', 42, ['opp_audit']);
    EV('Managers rubber-stamp access reviews they don\'t understand', 'interview', 'IT', 55, ['opp_audit'], { relayedById: 'stk_dana' });
    // Status visibility.
    EV('No idea where my laptop request is', 'survey', 'Engineering', 19, ['opp_status']);
    EV('I chase the service desk on Teams to get updates', 'survey', 'HR', 38, ['opp_status']);
    // Recent, unlinked.
    EV('Can new hires get a welcome checklist in Teams?', 'internal', 'HR', 2, [], { relayedById: 'stk_hannah', sentiment: 0 });
    EV('Shared scanners need a quick PIN sign-in', 'interview', 'Warehouse Ops', 2, [], { relayedById: 'stk_olivia', sentiment: 0, reach: 680 });
    EV('Please add Okta-style app tiles for all SaaS tools', 'survey', 'Marketing', 1, [], { sentiment: 0 });
    EV('Request: dark mode for the portal', 'survey', 'Engineering', 3, [], { sentiment: 0, reach: 12 });

    // ---------------- Bets ----------------
    put('bet_jml', 'bet', {
      title: 'Automated joiner–mover–leaver access',
      hypothesis: 'We believe granting role-based access automatically from HR events for new hires and movers will cut time to productive from 72 hours to 24 hours, measured by median hours to all-access-ready.',
      opportunityIds: ['opp_onboard', 'opp_access', 'opp_audit'], objectiveId: 'obj_dayone', metricId: 'met_ns', predictedChange: '72h → 24h time to productive', confidence: 70,
      checkDate: d(80), status: 'in-delivery', horizon: 'now', category: 'feature', ownerId: 'stk_me', teamId: 'team_iam', startDate: d(-35), targetDate: d(21),
      reach: 600, impact: 3, effort: 12, businessValue: 13, timeCriticality: 13, riskReduction: 8, jobSize: 8,
    }, 60);
    put('bet_sspr', 'bet', {
      title: 'Self-service password reset with MFA',
      hypothesis: 'We believe self-service reset and unlock with MFA for all employees will cut password tickets from 1,450 to 300 a month, measured by password/lockout tickets.',
      opportunityIds: ['opp_password'], objectiveId: 'obj_self', metricId: 'met_pwd', predictedChange: '−80% password tickets', confidence: 75,
      checkDate: d(60), status: 'in-delivery', horizon: 'now', category: 'feature', ownerId: 'stk_me', teamId: 'team_sd', startDate: d(-42), targetDate: d(14),
      reach: 1900, impact: 2, effort: 6, businessValue: 8, timeCriticality: 8, riskReduction: 5, jobSize: 5,
    }, 70);
    put('bet_portal', 'bet', {
      title: 'Access request portal with smart approvals',
      hypothesis: 'We believe a catalog of access packages with policy-based approval routing for managers will cut access lead time from 46 hours to 4, measured by access request lead time.',
      opportunityIds: ['opp_access'], objectiveId: 'obj_dayone', metricId: 'met_access', predictedChange: '46h → 4h access lead time', confidence: 60,
      checkDate: d(130), status: 'committed', horizon: 'now', category: 'feature', ownerId: 'stk_me', teamId: 'team_iam', startDate: d(10), targetDate: d(55),
      reach: 1900, impact: 1, effort: 8, businessValue: 8, timeCriticality: 5, riskReduction: 5, jobSize: 8,
    }, 40);
    put('bet_reviews', 'bet', {
      title: 'Automated quarterly access reviews',
      hypothesis: 'We believe access reviews inside ServiceHub, pre-filled with usage data, will get reviews 100% complete and orphaned accounts to zero, measured by review completion and orphaned accounts.',
      opportunityIds: ['opp_audit'], objectiveId: 'obj_audit', metricId: 'met_orphans', predictedChange: '37 → 0 orphaned accounts', confidence: 55,
      status: 'committed', horizon: 'next', category: 'compliance', teamId: 'team_iam', reach: 400, impact: 2, effort: 8, businessValue: 8, timeCriticality: 13, riskReduction: 13, jobSize: 8,
    }, 30);
    put('bet_kb', 'bet', {
      title: 'Answer-first search in the portal',
      hypothesis: 'We believe showing answers before the ticket form will resolve 20% more issues without an agent, measured by self-service resolution rate.',
      opportunityIds: ['opp_kb'], objectiveId: 'obj_self', metricId: 'met_selfservice', predictedChange: '+12 pts self-service', confidence: 45,
      status: 'discovery', horizon: 'next', category: 'feature', teamId: 'team_sd', reach: 1200, impact: 1, effort: 6, businessValue: 5, timeCriticality: 3, riskReduction: 2, jobSize: 5,
    }, 30);
    put('bet_zerotouch', 'bet', { title: 'Zero-touch laptop provisioning', hypothesis: 'We believe shipping laptops pre-enrolled with Autopilot will put a working laptop in every hire\'s hands on day one.', opportunityIds: ['opp_laptop'], objectiveId: 'obj_dayone', confidence: 50, status: 'idea', horizon: 'next', category: 'feature', teamId: 'team_plat', reach: 600, impact: 2, effort: 10, businessValue: 8, timeCriticality: 8, riskReduction: 3, jobSize: 8 }, 30);
    put('bet_status', 'bet', { title: 'Request status updates in Teams', hypothesis: 'We believe proactive status messages will halve "any update?" chasers.', opportunityIds: ['opp_status'], confidence: 40, status: 'idea', horizon: 'later', category: 'feature', reach: 1900, impact: 0.5, effort: 4, businessValue: 3, timeCriticality: 2, riskReduction: 1, jobSize: 3 }, 30);
    put('bet_ldap', 'bet', { title: 'Retire the legacy LDAP sync scripts', hypothesis: 'Moving the last nightly scripts to the identity platform removes silent failures and unblocks reliable JML.', status: 'committed', horizon: 'next', category: 'tech-debt', teamId: 'team_plat', confidence: 80, effort: 8, reach: 1900, impact: 0.5, businessValue: 3, timeCriticality: 8, riskReduction: 13, jobSize: 8 }, 45);
    put('bet_sso', 'bet', { title: 'SSO wave 3 (40 SaaS apps)', hypothesis: 'We believe single sign-on for the remaining SaaS apps will cut "forgot password" tickets for SaaS tools by 30%.', predictedChange: '−30% SaaS password tickets', confidence: 65, checkDate: d(3), status: 'shipped', horizon: 'now', category: 'feature', teamId: 'team_iam', startDate: d(-90), targetDate: d(-22) }, 100);
    put('bet_catalog', 'bet', { title: 'Service catalog redesign', hypothesis: 'We believe a task-based catalog will cut misrouted tickets by 25%.', predictedChange: '−25% misrouted tickets', confidence: 70, checkDate: d(-30), status: 'measured', category: 'feature', teamId: 'team_sd', startDate: d(-180), targetDate: d(-120), result: 'success', actualResult: 'Misrouted tickets −31%.', learning: 'Labels in employees\' words ("my laptop is slow") beat IT categories ("Endpoint – performance").' }, 190);
    put('bet_chatbot', 'bet', { title: 'IT chatbot v1', hypothesis: 'We believe a chatbot on the portal will deflect 30% of tickets.', predictedChange: '−30% tickets', confidence: 85, checkDate: d(-100), status: 'measured', category: 'experiment', startDate: d(-280), targetDate: d(-200), result: 'failed', actualResult: 'Deflection 4%; satisfaction dropped.', learning: 'We were overconfident after a polished vendor demo. Answers need fresh content first — fix knowledge, then automate.' }, 290);
    put('bet_vpn', 'bet', { title: 'Always-on VPN rollout', hypothesis: 'We believe always-on VPN will eliminate VPN connection tickets.', predictedChange: 'Zero VPN connection tickets', confidence: 80, checkDate: d(-60), status: 'measured', category: 'feature', teamId: 'team_plat', startDate: d(-220), targetDate: d(-150), result: 'partial', actualResult: 'VPN tickets −65%; remaining are home-router issues.', learning: 'Measure the long tail before promising "zero".' }, 230);

    put('asm_jobcodes', 'assumption', { title: 'Workday job codes reliably predict the access a person needs', betId: 'bet_jml', category: 'feasibility', importance: 5, evidenceLevel: 2, status: 'untested', testPlan: 'Compare access packages generated from job codes with actual access of 100 current employees.' }, 30);
    put('asm_managers', 'assumption', { title: 'Managers review the access summary within 2 days', betId: 'bet_jml', category: 'usability', importance: 4, evidenceLevel: 2, status: 'testing', testPlan: 'Pilot with 3 Sales managers.' }, 30);
    put('asm_hr', 'assumption', { title: 'HR enters hires at least 5 days before the start date', betId: 'bet_jml', category: 'viability', importance: 4, evidenceLevel: 4, status: 'validated', testPlan: 'Workday data: 91% of hires entered ≥ 5 days ahead.' }, 30);
    put('asm_mfa', 'assumption', { title: 'Office staff will register for MFA-based reset when prompted', betId: 'bet_sspr', category: 'value', importance: 4, evidenceLevel: 4, status: 'validated', testPlan: 'Pilot: 72% completion without help.' }, 30);
    put('asm_frontline', 'assumption', { title: 'Frontline staff can verify without a company phone', betId: 'bet_sspr', category: 'feasibility', importance: 5, evidenceLevel: 1, status: 'untested' }, 30);
    put('asm_owners', 'assumption', { title: 'System owners will maintain access package definitions', betId: 'bet_portal', category: 'viability', importance: 4, evidenceLevel: 2, status: 'untested' }, 20);

    put('exp_pilot', 'experiment', { title: 'SSPR pilot with Finance', betId: 'bet_sspr', assumptionIds: ['asm_mfa'], method: 'prototype-test', hypothesis: 'At least 60% of resets complete without help.', metric: 'Resets completed without help', baselineRate: 60, variantN: 150, variantConversions: 108, status: 'concluded', decision: 'persevere', startDate: d(-48), endDate: d(-34), notes: '72% completed; failures were people without MFA registered.' }, 48);
    put('exp_summary', 'experiment', { title: 'A/B: manager access summary in Teams vs email', betId: 'bet_jml', assumptionIds: ['asm_managers'], method: 'a/b-test', hypothesis: 'A Teams card gets more managers to review access within 2 days.', metric: 'Reviewed within 2 days', baselineRate: 35, mde: 25, alpha: 0.05, power: 0.8, controlN: 220, controlConversions: 77, variantN: 215, variantConversions: 112, status: 'concluded', decision: 'persevere', startDate: d(-30), endDate: d(-12) }, 30);
    put('exp_pin', 'experiment', { title: 'Prototype: PIN + badge sign-in on shared scanners', betId: 'bet_sspr', assumptionIds: ['asm_frontline'], method: 'prototype-test', hypothesis: '4 of 5 associates sign in within 30 seconds.', metric: 'Task success', status: 'running', decision: 'pending', startDate: d(-4) }, 4);

    put('jrn_first', 'journey', {
      title: 'First week of a new sales rep (today)', personaId: 'per_sam',
      stages: [
        { name: 'Offer signed', actions: 'Receives welcome email from HR', thoughts: 'Excited — what do I need?', emotion: 1, pains: 'No IT information before day one', opportunityIds: ['opp_onboard'] },
        { name: 'Day one', actions: 'Arrives, no laptop, borrows a desk', thoughts: 'Did they forget me?', emotion: -2, pains: 'Laptop imaged late', opportunityIds: ['opp_laptop'] },
        { name: 'Getting access', actions: 'Manager emails IT with a list', thoughts: 'Which systems do I even need?', emotion: -1, pains: 'Missing CRM and Zendesk access', opportunityIds: ['opp_access'] },
        { name: 'First login', actions: 'Locked out after password expiry', thoughts: 'Again?', emotion: -2, pains: 'Needs a ticket to reset', opportunityIds: ['opp_password'] },
        { name: 'Productive', actions: 'Calls first customer on day 4', thoughts: 'Finally', emotion: 1, pains: 'Lost three days of ramp-up', opportunityIds: ['opp_onboard'] },
      ],
    }, 100);
    put('std_onboard', 'study', {
      title: 'New-hire onboarding interviews (Q3)', objective: 'Understand where new hires and managers lose time in the first week.', method: 'interviews', status: 'done', startDate: d(-70),
      participants: '10 hires from Sales, Finance, Support and Warehouse; 6 hiring managers. Screener: started in the last 60 days.',
      guide: '## Warm-up\n- Tell me about your first day.\n\n## Deep dive\n- What did you need that wasn\'t there?\n- Who did you ask for help?\n- Show me how you requested access.\n\n## Wrap-up\n- What would have made week one great?',
      findings: '## Key findings\n1. **Access is the bottleneck** — 9 of 10 hires waited for at least one system.\n2. **Managers don\'t know what to request** — 5 of 6 copied a colleague\'s list.\n3. **Frontline staff are invisible to IT** — no phone, no email, shared devices.\n\n## Surprise\n- Two managers paid for personal SaaS accounts to get hires started.',
      evidenceIds: ['ev_1', 'ev_2', 'ev_4', 'ev_15', 'ev_16'],
    }, 70);

    // ---------------- Define ----------------
    put('gl_worker', 'glossaryTerm', { term: 'Worker', definition: 'Anyone with a Ashgrove identity: employee or contractor.', synonyms: ['staff'], domain: 'Identity' }, 200);
    put('gl_identity', 'glossaryTerm', { term: 'Identity', definition: 'The single record of a worker across systems, created from Workday.', domain: 'Identity', dataEntityId: 'de_identity' }, 200);
    put('gl_jml', 'glossaryTerm', { term: 'Joiner–mover–leaver (JML)', definition: 'The lifecycle events that create, change and remove a worker\'s access.', domain: 'Identity' }, 200);
    put('gl_birthright', 'glossaryTerm', { term: 'Birthright access', definition: 'Access every worker gets automatically: email, Teams, intranet, ServiceHub.', synonyms: ['default access'], domain: 'Access' }, 200);
    put('gl_package', 'glossaryTerm', { term: 'Access package', definition: 'A named bundle of entitlements for a role, assigned and removed together.', synonyms: ['role bundle'], domain: 'Access' }, 200);
    put('gl_entitlement', 'glossaryTerm', { term: 'Entitlement', definition: 'A single permission in a system (a group, a role, a licence).', synonyms: ['permission'], domain: 'Access' }, 200);
    put('gl_owner', 'glossaryTerm', { term: 'System owner', definition: 'The person accountable for who can access a system.', synonyms: ['app owner'], domain: 'Access' }, 200);

    put('spec_jml', 'spec', {
      title: 'Automated JML access — PRD', betId: 'bet_jml', ownerId: 'stk_me', status: 'in-review',
      body: `# Automated joiner–mover–leaver (JML) access

## Problem
New hires wait an average of 72 hours for the accounts and access they need. Hiring managers email IT, the service desk creates accounts by hand, and access is often missing or wrong. Leavers keep access for days after they go — internal audit found 37 orphaned accounts last quarter.

> "My first three days were spent waiting for logins." — new sales rep, September cohort

## Goals
- Time to productive from 72 hours to 24 hours (baseline: Q3 median).
- 95% of new hires have laptop and access on day one.
- Zero orphaned accounts at the Q4 access review.

## Non-goals
- Contractor lifecycle (see DEC-5).
- Replacing Workday as the HR system.
- Physical access badges.

## Users
Hiring managers, the service desk and system owners. Managers rarely know which permissions their staff need. Frontline workers on shared devices are covered in the SSPR spec.

## Requirements
- Accounts and birthright groups are created 3 business days before the HR start date.
- Access packages are assigned from the job code in Workday.
- Non-birthright access needs manager approval.
- Provisioning should be fast, even for large cohorts.
- Accounts are disabled within 1 hour of the HR termination time.
- When a job code changes, access outside the new package is flagged, etc.
- Every grant and revoke is written to the audit log.

## Experience
1. HR enters the hire in Workday.
2. ServiceHub creates the identity and birthright access.
3. The manager gets a summary in Teams and adds extra access if needed.

Design: Figma "JML manager summary v2".

## Rollout
Pilot with the January sales cohort (120 hires), then all departments. Feature flag per department.

## Open questions
- Who owns mailbox retention for leavers? TBD
- Do movers keep old access during a handover period?
`,
    }, 40);
    put('spec_sspr', 'spec', {
      title: 'Self-service password reset — spec', betId: 'bet_sspr', ownerId: 'stk_me', status: 'approved',
      body: `# Self-service password reset (SSPR)

## Problem
Password resets are 31% of service desk tickets (1,450 a month). Employees wait 4 hours on average to get back in.

## Goals
- Password tickets from 1,450 to 300 a month (baseline: September).
- 80% of employees registered for MFA-based reset within 60 days.

## Non-goals
- SMS reset for office workers (phishing risk, see DEC-4).
- Passwordless sign-in (separate bet).

## Requirements
- Employees can reset their password from the sign-in page after verifying with MFA.
- Employees can unlock their account without a ticket.
- A reset ends all active sessions within 60 seconds.
- Five failed verification attempts lock self-service for 30 minutes and alert the service desk.

## Acceptance
Given an employee registered for MFA
When they choose "Forgot password" and pass verification
Then they set a new password and can sign in within 2 minutes.

## Security
Only the account owner can reset; role-based access control prevents agents from seeing new passwords. Verification uses the authenticator app or a FIDO2 key.

## Tracking
Events: sspr_started, sspr_completed, sspr_failed.

## Support
Help-centre article and service desk macro ready a week before launch. Keyboard and screen reader tested (WCAG 2.2 AA).
`,
    }, 70);
    put('spec_portal', 'spec', {
      title: 'Access request portal — draft', betId: 'bet_portal', ownerId: 'stk_me', status: 'draft',
      body: `# Access request portal

## Problem
Access requests bounce between managers and system owners for 46 hours on average.

## Requirements
- Employees can request access to an application from a catalog.
- Approvals should be smart and quick.
- System owners approve requests for restricted data.
`,
    }, 15);

    const R = (id: string, data: Record<string, unknown>, daysAgo = 35) => put(`req_${id}`, 'requirement', data, daysAgo);
    R('birthright', { title: 'Birthright access before the start date', statement: 'Accounts and birthright groups are created 3 business days before the HR start date.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_hannah', 'ev_1'], rationale: 'Laptop and accounts can be tested before day one.', acceptance: 'For a hire starting Monday, accounts exist by the previous Wednesday.', stability: 'stable', ownerId: 'stk_me', version: 2 });
    R('packages', { title: 'Access packages from job code', statement: 'Access packages are assigned from the job code in Workday.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_marcus'], stability: 'volatile' });
    R('approval', { title: 'Manager approval for extra access', statement: 'Non-birthright access needs approval from the worker\'s manager.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_dana'] });
    R('sla', { title: 'Provisioning time', statement: 'p95 provisioning completes within 15 minutes of approval.', kind: 'non-functional', priority: 'should', status: 'in-review', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_priya'], stability: 'volatile', version: 2, history: [{ version: 1, title: 'Provisioning time', statement: 'p95 provisioning completes within 60 minutes of approval.', priority: 'should', at: d(-14) }] });
    R('leaver', { title: 'Leaver deprovisioning', statement: 'Accounts are disabled within 1 hour of the HR termination time.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_kim', 'ev_28'], tags: ['audit', 'security'] });
    R('mover', { title: 'Mover access clean-up', statement: 'When a job code changes, access outside the new package is flagged and removed after 14 days.', kind: 'business-rule', priority: 'must', status: 'approved', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['ev_29'] });
    R('auditlog', { title: 'Audit trail of access changes', statement: 'Every grant and revoke is logged and retained for 7 years.', kind: 'constraint', priority: 'must', status: 'approved', betId: 'bet_jml', sourceIds: ['stk_kim'], rationale: 'SOX ITGC evidence.', tags: ['audit'] }, 300);
    R('sod', { title: 'Segregation of duties', statement: 'No one can hold both the AP clerk and vendor master roles.', kind: 'business-rule', priority: 'must', status: 'approved', betId: 'bet_jml', sourceIds: ['stk_kim'], tags: ['audit'] }, 200);
    R('mailbox90', { title: 'Leaver mailbox retention (handover)', statement: 'Leaver mailboxes are retained for 90 days for handover.', kind: 'business-rule', priority: 'should', status: 'draft', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_tomas'] }, 10);
    R('mailbox30', { title: 'Leaver mailbox deletion (DPO)', statement: 'Leaver mailboxes are deleted after 30 days.', kind: 'constraint', priority: 'must', status: 'draft', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_elena'], tags: ['pii'] }, 9);
    R('salesla', { title: 'Provisioning time for Sales cohorts', statement: 'p95 provisioning completes within 5 minutes of approval.', kind: 'non-functional', priority: 'should', status: 'draft', specId: 'spec_jml', betId: 'bet_jml', sourceIds: ['stk_daniel'], stability: 'volatile' }, 8);
    R('breakglass', { title: 'Break-glass admin accounts', statement: 'Two emergency admin accounts exist outside JML and are reviewed monthly.', kind: 'constraint', priority: 'could', status: 'draft', betId: 'bet_jml', sourceIds: ['stk_dana'] }, 20);
    R('reset', { title: 'Self-service reset with MFA', statement: 'Employees can reset their password from the sign-in page after verifying with MFA.', kind: 'functional', priority: 'must', status: 'implemented', specId: 'spec_sspr', betId: 'bet_sspr', sourceIds: ['ev_14', 'stk_tomas'] }, 60);
    R('unlock', { title: 'Self-service unlock', statement: 'Employees can unlock their account without a ticket.', kind: 'functional', priority: 'must', status: 'implemented', specId: 'spec_sspr', betId: 'bet_sspr', sourceIds: ['ev_18'] }, 60);
    R('revoke', { title: 'Reset ends active sessions', statement: 'A reset ends all active sessions within 60 seconds.', kind: 'non-functional', priority: 'must', status: 'approved', specId: 'spec_sspr', betId: 'bet_sspr', sourceIds: ['stk_dana'] }, 60);
    R('lockout', { title: 'Lockout after failed verification', statement: 'Five failed verification attempts lock self-service for 30 minutes and alert the service desk.', kind: 'business-rule', priority: 'must', status: 'approved', specId: 'spec_sspr', betId: 'bet_sspr', sourceIds: ['stk_dana'] }, 60);
    R('sms', { title: 'Reset for frontline staff without a company phone', statement: 'Frontline workers can verify at a shared device with badge and PIN.', kind: 'functional', priority: 'could', status: 'draft', specId: 'spec_sspr', betId: 'bet_sspr', sourceIds: ['stk_olivia', 'ev_16'] }, 12);
    R('catalog', { title: 'Request access from a catalog', statement: 'Employees can request an access package from a searchable catalog.', kind: 'functional', priority: 'must', status: 'draft', specId: 'spec_portal', betId: 'bet_portal', sourceIds: ['ev_6'] }, 14);

    put('base_jml1', 'baseline', {
      title: 'Automated JML — baseline v1', date: d(-12), specId: 'spec_jml', approvalId: 'appr_baseline',
      notes: 'Baseline approved for build start. Changes after this point go through change requests.',
      snapshot: [
        { id: 'req_birthright', key: 'REQ-1', title: 'Birthright access before the start date', statement: 'Accounts and birthright groups are created 3 business days before the HR start date.', priority: 'must', version: 2 },
        { id: 'req_packages', key: 'REQ-2', title: 'Access packages from job code', statement: 'Access packages are assigned from the job title in Workday.', priority: 'must', version: 1 },
        { id: 'req_approval', key: 'REQ-3', title: 'Manager approval for extra access', statement: 'Non-birthright access needs approval from the worker\'s manager.', priority: 'must', version: 1 },
        { id: 'req_sla', key: 'REQ-4', title: 'Provisioning time', statement: 'p95 provisioning completes within 60 minutes of approval.', priority: 'should', version: 1 },
        { id: 'req_leaver', key: 'REQ-5', title: 'Leaver deprovisioning', statement: 'Accounts are disabled within 1 hour of the HR termination time.', priority: 'must', version: 1 },
        { id: 'req_mover', key: 'REQ-6', title: 'Mover access clean-up', statement: 'When a job code changes, access outside the new package is flagged and removed after 14 days.', priority: 'must', version: 1 },
        { id: 'req_auditlog', key: 'REQ-7', title: 'Audit trail of access changes', statement: 'Every grant and revoke is logged and retained for 7 years.', priority: 'must', version: 1 },
        { id: 'req_ldapsync', key: 'REQ-0', title: 'Nightly LDAP sync', statement: 'Accounts are synchronised nightly from LDAP.', priority: 'could', version: 1 },
      ],
    }, 12);
    put('cr_sla', 'changeRequest', { title: 'Provision Sales cohorts within 5 minutes', description: 'Sales wants new reps\' CRM access live within minutes of approval.', requirementIds: ['req_sla'], reason: 'January cohort onboarding sessions start at 9:00; access approved at 8:30 must work.', requestedById: 'stk_daniel', status: 'submitted' }, 8);

    const DEC = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`dec_${id}`, 'decision', { status: 'decided', ...data }, daysAgo);
    DEC('sot', { title: 'Workday is the source of truth for identity', context: 'Three systems held conflicting job data.', options: '- **Workday** — HR owns it, already authoritative for payroll\n- **Entra ID** — IT owns it, but job data is stale\n- **Both, reconciled nightly** — complex, error-prone', chosen: 'Workday', rationale: 'One owner for people data; IT consumes events instead of copying data.', deciderIds: ['stk_hannah', 'stk_morgan'], consultedIds: ['stk_me', 'stk_priya', 'stk_marcus'], date: d(-60), reversibility: 'one-way-door', relatedIds: ['bet_jml'] }, 60);
    DEC('packages', { title: 'Use identity-platform access packages, not custom role tables', options: '- Access packages in the identity platform\n- Custom role tables in ServiceHub', chosen: 'Access packages', rationale: 'Native lifecycle, reviews and audit come for free.', deciderIds: ['stk_priya', 'stk_marcus'], consultedIds: ['stk_me', 'stk_dana'], date: d(-30), reversibility: 'two-way-door', relatedIds: ['bet_jml'] }, 30);
    DEC('threedays', { title: 'Create accounts 3 business days before the start date', context: 'Endpoint needs accounts to pre-enrol laptops.', options: '- On the start date\n- 3 business days before\n- As soon as HR enters the hire', chosen: '3 business days before', rationale: 'Enough time to test; limits accounts for hires who withdraw.', deciderIds: ['stk_me'], consultedIds: ['stk_hannah', 'stk_dana', 'stk_grace'], date: d(-20), reversibility: 'two-way-door', revisitTrigger: 'More than 5% of hires change start date after accounts are created', revisitDate: d(60), relatedIds: ['bet_jml', 'spec_jml'] }, 20);
    DEC('nosms', { title: 'No SMS reset for office workers', context: 'SMS codes can be intercepted (SIM swap).', options: '- SMS for everyone\n- Authenticator app / FIDO2 only\n- SMS only for frontline staff', chosen: 'Authenticator app / FIDO2 for office workers', rationale: 'Phishing-resistant; frontline handled separately.', deciderIds: ['stk_dana'], consultedIds: ['stk_me', 'stk_tomas'], date: d(-25), reversibility: 'two-way-door', relatedIds: ['bet_sspr'] }, 25);
    DEC('contractors', { title: 'Defer contractor lifecycle to Q1', context: 'Contractors are not in Workday yet.', options: '- Build now from the vendor portal\n- Defer until contractors are in Workday', chosen: 'Defer to Q1', rationale: 'Avoid a second source of truth.', deciderIds: ['stk_morgan', 'stk_me'], consultedIds: ['stk_hannah'], date: d(-60), reversibility: 'two-way-door', revisitTrigger: 'Audit raises another contractor finding', revisitDate: d(-2), relatedIds: ['bet_jml'] }, 60);
    DEC('preapprove', { title: 'Let hiring managers pre-approve extra access before day one', context: 'Proposed by Sales to speed up the January cohort.', options: '- Pre-approval up to 5 days before start\n- Approval only after day one', chosen: 'Pre-approval up to 5 days before start', rationale: 'Access ready on day one.', deciderIds: [], consultedIds: ['stk_daniel'], date: d(-1), status: 'proposed', reversibility: 'two-way-door', relatedIds: ['bet_jml'] }, 1);
    DEC('mailbox', { title: 'Keep leaver mailboxes for 90 days', context: 'Managers need email history for handovers.', options: '- 30 days\n- 90 days\n- Until manager confirms', chosen: '90 days', rationale: 'Matches the handover period agreed with Sales.', deciderIds: ['stk_me'], consultedIds: [], date: d(-3), reversibility: 'two-way-door', revisitTrigger: 'DPO objects', relatedIds: ['bet_jml'] }, 3);
    DEC('manual', { title: 'Provision accounts from service desk tickets', chosen: 'Ticket-based provisioning', rationale: 'Status quo.', deciderIds: ['stk_tomas'], date: d(-400), status: 'superseded', reversibility: 'two-way-door', relatedIds: ['bet_jml'] }, 400);

    put('dt_routing', 'decisionTable', {
      title: 'Access approval routing', requirementId: 'req_approval', hitPolicy: 'unique',
      conditions: [{ name: 'Access type', values: ['birthright', 'standard', 'privileged'] }, { name: 'Data', values: ['internal', 'confidential', 'restricted'] }, { name: 'Requester', values: ['employee', 'contractor'] }],
      actions: [{ name: 'Approvals' }, { name: 'Expires after' }],
      rules: [
        { id: 'R1', when: { 'Access type': 'birthright', Data: '-', Requester: 'employee' }, then: { Approvals: 'none', 'Expires after': 'never' } },
        { id: 'R2', when: { 'Access type': 'standard', Data: 'internal', Requester: '-' }, then: { Approvals: 'manager', 'Expires after': 'never' } },
        { id: 'R3', when: { 'Access type': 'standard', Data: 'confidential', Requester: 'employee' }, then: { Approvals: 'manager + system owner', 'Expires after': '180 days' } },
        { id: 'R4', when: { 'Access type': 'privileged', Data: '-', Requester: '-' }, then: { Approvals: 'manager + system owner + security', 'Expires after': '30 days' } },
        { id: 'R5', when: { 'Access type': 'standard', Data: 'confidential', Requester: '-' }, then: { Approvals: 'manager', 'Expires after': '90 days' } },
      ],
    }, 20);

    put('pm_asis', 'processModel', {
      title: 'New-hire onboarding', variant: 'as-is', orientation: 'horizontal', counterpartId: 'pm_tobe', notes: 'Observed in the onboarding workshop with Sales and HR.',
      lanes: ['HR', 'Hiring manager', 'Service desk', 'Endpoint team', 'New hire'],
      steps: [
        { id: 'a1', lane: 'HR', label: 'Offer signed', kind: 'start', next: ['a2'], pos: 0 },
        { id: 'a2', lane: 'HR', label: 'Enter hire in Workday', kind: 'task', next: ['a3'], pos: 1 },
        { id: 'a3', lane: 'Hiring manager', label: 'Email IT a list of systems', kind: 'task', next: ['a4', 'a6'], pos: 2 },
        { id: 'a4', lane: 'Service desk', label: 'Create accounts by hand', kind: 'task', next: ['a5'], pos: 3 },
        { id: 'a5', lane: 'Service desk', label: 'Add groups one by one', kind: 'task', next: ['a8'], pos: 4 },
        { id: 'a6', lane: 'Endpoint team', label: 'Image laptop (3 hours)', kind: 'task', next: ['a7'], pos: 3 },
        { id: 'a7', lane: 'Endpoint team', label: 'Ship laptop', kind: 'task', next: ['a8'], pos: 4 },
        { id: 'a8', lane: 'New hire', label: 'Access complete?', kind: 'decision', next: ['a9', 'a10'], labels: { a9: 'No', a10: 'Yes' }, pos: 5 },
        { id: 'a9', lane: 'Hiring manager', label: 'Chase missing access', kind: 'task', next: ['a4'], pos: 6 },
        { id: 'a10', lane: 'New hire', label: 'Productive (day 3–4)', kind: 'end', next: [], pos: 6.5 },
      ],
    }, 40);
    put('pm_tobe', 'processModel', {
      title: 'New-hire onboarding', variant: 'to-be', orientation: 'vertical', counterpartId: 'pm_asis', notes: 'With automated JML (2026.11) and zero-touch laptops (next).',
      lanes: ['HR', 'ServiceHub', 'Hiring manager', 'Endpoint team', 'New hire'],
      steps: [
        { id: 'b1', lane: 'HR', label: 'Hire created in Workday', kind: 'start', next: ['b2'], pos: 0 },
        { id: 'b2', lane: 'ServiceHub', label: 'Create identity & birthright access', kind: 'task', next: ['b3', 'b4'], pos: 1 },
        { id: 'b3', lane: 'ServiceHub', label: 'Assign access package from job code', kind: 'task', next: ['b5'], pos: 2 },
        { id: 'b4', lane: 'Endpoint team', label: 'Zero-touch laptop shipped', kind: 'task', next: ['b8'], pos: 2 },
        { id: 'b5', lane: 'Hiring manager', label: 'Extra access needed?', kind: 'decision', next: ['b6', 'b8'], labels: { b6: 'Yes', b8: 'No' }, pos: 3 },
        { id: 'b6', lane: 'Hiring manager', label: 'Request extra access', kind: 'task', next: ['b7'], pos: 4 },
        { id: 'b7', lane: 'ServiceHub', label: 'Route approvals & provision', kind: 'task', next: ['b8'], pos: 5 },
        { id: 'b8', lane: 'New hire', label: 'Productive on day one', kind: 'end', next: [], pos: 6 },
      ],
    }, 30);

    put('uc_request', 'useCase', {
      title: 'Request access to an application', actor: 'Employee', goal: 'Get the access needed for work without knowing system names.',
      preconditions: 'Employee is signed in to ServiceHub.',
      mainFlow: '1. Employee searches the catalog for the application.\n2. System shows matching access packages in plain language.\n3. Employee picks a package and adds a reason.\n4. System routes approvals using the approval routing rules.\n5. Approvers approve in Teams.\n6. System provisions access and notifies the employee.',
      alternateFlows: '2a. No match → employee describes the need; request goes to the service desk.\n5a. Approver is absent → request goes to their delegate.',
      exceptionFlows: '4a. Request would break segregation of duties → system blocks it and explains why.\n6a. Provisioning fails → service desk is alerted; employee sees the status.',
      postconditions: 'Access granted with an expiry date; audit entry written.', requirementIds: ['req_approval', 'req_sod', 'req_catalog'],
    }, 30);

    put('sm_request', 'stateModel', {
      title: 'Access request lifecycle', notes: 'Approvals follow the routing decision table.', requirementIds: ['req_approval', 'req_catalog'],
      states: ['draft', 'submitted', 'pending manager', 'pending owner', 'pending security', 'approved', 'provisioned', 'rejected', 'expired', 'revoked'], initial: 'draft', finals: ['rejected', 'expired', 'revoked'],
      transitions: [
        { from: 'draft', to: 'submitted', trigger: 'submit' },
        { from: 'submitted', to: 'pending manager', trigger: 'route' },
        { from: 'pending manager', to: 'approved', trigger: 'manager approves', guard: 'internal data' },
        { from: 'pending manager', to: 'pending owner', trigger: 'manager approves', guard: 'confidential or restricted' },
        { from: 'pending owner', to: 'approved', trigger: 'owner approves' },
        { from: 'pending manager', to: 'rejected', trigger: 'reject' },
        { from: 'pending owner', to: 'rejected', trigger: 'reject' },
        { from: 'approved', to: 'provisioned', trigger: 'provision' },
        { from: 'provisioned', to: 'expired', trigger: 'end date reached' },
        { from: 'provisioned', to: 'revoked', trigger: 'access review removes' },
      ],
    }, 25);

    put('de_identity', 'dataEntity', {
      name: 'Identity', description: 'A worker\'s identity record, created from Workday events.', relations: 'Has many Entitlements and Access requests; belongs to a Manager (Identity).', ownerId: 'stk_hannah',
      attributes: [
        { name: 'worker_id', type: 'string', required: true, pii: false, description: 'Workday worker ID' },
        { name: 'upn', type: 'string', required: true, pii: true, description: 'Sign-in name (contains the person\'s name)' },
        { name: 'display_name', type: 'string', required: true, pii: true, description: '' },
        { name: 'personal_email', type: 'string', required: false, pii: true, description: 'Only for pre-start communication; deleted on day one' },
        { name: 'job_code', type: 'string', required: true, pii: false, description: 'Drives the access package' },
        { name: 'manager_id', type: 'worker_id', required: true, pii: false, description: '' },
        { name: 'start_date', type: 'date', required: true, pii: false, description: '' },
        { name: 'termination_at', type: 'timestamp', required: false, pii: false, description: 'Triggers leaver deprovisioning' },
      ],
    }, 200);
    put('de_request', 'dataEntity', {
      name: 'Access request', description: 'A request for an access package, with its approvals.', relations: 'Belongs to an Identity; references an Access package.',
      attributes: [
        { name: 'request_id', type: 'uuid', required: true, pii: false, description: '' },
        { name: 'package_id', type: 'string', required: true, pii: false, description: '' },
        { name: 'justification', type: 'text', required: true, pii: false, description: 'Free text — may contain personal data' },
        { name: 'status', type: 'enum', required: true, pii: false, description: 'See the state model' },
        { name: 'expires_at', type: 'date', required: false, pii: false, description: 'From the routing rules' },
      ],
    }, 30);

    put('eli_workshop', 'elicitation', {
      title: 'Onboarding workshop — Sales & HR', technique: 'workshop', date: d(-40), stakeholderIds: ['stk_daniel', 'stk_hannah', 'stk_me', 'stk_aisha'], status: 'synthesized',
      objectives: 'Map today\'s onboarding steps and find the three biggest delays.',
      questions: '1. Walk us through the last hire, step by step.\n2. Where do you wait on someone else?\n3. What do you request, and how do you know what to request?',
      notes: '- Decision: pilot automated onboarding with the January sales cohort\n- Action: @hannah to share the job code list by Friday\n- Risk: job codes are inconsistent across regions\n- New reps must have CRM access before their first training session\n- Who approves access for a manager who hasn\'t started yet?',
    }, 40);
    put('eli_warehouse', 'elicitation', {
      title: 'Interview — warehouse shift lead', technique: 'observation', date: d(-14), stakeholderIds: ['stk_olivia'], status: 'done',
      objectives: 'Understand sign-in at shared scanners.', notes: '- 40 associates start a shift within 10 minutes\n- Concern: nobody has a company phone for MFA\n- The system must let associates sign in with badge and PIN',
    }, 14);

    put('cap_root', 'capability', { name: 'Employee IT services', description: 'Everything an employee needs from IT, end to end.', maturityNow: 2, maturityTarget: 4, importance: 5 }, 200);
    put('cap_jml', 'capability', { name: 'Identity lifecycle (JML)', parentId: 'cap_root', maturityNow: 1, maturityTarget: 4, importance: 5, ownerId: 'stk_me' }, 200);
    put('cap_gov', 'capability', { name: 'Access governance & reviews', parentId: 'cap_root', maturityNow: 2, maturityTarget: 5, importance: 5, ownerId: 'stk_dana' }, 200);
    put('cap_self', 'capability', { name: 'Self-service & knowledge', parentId: 'cap_root', maturityNow: 2, maturityTarget: 4, importance: 4 }, 200);
    put('cap_endpoint', 'capability', { name: 'Endpoint provisioning', parentId: 'cap_root', maturityNow: 2, maturityTarget: 4, importance: 4, ownerId: 'stk_grace' }, 200);
    put('cap_desk', 'capability', { name: 'Service desk operations', parentId: 'cap_root', maturityNow: 3, maturityTarget: 4, importance: 3, ownerId: 'stk_tomas' }, 200);
    put('cap_catalog', 'capability', { name: 'Service catalog', parentId: 'cap_root', maturityNow: 3, maturityTarget: 4, importance: 3 }, 200);
    put('gap_jml', 'gapItem', { title: 'Account creation', currentState: 'Service desk creates accounts by hand from email.', futureState: 'Accounts created from Workday events 3 days before start.', gap: 'No event integration; LDAP scripts fail silently.', action: 'Automated JML (2026.11).', priority: 'high', capabilityId: 'cap_jml', status: 'planned' }, 40);
    put('gap_reviews', 'gapItem', { title: 'Access reviews', currentState: '40 spreadsheets emailed each quarter.', futureState: 'Reviews in ServiceHub with usage data.', gap: 'No review tooling; no usage data.', action: 'Automated access reviews (next).', priority: 'high', capabilityId: 'cap_gov', status: 'planned' }, 40);
    put('gap_frontline', 'gapItem', { title: 'Frontline sign-in', currentState: 'Shared passwords on scanners; supervisors reset by phone.', futureState: 'Badge + PIN sign-in, self-service unlock.', gap: 'No MFA method without a phone.', action: 'Prototype PIN sign-in.', priority: 'medium', capabilityId: 'cap_self', status: 'open' }, 40);
    put('swot_buy', 'swot', { title: 'ServiceHub vs buying Stratus ITSM (2026)', date: d(-30), strengths: 'Already integrated with Workday and Teams\nTeam knows the domain\nFraction of the cost', weaknesses: 'Small team; key-person risk\nNo CMDB', opportunities: 'Vendor renewals in March give leverage\nReuse identity platform\'s governance features', threats: 'Exec pressure to "just buy Stratus"\nAudit findings eroding trust' }, 30);
    put('rca_pwd', 'rootCause', {
      title: 'Password tickets are 31% of service desk volume',
      whys: ['People get locked out and need an agent to get back in.', 'There is no self-service reset or unlock.', 'Reset needs identity verification, and we had no MFA registration.', 'MFA was only rolled out for VPN, not for sign-in.', 'No product owner for employee identity until 2026.'],
      fishbone: { People: ['No owner for employee identity until 2026'], Process: ['90-day password expiry', 'Reset only via phone call'], Technology: ['No self-service reset', 'Legacy LDAP page deprecated'], Data: ['MFA registration only 40%'], Policy: ['Expiry policy older than NIST guidance'] },
      rootCause: 'Self-service reset was never built because nobody owned employee identity.',
      countermeasures: 'Self-service reset with MFA (bet).\nDrop forced 90-day expiry (policy change with Security).\nMFA registration campaign.',
    }, 30);

    put('map_jml', 'storyMap', {
      title: 'Automated JML — story map', betId: 'bet_jml', personaId: 'per_maria',
      activities: [
        { id: 'act1', name: 'A hire is created', steps: [{ id: 'st1', name: 'Detect hire event' }, { id: 'st2', name: 'Create identity' }] },
        { id: 'act2', name: 'Access is granted', steps: [{ id: 'st3', name: 'Birthright access' }, { id: 'st4', name: 'Role package' }, { id: 'st5', name: 'Extra access & approvals' }] },
        { id: 'act3', name: 'People move and leave', steps: [{ id: 'st6', name: 'Mover clean-up' }, { id: 'st7', name: 'Leaver deprovisioning' }] },
      ],
      slices: [{ id: 'sl1', name: 'Pilot — 2026.11' }, { id: 'sl2', name: 'Next' }, { id: 'sl3', name: 'Later' }],
    }, 35);

    // ---------------- Stories ----------------
    const G = (given: string, when: string, then: string) => `Given ${given}\nWhen ${when}\nThen ${then}`;
    const ST = (id: string, data: Record<string, unknown>, createdDaysAgo = 40) => put(`st_${id}`, 'story', data, createdDaysAgo);
    const jml = { betId: 'bet_jml', specId: 'spec_jml', teamId: 'team_iam', storyMapId: 'map_jml' };
    ST('j1', { ...jml, title: 'Listen to Workday hire events', asA: 'Identity engineer', iWant: 'ServiceHub to receive hire events from Workday', soThat: 'identities are created without a ticket', acceptance: G('a hire is entered in Workday', 'the event arrives', 'ServiceHub stores it within 1 minute'), status: 'done', estimate: 5, requirementIds: ['req_birthright'], releaseId: 'rel_nov', doneAt: d(-22), externalKey: 'IAM-401', mapStepId: 'st1', sliceId: 'sl1' });
    ST('j2', { ...jml, title: 'Create identity from hire event', asA: 'Hiring manager', iWant: 'an identity created automatically for my hire', soThat: 'I don\'t have to email IT', acceptance: G('a hire event 3 business days before start', 'the job runs', 'the identity and mailbox exist'), status: 'done', estimate: 5, requirementIds: ['req_birthright'], releaseId: 'rel_nov', doneAt: d(-18), externalKey: 'IAM-402', mapStepId: 'st2', sliceId: 'sl1' });
    ST('j3', { ...jml, title: 'Assign birthright groups', asA: 'New hire', iWant: 'email, Teams and the intranet on day one', soThat: 'I can start working', acceptance: G('a new identity', 'it is created', 'all birthright groups are assigned'), status: 'done', estimate: 3, requirementIds: ['req_birthright'], releaseId: 'rel_nov', doneAt: d(-15), externalKey: 'IAM-403', mapStepId: 'st3', sliceId: 'sl1' });
    ST('j4', { ...jml, title: 'Map job codes to access packages', asA: 'Hiring manager', iWant: 'role access assigned from the job code', soThat: 'I don\'t need to know system names', acceptance: G('job code SALES-AE', 'the identity is created', 'the "Account executive" package is assigned'), status: 'done', estimate: 8, requirementIds: ['req_packages'], releaseId: 'rel_nov', doneAt: d(-9), externalKey: 'IAM-404', mapStepId: 'st4', sliceId: 'sl1' });
    ST('j5', { ...jml, title: 'Send manager access summary in Teams', asA: 'Hiring manager', iWant: 'a summary of my hire\'s access in Teams', soThat: 'I can spot what is missing', acceptance: G('access is provisioned', 'provisioning completes', 'the manager receives a Teams card'), status: 'done', estimate: 3, releaseId: 'rel_nov', doneAt: d(-6), externalKey: 'IAM-405', mapStepId: 'st5', sliceId: 'sl1' });
    ST('j6', { ...jml, title: 'Disable accounts on termination', asA: 'Security lead', iWant: 'leavers disabled within an hour', soThat: 'no orphaned accounts remain', acceptance: G('a termination time in Workday', 'the time passes', 'all accounts are disabled within 1 hour'), status: 'in-review', estimate: 5, requirementIds: ['req_leaver'], releaseId: 'rel_nov', externalKey: 'IAM-406', mapStepId: 'st7', sliceId: 'sl1' });
    ST('j7', { ...jml, title: 'Flag access outside the new package for movers', asA: 'System owner', iWant: 'old access flagged when someone changes role', soThat: 'access stays least-privilege', acceptance: G('a job code change', '14 days pass', 'access outside the new package is removed'), status: 'in-progress', estimate: 5, requirementIds: ['req_mover'], releaseId: 'rel_nov', externalKey: 'IAM-407', mapStepId: 'st6', sliceId: 'sl1' });
    ST('j8', { ...jml, title: 'Write grants and revokes to the audit log', asA: 'Auditor', iWant: 'every access change logged', soThat: 'I can test the control', acceptance: G('an access change', 'it is applied', 'an immutable audit entry is written'), status: 'in-progress', estimate: 3, requirementIds: ['req_auditlog'], releaseId: 'rel_nov', externalKey: 'IAM-408', mapStepId: 'st5', sliceId: 'sl1' }, 12);
    ST('j9', { ...jml, title: 'Retry failed provisioning with alerting', asA: 'Service desk agent', iWant: 'failed provisioning retried and alerted', soThat: 'nobody starts without access', acceptance: G('a provisioning call fails', 'retries are exhausted', 'the service desk gets an alert'), status: 'ready', estimate: 3, releaseId: 'rel_nov', mapStepId: 'st3', sliceId: 'sl1' }, 10);
    ST('j10', { ...jml, title: 'Show provisioning status to the manager', asA: 'Hiring manager', iWant: 'to see what is ready and what is pending', soThat: 'I stop chasing IT', status: 'ready', estimate: 3, releaseId: 'rel_nov', mapStepId: 'st5', sliceId: 'sl1' }, 8);
    ST('j11', { ...jml, title: 'Check segregation of duties before granting', asA: 'Auditor', iWant: 'toxic combinations blocked', soThat: 'SoD findings disappear', acceptance: G('a user holds AP clerk', 'vendor master is requested', 'the grant is blocked with a reason'), status: 'ready', estimate: 5, requirementIds: ['req_sod'], releaseId: 'rel_nov', mapStepId: 'st5', sliceId: 'sl1' }, 6);
    ST('j12', { ...jml, title: 'Contractor lifecycle', asA: 'Vendor manager', iWant: 'contractors onboarded like employees', soThat: 'they get access on day one', status: 'backlog', estimate: 13, mapStepId: 'st2', sliceId: 'sl3' }, 30);
    ST('j13', { ...jml, title: 'Bulk onboarding for cohorts', asA: 'HR', iWant: 'cohorts of 100+ provisioned in one run', soThat: 'January works', status: 'backlog', estimate: 8, mapStepId: 'st2', sliceId: 'sl2' }, 2);
    ST('j14', { ...jml, title: 'Pre-approve extra access before day one', asA: 'Hiring manager', iWant: 'to approve access before my hire starts', soThat: 'it is ready on day one', status: 'backlog', estimate: 5, mapStepId: 'st5', sliceId: 'sl2' }, 1);
    const sspr = { betId: 'bet_sspr', specId: 'spec_sspr', teamId: 'team_sd' };
    ST('s1', { ...sspr, title: 'Reset password with MFA from the sign-in page', asA: 'Employee', iWant: 'to reset my password myself', soThat: 'I don\'t wait 4 hours for an agent', acceptance: G('an employee registered for MFA', 'they choose Forgot password', 'they set a new password within 2 minutes'), status: 'done', estimate: 8, requirementIds: ['req_reset'], releaseId: 'rel_nov', doneAt: d(-20), externalKey: 'SD-210' }, 45);
    ST('s2', { ...sspr, title: 'Unlock account without a ticket', asA: 'Employee', iWant: 'to unlock my account', soThat: 'I can get back to work', acceptance: G('a locked account', 'the employee verifies', 'the account is unlocked'), status: 'done', estimate: 3, requirementIds: ['req_unlock'], releaseId: 'rel_nov', doneAt: d(-12), externalKey: 'SD-211' }, 45);
    ST('s3', { ...sspr, title: 'End sessions after reset', asA: 'Security lead', iWant: 'all sessions ended after a reset', soThat: 'a stolen session can\'t continue', acceptance: G('active sessions on 3 devices', 'the password is reset', 'all sessions end within 60 seconds'), status: 'in-progress', estimate: 3, requirementIds: ['req_revoke'], releaseId: 'rel_nov', externalKey: 'SD-212' }, 40);
    ST('s4', { ...sspr, title: 'Lock self-service after failed verification', asA: 'Security lead', iWant: 'repeated failures locked out', soThat: 'attackers can\'t brute-force reset', acceptance: G('5 failed verifications', 'a 6th attempt is made', 'self-service is locked for 30 minutes'), status: 'in-review', estimate: 2, requirementIds: ['req_lockout'], releaseId: 'rel_nov', externalKey: 'SD-213' }, 40);
    ST('s5', { ...sspr, title: 'MFA registration campaign', asA: 'Service desk manager', iWant: 'everyone prompted to register', soThat: 'reset works for 80% of people', status: 'ready', estimate: 3, releaseId: 'rel_nov' }, 20);
    ST('s6', { ...sspr, title: 'Badge + PIN sign-in on shared scanners', asA: 'Warehouse associate', iWant: 'to sign in with my badge', soThat: 'I start my shift on time', status: 'backlog', estimate: 13, requirementIds: ['req_sms'] }, 10);
    const portal = { betId: 'bet_portal', specId: 'spec_portal', teamId: 'team_iam', releaseId: 'rel_dec' };
    ST('p1', { ...portal, title: 'Browse the access catalog', asA: 'Employee', iWant: 'to find access by what I do', soThat: 'I don\'t need system names', acceptance: G('the catalog', 'I search "invoices"', 'I see the AP clerk package'), status: 'ready', estimate: 5, requirementIds: ['req_catalog'] }, 12);
    ST('p2', { ...portal, title: 'Request access with a reason', asA: 'Employee', iWant: 'to request a package with a short reason', soThat: 'approvers understand why', status: 'backlog', estimate: 3 }, 12);
    ST('p3', { ...portal, title: 'Approve from Teams', asA: 'Manager', iWant: 'to approve in Teams', soThat: 'I don\'t open another tool', status: 'backlog', estimate: 5, dependsOnIds: ['st_p4'] }, 12);
    ST('p4', { ...portal, title: 'Approval cards in Teams', asA: 'Approver', iWant: 'a Teams card with the request details', soThat: 'I decide quickly', status: 'backlog', estimate: 5, dependsOnIds: ['st_p3'] }, 12);
    ST('p5', { ...portal, title: 'Delegate approvals while away', asA: 'Manager', iWant: 'to delegate approvals', soThat: 'requests don\'t wait for me', status: 'backlog', estimate: 8 }, 12);
    ST('old1', { title: 'Create identity from hire event (manual template)', iWant: 'a ticket template to create identities', status: 'backlog', estimate: 3 }, 220);
    ST('old2', { title: 'Improve portal performance', status: 'backlog' }, 190);
    ST('old3', { title: 'Dark mode for the portal', status: 'backlog', estimate: 20 }, 160);
    ST('old4', { title: 'Evaluate knowledge search vendors', iWant: 'to compare search vendors', status: 'backlog', betId: 'bet_kb', estimate: 3 }, 45);

    // Throughput history (last 12 weeks), split across feature, maintenance and debt work.
    put('bet_maint', 'bet', { title: 'Maintenance & service desk escalations (H2)', hypothesis: 'Keep-the-lights-on work: bugs, escalations, small fixes.', status: 'shipped', category: 'maintenance', horizon: 'now' }, 120);
    put('bet_reliab', 'bet', { title: 'Platform reliability programme (H2)', hypothesis: 'Fewer incidents and less on-call load.', status: 'shipped', category: 'maintenance', horizon: 'now', teamId: 'team_plat' }, 120);
    put('bet_debt', 'bet', { title: 'Tech debt budget (H2)', hypothesis: 'Planned work from the tech-debt register.', status: 'shipped', category: 'tech-debt', horizon: 'now' }, 120);
    const HISTORY: [string, number, [string, number][]][] = [
      ['team_iam', 2.4, [['bet_sso', 0.5], ['bet_maint', 0.3], ['bet_debt', 0.2]]],
      ['team_sd', 1.8, [['bet_catalog', 0.5], ['bet_maint', 0.4], ['bet_debt', 0.1]]],
      ['team_plat', 2.0, [['bet_vpn', 0.2], ['bet_reliab', 0.4], ['bet_debt', 0.4]]],
    ];
    const rnd = seededRandom(2026);
    const verbs = ['Fix', 'Add', 'Improve', 'Automate', 'Monitor', 'Validate', 'Log', 'Show', 'Allow', 'Speed up'];
    const objects = ['group sync retries', 'SSO for Workday', 'ticket routing rules', 'laptop request form', 'VPN health check', 'MFA prompts', 'licence report', 'catalog search', 'approval reminders', 'audit log export', 'service status page', 'Teams notifications', 'printer mapping', 'shared mailbox requests', 'asset tags import'];
    let hist = 0;
    for (let week = 0; week < 12; week++) {
      for (const [team, rate, mix] of HISTORY) {
        const count = Math.max(0, Math.round(rate + (rnd() - 0.5) * 2.4));
        for (let k = 0; k < count; k++) {
          hist++;
          const r = rnd();
          let acc = 0;
          const bet = mix.find(([, w]) => (acc += w) >= r)?.[0] ?? mix[0][0];
          const doneDaysAgo = week * 7 + Math.floor(rnd() * 7);
          put(`st_h${hist}`, 'story', { title: `${verbs[Math.floor(rnd() * verbs.length)]} ${objects[Math.floor(rnd() * objects.length)]}`, status: 'done', estimate: [1, 2, 3, 5][Math.floor(rnd() * 4)], teamId: team, betId: bet, doneAt: d(-doneDaysAgo), acceptance: G('the change is deployed', 'someone uses it', 'it behaves as specified') }, doneDaysAgo + 14);
        }
      }
    }

    // ---------------- Deliver ----------------
    put('rel_nov', 'release', {
      title: 'ServiceHub 2026.11 — Password self-service & JML pilot', version: '2026.11', targetDate: d(21), status: 'in-progress', tier: 'tier-1', betIds: ['bet_sspr', 'bet_jml'],
      goals: 'Self-service reset for all office workers; automated JML for the January sales cohort.',
      rolloutPlan: 'SSPR: Finance (week 1) → all office workers (week 2) → registration campaign.\nJML: Sales department only (flag per department), January cohort of 120 hires.',
      rollbackCriteria: 'SSPR: reset failure rate > 5% for 2 hours → disable and revert to service desk.\nJML: any wrong access package on a privileged system → pause automation, manual provisioning.',
      checklist: [
        { id: 'c1', area: 'Service desk', item: 'Agent briefing and macros', ownerId: 'stk_tomas', done: false },
        { id: 'c2', area: 'Service desk', item: 'Help-centre articles (reset, unlock)', ownerId: 'stk_tomas', done: true },
        { id: 'c3', area: 'Change', item: 'CAB approval for production change', ownerId: 'stk_noah', done: false },
        { id: 'c4', area: 'Security', item: 'Security sign-off', ownerId: 'stk_dana', done: true },
        { id: 'c5', area: 'Compliance', item: 'DPO review of leaver mailbox retention', ownerId: 'stk_elena', done: false },
        { id: 'c6', area: 'Comms', item: 'Pilot briefing for Sales managers', ownerId: 'stk_daniel', done: false },
        { id: 'c7', area: 'Engineering', item: 'Feature flags and rollback runbook', ownerId: 'stk_priya', done: true },
        { id: 'c8', area: 'Engineering', item: 'Load test: 150 hires in one run', ownerId: 'stk_priya', done: false },
        { id: 'c9', area: 'Data', item: 'Tracking events live', ownerId: 'stk_lucas', done: true },
        { id: 'c10', area: 'Accessibility', item: 'Keyboard and screen reader check', ownerId: 'stk_aisha', done: true },
      ],
    }, 40);
    put('rel_dec', 'release', { title: 'ServiceHub 2026.12 — Access request portal', version: '2026.12', targetDate: d(55), status: 'planning', tier: 'tier-2', betIds: ['bet_portal'], goals: 'Catalog-based access requests with policy routing.', checklist: [{ id: 'c1', area: 'Service desk', item: 'Help-centre article', ownerId: 'stk_tomas', done: false }] }, 20);
    put('rel_oct', 'release', { title: 'ServiceHub 2026.10 — SSO wave 3', version: '2026.10', targetDate: d(-22), releasedAt: d(-20), status: 'released', tier: 'tier-3', betIds: ['bet_sso'], checklist: [{ id: 'c1', area: 'Service desk', item: 'Help-centre article', ownerId: 'stk_tomas', done: true }] }, 100);

    const RAID = (id: string, data: Record<string, unknown>, daysAgo = 20) => put(`raid_${id}`, 'raid', data, daysAgo);
    RAID('jobcodes', { kind: 'risk', title: 'Inconsistent Workday job codes assign the wrong access', description: '140 job codes, 30% used inconsistently across regions.', probability: 4, impact: 5, ownerId: 'stk_hannah', mitigation: 'Clean up job codes with HR before the pilot; manager review of the summary.', status: 'mitigating', dueDate: d(10), relatedIds: ['bet_jml'] });
    RAID('mfafatigue', { kind: 'risk', title: 'MFA fatigue — users approve push prompts they didn\'t start', probability: 3, impact: 4, ownerId: 'stk_dana', mitigation: 'Number matching on all prompts.', status: 'mitigating', relatedIds: ['bet_sspr'] });
    RAID('promise', { kind: 'risk', title: 'Sales promises day-one access before the pilot is proven', probability: 4, impact: 5, ownerId: 'stk_daniel', mitigation: '', status: 'open', relatedIds: ['bet_jml'] }, 15);
    RAID('ldap', { kind: 'issue', title: 'Legacy LDAP sync fails nightly for 3% of users', probability: 5, impact: 4, ownerId: 'stk_priya', mitigation: 'Daily report of failed users to the service desk until scripts are retired.', status: 'open', relatedIds: ['bet_jml', 'bet_ldap'] }, 12);
    RAID('connector', { kind: 'dependency', title: 'Keyline Identity: Workday connector v2', externalTeam: 'Keyline Identity (vendor)', probability: 3, impact: 4, ownerId: 'stk_raj', status: 'open', dueDate: d(5), relatedIds: ['bet_jml'] });
    RAID('autopilot', { kind: 'dependency', title: 'Endpoint team: Autopilot profiles per department', externalTeam: 'Infrastructure', probability: 3, impact: 3, ownerId: 'stk_grace', status: 'open', dueDate: d(4), relatedIds: ['bet_zerotouch', 'bet_jml'] });
    RAID('summary', { kind: 'assumption', title: 'Managers review access summaries within 2 days', probability: 2, impact: 3, ownerId: 'stk_me', status: 'open', relatedIds: ['bet_jml'] });
    RAID('keyperson', { kind: 'risk', title: 'Only one engineer understands the provisioning scripts', probability: 3, impact: 4, ownerId: 'stk_priya', mitigation: 'Pair on every provisioning change; runbook by end of month.', status: 'mitigating', relatedIds: ['bet_ldap'] });
    RAID('flaky', { kind: 'issue', title: 'E2E suite flaky — releases delayed by a day', probability: 4, impact: 2, ownerId: 'stk_priya', status: 'closed', mitigation: 'Quarantined 11 flaky tests.' }, 60);

    const TC = (id: string, data: Record<string, unknown>) => put(`tc_${id}`, 'testCase', data, 10);
    TC('1', { title: 'New hire has accounts 3 days before start', kind: 'uat', storyIds: ['st_j2'], requirementIds: ['req_birthright'], releaseId: 'rel_nov', steps: '1. Create test hire in Workday sandbox, start in 5 days\n2. Wait for job', expected: 'Identity and mailbox exist 3 business days before start', status: 'pass', testerId: 'stk_tomas', executedAt: d(-5) });
    TC('2', { title: 'Account executive gets the right package', kind: 'uat', storyIds: ['st_j4'], requirementIds: ['req_packages'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_tomas', executedAt: d(-4) });
    TC('3', { title: 'Manager receives Teams summary', kind: 'uat', storyIds: ['st_j5'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_daniel', executedAt: d(-4) });
    TC('4', { title: 'Leaver disabled within 1 hour', kind: 'uat', storyIds: ['st_j6'], requirementIds: ['req_leaver'], releaseId: 'rel_nov', expected: 'All accounts disabled within 60 minutes', status: 'fail', testerId: 'stk_kim', executedAt: d(-3) });
    TC('5', { title: 'Mover loses old access after 14 days', kind: 'acceptance', storyIds: ['st_j7'], requirementIds: ['req_mover'], releaseId: 'rel_nov', status: 'not-run' });
    TC('6', { title: 'Grant and revoke appear in the audit log', kind: 'uat', storyIds: ['st_j8'], requirementIds: ['req_auditlog'], releaseId: 'rel_nov', status: 'blocked', testerId: 'stk_kim' });
    TC('7', { title: 'Reset password with authenticator app', kind: 'uat', storyIds: ['st_s1'], requirementIds: ['req_reset'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_tomas', executedAt: d(-10) });
    TC('8', { title: 'Unlock account without a ticket', kind: 'uat', storyIds: ['st_s2'], requirementIds: ['req_unlock'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_olivia', executedAt: d(-9) });
    TC('9', { title: 'Sessions end within 60 seconds of reset', kind: 'acceptance', storyIds: ['st_s3'], requirementIds: ['req_revoke'], releaseId: 'rel_nov', status: 'fail', executedAt: d(-2) });
    TC('10', { title: 'Self-service locks after 5 failures', kind: 'acceptance', storyIds: ['st_s4'], requirementIds: ['req_lockout'], releaseId: 'rel_nov', status: 'not-run' });
    TC('11', { title: 'SoD conflict is blocked', kind: 'uat', storyIds: ['st_j11'], requirementIds: ['req_sod'], releaseId: 'rel_nov', status: 'not-run', testerId: 'stk_kim' });
    TC('12', { title: 'Portal loads in under 2 seconds', kind: 'regression', status: 'not-run' });

    const BUG = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`bug_${id}`, 'defect', data, daysAgo);
    BUG('movers', { title: 'Movers lose old access on day one instead of after 14 days', severity: 's2-major', status: 'in-progress', foundIn: 'uat', rootCause: 'requirement', storyId: 'st_j7', requirementId: 'req_mover', releaseId: 'rel_nov', reportedAt: d(-3), detail: 'The spec did not say when the 14 days start (job change date vs effective date).' }, 3);
    BUG('rehire', { title: 'Rehires get a second identity', severity: 's2-major', status: 'triaged', foundIn: 'uat', rootCause: 'requirement', storyId: 'st_j2', requirementId: 'req_birthright', releaseId: 'rel_nov', reportedAt: d(-4), detail: 'Rehire scenario was never specified.' }, 4);
    BUG('leaver', { title: 'Leaver job runs every 2 hours, not hourly', severity: 's2-major', status: 'new', foundIn: 'uat', rootCause: 'code', storyId: 'st_j6', requirementId: 'req_leaver', releaseId: 'rel_nov', reportedAt: d(-3) }, 3);
    BUG('sessions', { title: 'Session revoke takes up to 5 minutes', severity: 's3-minor', status: 'new', foundIn: 'staging', rootCause: 'design', storyId: 'st_s3', requirementId: 'req_revoke', releaseId: 'rel_nov', reportedAt: d(-2) }, 2);
    BUG('copy', { title: 'Reset email shows the old service desk number', severity: 's4-trivial', status: 'new', foundIn: 'review', rootCause: 'code', storyId: 'st_s1', reportedAt: d(-1) }, 1);
    BUG('ssoloop', { title: 'SSO login loop for one CRM region', severity: 's3-minor', status: 'verified', foundIn: 'production', rootCause: 'code', featureId: 'feat_sso', reportedAt: d(-15) }, 15);

    // ---------------- Learn ----------------
    const F = (id: string, data: Record<string, unknown>) => put(`feat_${id}`, 'feature', data, 300);
    F('portal', { name: 'Ticket portal', status: 'ga', launchedAt: d(-900), adoption: 91, adoptionTrend: 'flat', maintenanceCost: 'medium', plan: 'all', ownerId: 'stk_tomas' });
    F('catalog', { name: 'Service catalog', status: 'ga', launchedAt: d(-120), adoption: 78, adoptionTrend: 'rising', maintenanceCost: 'low', plan: 'all', betIds: ['bet_catalog'] });
    F('sso', { name: 'SSO app launcher', status: 'ga', launchedAt: d(-20), adoption: 84, adoptionTrend: 'rising', maintenanceCost: 'low', plan: 'all', betIds: ['bet_sso'] });
    F('chatbot', { name: 'IT chatbot v1', status: 'ga', launchedAt: d(-200), adoption: 4, adoptionTrend: 'falling', maintenanceCost: 'high', plan: 'all', betIds: ['bet_chatbot'], description: 'Rule-based chatbot on the portal home page.' });
    F('laptopform', { name: 'Laptop request form', status: 'ga', launchedAt: d(-600), adoption: 35, adoptionTrend: 'flat', maintenanceCost: 'low', plan: 'all', sunsetPlan: 'Replace with zero-touch provisioning; keep for replacements.' });
    F('ldappage', { name: 'Legacy LDAP self-service page', status: 'deprecated', launchedAt: d(-1600), adoption: 9, adoptionTrend: 'falling', maintenanceCost: 'high', plan: 'all', sunsetPlan: 'Switch off when SSPR reaches all office workers (2026.11).' });
    F('assets', { name: 'Asset tracking', status: 'beta', launchedAt: d(-60), adoption: 22, adoptionTrend: 'rising', maintenanceCost: 'medium', plan: 'all' });
    F('status', { name: 'Service status page', status: 'ga', launchedAt: d(-400), adoption: 12, adoptionTrend: 'flat', maintenanceCost: 'low', plan: 'all' });

    put('bc_jml', 'businessCase', { title: 'Automated JML', betId: 'bet_jml', years: 3, discountRate: 8, oneTimeCost: 220000, annualCost: 30000, annualBenefit: 640000, rampUp: '35, 80, 100', costOfDelayPerWeek: 12000, status: 'submitted', assumptions: 'Productivity: 600 hires × 1.5 days saved × $400/day = $360k.\nService desk: 2,000 fewer tickets × $25 = $50k.\nAudit: avoided remediation and findings ≈ $230k.' }, 30);
    put('bc_sspr', 'businessCase', { title: 'Self-service password reset', betId: 'bet_sspr', years: 3, discountRate: 8, oneTimeCost: 60000, annualCost: 12000, annualBenefit: 210000, rampUp: '60, 100, 100', costOfDelayPerWeek: 4000, status: 'approved', assumptions: '1,100 fewer tickets/month × $15 + 4 hours of lost work per lockout.' }, 70);
    put('bc_reviews', 'businessCase', { title: 'Automated access reviews', betId: 'bet_reviews', years: 3, discountRate: 8, oneTimeCost: 90000, annualCost: 20000, annualBenefit: 150000, rampUp: '50, 100, 100', costOfDelayPerWeek: 5000, status: 'draft' }, 20);

    // ---------------- Working with people ----------------
    const I = (id: string, data: Record<string, unknown>) => put(`int_${id}`, 'interaction', data, 5);
    I('d1', { title: 'January cohort planning', date: d(-60), stakeholderIds: ['stk_daniel'], kind: '1:1', sentiment: 1, summary: 'Excited about automated onboarding.' });
    I('d2', { title: 'Sales kickoff prep', date: d(-40), stakeholderIds: ['stk_daniel'], kind: 'meeting', sentiment: 0 });
    I('d3', { title: 'Provisioning SLA discussion', date: d(-25), stakeholderIds: ['stk_daniel', 'stk_priya'], kind: 'meeting', sentiment: -1, summary: 'Sales wants 5 minutes; engineering says 15 at p95.', followUps: 'Change request with load data.' });
    I('d4', { title: 'Escalation: laptops for the December hires', date: d(-11), stakeholderIds: ['stk_daniel'], kind: 'call', sentiment: -1, summary: 'Two reps started without laptops.' });
    I('d5', { title: 'Weekly sync', date: d(-4), stakeholderIds: ['stk_daniel'], kind: '1:1', sentiment: -2, summary: '"I promised my reps day-one access. Can IT deliver?"', followUps: 'Show the forecast and the pilot plan.' });
    I('m1', { title: 'IT steering — September', date: d(-50), stakeholderIds: ['stk_morgan', 'stk_dana'], kind: 'steering', sentiment: 1 });
    I('m2', { title: 'Board update prep', date: d(-10), stakeholderIds: ['stk_morgan'], kind: 'meeting', sentiment: 1 });
    I('dn1', { title: 'Security review of JML design', date: d(-15), stakeholderIds: ['stk_dana', 'stk_priya'], kind: 'meeting', sentiment: 0, summary: 'Wants managers\' approvals limited to standard access.' });
    I('h1', { title: 'Job code clean-up', date: d(-20), stakeholderIds: ['stk_hannah'], kind: 'meeting', sentiment: 0, summary: 'HR worried about being blamed for wrong access.' });
    I('k1', { title: 'Q3 audit findings walkthrough', date: d(-35), stakeholderIds: ['stk_kim'], kind: 'meeting', sentiment: -1 });
    I('p1', { title: 'Refinement prep', date: d(-8), stakeholderIds: ['stk_priya'], kind: '1:1', sentiment: 1 });
    I('p2', { title: 'Release planning', date: d(-2), stakeholderIds: ['stk_priya'], kind: '1:1', sentiment: 1 });
    I('t1', { title: 'SSPR pilot results', date: d(-5), stakeholderIds: ['stk_tomas'], kind: 'meeting', sentiment: 2, summary: 'Pilot cut Finance password tickets by 70%.' });
    I('o1', { title: 'Warehouse floor visit', date: d(-14), stakeholderIds: ['stk_olivia', 'stk_aisha'], kind: 'workshop', sentiment: 1, relatedIds: ['eli_warehouse'] });
    I('o2', { title: 'PIN prototype feedback', date: d(-3), stakeholderIds: ['stk_olivia'], kind: 'demo', sentiment: 2 });
    I('e1', { title: 'Retention question', date: d(-40), stakeholderIds: ['stk_elena'], kind: 'email', sentiment: 0 });
    I('mk1', { title: 'Architecture review: access packages', date: d(-25), stakeholderIds: ['stk_marcus'], kind: 'meeting', sentiment: 1 });
    I('n1', { title: 'CAB pre-read', date: d(-7), stakeholderIds: ['stk_noah'], kind: 'email', sentiment: 0 });
    I('l1', { title: 'Tracking plan', date: d(-13), stakeholderIds: ['stk_lucas'], kind: 'chat', sentiment: 1 });
    I('a1', { title: 'Design critique: manager summary', date: d(-6), stakeholderIds: ['stk_aisha'], kind: 'meeting', sentiment: 1 });
    I('r1', { title: 'Connector roadmap call', date: d(-35), stakeholderIds: ['stk_raj'], kind: 'call', sentiment: 0 });
    I('s1', { title: 'Licence report scope', date: d(-30), stakeholderIds: ['stk_sofia'], kind: 'email', sentiment: 0 });

    const RQ = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`rq_${id}`, 'request', { receivedAt: d(-daysAgo), ...data }, daysAgo);
    RQ('hannah', { title: 'Stop asking HR to re-enter hires in IT forms', requesterId: 'stk_hannah', priority: 'high', status: 'planned', betId: 'bet_jml', evidenceIds: ['ev_8'], responseNote: 'Automated from Workday events in 2026.11.' }, 45);
    RQ('olivia', { title: 'Password reset for staff without email or phone', requesterId: 'stk_olivia', priority: 'high', status: 'triaging', respondBy: d(-2), evidenceIds: ['ev_16'] }, 14);
    RQ('daniel', { title: 'Laptops shipped before the start date for sales hires', requesterId: 'stk_daniel', priority: 'critical', status: 'accepted', betId: 'bet_zerotouch', respondBy: d(-5) }, 30);
    RQ('tomas', { title: 'Deflect password tickets', requesterId: 'stk_tomas', priority: 'high', status: 'planned', betId: 'bet_sspr' }, 80);
    RQ('kim', { title: 'Evidence export of access reviews for SOX', requesterId: 'stk_kim', priority: 'high', status: 'accepted', betId: 'bet_reviews', respondBy: d(7) }, 25);
    RQ('dana', { title: 'MFA on all SaaS sign-ins', requesterId: 'stk_dana', priority: 'high', status: 'done', betId: 'bet_sso', loopClosed: false }, 120);
    RQ('marcus', { title: 'Architecture review slot for the portal', requesterId: 'stk_marcus', priority: 'medium', status: 'new', respondBy: d(3) }, 4);
    RQ('morgan', { title: 'One-page onboarding update for the exec team', requesterId: 'stk_morgan', priority: 'high', status: 'new', respondBy: d(1) }, 2);
    RQ('raj', { title: 'Feedback on the connector beta', requesterId: 'stk_raj', priority: 'medium', status: 'new', respondBy: d(-5) }, 15);
    RQ('sofia', { title: 'Report unused SaaS licences', requesterId: 'stk_sofia', priority: 'medium', status: 'accepted', respondBy: d(10) }, 20);
    RQ('lucas', { title: 'Tracking events for portal search', requesterId: 'stk_lucas', priority: 'low', status: 'new', respondBy: d(2) }, 3);
    RQ('chatbot', { title: 'Keep the chatbot — Support likes it', requesterId: 'stk_tomas', priority: 'low', status: 'declined', responseNote: '4% adoption; replaced by answer-first search.', loopClosed: true }, 60);

    const CM = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`com_${id}`, 'commitment', { status: 'open', ...data }, daysAgo);
    CM('cohort', { title: 'Day-one access for the January sales cohort (120 reps)', toId: 'stk_daniel', promisedById: 'stk_me', account: 'Sales', dueDate: d(14), betId: 'bet_jml', releaseId: 'rel_nov', notes: 'Promised in the sales kickoff planning.' }, 30);
    CM('sox', { title: 'SOX ITGC evidence pack for the Q4 audit', toId: 'stk_kim', promisedById: 'stk_me', account: 'Internal Audit', dueDate: d(3), betId: 'bet_jml' }, 20);
    CM('warehouse', { title: 'Self-service unlock live for warehouse shifts', toId: 'stk_olivia', promisedById: 'stk_tomas', account: 'Warehouse Ops', dueDate: d(12), betId: 'bet_sspr' }, 14);
    CM('reviewdemo', { title: 'Access review automation demo for the CISO', toId: 'stk_dana', promisedById: 'stk_me', dueDate: d(5) }, 9);
    CM('portal', { title: 'Access request portal for Finance before year end', toId: 'stk_sofia', promisedById: 'stk_me', account: 'Finance', dueDate: d(60), betId: 'bet_portal' }, 20);
    CM('ssocrm', { title: 'SSO for the CRM', toId: 'stk_daniel', promisedById: 'stk_me', account: 'Sales', dueDate: d(-25), betId: 'bet_sso', status: 'kept' }, 100);

    put('raci_jml', 'raci', {
      title: 'Automated JML — RACI', scopeId: 'bet_jml',
      activities: ['Define access packages', 'Approve PRD', 'Security review', 'HR data quality', 'Build & test', 'Change approval (CAB)', 'Pilot with Sales', 'Communications'],
      memberIds: ['stk_me', 'stk_priya', 'stk_dana', 'stk_hannah', 'stk_daniel', 'stk_tomas', 'stk_noah', 'stk_elena', 'stk_marcus'],
      assignments: {
        'Define access packages': { stk_me: 'A', stk_marcus: 'R', stk_priya: 'C', stk_dana: 'C', stk_hannah: 'C', stk_tomas: 'I' },
        'Approve PRD': { stk_me: 'R', stk_priya: 'A', stk_dana: 'C', stk_elena: 'C', stk_daniel: 'C' },
        'Security review': { stk_dana: 'A', stk_priya: 'R', stk_elena: 'C', stk_daniel: 'C' },
        'HR data quality': { stk_hannah: 'A', stk_me: 'A', stk_priya: 'C' },
        'Build & test': { stk_priya: 'A', stk_me: 'C', stk_tomas: 'C', stk_daniel: 'I' },
        'Change approval (CAB)': { stk_noah: 'A', stk_priya: 'R', stk_me: 'I' },
        'Pilot with Sales': { stk_me: 'A', stk_tomas: 'R', stk_daniel: 'C' },
        Communications: { stk_tomas: 'R', stk_daniel: 'C', stk_me: 'I' },
      },
    }, 30);
    put('raci_sspr', 'raci', {
      title: 'Password self-service — RACI', scopeId: 'bet_sspr', activities: ['Requirements', 'Security design', 'Build', 'Rollout & registration'], memberIds: ['stk_me', 'stk_dana', 'stk_tomas', 'stk_priya'],
      assignments: { Requirements: { stk_me: 'A', stk_tomas: 'C', stk_dana: 'C' }, 'Security design': { stk_dana: 'A', stk_priya: 'R', stk_me: 'I' }, Build: { stk_priya: 'A', stk_me: 'C' }, 'Rollout & registration': { stk_tomas: 'A', stk_me: 'R' } },
    }, 60);

    put('appr_prd', 'approval', { title: 'Approve JML PRD (v2)', subjectId: 'spec_jml', requestedById: 'stk_me', dueDate: d(2), approvers: [
      { stakeholderId: 'stk_priya', status: 'approved', at: d(-3), comment: 'Feasible with access packages.' },
      { stakeholderId: 'stk_dana', status: 'pending' },
      { stakeholderId: 'stk_hannah', status: 'pending' },
      { stakeholderId: 'stk_elena', status: 'pending' },
    ] }, 5);
    put('appr_baseline', 'approval', { title: 'Requirements baseline v1 (JML)', subjectId: 'base_jml1', requestedById: 'stk_priya', dueDate: d(-1), approvers: [
      { stakeholderId: 'stk_priya', status: 'approved', at: d(-11) }, { stakeholderId: 'stk_me', status: 'pending' },
    ] }, 12);
    put('appr_golive', 'approval', { title: 'Go / no-go: ServiceHub 2026.11', subjectId: 'rel_nov', requestedById: 'stk_me', dueDate: d(19), approvers: [
      { stakeholderId: 'stk_priya', status: 'pending' }, { stakeholderId: 'stk_tomas', status: 'pending' }, { stakeholderId: 'stk_dana', status: 'pending' }, { stakeholderId: 'stk_me', status: 'pending' },
    ] }, 2);
    put('appr_cab', 'approval', { title: 'CAB: SSPR production change', subjectId: 'rel_nov', requestedById: 'stk_me', dueDate: d(-2), approvers: [{ stakeholderId: 'stk_noah', status: 'pending' }] }, 8);
    put('appr_sspr', 'approval', { title: 'Approve SSPR spec', subjectId: 'spec_sspr', requestedById: 'stk_me', dueDate: d(-40), approvers: [{ stakeholderId: 'stk_dana', status: 'approved', at: d(-41) }, { stakeholderId: 'stk_tomas', status: 'approved', at: d(-42) }] }, 45);

    put('cf_mfa', 'conflict', { title: 'MFA on every sign-in vs fast shift starts', partyIds: ['stk_dana', 'stk_olivia'], description: 'Security wants MFA everywhere; Warehouse Ops has shared scanners and no phones.', positions: 'Security: MFA on every sign-in, no exceptions.\nWarehouse: no MFA on scanners — shifts can\'t wait.', interests: 'Security: prove who did what; stop credential theft.\nWarehouse: start on time; no lost pay.\nShared: nobody signs in as someone else.', status: 'negotiating', raisedAt: d(-12) }, 12);
    put('cf_mailbox', 'conflict', { title: 'Leaver mailboxes: 30 days (DPO) vs 90 days (handover)', partyIds: ['stk_elena', 'stk_tomas'], positions: 'DPO: delete after 30 days (data minimisation).\nService desk & managers: keep 90 days for handovers.', interests: 'DPO: lawful basis and minimisation.\nManagers: don\'t lose customer history.', status: 'open', raisedAt: d(-2) }, 2);
    put('cf_chatbot', 'conflict', { title: 'Retire the chatbot', partyIds: ['stk_tomas', 'stk_me'], status: 'resolved', resolution: 'Retire after answer-first search ships; content moves to knowledge articles.', raisedAt: d(-70) }, 70);

    put('cm_weekly', 'commsItem', { title: 'Weekly ServiceHub update', audienceIds: ['stk_tomas', 'stk_daniel', 'stk_hannah', 'stk_olivia'], audience: 'Service desk, Sales Ops, HR, Warehouse', channel: 'teams', frequency: 'weekly', ownerId: 'stk_me', lastSent: d(-9), format: 'Teams post: shipped, next, dates (85%)' }, 100);
    put('cm_steer', 'commsItem', { title: 'Monthly IT steering pack', audienceIds: ['stk_morgan', 'stk_dana', 'stk_hannah', 'stk_daniel'], channel: 'meeting', frequency: 'monthly', ownerId: 'stk_me', lastSent: d(-20), format: 'Steering pack (generated)' }, 100);
    put('cm_pilot', 'commsItem', { title: 'JML pilot update for Sales managers', audienceIds: ['stk_daniel'], audience: 'Sales managers', channel: 'email', frequency: 'biweekly', ownerId: 'stk_me', lastSent: d(-16), format: 'Short email + 2-minute video' }, 60);
    put('cm_notes', 'commsItem', { title: 'Release notes', audience: 'All employees', channel: 'teams', frequency: 'per-release', ownerId: 'stk_me', format: 'Release notes (generated)' }, 100);
    put('cm_desk', 'commsItem', { title: 'Service desk briefing', audienceIds: ['stk_tomas'], channel: 'meeting', frequency: 'per-release', ownerId: 'stk_me' }, 100);

    put('mtg_refine', 'meeting', {
      title: 'Refinement — Automated JML', kind: 'refinement', date: d(-6), attendeeIds: ['stk_me', 'stk_priya', 'stk_aisha', 'stk_tomas'], relatedIds: ['bet_jml', 'spec_jml'],
      agenda: '1. Mover clean-up timing (REQ-6)\n2. Rehires\n3. Provisioning status for managers',
      notes: '- Decision: the 14-day mover period starts on the effective date of the job change\n- Action: @priya to add the rehire story by Friday\n- Action: @tomas to draft the agent briefing next week\n- Risk: job codes are inconsistent across regions\n- What happens to access when a hire withdraws before day one?',
      actions: [
        { id: 'a1', text: 'Add the rehire story', ownerId: 'stk_priya', due: d(-3), done: true },
        { id: 'a2', text: 'Draft the agent briefing', ownerId: 'stk_tomas', due: d(1), done: false },
        { id: 'a3', text: 'Confirm mailbox retention with the DPO', ownerId: 'stk_me', due: d(-1), done: false },
      ],
    }, 6);
    put('mtg_steer', 'meeting', {
      title: 'IT steering — October', kind: 'steering', date: d(-20), attendeeIds: ['stk_morgan', 'stk_dana', 'stk_hannah', 'stk_daniel', 'stk_me'], relatedIds: ['obj_dayone', 'obj_audit'],
      notes: '- Agreed: January sales cohort is the JML pilot\n- Action: @hannah to own job code clean-up\n- Concern: onboarding complaints reaching the exec team',
      actions: [{ id: 'a1', text: 'Own job code clean-up', ownerId: 'stk_hannah', due: d(-6), done: false }],
    }, 20);
    put('mtg_review', 'meeting', { title: 'Sprint 42 review', kind: 'sprint-review', date: d(3), attendeeIds: ['stk_me', 'stk_priya', 'stk_tomas', 'stk_daniel'], agenda: 'Demo: leaver deprovisioning, manager summary, SSPR lockout.' }, 1);

    put('rf_1', 'reviewFinding', { specId: 'spec_jml', role: 'security', severity: 'critical', title: 'Who can approve extra access for privileged systems?', detail: 'Manager approval alone is not enough for admin roles.', status: 'resolved', resolution: 'Privileged access needs owner + security approval (approval routing table, R4).', source: 'engine' }, 20);
    put('rf_2', 'reviewFinding', { specId: 'spec_jml', role: 'privacy', severity: 'major', title: 'How long are leaver mailboxes kept?', status: 'converted', resolution: 'Converted to REQ-9 / REQ-10 — now conflicting, see conflicts.', source: 'engine' }, 20);
    put('rf_3', 'reviewFinding', { specId: 'spec_jml', role: 'qa', severity: 'major', title: 'What happens to rehires?', status: 'open', source: 'human', detail: 'Tomás: rehires currently get a second identity.' }, 6);

    put('cmt_1', 'comment', { entityId: 'spec_jml', author: 'Priya Nair', authorId: uid('priya'), body: `@${people.me.name} can we pin the provisioning SLA before sprint 43? The load test is booked.`, mentions: [people.me.id] }, 4);
    put('cmt_2', 'comment', { entityId: 'bet_jml', author: 'Morgan Blake', body: 'This is the one the exec team asks about. Keep the forecast honest.' }, 20);
    put('cmt_3', 'comment', { entityId: 'req_salesla', author: 'Priya Nair', authorId: uid('priya'), body: `${uid('jordan') ? '@Jordan Kim ' : ''}Contradicts REQ-4. Needs a decision, not two requirements.`, mentions: uid('jordan') ? [uid('jordan')] : [] }, 8);
  });
}
