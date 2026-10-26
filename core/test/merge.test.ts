import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeById, mergeList, mergeText } from '../engines/merge.ts';

const base = ['# Access portal', '', '## Problem', 'Requests bounce.', '', '## Scope', '- Catalog', '- Approvals', '', '## Open questions', '-'].join('\n');

test('edits to different lines merge cleanly', () => {
  const mine = base.replace('Requests bounce.', 'Requests bounce between managers and owners.');
  const theirs = base.replace('- Approvals', '- Approvals\n- Expiry dates');
  const r = mergeText(base, mine, theirs);
  assert.equal(r.conflicts, 0);
  assert.match(r.text, /bounce between managers/);
  assert.match(r.text, /- Expiry dates/);
});

test('both changing the same line is a conflict, and nothing is lost', () => {
  const mine = base.replace('Requests bounce.', 'Requests wait 46 hours.');
  const theirs = base.replace('Requests bounce.', 'Requests bounce between approvers.');
  const r = mergeText(base, mine, theirs);
  assert.equal(r.conflicts, 1);
  const lines = r.text.split('\n');
  assert.ok(lines.indexOf('Requests wait 46 hours.') >= 0 && lines.indexOf('Requests wait 46 hours.') < lines.indexOf('Requests bounce between approvers.'), 'yours, then theirs');
});

test('identical edits, one-sided edits and appends at the end', () => {
  assert.deepEqual(mergeText(base, base + '\nA', base + '\nA'), { text: base + '\nA', conflicts: 0 });
  assert.deepEqual(mergeText(base, base, base + '\nB'), { text: base + '\nB', conflicts: 0 });
  const r = mergeText('a\nb\nc', 'a\nb\nc\nmine', 'z\na\nb\nc');
  assert.deepEqual(r, { text: 'z\na\nb\nc\nmine', conflicts: 0 });
  const both = mergeText('a', 'a\nmine', 'a\ntheirs');
  assert.equal(both.conflicts, 1);
  assert.equal(both.text, 'a\nmine\ntheirs');
});

test('deleting a section on one side and editing another on the other side', () => {
  const mine = base.replace('## Open questions\n-', '').trimEnd();
  const theirs = base.replace('- Catalog', '- Searchable catalog');
  const r = mergeText(base, mine, theirs);
  assert.equal(r.conflicts, 0);
  assert.ok(!r.text.includes('Open questions'));
  assert.match(r.text, /Searchable catalog/);
});

test('lists of items merge by id', () => {
  const b = [{ id: 'a', label: 'Start' }, { id: 'b', label: 'Approve' }, { id: 'c', label: 'End' }];
  const mine = [{ id: 'a', label: 'Start' }, { id: 'b', label: 'Manager approves' }, { id: 'c', label: 'End' }];
  const theirs = [{ id: 'a', label: 'Start' }, { id: 'b', label: 'Approve' }, { id: 'x', label: 'Provision' }, { id: 'c', label: 'Done' }];
  const r = mergeById(b, mine, theirs);
  assert.equal(r.conflicts, 0);
  assert.deepEqual(r.items.map((s) => `${s.id}:${s.label}`), ['a:Start', 'b:Manager approves', 'x:Provision', 'c:Done']);
  const clash = mergeById(b, [b[0], { id: 'b', label: 'Mine' }, b[2]], [b[0], { id: 'b', label: 'Theirs' }, b[2]]);
  assert.equal(clash.conflicts, 1);
  assert.equal(clash.items[1].label, 'Mine');
  const deleted = mergeById(b, [b[0], b[2]], b);
  assert.deepEqual(deleted.items.map((s) => s.id), ['a', 'c'], 'a deletion on one side sticks');
});

test('lane lists keep both sides additions and removals', () => {
  assert.deepEqual(mergeList(['HR', 'IT'], ['HR', 'IT', 'Security'], ['HR', 'Manager']), ['HR', 'Security', 'Manager']);
});
