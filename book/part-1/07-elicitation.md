---
id: elicitation
title: "Elicitation: getting what's in people's heads"
part: craft
minutes: 17
summary: Choosing the right technique, preparing well, running workshops that produce decisions, asking about exceptions, and confirming what you heard.
tools: [toolkit, meetings, glossary]
---

People talk about "gathering requirements" as if requirements were lying around waiting to be picked up. They aren't. Requirements are spread across people's heads, half-formed, inconsistent, full of assumptions and exceptions nobody has thought about until you ask. Some of the most important ones are things people do so routinely they've forgotten they do them.

**Elicitation** is the work of drawing that knowledge out, together with the people who hold it. It's an active, skilled activity, and doing it well is perhaps the most distinctive part of a Business Analyst's craft.

## Choosing a technique

There's no single best technique. Each suits different questions, people and stages. The most common:

| Technique | Best for | Watch out for |
|---|---|---|
| **Interviews** (1:1) | Depth, sensitive topics, senior people, understanding one role's view | Time-consuming; you get one perspective at a time |
| **Workshops** | Building shared understanding, resolving differences, mapping processes and rules together | Dominant voices; needs strong facilitation |
| **Observation** (shadowing) | Real behaviour, tacit knowledge, workarounds | Slow; people behave differently when watched |
| **Document analysis** | Current policies, procedures, scripts, contracts, regulations | Documents describe intent, not practice; often out of date |
| **Interface analysis** | Integrations: what data moves between systems, when, in what format | Needs technical partners; easy to miss error handling |
| **Prototyping** | Validating understanding of screens and flows; surfacing missed needs | People fixate on visual details |
| **Surveys** | Breadth: how widespread a need or opinion is | Can't follow up; leading questions; low response |
| **Data analysis** | Volumes, patterns, edge-case frequency | Data quality; needs context to interpret |

Most real elicitation combines several. A typical sequence for a process change: **document analysis** to understand the official process, **interviews** with each role, **observation** to see what really happens, then a **workshop** to map the to-be process and agree the rules together.

> [!tip] Start with documents, not people
> Before you take anyone's time, read what exists: policies, procedures, previous project documents, the current configuration, a sample of tickets. You'll ask better questions, and you won't waste a senior person's hour on things you could have read.

## Preparing

Unprepared elicitation produces vague requirements and annoyed stakeholders. For each session, decide:

- **The purpose.** What decision or understanding should exist at the end that doesn't now? "Agree the rules for which access is granted automatically on day one" is a purpose. "Discuss JML" isn't.
- **Who needs to be there.** The people who know, and the people who decide. Often not the same people.
- **What they need beforehand.** A one-page context, the current process, the questions you'll ask.
- **Your questions,** grouped by topic, with the most important first in case time runs out.
- **How you'll capture it.** Who takes notes, whether you'll draw live, how you'll confirm afterwards.

## Asking good questions

Elicitation questions fall into a few families. A good BA moves between them deliberately.

**Context questions** establish the landscape: "Walk me through what happens when someone joins." "Who's involved?" "What systems do you touch?"

**Detail questions** pin things down: "How many joiners a week?" "Which field tells you the start date?" "Who approves access to the finance system today?"

**Rule questions** find the logic: listen for "always", "never", "usually", "depends", "except". Each one hides a business rule. "Usually the manager approves." When doesn't the manager approve? Who does then?

**Exception questions** are the most valuable and the most neglected. Most requirements cover the happy path. Most defects live in the exceptions.

### Hunting for exceptions

For any process, systematically ask what happens when:

- **Timing changes:** it happens early, late, twice, or gets cancelled. *A start date moves after accounts are created. A hire is cancelled the day before.*
- **People change:** someone moves role, goes on leave, comes back, has two roles, leaves and returns. *A leaver is rehired three months later. Someone is on parental leave during their access review.*
- **Data is wrong or missing:** a field is blank, duplicated, in the wrong format, or changes. *The job code is missing. Someone's name changes.*
- **Systems fail:** the integration is down, a message arrives twice, arrives out of order. *The HR feed fails overnight.*
- **The actor is unusual:** a contractor, an intern, an executive, someone with no manager, someone without a phone. *A contractor who isn't in the HR system.*
- **Scale changes:** 120 people start on the same day.

> [!example] At Ashgrove
> In Jordan's JML workshop with Hannah (HR), Priya (engineering) and an agent from Tomás's team, the happy path takes twenty minutes to map. Then Jordan asks: "What happens when someone who left last year is rehired?" Silence, then the service desk agent laughs: "They get a second account. We merge them by hand when someone complains." Workday creates a new worker ID for rehires, and the identity platform treats it as a new person.
>
> That one question produced a requirement (match rehires to their previous identity), a defect already happening in production, and an audit concern: two identities for one person makes access reviews unreliable. It would otherwise have been found in UAT, or by the auditors.

### Quantifying

Whenever someone uses a vague word, ask for a number:

- "Fast": how fast? From when to when? For what percentage of cases?
- "A lot of requests": how many a week? At peak?
- "Rarely": once a month? Once a year?
- "Everyone": all 1,900, or all office staff?

Numbers turn opinions into requirements, and they tell you which exceptions are worth designing for.

## Running a workshop

Workshops are where shared understanding is built, and where it's most easily lost to a dominant voice or a tangent. Some practices that work:

**Have a facilitator who isn't the main contributor.** If you're the BA running the session, your job is to draw out others, not to present your design.

**Make the work visible.** Draw the process, the rules table or the examples live, where everyone can see and correct them. People are far better at correcting a wrong diagram than at describing a right one from scratch.

**Use concrete examples.** Abstract discussion ("the system should handle movers") goes in circles. Concrete examples ("Maria moves from Sales to Finance on 1 March. What happens to her CRM access on 1 March? On 15 March?") produce decisions.

**Park, don't drop.** Keep a visible "parking lot" for topics that matter but aren't for this session. Read it back at the end and assign each item an owner.

**End with decisions, actions and open questions,** read aloud. If the room can't agree what was decided, nothing was.

### Example mapping

A particularly effective format for refining a story or rule is **example mapping**. In 25 minutes, with a product person, a developer and a tester:

1. Write the **story** at the top.
2. Below it, list the **rules** (acceptance criteria) as you discover them.
3. Under each rule, write **concrete examples** that illustrate it.
4. Capture **questions** nobody can answer yet, separately.

If you end up with many rules, the story is too big; split it. If you have many questions, it isn't ready to build. If you have a handful of rules each with a couple of clear examples, you have most of your acceptance criteria.

## Listening for what isn't said

Some requirements never get stated because they're assumed. Listen for:

- **Non-functional needs:** how fast, how available, how secure, how auditable, how accessible. Nobody says "and it should work at 6 a.m. when 300 warehouse staff sign in at once", but they'll certainly notice if it doesn't.
- **Regulatory constraints:** retention, consent, segregation of duties, audit trails. These often live with people who weren't invited.
- **Existing workarounds** that your change will break. The shared spreadsheet the approvers use is a requirement source.
- **Language.** If HR says "start date", the identity team says "hire date" and the service desk says "joining day", you need a glossary entry before you need anything else. Different words for one thing, or one word for different things, cause a large share of requirements defects.

## Confirming what you heard

Elicitation isn't finished when the meeting ends. Within a day, send a written summary:

- **What we agreed:** decisions, rules, scope.
- **What we learned:** facts, numbers, exceptions.
- **What's still open:** questions, with owners and dates.
- **What happens next.**

Ask people to correct it. Some will. Most corrections are small, but some reveal that a person heard something completely different in the room. Better to find out now.

Even better, **play it back** in a form people can check: the process diagram, the decision table, examples written as Given/When/Then. People can verify an example far more reliably than they can verify an abstract statement.

## Elicitation is ongoing

Requirements aren't elicited once at the start. New questions appear during design, during build, during testing. Make it easy for developers and testers to bring questions back, and treat each one as further elicitation rather than an interruption. The best teams have a BA or PO who can answer most questions within hours.

## Common traps

> [!trap] Only talking to managers
> Managers describe how work should happen. The people doing it know how it actually happens. You need both, and when they disagree, the doers are usually right about the present.

> [!trap] Leading questions
> "You'd want an approval step there, wouldn't you?" gets you a yes and no information. Ask open questions and let people describe their reality.

> [!trap] Skipping the exceptions because time ran out
> The happy path is the easy part. If you only have time for one thing, spend it on exceptions: they cost the most to discover late.

> [!trap] No written follow-up
> Without a written summary, everyone leaves with their own version. Three weeks later, those versions are requirements in three different heads.

> [!exercise] Exception hunt
> Pick a process you're working on. Using the six exception families (timing, people, data, systems, unusual actors, scale), write at least two "what happens when…" questions for each. Take the list to someone who runs the process today. Count how many have no agreed answer. Each one is a requirement you were about to miss.

> [!try]
> Plan and record sessions in the [BA toolkit](tool:toolkit) under **Elicitation**: purpose, participants, questions and findings, linked to the requirements they produce. Workshop notes in [Meetings](tool:meetings) can be turned into decisions, actions and risks automatically. Add disputed terms to the [Glossary](tool:glossary), and Spec Studio will flag every place a spec uses them inconsistently.

## Check yourself

```quiz
Q: You need to understand how warehouse staff actually sign in at shift start, including workarounds. Which technique fits best?
- A survey of warehouse staff
- An interview with the warehouse operations manager
- * Observation at shift start, followed by short conversations
- Reading the sign-in policy
Why: Observation reveals real behaviour and workarounds people no longer notice. The manager and the policy describe how it should work; a survey can't show you a shared password on a sticky note.
```

```quiz
Q: A stakeholder says "Usually the manager approves the request." What should you do?
- Write "The manager approves the request" as a requirement
- * Ask when the manager doesn't approve, and who does then
- Move on; "usually" is good enough for now
- Ask whether the manager should always approve
Why: "Usually" signals a rule with exceptions. The exception (manager on leave, no manager, manager is the requester) is where the real requirements and future defects are.
```

```quiz
Q: Your example map for a story has nine rules and seven open questions. What does that tell you?
- The story is ready for development
- * The story is probably too big and not ready: split it and resolve the questions first
- You need a longer workshop
- The developers should resolve the questions during the sprint
Why: Many rules suggest the story should be split; many open questions mean it's not understood well enough to build. Both are signals to keep refining before committing.
```
