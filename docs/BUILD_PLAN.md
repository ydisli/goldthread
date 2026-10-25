# Throughline — Build Plan

## Architecture

```
            ┌───────────────────────── core/ (platform-agnostic TypeScript) ─────────────────────────┐
            │ schema (38 entity types) · graph index (refs, backlinks, traversal)                     │
            │ engines: lint · completeness · contradictions · glossary · review board · decision      │
            │ tables · state models · prioritization (RICE/WSJF + sensitivity) · Monte Carlo forecast │
            │ · experiment stats · finance (NPV/ROI/payback) · stakeholder analytics · RACI ·         │
            │ hygiene · clustering (TF-IDF) · traceability & impact · calibration · brief · search ·  │
            │ extraction · document generation                                                         │
            └───────────────┬───────────────────────────────┬──────────────────────────┬──────────────┘
                            │                               │                          │
                 server/ (Node, SQLite)              web/ (React PWA)            cli/ (tl)
                 REST API · SSE live sync            desktop + mobile            capture · brief ·
                 capture endpoint · AI proxy         responsive, installable     search · lint (CI)
                            │
                 extension/ (Chrome/Edge MV3) — highlight → evidence
```

- **Runtime:** Node ≥ 23 (native TypeScript type-stripping + built-in `node:sqlite`). No build step for server/CLI.
- **Web:** React + Vite, hand-rolled design system (tokens, light/dark), hash router, PWA (manifest + service worker).
- **Data:** generic entity store (`entities` table, JSON data) + append-only `activity` table. The graph is derived from typed reference fields in the schema, so traceability, impact analysis and 360° profiles come for free for every entity type.
- **AI:** every analysis has a deterministic engine; Claude enhances when `ANTHROPIC_API_KEY` is set.
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

## Out of scope for this build (designed, needs credentials or native toolchains)

Slack/Teams app, email-in, meeting bots, two-way Jira/Linear/ADO sync, SSO,
native desktop wrapper (Tauri), native mobile apps. The capture API, the
platform-agnostic core and the PWA are the foundations for all of them.
