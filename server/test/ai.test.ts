import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './harness.ts';
import { json, standIn } from './standin.ts';

// Model providers are tested against local stand-ins that speak their HTTP APIs.
// This checks what Throughline sends and how it reads replies, not the real services.

const anthropicReply = (payload: unknown, stop = 'end_turn') => ({
  id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: stop, stop_sequence: null,
  content: [{ type: 'text', text: JSON.stringify(payload) }], usage: { input_tokens: 10, output_tokens: 10 },
});

test('Claude: ask and review send redacted, structured requests and read the replies', async () => {
  let next: { status: number; body: unknown } = { status: 200, body: {} };
  const claude = await standIn((req, res) => json(res, next.status, next.body));
  process.env.ANTHROPIC_BASE_URL = claude.url;
  const h = harness();
  try {
    const owner = h.user('ola');
    const w = h.ws.create({ name: 'Team', kind: 'team', owner: owner.user, sample: 'it' });
    h.sys.setAiConfig(w.id, { provider: 'anthropic', apiKey: 'sk-ant-test-local' }, owner.user.id);
    const s = { session: owner.session, workspace: w.id };
    const req5 = h.ws.store(w.id).all().find((e) => e.key === 'REQ-5')!;

    next = { status: 200, body: anthropicReply({ answer: 'Within one hour of the HR termination time.', citations: [req5.id, 'made-up-id'] }) };
    const ask = await h.call('POST', '/api/ai/ask', { ...s, body: { question: 'How fast are leavers disabled? Ask jane.doe@example.com' } });
    assert.equal(ask.status, 200);
    assert.match(ask.body.answer, /one hour/);
    assert.deepEqual(ask.body.citations, [req5.id], 'citations that do not exist are dropped');

    const sent = claude.requests.at(-1)!;
    assert.match(sent.path, /^\/v1\/messages/);
    // The SDK sends the key as x-api-key or as a bearer token, depending on its version.
    assert.ok(sent.headers['x-api-key'] === 'sk-ant-test-local' || sent.headers.authorization === 'Bearer sk-ant-test-local');
    assert.match(String(sent.headers['anthropic-beta']), /server-side-fallback-2026-07-01/);
    assert.equal(sent.body.model, 'claude-opus-5-5');
    assert.equal(sent.body.output_config.format.type, 'json_schema');
    assert.ok(!sent.raw.includes('jane.doe@example.com'), 'personal data is redacted before it leaves');
    assert.match(sent.body.messages[0].content, /\[email\]/);

    const spec = h.ws.store(w.id).byType('spec')[0];
    next = { status: 200, body: anthropicReply({ findings: [
      { role: 'security', severity: 'major', title: 'Who can approve privileged access?', detail: 'Not stated.', anchor: 'approval' },
      { role: 'astrologer', severity: 'minor', title: 'Ignored', detail: '', anchor: '' },
    ] }) };
    const review = await h.call('POST', '/api/ai/review', { ...s, body: { specId: spec.id } });
    assert.deepEqual(review.body.findings.map((f: { role: string }) => f.role), ['security'], 'unknown roles are dropped');

    next = { status: 200, body: anthropicReply({ answer: 'x', citations: [] }, 'refusal') };
    assert.equal((await h.call('POST', '/api/ai/ask', { ...s, body: { question: 'q' } })).status, 422);
    next = { status: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } };
    const bad = await h.call('POST', '/api/ai/ask', { ...s, body: { question: 'q' } });
    assert.equal(bad.status, 502);
    assert.match(bad.body.error, /rejected the API key/);
  } finally { h.done(); await claude.close(); delete process.env.ANTHROPIC_BASE_URL; }
});

test('OpenAI-compatible: JSON-schema output, with a fallback to JSON mode', async () => {
  let strict = true;
  const oai = await standIn((req, res) => {
    if (req.body?.response_format?.type === 'json_schema' && !strict) return json(res, 400, { error: { message: 'response_format json_schema not supported' } });
    json(res, 200, { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '```json\n{"ok": true, "model": "llama-local"}\n```' } }] });
  });
  const h = harness();
  try {
    const owner = h.user('ola');
    const w = h.ws.create({ name: 'Team', kind: 'team', owner: owner.user, sample: 'empty' });
    h.sys.setAiConfig(w.id, { provider: 'openai-compatible', baseUrl: `${oai.url}/v1`, model: 'llama3.1', apiKey: 'local-key' }, owner.user.id);
    const s = { session: owner.session, workspace: w.id };
    const t1 = await h.call('POST', '/api/ai/test', s);
    assert.deepEqual(t1.body, { ok: true, provider: 'openai-compatible', model: 'llama3.1', reported: 'llama-local' });
    assert.equal(oai.requests[0].path, '/v1/chat/completions');
    assert.equal(oai.requests[0].headers.authorization, 'Bearer local-key');
    strict = false;
    const t2 = await h.call('POST', '/api/ai/test', s);
    assert.equal(t2.body.ok, true);
    assert.equal(oai.requests.at(-1)!.body.response_format.type, 'json_object', 'fell back to JSON mode');
    assert.match(oai.requests.at(-1)!.body.messages[0].content, /JSON Schema/);
  } finally { h.done(); await oai.close(); }
});
