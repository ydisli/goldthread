---
id: specs-and-reviews
title: Specs, reviews and change control
part: craft
minutes: 18
summary: What a specification is for, a structure that works, checking completeness, reviewing through other people's eyes, baselines and proportionate change control.
tools: [specs, requirements, approvals, decisions]
---

A specification (PRD, BRD, functional spec, whatever your organisation calls it) is where problem, decisions, requirements, rules and models come together into one document a team can build from. Done well, it's the most useful artefact in a project. Done badly, it's a forty-page attachment that nobody reads and everybody cites when things go wrong.

This chapter is about writing specs people use, reviewing them so problems surface before build, and managing change once they're agreed.

## What a spec is for

A spec has three jobs, in this order:

1. **Create shared understanding.** Everyone who reads it should come away with the same picture of what's changing and why.
2. **Record decisions.** What was decided, what was ruled out, and the reasoning, so it doesn't get relitigated every week.
3. **Be a reference** for building, testing, supporting and auditing.

Notice "contract" isn't on the list. Specs used as contracts ("it's not in the spec, so we won't do it") damage the collaboration they're meant to support. Even when a vendor contract references a spec, the working relationship should treat it as the current best shared understanding.

## A structure that works

There's no single right template, but good specs cover the same ground. A practical structure:

1. **Problem and outcome.** The problem statement (Chapter 2), who has it, and the success metric with baseline and target. If a reader stops here, they should know why this matters.
2. **Scope.** What's in. **What's explicitly out** (non-goals). Out-of-scope lists prevent more arguments than any other section.
3. **Users and stakeholders.** Who uses it, who's affected, who decides.
4. **Requirements.** Functional and non-functional, numbered, each traceable. Or stories with acceptance criteria. Or both (Chapter 8).
5. **Rules and models.** Decision tables, process models, state models, data definitions (Chapter 9). Link rather than paste where you can.
6. **Risks, assumptions and dependencies.** What could go wrong, what you're assuming, who you're waiting on.
7. **Rollout.** Who gets it first, how you'll roll back, what support needs before launch.
8. **Open questions,** each with an owner and a date.
9. **Decisions,** with links to decision records.

In IT you'll also meet the **BRD** (business requirements document: the business need and stakeholder requirements) and the **FRS** (functional requirements specification: the detailed solution requirements). Some organisations require both. If yours does, keep them linked: every functional requirement should trace back to a business requirement.

### Writing for the reader

- **Lead with why.** The first paragraph should make a busy sponsor understand the point.
- **Short sections with clear headings.** People don't read specs top to bottom; they look things up.
- **Examples everywhere.** One worked example clarifies more than a page of abstract rules.
- **Open questions visible, not hidden.** A spec with no open questions in draft is either trivial or dishonest.
- **Living, not frozen.** Update it as decisions are made. Mark what changed and when.

## Is it complete?

Completeness is impossible to judge by reading alone; you'll miss what isn't there. A checklist helps. For each item, either the spec covers it or it explicitly says why it doesn't apply:

- Problem statement and success metric with baseline
- Non-goals
- Roles and permissions (who can do what; what happens for those who can't)
- Error handling (what can fail; what the user sees and does)
- Empty states and loading (what's shown when there's nothing, or while waiting)
- Limits and volumes (maximum sizes; behaviour at peak)
- Notifications (who, through what channel, when)
- Audit trail (what's logged; who can see it)
- Personal data and retention
- Security (authorisation, encryption, rate limits)
- Accessibility
- Time zones and locale
- Concurrency (two people editing at once; a job running twice)
- Dependencies
- Rollout and rollback
- Support readiness (help content, runbooks, service desk briefing)
- Measurement (what will be tracked to know it worked)

Some items only apply when certain things are in scope. If the spec mentions approvals or deletion, audit trail is essential. If it involves dates and global users, time zones matter. If it handles employee data, privacy does.

> [!example] At Ashgrove
> Jordan's first draft of the access request portal spec covered the happy path well. The checklist exposed what was missing: no error handling for provisioning failures, no answer to "what happens if the approver is on leave", nothing on notifications, and nothing on retention of request history, which auditors will want for seven years. Four gaps, each a likely defect, found before any design work started.

## Reviewing through other people's eyes

The author of a spec is the worst person to review it. You know what you meant, so you read what you meant. Reviews work best when reviewers look through a specific lens, asking the questions their role would ask:

| Reviewer | Asks about |
|---|---|
| **Developer** | Feasibility, architecture, performance, implementation edge cases |
| **Tester / QA** | Testability, acceptance criteria, boundaries, negative paths |
| **Security** | Authorisation, data exposure, abuse cases |
| **Privacy / DPO** | Personal data, legal basis, minimisation, retention |
| **Support / service desk** | What users will ask, how they recover, what agents need |
| **Data & analytics** | How success will be measured, baselines, tracking |
| **Legal & compliance** | Regulatory obligations, records retention, contracts |
| **Accessibility** | Keyboard, screen readers, contrast, standards |
| **UX** | Flows, states, destructive actions, consistency |
| **Finance** | Cost to run, licences, chargeback |

A review that says "looks good" has found nothing. A useful review produces **questions**. Ask reviewers for questions rather than approval: "What would you need answered before you'd be comfortable building, testing, supporting or signing this?"

Track each question to an answer. Some answers change the spec; some become decisions; some are explicitly accepted as risks. All of them should be visible.

> [!tip] Review early, in pieces
> Don't wait until the spec is "finished" to ask for review. Ask security to look at the access rules section while you're still writing the UI flows. Early, partial reviews are cheaper and get more honest feedback, because nothing is fixed yet.

## Approvals and baselines

At some point, especially in regulated work, contracted work or anything an auditor will test, you need a spec or set of requirements to be **formally agreed**. That's a **baseline**: a snapshot of the requirements at a point in time, approved by the people accountable.

A baseline means:

- **This version is what we're building.** Changes after this point go through change control.
- **Approvers agreed to it,** on a date, with a record.
- **It can be compared** with later versions to see exactly what changed.

Baselines are useful, but only where the formality is earned. Baseline requirements that need to be proven (audit controls, contractual obligations, safety). Don't baseline every story in a fast-moving backlog; you'll drown in change requests.

### Getting sign-off without pain

- **No surprises at sign-off.** Approvers should have seen and commented on everything before the formal request. Sign-off should be a formality, not a review.
- **Say what signing means.** "You're confirming these requirements reflect what Finance needs, not that the design is perfect."
- **Give a deadline and a default.** "If I don't hear by Friday, I'll take it as approved" works for some approvers; others need an explicit yes. Know which.
- **Record it.** Who approved, when, which version, with any conditions.

## Change control, proportionately

Requirements change after baseline. That's normal and healthy: you learn things. Change control exists so that changes are made **deliberately**, with their impact understood, rather than slipping in through a hallway conversation.

A **change request** answers:

- **What** change is being asked for, and by whom?
- **Why**: the problem or new information behind it.
- **Impact**: which requirements, stories, tests, releases, decisions and promises are affected?
- **Cost**: effort, delay, risk.
- **Decision**: accepted, rejected or deferred, by whom, and why.

The impact analysis is the valuable part, and it's only possible if you've kept traces between requirements, stories, tests and releases (Chapter 14).

> [!example] At Ashgrove
> Daniel's team raises a change request: provision Sales cohorts within **5 minutes** instead of the baselined **15 minutes** (p95). Impact analysis: it changes REQ-4, conflicts with nothing else, but needs a different provisioning architecture for the CRM connector (two extra stories, about two weeks), invalidates three performance tests, and puts the November release at risk. The cost of delay of slipping JML is about $12k a week. The decision, taken by Alex with Priya: reject the 5-minute target for now, because the January problem is solved by batch provisioning the week before; revisit after JML is live. Recorded with reasoning, communicated to Daniel in person.

### Proportionality

Change control should scale with risk:

- **Small, low-risk changes** to unbaselined stories: just make them, and note them.
- **Changes to baselined requirements** that don't affect controls or promises: a lightweight change request, decided by the PO.
- **Changes that affect audit controls, contracts, other teams' commitments or release dates:** a full change request, with the accountable people deciding.

If every change needs a committee, people stop raising changes and start making them quietly. That's worse.

## Common traps

> [!trap] The spec as a weapon
> "It wasn't in the spec" is sometimes true and always corrosive. If something important was missed, the conversation should be "how did we miss it, and what do we do now?"

> [!trap] Review by email
> Sending a forty-page document with "any comments by Friday?" gets silence, which is then treated as approval. Walk key reviewers through the parts that matter to them, and ask specific questions.

> [!trap] The frozen spec
> A spec that was accurate at sign-off and never updated becomes a historical document. When the team discovers something during build, update the spec, or note it in a decision record and link it.

> [!trap] Baselining everything
> Formal baselines on fast-changing work create a change-request treadmill. Baseline what must be proven; keep the rest flexible.

> [!exercise] Review your own spec through three lenses
> Take a spec you've written. Read it once as a tester (how would I test each requirement?), once as a service desk agent (what will users ask me, and can I answer?) and once as an auditor (can I prove each control works?). Write down every question. Then run the completeness checklist above. Most people find at least five gaps.

> [!try]
> [Spec Studio](tool:specs) checks completeness as you write and runs a **Review Board**: it reviews the spec through each role's lens (developer, QA, security, privacy, support and more) and raises their questions, which you answer or accept as risks. With an AI provider connected, the Review Board uses the model; without one, it uses built-in checks. [Requirements](tool:requirements) manages baselines, compares versions and handles change requests with impact analysis. [Approvals](tool:approvals) records sign-off with an audit trail, and [Decisions](tool:decisions) holds the reasoning.

## Check yourself

```quiz
Q: Which section of a spec most often prevents arguments later?
- The detailed UI description
- * The explicit out-of-scope (non-goals) list
- The glossary
- The approval record
Why: Writing down what you're not doing surfaces disagreements while they're cheap to resolve, and gives you something to point to when scope creeps.
```

```quiz
Q: A reviewer replies "Looks good to me". What's the best response?
- Record it as approval
- * Ask them the specific questions their role would care about, because "looks good" usually means it wasn't really reviewed
- Escalate to their manager
- Remove them from future reviews
Why: Useful reviews produce questions. Prompting reviewers with their role's concerns turns a skim into a real review.
```

```quiz
Q: When should requirements be formally baselined?
- Always, before any development starts
- Never, because it's anti-agile
- * When they need to be proven, such as audit controls, contractual commitments or safety requirements
- Only at the end of the project
Why: Baselines are valuable where formal agreement and change traceability matter. Applied to everything, they create a change-request treadmill.
```
