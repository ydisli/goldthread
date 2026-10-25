import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../graph.ts';
import {
  alignmentCheck, approvalStatus, commitmentRisk, engagementGap, influenceNetwork, prepBrief, quadrant, salience,
  sentimentTrend, tailoredUpdate, touchStatus, validateRaci,
} from '../engines/stakeholders.ts';
import { dailyBrief } from '../engines/brief.ts';
import { impactAnalysis, traceMatrix } from '../engines/traceability.ts';
import { e, NOW } from './helpers.ts';

test('quadrant and salience', () => {
  assert.equal(quadrant(e('stakeholder', { power: 5, interest: 5 })), 'manage-closely');
  assert.equal(quadrant(e('stakeholder', { power: 5, interest: 2 })), 'keep-satisfied');
  assert.equal(quadrant(e('stakeholder', { power: 2, interest: 4 })), 'keep-informed');
  assert.equal(quadrant(e('stakeholder', { power: 3, interest: 3 })), 'monitor');
  assert.equal(salience(e('stakeholder', { power: 5, legitimacy: true, urgency: true })), 'definitive');
  assert.equal(salience(e('stakeholder', { power: 2, legitimacy: true, urgency: true })), 'dependent');
  assert.equal(salience(e('stakeholder', { power: 5, urgency: true })), 'dangerous');
});

test('touchpoint cadence: overdue vs ok vs never', () => {
  const s = e('stakeholder', { id: 's', power: 5, interest: 5 });
  const ints = [e('interaction', { stakeholderIds: ['s'], date: '2026-10-10', sentiment: 1 })];
  const t = touchStatus(s, ints, NOW);
  assert.equal(t.cadence, 7);
  assert.equal(t.daysSince, 15);
  assert.equal(t.status, 'overdue');
  assert.equal(t.dueIn, -8);
  assert.equal(touchStatus(e('stakeholder', { id: 'z' }), ints, NOW).status, 'never');
  assert.equal(touchStatus(s, [e('interaction', { stakeholderIds: ['s'], date: '2026-10-24' })], NOW).status, 'ok');
});

test('sentiment trend detects cooling', () => {
  const s = e('stakeholder', { id: 's' });
  const ints = [2, 1, 0, -1, -2].map((v, i) => e('interaction', { stakeholderIds: ['s'], date: `2026-0${i + 4}-01`, sentiment: v }));
  assert.equal(sentimentTrend(s, ints).label, 'cooling');
});

test('engagement gap suggests a move', () => {
  const g = engagementGap(e('stakeholder', { currentEngagement: 'resistant', desiredEngagement: 'supportive' }));
  assert.equal(g.gap, 2);
  assert.match(g.action!, /1:1/);
});

test('influence network scores', () => {
  const a = e('stakeholder', { id: 'a', power: 5 });
  const b = e('stakeholder', { id: 'b', power: 2, influencedBy: ['c'] });
  const c = e('stakeholder', { id: 'c', power: 1 });
  const a2 = { ...a, influencedBy: ['b'] };
  const net = influenceNetwork([a2, b, c]);
  assert.equal(net.get('b')!.score, 5);
  assert.equal(net.get('c')!.score, 2 + 2.5);
});

test('RACI validation', () => {
  const issues = validateRaci(['Approve scope', 'Build'], ['x', 'y'], { 'Approve scope': { x: 'A', y: 'A' }, Build: { x: 'R' } });
  const msgs = issues.map((i) => i.message).join('\n');
  assert.match(msgs, /2 Accountable/);
  assert.match(msgs, /"Build" has no Accountable/);
});

test('approval status aggregation', () => {
  assert.equal(approvalStatus([{ stakeholderId: 'a', status: 'approved' }, { stakeholderId: 'b', status: 'pending' }]), 'pending');
  assert.equal(approvalStatus([{ stakeholderId: 'a', status: 'approved' }, { stakeholderId: 'b', status: 'rejected' }]), 'rejected');
  assert.equal(approvalStatus([{ stakeholderId: 'a', status: 'approved' }]), 'approved');
});

function world() {
  const me = e('stakeholder', { id: 'me', name: 'Pat Product', isMe: true, power: 3, interest: 5 });
  const cfo = e('stakeholder', { id: 'cfo', name: 'Maya Chen', title: 'CFO', power: 5, interest: 4, currentEngagement: 'neutral', desiredEngagement: 'supportive', goals: 'Close the books in 3 days', concerns: 'Audit trail for exports' });
  const sales = e('stakeholder', { id: 'sales', name: 'Tom Okafor', power: 4, interest: 5, currentEngagement: 'resistant', desiredEngagement: 'supportive' });
  const team = e('team', { id: 't1', name: 'Payments' });
  const bet = e('bet', { id: 'bet1', title: 'Scheduled export', status: 'in-delivery', teamId: 't1', opportunityIds: ['o1'], hypothesis: 'We believe scheduled export for finance teams will cut reconciliation time, measured by tickets.' });
  const stories = [
    ...Array.from({ length: 12 }, (_, i) => e('story', { title: `done ${i}`, status: 'done', teamId: 't1', doneAt: `2026-10-${String(1 + i * 2).padStart(2, '0')}`, betId: 'old' })),
    ...Array.from({ length: 6 }, (_, i) => e('story', { id: `s${i}`, title: `todo ${i}`, status: 'backlog', teamId: 't1', betId: 'bet1', requirementIds: i === 0 ? ['r1'] : [] })),
  ];
  const req = e('requirement', { id: 'r1', key: 'REQ-1', title: 'Export permission', status: 'approved', betId: 'bet1', sourceIds: ['cfo'] });
  const tc = e('testCase', { id: 'tc1', title: 'Admin exports', storyIds: ['s0'], status: 'fail' });
  const request = e('request', { id: 'rq1', title: 'Monthly export', requesterId: 'cfo', status: 'planned', betId: 'bet1', respondBy: '2026-10-01' });
  const commitment = e('commitment', { id: 'c1', title: 'Export live for Contoso', toId: 'sales', dueDate: '2026-11-01', betId: 'bet1', status: 'open' });
  const approval = e('approval', { id: 'ap1', title: 'Approve export spec', status: 'pending', dueDate: '2026-10-20', approvers: [{ stakeholderId: 'me', status: 'pending' }, { stakeholderId: 'cfo', status: 'pending' }] });
  const raci = e('raci', { id: 'raci1', title: 'Export RACI', scopeId: 'bet1', activities: ['Approve scope'], memberIds: ['me', 'cfo', 'sales'], assignments: { 'Approve scope': { me: 'R', cfo: 'A', sales: 'C' } } });
  const decision = e('decision', { id: 'd1', title: 'XLSX only in v1', date: '2026-10-22', deciderIds: ['me'], consultedIds: [], relatedIds: ['bet1'], status: 'decided' });
  const interactions = [
    e('interaction', { stakeholderIds: ['cfo'], date: '2026-10-01', sentiment: 1 }),
    e('interaction', { stakeholderIds: ['sales'], date: '2026-10-23', sentiment: -1 }),
  ];
  return new Graph([me, cfo, sales, team, bet, ...stories, req, tc, request, commitment, approval, raci, decision, ...interactions]);
}

test('commitment risk uses the forecast', () => {
  const g = world();
  const r = commitmentRisk(g.get('c1')!, g, NOW);
  assert.ok(['high', 'medium'].includes(r.level), r.reason);
  assert.ok(r.probability !== undefined && r.probability < 0.8);
});

test('prep brief produces talking points', () => {
  const g = world();
  const brief = prepBrief(g.get('cfo')!, g, NOW);
  const kinds = brief.talkingPoints.map((p) => p.kind);
  assert.ok(kinds.includes('approval'));
  assert.ok(kinds.includes('decision'), 'decision made without consulting CFO since last contact');
  assert.ok(kinds.includes('concern'));
  assert.ok(kinds.includes('engagement'));
  assert.match(brief.headline, /Maya Chen/);
});

test('alignment check flags accountable person not involved', () => {
  const g = world();
  const gaps = alignmentCheck(g.get('d1')!, g, NOW);
  const cfo = gaps.find((x) => x.stakeholder.id === 'cfo')!;
  assert.equal(cfo.severity, 'high');
  const sales = gaps.find((x) => x.stakeholder.id === 'sales')!;
  assert.match(sales.reason, /resistant/i);
});

test('tailored updates differ by audience', () => {
  const g = world();
  const exec = tailoredUpdate(g.get('bet1')!, 'exec', g, NOW);
  const sales = tailoredUpdate(g.get('bet1')!, 'sales', g, NOW);
  assert.match(exec, /executive update/);
  assert.match(sales, /Promises already made/);
  assert.match(tailoredUpdate(g.get('bet1')!, 'customer', g, NOW), /helps finance teams/);
});

test('daily brief surfaces approvals, overdue touchpoints and risky promises', () => {
  const g = world();
  const items = dailyBrief(g, NOW);
  const ids = items.map((i) => i.id);
  assert.ok(ids.includes('appr-me-ap1'));
  assert.ok(ids.some((i) => i.startsWith('touch-cfo')));
  assert.ok(ids.includes('com-c1'));
  assert.ok(ids.includes('req-rq1') === false, 'planned requests are not "overdue responses"');
  const sev = items.map((i) => i.severity);
  assert.deepEqual([...sev].sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a) - ['critical', 'high', 'medium', 'low'].indexOf(b)), sev);
});

test('traceability matrix and impact analysis', () => {
  const g = world();
  const tm = traceMatrix(g);
  const row = tm.rows.find((r) => r.requirement.id === 'r1')!;
  assert.equal(row.stories.length, 1);
  assert.equal(row.tests.length, 1);
  assert.ok(row.gaps.includes('failing-test'));
  assert.ok(row.gaps.includes('not-released'));
  const imp = impactAnalysis(g, 'r1')!;
  const types = imp.byType.map((t) => t.type);
  assert.ok(types.includes('story'));
  assert.ok(types.includes('testCase'));
  assert.ok(types.includes('bet'));
  assert.ok(imp.stakeholders.some((s) => s.stakeholder.id === 'cfo'));
});
