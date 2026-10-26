import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './harness.ts';
import { json, standIn } from './standin.ts';
import { adfToText, textToAdf } from '../sync.ts';
import { scheduledSyncs } from '../integrations.ts';

// Jira Cloud and Azure DevOps are replaced by local stand-ins that speak the parts of their
// REST APIs Goldthread uses. This checks requests, paging, mapping and re-sync behaviour,
// not compatibility with every Jira or Azure DevOps configuration.

const adf = (text: string) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

function jiraStandIn() {
  const issues = [
    { key: 'SH-201', fields: { summary: 'As a new joiner, I want my laptop ready on day one so that I can start', issuetype: { name: 'Story' }, status: { name: 'Closed', statusCategory: { key: 'done' } }, labels: ['onboarding'], resolutiondate: '2026-10-20T15:14:00.000+0000', description: adf('Laptop arrives before day one.'), customfield_10016: 5, customfield_10020: [{ name: 'SH Sprint 11' }, { name: 'SH Sprint 12' }] } },
    { key: 'SH-202', fields: { summary: 'Provision VPN on approval', issuetype: { name: 'Story' }, status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } }, labels: [], resolutiondate: null, description: null, customfield_10016: 3, customfield_10020: null } },
    { key: 'SH-203', fields: { summary: 'VPN drops every hour', issuetype: { name: 'Bug' }, status: { name: 'Open', statusCategory: { key: 'new' } }, labels: [], resolutiondate: null, description: adf('Users on Wi-Fi lose VPN') } },
  ];
  let created = 0;
  return {
    issues,
    handler: (req: any, res: any) => {
      if (req.path === '/rest/api/3/myself') return json(res, 200, { displayName: 'Alex Rivera' });
      if (req.path === '/rest/api/3/search/jql') {
        const page = req.body.nextPageToken === 'p2' ? 1 : 0;
        return json(res, 200, page === 0 ? { issues: issues.slice(0, 2), nextPageToken: 'p2', isLast: false } : { issues: issues.slice(2), isLast: true });
      }
      if (req.path === '/rest/api/3/issue' && req.method === 'POST') return json(res, 201, { id: '10099', key: `SH-${300 + ++created}` });
      json(res, 404, { errorMessages: ['nope'] });
    },
  };
}

test('Jira: connect, pull in pages, map fields, and re-sync by key', async () => {
  const jira = jiraStandIn();
  const srv = await standIn(jira.handler);
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    const s = { session: owner.session, workspace: w.id };
    const bad = await h.call('PUT', '/api/admin/integrations/jira', { ...s, body: { config: { site: 'not a url', email: 'a@b.c', jql: 'x' }, secret: 't' } });
    assert.equal(bad.status, 422);
    const put = await h.call('PUT', '/api/admin/integrations/jira', { ...s, body: { config: { site: srv.url, email: 'alex@example.com', jql: 'project = SH', projectKey: 'SH' }, secret: 'jira-token' } });
    assert.equal(put.status, 200);
    const list = await h.call('GET', '/api/integrations', s);
    assert.equal(list.body.jira.connected, true);
    assert.ok(!JSON.stringify(list.body).includes('jira-token'), 'the token never comes back');

    assert.match((await h.call('POST', '/api/admin/integrations/jira/test', s)).body.message, /Connected as Alex Rivera/);
    assert.equal(srv.requests[0].headers.authorization, `Basic ${Buffer.from('alex@example.com:jira-token').toString('base64')}`);

    const first = await h.call('POST', '/api/integrations/jira/sync', s);
    assert.equal(first.status, 200);
    assert.deepEqual([first.body.created, first.body.defects, first.body.updated], [2, 1, 0]);
    const search = srv.requests.filter((r) => r.path === '/rest/api/3/search/jql');
    assert.equal(search.length, 2, 'followed nextPageToken');
    assert.equal(search[0].body.jql, 'project = SH');
    const store = h.ws.store(w.id);
    const s201 = store.byType('story').find((x) => x.externalKey === 'SH-201')!;
    assert.deepEqual([s201.status, s201.estimate, s201.sprint, s201.doneAt, s201.asA, s201.description], ['done', 5, 'SH Sprint 12', '2026-10-20', 'new joiner', 'Laptop arrives before day one.']);
    assert.equal(store.byType('defect')[0].externalKey, 'SH-203');

    // Jira moves on; Goldthread links are kept and nothing is duplicated.
    store.update(s201.id, { requirementIds: [] , tags: ['onboarding', 'kept'] }, 'test');
    jira.issues[1].fields.status = { name: 'Done', statusCategory: { key: 'done' } };
    jira.issues[1].fields.resolutiondate = '2026-10-25T10:00:00.000+0000';
    jira.issues[2].fields.status = { name: 'Done', statusCategory: { key: 'done' } };
    const second = await h.call('POST', '/api/integrations/jira/sync', s);
    assert.deepEqual([second.body.created, second.body.defects, second.body.updated], [0, 0, 2]);
    assert.equal(store.byType('story').length, 2);
    assert.equal(store.byType('story').find((x) => x.externalKey === 'SH-202')!.doneAt, '2026-10-25');
    assert.equal(store.byType('defect')[0].status, 'closed');
    assert.deepEqual(store.get(s201.id)!.tags, ['onboarding', 'kept']);

    // Push: stories written in Goldthread get created in Jira and keep the new key.
    const mine = store.create('story', { title: 'Show ticket ETA', asA: 'employee', iWant: 'to see when my request is done', acceptance: 'Given a request\nThen the ETA shows', estimate: 2 }, 'test');
    const pushed = await h.call('POST', '/api/integrations/jira/sync', { ...s, body: { push: true } });
    assert.equal(pushed.body.pushed, 1);
    assert.equal(store.get(mine.id)!.externalKey, 'SH-301');
    const create = srv.requests.find((r) => r.path === '/rest/api/3/issue')!;
    assert.equal(create.body.fields.project.key, 'SH');
    assert.equal(create.body.fields.customfield_10016, 2);
    assert.match(adfToText(create.body.fields.description), /As a employee, I want to see when my request is done\./);
  } finally { h.done(); await srv.close(); }
});

test('Jira: bad credentials are reported on the integration, not swallowed', async () => {
  const srv = await standIn((req, res) => json(res, 401, { errorMessages: ['Unauthorized'] }));
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'T', kind: 'team', owner: owner.user, sample: 'empty' });
    const s = { session: owner.session, workspace: w.id };
    await h.call('PUT', '/api/admin/integrations/jira', { ...s, body: { config: { site: srv.url, email: 'a@example.com', jql: 'project = X' }, secret: 'wrong' } });
    const r = await h.call('POST', '/api/integrations/jira/sync', s);
    assert.equal(r.status, 502);
    assert.match(r.body.error, /rejected the credentials \(401\)/);
    assert.match((await h.call('GET', '/api/integrations', s)).body.jira.status.lastSync.error, /rejected/);
  } finally { h.done(); await srv.close(); }
});

test('Azure DevOps: WIQL, batched work items, HTML fields, pushing stories, scheduled pulls', async () => {
  let createdBody: any;
  const srv = await standIn((req, res) => {
    if (req.path.startsWith('/acme/_apis/projects/')) return json(res, 200, { name: 'ServiceHub' });
    if (req.path.startsWith('/acme/ServiceHub/_apis/wit/wiql')) return json(res, 200, { workItems: [{ id: 4512 }, { id: 4513 }] });
    if (req.path.startsWith('/acme/ServiceHub/_apis/wit/workitemsbatch')) return json(res, 200, { value: [
      { id: 4512, fields: { 'System.Id': 4512, 'System.Title': 'Reset password from the portal', 'System.WorkItemType': 'User Story', 'System.State': 'Closed', 'Microsoft.VSTS.Scheduling.StoryPoints': 2, 'System.IterationPath': 'ServiceHub\\Sprint 9', 'System.Tags': 'self-service; identity', 'System.Description': '<div>Users reset without a ticket</div>', 'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>Given a locked account</li></ul>', 'Microsoft.VSTS.Common.ClosedDate': '2026-10-14T09:02:00Z' } },
      { id: 4513, fields: { 'System.Id': 4513, 'System.Title': 'Show ticket ETA', 'System.WorkItemType': 'User Story', 'System.State': 'Active', 'Microsoft.VSTS.Scheduling.Effort': 3, 'System.IterationPath': 'ServiceHub\\Sprint 10' } },
    ] });
    if (req.path.startsWith('/acme/ServiceHub/_apis/wit/workitems/$User%20Story')) { createdBody = req.body; return json(res, 200, { id: 4600 }); }
    json(res, 404, { message: 'nope' });
  });
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'T', kind: 'team', owner: owner.user, sample: 'empty' });
    const s = { session: owner.session, workspace: w.id };
    await h.call('PUT', '/api/admin/integrations/ado', { ...s, body: { config: { org: `${srv.url}/acme`, project: 'ServiceHub', push: true, intervalMinutes: 15 }, secret: 'ado-pat' } });
    assert.match((await h.call('POST', '/api/admin/integrations/ado/test', s)).body.message, /Connected to ServiceHub/);
    assert.equal(srv.requests[0].headers.authorization, `Basic ${Buffer.from(':ado-pat').toString('base64')}`);
    const store = h.ws.store(w.id);
    store.create('story', { title: 'Approve from Teams', estimate: 1 }, 'test');

    await scheduledSyncs(h.sys, h.ws);
    const stories = store.byType('story');
    const s4512 = stories.find((x) => x.externalKey === '4512')!;
    assert.deepEqual([s4512.status, s4512.sprint, s4512.description, s4512.acceptance, s4512.doneAt], ['done', 'Sprint 9', 'Users reset without a ticket', '- Given a locked account', '2026-10-14']);
    assert.deepEqual(s4512.tags, ['self-service', 'identity']);
    assert.equal(stories.find((x) => x.title === 'Approve from Teams')!.externalKey, '4600', 'pushed because push is on');
    assert.deepEqual(createdBody[0], { op: 'add', path: '/fields/System.Title', value: 'Approve from Teams' });
    const calls = srv.requests.length;
    await scheduledSyncs(h.sys, h.ws);
    assert.equal(srv.requests.length, calls, 'not due again until 15 minutes have passed');
    await scheduledSyncs(h.sys, h.ws, Date.now() + 16 * 60_000);
    assert.ok(srv.requests.length > calls);
  } finally { h.done(); await srv.close(); }
});

test('Atlassian document format converts both ways', () => {
  const doc = textToAdf('First line\n- one\n- two\n\nAfter');
  assert.equal(adfToText(doc), 'First line\n- one\n- two\n\nAfter\n');
});
