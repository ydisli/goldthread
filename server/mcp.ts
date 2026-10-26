import type { ServerResponse } from 'node:http';
import { HttpError, type WCtx } from './http.ts';
import { actorOf } from './auth.ts';
import { broadcast } from './live.ts';
import { ROLE_RANK } from './system.ts';
import { Graph } from '../core/graph.ts';
import { ENTITIES, ENTITY_MAP, nameOf, titleOf, type Entity } from '../core/schema.ts';
import { SearchIndex } from '../core/engines/search.ts';
import { dailyBrief } from '../core/engines/brief.ts';
import { prepBrief } from '../core/engines/stakeholders.ts';
import { checkProcess, processMetrics, type Step } from '../core/engines/process.ts';
import { lint, lintSummary, RULE_LABELS } from '../core/engines/lint.ts';
import { completeness, completenessScore } from '../core/engines/completeness.ts';
import { reviewSpec } from '../core/engines/review.ts';
import { concurrency, forecastScope } from '../core/engines/forecast.ts';
import { impactAnalysis, traceMatrix } from '../core/engines/traceability.ts';
import { DOC_KINDS, generateDoc, type DocKind } from '../core/engines/docs.ts';
import { isoDate } from '../core/util.ts';
import { PARTS, chapterText, quizzesOf } from '../core/book.ts';
import { loadBook } from './book.ts';

// Model Context Protocol server (Streamable HTTP, JSON responses). Any MCP
// client — Claude Desktop, Claude Code, ChatGPT connectors, Cursor, VS Code —
// can connect with a personal API token and work with the workspace.

const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];
const TYPES = ENTITIES.map((d) => d.type).filter((t) => t !== 'comment' && t !== 'attachment');

interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  write?: boolean;
  run: (args: any, ctx: WCtx, g: Graph) => unknown;
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });

function find(g: Graph, idOrKey: string): Entity {
  const e = g.get(idOrKey) ?? [...g.byId.values()].find((x) => x.key?.toLowerCase() === String(idOrKey).toLowerCase()) ?? [...g.byId.values()].find((x) => nameOf(x).toLowerCase() === String(idOrKey).toLowerCase());
  if (!e) throw new HttpError(404, `Nothing found for "${idOrKey}". Use search first.`);
  return e;
}

function brief(e: Entity) {
  return { id: e.id, type: e.type, key: e.key, title: nameOf(e), status: e.status };
}

const TOOLS: Tool[] = [
  {
    name: 'search', title: 'Search the workspace',
    description: 'Full-text search across everything in the Throughline workspace: stakeholders, signals, bets, requirements, decisions, stories, releases, risks. Supports "type:decision" filters and keys like REQ-4.',
    inputSchema: obj({ query: { type: 'string' }, limit: { type: 'number', description: 'Max results (default 15)' } }, ['query']),
    run: ({ query, limit }, _ctx, g) => new SearchIndex([...g.byId.values()]).search(String(query), Math.min(50, Number(limit) || 15)).map((h) => ({ ...brief(h.entity), snippet: h.snippet })),
  },
  {
    name: 'get_item', title: 'Get an item with its links',
    description: 'Fetch one item by id, key (e.g. REQ-4, BET-1) or exact title, with all its fields and the items that link to it.',
    inputSchema: obj({ id_or_key: { type: 'string' } }, ['id_or_key']),
    run: ({ id_or_key }, _ctx, g) => {
      const e = find(g, id_or_key);
      const def = ENTITY_MAP[e.type];
      const fields: Record<string, unknown> = {};
      for (const f of def.fields) {
        const v = e[f.key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
        fields[f.label] = f.kind === 'ref' ? titleOf(g.get(v)) : f.kind === 'refs' ? (v as string[]).map((id) => titleOf(g.get(id))) : v;
      }
      return { ...brief(e), kind: def.label, fields, linkedFrom: g.linksTo(e.id).filter((l) => l.from.type !== 'comment' && l.from.type !== 'attachment').slice(0, 40).map((l) => ({ ...brief(l.from), via: l.field.label })) };
    },
  },
  {
    name: 'list_items', title: 'List items of a type',
    description: 'List items of one type, optionally filtered by status. Use workspace_schema to see types and fields.',
    inputSchema: obj({ type: { type: 'string', enum: TYPES }, status: { type: 'string' }, limit: { type: 'number' } }, ['type']),
    run: ({ type, status, limit }, _ctx, g) => g.all(type).filter((e) => !status || e.status === status).slice(0, Math.min(200, Number(limit) || 50)).map(brief),
  },
  {
    name: 'daily_brief', title: 'Daily brief',
    description: 'What needs attention today for the signed-in person: approvals waiting, overdue stakeholder touchpoints, promises at risk against the delivery forecast, rising signals, risks, measurements due.',
    inputSchema: obj({ all: { type: 'boolean', description: 'Include medium and low items (default: critical and high only)' } }),
    run: ({ all }, _ctx, g) => dailyBrief(g, new Date()).filter((i) => all || i.severity === 'critical' || i.severity === 'high').map((i) => ({ severity: i.severity, area: i.area, title: i.title, detail: i.detail, ref: i.refId })),
  },
  {
    name: 'prepare_meeting', title: 'Meeting prep for a stakeholder',
    description: 'Briefing before meeting someone: what they care about, concerns, open asks, promises at risk, approvals waiting on them, decisions since you last spoke, and suggested talking points.',
    inputSchema: obj({ stakeholder: { type: 'string', description: 'Name or id' } }, ['stakeholder']),
    run: ({ stakeholder }, _ctx, g) => {
      const s = g.all('stakeholder').find((x) => x.id === stakeholder) ?? g.all('stakeholder').find((x) => String(x.name).toLowerCase().includes(String(stakeholder).toLowerCase()));
      if (!s) throw new HttpError(404, `No stakeholder matching "${stakeholder}".`);
      const b = prepBrief(s, g, new Date());
      return { headline: b.headline, caresAbout: b.caresAbout, concerns: b.concerns, talkingPoints: b.talkingPoints.map((t) => t.text), decidedSinceLastTime: b.sinceLastTime.map((d) => `${d.key ?? ''} ${d.title}`.trim()) };
    },
  },
  {
    name: 'forecast', title: 'Delivery forecast',
    description: 'Monte Carlo forecast for a bet or release from real team throughput: 50% and 85% likely dates and the chance of hitting the target date.',
    inputSchema: obj({ id_or_key: { type: 'string', description: 'Bet or release id, key or title' } }, ['id_or_key']),
    run: ({ id_or_key }, _ctx, g) => {
      const e = find(g, id_or_key);
      if (e.type !== 'bet' && e.type !== 'release') throw new HttpError(400, 'Forecasts work for bets and releases.');
      const f = forecastScope(g.all('story'), e, new Date(), e.type === 'bet' ? { concurrent: concurrency(g.all('bet'), e) } : {});
      if (!f) return { title: nameOf(e), forecast: 'Not enough throughput history to forecast.' };
      return { title: nameOf(e), remainingStories: f.remaining, likely50: f.dates.p50, likely85: f.dates.p85, targetDate: e.targetDate, chanceByTarget: f.probabilityBy === undefined ? null : Math.round(f.probabilityBy * 100) / 100 };
    },
  },
  {
    name: 'impact_analysis', title: 'Impact analysis',
    description: 'Everything that may be affected if an item changes (requirements, stories, tests, releases, promises) and the people to inform.',
    inputSchema: obj({ id_or_key: { type: 'string' } }, ['id_or_key']),
    run: ({ id_or_key }, _ctx, g) => {
      const imp = impactAnalysis(g, find(g, id_or_key).id, 3)!;
      return { root: brief(imp.root), affected: imp.byType.map((t) => ({ type: t.label, items: t.items.slice(0, 15).map((x) => brief(x.entity)) })), inform: imp.stakeholders.map((s) => ({ name: s.stakeholder.name, why: s.reasons.slice(0, 3) })) };
    },
  },
  {
    name: 'traceability_gaps', title: 'Traceability gaps',
    description: 'Requirements missing stories or tests, with failing tests, not yet released, without a source, or with requirement-origin defects.',
    inputSchema: obj({}),
    run: (_a, _ctx, g) => {
      const tm = traceMatrix(g);
      return { coverage: tm.coverage, gaps: tm.rows.filter((r) => r.gaps.length).map((r) => ({ requirement: `${r.requirement.key} ${r.requirement.title}`, gaps: r.gaps })) };
    },
  },
  {
    name: 'lint_spec', title: 'Check a spec',
    description: 'Ambiguity lint, completeness check and review-board questions for a spec in the workspace (spec_id) or any Markdown text.',
    inputSchema: obj({ spec_id: { type: 'string' }, text: { type: 'string' } }),
    run: ({ spec_id, text }, _ctx, g) => {
      const body = spec_id ? String(find(g, spec_id).body ?? '') : String(text ?? '');
      if (!body.trim()) throw new HttpError(400, 'Pass spec_id or text.');
      const issues = lint(body, { glossary: g.all('glossaryTerm') });
      const items = completeness(body);
      return {
        clarity: lintSummary(body, issues).score, completeness: completenessScore(items),
        issues: issues.filter((i) => i.severity !== 'info').map((i) => ({ line: i.line, rule: RULE_LABELS[i.rule] ?? i.rule, message: i.message, suggestion: i.suggestion })),
        missingTopics: items.filter((i) => i.relevant && !i.covered).map((i) => `${i.label}: ${i.question}`),
        reviewQuestions: reviewSpec(body).map((q) => `[${q.role}] ${q.title}`),
      };
    },
  },
  {
    name: 'check_process', title: 'Review a process model',
    description: 'Modelling checks (missing start/end, dead ends, unreachable steps, decisions without labelled outcomes) and metrics (steps, handoffs, rework loops) for a swimlane process model, plus its steps by lane.',
    inputSchema: obj({ id_or_title: { type: 'string' } }, ['id_or_title']),
    run: ({ id_or_title }, _ctx, g) => {
      const pm = g.all('processModel').find((p) => p.id === id_or_title || String(p.title).toLowerCase() === String(id_or_title).toLowerCase()) ?? find(g, id_or_title);
      if (pm.type !== 'processModel') throw new HttpError(400, `${nameOf(pm)} is not a process model.`);
      const steps = (pm.steps ?? []) as Step[];
      const lanes = (pm.lanes ?? []) as string[];
      return {
        title: pm.title, variant: pm.variant, lanes: lanes.map((l) => ({ lane: l, steps: steps.filter((s) => s.lane === l).map((s) => `${s.kind === 'task' ? '' : `[${s.kind}] `}${s.label}`) })),
        metrics: processMetrics(steps), issues: checkProcess(steps, lanes).map((i) => `${i.severity}: ${i.message}`),
      };
    },
  },
  {
    name: 'generate_document', title: 'Generate a document',
    description: 'Generate a Markdown document from the workspace: prd (subject = spec), brd / prfaq (subject = bet), steering (no subject), release-notes (subject = release), stakeholder-update (subject = bet or release, audience = exec|sales|support|engineering|customer).',
    inputSchema: obj({ kind: { type: 'string', enum: Object.keys(DOC_KINDS) }, subject: { type: 'string' }, audience: { type: 'string', enum: ['exec', 'sales', 'support', 'engineering', 'customer'] } }, ['kind']),
    run: ({ kind, subject, audience }, _ctx, g) => generateDoc(kind as DocKind, g, subject ? find(g, subject).id : undefined, new Date(), { audience }),
  },
  {
    name: 'guide_contents', title: 'Field Guide: contents',
    description: 'The Field Guide is Throughline\'s book for Product Owners and Business Analysts: Part I teaches the craft (problems, stakeholders, discovery, requirements, modelling, prioritisation, forecasting, governance, outcomes), Part II teaches the tool. Lists chapters with ids, summaries and the tools each covers. Use read_guide to teach or quiz the user from a chapter.',
    inputSchema: obj({}),
    run: () => PARTS.map((p) => ({
      part: `${p.label}: ${p.title}`,
      chapters: loadBook().filter((c) => c.part === p.id).map((c) => ({ id: c.id, title: c.title, minutes: c.minutes, summary: c.summary, tools: c.tools })),
    })),
  },
  {
    name: 'read_guide', title: 'Field Guide: read a chapter',
    description: 'Read a Field Guide chapter as Markdown, plus its check-yourself questions with answers and explanations. Good for explaining a technique in the user\'s context, quizzing them, or pointing to the right Throughline tool. Links like (guide:id) point to other chapters; (tool:id) to tools.',
    inputSchema: obj({ id: { type: 'string', description: 'Chapter id from guide_contents, e.g. "stakeholders" or "forecasting".' } }, ['id']),
    run: ({ id }) => {
      const book = loadBook();
      const c = book.find((x) => x.id === id) ?? book.find((x) => x.title.toLowerCase().includes(String(id).toLowerCase()));
      if (!c) throw new HttpError(404, `No chapter "${id}". Call guide_contents for the list.`);
      return {
        id: c.id, title: c.title, summary: c.summary, tools: c.tools, text: chapterText(c),
        quiz: quizzesOf(c.body).map((q) => ({ question: q.question, options: q.options.map((o) => o.text), answer: q.options.find((o) => o.correct)?.text, why: q.why })),
      };
    },
  },
  {
    name: 'workspace_schema', title: 'Item types and fields',
    description: 'The item types in Throughline and their fields (with allowed values for enums). Call before create_item or update_item.',
    inputSchema: obj({ type: { type: 'string', enum: TYPES } }),
    run: ({ type }) => ENTITIES.filter((d) => (type ? d.type === type : d.type !== 'comment')).map((d) => ({
      type: d.type, label: d.label, description: d.description,
      fields: type ? d.fields.filter((f) => !f.hidden && f.kind !== 'json').map((f) => ({ key: f.key, label: f.label, kind: f.kind, required: !!f.required, options: f.options, references: f.ref, help: f.help })) : undefined,
    })),
  },
  {
    name: 'capture', title: 'Capture something quickly', write: true,
    description: 'Record a signal (user or customer evidence), a stakeholder request, a decision, a risk or an idea from a short text. The first line becomes the title.',
    inputSchema: obj({
      kind: { type: 'string', enum: ['evidence', 'request', 'decision', 'risk', 'idea'] }, text: { type: 'string' },
      account: { type: 'string', description: 'Customer account or department' }, from: { type: 'string', description: 'Stakeholder name' },
      source: { type: 'string', enum: ['support', 'interview', 'survey', 'analytics', 'sales-call', 'internal', 'audit', 'monitoring'] }, reach: { type: 'number', description: 'People affected' },
    }, ['kind', 'text']),
    run: ({ kind, text, account, from, source, reach }, ctx, g) => {
      const store = ctx.ws.store;
      const actor = actorOf(ctx);
      const who = from ? g.all('stakeholder').find((p) => String(p.name).toLowerCase().includes(String(from).toLowerCase())) : undefined;
      const title = String(text).split('\n')[0].slice(0, 200);
      const detail = String(text).length > title.length ? String(text) : undefined;
      const today = isoDate(new Date());
      const e = kind === 'request' ? store.create('request', { title, description: detail, requesterId: who?.id, receivedAt: today, status: 'new' }, actor)
        : kind === 'decision' ? store.create('decision', { title, context: detail, date: today, status: 'proposed' }, actor)
          : kind === 'risk' ? store.create('raid', { title, description: detail, kind: 'risk', status: 'open', ownerId: who?.id }, actor)
            : kind === 'idea' ? store.create('bet', { title, hypothesis: detail, status: 'idea', horizon: 'later' }, actor)
              : store.create('evidence', { title, detail, source: source ?? 'internal', account, reach, date: today, relayedById: who?.id }, actor);
      broadcast(ctx.ws.workspace.id, [{ op: 'upsert', entity: e }]);
      return { created: brief(e) };
    },
  },
  {
    name: 'create_item', title: 'Create an item', write: true,
    description: 'Create any item (requirement, decision, story, risk, stakeholder…) with field values keyed as in workspace_schema. References take ids.',
    inputSchema: obj({ type: { type: 'string', enum: TYPES }, fields: { type: 'object' } }, ['type', 'fields']),
    run: ({ type, fields }, ctx) => {
      const e = ctx.ws.store.create(type, fields ?? {}, actorOf(ctx));
      broadcast(ctx.ws.workspace.id, [{ op: 'upsert', entity: e }]);
      return { created: brief(e) };
    },
  },
  {
    name: 'update_item', title: 'Update an item', write: true,
    description: 'Change fields of an existing item (by id or key). Only the given fields change. Edits to approved requirements create a new version automatically.',
    inputSchema: obj({ id_or_key: { type: 'string' }, fields: { type: 'object' } }, ['id_or_key', 'fields']),
    run: ({ id_or_key, fields }, ctx, g) => {
      const e = ctx.ws.store.update(find(g, id_or_key).id, fields ?? {}, actorOf(ctx));
      broadcast(ctx.ws.workspace.id, [{ op: 'upsert', entity: e }]);
      return { updated: brief(e) };
    },
  },
];

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any };

async function handle(msg: Rpc, ctx: WCtx): Promise<unknown> {
  switch (msg.method) {
    case 'initialize': {
      const requested = msg.params?.protocolVersion;
      return {
        protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'throughline', title: 'Throughline', version: '0.2.0' },
        instructions: `You are connected to the Throughline workspace "${ctx.ws.workspace.name}" as ${ctx.user.name} (${ctx.ws.role}). Throughline holds a product team's stakeholders, evidence, bets, requirements, decisions, stories, releases and risks as a linked graph. Use search or get_item before answering questions about it, and cite item keys. Write tools need an editor role and a write token.`,
      };
    }
    case 'ping':
      return {};
    case 'tools/list': {
      const canWrite = ROLE_RANK[ctx.ws.role] >= ROLE_RANK.editor;
      return {
        tools: TOOLS.filter((t) => !t.write || canWrite).map((t) => ({
          name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema,
          annotations: { title: t.title, readOnlyHint: !t.write, destructiveHint: false, openWorldHint: false },
        })),
      };
    }
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) throw Object.assign(new Error(`Unknown tool: ${msg.params?.name}`), { code: -32602 });
      if (tool.write && ROLE_RANK[ctx.ws.role] < ROLE_RANK.editor) {
        return { content: [{ type: 'text', text: 'This token can only read. Create a write token as an editor to change things.' }], isError: true };
      }
      try {
        const g = new Graph(ctx.ws.store.all(), { meUserId: ctx.user.id });
        const out = await tool.run(msg.params?.arguments ?? {}, ctx, g);
        const text = typeof out === 'string' ? out : JSON.stringify(out, null, 1);
        return typeof out === 'string' || Array.isArray(out)
          ? { content: [{ type: 'text', text }] }
          : { content: [{ type: 'text', text }], structuredContent: out };
      } catch (err) {
        return { content: [{ type: 'text', text: (err as Error).message }], isError: true };
      }
    }
    case 'resources/list':
      return { resources: [] };
    case 'prompts/list':
      return { prompts: [] };
    default:
      throw Object.assign(new Error(`Method not found: ${msg.method}`), { code: -32601 });
  }
}

/** Handle one HTTP POST to /mcp (a JSON-RPC message or array of them). */
export async function mcpHandler(ctx: WCtx, res: ServerResponse) {
  const body = await ctx.body();
  const messages: Rpc[] = Array.isArray(body) ? body : [body];
  const replies: unknown[] = [];
  for (const m of messages) {
    if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
      replies.push({ jsonrpc: '2.0', id: m?.id ?? null, error: { code: -32600, message: 'Invalid request' } });
      continue;
    }
    if (m.id === undefined || m.id === null) continue; // notification
    try {
      replies.push({ jsonrpc: '2.0', id: m.id, result: await handle(m, ctx) });
    } catch (err) {
      const e = err as Error & { code?: number };
      replies.push({ jsonrpc: '2.0', id: m.id, error: { code: e.code ?? -32603, message: e.message } });
    }
  }
  if (!replies.length) {
    res.writeHead(202).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(Array.isArray(body) ? replies : replies[0]));
}

export const MCP_TOOL_NAMES = TOOLS.map((t) => t.name);
