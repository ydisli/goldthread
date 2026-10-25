# Throughline

**The working notebook for Product Owners and Business Analysts — on your own, or with your team.**

Throughline keeps the chain *strategy → evidence → bet → requirement → story → release → outcome → learning* as one live graph, and wraps the people side of the job — stakeholders, approvals, promises, conflicts, communication — around it. It sits next to Jira, Azure DevOps or ServiceNow (the system of record for *work*) as the system of record for *intent* and *alignment*.

Every analysis runs locally on deterministic, explainable engines. Connect Claude or any OpenAI-compatible model for deeper reviews, or point your own AI assistant at it over MCP.

> Concept, gap analysis and module map: [docs/CONCEPT.md](docs/CONCEPT.md) · Architecture and phases: [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)

---

## Quick start

Requires **Node.js ≥ 23.6** (Throughline uses Node's native TypeScript support and built-in SQLite — no build step for the server).

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4300 and either:

- **Look around as someone on the demo team** — one click on the sign-in page. The demo is **ServiceHub**, an internal IT platform (SSO, access requests, joiner–mover–leaver automation, an ITSM migration) at a fictional company, with stakeholders from the CISO to the service desk, ~360 linked items, deliberate contradictions and gaps for the checks to find, and 12 weeks of delivery history. Five accounts show the roles: Alex (product owner, owner), Jordan (business analyst, editor), Priya (engineering lead, editor), Dana (CISO, viewer) and Kim (internal audit, viewer). The shared demo password is in `server/demo.ts`.
- **Create your own account** — pick whether you work mostly as a PO, a BA or both (this only sets your starting sidebar pins) and start from the IT sample, a SaaS sample (Ledgerly, a B2B payments product) or a blank workspace.

All sample dates are relative to today, so Home always has something to say.

Production:

```bash
npm run build && npm start
```

| Command | What it does |
|---|---|
| `npm run dev` | Server + Vite dev middleware with hot reload on :4300 |
| `npm start` | Serves the built PWA from `web/dist` |
| `npm test` | 50 tests: every engine, the store, accounts/roles/tokens, MCP, sample integrity, PII redaction |
| `npm run typecheck` | `tsc --noEmit` over core, server, CLI and web |
| `npm run seed` | Put the demo workspace back to its original content and exit |

Environment: `PORT` (4300), `HOST` (127.0.0.1), `TL_DATA` (`data/`), `TL_SIGNUP` (`open` or `invite-only`), `TL_DEMO` (`0` turns the demo accounts off), `ANTHROPIC_API_KEY` (optional server-wide default for Claude), `TL_MODEL` (`claude-opus-5-5`).

---

## Working as a team

- **Accounts and workspaces.** Everyone signs in with their own account. A workspace holds one product or programme; you can be in several and switch from the top of the sidebar. New accounts get a personal workspace.
- **Invites.** Admins create an invite link for an email address and a role (and optionally teams) under **Settings → People & access**, and share it however they like — Throughline sends no email. Links work once, for that address, for 14 days.
- **Roles.** *Viewer* reads and comments (sponsors, auditors). *Editor* creates and edits. *Admin* also manages people, AI and imports. *Owner* also manages admins and can archive the workspace. The server enforces roles on every request; viewers see read-only screens.
- **Teams** group people inside a workspace and feed capacity planning and RACI.
- **Live.** Changes from any person, the CLI, the extension or an AI assistant appear instantly for everyone, and every change is attributed in the activity trail.
- **Data layout.** `data/system.db` holds accounts, sessions, memberships, invites and hashed API tokens; each workspace is its own SQLite file in `data/workspaces/`; `data/secret.key` encrypts stored AI keys. Back up the folder; never commit it.

---

## What's inside

The sidebar is short on purpose: **Home**, **Inbox**, **Ask**, the tools you pinned, and seven sections. Each tool opens with tabs for the rest of its section, and a one-time "how this works" panel; jargon (RACI, WSJF, salience, baselines…) is explained on hover or focus. **All tools** lists everything in plain words, with pins.

**Home** — "My day": one sentence on what is waiting on you, the six most urgent things the workspace noticed (approvals waiting on you, promises at risk vs forecast, overdue touchpoints, cooling relationships, rising signal themes, untested leaps of faith, revisit-due decisions, high-exposure risks, failing UAT, measurements due — the full brief is one click away), people to reach with meeting prep, what is coming up, and a getting-started checklist for new workspaces. Inbox, Ask.

**Strategy** — Vision board & OKRs with progress and confidence · Metric tree & tracking plan · Business cases (NPV, ROI, payback, IRR, cost of delay, CD3) · Market (capability matrix vs competitors, win/loss) · Capacity (target vs actual allocation from real throughput, tech-debt register).

**Stakeholders** — Registry & 360° profiles · **Meeting prep** with generated talking points · Power/interest grid · Salience model · Engagement assessment matrix (current → desired, with suggested moves) · Influence network & "path to influence" · Cadence-based touchpoints and sentiment trends · Comms plan with overdue detection · Requests board with SLA and close-the-loop · **Promise ledger checked against the Monte Carlo forecast** · RACI with validation · Audit-grade approvals · Conflicts (positions vs interests) · Alignment check on decisions, bets and releases.

**Discover** — Signal Hub (TF-IDF theme clustering, trends, ARR, link suggestions, CSV import) · Opportunity tree with evidence strength & loud-customer detection · Bets · Assumption map · Experiment Lab (sample size, two-proportion z-test, CI) · Personas & journey maps · Research.

**Define** — **Spec Studio**: live ambiguity linter with inline highlights, completeness checker, a 10-role **Review Board**, requirement extraction, contradiction detection · Requirements with versions, baselines, word-level diffs and change requests with impact · Decision log (reversibility, revisit triggers) · Decision tables (gaps, overlaps, pairwise test generation) · **Visual process modeller** — drag shapes onto horizontal or vertical swimlanes, drag steps between lanes, drag to connect, inline rename, undo/redo, tidy-up, zoom, SVG export, keyboard control, live modelling checks (no start, dead ends, unreachable steps, unlabelled decision outcomes) and as-is/to-be comparison · State models (reachability, dead ends) · Story map with drag-and-drop slicing · BA toolkit (elicitation → extraction, use cases, data dictionary with PII, gap analysis, capability map, SWOT, 5 whys/fishbone) · Glossary enforcement.

**Deliver** — Backlog health (duplicates, stale, orphans, missing AC, cycles) · Prioritization (RICE/WSJF + sensitivity analysis + ranking stability) · Roadmap (Now/Next/Later + timeline with forecast bands, internal/external views) · Releases (launch readiness, rollout & rollback, notes per audience) · Delivery pulse · RAID with risk heatmap · UAT & defects by root cause · Generated traceability matrix (CSV export) and impact analysis.

**Learn** — Bet ledger with calibration chart and Brier score · Feature catalog with removal candidates.

**Meetings & docs** — Meetings (notes → decisions, actions, risks) · Document generator (PRD, BRD, PR/FAQ, steering pack, release notes, audience-specific updates) · Activity trail.

**Settings** — Profile and persona · Workspace · People & access (invites, roles, teams) · Tokens & integrations (personal access tokens, copy-paste MCP/CLI/REST setup) · AI provider · Data (export, import, replace with a sample).

Every one of the 51 entity types also has generic create/edit/list/detail views with backlinks, comments and history, and a ⌘K palette searches everything. Press `c` anywhere for quick capture.

---

## Platforms

| Surface | How |
|---|---|
| **Web** | `npm run dev` / `npm start` |
| **Desktop & mobile** | Installable PWA (Chrome/Edge "Install app", Safari "Add to Dock" / "Add to Home Screen"). Responsive down to 375 px with a mobile tab bar; read-only offline from the last cached workspace. |
| **AI assistants (MCP)** | Claude Desktop, Claude Code, Cursor, VS Code or any MCP client: Streamable HTTP at `/mcp` with `Authorization: Bearer <token>`, or the stdio bridge `node mcp/stdio.ts` with `TL_URL` and `TL_TOKEN`. 15 tools: search, get/list items, daily brief, meeting prep, forecast, impact analysis, traceability gaps, spec checks, process-model checks, document generation, schema, and (with a write token) capture, create and update. **Settings → Tokens & integrations** shows ready-to-paste configs. |
| **CLI** | `node cli/tl.ts help` — `capture`, `brief`, `search`, `prep "<name>"`, `export`, and `lint <spec.md>` which runs fully offline and exits 1 on errors (use it in CI). Set `TL_URL` and `TL_TOKEN`. |
| **Browser extension** | Load `extension/` unpacked in Chrome/Edge; right-click selected text → *Send to Throughline as signal / request*. Guesses the source from the site (service desk, review site, CRM…). |
| **REST API** | `POST /api/capture` for chat bots, email-in, scripts. Full CRUD under `/api/entities`, `/api/batch`, live changes over SSE at `/api/events`. Authenticate with `Authorization: Bearer <token>` (or `X-TL-Token`). |

Tokens are personal: create one per tool under **Settings → Tokens & integrations**, as read-only or read & write (capped by your role in that workspace). They are stored hashed and can be revoked at any time.

---

## AI (optional)

Each workspace chooses its own model under **Settings → AI** (admins):

- **Claude (Anthropic)** — `claude-opus-5-5` by default, structured JSON-schema outputs, server-side refusal fallbacks. Uses the key saved for the workspace, or `ANTHROPIC_API_KEY` from the server environment.
- **OpenAI-compatible** — any `/chat/completions` endpoint: OpenAI, Azure OpenAI, OpenRouter, Mistral, Groq, or a local Ollama / LM Studio / vLLM (one-click presets). Uses JSON-schema output where supported, JSON mode otherwise.
- **None** — every feature still works on the built-in engines.

This enables **deep review** in Spec Studio (the ten reviewer roles raise only questions the deterministic board didn't) and **Ask** answers with citations. Keys are encrypted at rest and never sent back to the browser; a *Test connection* button checks the setup. Emails, phone numbers and bank accounts are redacted before anything leaves the machine, and AI only proposes — nothing is written until you click.

Prefer your own assistant? Connect it over MCP instead (see Platforms) — it then uses your assistant's model and subscription.

---

## Architecture

```
core/        platform-agnostic TypeScript: schema (51 entity types), Intent Graph, 21 engines
server/      Node HTTP server: accounts, sessions, roles, invites, tokens (system.db); one SQLite store per
             workspace with an append-only activity trail; REST + SSE; MCP; AI providers; IT and SaaS samples
mcp/         stdio bridge for MCP clients that launch local commands
web/         React PWA (hand-rolled design system, light/dark, charts per the data-viz palette)
cli/         `tl` command — shares the core
extension/   Chrome/Edge MV3 capture extension
docs/        concept, gap analysis, build plan
```

The graph is derived from typed reference fields in `core/schema.ts`, so traceability, impact analysis, backlinks and 360° profiles work for every entity type, including ones you add.

**Security model:** the server binds to `127.0.0.1` by default; put it behind HTTPS before exposing it to a network. Passwords are hashed with scrypt; sessions are HttpOnly, SameSite=Lax cookies; sign-in is rate-limited. API tokens are stored as SHA-256 hashes and carry a read or write scope capped by the owner's role. Roles are checked on every request, per workspace. Cross-origin requests are refused except on token-authenticated read/capture endpoints. Deletes are soft and every change is attributed to a person (or their token) in the activity trail.

## Not built yet

SSO (SAML/OIDC), email delivery of invites, Slack/Teams app, email-in, meeting bots, two-way Jira/ADO/ServiceNow sync, native desktop/mobile wrappers. Accounts, tokens, MCP, the capture API and the shared core are the foundations for each.
