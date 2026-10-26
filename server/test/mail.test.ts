import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import { flushOutbox, formatMessage, mailConfig, sendSmtp } from '../mail.ts';
import { sendDigests } from '../notify.ts';
import { harness } from './harness.ts';

// A local SMTP stand-in. It checks Goldthread's SMTP conversation and the messages it
// builds; it is not a real mail provider, so STARTTLS and deliverability are untested here.

interface Received { from: string; to: string[]; auth?: string; data: string; subject: string; body: string }

async function smtpStandIn(opts: { rejectRcpt?: boolean } = {}) {
  const received: Received[] = [];
  const server = createServer((sock: Socket) => {
    let buf = '', inData = false, cur: Partial<Received> & { to: string[] } = { to: [] };
    const out = (s: string) => sock.write(`${s}\r\n`);
    out('220 smtp.test ESMTP stand-in');
    sock.on('data', (d) => {
      buf += d.toString('utf8');
      while (true) {
        if (inData) {
          const end = buf.indexOf('\r\n.\r\n');
          if (end < 0) return;
          const data = buf.slice(0, end).replace(/\r\n\.\./g, '\r\n.');
          buf = buf.slice(end + 5);
          inData = false;
          const [head, ...rest] = data.split('\r\n\r\n');
          const subject = /^Subject: (.*)$/m.exec(head)?.[1] ?? '';
          const decodedSubject = subject.startsWith('=?UTF-8?B?') ? Buffer.from(subject.slice(10, -2), 'base64').toString('utf8') : subject;
          received.push({ from: cur.from ?? '', to: cur.to, auth: cur.auth, data, subject: decodedSubject, body: Buffer.from(rest.join('\r\n\r\n').replace(/\r\n/g, ''), 'base64').toString('utf8') });
          cur = { to: [] };
          out('250 queued');
          continue;
        }
        const nl = buf.indexOf('\r\n');
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        if (/^EHLO/i.test(line)) { sock.write('250-smtp.test\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n'); }
        else if (/^AUTH PLAIN /i.test(line)) { cur.auth = Buffer.from(line.slice(11), 'base64').toString('utf8'); out('235 ok'); }
        else if (/^MAIL FROM:/i.test(line)) { cur.from = line.slice(10).replace(/[<>]/g, ''); out('250 ok'); }
        else if (/^RCPT TO:/i.test(line)) { if (opts.rejectRcpt) out('550 no such user'); else { cur.to.push(line.slice(8).replace(/[<>]/g, '')); out('250 ok'); } }
        else if (/^DATA/i.test(line)) { inData = true; out('354 go ahead'); }
        else if (/^QUIT/i.test(line)) { out('221 bye'); sock.end(); }
        else out('500 what?');
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  return { port, received, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const withSmtp = async (fn: (s: Awaited<ReturnType<typeof smtpStandIn>>) => Promise<void>, opts = {}) => {
  const s = await smtpStandIn(opts);
  process.env.GT_SMTP_URL = `smtp://mailer:s3cret@127.0.0.1:${s.port}`;
  process.env.GT_SMTP_INSECURE = '1';
  process.env.GT_MAIL_FROM = 'Goldthread <noreply@example.com>';
  try { await fn(s); } finally {
    delete process.env.GT_SMTP_URL; delete process.env.GT_SMTP_INSECURE; delete process.env.GT_MAIL_FROM;
    await s.close();
  }
};

test('SMTP: authenticates, delivers UTF-8 and dot-stuffs lines', () => withSmtp(async (s) => {
  await sendSmtp(mailConfig()!, { to: 'Jordan <jordan@example.com>', subject: 'Überprüfung nötig', text: 'Line one\n.starts with a dot\nÜmlaut' });
  const m = s.received[0];
  assert.equal(m.auth, '\0mailer\0s3cret');
  assert.equal(m.from, 'noreply@example.com');
  assert.deepEqual(m.to, ['jordan@example.com']);
  assert.equal(m.subject, 'Überprüfung nötig');
  assert.equal(m.body, 'Line one\r\n.starts with a dot\r\nÜmlaut');
}));

test('SMTP: refuses to send a password in clear text without STARTTLS', () => withSmtp(async () => {
  delete process.env.GT_SMTP_INSECURE;
  await assert.rejects(sendSmtp(mailConfig()!, { to: 'a@example.com', subject: 's', text: 't' }), /STARTTLS/);
}));

test('messages are well formed', () => {
  const raw = formatMessage({ from: 'Goldthread <noreply@example.com>' }, { to: 'a@example.com', subject: 'Hi', text: 'x' }, new Date('2026-10-26T09:00:00Z'));
  assert.match(raw, /^From: Goldthread <noreply@example.com>\r\nTo: a@example.com\r\nSubject: Hi\r\nDate: Mon, 26 Oct 2026 09:00:00 GMT\r\nMessage-ID: <[0-9a-f]+@example.com>/);
});

test('invites, mentions, approvals and forgotten passwords send emails', () => withSmtp(async (s) => {
  const h = harness();
  try {
    const owner = h.user('olga'), jo = h.user('jo');
    const w = h.ws.create({ name: 'ServiceHub', kind: 'team', owner: owner.user, sample: 'empty' });
    h.sys.addMember(w.id, jo.user.id, 'editor');
    h.ws.linkMember(w.id, jo.user);
    const as = { session: owner.session, workspace: w.id };

    const inv = await h.call('POST', '/api/admin/invites', { ...as, body: { email: 'new.person@example.com', role: 'viewer' } });
    assert.equal(inv.body.emailed, true);
    const doc = await h.call('POST', '/api/entities', { ...as, body: { type: 'decision', title: 'Retire the chatbot' } });
    await h.call('POST', '/api/entities', { ...as, body: { type: 'comment', entityId: doc.body.id, body: '@jo can you check this?', mentions: [jo.user.id] } });
    const joStakeholder = h.ws.store(w.id).byType('stakeholder').find((x) => x.userId === jo.user.id)!;
    await h.call('POST', '/api/entities', { ...as, body: { type: 'approval', title: 'Baseline v2', dueDate: '2026-11-02', approvers: [{ stakeholderId: joStakeholder.id, status: 'pending' }] } });
    await h.call('POST', '/api/auth/forgot', { body: { email: 'nobody@example.com' } });
    await h.call('POST', '/api/auth/forgot', { body: { email: 'jo@example.com' } });
    await flushOutbox(h.sys);

    const by = (subject: RegExp) => s.received.find((m) => subject.test(m.subject));
    const invite = by(/invited you to ServiceHub/)!;
    assert.deepEqual(invite.to, ['new.person@example.com']);
    assert.match(invite.body, /#\/join\/[\w-]+/);
    const mention = by(/mentioned you on “Retire the chatbot”/)!;
    assert.deepEqual(mention.to, ['jo@example.com']);
    assert.match(mention.body, /> @jo can you check this\?/);
    assert.match(mention.body, new RegExp(`#/e/decision/${doc.body.id}`));
    assert.deepEqual(by(/sign-off is requested: Baseline v2/)!.to, ['jo@example.com']);
    const reset = by(/Reset your Goldthread password/)!;
    assert.deepEqual(reset.to, ['jo@example.com'], 'nothing is sent for unknown addresses');
    const token = /#\/reset\/([\w-]+)/.exec(reset.body)![1];
    assert.equal((await h.call('POST', `/api/password-reset/${token}`, { body: { password: 'a whole new password' } })).status, 200);
    assert.equal(s.received.length, 4);
  } finally { h.done(); }
}));

test('people can switch off mention emails', () => withSmtp(async (s) => {
  const h = harness();
  try {
    const owner = h.user('olga'), jo = h.user('jo');
    h.sys.updateUser(jo.user.id, { prefs: { notify: { mentions: false } } });
    const w = h.ws.create({ name: 'T', kind: 'team', owner: owner.user, sample: 'empty' });
    h.sys.addMember(w.id, jo.user.id, 'editor');
    const d = await h.call('POST', '/api/entities', { session: owner.session, workspace: w.id, body: { type: 'decision', title: 'X' } });
    await h.call('POST', '/api/entities', { session: owner.session, workspace: w.id, body: { type: 'comment', entityId: d.body.id, body: '@jo', mentions: [jo.user.id] } });
    await flushOutbox(h.sys);
    assert.equal(s.received.length, 0);
  } finally { h.done(); }
}));

test('weekly digest: Mondays, opted-in people only, at most once a week', () => withSmtp(async (s) => {
  const h = harness();
  try {
    const me = h.user('dee');
    h.sys.updateUser(me.user.id, { prefs: { notify: { digest: true } } });
    h.ws.create({ name: 'ServiceHub', kind: 'team', owner: me.user, sample: 'it' });
    const monday = new Date(2026, 9, 26, 9, 0);
    assert.equal(sendDigests(h.sys, h.ws, new Date(2026, 9, 27, 9, 0)), 0, 'not on a Tuesday');
    assert.equal(sendDigests(h.sys, h.ws, monday), 1);
    assert.equal(sendDigests(h.sys, h.ws, new Date(monday.getTime() + 3_600_000)), 0, 'once a week');
    await flushOutbox(h.sys);
    assert.equal(s.received[0].subject, 'Your week in Goldthread');
    assert.match(s.received[0].body, /ServiceHub\r?\n- /);
    assert.equal(s.received[0].body.split('Requirements baseline v1').length - 1, 1, 'each item once');
  } finally { h.done(); }
}));

test('failed sends are kept and retried later', () => withSmtp(async () => {
  const h = harness();
  try {
    h.sys.queueMail({ to: 'x@example.com', subject: 'Hello', text: 'x' });
    await flushOutbox(h.sys);
    const log = h.sys.mailLog(1)[0];
    assert.equal(log.attempts, 1);
    assert.match(log.error ?? '', /RCPT TO failed: 550/);
    assert.equal(h.sys.dueMail(Date.now()).length, 0, 'not retried straight away');
    assert.equal(h.sys.dueMail(Date.now() + 5 * 60_000).length, 1, 'retried after the backoff');
  } finally { h.done(); }
}, { rejectRcpt: true }));
