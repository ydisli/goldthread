---
id: delivery-in-goldthread
title: Delivery in Goldthread
part: tool
minutes: 14
summary: Backlog health and Jira or Azure DevOps import, ranking with sensitivity, the roadmap, Monte Carlo forecasts, releases, the RAID log, UAT and defects, and generated traceability.
tools: [backlog, prioritize, roadmap, pulse, releases, raid, uat, trace]
---

The Delivery area supports Chapters 11 to 13: from backlog to release, with honest dates. It isn't a replacement for your team's delivery tool. Most IT teams will keep Jira or Azure DevOps for day-to-day sprint work. Goldthread adds what those tools don't do well: ranking you can defend, forecasts you can trust, readiness you can check and traceability you don't have to maintain.

## Backlog health

**Delivery → Backlog health** watches the backlog for the decay [Chapter 11](guide:prioritisation) describes:

- **Possible duplicates:** stories with similar titles, including duplicates of stories already done (probably already delivered). Archive one with a click; undo if you were wrong.
- **Stale:** untouched for a long time.
- **Orphans:** no link to a requirement, bet or spec. Why do they exist?
- **Missing acceptance criteria** on open stories.
- **Oversized:** estimates too large for a sprint, with hints for splitting.
- **Dependency cycles:** stories that depend on each other in a loop.

The page gives a **health score**, counts stories that meet the Definition of Ready, and shows open and unestimated points.

### Import and export

**Import from Jira / ADO** takes a CSV export from Jira or Azure DevOps (see [Chapter 18](guide:first-week) for how to export). Goldthread:

- detects which tool it came from and maps the columns (summary or title, key, type, status, points, sprint or iteration, labels or tags, description, acceptance criteria, resolved or closed date),
- maps statuses onto backlog, ready, in progress, in review and done,
- pulls "As a… I want… so that…" out of descriptions, and Given/When/Then or an "Acceptance criteria" section into the acceptance criteria,
- imports bugs as **defects** (optional) and skips epics (create those as bets),
- keeps **resolved dates**, so the forecast can use your real throughput,
- **updates** stories it has seen before (matched on the issue key) instead of duplicating them, and never overwrites links or notes you added in Goldthread.

**Export** writes open stories as a CSV that Jira's importer or Azure DevOps can map directly: summary, description with the user story narrative, acceptance criteria, points, labels and sprint. Choose *new stories only* to push stories you wrote in Goldthread (ones without a Jira key yet).

**Live sync.** Instead of exporting and importing by hand, an admin can connect Jira Cloud or Azure DevOps directly ([Chapter 26](guide:connect)). The backlog then refreshes on a schedule and on **Sync now**, using exactly the same rules as an import, and new stories written here can be created in the delivery tool automatically.

## Prioritize

**Delivery → Prioritize** ranks bets by **RICE** or **WSJF** ([Chapter 11](guide:prioritisation)). Edit an estimate directly in the table and the ranking updates immediately.

What makes it more than a scoring sheet is the sensitivity analysis:

- **What would change the order:** for each pair of neighbours, how far an estimate must move before they swap places. If a small change flips them, the ranking between them is fragile and that estimate deserves evidence.
- **Ranking stability:** how stable the top of the list is when all estimates vary within reasonable bounds.

Use it in planning conversations to argue about the inputs that matter, not the scores.

## Roadmap

**Delivery → Roadmap** shows bets as **Now / Next / Later**, or on a **timeline**. Drag a bet between horizons to move it. Items in Now show their forecast range and confidence, not a single date. Each item links to its bet, so anyone can click through to the hypothesis, evidence and progress. Before sharing outside the team, switch to the **External** view, which shows each item as a plain description and leaves out forecasts and internal detail. The roadmap is built to communicate direction, not to promise dates ([Chapter 12](guide:forecasting)).

## Forecast

**Delivery → Forecast** (the delivery pulse) is [Chapter 12](guide:forecasting) in practice:

- **Throughput:** stories finished per week, from their done dates.
- **Forecasts for active bets:** for each bet in delivery, a **Monte Carlo** simulation of its remaining stories using your team's real throughput, giving **50%, 85% and 95%** dates and the chance of hitting the bet's target date.
- **Scope creep:** stories added to a bet after it started, so you can show why a date moved.
- **Work in progress:** a warning when too many things are in flight at once.
- **Promises vs forecast:** every promise that depends on a bet, with its probability (Chapter 19).

The forecast needs **done dates**. If you import from Jira or Azure DevOps, include the resolved or closed date column. If you track stories in Goldthread, set them to done and the date is recorded.

## Releases

**Delivery → Releases** holds releases and launches: version, target date, tier (major launch, normal, silent), goals, the bets included, the **rollout plan** and **rollback criteria** ([Chapter 13](guide:delivery)).

The **launch readiness** checklist holds the operational readiness items from [Chapter 13](guide:delivery), grouped by area, each with an owner. Type *Area: item* to add one, for example *Support: Brief the service desk*. Ashgrove's JML release has items for the service desk, CAB approval, security sign-off, the DPO's review of mailbox retention, a pilot briefing for Sales managers, the rollback runbook and a load test of 150 hires in one run. A release page also shows:

- its scope, with counts of stories done, tests passing and defects still open, so you can see what isn't finished or tested,
- an **alignment check** for stakeholders who might be surprised,
- **release notes** for each audience: executives, sales and customer success, support, engineering, customers.

## RAID log

**Delivery → RAID log** holds risks, assumptions, issues and dependencies, each with an owner, status and, for risks, **probability** and **impact**. The **risk exposure** matrix plots open risks so the top few stand out. Dependencies can be internal or external, with the date you need them by. Overdue and high-exposure items show up on Home.

## UAT & quality

**Delivery → UAT & quality** has two tabs:

- **Tests:** test cases (UAT, acceptance, system, regression) with steps and expected results, linked to stories and requirements, with who ran them, when, and the result. The page shows the **pass rate** and what's failing or blocked.
- **Defects:** severity, status, where found (UAT, staging, production, review) and **root cause** (requirement, design, code, environment, data). The **requirement-origin defects** count is your feedback loop from [Chapter 13](guide:delivery).

Generate test cases from decision tables (Chapter 21) and link each to the rule it checks.

## Traceability & impact

**Delivery → Traceability** generates the requirements traceability matrix from the graph: for each requirement, its **source**, the **stories** that implement it, the **tests** that verify it (and whether they pass), and the **release** that delivers it. **Gaps** are listed per requirement: no story, no test, failing tests, no release. This is the view auditors and change boards ask for ([Chapter 14](guide:governance)).

**Impact analysis** works on any item: pick a requirement, decision, story or bet and see everything a change would ripple into (dependent requirements, stories, tests, releases, promises and the stakeholders to tell). Use it before deciding a change request.

> [!example] At Ashgrove
> Open **Traceability** in the sample and select REQ-5 (*Leaver deprovisioning*). The chain from requirement to stories, tests and release is what Jordan showed Kim Lee for the audit in [Chapter 14](guide:governance). Then run **Impact** on REQ-4 (*Provisioning time*) to see what Daniel's 5-minute change request would affect.

## Check yourself

```quiz
Q: The forecast page shows no data for your team even though you imported 300 stories from Jira. What's the likely cause?
- The Monte Carlo engine needs story points
- * The export didn't include resolved dates, so Goldthread has no throughput history
- Forecasts only work for bets created in Goldthread
- Jira stories can't be forecast
Why: Throughput is counted from done dates. Re-export with the Resolved (Jira) or Closed Date (Azure DevOps) column and re-import; existing stories are updated, not duplicated.
```

```quiz
Q: Prioritize shows that two neighbouring bets swap places if one reach estimate changes by 10%. What should you do?
- Trust the current order
- * Treat their order as undecided and either get evidence for that estimate or decide on other grounds
- Switch from RICE to WSJF
- Remove one of the bets
Why: A ranking that flips on a small estimate change is fragile. The sensitivity view tells you exactly which estimate is worth investigating.
```
