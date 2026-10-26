import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './harness.ts';

test('custom fields and item types: settings, validation on every write path', async () => {
  const h = harness();
  try {
    const a = h.user('ana'), b = h.user('ben');
    const w = h.ws.create({ name: 'Team', kind: 'team', owner: a.user, sample: 'empty' });
    h.sys.addMember(w.id, b.user.id, 'editor');
    const as = { session: a.session, workspace: w.id }, bs = { session: b.session, workspace: w.id };

    // Only admins shape the workspace; what they send is cleaned.
    const denied = await h.call('PATCH', '/api/settings', { ...bs, body: { custom: { fields: { requirement: [{ label: 'Vendor' }] } } } });
    assert.equal(denied.status, 403);
    const set = await h.call('PATCH', '/api/settings', { ...as, body: { custom: {
      fields: { requirement: [{ label: 'Vendor', kind: 'text' }, { label: 'Risk tier', kind: 'enum', options: ['Low', 'High'], required: true }] },
      types: [{ label: 'Environment', icon: 'server', fields: [{ label: 'URL', kind: 'url' }, { label: 'Nodes', kind: 'number' }] }],
    } } });
    assert.equal(set.status, 200);
    assert.deepEqual(set.body.custom.fields.requirement.map((f: { key: string }) => f.key), ['cf_vendor', 'cf_risk_tier']);
    assert.equal(set.body.custom.types[0].id, 'ct_environment');

    // Forms (the API): required and kinds are enforced.
    const missing = await h.call('POST', '/api/entities', { ...bs, body: { type: 'requirement', title: 'SSO for contractors', statement: 'x' } });
    assert.equal(missing.status, 422);
    assert.deepEqual(missing.body.errors, ['Risk tier is required']);
    const ok = await h.call('POST', '/api/entities', { ...bs, body: { type: 'requirement', title: 'SSO for contractors', statement: 'x', cf_vendor: 'Okta', cf_risk_tier: 'High' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.cf_vendor, 'Okta');
    const bad = await h.call('PATCH', `/api/entities/${ok.body.id}`, { ...bs, body: { cf_risk_tier: 'Extreme' } });
    assert.equal(bad.status, 422);

    // Records of the workspace's own type.
    const env = await h.call('POST', '/api/entities', { ...bs, body: { type: 'record', recordType: 'ct_environment', title: 'Staging', cf_url: 'https://staging.example.com', cf_nodes: 3 } });
    assert.equal(env.status, 200);
    const wrongKind = await h.call('POST', '/api/entities', { ...bs, body: { type: 'record', recordType: 'ct_nope', title: 'X' } });
    assert.equal(wrongKind.status, 422);
    const badUrl = await h.call('PATCH', `/api/entities/${env.body.id}`, { ...bs, body: { cf_url: 'ftp://x' } });
    assert.equal(badUrl.status, 422);

    // Batches are checked too, and nothing from a failed batch is kept.
    const before = h.ws.store(w.id).byType('requirement').length;
    const batch = await h.call('POST', '/api/batch', { ...bs, body: [
      { op: 'create', type: 'requirement', data: { title: 'A', statement: 'a', cf_risk_tier: 'Low' } },
      { op: 'create', type: 'requirement', data: { title: 'B', statement: 'b' } },
    ] });
    assert.equal(batch.status, 422);
    assert.equal(h.ws.store(w.id).byType('requirement').length, before);

    // A field made required later doesn't block unrelated edits to existing items.
    await h.call('PATCH', '/api/settings', { ...as, body: { custom: { ...set.body.custom, fields: { requirement: [...set.body.custom.fields.requirement, { label: 'Owner team', kind: 'text', required: true }] } } } });
    const unrelated = await h.call('PATCH', `/api/entities/${ok.body.id}`, { ...bs, body: { title: 'SSO for all contractors' } });
    assert.equal(unrelated.status, 200);

    // Removing a field hides it but keeps the value on the item.
    await h.call('PATCH', '/api/settings', { ...as, body: { custom: { fields: {}, types: set.body.custom.types } } });
    assert.equal(h.ws.store(w.id).get(ok.body.id)?.cf_vendor, 'Okta');

    // Starting over removes the customisation along with the content it described.
    const reset = await h.call('POST', '/api/reset', { ...as, body: { sample: 'empty' } });
    assert.equal(reset.status, 200);
    assert.deepEqual(h.ws.store(w.id).settings().custom, {});
  } finally { h.done(); }
});
