---
id: specs-in-throughline
title: Specs and analysis in Throughline
part: tool
minutes: 16
summary: Spec Studio's live checks and review board, managed requirements with baselines and contradictions, decisions, decision tables, the process modeller, story maps, the BA toolkit and the glossary.
tools: [specs, requirements, decisions, decision-tables, process, story-map, toolkit, glossary]
---

The Specs & analysis area is the BA's workshop. It supports Chapters 7 to 10: eliciting, writing, modelling and reviewing. Every tool here has the same aim: **find the gap, the ambiguity or the contradiction while it's still cheap to fix.**

## Spec Studio

**Specs & analysis → Spec Studio** is where you write PRDs, BRDs and functional specs in Markdown. A new spec starts from a template with the sections from [Chapter 10](guide:specs-and-reviews): problem and outcome, scope and non-goals, requirements, rollout, open questions. Use it, change it or paste your own.

A spec page has four tabs:

### Quality

As you write, the text is checked line by line for the problems from [Chapter 8](guide:requirements):

- **Vague terms** (fast, user-friendly, appropriate, robust…)
- **Weak modals** (should, may, ideally…)
- **Unbounded quantities** (many, several, minimal…)
- **Open-ended lists** (etc., and so on…)
- **Absolutes** (always, never, all…) worth double-checking
- **Comparatives without a baseline** (faster, better…)
- **Passive voice** that hides who acts
- **Compound requirements** joined with "and"
- **Placeholders** (TBD, TBC, ???)
- **Glossary synonyms**: a word your glossary says to avoid in favour of the defined term

Each finding comes with an explanation and a suggested fix. Fix it, or mark it **won't fix** if it's intentional. The spec gets a quality score so you can see it improve.

The **completeness** check lists what a reviewer will ask about: problem statement, success metric, non-goals, roles and permissions, errors, empty and loading states, accessibility, analytics, rollout and rollback, open questions, dependencies, support readiness. Context-dependent items (audit trail, personal data, time zones, limits, concurrency, notifications, security) appear when your text mentions things that trigger them, such as approvals, deletion, exports or dates.

### Requirements

The **Requirements** tab extracts candidate requirements from your text (sentences with "must", acceptance-style statements, numbered requirements) and lets you turn them into managed requirements with one click, linked to the spec. If a matching requirement is already linked to the spec, it's shown next to the candidate, so you don't create duplicates. You can also add requirements manually.

### Review board

The **Review board** reviews the spec through the eyes of the roles from [Chapter 10](guide:specs-and-reviews): developer, QA, security, privacy, support, data, legal and compliance, accessibility, UX and finance. Each raises the questions that role would ask, with a severity. You answer each one (often by improving the spec), or accept it as a known risk.

With an AI provider connected, the board uses the model for deeper, context-aware questions. Without one, it uses built-in checks, which are still good at catching the usual gaps. Personal data such as emails and phone numbers is redacted before anything is sent to a model.

Open review questions appear in the Inbox and on the spec until resolved.

### Preview, approval and documents

**Preview** shows the rendered spec. **Request approval** creates an approval for the people who must sign off (Chapter 19). From **Meetings & docs → Documents** you can generate a PRD or BRD that pulls in the spec, its bet, evidence, requirements and decisions.

> [!example] At Northwind
> Open *Access request portal: draft* in the sample. The quality check flags vague wording in the draft, the completeness check shows missing error handling and notifications, and the review board raises the absent-approver question from [Chapter 10](guide:specs-and-reviews). That's the same set of gaps Jordan found, surfaced automatically.

## Requirements

**Specs & analysis → Requirements** manages individual requirements: statement, kind (functional, non-functional, business rule, constraint…), **MoSCoW** priority, status, source, owner, rationale and version, linked to specs, stories, tests and decisions.

- **Versions:** editing an approved requirement creates a new version, so history is never lost.
- **Baselines:** **Capture baseline** freezes the current set as an agreed snapshot, typically at sign-off. A baseline page shows exactly what has changed since: added, removed and modified requirements, side by side.
- **Change requests:** propose a change to baselined requirements. The change request shows the **impact**: affected requirements, stories, tests, releases and promises. Decide it with a recorded reason.
- **Contradictions:** Throughline compares requirements for conflicts, such as different numbers for the same measure (15 minutes versus 5) or opposing statements about the same subject (retain for 90 days versus delete after 30). Each contradiction links both requirements. Resolve it with a decision or open a conflict.

## Decisions

**Specs & analysis → Decisions** is the decision log from [Chapter 14](guide:governance): title, context, options, decision, consequences, who decided, status and **revisit date**. Decisions link to the requirements, bets and specs they affect. When a revisit date arrives, the decision shows up on Home; mark it revisited or supersede it with a new decision.

Log a decision from anywhere with **C → Decision**, or from a meeting (Chapter 24).

## Business rules

**Specs & analysis → Business rules** holds decision tables ([Chapter 9](guide:modelling)). Define the conditions with their allowed values and the actions, then add rules row by row. Use "–" for "any value". Choose a hit policy: *unique* (exactly one rule should match), *first* (the first matching rule wins) or *any* (several may match, as long as they agree).

Throughline checks **every combination** of inputs:

- **Gaps**: combinations no rule covers, listed with the exact inputs.
- **Overlaps**: combinations two rules cover with different outcomes.

It then **generates test cases** with the expected outcome for each: every combination for small tables, or a **pairwise** set (every pair of condition values covered at least once) for larger ones, which keeps the number of tests manageable without missing interactions between any two conditions. Hand them to testers or turn them into test cases in UAT & quality.

> [!example] At Northwind
> Open *Access approval routing*. The analysis shows the overlap between R3 and R5 for an employee requesting standard access to confidential data, and the gaps for restricted data and contractor birthright access, exactly as [Chapter 9](guide:modelling) describes.

## Process models

**Specs & analysis → Process models** is a drag-and-drop swimlane modeller:

- **Lanes** for roles, teams or systems, horizontal or vertical. Switch orientation any time; your layout is preserved.
- Drag **Start**, **Task**, **Decision** and **End** from the bar onto a lane, or select a step and click a shape to add the next step after it.
- **Drag** a step to move it; it snaps to the lane and position under your pointer.
- **Connect** by dragging the small dot on a step's edge onto another step. Drop it on empty space to create and connect a new step in one go.
- **Double-click** to rename. Label decision outcomes (Yes / No) on the connection.
- **Delete** removes, **arrow keys** nudge, **⌘Z** / **⇧⌘Z** undo and redo, **Tidy** re-spaces everything along the flow.
- Export as **SVG** for PowerPoint, Visio, Confluence or Figma.

While you draw, Throughline reviews the model: missing start or end events, dead ends, unreachable steps, decisions with only one outcome or unlabelled branches, decisions not phrased as questions, steps in lanes that no longer exist. It counts **steps, decisions, handoffs** (connections crossing lanes) and **rework loops** (connections going backwards). Link an **as-is** model to its **to-be** counterpart and the page compares the two.

Your AI assistant can review a process model too, over MCP (Chapter 26).

## Story map

**Specs & analysis → Story map** lays out the user journey as a row of steps (the backbone), with stories underneath each step, then lets you draw horizontal **release slices** across them, the walking skeleton first. It's the slicing technique from [Chapter 11](guide:prioritisation) made visual. Open any story to see its INVEST check, whether it meets the Definition of Ready, Gherkin checks on its acceptance criteria and hints for splitting it.

## BA toolkit

**Specs & analysis → BA toolkit** gathers the other analysis techniques:

- **Elicitation:** plan and record sessions (purpose, participants, questions, findings), linked to what they produced ([Chapter 7](guide:elicitation)).
- **Use cases:** actor, goal, preconditions, main, alternate and exception flows, postconditions, linked to requirements.
- **State models:** states, transitions, triggers and guards, checked for unreachable and dead-end states.
- **Data dictionary:** entities and attributes with definitions, source of truth, owner, sensitivity and retention.
- **Gap analysis:** current state, future state and the gaps between them.
- **Capability map:** business capabilities and how well they're supported today.
- **SWOT** and **Root cause** analysis (five whys and fishbone-style causes) for problem framing.

## Glossary

**Specs & analysis → Glossary** defines each term once, with the synonyms to avoid. Spec Studio checks every spec against it and flags synonyms, so "hire date" in a spec gets a nudge towards the defined "start date". Add terms the moment you notice two people using different words for the same thing.

> [!try]
> In the sample, open **Requirements → Contradictions** to see the mailbox and provisioning-time conflicts. Then open the **New-hire onboarding** process models and compare the as-is and to-be handoff counts. Try dragging a step, connecting two steps and pressing ⌘Z.

## Check yourself

```quiz
Q: You edit an approved requirement's statement. What happens?
- The old wording is lost
- * A new version is created, so the history and baseline comparison are kept
- The edit is blocked until a change request is approved
- The requirement goes back to draft and loses its links
Why: Approved requirements are versioned on edit. Baselines then show exactly what changed since sign-off, which feeds change control.
```

```quiz
Q: A decision table analysis reports two gaps and one overlap. What should you do before development?
- Nothing; developers will handle edge cases
- * Resolve each gap and overlap with the rule owners, then use the generated tests
- Delete the overlapping rules
- Switch the hit policy to "first" so the overlap disappears
Why: Gaps and overlaps are undecided business rules. Changing the hit policy hides the overlap without deciding which outcome is right.
```
