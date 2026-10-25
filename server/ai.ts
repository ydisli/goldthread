import Anthropic from '@anthropic-ai/sdk';
import type { Store } from './db.ts';
import { HttpError } from './http.ts';
import { Graph } from '../core/graph.ts';
import { ENTITY_MAP, REVIEW_ROLES, type Entity } from '../core/schema.ts';
import { SearchIndex } from '../core/engines/search.ts';

// Optional Claude layer. Every analysis in Throughline has a deterministic
// engine; Claude adds depth when credentials are configured. Claude only
// proposes — the web app creates entities only when the user clicks.

const MODEL = process.env.TL_MODEL ?? 'claude-opus-5-5';
const enabled = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.TL_AI === '1');
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export function aiStatus(): { enabled: boolean; model?: string } {
  return enabled ? { enabled: true, model: MODEL } : { enabled: false };
}

class AiError extends HttpError {}

/** Strip obvious personal data before anything leaves the machine. */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}\b/g, '[bank account]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[phone]');
}

/**
 * One structured call: JSON-schema output, server-side refusal fallback,
 * typed error mapping. Returns the parsed JSON object.
 */
async function structured<T>(system: string, user: string, schema: Record<string, unknown>, effort: 'low' | 'medium' | 'high'): Promise<T> {
  if (!enabled) throw new AiError(503, 'Claude is not configured. Set ANTHROPIC_API_KEY and restart the server.');
  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort, format: { type: 'json_schema', schema } },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiError(502, 'Claude rejected the credentials — check ANTHROPIC_API_KEY.');
    if (err instanceof Anthropic.RateLimitError) throw new AiError(429, 'Claude is rate limited — try again in a minute.');
    if (err instanceof Anthropic.BadRequestError) throw new AiError(502, `Claude request was rejected: ${err.message}`);
    if (err instanceof Anthropic.APIConnectionError) throw new AiError(502, 'Could not reach the Claude API.');
    if (err instanceof Anthropic.APIError) throw new AiError(502, `Claude API error ${err.status}: ${err.message}`);
    throw err;
  }
  if (response.stop_reason === 'refusal') throw new AiError(422, 'Claude declined this request.');
  if (response.stop_reason === 'max_tokens') throw new AiError(502, 'Claude ran out of output tokens — try a shorter input.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError(502, 'Claude returned an unexpected format.');
  }
}

// ---------------- prompts & schemas ----------------

const REVIEW_SYSTEM = `You are the review board for product specs at a B2B software company. You read a spec the way ten reviewers would in refinement — developer, QA, security, privacy, support, data & analytics, legal & compliance, accessibility, finance, UX — and raise the questions each of them would ask before agreeing to build it.

Raise only questions the spec leaves genuinely open: ambiguities, missing edge cases, contradictions with the listed requirements or decisions, risks, and obligations the team may not have considered. Make each one specific to this spec — quote or point at the passage it concerns — and phrase the title as the question the reviewer would ask. Skip anything the spec already answers and anything already in the list of existing questions. Severity: critical = would block release or create a security/legal exposure; major = likely rework or customer impact; minor = should be clarified; info = worth noting.`;

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'severity', 'title', 'detail', 'anchor'],
        properties: {
          role: { type: 'string', enum: [...REVIEW_ROLES] },
          severity: { type: 'string', enum: ['info', 'minor', 'major', 'critical'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          anchor: { type: 'string' },
        },
      },
    },
  },
};

const ASK_SYSTEM = `You answer questions about a product team's workspace: their stakeholders, customer evidence, bets, requirements, decisions, releases and risks. You are given the workspace items most relevant to the question, each with an id.

Answer only from those items. When the items don't contain the answer, say so plainly and suggest what to look at or record. Keep the answer short and practical — a few sentences or a short list in Markdown. List the ids of every item your answer relies on in "citations".`;

const ASK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'citations'],
  properties: { answer: { type: 'string' }, citations: { type: 'array', items: { type: 'string' } } },
};

function compactEntity(e: Entity, g: Graph): Record<string, unknown> {
  const def = ENTITY_MAP[e.type];
  const out: Record<string, unknown> = { id: e.id, type: def?.label ?? e.type };
  if (e.key) out.key = e.key;
  for (const f of def?.fields ?? []) {
    const v = e[f.key];
    if (v === undefined || v === null || v === '' || f.kind === 'json' || (Array.isArray(v) && !v.length)) continue;
    if (f.kind === 'ref') out[f.label] = g.get(v) ? `${g.get(v)!.key ?? ''} ${g.get(v)![ENTITY_MAP[g.get(v)!.type].titleField]}`.trim() : v;
    else if (f.kind === 'refs') out[f.label] = (v as string[]).slice(0, 8).map((id) => { const x = g.get(id); return x ? x[ENTITY_MAP[x.type].titleField] : id; });
    else out[f.label] = typeof v === 'string' ? redact(v.slice(0, 600)) : v;
  }
  return out;
}

// ---------------- routes ----------------

type Ctx = { body: () => Promise<any> };

export function aiRoutes(store: Store): { method: string; path: string; handler: (ctx: Ctx) => unknown }[] {
  return [
    {
      method: 'POST', path: '/api/ai/review',
      handler: async ({ body }) => {
        const { specId, body: text } = await body();
        const g = new Graph(store.all());
        const spec = g.get(specId);
        if (!spec) throw new AiError(404, 'Spec not found');
        const reqs = g.referencing(spec.id, 'requirement', 'specId').map((r) => `${r.key}: ${r.statement ?? r.title}`);
        const decisions = g.all('decision').filter((d) => (d.relatedIds ?? []).some((id: string) => id === spec.id || id === spec.betId)).map((d) => `${d.key}: ${d.title} → ${d.chosen ?? ''}`);
        const existing = g.referencing(spec.id, 'reviewFinding', 'specId').map((f) => f.title);
        const user = [
          `<spec title="${spec.title}">\n${redact(String(text ?? spec.body ?? ''))}\n</spec>`,
          `<managed_requirements>\n${reqs.join('\n') || 'none'}\n</managed_requirements>`,
          `<decisions>\n${decisions.join('\n') || 'none'}\n</decisions>`,
          `<existing_questions>\n${existing.join('\n') || 'none'}\n</existing_questions>`,
        ].join('\n\n');
        const out = await structured<{ findings: { role: string; severity: string; title: string; detail: string; anchor: string }[] }>(REVIEW_SYSTEM, user, REVIEW_SCHEMA, 'high');
        return { findings: out.findings };
      },
    },
    {
      method: 'POST', path: '/api/ai/ask',
      handler: async ({ body }) => {
        const { question } = await body();
        if (!question?.trim()) throw new AiError(400, 'Ask a question');
        const g = new Graph(store.all());
        const hits = new SearchIndex([...g.byId.values()]).search(question, 25);
        const context = hits.map((h) => compactEntity(h.entity, g));
        const user = `<workspace_items>\n${JSON.stringify(context, null, 1)}\n</workspace_items>\n\n<question>${redact(question)}</question>`;
        const out = await structured<{ answer: string; citations: string[] }>(ASK_SYSTEM, user, ASK_SCHEMA, 'medium');
        return { answer: out.answer, citations: out.citations.filter((id) => g.get(id)) };
      },
    },
  ];
}
