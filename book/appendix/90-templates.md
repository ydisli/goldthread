---
id: templates
title: Templates
part: appendix
minutes: 10
summary: Fill-in templates for the techniques in this book. Copy them into your notes, a spec or a Goldthread item.
tools: [specs, bets, decisions, releases]
---

Each template below is short on purpose. Fill in what you know, mark what you don't, and treat the gaps as your next conversations. In the app, each template has a **Copy** button in its top-right corner.

## Problem statement

From [Chapter 2](guide:problems-first).

```
[Who] can't / struggles to [goal]
because [obstacle, without a solution].
This costs [impact: time, money, risk, frequency].
We know this because [evidence: data, tickets, interviews, observation].

Options:
1. Do nothing: [cost of leaving it]
2. [Requested solution]
3. [Alternative]
4. [Alternative]
```

## Stakeholder profile

From [Chapter 3](guide:stakeholders).

```
Name, role, organisation:
Power (1–5):        Interest (1–5):
Legitimacy: yes/no  Urgency: yes/no
Engagement now → desired:
Cares about (goals, targets):
Worries about (risks, past experiences):
Prefers to communicate (format, frequency):
Success, in their words:
Influenced by:
Open items (requests, promises, approvals, conflicts):
Cadence: every __ days
```

## Interview guide

From [Chapter 5](guide:discovery).

```
Purpose: what decision will this research inform?
Participant: role, segment, how recruited

Warm-up (2 min)
- What does a normal week look like for you?

The last time (15–20 min)
- Tell me about the last time you [did / experienced X].
- What happened next? How long did that take?
- What did you do while you were waiting?
- Who else was involved?
- Is there anything you do to avoid that happening? (workarounds)
- How often does this happen?

Wrap-up (5 min)
- Is there anything I should have asked but didn't?
- Who else should I talk to?

Notes: exact quotes in "quotation marks"; observations marked [obs].
```

## Bet (hypothesis)

From [Chapter 5](guide:discovery).

```
We believe [this change]
for [these people]
will [achieve this outcome],
measured by [metric] moving from [baseline] to [target]
by [check date].
Confidence: __%

Riskiest assumptions:
1. [assumption]: value / usability / feasibility / viability. Test: [how]
2.
```

## Workshop plan

From [Chapter 7](guide:elicitation).

```
Purpose (the decision or understanding we'll have at the end):
Participants (who knows / who decides):
Pre-read (sent by):
Agenda:
  0:00  Purpose and ground rules
  0:05  Walk through the current process / examples
  0:25  Rules and exceptions (timing, people, data, systems, unusual actors, scale)
  0:50  Decisions, actions, open questions read back
Parking lot owner:
Follow-up summary sent by: (within 24 hours)
```

## Requirement

From [Chapter 8](guide:requirements).

```
ID:            Title:
Statement:     [actor] must [behaviour / quality] [measurable condition]
Kind:          functional / non-functional / business rule / constraint / transition
Priority:      must / should / could / won't (this time)
Rationale:     why this exists
Source:        person, regulation, policy, decision
Acceptance:    how we'll prove it (criteria or examples)
Links:         spec, stories, tests, decisions
```

## User story with acceptance criteria

From [Chapter 8](guide:requirements).

```
As a [type of user]
I want [capability]
so that [benefit].

Acceptance criteria
Given [context]
  And [more context]
When [action or event]
Then [observable outcome]
  And [more outcomes]

Unhappy paths
Given … When … Then …

Notes / open questions:
Implements requirements:
```

## Decision table

From [Chapter 9](guide:modelling).

```
Decision:              Hit policy: unique / first / any
Conditions (values):   A (a1, a2, a3)   B (b1, b2)   C (c1, c2)
Actions:               X, Y

| Rule | A  | B  | C  | X | Y |
|------|----|----|----|---|---|
| R1   | a1 | –  | c1 |   |   |
| R2   |    |    |    |   |   |

Combinations: 3 × 2 × 2 = 12. Covered: __. Gaps: __. Overlaps: __.
```

## Decision record

From [Chapter 14](guide:governance).

```
Decision: [one sentence]
Date:        Decided by:        Status: proposed / decided / superseded
Context: the situation and forces at play
Options considered:
- Option A: pros / cons
- Option B: pros / cons
Decision and reasoning:
Consequences (good and bad):
Revisit: [date or trigger]
Links: requirements, bets, specs affected
```

## Change request

From [Chapter 10](guide:specs-and-reviews).

```
Change:            Requested by:          Date:
Why (problem or new information):
Affects (from impact analysis):
- Requirements:
- Stories / tests:
- Releases / dates:
- Promises / stakeholders:
Cost: effort __, delay __ weeks × cost of delay __, risk __
Decision: accepted / rejected / deferred    By:     Reason:
```

## RACI row check

From [Chapter 14](guide:governance).

```
Activity:
R (does the work):
A (one person, final say):
C (input before):
I (told after):
Check: exactly one A? at least one R? are all Cs really needed?
```

## Release readiness

From [Chapter 13](guide:delivery).

```
Release:            Target date:          Tier:
Scope: stories done __/__, tests passing __/__, open defects __ (S1 __, S2 __)

Readiness (owner, done?)
- Service desk briefed, knowledge articles updated
- Runbooks and monitoring in place
- Change approval granted (standard / normal)
- Security / privacy sign-off where needed
- Users informed (what, when, why it's good for them)
- Training for changed ways of working
- Rollback tested

Rollout plan: [waves / groups / flags, with dates]
Rollback criteria: [measurable thresholds]
Hypercare: [length, who, daily check-in]
Check date for outcome measurement:
```

## Stakeholder update (one fact base, four readers)

From [Chapter 4](guide:relationships).

```
Facts this week: [status, numbers, risks, decisions needed]

Executive:    outcome progress, top risk, decision needed (3 lines)
Sponsor/VP:   what it means for their people and dates
Operators:    what changes for their team, when, what they need to do
Audit/control owners: controls affected, evidence available
```

## Outcome review

From [Chapter 15](guide:outcomes).

```
Bet:                     Check date:
Predicted: [metric] from __ to __, confidence __%
Actual: __
Result: success / partial / failed / inconclusive
Other things that changed in the period:
Did the mechanism happen? (usage, behaviour)
What we learned:
What we'll do differently next time:
```
