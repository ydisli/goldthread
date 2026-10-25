import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../ai.ts';
import { Store, ValidationError } from '../db.ts';
import { seedWorkspace } from '../seed.ts';

test('redact strips emails, phone numbers and IBANs before model calls', () => {
  const out = redact('Mail jane.doe@contoso.com or call +44 20 7946 0958, IBAN DE89 3704 0044 0532 0130 00.');
  assert.ok(!out.includes('jane.doe'));
  assert.ok(!out.includes('7946'));
  assert.ok(!out.includes('DE89'));
  assert.match(out, /\[email\]/);
});

test('store: create assigns keys, update versions approved requirements, delete is soft and audited', () => {
  const s = new Store(':memory:');
  const a = s.create('requirement', { title: 'Export', statement: 'v1', status: 'approved' }, 'tester');
  const b = s.create('requirement', { title: 'Import' }, 'tester');
  assert.equal(a.key, 'REQ-1');
  assert.equal(b.key, 'REQ-2');
  const a2 = s.update(a.id, { statement: 'v2' }, 'tester');
  assert.equal(a2.version, 2);
  assert.equal(a2.history.length, 1);
  s.delete(b.id, 'tester');
  assert.equal(s.get(b.id), undefined);
  const log = s.activity({ limit: 10 });
  assert.deepEqual(log.map((x) => x.action), ['delete', 'update', 'create', 'create']);
  assert.deepEqual(log[1].changes?.statement, { from: 'v1', to: 'v2' });
});

test('store: validation rejects bad input; approvals derive their status', () => {
  const s = new Store(':memory:');
  assert.throws(() => s.create('stakeholder', { power: 9 }), ValidationError);
  const ap = s.create('approval', { title: 'Sign', approvers: [{ stakeholderId: 'x', status: 'approved' }, { stakeholderId: 'y', status: 'rejected' }] });
  assert.equal(ap.status, 'rejected');
});

test('seed loads a consistent demo workspace', () => {
  const s = new Store(':memory:');
  seedWorkspace(s, new Date());
  const all = s.all();
  assert.ok(all.length > 350);
  const ids = new Set(all.map((e) => e.id));
  // Every reference in the seed points at an entity that exists.
  const dangling: string[] = [];
  for (const e of all) for (const [k, v] of Object.entries(e)) {
    if (/Ids?$/.test(k) && k !== 'id' && k !== 'mapStepId' && k !== 'sliceId') for (const id of (Array.isArray(v) ? v : [v])) if (typeof id === 'string' && !ids.has(id)) dangling.push(`${e.id}.${k}=${id}`);
  }
  assert.deepEqual(dangling, []);
});
