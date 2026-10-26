# Goldthread — Concept v2

> Every requirement knows why it exists — and every stakeholder knows where they stand.

Goldthread is an overlay for Product Owners and Business Analysts. It keeps the
*chain of intent* — strategy → evidence → problem → bet → requirement → story →
release → outcome → learning — as a live graph, and wraps the people side of the
job (stakeholders, approvals, commitments, communication) around that chain.

It does not replace Jira/Linear/Azure DevOps (system of record for *work*). It is
the system of record for *intent* and *alignment*.

---

## 1. Gap analysis — what v1 was missing

v1 covered discovery → spec → delivery → learning well, but treated the people
side and the strategy side as afterthoughts. Gaps found on review:

| # | Gap in v1 | Why it matters for a PO / BA | v2 answer |
|---|---|---|---|
| 1 | **Stakeholder management** was a single "radar" | Half of a PO's week is alignment: who must be consulted, who signs off, who was promised what, who is drifting into opposition | **Stakeholder Hub** (§4) — registry, maps, engagement plan, comms cadence, requests, commitments, RACI, approvals, conflicts, meeting prep |
| 2 | No **strategy layer** | Bets were not anchored to vision, OKRs or a metric tree, so prioritization had no "north" | **Strategy Studio** — vision board, OKRs, metric tree, strategy pillars |
| 3 | **Roadmap** dropped | Roadmap is the PO's main communication artifact | **Roadmap** — Now/Next/Later + timeline, confidence, audience views |
| 4 | No **business case / financials** | BAs are asked for cost/benefit, ROI, NPV, payback | **Business Case** calculator linked to bets |
| 5 | No **market & competitive intel** | Prioritization ignores competitive pressure and win/loss reasons | **Market** — competitor matrix, win/loss analysis |
| 6 | No **user story mapping** | Backlogs lose the user journey; release slicing gets arbitrary | **Story Map** — activities → steps → stories, release slices |
| 7 | No **personas / JTBD / journey maps** | Evidence had no "who"; pains were not placed in context | **Customer** — evidence-backed personas, journey maps |
| 8 | No **research ops** | Interviews were ingested but never planned | **Research** — studies, interview guides, participants, synthesis |
| 9 | Experiments had no **statistics** | "Cheapest test" was suggested, but results were eyeballed | **Experiment Lab** — sample size, significance, decision |
| 10 | No **elicitation planning** (BABOK) | BAs plan workshops, interviews, observation, document analysis | **Elicitation Planner** — technique, question bank, notes → candidate requirements |
| 11 | No **BA analysis toolkit** | Gap analysis, capability map, SWOT, root cause, use cases, state models, data dictionary are daily BA work | **BA Toolkit** |
| 12 | No **requirements management** | Attributes, MoSCoW, baselines, versioning, change control are table stakes in enterprise/regulated work | **Requirements Manager** |
| 13 | No **RAID log** | Risks/issues were invisible until they exploded | **RAID** — risk heatmap, owners, mitigations |
| 14 | No **release & launch** | Shipping ≠ launching: docs, support training, sales enablement, rollout, rollback | **Release & Launch** — GTM readiness, tiers, rollout plan |
| 15 | No **UAT & quality** | BAs run UAT and own business sign-off; defects should trace back to requirements | **UAT & Quality** — UAT plans, scenarios from AC, sign-off, defect root-cause |
| 16 | No **capacity / portfolio** | PO must balance features vs tech debt vs maintenance across teams | **Capacity & Portfolio** — allocation, tech-debt register |
| 17 | No **feature catalog / lifecycle** | Nobody knows what the product *does today*; deprecations are chaotic | **Feature Catalog** — status, adoption, sunset plans |
| 18 | No **close-the-loop** | Customers who asked never hear back | **Close-the-loop** — notify requesters when their ask ships |
| 19 | Ceremonies copilot dropped | Refinement, planning, review, retro, steering produce decisions & actions | **Meetings** — agendas, notes → decisions/actions/interactions |
| 20 | No **document generation** | Orgs still need PRD, BRD, FRD, PR/FAQ, one-pagers, steering packs | **Doc Generator** — templates rendered from the graph |
| 21 | No **collaboration & governance** | Comments, mentions, approvals, audit trail, roles, SSO | **Platform** layer |
| 22 | Single surface | POs/BAs work in meetings, chat, email, on the phone | **Multi-platform** (§2) |

---

## 2. Platforms — one core, many surfaces

**Principle:** a single platform-agnostic core (domain model + analysis engines,
written once in TypeScript) is shared by every client. A thin API exposes it.
Every client is just a view or a capture point.

| Surface | Primary jobs | Status in this repo |
|---|---|---|
| **Web app** (responsive) | Everything | ✅ built |
| **Desktop** (installable PWA on macOS/Windows/Linux) | Daily work, offline read, notifications | ✅ PWA manifest + service worker (offline read-only) + localStorage fallback; native wrapper (Tauri) later for a global capture hotkey |
| **Mobile** (installable PWA on iOS/Android) | Daily brief, quick capture, approvals, pre-meeting stakeholder brief, log an interaction right after a meeting | ✅ responsive layout + mobile nav |
| **CLI** (`goldthread`) | Quick capture, brief, search, scripting, CI checks (e.g. spec lint in a PR) | ✅ built |
| **Browser extension** | Highlight text on any page (ticket, review, competitor site) → evidence | ✅ minimal Chrome/Edge extension (MV3) |
| **REST API** | Integrations, automation | ✅ built |
| **Chat (Slack / Teams)** | `/goldthread capture`, decision detection in threads, approvals in-chat, brief DM | 🔜 endpoint designed; needs workspace credentials |
| **Email-in** | Forward a customer email → evidence or stakeholder request | 🔜 |
| **Meeting bots** | Zoom/Meet/Teams transcripts → decisions, actions, interactions | 🔜 (paste-transcript extraction built) |
| **Embeds** | Jira issue panel, Figma plugin, Confluence macro | 🔜 |

---

## 3. Module map — 7 areas, 38 modules

### A. Today
1. **Daily Brief** — what changed and what needs you: approvals waiting, overdue stakeholder touchpoints, at-risk commitments, rising signal clusters, bets due for measurement, RAID items escalating, backlog health.
2. **Ask Goldthread** — search + Q&A over the whole graph, with citations.
3. **Inbox** — stakeholder requests, review findings and approvals assigned to you.

### B. Strategy
4. **Vision Board** — vision, target group, needs, product, business goals.
5. **OKRs** — objectives & key results with progress and confidence.
6. **Metric Tree** — north star → input metrics → feature metrics, guardrails; tracking plan.
7. **Business Case** — costs, benefits, NPV, ROI, payback, cost of delay.
8. **Market** — competitor matrix, win/loss analysis.
9. **Capacity & Portfolio** — team capacity, allocation targets (e.g. 60/25/15 feature/debt/maintenance), tech-debt register.

### C. Stakeholders (see §4)
10. **Registry & 360° profiles**
11. **Maps** — power/interest grid, salience model, engagement matrix, influence network
12. **Engagement & comms plan** — cadence, channel, overdue touchpoints, interaction log, sentiment trend
13. **Requests** — intake, triage, SLA, link to evidence/bets, close-the-loop
14. **Commitments (promise ledger)** — what was promised to whom, checked against forecast
15. **RACI / DACI**
16. **Approvals & sign-offs**
17. **Conflicts & escalations**
18. **Meeting prep & tailored updates**

### D. Discover
19. **Signal Hub** — evidence inbox, clustering, evidence strength, loud-customer detector, CSV import.
20. **Opportunity Tree** — outcome → opportunities → bets → experiments.
21. **Assumption Map** — importance × evidence; riskiest-first.
22. **Experiment Lab** — sample size, significance, decision.
23. **Customer** — personas, JTBD, journey maps.
24. **Research** — studies, guides, participants, findings.

### E. Define
25. **Spec Studio** — PRD editor with ambiguity linter, completeness checker, contradiction detection, glossary enforcement, requirement extraction.
26. **Review Board** — role agents (Dev, QA, Security/Privacy, Support, Data, Legal, Accessibility, Finance) critique a spec before refinement.
27. **Requirements Manager** — attributes, MoSCoW, versions, baselines + diff, change requests with impact.
28. **Decision Log** — ADR-style, reversibility, revisit triggers.
29. **Decision Tables** — completeness/overlap/conflict checks, test generation.
30. **Process Models** — swimlanes, as-is vs to-be diff.
31. **BA Toolkit** — elicitation planner, gap analysis, capability map, SWOT, root cause (5 whys), use cases, state models (reachability check), data dictionary (PII tagging).
32. **Story Map & Stories** — backbone, release slices, INVEST checks, Gherkin AC, splitting hints.

### F. Deliver
33. **Backlog & Prioritization** — hygiene scan, RICE / WSJF with sensitivity analysis, blind scoring.
34. **Roadmap** — Now/Next/Later, timeline, confidence, audience filters.
35. **Release & Launch** — scope, GTM readiness checklist, rollout & rollback, release notes per audience.
36. **Delivery Pulse** — Monte Carlo forecast, scope creep, dependencies; **RAID** log; **UAT & Quality**; **Traceability & Impact**.

### G. Learn
37. **Bet Ledger** — predicted vs actual, learnings, calibration score.
38. **Feature Catalog** — lifecycle, adoption, removal candidates, sunset plans.

Cross-cutting: **Meetings**, **Doc Generator** (PRD, BRD, PR/FAQ, steering pack, release notes), **Comments & activity trail**, **Import/Export**, **Glossary**.

---

## 4. Stakeholder Hub — deep dive

The PO is accountable for value; value is negotiated with people. The Hub makes
alignment explicit, measurable and hard to forget.

### 4.1 Registry & 360° profile
Per stakeholder: role, org unit, type (internal / customer / partner / regulator /
vendor), power & interest (1–5), legitimacy & urgency (salience), **current vs
desired engagement** (Unaware → Resistant → Neutral → Supportive → Leading),
what they care about (goals/KPIs), concerns, preferred channel, cadence, timezone,
who influences them.

The 360° profile aggregates everything linked to the person: interactions and
sentiment trend, open requests, commitments made to them, approvals waiting on
them, decisions they made or were consulted on, conflicts they are part of,
RACI roles, and the evidence/requests that originated from them.

### 4.2 Maps
- **Power / interest grid** (Mendelow): Manage closely / Keep satisfied / Keep informed / Monitor — each quadrant implies a default cadence.
- **Salience model** (Mitchell): power × legitimacy × urgency → Definitive, Dominant, Dangerous, Dependent, Dormant, Discretionary, Demanding.
- **Engagement assessment matrix** (PMBOK): C = current, D = desired; the gap generates actions.
- **Influence network**: who influences whom; find the person to convince first.

### 4.3 Engagement & communication
- Cadence per stakeholder derived from quadrant (overridable). **Overdue touchpoint** alerts.
- **Interaction log** with sentiment (−2…+2) → sentiment trend & early warning when a key stakeholder cools.
- **Comms plan**: audience × message × channel × frequency × owner, next due date.

### 4.4 Requests (intake)
Asks from stakeholders: triage → accepted / planned / declined (with reason),
response SLA, links to evidence and bets. Shipping a linked bet triggers
**close-the-loop** — "tell the 6 requesters it's live".

### 4.5 Commitments (promise ledger)
Every promise made to a customer or exec: what, to whom, by when, by whom. Checked
continuously against the delivery forecast → *kept / on track / at risk / broken*.

### 4.6 RACI / DACI
Per initiative or activity. Validation: exactly one Accountable, at least one
Responsible, flags people who are "C" on everything (consultation overload) and
activities with no one Informed.

### 4.7 Approvals & sign-offs
Requirement baselines, specs, decisions, releases, UAT. Per-approver status with
comment and timestamp (audit-grade). Overdue approvals surface in the brief and in
the approver's profile.

### 4.8 Conflicts & escalations
Parties, positions vs underlying interests (Fisher & Ury), status (open →
negotiating → escalated → resolved), resolution and decision link.

### 4.9 Meeting prep & tailored updates
- **Prep brief** before you meet someone: what they care about, open asks, promises
  at risk, decisions affecting them since you last met, their sentiment trend,
  suggested talking points.
- **Tailored update**: one release/initiative rendered for exec, sales, support,
  engineering, customers.

### 4.10 Alignment check
Before a decision is logged: who is A/R/C on this area but hasn't been consulted?
Which affected stakeholders have resistant engagement?

---

## 5. Intent Graph v2 — entities

Strategy: vision, objective, keyResult, metric, businessCase, competitor, winLoss, team, techDebt
Stakeholders: stakeholder, interaction, request, commitment, raci, approval, conflict, commsItem
Discover: evidence, opportunity, bet, assumption, experiment, persona, journey, study
Define: spec, requirement, baseline, changeRequest, glossaryTerm, decision, decisionTable, processModel, useCase, stateModel, dataEntity, elicitation, gapItem, capability, swot, rootCause, storyMap, story, reviewFinding
Deliver: release, raid, testCase, defect
Learn: feature
Cross-cutting: meeting, comment, activity

References between entities are typed fields; the graph (and therefore
traceability, impact analysis and the 360° profile) is derived from them.

---

## 6. AI layer

Every analysis has a deterministic engine (works offline, explainable, testable)
and an optional LLM enhancement (Claude) when an API key is configured:

| Capability | Deterministic engine | With Claude |
|---|---|---|
| Ambiguity linter | Rule set (vague terms, passive voice, unbounded quantities, TBDs, undefined terms) | Contextual rewrites |
| Completeness | Domain checklists triggered by keywords | Spec-specific edge cases |
| Review Board | Role checklists triggered by content | Role agents reading the full spec |
| Signal clustering | TF-IDF cosine similarity | Theme naming & summaries |
| Ask | Ranked full-text search over graph | Cited answers |
| Meeting extraction | Pattern extraction (decided / action / TODO) | Structured extraction |
| Tailored updates | Templates | Audience-specific prose |

Guardrails: cite or don't claim; AI proposes, humans approve; never writes to an
external system without approval; PII redaction before any model call.

---

## 7. Non-functional

- Security: SSO (SAML/OIDC), roles (Admin, PO, BA, Contributor, Stakeholder-viewer), permissions mirror source systems.
- Privacy: PII redaction in evidence by default, retention policies, data residency options.
- Audit: append-only activity trail for every change; approvals are timestamped and attributable.
- Offline: PWA shell + cached workspace for read; queued writes (later).
- Accessibility: WCAG 2.2 AA; keyboard-first; light/dark.
- Performance: workspace of 50k entities searchable < 200 ms.

## 8. How we measure Goldthread itself

- Clarification loops per story ↓, requirement-origin defects ↓
- Refinement time ↓
- % shipped bets with measured outcome ↑
- Overdue stakeholder touchpoints ↓, approval cycle time ↓, commitments broken ↓
- Time to answer "why did we build X?" → seconds
- New PO/BA ramp-up time ↓
