---
id: modelling
title: "Modelling: processes, rules, states and data"
part: craft
minutes: 20
summary: When a picture beats prose, which model answers which question, and how to draw swimlanes, decision tables, state models and data definitions that expose gaps.
tools: [process, decision-tables, toolkit, customers]
---

Some knowledge is hard to write as sentences. A process with five roles, three decisions and a rework loop becomes a wall of text that nobody can check. A set of approval rules written as paragraphs hides the combination nobody thought about. A model, a structured picture or table, makes that knowledge visible, and once it's visible, gaps and contradictions jump out.

Models are not documentation for its own sake. A good model is a **thinking tool** and a **conversation tool**: you draw it to understand, and you show it to check whether others understand the same thing.

## Which model for which question

The most common modelling mistake is using the wrong model, or using one where none is needed. Start from the question you're trying to answer:

| Question | Model |
|---|---|
| Who does what, in what order, and where does work wait or bounce? | **Process model** (swimlane diagram) |
| Given these conditions, what should happen? | **Decision table** |
| What states can this thing be in, and what moves it between them? | **State model** |
| What information exists, what does it mean, and who owns it? | **Data model / data dictionary** |
| What's inside our scope and what are we exchanging with outside? | **Context diagram** |
| How does an actor use the system to reach a goal, including alternatives? | **Use case** |
| What is the experience like for the person, step by step, emotionally? | **Customer journey** |

You'll rarely need all of them. A typical IT change might need one process model, one or two decision tables and a short data dictionary.

## Process models

Process models show the flow of work across people and systems. The most useful form for business analysis is the **swimlane diagram**: each lane is a role, team or system, and steps flow across lanes in order.

### Elements that matter

Formal notations like BPMN have dozens of symbols. For most business conversations you need five:

- **Start event:** what triggers the process. *Offer signed. Termination entered in Workday.*
- **Task:** a step someone or something performs. Name it **verb + object**: *Create accounts*, *Approve access*, *Ship laptop*. Not *Accounts* or *Approval process*.
- **Decision:** a branch, phrased as a **question** with labelled outcomes. *Access complete? Yes / No.*
- **End event:** where the process finishes, ideally as an outcome. *Productive on day one.*
- **Flow:** arrows showing what comes next. A flow that crosses lanes is a **handoff**.

### What to look for

Draw the **as-is** process (what really happens, not the official version) and then look at it critically:

- **Handoffs.** Every arrow that crosses a lane is a place where work waits in someone's queue and information can be lost. Count them.
- **Loops back.** Arrows going backwards are rework: something wasn't right the first time. *Chase missing access → create accounts again.*
- **Waiting.** Where does work sit idle? Often the biggest delays aren't in any step but between them.
- **Manual copying.** Someone retyping data from one system to another is both a delay and an error source.
- **Dead ends.** Paths that never reach an end: what happens then, really?

> [!example] At Northwind
> Jordan's as-is onboarding model has five lanes: HR, hiring manager, service desk, endpoint team and new hire. The flow: HR enters the hire; the manager **emails IT a list of systems**; the service desk **creates accounts by hand** and **adds groups one by one**; in parallel the endpoint team **images the laptop** (three hours) and ships it; the new hire hits "Access complete?" and, if not, the manager **chases missing access** and the loop goes back to the service desk.
>
> Counted: four handoffs on the main path and a rework loop that, from the ticket data, runs about 1.6 times per hire. The to-be model, with JML, moves account creation and access packages into an automated **ServiceHub** lane, leaves the manager only one decision (*Extra access needed?*) and has no rework loop. The difference between the two diagrams is the business case in a picture.

### Keeping it readable

- **One page.** If it doesn't fit, you're modelling at too low a level, or it's two processes.
- **Main path first.** Draw the happy path in a straight line, then add exceptions.
- **Horizontal or vertical lanes:** horizontal suits wide screens and long processes; vertical suits documents and mobile reading. Choose for the audience.
- **Pair as-is with to-be.** The comparison is usually more persuasive than either alone.

## Decision tables

Business rules hide in sentences. "Standard access to internal data needs the manager's approval; confidential data also needs the system owner; privileged access needs security as well, and contractors…" By the third clause, nobody can check whether every case is covered.

A **decision table** lays out rules as rows:

- **Conditions** across the left: the inputs that determine the outcome, each with a defined set of values.
- **Actions** across the right: what happens.
- Each **row** is a rule: for this combination of condition values, take these actions. A dash (–) means "any value".

> [!example] At Northwind
> Access approval routing:
>
> | Rule | Access type | Data | Requester | Approvals | Expires after |
> |---|---|---|---|---|---|
> | R1 | birthright | – | employee | none | never |
> | R2 | standard | internal | – | manager | never |
> | R3 | standard | confidential | employee | manager + system owner | 180 days |
> | R4 | privileged | – | – | manager + system owner + security | 30 days |
> | R5 | standard | confidential | – | manager | 90 days |

Laid out like this, two problems are easy to find, and they are exactly the problems that turn into production defects:

**Overlaps.** An employee requesting standard access to confidential data matches **both R3 and R5**, with different outcomes. Which wins? Probably R5 was meant for contractors only, but it says "–".

**Gaps.** There's no rule for **standard access to restricted data** at all. And a **contractor requesting birthright access** matches nothing. What does the system do? Whatever the developer guessed.

### Checking a decision table

- **Completeness:** multiply the number of values for each condition (3 × 3 × 2 = 18 combinations here) and check each combination is covered by some rule.
- **Overlaps:** check no combination matches two rules with different actions, unless you've deliberately chosen a hit policy that allows it (such as "first match wins").
- **Every rule needed:** if a rule can never fire because others cover all its cases, delete it or fix it.

Then a bonus: **each rule is a test case.** A complete decision table gives testers their test design for free, including the edge cases.

> [!tip] Workshop decision tables live
> Decision tables are one of the best workshop formats. Put the conditions and values on screen, then ask the room to fill in rules row by row. People who can't agree on a paragraph can usually agree on a row.

## State models

Some things in your system have a lifecycle: an access request, an account, a laptop, an approval. A **state model** shows every state the thing can be in and every allowed transition between states, with the event that triggers it.

> [!example] At Northwind
> An access request moves through: *draft → submitted → pending manager → (pending owner) → approved → provisioned*, and can end as *rejected*, *expired* or *revoked*. Transitions have triggers (*manager approves*) and sometimes guards (*only if the data is confidential or restricted*).
>
> Drawing it out shows a problem: the state *pending security* exists, because R4 in the routing table requires security approval for privileged access, but **no transition leads into it**. The model is unreachable as designed. Either privileged requests skip security (a control failure) or the transition is missing. Found on a whiteboard, it's a five-minute fix.

State models are especially good at finding:

- **Unreachable states:** nothing leads there.
- **Dead-end states:** you can get in but never out, and it isn't meant to be final.
- **Missing transitions:** what happens if the approver leaves the company while a request is pending? If the requester leaves?
- **Ambiguous triggers:** two transitions from the same state on the same event.

## Data: definitions and ownership

Many IT requirements are really about data: what it means, where it comes from, who may change it, how long it's kept. A **data dictionary** captures, for each important entity and attribute:

- **Name and definition,** in business language.
- **Source of truth:** which system owns it. *Job code: Workday. Group membership: identity platform.*
- **Owner:** which person or team is accountable for its accuracy.
- **Format and allowed values.**
- **Sensitivity:** personal data? Confidential? Regulated?
- **Retention:** how long it's kept and why.

> [!example] At Northwind
> The **Identity** entity: worker ID (from Workday; the rehire problem lives here), legal and preferred name, job code, manager, start date (defined in the glossary as the HR contract start, not the first day in the office), termination time, employment type. Recording **Workday as the source of truth** was itself a significant decision: three systems previously held conflicting job data.

You don't need a full enterprise data model. You need enough to stop people using the same word for different data, or changing data in a system that isn't the source of truth.

## Use cases and journeys

A **use case** describes how an actor uses the system to reach a goal: preconditions, a numbered main flow, alternate flows (other ways to succeed) and exception flows (ways it fails), and postconditions. It's more structured than a user story and works well for complex interactions where the alternatives matter, such as an access request that may hit segregation-of-duties rules or an absent approver.

A **customer journey** is the opposite in spirit: it follows a person through an experience, step by step, recording what they do, think and feel, and where the pain is. It's a discovery and empathy tool rather than a specification. Northwind's journey for Sam, a new sales rep, ends with "Productive on day 4: lost three days of ramp-up", which is the problem statement in story form.

## Keeping models useful

- **Model to answer a question,** then stop. You're not building a museum.
- **Keep models next to the requirements** they explain, and link them. A decision table should point to the requirement it implements.
- **Update or delete.** An out-of-date model is worse than none, because people trust it.
- **Show, don't send.** Walk people through a model in conversation. A diagram sent by email gets a glance; a diagram walked through gets corrections.

## Common traps

> [!trap] Notation over communication
> A perfectly correct BPMN diagram that business stakeholders can't read has failed. Use the simplest notation your audience understands.

> [!trap] Modelling the official process
> The policy says managers approve within 24 hours. Reality says they approve on Friday afternoons in batches. Model reality, from observation and data, then design the to-be.

> [!trap] Rules in the process diagram
> If a decision diamond has eight outgoing arrows, it's a decision table pretending to be a process. Keep the process at one decision ("Approval route?") and put the logic in a table.

> [!exercise] Find the gaps
> Take one set of business rules you're working with, written as text. Turn it into a decision table. Count the combinations, check every one is covered and no two rules overlap. Then take the main object in your system (a request, an order, an account) and draw its states and transitions. Ask: is every state reachable? Can everything that should end, end?

> [!try]
> [Process models](tool:process) is a drag-and-drop swimlane modeller with horizontal or vertical lanes, as-is and to-be comparison, live checks for missing starts, dead ends and unlabelled branches, and handoff and rework counts. [Business rules](tool:decision-tables) checks decision tables for gaps and overlaps and generates test cases. The [BA toolkit](tool:toolkit) holds state models (checked for unreachable and dead-end states), use cases and the data dictionary.

## Check yourself

```quiz
Q: You need to specify which approvals an access request needs depending on access type, data classification and whether the requester is a contractor. Which model fits best?
- A process model with a decision for each condition
- A state model of the request
- * A decision table
- A customer journey
Why: Combinations of conditions leading to outcomes are exactly what decision tables are for, and the table makes gaps and overlaps visible.
```

```quiz
Q: Your as-is process has four arrows crossing lanes and one arrow going backwards. What do these most likely represent?
- Good separation of duties
- * Four handoffs where work waits, and a rework loop
- Four systems integrations and an error handler
- Nothing; arrows are just layout
Why: Lane crossings are handoffs (queues, delays, lost information) and backward arrows are rework. Counting them is one of the quickest ways to find improvement potential.
```

```quiz
Q: A state model has a state that no transition leads into. What should you do?
- Delete the state; it's never used
- * Find out whether a transition is missing, because the state was probably added for a reason
- Leave it; developers will handle it
- Add a transition from the initial state
Why: Unreachable states usually mean a missing transition, and the missing transition is often a control (like security approval). Ask why the state exists before deciding.
```
