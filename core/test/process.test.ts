import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProcess, flowOrder, freeSlot, placeSteps, processMetrics, tidy, type Step } from '../engines/process.ts';

const lanes = ['Requester', 'Desk', 'System'];
const base: Step[] = [
  { id: 'a', lane: 'Requester', label: 'Need arises', kind: 'start', next: ['b'] },
  { id: 'b', lane: 'Requester', label: 'Submit request', kind: 'task', next: ['c'] },
  { id: 'c', lane: 'Desk', label: 'Approved?', kind: 'decision', next: ['d', 'b'], labels: { d: 'Yes', b: 'No' } },
  { id: 'd', lane: 'System', label: 'Provision', kind: 'task', next: ['e'] },
  { id: 'e', lane: 'System', label: 'Done', kind: 'end', next: [] },
];

test('flow order follows the connections from the start', () => {
  const o = flowOrder(base);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map((id) => o.get(id)), [0, 1, 2, 3, 4]);
});

test('placement keeps stored positions and never stacks two steps in one slot', () => {
  const steps = base.map((s) => (s.id === 'd' ? { ...s, pos: 7 } : s.id === 'e' ? { ...s, pos: 7 } : s));
  const p = placeSteps(steps, lanes);
  assert.equal(p.get('d')!.pos, 7);
  assert.equal(p.get('e')!.pos, 8, 'second step in the same lane+pos moves along');
  assert.equal(p.get('c')!.lane, 1);
});

test('free slot finds the nearest empty position in a lane', () => {
  const steps = base.map((s, i) => ({ ...s, pos: i }));
  assert.equal(freeSlot(steps, lanes, 'Requester', 1), 2, 'pos 1 is taken by "Submit request"');
  assert.equal(freeSlot(steps, lanes, 'Requester', 1, 'b'), 1, 'ignoring the step being moved');
  assert.equal(freeSlot(steps, lanes, 'Desk', 5), 5);
});

test('tidy re-spaces steps along the flow', () => {
  const messy = base.map((s) => ({ ...s, pos: 40 }));
  const t = tidy(messy, lanes);
  assert.deepEqual(t.map((s) => s.pos), [0, 1, 2, 3, 4]);
});

test('metrics count handoffs and rework loops', () => {
  const m = processMetrics(base);
  assert.equal(m.steps, 2);
  assert.equal(m.decisions, 1);
  assert.equal(m.handoffs, 3, 'b→c, c→d, c→b cross lanes');
  assert.equal(m.loops, 1, 'c→b goes back');
});

test('a well-formed model has no errors or warnings', () => {
  const issues = checkProcess(base, lanes).filter((i) => i.severity !== 'info');
  assert.deepEqual(issues, []);
});

test('checks catch the usual modelling mistakes', () => {
  const broken: Step[] = [
    { id: 'b', lane: 'Requester', label: 'Submit request', kind: 'task', next: ['x'] },
    { id: 'c', lane: 'Desk', label: 'Approved', kind: 'decision', next: ['d'] },
    { id: 'd', lane: 'Gone', label: 'Provision', kind: 'task', next: [] },
  ];
  const msgs = checkProcess(broken, lanes).map((i) => `${i.severity}: ${i.message}`);
  const has = (re: RegExp) => assert.ok(msgs.some((m) => re.test(m)), `expected ${re} in\n${msgs.join('\n')}`);
  has(/^error: There is no start event/);
  has(/^error: There is no end event/);
  has(/^error: “Submit request” points to a step that no longer exists/);
  has(/^warning: Decision “Approved” has only one outcome/);
  has(/^warning: “Provision” is a dead end/);
  has(/^warning: “Provision” is in lane “Gone”/);
  has(/^info: Phrase decision “Approved” as a question/);
  has(/^info: Lane “System” has no steps/);
});

test('steps that cannot be reached from the start are flagged', () => {
  const steps = [...base, { id: 'z', lane: 'Desk', label: 'Orphan', kind: 'task' as const, next: ['e'] }];
  assert.ok(checkProcess(steps, lanes).some((i) => i.stepId === 'z' && /can't be reached/.test(i.message)));
});
