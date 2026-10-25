import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDecisionTable, generateTests, pairwise } from '../engines/decisionTable.ts';
import { analyzeStateModel } from '../engines/stateModel.ts';
import { rank, sensitivity, rankingStability } from '../engines/prioritization.ts';
import { monteCarlo, weeklyThroughput, scopeCreep } from '../engines/forecast.ts';
import { sampleSizePerVariant, twoProportionTest, normalInv } from '../engines/stats.ts';
import { evaluateBusinessCase } from '../engines/finance.ts';
import { backlogHygiene, findCycles, invest, validateGherkin } from '../engines/hygiene.ts';
import { clusterEvidence, evidenceStrength } from '../engines/clustering.ts';
import { calibration } from '../engines/calibration.ts';
import { diffSnapshots, versionPatch, wordDiff } from '../engines/requirements.ts';
import { SearchIndex } from '../engines/search.ts';
import { e, NOW } from './helpers.ts';

test('decision table: gaps, overlaps, generated tests', () => {
  const conditions = [{ name: 'role', values: ['admin', 'member'] }, { name: 'size', values: ['small', 'large'] }];
  const actions = [{ name: 'allowed' }];
  const rules = [
    { id: 'R1', when: { role: 'admin', size: '-' }, then: { allowed: 'yes' } },
    { id: 'R2', when: { role: 'member', size: 'small' }, then: { allowed: 'yes' } },
    { id: 'R3', when: { role: 'admin', size: 'large' }, then: { allowed: 'no' } },
  ];
  const a = analyzeDecisionTable(conditions, actions, rules, 'unique');
  assert.equal(a.combinations, 4);
  assert.deepEqual(a.gaps, [{ role: 'member', size: 'large' }]);
  assert.equal(a.overlaps.length, 1);
  assert.equal(a.overlaps[0].conflicting, true);
  assert.equal(a.complete, false);
  const tests = generateTests(conditions, actions, rules, 'first', 'all');
  assert.equal(tests.length, 4);
  assert.equal(tests.find((t) => t.inputs.role === 'member' && t.inputs.size === 'large')!.expected, null);
});

test('pairwise covers every pair with fewer tests than full combination', () => {
  const conditions = [
    { name: 'a', values: ['1', '2', '3'] }, { name: 'b', values: ['x', 'y', 'z'] },
    { name: 'c', values: ['p', 'q'] }, { name: 'd', values: ['m', 'n'] },
  ];
  const tests = pairwise(conditions);
  assert.ok(tests.length < 36);
  for (let i = 0; i < conditions.length; i++)
    for (let j = i + 1; j < conditions.length; j++)
      for (const va of conditions[i].values) for (const vb of conditions[j].values)
        assert.ok(tests.some((t) => t[conditions[i].name] === va && t[conditions[j].name] === vb), `${va}/${vb}`);
});

test('state model: unreachable, dead end, nondeterminism', () => {
  const issues = analyzeStateModel(
    ['draft', 'approved', 'paid', 'void', 'orphan'], 'draft', ['paid', 'void'],
    [
      { from: 'draft', to: 'approved', trigger: 'approve' },
      { from: 'approved', to: 'paid', trigger: 'pay' },
      { from: 'approved', to: 'void', trigger: 'pay' },
    ],
  );
  const msgs = issues.map((i) => i.message).join('\n');
  assert.match(msgs, /"orphan" is unreachable/);
  assert.match(msgs, /"orphan" is a dead end/);
  assert.match(msgs, /add guards/);
});

test('prioritization: RICE ranking, sensitivity flip threshold, stability', () => {
  const bets = [
    e('bet', { id: 'a', title: 'A', reach: 100, impact: 2, confidence: 80, effort: 4 }), // 40
    e('bet', { id: 'b', title: 'B', reach: 90, impact: 2, confidence: 80, effort: 4 }), // 36
    e('bet', { id: 'c', title: 'C', reach: 10, impact: 1, confidence: 50, effort: 10 }), // 0.5
  ];
  const r = rank(bets, 'rice');
  assert.deepEqual(r.map((x) => x.bet.id), ['a', 'b', 'c']);
  const flips = sensitivity(r, 'rice');
  assert.match(flips[0].message, /confidence in "A" drops below 72%/);
  assert.ok(flips[0].relativeChange < 0.15);
  const stab = rankingStability(bets, 'rice', 1);
  assert.ok(stab.get('a')! > stab.get('c')!);
});

test('monte carlo forecast and throughput', () => {
  const stories = Array.from({ length: 24 }, (_, i) => e('story', { status: 'done', doneAt: `2026-10-${String(24 - (i % 20)).padStart(2, '0')}` }));
  const samples = weeklyThroughput(stories, NOW, 4);
  assert.equal(samples.reduce((a, b) => a + b, 0), 24);
  const fc = monteCarlo(10, [2, 3, 2, 3], NOW, { targetDate: '2026-12-31' })!;
  assert.ok(fc.weeks.p50 >= 4 && fc.weeks.p50 <= 5);
  assert.ok(fc.weeks.p85 >= fc.weeks.p50);
  assert.equal(fc.probabilityBy, 1);
  assert.equal(monteCarlo(5, [0, 0], NOW), null);
});

test('scope creep counts stories created after commitment', () => {
  const bet = e('bet', { id: 'b1', startDate: '2026-09-01' });
  const stories = [
    e('story', { betId: 'b1', createdAt: '2026-08-20T00:00:00Z' }),
    e('story', { betId: 'b1', createdAt: '2026-08-21T00:00:00Z' }),
    e('story', { betId: 'b1', createdAt: '2026-09-15T00:00:00Z' }),
  ];
  const sc = scopeCreep(stories, bet)!;
  assert.equal(sc.original, 2);
  assert.equal(sc.added, 1);
});

test('stats: sample size and z-test match known values', () => {
  assert.ok(Math.abs(normalInv(0.975) - 1.95996) < 1e-4);
  const n = sampleSizePerVariant(0.1, 0.2, 0.05, 0.8)!;
  assert.ok(n > 3600 && n < 4000, `n=${n}`);
  const t = twoProportionTest(1000, 100, 1000, 130)!;
  assert.ok(t.significant);
  assert.ok(Math.abs(t.lift - 0.3) < 1e-9);
  assert.ok(t.pValue < 0.05 && t.pValue > 0.01);
});

test('business case: NPV, ROI, payback', () => {
  const r = evaluateBusinessCase(e('businessCase', { years: 3, discountRate: 10, oneTimeCost: 100000, annualCost: 20000, annualBenefit: 100000, rampUp: '50, 100, 100' }));
  assert.equal(r.flows[1].net, 30000);
  assert.equal(r.flows[2].net, 80000);
  assert.ok(Math.abs(r.paybackYears! - (1 + 70000 / 80000)) < 1e-9);
  assert.ok(r.npv > 50000 && r.npv < 60000, `npv=${r.npv}`);
  assert.ok(r.irr! > 0.3);
});

test('hygiene: duplicates, orphans, cycles, INVEST, Gherkin', () => {
  const stories = [
    e('story', { id: 's1', title: 'Export invoices to CSV', status: 'backlog', dependsOnIds: ['s2'], betId: 'b' }),
    e('story', { id: 's2', title: 'Export invoices to CSV file', status: 'backlog', dependsOnIds: ['s1'] }),
    e('story', { id: 's3', title: 'Dark mode', status: 'ready', estimate: 20, acceptance: 'Given x\nWhen y\nThen z' }),
  ];
  const h = backlogHygiene(stories, NOW);
  assert.equal(h.duplicates.length, 1);
  assert.equal(h.cycles.length, 1);
  assert.ok(h.orphans.some((s) => s.id === 's2'));
  assert.ok(h.oversized.some((s) => s.id === 's3'));
  assert.equal(findCycles(stories)[0].length, 2);
  const inv = invest(stories[2]);
  assert.equal(inv.find((x) => x.key === 'S')!.ok, false);
  assert.equal(inv.find((x) => x.key === 'T')!.ok, true);
  assert.ok(validateGherkin('Given a\nThen b').some((i) => /no When/.test(i.message)));
});

test('clustering groups similar evidence and computes strength', () => {
  const ev = [
    e('evidence', { title: 'We export invoices to Excel every month-end', account: 'A', arr: 100, segment: 'smb', date: '2026-10-20', kind: 'said' }),
    e('evidence', { title: 'Month-end invoice export to Excel takes hours', account: 'B', arr: 200, segment: 'enterprise', date: '2026-10-18', kind: 'said' }),
    e('evidence', { title: 'Need to export invoices monthly for reconciliation', account: 'C', arr: 300, segment: 'mid-market', date: '2026-10-10', kind: 'did' }),
    e('evidence', { title: 'Dark mode please, the screen is too bright', account: 'D', arr: 50, date: '2026-10-01' }),
    e('evidence', { title: 'Bright white theme hurts eyes, want dark mode', account: 'E', arr: 60, date: '2026-09-01' }),
  ];
  const c = clusterEvidence(ev, NOW);
  assert.equal(c[0].items.length, 3);
  assert.equal(c[0].arr, 600);
  assert.equal(c[1].items.length, 2);
  const s = evidenceStrength(c[0].items, NOW);
  assert.equal(s.accounts, 3);
  assert.equal(s.segments, 3);
  assert.ok(s.score > 40);
});

test('calibration detects overconfidence', () => {
  const bets = [80, 85, 90, 75].map((c, i) => e('bet', { confidence: c, result: i === 0 ? 'success' : 'failed' }));
  const cal = calibration(bets);
  assert.equal(cal.n, 4);
  assert.ok(cal.bias! > 0.5);
  assert.match(cal.verdict, /Overconfident/);
});

test('baseline diff, word diff and versioning', () => {
  const d = diffSnapshots(
    [{ id: '1', title: 'A', statement: 'export within 30 s' }, { id: '2', title: 'B' }],
    [{ id: '1', title: 'A', statement: 'export within 60 s' }, { id: '3', title: 'C' }],
  );
  assert.equal(d.added.length, 1);
  assert.equal(d.removed.length, 1);
  assert.deepEqual(d.changed[0].fields, ['statement']);
  const w = wordDiff('export within 30 s', 'export within 60 s');
  assert.ok(w.some((p) => p.op === 'del' && p.text.includes('30')));
  const patch = versionPatch(e('requirement', { status: 'approved', title: 'A', statement: 'old', version: 2 }), { statement: 'new' }, '2026-10-25');
  assert.equal(patch.version, 3);
  assert.equal((patch.history as any[]).length, 1);
  assert.deepEqual(versionPatch(e('requirement', { status: 'draft', statement: 'old' }), { statement: 'new' }, 'x'), { statement: 'new' });
});

test('search ranks title matches and exact keys', () => {
  const idx = new SearchIndex([
    e('requirement', { key: 'REQ-12', title: 'Export permissions', statement: 'Only admins can export' }),
    e('evidence', { title: 'Customers love dashboards', detail: 'mentions export once' }),
    e('stakeholder', { name: 'Maya Chen', title: 'CFO' }),
  ]);
  const hits = idx.search('export');
  assert.equal(hits[0].entity.key, 'REQ-12');
  assert.equal(idx.search('REQ-12')[0].entity.key, 'REQ-12');
  assert.equal(idx.search('type:stakeholder')[0].entity.name, 'Maya Chen');
});
