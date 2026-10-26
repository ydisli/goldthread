import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './harness.ts';

test('a save based on stale values of the same field is refused with the details', async () => {
  const h = harness();
  try {
    const a = h.user('ana'), b = h.user('ben');
    const w = h.ws.create({ name: 'Team', kind: 'team', owner: a.user, sample: 'empty' });
    h.sys.addMember(w.id, b.user.id, 'editor');
    const as = { session: a.session, workspace: w.id }, bs = { session: b.session, workspace: w.id };
    const created = await h.call('POST', '/api/entities', { ...as, body: { type: 'requirement', title: 'Provisioning time', statement: 'within 15 minutes' } });
    const id = created.body.id;

    // Ben saves first.
    const b1 = await h.call('PATCH', `/api/entities/${id}`, { ...bs, body: { statement: 'p95 within 15 minutes', $prev: { statement: 'within 15 minutes' } } });
    assert.equal(b1.status, 200);
    // Ana edited the same field from the old value: refused, nothing saved.
    const a1 = await h.call('PATCH', `/api/entities/${id}`, { ...as, body: { statement: 'within 5 minutes', $prev: { statement: 'within 15 minutes' } } });
    assert.equal(a1.status, 409);
    assert.equal(a1.body.conflict.by, 'ben');
    assert.deepEqual(a1.body.conflict.fields.map((f: { key: string; theirs: string; yours: string }) => [f.key, f.theirs, f.yours]), [['statement', 'p95 within 15 minutes', 'within 5 minutes']]);
    assert.equal(h.ws.store(w.id).get(id)?.statement, 'p95 within 15 minutes');

    // A different field goes through, and Ben's change stays.
    const a2 = await h.call('PATCH', `/api/entities/${id}`, { ...as, body: { title: 'Provisioning SLA', $prev: { title: 'Provisioning time' } } });
    assert.equal(a2.status, 200);
    assert.equal(a2.body.statement, 'p95 within 15 minutes');
    // Saving the same value someone else already saved is not a conflict.
    const a3 = await h.call('PATCH', `/api/entities/${id}`, { ...as, body: { statement: 'p95 within 15 minutes', $prev: { statement: 'within 15 minutes' } } });
    assert.equal(a3.status, 200);
    // Without $prev (scripts, older clients) the last write wins, as before.
    const a4 = await h.call('PATCH', `/api/entities/${id}`, { ...as, body: { statement: 'within 10 minutes' } });
    assert.equal(a4.status, 200);
    assert.ok(!('$prev' in a4.body), 'the marker is never stored');
  } finally { h.done(); }
});
