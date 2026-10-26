# Goldthread: Build Plan

## Architecture

```
            ┌───────────────────────── core/ (platform-agnostic TypeScript) ─────────────────────────┐
            │ schema (53 item types + custom) · graph index (refs, backlinks, traversal)                     │
            │ engines: lint · completeness · contradictions · glossary · review board · decision      │
            │ tables · state models · prioritization (RICE/WSJF + sensitivity) · Monte Carlo forecast │
            │ · experiment stats · finance (NPV/ROI/payback) · stakeholder analytics · RACI ·         │
            │ hygiene · clustering (TF-IDF) · traceability & impact · calibration · brief · search ·  │
            │ extraction · document generation · process models (layout, checks)                      │
            │ Jira/ADO import · the Field Guide (book parsing, quiz checks)                           │
            └───────────────┬───────────────────────────────┬──────────────────────────┬──────────────┘
                            │                               │                          │
                 server/ (Node, SQLite)              web/ (React PWA)            cli/ (tl)
                 accounts · roles · invites · tokens desktop + mobile            capture · brief ·
                 one store per workspace · REST      responsive, installable     search · lint (CI)
                 SSE per workspace · MCP · AI
                            │
                 extension/ (Chrome/Edge MV3): highlight → evidence
                 mcp/stdio.ts: bridge for MCP clients (Claude Desktop, Claude Code, Cursor, VS Code)
```

- **Runtime:** Node ≥ 24 (native TypeScript type-stripping + built-in `node:sqlite`). No build step for server/CLI.
- **Web:** React + Vite, hand-rolled design system (tokens, light/dark), hash router, PWA (manifest + service worker).
- **Data:** `data/system.db` (users, sessions, workspaces, memberships, invites, hashed tokens, encrypted AI settings) plus one SQLite file per workspace in `data/workspaces/`: a generic entity store (`entities` table, JSON data) and an append-only `activity` table attributed to a user id. The graph is derived from typed reference fields in the schema, so traceability, impact analysis and 360° profiles come for free for every entity type.
- **Access:** roles owner/admin/editor/viewer per workspace, enforced by the router on every request; cookie sessions for the web app, personal read/write tokens for CLI, extension, REST and MCP.
- **AI:** every analysis has a deterministic engine; a workspace can add Claude or any OpenAI-compatible model, or be driven by the user's own assistant over MCP.
- **Tests:** `node --test` for engines and server (an in-process harness, and local stand-ins for every external service); Playwright for browser journeys and axe accessibility scans.

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
| 11. Finish the loop | comments signed server-side with @mentions into the Inbox, undo and restore for deletes, Jira / Azure DevOps CSV import (stories, defects, resolved dates; re-import by key) and export, `goldthread import`, keyboard shortcuts | A PO can bring their real backlog in, and nothing typed in Goldthread can be lost by accident |
| 12. The Field Guide | a book in `book/` (craft, tool, templates, glossary) rendered in-app with reading paths, progress, quizzes, search, copyable templates; chapters linked from tool guides and readable by assistants over MCP; structure checked by tests | A new PO or BA can learn the job and the tool in one place |

| 13. Open-source ready | Apache-2.0 code and CC BY 4.0 book; email (SMTP queue, invites, reset links, mention/approval notices, weekly digest); OIDC single sign-on; password reset, personal data export and account deletion; edit-conflict detection with field-level merge; live Jira Cloud and Azure DevOps sync with push; Slack and Teams posting and capture; email-in; attachments; Word and print-to-PDF documents; Teams/Zoom transcript import; custom fields and item types; sub-quadratic engines for large workspaces; online backups; Docker image; Playwright and axe tests; self-hosting, security, accessibility and contributor docs | A team can self-host it, connect their tools and contribute back, with every external integration marked as tested only against stand-ins until someone runs it for real |

## Not built yet

SAML single sign-on, ServiceNow sync, meeting bots, native desktop and mobile
wrappers (Tauri, Capacitor), translations, keyboard alternatives to drag and
drop on boards, and real-time co-editing of a single text field. Integrations
in phase 13 are tested against local stand-ins of each service; see
[SELF_HOSTING.md](SELF_HOSTING.md#what-has-been-tested).
