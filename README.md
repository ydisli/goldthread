# Throughline

**The intent & alignment layer for Product Owners and Business Analysts.**

Throughline keeps the chain *strategy → evidence → bet → requirement → story → release → outcome → learning* as one live graph, and wraps the people side of the job — stakeholders, approvals, promises, conflicts, communication — around it. It sits next to Jira/Linear (the system of record for *work*) as the system of record for *intent* and *alignment*.

Every analysis runs locally on deterministic, explainable engines. Claude adds depth when an API key is configured.

> Concept, gap analysis and module map: [docs/CONCEPT.md](docs/CONCEPT.md) · Architecture and phases: [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)

---

## Quick start

Requires **Node.js ≥ 23.6** (Throughline uses Node's native TypeScript support and built-in SQLite — no build step for the server).

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4300. The first run seeds **Northwind Pay**, a fictional AP-automation product with 17 stakeholders, 44 customer signals, 14 bets, 17 requirements, decisions, releases, risks and 12 weeks of delivery history. All dates are relative to today, so the brief always has something to say. Reset or start empty under **Settings → Your data**.

Production:

```bash
npm run build && npm start
```

| Command | What it does |
|---|---|
| `npm run dev` | Server + Vite dev middleware with hot reload on :4300 |
| `npm start` | Serves the built PWA from `web/dist` |
| `npm test` | 39 tests: every engine, the store, the seed's referential integrity, PII redaction |
| `npm run typecheck` | `tsc --noEmit` over core, server, CLI and web |
| `npm run seed` | Re-seed the demo workspace and exit |

Environment: `PORT` (4300), `HOST` (127.0.0.1), `TL_DB` (`data/throughline.db`), `ANTHROPIC_API_KEY`, `TL_MODEL` (`claude-opus-5-5`).

---

## What's inside

**Today** — Daily brief (approvals waiting on you, overdue touchpoints, cooling relationships, promises at risk vs forecast, rising signal themes, untested leaps of faith, revisit-due decisions, high-exposure risks, failing UAT, measurements due), Inbox, Ask.

**Strategy** — Vision board & OKRs with progress and confidence · Metric tree & tracking plan · Business cases (NPV, ROI, payback, IRR, cost of delay, CD3) · Market (capability matrix vs competitors, win/loss) · Capacity (target vs actual allocation from real throughput, tech-debt register).

**Stakeholders** — Registry & 360° profiles · **Meeting prep** with generated talking points · Power/interest grid · Salience model · Engagement assessment matrix (current → desired, with suggested moves) · Influence network & "path to influence" · Cadence-based touchpoints and sentiment trends · Comms plan with overdue detection · Requests board with SLA and close-the-loop · **Promise ledger checked against the Monte Carlo forecast** · RACI with validation · Audit-grade approvals · Conflicts (positions vs interests) · Alignment check on decisions, bets and releases.

**Discover** — Signal Hub (TF-IDF theme clustering, trends, ARR, link suggestions, CSV import) · Opportunity tree with evidence strength & loud-customer detection · Bets · Assumption map · Experiment Lab (sample size, two-proportion z-test, CI) · Personas & journey maps · Research.

**Define** — **Spec Studio**: live ambiguity linter with inline highlights, completeness checker, a 10-role **Review Board**, requirement extraction, contradiction detection · Requirements with versions, baselines, word-level diffs and change requests with impact · Decision log (reversibility, revisit triggers) · Decision tables (gaps, overlaps, pairwise test generation) · Swimlane process models with as-is/to-be comparison · State models (reachability, dead ends) · Story map with drag-and-drop slicing · BA toolkit (elicitation → extraction, use cases, data dictionary with PII, gap analysis, capability map, SWOT, 5 whys/fishbone) · Glossary enforcement.

**Deliver** — Backlog health (duplicates, stale, orphans, missing AC, cycles) · Prioritization (RICE/WSJF + sensitivity analysis + ranking stability) · Roadmap (Now/Next/Later + timeline with forecast bands, internal/external views) · Releases (launch readiness, rollout & rollback, notes per audience) · Delivery pulse · RAID with risk heatmap · UAT & defects by root cause · Generated traceability matrix (CSV export) and impact analysis.

**Learn** — Bet ledger with calibration chart and Brier score · Feature catalog with removal candidates.

**Workspace** — Meetings (notes → decisions, actions, risks) · Document generator (PRD, BRD, PR/FAQ, steering pack, release notes, audience-specific updates) · Activity trail · Settings.

Every one of the 51 entity types also has generic create/edit/list/detail views with backlinks, comments and history, and a ⌘K palette searches everything. Press `c` anywhere for quick capture.

---

## Platforms

| Surface | How |
|---|---|
| **Web** | `npm run dev` / `npm start` |
| **Desktop & mobile** | Installable PWA (Chrome/Edge "Install app", Safari "Add to Dock" / "Add to Home Screen"). Responsive down to 375 px with a mobile tab bar; read-only offline from the last cached workspace. |
| **CLI** | `node cli/tl.ts help` — `capture`, `brief`, `search`, `prep "<name>"`, `export`, and `lint <spec.md>` which runs fully offline and exits 1 on errors (use it in CI). Set `TL_URL` and `TL_TOKEN`. |
| **Browser extension** | Load `extension/` unpacked in Chrome/Edge; right-click selected text → *Send to Throughline as signal / request*. Guesses the source from the site (support desk, review site, CRM…). |
| **REST API** | `POST /api/capture` with `X-TL-Token` for chat bots, email-in, scripts. Full CRUD under `/api/entities`, `/api/batch`, live changes over SSE at `/api/events`. |

The capture token is under **Settings → Integrations**. Changes from any surface appear live in every open client.

---

## Claude (optional)

Set `ANTHROPIC_API_KEY` (or `ANTHROPIC_AUTH_TOKEN`) and restart. This enables:

- **Deep review** in Spec Studio — the ten reviewer roles read the spec, its managed requirements and decisions, and raise only questions the deterministic board didn't.
- **Ask Claude** — answers from the most relevant workspace items, always with citations to those items.

Calls use `claude-opus-5-5` by default (`TL_MODEL` to change), structured JSON-schema outputs, and server-side refusal fallbacks (`fallbacks: "default"`). Emails, phone numbers and bank accounts are redacted before anything leaves the machine. Claude only proposes; nothing is written to the workspace until you click.

---

## Architecture

```
core/        platform-agnostic TypeScript: schema (51 entity types), Intent Graph, 20 engines
server/      Node HTTP server, SQLite store with append-only activity trail, REST + SSE, AI proxy, demo seed
web/         React PWA (hand-rolled design system, light/dark, charts per the data-viz palette)
cli/         `tl` command — shares the core
extension/   Chrome/Edge MV3 capture extension
docs/        concept, gap analysis, build plan
```

The graph is derived from typed reference fields in `core/schema.ts`, so traceability, impact analysis, backlinks and 360° profiles work for every entity type, including ones you add.

**Security model:** the server binds to `127.0.0.1` by default. Cross-origin requests are refused except on the capture/read endpoints, which require the workspace token. Deletes are soft and every change is attributed in the activity trail.

## Not built yet

Slack/Teams app, email-in, meeting bots, two-way Jira/Linear/ADO sync, SSO, multi-user permissions, native desktop/mobile wrappers. The capture API, the shared core and the PWA are the foundations for each.
