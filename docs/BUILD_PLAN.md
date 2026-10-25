# Throughline — Build Plan

## Architecture

```
            ┌───────────────────────── core/ (platform-agnostic TypeScript) ─────────────────────────┐
            │ schema (51 entity types) · graph index (refs, backlinks, traversal)                     │
            │ engines: lint · completeness · contradictions · glossary · review board · decision      │
            │ tables · state models · prioritization (RICE/WSJF + sensitivity) · Monte Carlo forecast │
            │ · experiment stats · finance (NPV/ROI/payback) · stakeholder analytics · RACI ·         │
            │ hygiene · clustering (TF-IDF) · traceability & impact · calibration · brief · search ·  │
            │ extraction · document generation · process models (layout, checks)                       │
            └───────────────┬───────────────────────────────┬──────────────────────────┬──────────────┘
                            │                               │                          │
                 server/ (Node, SQLite)              web/ (React PWA)            cli/ (tl)
                 accounts · roles · invites · tokens desktop + mobile            capture · brief ·
                 one store per workspace · REST      responsive, installable     search · lint (CI)
                 SSE per workspace · MCP · AI
                            │
                 extension/ (Chrome/Edge MV3) — highlight → evidence
                 mcp/stdio.ts — bridge for MCP clients (Claude Desktop, Claude Code, Cursor, VS Code)
```

- **Runtime:** Node ≥ 23 (native TypeScript type-stripping + built-in `node:sqlite`). No build step for server/CLI.
- **Web:** React + Vite, hand-rolled design system (tokens, light/dark), hash router, PWA (manifest + service worker).
- **Data:** `data/system.db` (users, sessions, workspaces, memberships, invites, hashed tokens, encrypted AI settings) plus one SQLite file per workspace in `data/workspaces/` — a generic entity store (`entities` table, JSON data) and an append-only `activity` table attributed to a user id. The graph is derived from typed reference fields in the schema, so traceability, impact analysis and 360° profiles come for free for every entity type.
- **Access:** roles owner/admin/editor/viewer per workspace, enforced by the router on every request; cookie sessions for the web app, personal read/write tokens for CLI, extension, REST and MCP.
- **AI:** every analysis has a deterministic engine; a workspace can add Claude or any OpenAI-compatible model, or be driven by the user's own assistant over MCP.
- **Tests:** `node --test` on the core engines (no test framework dependency).

## Phases

| Phase | Scope | Done when |
|---|---|---|
| 0. Foundation | repo, TS config, schema, graph, SQLite store, REST API, SSE, app shell, generic list/detail/form for every entity type | Any entity type can be created, edited, linked, deleted; changes appear live in other open clients |
| 1. Stakeholder Hub | registry, 360° profile, power/interest grid, salience, engagement matrix, influence network, interactions & sentiment, cadence & overdue, requests, commitments, RACI (validated), approvals, conflicts, comms plan, meeting prep, tailored updates, alignment check | A PO can prepare for any stakeholder meeting in one screen |
| 2. Strategy & Discover | vision, OKRs, metric tree, business case calculator, competitor matrix & win/loss, capacity & tech debt, Signal Hub (clustering, strength, loud-customer, CSV import), opportunity tree, assumption map, experiment lab, personas & journeys, research | Evidence flows from capture to opportunity to bet with numbers attached |
| 3. Define | Spec Studio (lint, completeness, contradictions, glossary, extraction), Review Board, requirements (versions, baselines, diff, change requests), decision log, decision tables, process models (as-is/to-be), BA toolkit, story map, INVEST/Gherkin | A spec can be taken from draft to "ready" with every gap visible |
| 4. Deliver | backlog hygiene, prioritization + sensitivity, roadmap, releases & GTM readiness, Monte Carlo forecast, commitments vs forecast, RAID, UAT & defects, traceability matrix, impact analysis | Every requirement traces to tests and releases; risk is forecast, not discovered |
| 5. Learn & cross-cutting | bet ledger & calibration, feature catalog, daily brief, Ask, meetings (notes → decisions/actions), document generator, activity trail, comments, import/export | The morning brief tells the PO what needs attention |
| 6. Multi-platform | PWA install + offline shell, mobile navigation, CLI, browser extension, capture API with token | Evidence captured from CLI/extension appears live in the web app |
| 7. AI | Claude-backed review board, ask, rewrite, extraction; graceful fallback | With a key, Review Board and Ask use Claude; without, deterministic engines |
| 8. Teams | accounts, workspaces & switcher, invites, roles, teams, personal tokens, per-workspace live sync, read-only viewers | A PO invites a BA and a sponsor; each sees what their role allows |
| 9. Connect | MCP server (HTTP + stdio bridge), OpenAI-compatible providers, per-workspace AI settings with encrypted keys | Claude Desktop can search, prep and capture in a workspace with a personal token |
| 10. Calm & intuitive | warm neutral design, Home "My day", short sidebar with persona pins, section tabs, All tools directory, guides and jargon explanations, IT sample, visual drag-and-drop process modeller | A new PO or BA finds their way without training |

## Out of scope for this build (designed, needs credentials or native toolchains)

SSO (SAML/OIDC), email delivery of invites, Slack/Teams app, email-in, meeting
bots, two-way Jira/ADO/ServiceNow sync, native desktop wrapper (Tauri), native
mobile apps. The capture API, the
platform-agnostic core and the PWA are the foundations for all of them.
