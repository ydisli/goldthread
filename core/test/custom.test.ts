import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCustomisation, customFieldDefs, validateCustom } from '../custom.ts';

const KNOWN = ['story', 'requirement', 'record', 'comment'];

test('cleaning makes keys, drops junk and keeps keys stable across renames', () => {
  const c = cleanCustomisation({
    fields: {
      requirement: [
        { label: 'Vendor', kind: 'text' },
        { label: 'Vendor', kind: 'text' },
        { label: 'Risk tier', kind: 'enum', options: 'Low, Medium, , High, Low' },
        { label: 'No choices', kind: 'enum', options: [] },
        { label: '', kind: 'text' },
        { label: 'Odd kind', kind: 'script' },
      ],
      nope: [{ label: 'X' }],
      record: [{ label: 'Not here' }],
    },
    types: [{ label: 'Vendor', icon: 'not-an-icon', fields: [{ label: 'Contract end', kind: 'date' }] }, { label: 'Vendor' }, { label: '' }],
  }, KNOWN);
  assert.deepEqual(c.fields!.requirement.map((f) => f.key), ['cf_vendor', 'cf_vendor_2', 'cf_risk_tier', 'cf_odd_kind']);
  assert.deepEqual(c.fields!.requirement[2].options, ['Low', 'Medium', 'High']);
  assert.equal(c.fields!.requirement[3].kind, 'text', 'unknown kinds fall back to text');
  assert.deepEqual(Object.keys(c.fields!), ['requirement'], 'unknown types and records are ignored');
  assert.deepEqual(c.types!.map((t) => [t.id, t.plural, t.icon]), [['ct_vendor', 'Vendors', 'boxes'], ['ct_vendor_2', 'Vendors', 'boxes']]);
  assert.equal(c.types![0].fields[0].key, 'cf_contract_end');

  // Renaming keeps the key, so values on items survive.
  const renamed = cleanCustomisation({ fields: { requirement: [{ key: 'cf_vendor', label: 'Supplier', kind: 'text' }] } }, KNOWN);
  assert.equal(renamed.fields!.requirement[0].key, 'cf_vendor');
  assert.equal(renamed.fields!.requirement[0].label, 'Supplier');
});

test('custom fields join the type, and records take their kind\'s fields', () => {
  const c = cleanCustomisation({ fields: { story: [{ label: 'Team', kind: 'text' }] }, types: [{ label: 'Vendor', fields: [{ label: 'Site', kind: 'url' }] }] }, KNOWN);
  assert.deepEqual(customFieldDefs('story', c).map((f) => f.key), ['cf_team']);
  assert.deepEqual(customFieldDefs('record', c, 'ct_vendor').map((f) => [f.key, f.kind]), [['cf_site', 'url']]);
  assert.deepEqual(customFieldDefs('record', c, 'ct_other'), []);
  assert.deepEqual(customFieldDefs('story', undefined), []);
});

test('values are checked like built-in ones; edits only check what changed', () => {
  const c = cleanCustomisation({
    fields: { story: [{ label: 'Points left', kind: 'number' }, { label: 'Tier', kind: 'enum', options: ['Gold', 'Silver'], required: true }, { label: 'Spec link', kind: 'url' }, { label: 'Audited', kind: 'bool' }, { label: 'Due', kind: 'date' }] },
    types: [{ label: 'Vendor', fields: [] }],
  }, KNOWN);
  assert.deepEqual(validateCustom('story', { cf_tier: 'Gold' }, c), []);
  assert.deepEqual(validateCustom('story', {}, c), ['Tier is required']);
  const errs = validateCustom('story', { cf_tier: 'Bronze', cf_points_left: 'three', cf_spec_link: 'javascript:alert(1)', cf_audited: 'yes', cf_due: 'soon' }, c);
  assert.equal(errs.length, 5);
  assert.match(errs.join('\n'), /Tier must be one of Gold, Silver/);
  assert.match(errs.join('\n'), /Spec link must be a web address/);
  // A field made required later doesn't block an unrelated edit to an old item…
  assert.deepEqual(validateCustom('story', { title: 'Old' }, c, ['title']), []);
  // …but you can't clear it.
  assert.deepEqual(validateCustom('story', { cf_tier: null }, c, ['cf_tier']), ['Tier is required']);
  // Records must belong to one of the workspace's types.
  assert.deepEqual(validateCustom('record', { recordType: 'ct_vendor' }, c), []);
  assert.equal(validateCustom('record', { recordType: 'ct_gone' }, c).length, 1);
  assert.deepEqual(validateCustom('record', { recordType: 'ct_gone', title: 'x' }, c, ['title']), [], 'items of a removed type can still be edited');
  assert.deepEqual(validateCustom('requirement', { anything: 1 }, undefined), []);
});
