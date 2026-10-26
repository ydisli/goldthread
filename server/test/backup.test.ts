import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { harness } from './harness.ts';
import { backupData } from '../backup.ts';

test('backup copies every database, the key and uploaded files while the server is open', async () => {
  const h = harness();
  const out = mkdtempSync(join(tmpdir(), 'throughline-backup-'));
  try {
    const a = h.user('ana');
    const w = h.ws.create({ name: 'Team', kind: 'team', owner: a.user, sample: 'empty' });
    const made = await h.call('POST', '/api/entities', { session: a.session, workspace: w.id, body: { type: 'decision', title: 'Use SCIM for provisioning' } });
    assert.equal(made.status, 200);
    mkdirSync(join(h.dir, 'files', w.id), { recursive: true });
    writeFileSync(join(h.dir, 'files', w.id, 'f1'), 'attachment bytes');

    const target = join(out, 'copy');
    const r = await backupData(h.dir, target);
    assert.ok(r.databases >= 2);
    assert.equal(r.files, true);
    const db = new DatabaseSync(join(target, 'workspaces', `${w.id}.db`), { readOnly: true });
    const titles = (db.prepare('select data from entities').all() as { data: string }[]).map((x) => JSON.parse(x.data).title);
    db.close();
    assert.ok(titles.includes('Use SCIM for provisioning'));
    assert.equal(readFileSync(join(target, 'files', w.id, 'f1'), 'utf8'), 'attachment bytes');
    assert.deepEqual(readFileSync(join(target, 'secret.key')), readFileSync(join(h.dir, 'secret.key')));
    // Never overwrite an earlier backup.
    await assert.rejects(backupData(h.dir, target), /not empty/);
  } finally { h.done(); rmSync(out, { recursive: true, force: true }); }
});
