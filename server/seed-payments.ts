import type { Store } from './db.ts';
import type { SeedPeople } from './seed.ts';
import { addDays, seededRandom } from '../core/util.ts';

/**
 * SaaS sample workspace: "Ledgerly", a fictional accounts-payable
 * product sold to finance teams. All names and companies are fictional. Dates
 * are relative to `now`, so overdue touchpoints and at-risk promises are live.
 */
export function seedPaymentsWorkspace(store: Store, now: Date, people: SeedPeople) {
  const d = (n: number) => addDays(now, n);
  const ts = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  const put = (id: string, type: string, data: Record<string, unknown>, createdDaysAgo = 30) =>
    store.create(type, data, 'seed', { id, createdAt: ts(createdDaysAgo), skipActivity: true });

  store.transaction(() => {
    store.setSettings({
      workspaceName: 'Ledgerly', productName: 'Ledgerly', currency: '$',
      ourCapabilities: { 'Scheduled export': 1, 'SSO / SAML': 0, 'Audit log': 1, 'Auto payment matching': 0, 'Multi-entity': 0, 'Mobile approvals': 1, 'Supplier portal': 0, 'ERP integrations': 2 },
    });

    // ---------------- Stakeholders ----------------
    const S = (id: string, data: Record<string, unknown>) => put(`stk_${id}`, 'stakeholder', data, 200);
    S('me', { name: people.me.name, email: people.me.email, userId: people.me.id, title: people.me.title ?? 'Senior Product Owner', orgUnit: 'Product', kind: 'internal', power: 3, interest: 5, legitimacy: true, currentEngagement: 'leading', desiredEngagement: 'leading', preferredChannel: 'slack' });
    S('maya', { name: 'Maya Chen', title: 'Chief Financial Officer', orgUnit: 'Finance', kind: 'internal', power: 5, interest: 3, legitimacy: true, urgency: false, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Gross margin above 70%\nPredictable, audit-clean revenue\nInfra cost per account flat while usage grows', concerns: 'Infrastructure cost of large exports\nSOX controls on anything touching invoices', preferredChannel: 'meeting', timezone: 'America/New_York', influencedBy: ['stk_elena', 'stk_hiroshi'], email: 'maya.chen@ashgrove.example' });
    S('daniel', { name: 'Daniel Brooks', title: 'VP Sales', orgUnit: 'Sales', kind: 'internal', power: 5, interest: 5, legitimacy: true, urgency: true, currentEngagement: 'resistant', desiredEngagement: 'supportive', goals: 'Close $4.2M new enterprise ARR in Q4\nStop losing security reviews to Arkwell AP', concerns: 'Roadmap dates keep slipping and he has to walk back promises\nExport SLA is weaker than competitors in RFPs', preferredChannel: 'phone', timezone: 'America/Chicago', influencedBy: ['stk_hiroshi', 'stk_olivia'] });
    S('priya', { name: 'Priya Nair', title: 'Engineering Manager, Payments', orgUnit: 'Engineering', kind: 'internal', power: 4, interest: 5, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Sustainable pace; fewer month-end incidents\nRetire the legacy export queue', concerns: 'Scope creep after commitment\nPerformance targets set without load data', preferredChannel: 'slack', influencedBy: ['stk_grace'] });
    S('samuel', { name: 'Samuel Osei', title: 'Head of Customer Support', orgUnit: 'Support', kind: 'internal', power: 3, interest: 5, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'supportive', goals: 'Cut month-end ticket spike\nKnow what ships before customers do', concerns: 'No visibility into release dates\nMacros and docs ready too late', preferredChannel: 'slack' });
    S('elena', { name: 'Elena Petrova', title: 'Legal & Compliance Counsel', orgUnit: 'Legal', kind: 'internal', power: 4, interest: 2, legitimacy: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'No regulatory findings\nClear retention policy for financial records', concerns: 'Invoices must be retained 10 years in Germany\nPersonal data in exported files (GDPR)', preferredChannel: 'email', timezone: 'Europe/Berlin' });
    S('hiroshi', { name: 'Hiroshi Tanaka', title: 'Chief Executive Officer', orgUnit: 'Executive', kind: 'internal', power: 5, interest: 3, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Enterprise segment = 50% of new ARR by 2027\nBoard narrative: "the close in a day"', concerns: 'Enterprise readiness (SSO, audit) lagging competitors', preferredChannel: 'meeting', influencedBy: ['stk_maya', 'stk_daniel'] });
    S('grace', { name: 'Grace Mbeki', title: 'Head of Security', orgUnit: 'Security', kind: 'internal', power: 4, interest: 4, legitimacy: true, urgency: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Zero data-exfiltration incidents\nPass customer security reviews first time', concerns: 'Exports as an exfiltration path\nUnsigned download links', preferredChannel: 'async-doc', influencedBy: ['stk_elena'] });
    S('lucas', { name: 'Lucas Fernández', title: 'Data & Analytics Lead', orgUnit: 'Data', kind: 'internal', power: 2, interest: 4, currentEngagement: 'supportive', desiredEngagement: 'supportive', goals: 'Every bet has a tracking plan before build', concerns: 'Events named inconsistently', preferredChannel: 'slack' });
    S('aisha', { name: 'Aisha Rahman', title: 'UX Lead', orgUnit: 'Design', kind: 'internal', power: 3, interest: 5, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Research before solutions\nAccessible by default (WCAG 2.2 AA)', preferredChannel: 'meeting' });
    S('noah', { name: 'Noah Williams', title: 'Customer Success Lead', orgUnit: 'Customer Success', kind: 'internal', power: 3, interest: 4, currentEngagement: 'supportive', desiredEngagement: 'supportive', goals: 'Net revenue retention > 110%', concerns: 'Pinemoor renewal in January is at risk', preferredChannel: 'slack' });
    S('sofia', { name: 'Sofia Rossi', title: 'Product Marketing Manager', orgUnit: 'Marketing', kind: 'internal', power: 2, interest: 3, currentEngagement: 'neutral', desiredEngagement: 'supportive', preferredChannel: 'email' });
    S('olivia', { name: 'Olivia Hart', title: 'Finance Director', orgUnit: 'Finance', account: 'Halcyon Foods', kind: 'customer', power: 4, interest: 5, legitimacy: true, urgency: true, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Close the books in 3 days instead of 5', concerns: 'Team spends two days exporting and stitching spreadsheets', preferredChannel: 'meeting', timezone: 'Europe/London' });
    S('ben', { name: 'Ben Adler', title: 'Controller', orgUnit: 'Finance', account: 'Pinemoor', kind: 'customer', power: 3, interest: 4, legitimacy: true, urgency: true, currentEngagement: 'resistant', desiredEngagement: 'supportive', goals: 'Audit-ready exports', concerns: 'Evaluating Arkwell AP ahead of the January renewal\nAuditors want PDF exports', preferredChannel: 'email', influencedBy: ['stk_noah'] });
    S('chloe', { name: 'Chloé Martin', title: 'AP Manager', orgUnit: 'Finance', account: 'Kitebird Toys', kind: 'customer', power: 2, interest: 5, legitimacy: true, currentEngagement: 'supportive', desiredEngagement: 'leading', goals: 'Fewer manual approvals', preferredChannel: 'email' });
    S('raj', { name: 'Raj Patel', title: 'Partner Manager', orgUnit: 'Partnerships', account: 'Quillsoft', kind: 'partner', power: 3, interest: 3, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Deeper ERP integration with Ledgerly', preferredChannel: 'email' });
    S('kim', { name: 'Kim Lee', title: 'External Audit Partner', orgUnit: 'Fernhill Audit', kind: 'regulator', power: 4, interest: 2, legitimacy: true, currentEngagement: 'unaware', desiredEngagement: 'neutral', concerns: 'Completeness and immutability of financial records', preferredChannel: 'email' });

    // ---------------- Strategy ----------------
    put('vis_main', 'vision', {
      title: 'Ledgerly', horizon: '2027',
      vision: 'Every finance team closes the books in a day, not a week.',
      targetGroup: 'Finance and accounts-payable teams at mid-market and enterprise companies (50–5,000 employees).',
      needs: 'Pay suppliers on time without chasing approvals\nReconcile invoices and payments without spreadsheets\nPass audits and security reviews without fire drills',
      product: 'AP automation: invoice capture, approvals, payment runs, reconciliation and export.',
      businessGoals: 'Enterprise = 50% of new ARR by 2027\nNet revenue retention > 110%\nGross margin > 70%',
    }, 300);
    put('team_pay', 'team', { name: 'Payments', people: 6, capacity: 72, targetFeature: 60, targetDebt: 25, targetMaintenance: 15 }, 300);
    put('team_plat', 'team', { name: 'Platform', people: 5, capacity: 60, targetFeature: 40, targetDebt: 40, targetMaintenance: 20 }, 300);
    put('team_growth', 'team', { name: 'Growth', people: 4, capacity: 48, targetFeature: 70, targetDebt: 15, targetMaintenance: 15 }, 300);

    put('met_ns', 'metric', { name: 'Invoices paid on time', level: 'north-star', definition: '% of approved invoices paid on or before their due date, all active accounts, trailing 30 days.', current: 71, target: 85, unit: '%', direction: 'up', source: 'Warehouse: fct_invoice_payments', ownerId: 'stk_me' }, 300);
    put('met_close', 'metric', { name: 'Days to close', level: 'input', parentId: 'met_ns', definition: 'Median business days from period end until the account marks the period closed.', current: 5.2, target: 3, unit: 'days', direction: 'down', source: 'Product analytics: period_closed', eventName: 'period_closed', ownerId: 'stk_me' }, 300);
    put('met_approval', 'metric', { name: 'Approval cycle time', level: 'input', parentId: 'met_ns', definition: 'Median hours from invoice submitted to final approval.', current: 46, target: 24, unit: 'hours', direction: 'down', eventName: 'invoice_approved' }, 300);
    put('met_tickets', 'metric', { name: 'Reconciliation tickets / month', level: 'output', parentId: 'met_close', definition: 'Support tickets tagged reconciliation, export or month-end.', current: 340, target: 140, unit: 'tickets', direction: 'down', source: 'Support desk', ownerId: 'stk_samuel' }, 300);
    put('met_exportp95', 'metric', { name: 'Export job p95 duration', level: 'guardrail', parentId: 'met_close', definition: 'p95 seconds from export requested to file ready.', target: 30, unit: 's', direction: 'down', eventName: 'export_completed' }, 120);
    put('met_cost', 'metric', { name: 'Infra cost per account', level: 'guardrail', definition: 'Monthly infrastructure cost divided by active accounts.', current: 4.1, target: 4.5, unit: '$/month', direction: 'down', ownerId: 'stk_maya' }, 300);
    put('met_secpass', 'metric', { name: 'Security review pass rate', level: 'input', definition: '% of enterprise deals that pass the customer security review without exceptions.', current: 60, target: 90, unit: '%', direction: 'up', ownerId: 'stk_grace' }, 200);
    put('met_wau', 'metric', { name: 'Weekly active finance users', level: 'health', current: 8200, target: 10000, unit: 'users', direction: 'up' }, 300);

    put('obj_close', 'objective', { title: 'Make month-end close effortless for finance teams', period: '2026-Q4', pillar: 'Close in a day', ownerId: 'stk_me', status: 'at-risk', description: 'Month-end is when customers feel the most pain and when churn decisions are made.' }, 90);
    put('obj_ent', 'objective', { title: 'Win the enterprise segment', period: '2026-Q4', pillar: 'Enterprise ready', ownerId: 'stk_daniel', status: 'on-track' }, 90);
    put('obj_appr', 'objective', { title: 'Approvals happen in hours, not days', period: '2026-Q4', pillar: 'Close in a day', ownerId: 'stk_me', status: 'on-track' }, 90);
    put('kr_close', 'keyResult', { title: 'Median days-to-close from 5.2 to 3.5', objectiveId: 'obj_close', metricId: 'met_close', baseline: 5.2, target: 3.5, current: 4.9, unit: 'days', dueDate: d(67), confidence: 45 }, 90);
    put('kr_tickets', 'keyResult', { title: 'Reconciliation tickets from 340 to 200 per month', objectiveId: 'obj_close', metricId: 'met_tickets', baseline: 340, target: 200, current: 318, unit: 'tickets', dueDate: d(67), confidence: 35 }, 90);
    put('kr_sched', 'keyResult', { title: '40% of active accounts use scheduled export', objectiveId: 'obj_close', baseline: 0, target: 40, current: 0, unit: '%', dueDate: d(67), confidence: 55 }, 90);
    put('kr_sec', 'keyResult', { title: 'Pass security review in 90% of enterprise deals', objectiveId: 'obj_ent', metricId: 'met_secpass', baseline: 60, target: 90, current: 64, unit: '%', dueDate: d(67), confidence: 60 }, 90);
    put('kr_arr', 'keyResult', { title: 'Close $4.2M new enterprise ARR', objectiveId: 'obj_ent', baseline: 0, target: 4.2, current: 2.6, unit: '$M', dueDate: d(67), confidence: 50 }, 90);
    put('kr_appr', 'keyResult', { title: 'Median approval cycle time from 46h to 24h', objectiveId: 'obj_appr', metricId: 'met_approval', baseline: 46, target: 24, current: 40, unit: 'hours', dueDate: d(67), confidence: 65 }, 90);

    put('cmp_ledger', 'competitor', { name: 'Arkwell AP', positioning: 'Enterprise AP suite, strong compliance story', strengths: 'SSO, audit, scheduled exports, SOC 2 Type II\nLarge partner ecosystem', weaknesses: 'Expensive; 6-month implementations\nDated approval UX', pricing: '$$$ — per-entity licensing', threat: 5, capabilities: { 'Scheduled export': 3, 'SSO / SAML': 3, 'Audit log': 3, 'Auto payment matching': 2, 'Multi-entity': 3, 'Mobile approvals': 1, 'Supplier portal': 2, 'ERP integrations': 3 } }, 200);
    put('cmp_bill', 'competitor', { name: 'Tallypenny', positioning: 'Low-cost AP for small businesses', strengths: 'Self-serve onboarding, cheap', weaknesses: 'No enterprise controls', pricing: '$ — per user', threat: 3, capabilities: { 'Scheduled export': 1, 'SSO / SAML': 0, 'Audit log': 1, 'Auto payment matching': 1, 'Multi-entity': 0, 'Mobile approvals': 3, 'Supplier portal': 1, 'ERP integrations': 1 } }, 200);
    put('cmp_pay', 'competitor', { name: 'Matchbay', positioning: 'Mid-market AP with best-in-class reconciliation', strengths: 'Automatic matching\nFast exports', weaknesses: 'Weak approvals; no mobile', pricing: '$$ — per invoice volume', threat: 4, capabilities: { 'Scheduled export': 2, 'SSO / SAML': 2, 'Audit log': 2, 'Auto payment matching': 3, 'Multi-entity': 1, 'Mobile approvals': 0, 'Supplier portal': 0, 'ERP integrations': 2 } }, 200);
    const WL = (id: string, data: Record<string, unknown>) => put(`wl_${id}`, 'winLoss', data, 20);
    WL('stonebridge', { title: 'Stonebridge Bank — AP platform', account: 'Stonebridge Bank', outcome: 'lost', reason: 'security-compliance', amount: 310000, date: d(-40), competitorId: 'cmp_ledger', featureGap: 'SSO (SAML), audit log export', notes: 'Failed security questionnaire on SSO and audit trail.' });
    WL('blueyonder', { title: 'Skylark Airways — expansion', account: 'Skylark Airways', outcome: 'lost', reason: 'missing-feature', amount: 200000, date: d(-75), competitorId: 'cmp_ledger', featureGap: 'Multi-entity consolidation' });
    WL('marlow', { title: 'Marlow Health', account: 'Marlow Health', outcome: 'won', reason: 'product-fit', amount: 85000, date: d(-30) });
    WL('calder', { title: 'Calder Research', account: 'Calder Research', outcome: 'won', reason: 'product-fit', amount: 48000, date: d(-55) });
    WL('fernhill', { title: 'Fernhill renewal + upsell', account: 'Fernhill', outcome: 'no-decision', reason: 'timing', amount: 72000, date: d(-20) });
    WL('summitline', { title: 'Summitline Ski', account: 'Summitline Ski', outcome: 'lost', reason: 'price', amount: 12000, date: d(-62), competitorId: 'cmp_bill' });
    WL('adventure', { title: 'Trailmark Outdoors — AP automation', account: 'Trailmark Outdoors', outcome: 'won', reason: 'relationship', amount: 150000, date: d(-15), notes: 'Won on the promise of audit log export before their security review.' });
    WL('fourth', { title: 'Daybreak Coffee', account: 'Daybreak Coffee', outcome: 'lost', reason: 'competitor', amount: 15000, date: d(-35), competitorId: 'cmp_pay', featureGap: 'Automatic payment matching' });
    WL('margie', { title: "Pennant Travel", account: "Pennant Travel", outcome: 'won', reason: 'price', amount: 11000, date: d(-48) });

    put('td_queue', 'techDebt', { title: 'Legacy export queue drops jobs longer than 5 minutes', area: 'Exports', description: 'Jobs exceeding 5 min are silently re-queued and eventually dropped.', businessImpact: 'Large customers never receive exports; drives month-end tickets.', interest: 'high', effort: 6, teamId: 'team_plat', status: 'scheduled' }, 120);
    put('td_pdf', 'techDebt', { title: 'Monolithic PDF renderer', area: 'Documents', businessImpact: 'Every invoice template change takes a week.', interest: 'medium', effort: 8, teamId: 'team_pay', status: 'identified' }, 200);
    put('td_idem', 'techDebt', { title: 'No idempotency keys on payment runs', area: 'Payments', businessImpact: 'Retries can double-pay suppliers (two near-misses this year).', interest: 'high', effort: 4, teamId: 'team_pay', status: 'identified' }, 90);
    put('td_e2e', 'techDebt', { title: 'Flaky end-to-end suite (35 min)', area: 'Quality', businessImpact: 'Slows every release; teams skip it under pressure.', interest: 'medium', effort: 5, teamId: 'team_plat', status: 'in-progress' }, 60);

    // ---------------- Discover ----------------
    put('per_fiona', 'persona', { name: 'Fiona, Finance Controller', role: 'Financial controller', segment: 'mid-market', goals: 'Close the period quickly and accurately\nAudit-ready records', pains: 'Exports are per-page and incomplete\nStitching spreadsheets from three systems', jobs: 'When the month ends, I want every invoice and payment in one reconciled file, so I can close in a day.', quote: 'Month-end is two days of copy-paste.' }, 200);
    put('per_arjun', 'persona', { name: 'Arjun, AP Clerk', role: 'Accounts payable specialist', segment: 'mid-market', goals: 'Process invoices without chasing people', pains: 'Approvers ignore emails\nDuplicate invoices from suppliers', jobs: 'When an invoice is stuck, I want to nudge the right approver, so suppliers get paid on time.' }, 200);
    put('per_dana', 'persona', { name: 'Dana, Department Approver', role: 'Budget holder', segment: 'enterprise', goals: 'Approve quickly, from anywhere', pains: 'Has to log in on a laptop to approve one invoice', jobs: 'When I am between meetings, I want to approve invoices from my phone, so I am not the bottleneck.' }, 200);
    put('per_sam', 'persona', { name: 'Sam, Supplier', role: 'Supplier accounts receivable', segment: 'smb', goals: 'Know when they will be paid', pains: 'Calls the customer\'s AP team to ask about payment status' }, 200);

    put('opp_close', 'opportunity', { title: 'Finance teams cannot reconcile quickly at month-end', description: 'The close is slow because data must be pulled out of Ledgerly and matched by hand.', metricId: 'met_close', objectiveId: 'obj_close', personaIds: ['per_fiona'], status: 'prioritized' }, 150);
    put('opp_export', 'opportunity', { title: 'Getting a complete invoice export takes hours of manual work', parentId: 'opp_close', metricId: 'met_tickets', personaIds: ['per_fiona', 'per_arjun'], status: 'prioritized' }, 150);
    put('opp_match', 'opportunity', { title: 'Payments must be matched to invoices by hand', parentId: 'opp_close', metricId: 'met_close', personaIds: ['per_fiona'], status: 'exploring' }, 150);
    put('opp_approve', 'opportunity', { title: 'Invoices wait days for approvers who are away from their desk', metricId: 'met_approval', objectiveId: 'obj_appr', personaIds: ['per_dana', 'per_arjun'], status: 'prioritized' }, 150);
    put('opp_secure', 'opportunity', { title: 'Enterprise buyers cannot pass their security review', description: 'SSO and audit evidence are table stakes for enterprise procurement.', metricId: 'met_secpass', objectiveId: 'obj_ent', status: 'prioritized' }, 150);
    put('opp_entity', 'opportunity', { title: 'Groups with many subsidiaries cannot consolidate AP', objectiveId: 'obj_ent', status: 'parked' }, 150);
    put('opp_supplier', 'opportunity', { title: 'Suppliers have no visibility into payment status', personaIds: ['per_sam'], status: 'exploring' }, 150);

    const ACC: Record<string, [string, number]> = {
      'Halcyon Foods': ['enterprise', 180000], Pinemoor: ['mid-market', 95000], 'Kitebird Toys': ['mid-market', 60000], 'Seaward Importers': ['enterprise', 240000],
      'Trailmark Outdoors': ['enterprise', 150000], Quillsoft: ['smb', 18000], Fernhill: ['mid-market', 72000], 'Stonebridge Bank': ['enterprise', 310000],
      'Summitline Ski': ['smb', 12000], 'Riverbend Winery': ['smb', 9000], 'Daybreak Coffee': ['smb', 15000], 'Marlow Health': ['mid-market', 85000],
      'Calder Research': ['mid-market', 48000], 'Pennant Travel': ['smb', 11000], 'Skylark Airways': ['enterprise', 200000], 'Inkwell Design School': ['smb', 7000],
    };
    let evN = 0;
    const EV = (title: string, source: string, account: string | undefined, daysAgo: number, opps: string[], extra: Record<string, unknown> = {}) => {
      evN++;
      const [segment, arr] = account ? ACC[account] ?? ['smb', 10000] : [undefined, undefined];
      put(`ev_${evN}`, 'evidence', { title, source, account, segment, arr, date: d(-daysAgo), kind: source === 'analytics' ? 'did' : 'said', opportunityIds: opps, sentiment: -1, ...extra }, daysAgo);
    };
    // Export / reconciliation — rising in the last 30 days.
    EV('We export invoices page by page and paste them into one workbook every month-end', 'interview', 'Halcyon Foods', 3, ['opp_export'], { personaId: 'per_fiona', sentiment: -2, relayedById: 'stk_olivia' });
    EV('Export stops at 500 rows so we run it twelve times for one month', 'support', 'Seaward Importers', 4, ['opp_export'], { sentiment: -2 });
    EV('Month-end export is missing payment status, so we have to join it with the bank file', 'support', 'Pinemoor', 5, ['opp_export', 'opp_match'], { relayedById: 'stk_ben' });
    EV('38% of active accounts exported more than five CSVs in the last week of the month', 'analytics', undefined, 6, ['opp_export'], { kind: 'did', sentiment: 0, detail: 'Event export_clicked, last 7 days of September vs rest of month: 6.4× higher.' });
    EV('Can you just email me all invoices for the period on the 1st? I would pay for that', 'sales-call', 'Trailmark Outdoors', 7, ['opp_export'], { sentiment: 0 });
    EV('Our auditors asked for a full invoice listing and it took my team a day to build', 'interview', 'Pinemoor', 9, ['opp_export'], { personaId: 'per_fiona', relayedById: 'stk_ben' });
    EV('Export to Excel times out for our larger entities', 'support', 'Seaward Importers', 11, ['opp_export'], { sentiment: -2 });
    EV('Recurring export is the #1 request in our design partner calls', 'internal', undefined, 12, ['opp_export'], { relayedById: 'stk_noah', sentiment: 0 });
    EV('The export file mixes date formats depending on who ran it', 'support', 'Kitebird Toys', 14, ['opp_export'], { relayedById: 'stk_chloe' });
    EV('Average month-end session length for controllers is 3h 40m vs 22m mid-month', 'analytics', undefined, 16, ['opp_close'], { kind: 'did', sentiment: 0 });
    EV('Reconciliation tickets peaked at 412 on the first business day of October', 'analytics', undefined, 24, ['opp_export', 'opp_close'], { kind: 'did', source: 'support', sentiment: -1 });
    EV('Arkwell AP sends a scheduled reconciliation file — that was their best demo moment', 'competitor', 'Stonebridge Bank', 41, ['opp_export'], { sentiment: -1 });
    EV('I would love one export with invoices, approvals and payments together', 'nps', 'Fernhill', 45, ['opp_export'], { sentiment: 0 });
    EV('We hired a temp for month-end just to do exports', 'interview', 'Marlow Health', 52, ['opp_export', 'opp_close'], { sentiment: -2, personaId: 'per_fiona' });
    // Matching
    EV('We match 2,000 payments to invoices by hand each month', 'interview', 'Halcyon Foods', 18, ['opp_match'], { personaId: 'per_fiona', relayedById: 'stk_olivia', sentiment: -2 });
    EV('Matchbay matched our bank feed automatically during the trial', 'sales-call', 'Daybreak Coffee', 36, ['opp_match'], { sentiment: -1 });
    EV('Partial payments make reconciliation impossible to automate in a spreadsheet', 'support', 'Calder Research', 33, ['opp_match']);
    EV('Unmatched payments are the main reason our close slips', 'survey', 'Trailmark Outdoors', 58, ['opp_match']);
    EV('Matching is where my team loses the most time', 'nps', 'Riverbend Winery', 64, ['opp_match']);
    EV('Bank statement import fails on multi-currency accounts', 'support', 'Seaward Importers', 70, ['opp_match'], { sentiment: -2 });
    // Approvals
    EV('Our directors approve invoices only on Fridays when they are at their desk', 'interview', 'Kitebird Toys', 21, ['opp_approve'], { personaId: 'per_dana', relayedById: 'stk_chloe' });
    EV('Median approval wait went from 41h to 46h this quarter', 'analytics', undefined, 25, ['opp_approve'], { kind: 'did', sentiment: -1 });
    EV('Approvers ignore the email notifications — too many of them', 'support', 'Marlow Health', 29, ['opp_approve']);
    EV('I need to approve from my phone between meetings', 'app-review', 'Trailmark Outdoors', 38, ['opp_approve'], { personaId: 'per_dana' });
    EV('Late approvals cost us early-payment discounts', 'sales-call', 'Fernhill', 47, ['opp_approve']);
    EV('Reminder emails worked well in the A/B test cohort', 'analytics', undefined, 30, ['opp_approve'], { kind: 'did', sentiment: 1 });
    EV('Can approvals be delegated while I am on holiday?', 'support', 'Halcyon Foods', 60, ['opp_approve'], { sentiment: 0 });
    EV('Bulk approval saved my team hours this month', 'nps', 'Kitebird Toys', 80, ['opp_approve'], { sentiment: 2 });
    // Security / enterprise
    EV('Security questionnaire failed: no SAML SSO and no exportable audit log', 'sales-call', 'Stonebridge Bank', 42, ['opp_secure'], { sentiment: -2, relayedById: 'stk_daniel' });
    EV('Procurement will not sign without SSO enforcement', 'sales-call', 'Trailmark Outdoors', 17, ['opp_secure'], { relayedById: 'stk_daniel' });
    EV('IT wants SCIM user provisioning before rollout to 400 users', 'sales-call', 'Skylark Airways', 76, ['opp_secure']);
    EV('We need to show auditors who approved what, and when', 'interview', 'Pinemoor', 26, ['opp_secure'], { relayedById: 'stk_ben' });
    EV('SSO is the first question in every enterprise RFP this quarter', 'internal', undefined, 10, ['opp_secure'], { relayedById: 'stk_daniel', sentiment: 0 });
    // Multi-entity — one loud customer
    EV('We run 12 subsidiaries and need one AP view', 'sales-call', 'Seaward Importers', 90, ['opp_entity'], { sentiment: -1 });
    EV('Switching between 12 entities to approve is painful', 'support', 'Seaward Importers', 66, ['opp_entity']);
    EV('Consolidated payment runs across entities would save us a week', 'interview', 'Seaward Importers', 49, ['opp_entity']);
    EV('Multi-entity was the deciding factor for Arkwell AP', 'sales-call', 'Skylark Airways', 75, ['opp_entity']);
    // Supplier visibility
    EV('Suppliers call us daily to ask when they will be paid', 'interview', 'Marlow Health', 34, ['opp_supplier'], { personaId: 'per_sam' });
    EV('A supplier portal would cut our inbound calls in half', 'survey', 'Halcyon Foods', 85, ['opp_supplier']);
    EV('Payment status emails to suppliers would be enough for us', 'support', 'Riverbend Winery', 54, ['opp_supplier'], { sentiment: 0 });
    // Recent, unlinked
    EV('Please let us choose which columns go into the export', 'support', 'Fernhill', 2, [], { sentiment: 0 });
    EV('Export schedule should follow our fiscal calendar, not calendar months', 'interview', 'Halcyon Foods', 2, [], { relayedById: 'stk_olivia', sentiment: 0 });
    EV('Dark mode for the approval screen please', 'app-review', 'Inkwell Design School', 1, [], { sentiment: 0 });
    EV('Could the export also go to our SFTP server?', 'sales-call', 'Skylark Airways', 3, [], { sentiment: 0 });

    // ---------------- Bets ----------------
    put('bet_export', 'bet', {
      title: 'Scheduled invoice export',
      hypothesis: 'We believe scheduled, complete invoice exports for finance teams will cut reconciliation tickets by 60% within 8 weeks of launch, measured by monthly reconciliation-related tickets.',
      opportunityIds: ['opp_export', 'opp_close'], objectiveId: 'obj_close', metricId: 'met_tickets', predictedChange: '−60% reconciliation tickets', confidence: 70,
      checkDate: d(75), status: 'in-delivery', horizon: 'now', category: 'feature', ownerId: 'stk_me', teamId: 'team_pay', startDate: d(-35), targetDate: d(21),
      reach: 420, impact: 2, effort: 10, businessValue: 13, timeCriticality: 13, riskReduction: 5, jobSize: 8,
    }, 60);
    put('bet_sso', 'bet', {
      title: 'SSO (SAML) and audit log export',
      hypothesis: 'We believe SAML SSO and an exportable audit log for enterprise buyers will raise the security review pass rate from 60% to 90%, measured by deals passing without exceptions.',
      opportunityIds: ['opp_secure'], objectiveId: 'obj_ent', metricId: 'met_secpass', predictedChange: '+30 pts security review pass rate', confidence: 80,
      checkDate: d(100), status: 'in-delivery', horizon: 'now', category: 'compliance', ownerId: 'stk_me', teamId: 'team_plat', startDate: d(-50), targetDate: d(10),
      reach: 60, impact: 3, effort: 8, businessValue: 13, timeCriticality: 20, riskReduction: 8, jobSize: 8,
    }, 80);
    put('bet_remind', 'bet', {
      title: 'Approval reminders and mobile approvals',
      hypothesis: 'We believe smart reminders and one-tap mobile approvals for department approvers will cut median approval time by 40%, measured by approval cycle time.',
      opportunityIds: ['opp_approve'], objectiveId: 'obj_appr', metricId: 'met_approval', predictedChange: '−40% approval cycle time', confidence: 60,
      checkDate: d(120), status: 'committed', horizon: 'now', category: 'feature', ownerId: 'stk_me', teamId: 'team_growth', startDate: d(7), targetDate: d(50),
      reach: 600, impact: 1, effort: 6, businessValue: 8, timeCriticality: 8, riskReduction: 3, jobSize: 5,
    }, 40);
    put('bet_match', 'bet', {
      title: 'Automatic payment-to-invoice matching',
      hypothesis: 'We believe automatic matching of bank payments to invoices for controllers will reduce days-to-close by 1.5 days, measured by median days to close.',
      opportunityIds: ['opp_match'], objectiveId: 'obj_close', metricId: 'met_close', predictedChange: '−1.5 days to close', confidence: 45,
      status: 'discovery', horizon: 'next', category: 'feature', teamId: 'team_pay', reach: 300, impact: 3, effort: 20, businessValue: 13, timeCriticality: 5, riskReduction: 8, jobSize: 13,
    }, 50);
    put('bet_queue', 'bet', {
      title: 'Migrate exports off the legacy queue', hypothesis: 'Moving exports to the new job platform removes dropped jobs and unblocks scheduled export at scale.',
      status: 'committed', horizon: 'next', category: 'tech-debt', teamId: 'team_plat', confidence: 85, effort: 6, reach: 420, impact: 0.5, businessValue: 3, timeCriticality: 8, riskReduction: 13, jobSize: 5,
    }, 45);
    put('bet_entity', 'bet', {
      title: 'Multi-entity consolidation', hypothesis: 'We believe a consolidated AP view for groups with subsidiaries will unlock enterprise expansion deals.',
      opportunityIds: ['opp_entity'], objectiveId: 'obj_ent', confidence: 35, status: 'idea', horizon: 'later', category: 'feature', reach: 40, impact: 3, effort: 30, businessValue: 8, timeCriticality: 3, riskReduction: 5, jobSize: 20,
    }, 100);
    put('bet_supplier', 'bet', {
      title: 'Supplier payment status portal', hypothesis: 'We believe a payment status page for suppliers will halve inbound "when will I be paid" calls.',
      opportunityIds: ['opp_supplier'], confidence: 40, status: 'idea', horizon: 'later', category: 'feature', reach: 200, impact: 1, effort: 15, businessValue: 5, timeCriticality: 3, riskReduction: 2, jobSize: 13,
    }, 100);
    put('bet_bulk', 'bet', {
      title: 'Bulk invoice approval', hypothesis: 'We believe bulk approval for AP managers will reduce approval cycle time by 20%.',
      opportunityIds: ['opp_approve'], metricId: 'met_approval', predictedChange: '−20% approval cycle time', confidence: 75, checkDate: d(-30), status: 'measured', horizon: 'now', category: 'feature', teamId: 'team_growth',
      startDate: d(-170), targetDate: d(-115), result: 'success', actualResult: 'Approval cycle time −22% for accounts using bulk approval (41% adoption).', learning: 'Power users adopt fast; occasional approvers never discover it. Surface it in the approval email.',
    }, 180);
    put('bet_ai', 'bet', {
      title: 'AI invoice categorisation suggestions', hypothesis: 'We believe GL-code suggestions will cut invoice processing time by 30%.', predictedChange: '−30% processing time',
      confidence: 85, checkDate: d(-90), status: 'measured', category: 'experiment', startDate: d(-260), targetDate: d(-200), result: 'failed',
      actualResult: 'Adoption 3%; processing time unchanged.', learning: 'Clerks did not trust suggestions without seeing why. Explainability first; we were overconfident because the demo went well.',
    }, 270);
    put('bet_dupes', 'bet', {
      title: 'Duplicate invoice detection', hypothesis: 'We believe duplicate detection will eliminate double payments.', predictedChange: 'Zero duplicate payments', confidence: 80,
      checkDate: d(-60), status: 'measured', category: 'feature', teamId: 'team_pay', startDate: d(-220), targetDate: d(-150), result: 'partial',
      actualResult: 'Duplicates down 70%; misses invoices with changed numbers.', learning: 'Fuzzy matching on amount + supplier + date catches more than invoice number alone.',
    }, 230);
    put('bet_filters', 'bet', {
      title: 'Saved filters', hypothesis: 'We believe saved filters for AP clerks will cut time to find an invoice by 30%, measured by search-to-open time.', predictedChange: '−30% search-to-open time',
      confidence: 65, checkDate: d(3), status: 'shipped', horizon: 'now', category: 'feature', teamId: 'team_growth', startDate: d(-95), targetDate: d(-50),
    }, 100);

    put('asm_trust', 'assumption', { title: 'Finance teams will trust a scheduled file without checking it in the app', betId: 'bet_export', category: 'value', importance: 5, evidenceLevel: 2, status: 'untested', testPlan: 'Concierge test: send hand-built files to 5 design partners for one close and interview afterwards.' }, 30);
    put('asm_xlsx', 'assumption', { title: 'XLSX and CSV cover 80% of reconciliation workflows', betId: 'bet_export', category: 'value', importance: 4, evidenceLevel: 4, status: 'validated', testPlan: 'Survey of 120 controllers (done): 84% use XLSX or CSV.' }, 30);
    put('asm_perf', 'assumption', { title: 'A 100k-row export completes in under 30 s on the new job platform', betId: 'bet_export', category: 'feasibility', importance: 4, evidenceLevel: 3, status: 'testing', testPlan: 'Load test on staging with Seaward Importers-sized data.' }, 30);
    put('asm_retention', 'assumption', { title: 'Customers accept that generated files expire after 7 days', betId: 'bet_export', category: 'viability', importance: 3, evidenceLevel: 2, status: 'untested' }, 30);
    put('asm_push', 'assumption', { title: 'Approvers act on mobile push notifications within a day', betId: 'bet_remind', category: 'usability', importance: 5, evidenceLevel: 3, status: 'testing', testPlan: 'A/B test reminder email at 24h (running).' }, 30);
    put('asm_bankfeed', 'assumption', { title: 'Bank statement data is available via the Quillsoft connector for 70% of accounts', betId: 'bet_match', category: 'feasibility', importance: 5, evidenceLevel: 1, status: 'untested' }, 30);
    put('asm_idp', 'assumption', { title: 'Enterprise customers use Okta or Entra ID as IdP', betId: 'bet_sso', category: 'feasibility', importance: 3, evidenceLevel: 5, status: 'validated' }, 60);

    put('exp_fakedoor', 'experiment', { title: 'Fake door: "Schedule this export" button', betId: 'bet_export', assumptionIds: ['asm_trust'], method: 'fake-door', hypothesis: 'At least 10% of export-page visitors click "Schedule".', metric: 'Click-through on Schedule', baselineRate: 10, variantN: 3400, variantConversions: 612, status: 'concluded', decision: 'persevere', startDate: d(-60), endDate: d(-46), notes: '18% clicked; 140 left an email for the beta.' }, 60);
    put('exp_remind', 'experiment', { title: 'A/B: reminder email after 24h vs none', betId: 'bet_remind', assumptionIds: ['asm_push'], method: 'a/b-test', hypothesis: 'A 24h reminder increases the share of invoices approved within 48h.', metric: 'Approved within 48h', baselineRate: 38, mde: 10, alpha: 0.05, power: 0.8, controlN: 4100, controlConversions: 1558, variantN: 4050, variantConversions: 1782, status: 'concluded', decision: 'persevere', startDate: d(-45), endDate: d(-25) }, 45);
    put('exp_match', 'experiment', { title: 'Prototype test: review suggested matches', betId: 'bet_match', assumptionIds: ['asm_bankfeed'], method: 'prototype-test', hypothesis: '4 of 5 controllers complete a match review without help.', metric: 'Task success', status: 'running', decision: 'pending', startDate: d(-5) }, 5);

    put('jrn_close', 'journey', {
      title: 'Month-end close (today)', personaId: 'per_fiona',
      stages: [
        { name: 'Period ends', actions: 'Waits for last approvals; chases approvers', thoughts: 'Who is still sitting on invoices?', emotion: -1, pains: 'No overview of pending approvals', opportunityIds: ['opp_approve'] },
        { name: 'Export data', actions: 'Exports invoices page by page; exports payments from bank', thoughts: 'Did I get everything?', emotion: -2, pains: '500-row limit; missing payment status', opportunityIds: ['opp_export'] },
        { name: 'Reconcile', actions: 'Matches payments to invoices in a spreadsheet', thoughts: 'This is what I was hired for?', emotion: -2, pains: 'Manual matching of 2,000 lines', opportunityIds: ['opp_match'] },
        { name: 'Resolve exceptions', actions: 'Emails suppliers and approvers about mismatches', thoughts: 'Every exception is a thread', emotion: -1, pains: 'Suppliers call asking about status', opportunityIds: ['opp_supplier'] },
        { name: 'Close & report', actions: 'Locks the period; sends report to CFO', thoughts: 'Finally', emotion: 1, pains: 'Auditors ask for the same listing again later', opportunityIds: ['opp_secure'] },
      ],
    }, 100);

    put('std_close', 'study', {
      title: 'Month-end close interviews (Q3)', objective: 'Understand where time goes during the close for mid-market controllers.', method: 'interviews', status: 'done', startDate: d(-70),
      participants: '8 controllers / finance directors (Halcyon Foods, Pinemoor, Marlow, Kitebird, Fernhill, Calder, Riverbend, Trailmark Outdoors). Screener: owns the close, ≥ 500 invoices/month.',
      guide: '## Warm-up\n- Walk me through your last month-end close.\n\n## Deep dive\n- Where did you lose the most time?\n- What did you export, and what did you do with it?\n- Show me the spreadsheet.\n\n## Wrap-up\n- If you had a magic wand…',
      findings: '## Key findings\n1. **Exports are the bottleneck** — 7 of 8 rebuild the same workbook every month.\n2. **Matching is the next pain** — 5 of 8 match payments by hand.\n3. **Approvals block the start of the close** — 4 of 8 wait for late approvals.\n\n## Surprises\n- Two teams hired temps for month-end.',
      evidenceIds: ['ev_1', 'ev_6', 'ev_14', 'ev_15', 'ev_21'],
    }, 70);

    // ---------------- Define ----------------
    put('gl_account', 'glossaryTerm', { term: 'Account', definition: 'A Ledgerly customer organisation; the billing and data boundary.', synonyms: ['tenant'], domain: 'Platform' }, 200);
    put('gl_customer', 'glossaryTerm', { term: 'Customer', definition: 'The company that buys Ledgerly (has one or more Accounts).', synonyms: ['client'], domain: 'Commercial' }, 200);
    put('gl_supplier', 'glossaryTerm', { term: 'Supplier', definition: 'A business that sends invoices to a Customer and receives payments.', synonyms: ['vendor'], domain: 'AP' }, 200);
    put('gl_invoice', 'glossaryTerm', { term: 'Invoice', definition: 'A request for payment from a Supplier, with line items, amount, currency and due date.', domain: 'AP' }, 200);
    put('gl_approver', 'glossaryTerm', { term: 'Approver', definition: 'A user who can approve invoices up to their approval limit.', domain: 'AP' }, 200);
    put('gl_close', 'glossaryTerm', { term: 'Period close', definition: 'Locking an accounting period after all invoices and payments are reconciled.', synonyms: ['month end close'], domain: 'Finance' }, 200);

    put('spec_export', 'spec', {
      title: 'Scheduled invoice export — PRD', betId: 'bet_export', ownerId: 'stk_me', status: 'in-review',
      body: `# Scheduled invoice export

## Problem
Today, finance teams build their month-end reconciliation file by hand. The export stops at 500 rows, misses payment status and has to be repeated for every entity. Reconciliation tickets peak at 400+ on the first business day of each month.

> "We export invoices page by page and paste them into one workbook every month-end" — Halcyon Foods

## Goals
- Reduce reconciliation-related tickets from 340 to 140 per month (baseline: September).
- 40% of active accounts use scheduled export within one quarter.

## Non-goals
- PDF exports (see DEC-1).
- Exports to SFTP or cloud storage.
- Custom column selection (later).

## Users
Finance Admins at mid-market and enterprise accounts. The client can also give access to their auditors.

## Requirements
- Users with the Finance Admin role can schedule a recurring export of invoices (daily, weekly, monthly).
- The system shall generate exports in XLSX and CSV.
- Exports should be fast and support large files.
- The system shall email a signed download link that expires after 7 days.
- Exports include only the fields the requesting user is permitted to view.
- The export includes invoice, approval and payment fields, etc.
- Each tenant can have up to 10 schedules.

## Experience
1. Finance Admin opens Invoices → Export → "Schedule".
2. Picks format, frequency and recipients.
3. Gets an email when the file is ready, with a link.

Design: see Figma "Scheduled export v3".

## Rollout
Feature flag \`export.scheduled\`. Design partners first, then 25%, then everyone.

## Open questions
- Maximum file size is TBD.
- Should failed exports be retried automatically?
`,
    }, 40);
    put('spec_sso', 'spec', {
      title: 'SSO (SAML) and audit log export — spec', betId: 'bet_sso', ownerId: 'stk_me', status: 'approved',
      body: `# SSO (SAML) and audit log export

## Problem
Enterprise buyers fail us in security review: no SAML SSO and no exportable audit trail. We lost Stonebridge Bank ($310k) for this reason.

## Goals
- Security review pass rate from 60% to 90% (baseline: last two quarters).

## Non-goals
- OIDC (planned after SAML, see DEC-5).
- SCIM provisioning in v1.

## Requirements
- Account admins can configure SAML 2.0 SSO with Okta, Entra ID or any SAML 2.0 IdP.
- Account admins can enforce SSO for all users except one break-glass admin.
- Account admins can export the audit log (CSV) for any date range up to 13 months.
- Audit entries are immutable and retained for 7 years.

## Acceptance
Given an account with SSO enforced
When a user signs in with a password
Then sign-in is refused and the user is redirected to the IdP.

## Security
Role-based access control: only Account admins can change SSO settings. Signed SAML assertions only; certificates rotate without downtime.

## Tracking
Events: sso_configured, sso_login, audit_export_requested.

## Support
Help-centre article and support macros ready one week before GA.
`,
    }, 70);
    put('spec_remind', 'spec', {
      title: 'Approval reminders — draft', betId: 'bet_remind', ownerId: 'stk_me', status: 'draft',
      body: `# Approval reminders

## Problem
Invoices wait a median of 46 hours for approval.

## Requirements
- Approvers get a reminder if an invoice waits more than 24 hours.
- Reminders should be smart and not annoying.
- Approvers can approve from the mobile web with one tap.
`,
    }, 20);

    const R = (id: string, data: Record<string, unknown>, daysAgo = 35) => put(`req_${id}`, 'requirement', data, daysAgo);
    R('schedule', { title: 'Schedule a recurring export', statement: 'Users with the Finance Admin role can schedule a recurring export of invoices (daily, weekly, monthly).', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_export', betId: 'bet_export', sourceIds: ['stk_olivia', 'ev_1', 'ev_5'], rationale: 'Top request from design partners; removes the manual export.', acceptance: 'A schedule can be created, edited and deleted; the next run date is shown.', stability: 'stable', ownerId: 'stk_me', version: 2 });
    R('formats', { title: 'Export formats', statement: 'The system shall generate exports in XLSX and CSV.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_export', betId: 'bet_export', sourceIds: ['asm_xlsx'], rationale: 'XLSX/CSV cover 84% of workflows (survey).', stability: 'stable' });
    R('limit', { title: 'Export size limit', statement: 'Exports support up to 100,000 rows per file.', kind: 'non-functional', priority: 'must', status: 'approved', specId: 'spec_export', betId: 'bet_export', sourceIds: ['ev_2', 'ev_7'], stability: 'stable' });
    R('perf', { title: 'Export performance', statement: 'An export of 100,000 rows completes within 30 seconds at p95.', kind: 'non-functional', priority: 'should', status: 'in-review', specId: 'spec_export', betId: 'bet_export', sourceIds: ['stk_priya'], stability: 'volatile', version: 2, history: [{ version: 1, title: 'Export performance', statement: 'An export of 100,000 rows completes within 60 seconds.', priority: 'should', at: d(-14) }] });
    R('link', { title: 'Delivery by signed link', statement: 'The system shall email a signed download link that expires after 7 days.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_export', betId: 'bet_export', sourceIds: ['stk_grace'], rationale: 'Attachments leak data; signed links can be revoked (DEC-3).' });
    R('fieldperm', { title: 'Field-level permissions apply to exports', statement: 'Exports include only the fields the requesting user is permitted to view.', kind: 'business-rule', priority: 'must', status: 'approved', specId: 'spec_export', betId: 'bet_export', sourceIds: ['stk_grace'], tags: ['pii'] });
    R('retfile', { title: 'Generated file retention', statement: 'Generated export files are deleted after 7 days.', kind: 'business-rule', priority: 'must', status: 'draft', specId: 'spec_export', betId: 'bet_export', sourceIds: [], tags: ['pii', 'audit'] });
    R('retinv', { title: 'Invoice record retention', statement: 'Invoice records must be retained and immutable for 10 years.', kind: 'constraint', priority: 'must', status: 'approved', betId: 'bet_export', sourceIds: ['stk_elena'], rationale: 'German commercial and tax law (GoBD).', tags: ['audit'] }, 300);
    R('delete', { title: 'Admins can delete exported invoices', statement: 'Account admins can delete invoices from the export history.', kind: 'functional', priority: 'could', status: 'draft', specId: 'spec_export', betId: 'bet_export', sourceIds: [] }, 10);
    R('perfsales', { title: 'Export performance (enterprise RFPs)', statement: 'An export of 100,000 rows completes within 10 seconds.', kind: 'non-functional', priority: 'should', status: 'draft', specId: 'spec_export', betId: 'bet_export', sourceIds: ['stk_daniel'], stability: 'volatile' }, 9);
    R('injection', { title: 'Formula injection protection', statement: 'Cell values beginning with =, +, - or @ are escaped in CSV and XLSX exports.', kind: 'non-functional', priority: 'must', status: 'approved', specId: 'spec_export', betId: 'bet_export', sourceIds: ['stk_grace'] });
    R('tz', { title: 'Schedule time zone', statement: 'Scheduled exports run at 06:00 in the account time zone on the first business day after the period ends.', kind: 'business-rule', priority: 'must', status: 'in-review', specId: 'spec_export', betId: 'bet_export', sourceIds: ['ev_42', 'stk_olivia'] }, 6);
    R('saml', { title: 'SAML 2.0 SSO', statement: 'Account admins can configure SAML 2.0 SSO with any SAML 2.0 identity provider.', kind: 'functional', priority: 'must', status: 'implemented', specId: 'spec_sso', betId: 'bet_sso', sourceIds: ['ev_30', 'stk_grace'] }, 60);
    R('enforce', { title: 'Enforce SSO', statement: 'Account admins can enforce SSO for all users except one break-glass admin.', kind: 'functional', priority: 'must', status: 'implemented', specId: 'spec_sso', betId: 'bet_sso', sourceIds: ['ev_30'] }, 60);
    R('audit', { title: 'Audit log export', statement: 'Account admins can export the audit log as CSV for any date range up to 13 months.', kind: 'functional', priority: 'must', status: 'approved', specId: 'spec_sso', betId: 'bet_sso', sourceIds: ['ev_32', 'stk_kim'] }, 60);
    R('scim', { title: 'SCIM provisioning', statement: 'Identity providers can provision and de-provision users via SCIM 2.0.', kind: 'interface', priority: 'wont', status: 'draft', specId: 'spec_sso', betId: 'bet_sso', sourceIds: ['ev_31'] }, 60);
    R('remind', { title: 'Reminder after 24 hours', statement: 'Approvers receive a reminder when an invoice has waited more than 24 hours for their approval.', kind: 'functional', priority: 'should', status: 'draft', specId: 'spec_remind', betId: 'bet_remind', sourceIds: ['exp_remind'] }, 15);

    put('base_export1', 'baseline', {
      title: 'Scheduled export — baseline v1', date: d(-12), specId: 'spec_export', approvalId: 'appr_baseline',
      notes: 'Baseline approved for build start. Changes after this point go through change requests.',
      snapshot: [
        { id: 'req_schedule', key: 'REQ-1', title: 'Schedule a recurring export', statement: 'Users with the Finance Admin role can schedule a recurring export of invoices (daily, weekly, monthly).', priority: 'must', version: 2 },
        { id: 'req_formats', key: 'REQ-2', title: 'Export formats', statement: 'The system shall generate exports in XLSX and CSV.', priority: 'must', version: 1 },
        { id: 'req_limit', key: 'REQ-3', title: 'Export size limit', statement: 'Exports support up to 50,000 rows per file.', priority: 'must', version: 1 },
        { id: 'req_perf', key: 'REQ-4', title: 'Export performance', statement: 'An export of 100,000 rows completes within 60 seconds.', priority: 'should', version: 1 },
        { id: 'req_link', key: 'REQ-5', title: 'Delivery by signed link', statement: 'The system shall email a signed download link that expires after 7 days.', priority: 'must', version: 1 },
        { id: 'req_fieldperm', key: 'REQ-6', title: 'Field-level permissions apply to exports', statement: 'Exports include only the fields the requesting user is permitted to view.', priority: 'must', version: 1 },
        { id: 'req_retinv', key: 'REQ-8', title: 'Invoice record retention', statement: 'Invoice records must be retained and immutable for 10 years.', priority: 'must', version: 1 },
        { id: 'req_injection', key: 'REQ-11', title: 'Formula injection protection', statement: 'Cell values beginning with =, +, - or @ are escaped in CSV and XLSX exports.', priority: 'must', version: 1 },
        { id: 'req_pdf', key: 'REQ-0', title: 'PDF export', statement: 'The system shall generate exports in PDF.', priority: 'could', version: 1 },
      ],
    }, 12);
    put('cr_sla', 'changeRequest', { title: 'Tighten export SLA to 10 seconds for enterprise', description: 'Sales asks for a 10 s SLA to match Arkwell AP in RFPs.', requirementIds: ['req_perf'], reason: 'Three enterprise RFPs this quarter list < 10 s as a requirement.', requestedById: 'stk_daniel', status: 'submitted' }, 8);

    const DEC = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`dec_${id}`, 'decision', { status: 'decided', ...data }, daysAgo);
    DEC('nopdf', { title: 'XLSX and CSV only in v1 — no PDF', context: 'Auditors at Pinemoor asked for PDF; 84% of controllers use XLSX/CSV.', options: '- **XLSX + CSV** — covers 84%, cheap\n- **+ PDF** — +3 weeks, auditors only\n- **Defer all formats but CSV** — fastest, weak value', chosen: 'XLSX + CSV', rationale: 'PDF adds three weeks for a minority use case; revisit with data.', deciderIds: ['stk_me', 'stk_priya'], consultedIds: ['stk_olivia', 'stk_samuel'], date: d(-20), reversibility: 'two-way-door', revisitTrigger: 'More than 20% of export requests ask for PDF', revisitDate: d(60), relatedIds: ['bet_export', 'spec_export'], evidenceIds: ['ev_6'] }, 20);
    DEC('async', { title: 'Exports run as background jobs', context: 'Synchronous exports time out above ~20k rows.', options: '- Background job with notification\n- Streaming download\n- Raise timeouts', chosen: 'Background job with notification', rationale: 'Only option that scales to 100k rows and scheduled runs.', deciderIds: ['stk_priya'], consultedIds: ['stk_me', 'stk_grace'], date: d(-28), reversibility: 'two-way-door', relatedIds: ['bet_export'] }, 28);
    DEC('signed', { title: 'Deliver files by signed link, not attachment', context: 'Attachments containing personal data cannot be revoked.', options: '- Email attachment\n- Signed, expiring link', chosen: 'Signed link, 7-day expiry', rationale: 'Revocable, auditable, no size limits on mail servers.', deciderIds: ['stk_me', 'stk_grace'], consultedIds: ['stk_elena'], date: d(-15), reversibility: 'two-way-door', relatedIds: ['bet_export'], supersedesId: 'dec_attach' }, 15);
    DEC('retention', { title: 'Generated export files are kept for 7 days', context: 'Storage cost and data-minimisation vs customers re-downloading files.', options: '- 7 days\n- 30 days\n- Until the next run', chosen: '7 days', rationale: 'Matches signed-link expiry; minimises personal data at rest.', deciderIds: ['stk_me'], consultedIds: [], date: d(-3), reversibility: 'two-way-door', revisitTrigger: 'More than 50 support tickets about expired files', relatedIds: ['bet_export'] }, 3);
    DEC('saml', { title: 'SAML 2.0 first, OIDC later', options: '- SAML first\n- OIDC first\n- Both', chosen: 'SAML first', rationale: 'Every enterprise RFP asks for SAML; OIDC is nice-to-have.', deciderIds: ['stk_priya', 'stk_grace'], consultedIds: ['stk_daniel'], date: d(-45), reversibility: 'two-way-door', relatedIds: ['bet_sso'] }, 45);
    DEC('entity', { title: 'Defer multi-entity consolidation to 2027', context: 'One loud customer (Seaward Importers) plus one lost deal.', options: '- Build now (30 weeks)\n- Defer to 2027\n- Partner with Quillsoft', chosen: 'Defer to 2027', rationale: 'Evidence is concentrated in one account; enterprise readiness (SSO) is the bigger blocker.', deciderIds: ['stk_hiroshi', 'stk_me'], consultedIds: ['stk_daniel'], date: d(-60), reversibility: 'two-way-door', revisitTrigger: 'Two more enterprise deals lost for multi-entity', revisitDate: d(-2), relatedIds: ['bet_entity'] }, 60);
    DEC('pricing', { title: 'Scheduled export only on Pro and Enterprise plans', context: 'Proposal from Product Marketing to drive upgrades.', options: '- All plans\n- Pro + Enterprise\n- Enterprise only', chosen: 'Pro + Enterprise', rationale: 'Upsell lever; SMB plans rarely reconcile monthly.', deciderIds: [], consultedIds: ['stk_sofia'], date: d(-1), status: 'proposed', reversibility: 'one-way-door', relatedIds: ['bet_export'] }, 1);
    DEC('attach', { title: 'Email exports as attachments', chosen: 'Attachment', rationale: 'Simplest first version.', deciderIds: ['stk_me'], date: d(-90), status: 'superseded', reversibility: 'two-way-door', relatedIds: ['bet_export'] }, 90);

    put('dt_perm', 'decisionTable', {
      title: 'Who can export, and what is masked', requirementId: 'req_fieldperm', hitPolicy: 'unique',
      conditions: [{ name: 'Role', values: ['finance-admin', 'approver', 'viewer'] }, { name: 'Data', values: ['standard', 'personal-data'] }, { name: 'Plan', values: ['pro', 'enterprise'] }],
      actions: [{ name: 'Can export' }, { name: 'Mask personal data' }],
      rules: [
        { id: 'R1', when: { Role: 'finance-admin', Data: '-', Plan: '-' }, then: { 'Can export': 'yes', 'Mask personal data': 'no' } },
        { id: 'R2', when: { Role: 'approver', Data: 'standard', Plan: '-' }, then: { 'Can export': 'yes', 'Mask personal data': 'no' } },
        { id: 'R3', when: { Role: 'approver', Data: 'personal-data', Plan: 'enterprise' }, then: { 'Can export': 'yes', 'Mask personal data': 'yes' } },
        { id: 'R4', when: { Role: 'viewer', Data: '-', Plan: '-' }, then: { 'Can export': 'no', 'Mask personal data': '-' } },
        { id: 'R5', when: { Role: 'finance-admin', Data: 'personal-data', Plan: 'pro' }, then: { 'Can export': 'yes', 'Mask personal data': 'yes' } },
      ],
    }, 20);

    put('pm_asis', 'processModel', {
      title: 'Month-end reconciliation', variant: 'as-is', counterpartId: 'pm_tobe', notes: 'Observed at Halcyon Foods and Pinemoor (elicitation workshop).',
      lanes: ['AP Clerk', 'Finance Controller', 'Ledgerly', 'Spreadsheet'],
      steps: [
        { id: 'a1', lane: 'AP Clerk', label: 'Period ends', kind: 'start', next: ['a2'] },
        { id: 'a2', lane: 'AP Clerk', label: 'Export invoices page by page', kind: 'task', next: ['a3'] },
        { id: 'a3', lane: 'AP Clerk', label: 'Export payments from bank portal', kind: 'task', next: ['a4'] },
        { id: 'a4', lane: 'Spreadsheet', label: 'Paste into reconciliation workbook', kind: 'task', next: ['a5'] },
        { id: 'a5', lane: 'Spreadsheet', label: 'Match payments to invoices by hand', kind: 'task', next: ['a6'] },
        { id: 'a6', lane: 'Finance Controller', label: 'Exceptions?', kind: 'decision', next: ['a7', 'a8'] },
        { id: 'a7', lane: 'AP Clerk', label: 'Email suppliers and approvers', kind: 'task', next: ['a5'] },
        { id: 'a8', lane: 'Finance Controller', label: 'Review and lock period', kind: 'task', next: ['a9'] },
        { id: 'a9', lane: 'Finance Controller', label: 'Books closed', kind: 'end', next: [] },
      ],
    }, 40);
    put('pm_tobe', 'processModel', {
      title: 'Month-end reconciliation', variant: 'to-be', counterpartId: 'pm_asis', notes: 'With scheduled export (2026.11) and, later, automatic matching.',
      lanes: ['AP Clerk', 'Finance Controller', 'Ledgerly', 'Spreadsheet'],
      steps: [
        { id: 'b1', lane: 'Ledgerly', label: 'Period ends', kind: 'start', next: ['b2'] },
        { id: 'b2', lane: 'Ledgerly', label: 'Generate scheduled export', kind: 'task', next: ['b3'] },
        { id: 'b3', lane: 'Ledgerly', label: 'Email signed link', kind: 'task', next: ['b4'] },
        { id: 'b4', lane: 'Spreadsheet', label: 'Match remaining exceptions', kind: 'task', next: ['b5'] },
        { id: 'b5', lane: 'Finance Controller', label: 'Exceptions?', kind: 'decision', next: ['b6', 'b7'] },
        { id: 'b6', lane: 'AP Clerk', label: 'Email suppliers and approvers', kind: 'task', next: ['b4'] },
        { id: 'b7', lane: 'Finance Controller', label: 'Review and lock period', kind: 'task', next: ['b8'] },
        { id: 'b8', lane: 'Finance Controller', label: 'Books closed', kind: 'end', next: [] },
      ],
    }, 30);

    put('uc_schedule', 'useCase', {
      title: 'Schedule a recurring invoice export', actor: 'Finance Admin', goal: 'Receive a complete invoice file automatically after each period.',
      preconditions: 'User has the Finance Admin role. Account is on a plan that includes scheduled export.',
      mainFlow: '1. Admin opens Invoices → Export.\n2. Admin chooses "Schedule".\n3. System shows format, frequency, recipients and filters.\n4. Admin saves the schedule.\n5. System confirms and shows the next run date.',
      alternateFlows: '2a. Admin edits an existing schedule.\n3a. Admin selects "Same as last export" filters.',
      exceptionFlows: '4a. Account already has 10 schedules → system explains the limit.\n4b. Recipient is outside the account domain → system requires confirmation.',
      postconditions: 'Schedule is stored; an audit entry is written.', requirementIds: ['req_schedule', 'req_tz'],
    }, 30);

    put('sm_job', 'stateModel', {
      title: 'Export job lifecycle', notes: 'Retries are capped at 3 attempts.', requirementIds: ['req_schedule', 'req_link'],
      states: ['queued', 'running', 'succeeded', 'failed', 'expired', 'cancelled'], initial: 'queued', finals: ['expired', 'cancelled'],
      transitions: [
        { from: 'queued', to: 'running', trigger: 'worker picks up' },
        { from: 'running', to: 'succeeded', trigger: 'file generated' },
        { from: 'running', to: 'failed', trigger: 'error' },
        { from: 'failed', to: 'queued', trigger: 'retry', guard: 'attempts < 3' },
        { from: 'succeeded', to: 'expired', trigger: '7 days passed' },
        { from: 'queued', to: 'cancelled', trigger: 'user cancels' },
      ],
    }, 25);

    put('de_invoice', 'dataEntity', {
      name: 'Invoice', description: 'Supplier invoice as stored in Ledgerly.', relations: 'Belongs to Account and Supplier; has many Line items, Approvals and Payments.', ownerId: 'stk_priya',
      attributes: [
        { name: 'invoice_number', type: 'string', required: true, pii: false, description: 'Supplier-provided number' },
        { name: 'supplier_name', type: 'string', required: true, pii: false, description: '' },
        { name: 'supplier_contact_email', type: 'string', required: false, pii: true, description: 'Personal data when the supplier is a sole trader' },
        { name: 'amount', type: 'decimal(18,2)', required: true, pii: false, description: '' },
        { name: 'currency', type: 'ISO 4217', required: true, pii: false, description: '' },
        { name: 'due_date', type: 'date', required: true, pii: false, description: '' },
        { name: 'approver_name', type: 'string', required: false, pii: true, description: 'Employee personal data' },
        { name: 'bank_account', type: 'IBAN', required: false, pii: true, description: 'Masked in UI except for Finance Admins' },
      ],
    }, 200);
    put('de_export', 'dataEntity', {
      name: 'Export file', description: 'A generated export, stored encrypted for 7 days.', relations: 'Belongs to Account; created by a Schedule or a user.',
      attributes: [
        { name: 'export_id', type: 'uuid', required: true, pii: false, description: '' },
        { name: 'requested_by', type: 'user id', required: true, pii: true, description: '' },
        { name: 'format', type: 'enum(xlsx,csv)', required: true, pii: false, description: '' },
        { name: 'row_count', type: 'int', required: true, pii: false, description: '' },
        { name: 'expires_at', type: 'timestamp', required: true, pii: false, description: 'created_at + 7 days' },
      ],
    }, 30);

    put('eli_halcyon', 'elicitation', {
      title: 'Month-end close workshop — Halcyon Foods finance', technique: 'workshop', date: d(-40), stakeholderIds: ['stk_olivia', 'stk_me', 'stk_aisha'], status: 'synthesized',
      objectives: 'Map the as-is close process; find the top three time sinks.',
      questions: '1. Walk us through the last close, step by step.\n2. Where do you wait on others?\n3. What do you export, and why?',
      notes: '- Decision: focus the pilot on invoice export first\n- Action: @olivia to share the reconciliation workbook by Friday\n- Risk: their fiscal calendar differs from calendar months\n- The export must include payment status\n- What happens with partial payments?',
    }, 40);
    put('eli_pinemoor', 'elicitation', {
      title: 'Interview — Pinemoor controller', technique: 'interview', date: d(-18), stakeholderIds: ['stk_ben'], status: 'done',
      objectives: 'Understand renewal risk and audit needs.', notes: '- Auditors need a full invoice listing with approvals\n- Concern: they are evaluating Arkwell AP\n- The system must show who approved each invoice',
    }, 18);

    put('cap_ap', 'capability', { name: 'Accounts payable', description: 'End-to-end AP for mid-market and enterprise.', maturityNow: 3, maturityTarget: 4, importance: 5 }, 200);
    put('cap_capture', 'capability', { name: 'Invoice capture', parentId: 'cap_ap', maturityNow: 4, maturityTarget: 4, importance: 4 }, 200);
    put('cap_approval', 'capability', { name: 'Approval workflow', parentId: 'cap_ap', maturityNow: 3, maturityTarget: 5, importance: 5 }, 200);
    put('cap_payment', 'capability', { name: 'Payment execution', parentId: 'cap_ap', maturityNow: 4, maturityTarget: 4, importance: 4 }, 200);
    put('cap_recon', 'capability', { name: 'Reconciliation & close', parentId: 'cap_ap', maturityNow: 1, maturityTarget: 4, importance: 5, ownerId: 'stk_me' }, 200);
    put('cap_report', 'capability', { name: 'Reporting & export', parentId: 'cap_ap', maturityNow: 2, maturityTarget: 4, importance: 4 }, 200);
    put('cap_comp', 'capability', { name: 'Compliance & audit', parentId: 'cap_ap', maturityNow: 2, maturityTarget: 5, importance: 5, ownerId: 'stk_grace' }, 200);
    put('gap_export', 'gapItem', { title: 'Data out of Ledgerly', currentState: 'Per-page manual export, 500-row limit, no payment status.', futureState: 'Complete scheduled export with invoices, approvals and payments.', gap: 'No job platform for large exports; no scheduling.', action: 'Scheduled export (2026.11) on the new job platform.', priority: 'high', capabilityId: 'cap_report', status: 'planned' }, 40);
    put('gap_match', 'gapItem', { title: 'Payment matching', currentState: 'Entirely manual in spreadsheets.', futureState: 'Automatic matching with exception review.', gap: 'No bank feed; no matching engine.', action: 'Discovery: automatic matching (bet).', priority: 'high', capabilityId: 'cap_recon', status: 'open' }, 40);
    put('gap_audit', 'gapItem', { title: 'Audit evidence', currentState: 'Audit trail visible in UI only.', futureState: 'Exportable, immutable audit log.', gap: 'No export; retention undefined.', action: 'Audit log export (2026.11).', priority: 'high', capabilityId: 'cap_comp', status: 'planned' }, 40);
    put('swot_2026', 'swot', { title: 'Ledgerly in mid-market AP (2026)', date: d(-30), strengths: 'Best approval UX in the segment\nFast onboarding (2 weeks)\nHigh NPS among AP clerks', weaknesses: 'No SSO / audit export\nManual reconciliation\nSingle-entity only', opportunities: 'Enterprise teams frustrated with Arkwell AP implementations\nERP partners (Quillsoft) want deeper integration', threats: 'Matchbay moving up-market with matching\nArkwell AP discounting to block us' }, 30);
    put('rca_tickets', 'rootCause', {
      title: 'Reconciliation tickets spike at month-end',
      whys: ['Customers cannot get the invoice data they need to reconcile.', 'They export manually and the data is incomplete.', 'Exports are per-page with a 500-row limit and no payment status.', 'Export was built as a UI convenience, not as part of the close workflow.', 'Nobody owned reporting and export until 2026.'],
      fishbone: { People: ['No owner for reporting until 2026'], Process: ['Close happens outside the product'], Technology: ['500-row synchronous export', 'Legacy queue drops long jobs'], Data: ['Payment status not in export'], Policy: ['No retention policy for files'] },
      rootCause: 'Export was designed as a UI feature, not as part of the close workflow.',
      countermeasures: 'Scheduled, complete export (bet).\nOwner for reporting & export capability.\nMove exports to the job platform.',
    }, 30);

    put('map_export', 'storyMap', {
      title: 'Scheduled export — story map', betId: 'bet_export', personaId: 'per_fiona',
      activities: [
        { id: 'act1', name: 'Set up an export', steps: [{ id: 'st1', name: 'Choose data' }, { id: 'st2', name: 'Pick format' }, { id: 'st3', name: 'Set schedule' }] },
        { id: 'act2', name: 'Receive the export', steps: [{ id: 'st4', name: 'Get notified' }, { id: 'st5', name: 'Download securely' }] },
        { id: 'act3', name: 'Reconcile', steps: [{ id: 'st6', name: 'Open in spreadsheet' }, { id: 'st7', name: 'Find exceptions' }] },
      ],
      slices: [{ id: 'sl1', name: 'MVP — 2026.11' }, { id: 'sl2', name: 'Next' }, { id: 'sl3', name: 'Later' }],
    }, 35);

    // ---------------- Stories ----------------
    const G = (given: string, when: string, then: string) => `Given ${given}\nWhen ${when}\nThen ${then}`;
    const ST = (id: string, data: Record<string, unknown>, createdDaysAgo = 40) => put(`st_${id}`, 'story', data, createdDaysAgo);
    // Scheduled export (Payments team)
    ST('e1', { title: 'Create a schedule', asA: 'Finance Admin', iWant: 'to schedule a monthly invoice export', soThat: 'the reconciliation file arrives without manual work', acceptance: G('I am a Finance Admin', 'I save a monthly schedule', 'the next run date is shown'), status: 'done', estimate: 5, requirementIds: ['req_schedule'], betId: 'bet_export', specId: 'spec_export', releaseId: 'rel_nov', teamId: 'team_pay', doneAt: d(-20), sprint: 'Sprint 41', externalKey: 'PAY-1201', storyMapId: 'map_export', mapStepId: 'st3', sliceId: 'sl1' });
    ST('e2', { title: 'Export invoices to XLSX', asA: 'Finance Admin', iWant: 'the export as an XLSX file', soThat: 'I can open it in Excel directly', acceptance: G('a scheduled export runs', 'the format is XLSX', 'the file opens in Excel with one row per invoice'), status: 'done', estimate: 3, requirementIds: ['req_formats'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', doneAt: d(-17), sprint: 'Sprint 41', externalKey: 'PAY-1202', storyMapId: 'map_export', mapStepId: 'st2', sliceId: 'sl1' });
    ST('e3', { title: 'Export invoices to CSV', asA: 'Finance Admin', iWant: 'the export as CSV', soThat: 'I can import it into our ERP', acceptance: G('a scheduled export runs', 'the format is CSV', 'the file is UTF-8 with a header row'), status: 'done', estimate: 2, requirementIds: ['req_formats'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', doneAt: d(-16), externalKey: 'PAY-1203', storyMapId: 'map_export', mapStepId: 'st2', sliceId: 'sl1' });
    ST('e4', { title: 'Run exports as background jobs', asA: 'Finance Admin', iWant: 'large exports to complete reliably', soThat: 'I get all invoices, not a timeout', acceptance: G('an export of 100,000 rows', 'the job runs', 'it completes within 30 seconds at p95'), status: 'done', estimate: 8, requirementIds: ['req_limit', 'req_perf'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', doneAt: d(-10), externalKey: 'PAY-1204', storyMapId: 'map_export', mapStepId: 'st1', sliceId: 'sl1' });
    ST('e5', { title: 'Email a signed download link', asA: 'Finance Admin', iWant: 'an email with a secure link when the export is ready', soThat: 'I know it finished and the file stays protected', acceptance: G('an export succeeded', 'the email is sent', 'it contains a signed link that expires after 7 days'), status: 'done', estimate: 5, requirementIds: ['req_link'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', doneAt: d(-6), externalKey: 'PAY-1205', storyMapId: 'map_export', mapStepId: 'st4', sliceId: 'sl1' });
    ST('e6', { title: 'Apply field-level permissions to exports', asA: 'Security lead', iWant: 'exports to respect field permissions', soThat: 'exports are not an exfiltration path', acceptance: G('a user without bank-account permission', 'they export invoices', 'the bank account column is masked'), status: 'in-review', estimate: 5, requirementIds: ['req_fieldperm'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', externalKey: 'PAY-1206', storyMapId: 'map_export', mapStepId: 'st5', sliceId: 'sl1' });
    ST('e7', { title: 'Escape formulas in exported cells', asA: 'Security lead', iWant: 'formula characters escaped', soThat: 'opening an export cannot execute code', acceptance: G('an invoice field starts with "="', 'it is exported', 'the cell is prefixed with an apostrophe'), status: 'in-progress', estimate: 2, requirementIds: ['req_injection'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', externalKey: 'PAY-1207', storyMapId: 'map_export', mapStepId: 'st6', sliceId: 'sl1' });
    ST('e8', { title: 'Run schedules in the account time zone', asA: 'Finance Admin', iWant: 'the export to run at 06:00 my time on the first business day', soThat: 'the file is ready when I start the close', acceptance: G('an account in Europe/London', 'the period ends on a Friday', 'the export runs Monday 06:00 Europe/London'), status: 'in-progress', estimate: 5, requirementIds: ['req_tz'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', externalKey: 'PAY-1208', storyMapId: 'map_export', mapStepId: 'st3', sliceId: 'sl1' }, 6);
    ST('e9', { title: 'Include payment status in the export', asA: 'Finance Controller', iWant: 'payment status and date in the export', soThat: 'I do not have to join the bank file', acceptance: G('an invoice is paid', 'it is exported', 'the paid date and payment reference are included'), status: 'ready', estimate: 3, requirementIds: ['req_schedule'], betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', storyMapId: 'map_export', mapStepId: 'st1', sliceId: 'sl1' }, 12);
    ST('e10', { title: 'Show export history', asA: 'Finance Admin', iWant: 'to see past exports and download them again', soThat: 'I can find last month\'s file', status: 'ready', estimate: 3, betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', storyMapId: 'map_export', mapStepId: 'st5', sliceId: 'sl1' }, 8);
    ST('e11', { title: 'Notify when an export fails', asA: 'Finance Admin', iWant: 'an email if my export fails', soThat: 'I am not waiting for a file that will never come', acceptance: G('an export fails 3 times', 'retries are exhausted', 'the admin gets an email with the reason'), status: 'ready', estimate: 2, betId: 'bet_export', releaseId: 'rel_nov', teamId: 'team_pay', storyMapId: 'map_export', mapStepId: 'st4', sliceId: 'sl1' }, 5);
    ST('e12', { title: 'Choose export columns', asA: 'Finance Admin', iWant: 'to choose which columns are exported', soThat: 'the file matches my workbook', status: 'backlog', estimate: 5, betId: 'bet_export', teamId: 'team_pay', storyMapId: 'map_export', mapStepId: 'st1', sliceId: 'sl2' }, 2);
    ST('e13', { title: 'Highlight unmatched payments in the export', asA: 'Finance Controller', iWant: 'unmatched payments highlighted', soThat: 'I can find exceptions faster', status: 'backlog', estimate: 8, betId: 'bet_export', teamId: 'team_pay', storyMapId: 'map_export', mapStepId: 'st7', sliceId: 'sl3' }, 30);
    ST('e14', { title: 'Follow the account fiscal calendar', asA: 'Finance Admin', iWant: 'schedules to follow our fiscal periods', soThat: 'exports match our accounting periods', status: 'backlog', estimate: 8, betId: 'bet_export', teamId: 'team_pay', storyMapId: 'map_export', mapStepId: 'st3', sliceId: 'sl2' }, 1);
    // SSO (Platform team)
    ST('s1', { title: 'Configure SAML SSO', asA: 'Account admin', iWant: 'to connect our IdP via SAML', soThat: 'users sign in with company credentials', acceptance: G('valid IdP metadata', 'the admin saves it', 'test sign-in succeeds'), status: 'done', estimate: 8, requirementIds: ['req_saml'], betId: 'bet_sso', releaseId: 'rel_nov', teamId: 'team_plat', doneAt: d(-30), externalKey: 'PLT-880' }, 55);
    ST('s2', { title: 'Enforce SSO with break-glass admin', asA: 'Account admin', iWant: 'to enforce SSO', soThat: 'password logins are impossible', acceptance: G('SSO is enforced', 'a user signs in with a password', 'sign-in is refused'), status: 'done', estimate: 5, requirementIds: ['req_enforce'], betId: 'bet_sso', releaseId: 'rel_nov', teamId: 'team_plat', doneAt: d(-21), externalKey: 'PLT-881' }, 55);
    ST('s3', { title: 'Audit log export (CSV)', asA: 'Account admin', iWant: 'to export the audit log for a date range', soThat: 'I can answer auditor requests', acceptance: G('13 months of audit data', 'the admin exports a date range', 'a CSV with all entries in range is delivered'), status: 'in-progress', estimate: 8, requirementIds: ['req_audit'], betId: 'bet_sso', releaseId: 'rel_nov', teamId: 'team_plat', externalKey: 'PLT-882' }, 55);
    ST('s4', { title: 'SSO login analytics events', asA: 'Data lead', iWant: 'sso_login and sso_configured events', soThat: 'we can measure adoption', status: 'in-review', estimate: 1, betId: 'bet_sso', releaseId: 'rel_nov', teamId: 'team_plat', acceptance: G('a user signs in via SSO', 'sign-in completes', 'an sso_login event is tracked') }, 30);
    ST('s5', { title: 'Rotate SAML certificates without downtime', asA: 'Account admin', iWant: 'to upload a new certificate before the old one expires', soThat: 'nobody is locked out', status: 'ready', estimate: 3, betId: 'bet_sso', releaseId: 'rel_nov', teamId: 'team_plat', acceptance: G('two certificates are configured', 'the IdP switches certificate', 'sign-in keeps working') }, 20);
    // Approval reminders (Growth team)
    ST('r1', { title: 'Reminder email after 24 hours', asA: 'Approver', iWant: 'a reminder when an invoice waits for me', soThat: 'I am not the bottleneck', status: 'ready', estimate: 3, requirementIds: ['req_remind'], betId: 'bet_remind', releaseId: 'rel_dec', teamId: 'team_growth', acceptance: G('an invoice waits 24h for approval', 'the reminder job runs', 'the approver gets one email') }, 10);
    ST('r2', { title: 'One-tap approve on mobile web', asA: 'Approver', iWant: 'to approve from my phone', soThat: 'I can approve between meetings', status: 'backlog', estimate: 8, betId: 'bet_remind', releaseId: 'rel_dec', teamId: 'team_growth', dependsOnIds: ['st_r3'] }, 10);
    ST('r3', { title: 'Mobile approval screen', asA: 'Approver', iWant: 'a mobile-friendly invoice view', soThat: 'I can check before approving', status: 'backlog', estimate: 5, betId: 'bet_remind', releaseId: 'rel_dec', teamId: 'team_growth', dependsOnIds: ['st_r2'] }, 10);
    ST('r4', { title: 'Reminder digest instead of single emails', asA: 'Approver', iWant: 'one daily digest', soThat: 'I am not flooded', status: 'backlog', estimate: 5, betId: 'bet_remind', teamId: 'team_growth' }, 10);
    ST('r5', { title: 'Delegate approvals during absence', asA: 'Approver', iWant: 'to delegate approvals while on holiday', soThat: 'invoices keep moving', status: 'backlog', estimate: 13, betId: 'bet_remind', teamId: 'team_growth' }, 10);
    // Stale / orphan / duplicate backlog
    ST('old1', { title: 'Export invoices to CSV file', iWant: 'to export to CSV', status: 'backlog', estimate: 3 }, 210);
    ST('old2', { title: 'Improve dashboard performance', status: 'backlog' }, 180);
    ST('old3', { title: 'Dark mode', status: 'backlog', estimate: 20 }, 160);
    ST('old4', { title: 'Investigate bank feed providers', iWant: 'to evaluate bank feed APIs', status: 'backlog', betId: 'bet_match', estimate: 3 }, 45);

    // Throughput history: stories finished over the last 12 weeks.
    const rnd = seededRandom(2026);
    const pool = ['Fix', 'Add', 'Improve', 'Refactor', 'Support', 'Validate', 'Log', 'Show', 'Allow', 'Speed up'];
    const objs = ['invoice list paging', 'approval email copy', 'supplier search', 'payment run preview', 'saved filter rename', 'duplicate warning', 'bulk approval limits', 'currency rounding', 'webhook retries', 'audit trail filters', 'PDF template', 'supplier import', 'GL code mapping', 'payment file format', 'session timeout'];
    // Each team's history is split across feature, maintenance and tech-debt work.
    const HISTORY: [string, number, [string, number][]][] = [
      ['team_pay', 2.4, [['bet_dupes', 0.5], ['bet_maint', 0.3], ['bet_debt', 0.2]]],
      ['team_plat', 2.0, [['bet_sso', 0.2], ['bet_reliab', 0.4], ['bet_debt', 0.4]]],
      ['team_growth', 1.6, [['bet_filters', 0.6], ['bet_bulk', 0.2], ['bet_maint', 0.2]]],
    ];
    put('bet_maint', 'bet', { title: 'Maintenance & customer fixes (H2)', hypothesis: 'Keep-the-lights-on work: bugs, support escalations, small fixes.', status: 'shipped', category: 'maintenance', horizon: 'now' }, 120);
    put('bet_reliab', 'bet', { title: 'Platform reliability programme (H2)', hypothesis: 'Reduce incidents and on-call load.', status: 'shipped', category: 'maintenance', horizon: 'now', teamId: 'team_plat' }, 120);
    put('bet_debt', 'bet', { title: 'Tech debt budget (H2)', hypothesis: 'Planned debt reduction from the tech-debt register.', status: 'shipped', category: 'tech-debt', horizon: 'now' }, 120);
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
          const title = `${pool[Math.floor(rnd() * pool.length)]} ${objs[Math.floor(rnd() * objs.length)]}`;
          put(`st_h${hist}`, 'story', { title, status: 'done', estimate: [1, 2, 3, 5][Math.floor(rnd() * 4)], teamId: team, betId: bet, doneAt: d(-doneDaysAgo), acceptance: G('the change is deployed', 'a user exercises it', 'it behaves as specified') }, doneDaysAgo + 14);
        }
      }
    }

    // ---------------- Deliver ----------------
    put('rel_nov', 'release', {
      title: '2026.11 — Scheduled export & SSO', version: '2026.11', targetDate: d(21), status: 'in-progress', tier: 'tier-1', betIds: ['bet_export', 'bet_sso'],
      goals: 'Ship scheduled export to design partners; GA of SAML SSO and audit log export for enterprise.',
      rolloutPlan: 'Flag export.scheduled → 10 design partners (Halcyon Foods, Kitebird, Pinemoor…) in week 1 → 25% in week 3 → 100% by week 5.\nSSO: GA for Enterprise plan at release.',
      rollbackCriteria: 'Export job error rate > 2% or p95 > 60 s for 2 consecutive hours → disable flag.\nSSO login failure rate > 1% → revert to password login for affected accounts.',
      checklist: [
        { id: 'c1', area: 'Support', item: 'Help-centre articles (export, SSO)', ownerId: 'stk_samuel', done: false },
        { id: 'c2', area: 'Support', item: 'Support macros and internal training', ownerId: 'stk_samuel', done: false },
        { id: 'c3', area: 'Sales', item: 'Enablement deck and demo script', ownerId: 'stk_sofia', done: false },
        { id: 'c4', area: 'Commercial', item: 'Plan & pricing decision (DEC-7)', ownerId: 'stk_maya', done: false },
        { id: 'c5', area: 'Security', item: 'Security review sign-off', ownerId: 'stk_grace', done: true },
        { id: 'c6', area: 'Legal', item: 'Retention policy review', ownerId: 'stk_elena', done: false },
        { id: 'c7', area: 'Engineering', item: 'Feature flag and rollout plan', ownerId: 'stk_priya', done: true },
        { id: 'c8', area: 'Engineering', item: 'Load test at 100k rows', ownerId: 'stk_priya', done: false },
        { id: 'c9', area: 'Marketing', item: 'Release notes and in-app announcement', ownerId: 'stk_sofia', done: false },
        { id: 'c10', area: 'Data', item: 'Tracking plan live', ownerId: 'stk_lucas', done: true },
      ],
    }, 40);
    put('rel_dec', 'release', { title: '2026.12 — Approval reminders', version: '2026.12', targetDate: d(55), status: 'planning', tier: 'tier-2', betIds: ['bet_remind'], goals: 'Reminders and mobile approvals for all plans.', checklist: [{ id: 'c1', area: 'Support', item: 'Help-centre article', ownerId: 'stk_samuel', done: false }] }, 20);
    put('rel_sep', 'release', { title: '2026.09 — Saved filters', version: '2026.09', targetDate: d(-52), releasedAt: d(-50), status: 'released', tier: 'tier-3', betIds: ['bet_filters'], checklist: [{ id: 'c1', area: 'Support', item: 'Help-centre article', ownerId: 'stk_samuel', done: true }] }, 100);

    const RAID = (id: string, data: Record<string, unknown>, daysAgo = 20) => put(`raid_${id}`, 'raid', data, daysAgo);
    RAID('load', { kind: 'risk', title: 'Export load spike on the 1st of the month degrades the API', description: 'All monthly schedules fire at 06:00 local time on the same day.', probability: 4, impact: 4, ownerId: 'stk_priya', mitigation: 'Stagger schedules within a 2-hour window; dedicated worker pool for exports.', status: 'mitigating', dueDate: d(10), relatedIds: ['bet_export'] });
    RAID('legal', { kind: 'risk', title: 'Legal may require 10-year retention of generated files', probability: 3, impact: 4, ownerId: 'stk_elena', mitigation: 'Clarify that files are copies; source records retained (REQ-8).', status: 'open', dueDate: d(5), relatedIds: ['bet_export', 'dec_retention'] });
    RAID('promises', { kind: 'risk', title: 'Sales promises dates earlier than the 85% forecast', probability: 4, impact: 5, ownerId: 'stk_daniel', mitigation: '', status: 'open', relatedIds: ['bet_export', 'bet_sso'] }, 15);
    RAID('queue', { kind: 'issue', title: 'Legacy queue drops export jobs longer than 5 minutes', probability: 5, impact: 4, ownerId: 'stk_priya', mitigation: 'Hotfix: split jobs into 20k-row chunks until the migration.', status: 'open', relatedIds: ['bet_export', 'bet_queue'] }, 12);
    RAID('quillsoft', { kind: 'dependency', title: 'Quillsoft ERP connector: bank statement feed', externalTeam: 'Quillsoft (partner)', probability: 3, impact: 3, ownerId: 'stk_raj', status: 'open', dueDate: d(5), relatedIds: ['bet_match'] });
    RAID('signed', { kind: 'dependency', title: 'Platform: signed URL service in production', externalTeam: 'Platform', probability: 2, impact: 4, ownerId: 'stk_priya', status: 'open', dueDate: d(4), relatedIds: ['bet_export'] });
    RAID('partners', { kind: 'assumption', title: 'Design partners give feedback within a week of beta', probability: 2, impact: 3, ownerId: 'stk_noah', status: 'open', relatedIds: ['bet_export'] });
    RAID('lockout', { kind: 'risk', title: 'SSO misconfiguration locks customer admins out', probability: 2, impact: 5, ownerId: 'stk_grace', mitigation: 'Break-glass admin; test sign-in before enforcing.', status: 'mitigating', relatedIds: ['bet_sso'] });
    RAID('flaky', { kind: 'issue', title: 'E2E suite flaky — releases delayed by a day', probability: 4, impact: 2, ownerId: 'stk_priya', status: 'closed', mitigation: 'Quarantined 14 flaky tests.' }, 60);

    const TC = (id: string, data: Record<string, unknown>) => put(`tc_${id}`, 'testCase', data, 10);
    TC('1', { title: 'Finance Admin creates a monthly schedule', kind: 'uat', storyIds: ['st_e1'], requirementIds: ['req_schedule'], releaseId: 'rel_nov', steps: '1. Log in as Finance Admin\n2. Invoices → Export → Schedule\n3. Save monthly XLSX', expected: 'Schedule saved; next run date shown', status: 'pass', testerId: 'stk_olivia', executedAt: d(-5) });
    TC('2', { title: 'XLSX opens in Excel with one row per invoice', kind: 'uat', storyIds: ['st_e2'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_olivia', executedAt: d(-5) });
    TC('3', { title: 'CSV imports into ERP', kind: 'uat', storyIds: ['st_e3'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_chloe', executedAt: d(-4) });
    TC('4', { title: '100k-row export completes', kind: 'uat', storyIds: ['st_e4'], requirementIds: ['req_limit', 'req_perf'], releaseId: 'rel_nov', expected: 'File delivered within 30 s', status: 'fail', testerId: 'stk_olivia', executedAt: d(-3) });
    TC('5', { title: 'Signed link expires after 7 days', kind: 'acceptance', storyIds: ['st_e5'], requirementIds: ['req_link'], releaseId: 'rel_nov', status: 'fail', executedAt: d(-2) });
    TC('6', { title: 'Viewer cannot export', kind: 'acceptance', storyIds: ['st_e6'], requirementIds: ['req_fieldperm'], releaseId: 'rel_nov', status: 'not-run' });
    TC('7', { title: 'Bank account masked for approvers', kind: 'uat', storyIds: ['st_e6'], requirementIds: ['req_fieldperm'], releaseId: 'rel_nov', status: 'blocked', testerId: 'stk_chloe' });
    TC('8', { title: 'Formula cells are escaped', kind: 'acceptance', storyIds: ['st_e7'], requirementIds: ['req_injection'], releaseId: 'rel_nov', status: 'not-run' });
    TC('9', { title: 'SAML sign-in with Okta', kind: 'uat', storyIds: ['st_s1'], requirementIds: ['req_saml'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_noah', executedAt: d(-12) });
    TC('10', { title: 'Password login refused when SSO enforced', kind: 'uat', storyIds: ['st_s2'], requirementIds: ['req_enforce'], releaseId: 'rel_nov', status: 'pass', testerId: 'stk_noah', executedAt: d(-12) });
    TC('11', { title: 'Audit log export for 13 months', kind: 'uat', storyIds: ['st_s3'], requirementIds: ['req_audit'], releaseId: 'rel_nov', status: 'not-run', testerId: 'stk_noah' });
    TC('12', { title: 'Exported file contains only permitted columns', kind: 'regression', status: 'not-run' });

    const BUG = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`bug_${id}`, 'defect', data, daysAgo);
    BUG('timeout', { title: 'Export times out above 60k rows', severity: 's2-major', status: 'in-progress', foundIn: 'uat', rootCause: 'requirement', storyId: 'st_e4', requirementId: 'req_limit', releaseId: 'rel_nov', reportedAt: d(-3), detail: 'Original spec said 50k rows; baseline later changed to 100k without re-sizing workers.' }, 3);
    BUG('utc', { title: 'Date filter uses UTC instead of account time zone', severity: 's2-major', status: 'triaged', foundIn: 'uat', rootCause: 'requirement', storyId: 'st_e8', requirementId: 'req_tz', releaseId: 'rel_nov', reportedAt: d(-4), detail: 'Time zone was not specified until REQ-12 was added.' }, 4);
    BUG('expiry', { title: 'Signed link expires after 24 hours, not 7 days', severity: 's3-minor', status: 'new', foundIn: 'staging', rootCause: 'code', storyId: 'st_e5', requirementId: 'req_link', releaseId: 'rel_nov', reportedAt: d(-2) }, 2);
    BUG('logout', { title: 'SSO logout does not end the IdP session', severity: 's3-minor', status: 'fixed', foundIn: 'uat', rootCause: 'design', storyId: 'st_s1', releaseId: 'rel_nov', reportedAt: d(-14) }, 14);
    BUG('typo', { title: 'Typo in export-ready email subject', severity: 's4-trivial', status: 'new', foundIn: 'review', rootCause: 'code', storyId: 'st_e5', reportedAt: d(-1) }, 1);
    BUG('filter', { title: 'Saved filter lost after renaming', severity: 's3-minor', status: 'verified', foundIn: 'production', rootCause: 'code', featureId: 'feat_filters', reportedAt: d(-30) }, 30);

    // ---------------- Learn ----------------
    const F = (id: string, data: Record<string, unknown>) => put(`feat_${id}`, 'feature', data, 300);
    F('capture', { name: 'Invoice capture (OCR + email-in)', status: 'ga', launchedAt: d(-900), adoption: 92, adoptionTrend: 'flat', maintenanceCost: 'medium', plan: 'all', ownerId: 'stk_me' });
    F('approvals', { name: 'Approval workflows', status: 'ga', launchedAt: d(-850), adoption: 88, adoptionTrend: 'flat', maintenanceCost: 'medium', plan: 'all' });
    F('bulk', { name: 'Bulk approval', status: 'ga', launchedAt: d(-115), adoption: 41, adoptionTrend: 'rising', maintenanceCost: 'low', plan: 'all', betIds: ['bet_bulk'] });
    F('filters', { name: 'Saved filters', status: 'ga', launchedAt: d(-50), adoption: 23, adoptionTrend: 'rising', maintenanceCost: 'low', plan: 'all', betIds: ['bet_filters'] });
    F('ai', { name: 'AI categorisation suggestions', status: 'ga', launchedAt: d(-200), adoption: 3, adoptionTrend: 'falling', maintenanceCost: 'high', plan: 'pro', betIds: ['bet_ai'], description: 'Suggests GL codes for invoice lines.' });
    F('csv', { name: 'Manual CSV export (per page)', status: 'ga', launchedAt: d(-1000), adoption: 64, adoptionTrend: 'flat', maintenanceCost: 'medium', plan: 'all', sunsetPlan: 'Replace with scheduled export (2026.11). Keep for 2 releases, then redirect to the new export flow.' });
    F('dupes', { name: 'Duplicate invoice detection', status: 'ga', launchedAt: d(-150), adoption: 55, adoptionTrend: 'flat', maintenanceCost: 'low', plan: 'all', betIds: ['bet_dupes'] });
    F('supmail', { name: 'Supplier payment emails', status: 'ga', launchedAt: d(-600), adoption: 70, adoptionTrend: 'flat', maintenanceCost: 'low', plan: 'all' });
    F('pdfview', { name: 'Legacy PDF invoice viewer', status: 'deprecated', launchedAt: d(-1400), adoption: 6, adoptionTrend: 'falling', maintenanceCost: 'high', plan: 'all', sunsetPlan: 'Sunset on 2027-01-31; customers notified in 2026.09 release notes.' });
    F('runs', { name: 'Payment runs', status: 'ga', launchedAt: d(-800), adoption: 77, adoptionTrend: 'rising', maintenanceCost: 'medium', plan: 'all' });

    put('bc_export', 'businessCase', { title: 'Scheduled export', betId: 'bet_export', years: 3, discountRate: 10, oneTimeCost: 180000, annualCost: 24000, annualBenefit: 420000, rampUp: '40, 85, 100', costOfDelayPerWeek: 9000, status: 'submitted', assumptions: 'Support cost: 200 fewer tickets/month × $35.\nRetention: 50% of at-risk ARR ($550k) retained.\nUpsell: 5% of mid-market to Pro.' }, 30);
    put('bc_sso', 'businessCase', { title: 'SSO and audit log', betId: 'bet_sso', years: 3, discountRate: 10, oneTimeCost: 150000, annualCost: 12000, annualBenefit: 900000, rampUp: '30, 70, 100', costOfDelayPerWeek: 25000, status: 'approved', assumptions: '3 enterprise deals/year unblocked at ~$300k ARR.' }, 70);
    put('bc_match', 'businessCase', { title: 'Automatic matching', betId: 'bet_match', years: 3, discountRate: 10, oneTimeCost: 400000, annualCost: 60000, annualBenefit: 350000, rampUp: '20, 60, 90', costOfDelayPerWeek: 6000, status: 'draft' }, 20);

    // ---------------- Stakeholder work ----------------
    const I = (id: string, data: Record<string, unknown>) => put(`int_${id}`, 'interaction', data, 5);
    I('d1', { title: 'Q4 pipeline review', date: d(-60), stakeholderIds: ['stk_daniel'], kind: '1:1', sentiment: 1, summary: 'Positive about SSO plan; wants dates.' });
    I('d2', { title: 'Stonebridge loss debrief', date: d(-40), stakeholderIds: ['stk_daniel'], kind: 'meeting', sentiment: 0, summary: 'Frustrated about losing on SSO.' });
    I('d3', { title: 'Export SLA discussion', date: d(-25), stakeholderIds: ['stk_daniel', 'stk_priya'], kind: 'meeting', sentiment: -1, summary: 'Sales wants 10 s; engineering says 30 s.', followUps: 'Draft change request with load data.' });
    I('d4', { title: 'Escalation: Trailmark Outdoors audit log date', date: d(-11), stakeholderIds: ['stk_daniel'], kind: 'call', sentiment: -1, summary: 'Promised audit export before their review without checking the forecast.' });
    I('d5', { title: 'Weekly sync', date: d(-4), stakeholderIds: ['stk_daniel'], kind: '1:1', sentiment: -2, summary: '"Every date I give customers slips." Asked for a single source of truth on dates.', followUps: 'Show the promise ledger and 85% forecast.' });
    I('m1', { title: 'Budget review: export infrastructure', date: d(-55), stakeholderIds: ['stk_maya'], kind: 'meeting', sentiment: 0 });
    I('m2', { title: 'Business case walkthrough', date: d(-25), stakeholderIds: ['stk_maya'], kind: 'meeting', sentiment: 1, summary: 'Asked for infra cost estimate at 100k-row scale.' });
    I('o1', { title: 'Design partner kickoff', date: d(-45), stakeholderIds: ['stk_olivia'], kind: 'workshop', sentiment: 1 });
    I('o2', { title: 'Close workshop', date: d(-40), stakeholderIds: ['stk_olivia', 'stk_aisha'], kind: 'workshop', sentiment: 1, relatedIds: ['eli_halcyon'] });
    I('o3', { title: 'Prototype feedback', date: d(-26), stakeholderIds: ['stk_olivia'], kind: 'demo', sentiment: 2, summary: 'Loved the schedule flow.' });
    I('o4', { title: 'UAT check-in', date: d(-12), stakeholderIds: ['stk_olivia'], kind: 'call', sentiment: 0, summary: 'Worried about the 100k-row timeout.' });
    I('p1', { title: 'Refinement prep', date: d(-8), stakeholderIds: ['stk_priya'], kind: '1:1', sentiment: 1 });
    I('p2', { title: 'Release planning', date: d(-2), stakeholderIds: ['stk_priya'], kind: '1:1', sentiment: 1 });
    I('s1', { title: 'Support readiness', date: d(-9), stakeholderIds: ['stk_samuel'], kind: 'meeting', sentiment: 0, summary: 'Needs docs two weeks before launch.' });
    I('e1', { title: 'Retention question', date: d(-40), stakeholderIds: ['stk_elena'], kind: 'email', sentiment: 0 });
    I('h1', { title: 'Board prep', date: d(-10), stakeholderIds: ['stk_hiroshi'], kind: 'meeting', sentiment: 1 });
    I('h2', { title: 'Steering — October', date: d(-20), stakeholderIds: ['stk_hiroshi', 'stk_maya', 'stk_daniel', 'stk_priya'], kind: 'steering', sentiment: 0, relatedIds: ['mtg_steer'] });
    I('b1', { title: 'Renewal check-in', date: d(-50), stakeholderIds: ['stk_ben', 'stk_noah'], kind: 'call', sentiment: 0 });
    I('b2', { title: 'Interview: audit needs', date: d(-18), stakeholderIds: ['stk_ben'], kind: 'call', sentiment: -1, relatedIds: ['eli_pinemoor'] });
    I('b3', { title: 'PDF export follow-up', date: d(-9), stakeholderIds: ['stk_ben'], kind: 'email', sentiment: -2, summary: '"If auditors cannot get PDFs we will have to look elsewhere."' });
    I('c1', { title: 'Bulk approval thank-you', date: d(-70), stakeholderIds: ['stk_chloe'], kind: 'email', sentiment: 2 });
    I('c2', { title: 'Beta invite', date: d(-15), stakeholderIds: ['stk_chloe'], kind: 'email', sentiment: 1 });
    I('a1', { title: 'Design critique', date: d(-6), stakeholderIds: ['stk_aisha'], kind: 'meeting', sentiment: 1 });
    I('l1', { title: 'Tracking plan', date: d(-13), stakeholderIds: ['stk_lucas'], kind: 'chat', sentiment: 1 });
    I('n1', { title: 'Renewals at risk', date: d(-7), stakeholderIds: ['stk_noah'], kind: '1:1', sentiment: 0 });
    I('r1', { title: 'Partner QBR', date: d(-35), stakeholderIds: ['stk_raj'], kind: 'meeting', sentiment: 1 });
    I('so1', { title: 'Launch planning', date: d(-30), stakeholderIds: ['stk_sofia'], kind: 'meeting', sentiment: 0 });

    const RQ = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`rq_${id}`, 'request', { receivedAt: d(-daysAgo), ...data }, daysAgo);
    RQ('olivia', { title: 'Monthly export of all invoices with payment status', requesterId: 'stk_olivia', priority: 'high', status: 'planned', betId: 'bet_export', evidenceIds: ['ev_1'], responseNote: 'Planned for 2026.11; Halcyon Foods is a design partner.' }, 45);
    RQ('ben', { title: 'PDF export for auditors', requesterId: 'stk_ben', priority: 'high', status: 'triaging', respondBy: d(-2), evidenceIds: ['ev_6'], description: 'Auditors at Pinemoor want PDF listings.' }, 9);
    RQ('daniel', { title: 'SSO for the enterprise pipeline', requesterId: 'stk_daniel', priority: 'critical', status: 'planned', betId: 'bet_sso' }, 60);
    RQ('samuel', { title: 'Release calendar visible to Support', requesterId: 'stk_samuel', priority: 'medium', status: 'new', respondBy: d(3) }, 4);
    RQ('chloe', { title: 'Bulk approve invoices', requesterId: 'stk_chloe', priority: 'medium', status: 'done', betId: 'bet_bulk', loopClosed: false }, 200);
    RQ('maya', { title: 'Infrastructure cost estimate for exports at scale', requesterId: 'stk_maya', priority: 'high', status: 'accepted', respondBy: d(7) }, 25);
    RQ('grace', { title: 'Security review of the export design', requesterId: 'stk_grace', priority: 'high', status: 'done', betId: 'bet_export', loopClosed: true }, 30);
    RQ('noah', { title: 'Approval reminders for Marlow Health', requesterId: 'stk_noah', priority: 'medium', status: 'planned', betId: 'bet_remind' }, 20);
    RQ('www', { title: 'Consolidated view across 12 subsidiaries', requesterId: 'stk_noah', priority: 'high', status: 'declined', responseNote: 'Deferred to 2027 (DEC-6). Shared reasoning with the account.', loopClosed: true }, 70);
    RQ('raj', { title: 'API for invoice payment status', requesterId: 'stk_raj', priority: 'medium', status: 'new', respondBy: d(-5) }, 15);
    RQ('lucas', { title: 'Review tracking plan for export events', requesterId: 'stk_lucas', priority: 'low', status: 'new', respondBy: d(2) }, 3);
    RQ('hiroshi', { title: 'One-page enterprise readiness update for the board', requesterId: 'stk_hiroshi', priority: 'high', status: 'new', respondBy: d(1) }, 2);

    const CM = (id: string, data: Record<string, unknown>, daysAgo: number) => put(`com_${id}`, 'commitment', { status: 'open', ...data }, daysAgo);
    CM('contoso', { title: 'Scheduled export live for Halcyon Foods', toId: 'stk_olivia', promisedById: 'stk_daniel', account: 'Halcyon Foods', dueDate: d(14), betId: 'bet_export', releaseId: 'rel_nov', notes: 'Promised in the QBR; their close starts on the 1st.' }, 30);
    CM('adventure', { title: 'Audit log export before Trailmark Outdoors security review', toId: 'stk_daniel', promisedById: 'stk_me', account: 'Trailmark Outdoors', dueDate: d(3), betId: 'bet_sso' }, 11);
    CM('stonebridge', { title: 'SSO available for Stonebridge Bank re-pitch', promisedById: 'stk_daniel', account: 'Stonebridge Bank', dueDate: d(12), betId: 'bet_sso' }, 20);
    CM('fabrikam', { title: 'Export roadmap update to Pinemoor before renewal', toId: 'stk_ben', promisedById: 'stk_me', account: 'Pinemoor', dueDate: d(5) }, 9);
    CM('marlow', { title: 'Approval reminders for Marlow by year end', promisedById: 'stk_noah', account: 'Marlow Health', dueDate: d(60), betId: 'bet_remind' }, 20);
    CM('kitebird', { title: 'Bulk approval for Kitebird', toId: 'stk_chloe', promisedById: 'stk_me', account: 'Kitebird Toys', dueDate: d(-120), betId: 'bet_bulk', status: 'kept' }, 200);

    put('raci_export', 'raci', {
      title: 'Scheduled export — RACI', scopeId: 'bet_export',
      activities: ['Define scope & requirements', 'Approve PRD', 'Pricing & packaging', 'Security review', 'Build & test', 'Customer beta', 'Launch communications'],
      memberIds: ['stk_me', 'stk_priya', 'stk_maya', 'stk_grace', 'stk_daniel', 'stk_samuel', 'stk_elena', 'stk_sofia', 'stk_aisha'],
      assignments: {
        'Define scope & requirements': { stk_me: 'A', stk_aisha: 'R', stk_priya: 'C', stk_daniel: 'C', stk_samuel: 'I' },
        'Approve PRD': { stk_me: 'R', stk_priya: 'A', stk_grace: 'C', stk_elena: 'C', stk_daniel: 'C' },
        'Pricing & packaging': { stk_maya: 'A', stk_daniel: 'A', stk_sofia: 'R', stk_me: 'C' },
        'Security review': { stk_grace: 'A', stk_priya: 'R', stk_elena: 'C', stk_daniel: 'C' },
        'Build & test': { stk_priya: 'A', stk_me: 'C', stk_aisha: 'C', stk_daniel: 'I' },
        'Customer beta': { stk_me: 'A', stk_samuel: 'R', stk_daniel: 'C' },
        'Launch communications': { stk_sofia: 'R', stk_samuel: 'C', stk_daniel: 'C', stk_me: 'I' },
      },
    }, 30);
    put('raci_sso', 'raci', {
      title: 'SSO & audit — RACI', scopeId: 'bet_sso', activities: ['Requirements', 'Security design', 'Build', 'Enterprise pilot'], memberIds: ['stk_me', 'stk_grace', 'stk_priya', 'stk_daniel', 'stk_noah'],
      assignments: { Requirements: { stk_me: 'A', stk_grace: 'C', stk_daniel: 'C' }, 'Security design': { stk_grace: 'A', stk_priya: 'R', stk_me: 'I' }, Build: { stk_priya: 'A', stk_me: 'C' }, 'Enterprise pilot': { stk_daniel: 'A', stk_noah: 'R', stk_me: 'C' } },
    }, 60);

    put('appr_prd', 'approval', { title: 'Approve Scheduled export PRD (v3)', subjectId: 'spec_export', requestedById: 'stk_me', dueDate: d(2), approvers: [
      { stakeholderId: 'stk_priya', status: 'approved', at: d(-3), comment: 'Feasible with the async job platform.' },
      { stakeholderId: 'stk_grace', status: 'approved', at: d(-2), comment: 'Signed links + 7-day expiry OK.' },
      { stakeholderId: 'stk_elena', status: 'pending' },
      { stakeholderId: 'stk_maya', status: 'pending' },
    ] }, 5);
    put('appr_baseline', 'approval', { title: 'Sign-off: requirements baseline v1 (Scheduled export)', subjectId: 'base_export1', requestedById: 'stk_priya', dueDate: d(-1), approvers: [
      { stakeholderId: 'stk_priya', status: 'approved', at: d(-11) },
      { stakeholderId: 'stk_me', status: 'pending' },
    ] }, 12);
    put('appr_golive', 'approval', { title: 'Go / no-go: release 2026.11', subjectId: 'rel_nov', requestedById: 'stk_me', dueDate: d(19), approvers: [
      { stakeholderId: 'stk_priya', status: 'pending' }, { stakeholderId: 'stk_samuel', status: 'pending' }, { stakeholderId: 'stk_grace', status: 'pending' }, { stakeholderId: 'stk_me', status: 'pending' },
    ] }, 2);
    put('appr_sso', 'approval', { title: 'Approve SSO spec', subjectId: 'spec_sso', requestedById: 'stk_me', dueDate: d(-50), approvers: [
      { stakeholderId: 'stk_grace', status: 'approved', at: d(-52) }, { stakeholderId: 'stk_priya', status: 'approved', at: d(-51) },
    ] }, 55);
    put('appr_uat', 'approval', { title: 'UAT sign-off — SSO (Trailmark Outdoors pilot)', subjectId: 'rel_nov', requestedById: 'stk_me', dueDate: d(-3), approvers: [{ stakeholderId: 'stk_noah', status: 'pending' }] }, 8);

    put('cf_sla', 'conflict', { title: 'Export SLA: 10 s (Sales) vs 30 s (Engineering)', partyIds: ['stk_daniel', 'stk_priya'], description: 'REQ-4 and REQ-10 contradict each other.', positions: 'Sales: enterprise RFPs ask for < 10 s.\nEngineering: 30 s at p95 for 100k rows is realistic with async jobs.', interests: 'Sales: not lose RFP checkboxes to Arkwell AP.\nEngineering: avoid paying for workers idle 29 days a month.\nShared: customers get complete files reliably.', status: 'negotiating', raisedAt: d(-9) }, 9);
    put('cf_retention', 'conflict', { title: 'Retention of generated files: 7 days vs 10 years', partyIds: ['stk_elena', 'stk_me'], positions: 'Product: delete files after 7 days (DEC-4).\nLegal: financial records must be retained 10 years.', interests: 'Legal: compliance. Product: minimise personal data at rest and storage cost.', status: 'open', raisedAt: d(-2) }, 2);
    put('cf_threshold', 'conflict', { title: 'Bulk approval default threshold', partyIds: ['stk_chloe', 'stk_grace'], status: 'resolved', resolution: 'Default limit = approver limit; admins can lower it.', raisedAt: d(-150) }, 150);

    put('cm_weekly', 'commsItem', { title: 'Weekly product update', audienceIds: ['stk_daniel', 'stk_samuel', 'stk_noah', 'stk_sofia'], audience: 'Sales, CS, Support, Marketing', channel: 'email', frequency: 'weekly', ownerId: 'stk_me', lastSent: d(-9), format: 'Email: shipped, next, dates (85%)' }, 100);
    put('cm_steer', 'commsItem', { title: 'Monthly steering pack', audienceIds: ['stk_hiroshi', 'stk_maya', 'stk_daniel', 'stk_priya'], channel: 'meeting', frequency: 'monthly', ownerId: 'stk_me', lastSent: d(-20), format: 'Steering pack (generated)' }, 100);
    put('cm_partners', 'commsItem', { title: 'Design-partner update', audienceIds: ['stk_olivia', 'stk_chloe', 'stk_ben'], channel: 'email', frequency: 'biweekly', ownerId: 'stk_me', lastSent: d(-16), format: 'Short email + demo video' }, 60);
    put('cm_notes', 'commsItem', { title: 'Release notes', audience: 'All customers', channel: 'email', frequency: 'per-release', ownerId: 'stk_sofia', format: 'Release notes (generated)' }, 100);
    put('cm_support', 'commsItem', { title: 'Support briefing', audienceIds: ['stk_samuel'], channel: 'meeting', frequency: 'per-release', ownerId: 'stk_me' }, 100);

    put('mtg_refine', 'meeting', {
      title: 'Refinement — Scheduled export', kind: 'refinement', date: d(-6), attendeeIds: ['stk_me', 'stk_priya', 'stk_aisha', 'stk_samuel'], relatedIds: ['bet_export', 'spec_export'],
      agenda: '1. Time zone rule (REQ-12)\n2. Failure notifications\n3. Export history scope',
      notes: '- Decision: schedules run at 06:00 in the account time zone\n- Action: @priya to add the failure email story by Friday\n- Action: @samuel to draft the help-centre outline next week\n- Risk: load spike on the 1st of the month\n- What is the maximum file size we promise?',
      actions: [
        { id: 'a1', text: 'Add the failure email story', ownerId: 'stk_priya', due: d(-3), done: true },
        { id: 'a2', text: 'Draft help-centre outline', ownerId: 'stk_samuel', due: d(1), done: false },
        { id: 'a3', text: 'Confirm max file size with Grace', ownerId: 'stk_me', due: d(-1), done: false },
      ],
    }, 6);
    put('mtg_steer', 'meeting', {
      title: 'Steering committee — October', kind: 'steering', date: d(-20), attendeeIds: ['stk_hiroshi', 'stk_maya', 'stk_daniel', 'stk_priya', 'stk_me'], relatedIds: ['obj_close', 'obj_ent'],
      notes: '- Agreed: SSO stays top priority for enterprise\n- Action: @maya to review the export business case\n- Concern: dates promised to customers keep slipping',
      actions: [{ id: 'a1', text: 'Review export business case', ownerId: 'stk_maya', due: d(-10), done: false }],
    }, 20);
    put('mtg_review', 'meeting', { title: 'Sprint 42 review', kind: 'sprint-review', date: d(3), attendeeIds: ['stk_me', 'stk_priya', 'stk_samuel', 'stk_olivia'], agenda: 'Demo: export history, time zones, field permissions.' }, 1);

    put('rf_1', 'reviewFinding', { specId: 'spec_export', role: 'security', severity: 'critical', title: 'Who is allowed to do this?', detail: 'Exports bypass field-level UI restrictions.', status: 'resolved', resolution: 'Finance Admin role only; field permissions apply to the file (REQ-6).', source: 'engine' }, 20);
    put('rf_2', 'reviewFinding', { specId: 'spec_export', role: 'privacy', severity: 'major', title: 'Retention of generated files?', status: 'converted', resolution: 'Converted to REQ-7 (7 days).', source: 'engine' }, 20);
    put('rf_3', 'reviewFinding', { specId: 'spec_export', role: 'support', severity: 'major', title: 'How will users know it finished — or failed?', status: 'open', source: 'human', detail: 'Samuel: failure notifications are not specified.' }, 6);

    put('cmt_1', 'comment', { entityId: 'spec_export', author: 'Priya Nair', body: 'Can we pin the 100k-row limit before sprint 43? Load test is scheduled.' }, 4);
    put('cmt_2', 'comment', { entityId: 'bet_export', author: 'Maya Chen', body: 'Please include infra cost at full adoption in the business case.' }, 20);
    put('cmt_3', 'comment', { entityId: 'req_perfsales', author: 'Priya Nair', body: 'This contradicts REQ-4. Needs a decision, not two requirements.' }, 8);
  });
}
