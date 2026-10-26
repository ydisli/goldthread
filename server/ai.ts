import Anthropic from '@anthropic-ai/sdk';
import { HttpError, type Router, type WCtx } from './http.ts';
import type { SystemDB } from './system.ts';
import { Graph } from '../core/graph.ts';
import { ENTITY_MAP, REVIEW_ROLES, type Entity } from '../core/schema.ts';
import { SearchIndex } from '../core/engines/search.ts';

// Optional AI layer. Every analysis in Goldthread has a deterministic engine;
// a language model adds depth when one is configured for the workspace:
//  - Claude through the Anthropic SDK (default when ANTHROPIC_API_KEY is set), or
//  - any OpenAI-compatible chat-completions endpoint (OpenAI, Azure OpenAI,
//    Mistral, OpenRouter, or a local Ollama / LM Studio server).
// Models only propose; the web app creates entities only when a person clicks.

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';

interface Resolved {
  provider: 'anthropic' | 'openai-compatible';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

const envAnthropic = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.GT_AI === '1');

function resolve(sys: SystemDB, workspaceId: string): Resolved | null {
  const cfg = sys.aiConfig(workspaceId);
  if (!cfg) return envAnthropic() ? { provider: 'anthropic', model: process.env.GT_MODEL ?? DEFAULT_CLAUDE_MODEL } : null;
  if (cfg.provider === 'none') return null;
  if (cfg.provider === 'anthropic') {
    if (!cfg.apiKey && !envAnthropic()) return null;
    return { provider: 'anthropic', model: cfg.model || process.env.GT_MODEL || DEFAULT_CLAUDE_MODEL, apiKey: cfg.apiKey };
  }
  if (!cfg.baseUrl || !cfg.model) return null;
  return { provider: 'openai-compatible', model: cfg.model, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl };
}

export function aiStatus(sys: SystemDB, workspaceId: string): { enabled: boolean; provider?: string; model?: string } {
  const r = resolve(sys, workspaceId);
  return r ? { enabled: true, provider: r.provider, model: r.model } : { enabled: false };
}

/** Strip obvious personal data before anything leaves the machine. */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}\b/g, '[bank account]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[phone]');
}

const clients = new Map<string, Anthropic>();
function anthropicClient(apiKey?: string): Anthropic {
  const key = apiKey ?? '';
  let c = clients.get(key);
  if (!c) clients.set(key, (c = apiKey ? new Anthropic({ apiKey }) : new Anthropic()));
  return c;
}

/** One call that returns JSON matching `schema`. */
async function structured<T>(ai: Resolved, system: string, user: string, schema: Record<string, unknown>, effort: 'low' | 'medium' | 'high'): Promise<T> {
  return ai.provider === 'anthropic' ? viaAnthropic<T>(ai, system, user, schema, effort) : viaOpenAICompatible<T>(ai, system, user, schema);
}

async function viaAnthropic<T>(ai: Resolved, system: string, user: string, schema: Record<string, unknown>, effort: 'low' | 'medium' | 'high'): Promise<T> {
  let response;
  try {
    response = await anthropicClient(ai.apiKey).beta.messages.create({
      model: ai.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort, format: { type: 'json_schema', schema } },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new HttpError(502, 'Claude rejected the API key. Check it under Settings → AI.');
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Claude is rate limited — try again in a minute.');
    if (err instanceof Anthropic.BadRequestError) throw new HttpError(502, `Claude request was rejected: ${err.message}`);
    if (err instanceof Anthropic.APIConnectionError) throw new HttpError(502, 'Could not reach the Claude API.');
    if (err instanceof Anthropic.APIError) throw new HttpError(502, `Claude API error ${err.status}: ${err.message}`);
    throw err;
  }
  if (response.stop_reason === 'refusal') throw new HttpError(422, 'Claude declined this request.');
  if (response.stop_reason === 'max_tokens') throw new HttpError(502, 'The model ran out of output tokens — try a shorter input.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  return parseJson<T>(text);
}

async function viaOpenAICompatible<T>(ai: Resolved, system: string, user: string, schema: Record<string, unknown>): Promise<T> {
  const url = `${ai.baseUrl}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`;
  const call = async (responseFormat: Record<string, unknown>, extraSystem = '') => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({ model: ai.model, messages: [{ role: 'system', content: system + extraSystem }, { role: 'user', content: user }], response_format: responseFormat }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (err) {
      throw new HttpError(502, `Could not reach ${ai.baseUrl}: ${(err as Error).message}`);
    }
    const body = await res.json().catch(() => ({}));
    return { res, body };
  };
  // Prefer strict JSON-schema output; fall back to plain JSON mode for servers that don't support it.
  let { res, body } = await call({ type: 'json_schema', json_schema: { name: 'result', schema, strict: true } });
  if (res.status === 400 || res.status === 422) {
    ({ res, body } = await call({ type: 'json_object' }, `\n\nRespond with a single JSON object matching this JSON Schema:\n${JSON.stringify(schema)}`));
  }
  if (res.status === 401 || res.status === 403) throw new HttpError(502, 'The model provider rejected the API key. Check it under Settings → AI.');
  if (res.status === 429) throw new HttpError(429, 'The model provider is rate limiting — try again in a minute.');
  if (!res.ok) throw new HttpError(502, `Model provider error ${res.status}: ${body?.error?.message ?? res.statusText}`);
  const choice = body?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new HttpError(502, 'The model ran out of output tokens — try a shorter input.');
  return parseJson<T>(String(choice?.message?.content ?? ''));
}

function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new HttpError(502, 'The model returned an unexpected format.');
  }
}

// ---------------- prompts & schemas ----------------

const REVIEW_SYSTEM = `You are the review board for product specs at a company that builds software, often internal IT products. You read a spec the way ten reviewers would in refinement — developer, QA, security, privacy, support, data & analytics, legal & compliance, accessibility, finance, UX — and raise the questions each of them would ask before agreeing to build it.

Raise only questions the spec leaves genuinely open: ambiguities, missing edge cases, contradictions with the listed requirements or decisions, risks, and obligations the team may not have considered. Make each one specific to this spec — quote or point at the passage it concerns in "anchor" — and phrase the title as the question the reviewer would ask. Skip anything the spec already answers and anything already in the list of existing questions. Severity: critical = would block release or create a security/legal exposure; major = likely rework or user impact; minor = should be clarified; info = worth noting.`;

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['role', 'severity', 'title', 'detail', 'anchor'],
        properties: {
          role: { type: 'string', enum: [...REVIEW_ROLES] },
          severity: { type: 'string', enum: ['info', 'minor', 'major', 'critical'] },
          title: { type: 'string' }, detail: { type: 'string' }, anchor: { type: 'string' },
        },
      },
    },
  },
};

const ASK_SYSTEM = `You answer questions about a product team's workspace: their stakeholders, user evidence, bets, requirements, decisions, releases and risks. You are given the workspace items most relevant to the question, each with an id.

Answer only from those items. When they don't contain the answer, say so plainly and suggest what to look at or record. Keep the answer short and practical — a few sentences or a short list in Markdown. List the ids of every item your answer relies on in "citations".`;

const ASK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['answer', 'citations'],
  properties: { answer: { type: 'string' }, citations: { type: 'array', items: { type: 'string' } } },
};

function compactEntity(e: Entity, g: Graph): Record<string, unknown> {
  const def = ENTITY_MAP[e.type];
  const out: Record<string, unknown> = { id: e.id, type: def?.label ?? e.type };
  if (e.key) out.key = e.key;
  for (const f of def?.fields ?? []) {
    const v = e[f.key];
    if (v === undefined || v === null || v === '' || f.kind === 'json' || f.hidden || (Array.isArray(v) && !v.length)) continue;
    if (f.kind === 'ref') { const x = g.get(v); out[f.label] = x ? `${x.key ?? ''} ${x[ENTITY_MAP[x.type].titleField]}`.trim() : v; }
    else if (f.kind === 'refs') out[f.label] = (v as string[]).slice(0, 8).map((id) => { const x = g.get(id); return x ? x[ENTITY_MAP[x.type].titleField] : id; });
    else out[f.label] = typeof v === 'string' ? redact(v.slice(0, 600)) : v;
  }
  return out;
}

export function aiRoutes(r: Router, sys: SystemDB) {
  const need = (ctx: WCtx): Resolved => {
    const ai = resolve(sys, ctx.ws.workspace.id);
    if (!ai) throw new HttpError(503, 'No AI model is configured for this workspace. An admin can set one up under Settings → AI.');
    return ai;
  };

  r.add('POST', '/api/ai/review', 'editor', async (ctx) => {
    const ai = need(ctx);
    const { specId, body: text } = await ctx.body();
    const g = new Graph(ctx.ws.store.all(), { meUserId: ctx.user.id });
    const spec = g.get(specId);
    if (!spec) throw new HttpError(404, 'Spec not found');
    const reqs = g.referencing(spec.id, 'requirement', 'specId').map((x) => `${x.key}: ${x.statement ?? x.title}`);
    const decisions = g.all('decision').filter((d) => (d.relatedIds ?? []).some((id: string) => id === spec.id || id === spec.betId)).map((d) => `${d.key}: ${d.title} → ${d.chosen ?? ''}`);
    const existing = g.referencing(spec.id, 'reviewFinding', 'specId').map((f) => f.title);
    const user = [
      `<spec title="${spec.title}">\n${redact(String(text ?? spec.body ?? ''))}\n</spec>`,
      `<managed_requirements>\n${reqs.join('\n') || 'none'}\n</managed_requirements>`,
      `<decisions>\n${decisions.join('\n') || 'none'}\n</decisions>`,
      `<existing_questions>\n${existing.join('\n') || 'none'}\n</existing_questions>`,
    ].join('\n\n');
    const out = await structured<{ findings: { role: string; severity: string; title: string; detail: string; anchor: string }[] }>(ai, REVIEW_SYSTEM, user, REVIEW_SCHEMA, 'high');
    const roles = new Set<string>(REVIEW_ROLES);
    return { findings: (out.findings ?? []).filter((f) => roles.has(f.role) && f.title) };
  });

  r.add('POST', '/api/ai/ask', 'viewer', async (ctx) => {
    const ai = need(ctx);
    const { question } = await ctx.body();
    if (!question?.trim()) throw new HttpError(400, 'Ask a question');
    const g = new Graph(ctx.ws.store.all(), { meUserId: ctx.user.id });
    const hits = new SearchIndex([...g.byId.values()]).search(question, 25);
    const context = hits.map((h) => compactEntity(h.entity, g));
    const user = `<workspace_items>\n${JSON.stringify(context, null, 1)}\n</workspace_items>\n\n<question>${redact(question)}</question>`;
    const out = await structured<{ answer: string; citations: string[] }>(ai, ASK_SYSTEM, user, ASK_SCHEMA, 'medium');
    return { answer: out.answer, citations: (out.citations ?? []).filter((id) => g.get(id)) };
  });

  r.add('POST', '/api/ai/test', 'admin', async (ctx) => {
    const ai = need(ctx);
    const out = await structured<{ ok: boolean; model: string }>(ai, 'Reply with JSON.', 'Return {"ok": true, "model": "<your model name>"}.', {
      type: 'object', additionalProperties: false, required: ['ok', 'model'], properties: { ok: { type: 'boolean' }, model: { type: 'string' } },
    }, 'low');
    return { ok: !!out.ok, provider: ai.provider, model: ai.model, reported: out.model };
  });
}
