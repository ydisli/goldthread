import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { harness } from './harness.ts';
import { json, standIn } from './standin.ts';

// Slack, Teams and inbound email against local stand-ins: what Goldthread posts, and how
// it verifies and handles what they send. Not tested against the real services.

const until = async (cond: () => boolean, ms = 3000) => { const end = Date.now() + ms; while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 20)); assert.ok(cond(), 'timed out waiting'); };

const slackSign = (secret: string, body: string, ts = Math.floor(Date.now() / 1000)) => ({
  'x-slack-request-timestamp': String(ts),
  'x-slack-signature': `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`,
  'content-type': 'application/x-www-form-urlencoded',
});

test('Slack and Teams: chosen events post to the channel with a link back', async () => {
  const hook = await standIn((req, res) => json(res, 200, {}));
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    const s = { session: owner.session, workspace: w.id };
    assert.equal((await h.call('PUT', '/api/admin/integrations/slack', { ...s, body: { webhookUrl: `${hook.url}/slack`, config: { events: ['requests', 'releases'] } } })).status, 200);
    assert.equal((await h.call('PUT', '/api/admin/integrations/teams', { ...s, body: { webhookUrl: `${hook.url}/teams`, config: { events: ['decisions'] } } })).status, 200);
    const listed = await h.call('GET', '/api/integrations', s);
    assert.equal(listed.body.slack.hasWebhook, true);
    assert.ok(!JSON.stringify(listed.body).includes(hook.url), 'webhook URLs are secrets');

    await h.call('POST', '/api/entities', { ...s, body: { type: 'request', title: 'Bulk reset for the warehouse' } });
    await until(() => hook.requests.some((r) => r.path === '/slack'));
    const slack = hook.requests.find((r) => r.path === '/slack')!;
    assert.match(slack.body.text, /^\*New request: Bulk reset for the warehouse\*/);
    assert.match(slack.body.text, /<http:\/\/.*\/#\/e\/request\/req_[\w-]+\|Open in Goldthread>/);
    assert.ok(!hook.requests.some((r) => r.path === '/teams'), 'Teams did not ask for requests');

    await h.call('POST', '/api/entities', { ...s, body: { type: 'decision', title: 'Retire the chatbot', chosen: 'After answer-first search ships' } });
    await until(() => hook.requests.some((r) => r.path === '/teams'));
    const card = hook.requests.find((r) => r.path === '/teams')!.body;
    assert.equal(card.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
    assert.equal(card.attachments[0].content.body[0].text, 'Decision: Retire the chatbot');

    const rel = await h.call('POST', '/api/entities', { ...s, body: { type: 'release', title: '2026.11', status: 'planning' } });
    await h.call('PATCH', `/api/entities/${rel.body.id}`, { ...s, body: { status: 'released' } });
    await until(() => hook.requests.some((r) => r.path === '/slack' && /Released: 2026.11/.test(r.body.text)));

    const t = await h.call('POST', '/api/admin/integrations/slack/test', s);
    assert.match(t.body.message, /Test message posted to Slack/);
  } finally { h.done(); await hook.close(); }
});

test('Slack slash command: signed requests capture; unsigned or stale ones are refused', async () => {
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    await h.call('PUT', '/api/admin/integrations/slack', { session: owner.session, workspace: w.id, body: { signingSecret: 'slack-secret' } });
    const body = new URLSearchParams({ command: '/goldthread', text: 'request: shift leads need bulk unlock', user_name: 'olivia' }).toString();
    const ok = await h.call('POST', `/api/inbound/slack/${w.id}`, { raw: body, headers: slackSign('slack-secret', body) });
    assert.equal(ok.status, 200);
    assert.match(ok.body.text, /Captured as a request: “shift leads need bulk unlock”/);
    const req = h.ws.store(w.id).byType('request')[0];
    assert.equal(req.title, 'shift leads need bulk unlock');
    assert.match(h.ws.store(w.id).activity({ limit: 1 })[0].actor, /olivia \(Slack\)/);

    const plain = new URLSearchParams({ text: 'scanners time out during unlock', user_name: 'kai' }).toString();
    await h.call('POST', `/api/inbound/slack/${w.id}`, { raw: plain, headers: slackSign('slack-secret', plain) });
    assert.equal(h.ws.store(w.id).byType('evidence')[0].source, 'chat');

    assert.equal((await h.call('POST', `/api/inbound/slack/${w.id}`, { raw: body, headers: slackSign('wrong', body) })).status, 401);
    assert.equal((await h.call('POST', `/api/inbound/slack/${w.id}`, { raw: body, headers: slackSign('slack-secret', body, Math.floor(Date.now() / 1000) - 600) })).status, 401, 'replays older than five minutes');
  } finally { h.done(); }
});

test('Teams outgoing webhook: HMAC verified, mention stripped', async () => {
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    const token = Buffer.from('teams-shared-secret-32-bytes-long!').toString('base64');
    await h.call('PUT', '/api/admin/integrations/teams', { session: owner.session, workspace: w.id, body: { securityToken: token } });
    const raw = JSON.stringify({ type: 'message', text: '<at>Goldthread</at>&nbsp;risk: CRM connector rate-limits bulk provisioning', from: { name: 'Priya Nair' } });
    const auth = `HMAC ${createHmac('sha256', Buffer.from(token, 'base64')).update(raw).digest('base64')}`;
    const r = await h.call('POST', `/api/inbound/teams/${w.id}`, { raw, headers: { authorization: auth, 'content-type': 'application/json' } });
    assert.match(r.body.text, /Captured as a raid: “CRM connector rate-limits bulk provisioning”/);
    assert.equal(h.ws.store(w.id).byType('raid')[0].kind, 'risk');
    assert.equal((await h.call('POST', `/api/inbound/teams/${w.id}`, { raw, headers: { authorization: 'HMAC bm9wZQ==' } })).status, 401);
  } finally { h.done(); }
});

test('Email-in: Postmark JSON and Mailgun forms become signals or requests; wrong addresses are ignored', async () => {
  const h = harness();
  try {
    const owner = h.user('alex');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    const store = h.ws.store(w.id);
    store.create('stakeholder', { name: 'Hannah Lee', email: 'hannah@ashgrove.example' }, 'test');
    const s = { session: owner.session, workspace: w.id };
    await h.call('PUT', '/api/admin/integrations/email-in', s);
    const url = new URL((await h.call('GET', '/api/admin/integrations/email-in/address', s)).body.url);
    const path = url.pathname;
    const pm = await h.call('POST', path, { raw: JSON.stringify({ FromFull: { Email: 'hannah@ashgrove.example', Name: 'Hannah Lee' }, Subject: 'Request: January cohort list format', TextBody: 'Can we send it as a CSV?' }), headers: { 'content-type': 'application/json' } });
    assert.equal(pm.body.type, 'request');
    const req = store.byType('request')[0];
    assert.equal(req.title, 'January cohort list format');
    assert.equal(req.description, 'Can we send it as a CSV?');
    assert.equal(store.get(req.requesterId)?.name, 'Hannah Lee', 'matched to the stakeholder by email');
    const mg = await h.call('POST', path, { raw: new URLSearchParams({ sender: 'agent@ashgrove.example', subject: 'Lots of lockout calls after the holiday', 'body-plain': '40 calls this morning' }).toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(mg.body.type, 'evidence');
    assert.equal(store.byType('evidence')[0].source, 'email');
    assert.equal((await h.call('POST', `/api/inbound/email/${w.id}/wrong-token`, { raw: '{}', headers: { 'content-type': 'application/json' } })).status, 404);
    await h.call('PUT', '/api/admin/integrations/email-in', { ...s, body: { regenerate: true } });
    assert.equal((await h.call('POST', path, { raw: '{}', headers: { 'content-type': 'application/json' } })).status, 404, 'the old address stops working');
  } finally { h.done(); }
});
