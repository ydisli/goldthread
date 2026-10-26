---
id: requirements
title: Writing requirements that survive contact
part: craft
minutes: 21
summary: Levels of requirements, the qualities that make one testable, vague words and how to fix them, non-functional needs, user stories, acceptance criteria, glossaries and contradictions.
tools: [specs, requirements, glossary, story-map]
---

A requirement is a promise about what the change will do, written precisely enough that someone can build it and someone else can prove it was built. Most requirements fail one of those two tests. They're either so vague that the builder has to guess, or so tangled that nobody can tell whether they've been met.

This chapter is about writing requirements that survive contact with developers, testers, auditors and reality. It applies whether you write formal requirement statements, user stories, or both.

## Levels of requirements

Requirements exist at different levels, and mixing them up causes confusion. A practical breakdown:

- **Business requirements:** what the organisation needs to achieve. *Pass the SOX ITGC audit without findings. Cut time to productive to 24 hours.* These come from strategy (Chapter 6).
- **Stakeholder or user requirements:** what particular people need to be able to do. *A hiring manager can see what access their new hire will have before day one.*
- **Solution requirements:** what the solution must do (**functional**) and how well it must do it (**non-functional**). *Accounts are created three business days before the HR start date. p95 provisioning completes within 15 minutes of approval.*
- **Transition requirements:** what's needed to move from today to tomorrow, and then go away. *Existing accounts are matched to Workday worker IDs before go-live. Service desk agents are trained before cutover.*

Each solution requirement should trace up to a stakeholder or business requirement. If you can't say which need a requirement serves, either the requirement is unnecessary or you've missed a need.

## What makes a requirement good

Over the decades, requirements practice has converged on a short list of qualities. A good requirement is:

- **Necessary:** removing it would leave a real need unmet.
- **Unambiguous:** it can be read only one way.
- **Verifiable:** there's a practical way to prove it's met.
- **Feasible:** it can be done within known constraints.
- **Singular:** one requirement, not three joined by "and".
- **Consistent:** it doesn't contradict other requirements.
- **Traceable:** it links to where it came from and to what implements and tests it.
- **Solution-free (mostly):** it says what's needed, not how to build it, unless the "how" is itself a constraint.

You don't need to check all eight consciously every time. Three questions catch most problems:

1. **Could two reasonable people read this differently?** (Ambiguity.)
2. **How exactly would I test it?** (Verifiability.)
3. **Why does this exist?** (Necessity and traceability.)

## Vague words and how to fix them

Most ambiguity comes from a small set of words. Learn to spot them in your own writing:

| Kind | Examples | Fix |
|---|---|---|
| **Vague terms** | fast, quickly, easy, user-friendly, intuitive, flexible, robust, efficient, seamless, appropriate | Replace with a measurable condition or a concrete example |
| **Weak modals** | should, may, might, could, ideally, where possible | Use "must" for requirements; move nice-to-haves elsewhere |
| **Unbounded quantities** | many, several, a lot, large, minimal | Give a number or range |
| **Open-ended lists** | etc., and so on, including but not limited to | List them all, or define the rule |
| **Absolutes** | always, never, all, every, 100% | Check they're really meant; usually there's an exception |
| **Comparatives without a baseline** | faster, better, more secure, improved | Faster than what, by how much? |
| **Passive voice hiding the actor** | access is approved, the account is disabled | Approved by whom? Disabled by what? |
| **Placeholders** | TBD, TBC, ???, to follow | Fine in drafts; never in a baseline |

> [!example] At Northwind
> An early draft of the JML spec said: *"The system should quickly provision appropriate access for new employees, including email, Teams, etc."*
>
> Almost every word is a problem. "Should" is weak. "Quickly" isn't testable. "Appropriate" is undefined. "New employees" excludes contractors, maybe deliberately. "Etc." leaves the list open. And it's three requirements (timing, scope of access, systems) wearing one sentence.
>
> Jordan rewrote it as:
> - **REQ-1:** Accounts and birthright groups are created three business days before the HR start date.
> - **REQ-2:** Access packages are assigned from the job code in Workday.
> - **REQ-4:** p95 provisioning completes within 15 minutes of approval.
> - Plus a glossary entry defining **birthright access** as the list of groups every worker receives, owned by Dana's team.

## Functional and non-functional

**Functional requirements** describe behaviour: what the system does in response to inputs and events. *When the HR termination time passes, the worker's accounts are disabled.*

**Non-functional requirements** (NFRs, sometimes called quality attributes) describe how well it must do it, and under what constraints. They're the ones people forget, and the ones that cause the most expensive surprises. A checklist of categories:

- **Performance:** response times, throughput, peak loads. *p95 provisioning within 15 minutes; 300 sign-ins in the five minutes before a shift.*
- **Availability:** uptime, maintenance windows, recovery time. *Self-service reset available 24/7; the HR feed recovers automatically after an outage.*
- **Security:** authentication, authorisation, encryption, segregation of duties. *No one can hold both the AP clerk and vendor master roles.*
- **Privacy:** data minimisation, retention, consent, subject access. *Leaver mailboxes are deleted after 30 days.*
- **Auditability:** what's logged, for how long, who can see it. *Every grant and revoke is logged and retained for seven years.*
- **Accessibility:** standards met, assistive technologies supported.
- **Operability and supportability:** monitoring, alerting, runbooks, how support diagnoses problems.
- **Compatibility:** browsers, devices, the shared warehouse scanners.

> [!tip] Make NFRs measurable with percentiles
> "Provisioning completes within 15 minutes" fails the first time one request takes 16. "p95 provisioning completes within 15 minutes of approval" (95% of requests) is testable, realistic and still meaningful. Specify what's measured, from when to when, and over what period.

## User stories

Agile teams usually express work as **user stories**:

```
As a [type of user]
I want [some capability]
so that [some benefit].
```

*As a warehouse associate, I want to unlock my account at the shift scanner using my badge and PIN, so that I can start my shift on time without calling the service desk.*

The format is useful because it forces you to name who benefits and why. But a story is not a specification. It's a placeholder for a conversation, and it becomes buildable only when it has **acceptance criteria**.

### Stories and requirements together

There's a long-running debate about whether agile teams need requirements or only stories. In practice, especially in IT with audits and integrations, you often need both:

- **Requirements** state the durable truths: rules, constraints, NFRs, things that must remain true across many releases and that auditors will test.
- **Stories** slice the work into deliverable increments, each implementing part of one or more requirements.

*REQ-5 (Leaver deprovisioning: accounts disabled within one hour of the HR termination time)* is implemented by several stories: process termination events from Workday, disable accounts in the directory, revoke SaaS sessions, alert on failures. When all are done, the requirement is met, and the trace from requirement to stories to tests is your audit evidence.

### INVEST

A good story is:

- **Independent:** can be built and released without waiting for other stories, as far as possible.
- **Negotiable:** the details are open for discussion until it's built.
- **Valuable:** delivers something a user or the business would notice.
- **Estimable:** the team understands it well enough to size it.
- **Small:** fits comfortably in a sprint, ideally a few days.
- **Testable:** has clear acceptance criteria.

Chapter 11 covers how to split stories that fail "small".

## Acceptance criteria

Acceptance criteria turn a story or requirement into something checkable. Two common formats:

**Rule-based checklists** work well for simple conditions:

- Unlock is available from the sign-in page and the shift scanner.
- Unlock requires badge and PIN at a scanner, or MFA elsewhere.
- Five failed attempts lock self-service for 30 minutes and alert the service desk.

**Given / When / Then** (sometimes called Gherkin, after the tool that popularised it) works well for behaviour, and doubles as a test script:

```
Given a warehouse associate whose account is locked
  And they are at a registered shift scanner
When they scan their badge and enter the correct PIN
Then their account is unlocked
  And they are signed in to the scanner
  And the unlock is logged with the scanner ID
```

Write criteria for the **unhappy paths** too: wrong PIN, unregistered scanner, badge reported lost, account disabled because the person has left. These are where defects hide.

> [!tip] Examples beat abstractions
> When a rule is hard to state, give examples instead. "Movers lose access outside their new package after 14 days" becomes much clearer with three examples: someone moving from Sales to Finance, someone moving within Sales, someone moving back after a secondment. Examples are also what testers need.

## One term, one meaning

A large share of requirements defects come from words, not logic. "Start date" means the contract start to HR, the first day in the office to the hiring manager, and the date accounts must exist to IT. "User" can mean employee, contractor, service account or anyone with a login. "Approved" can mean the manager approved, or the system owner approved, or both.

Keep a **glossary**: each term, one definition, and the synonyms you'll avoid. Then use the terms consistently. When you spot a synonym in a spec ("hire date" where the glossary says "start date"), fix it, because a developer will assume two words mean two things.

## Contradictions

Requirements gathered from different people contradict each other more often than anyone expects. Two classic forms:

- **Direct conflict:** two requirements that can't both be true. *Leaver mailboxes retained for 90 days for handover* and *leaver mailboxes deleted after 30 days*. Both existed in Northwind's JML spec, from different stakeholders.
- **Conflicting numbers:** the same measure with different targets. *p95 provisioning within 15 minutes* in the main spec, and *within 5 minutes for Sales cohorts* in a change request from Daniel's team.

Contradictions aren't a sign that you did something wrong. They're the natural result of listening to many people. The mistake is not finding them until build or UAT. Review the whole set periodically, specifically looking for conflicts, and resolve each one as a decision (Chapter 4 covers the people side).

## Rationale and source

For each requirement worth arguing about, record **why it exists** and **who it came from**. A requirement without a rationale gets deleted by the next person who finds it inconvenient, or kept forever after the reason has gone. The leaver mailbox rule should say: *Rationale: data minimisation under GDPR. Source: Elena Petrova, DPO.* Then anyone who wants to change it knows who to talk to.

## Common traps

> [!trap] Requirements as UI instructions
> "Add a 'Request access' button to the top right of the portal" is a design decision, not a requirement. The requirement is "Employees can request an access package from a searchable catalog." Leave room for the designer.

> [!trap] Compound requirements
> "The system must create the account, assign groups and notify the manager." When the notification fails, is the requirement met? Split into three, each independently testable.

> [!trap] NFRs as afterthoughts
> Performance, security and auditability bolted on at the end are expensive. Ask about them in the first workshop, not the last.

> [!trap] Writing for yourself
> You know what you meant. Read each requirement as a developer who joined last week, and as an auditor who doesn't trust you. If either would ask a question, answer it in the requirement.

> [!exercise] Rewrite five requirements
> Take five requirements or acceptance criteria from your current work. For each, run the three questions (two readings? how to test? why?) and check against the vague-word table. Rewrite them. Then give the rewritten versions to a tester and ask them to describe how they'd test each. Where they hesitate, there's still ambiguity.

> [!try]
> [Spec Studio](tool:specs) checks your writing as you type: vague terms, weak modals, unbounded quantities, open-ended lists, passive voice, compound requirements, placeholders and glossary synonyms, with a suggested fix for each. [Requirements](tool:requirements) manages individual requirements with versions, rationale and sources, and finds contradictions across the whole set. The [Glossary](tool:glossary) defines terms once; every spec is checked against it.

## Check yourself

```quiz
Q: Which requirement is verifiable as written?
- The portal must be fast and easy to use
- Provisioning should be quicker than today
- * p95 provisioning completes within 15 minutes of manager approval
- Access is granted appropriately to new starters
Why: It names the measure (95th percentile), the start and end points (approval to completion) and the threshold. The others use vague terms, weak modals or comparatives without a baseline.
```

```quiz
Q: "When a job code changes, access outside the new package is flagged and removed after 14 days, and the manager is notified." What's the main problem?
- It uses passive voice
- * It's a compound requirement: flagging, removal and notification should be separately testable
- It's a non-functional requirement
- It includes a number
Why: If notification fails but removal works, is the requirement met? Splitting it gives each behaviour its own acceptance criteria and test.
```

```quiz
Q: Why might an IT team need both formal requirements and user stories?
- Because auditors don't understand stories
- Because stories are only for developers
- * Requirements capture durable rules and constraints to trace and prove; stories slice delivery into increments that implement them
- They don't; stories always replace requirements
Why: In regulated or integration-heavy work, durable requirements are what you test and evidence across releases, while stories organise the building. The trace between them is your proof.
```
