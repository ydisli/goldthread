---
id: the-job
title: The job, honestly
part: craft
minutes: 12
summary: What Product Owners and Business Analysts are actually for, what good looks like, and the running example used throughout the book.
tools: [stakeholders, specs, roadmap]
---

Most people become a Product Owner or a Business Analyst sideways. A service desk lead gets asked to "own" the new portal. A developer who asks good questions becomes the person who writes things down. An operations manager is told the transformation programme needs a BA and they know the process best. Nobody hands you a manual, and the manuals that exist describe ceremonies and templates rather than the job.

This chapter describes the job. Not the job title, the job: what you are there to do, what it looks like when it goes well, and the ways it quietly goes wrong.

## Two roles, one purpose

The two roles grew up in different places. The **Business Analyst** comes from the world of projects and operations: someone has to understand how the business actually works today, what needs to change, and describe that change precisely enough to build, buy or configure. The **Product Owner** comes from agile delivery: one person decides what the team works on next, so the team isn't pulled in five directions and the most valuable work happens first.

In practice the two overlap a great deal, and in many internal IT teams one person does both. A useful way to separate them:

| | Product Owner | Business Analyst |
|---|---|---|
| Core question | *What should we do next, and why that?* | *What exactly is needed, and is it right?* |
| Owns | The order of the work, the outcome it should produce | The clarity of the work, the shared understanding |
| Typical outputs | Roadmap, priorities, bets, release decisions | Requirements, models, rules, acceptance criteria |
| Failure mode | Busy team, unchanged results | Perfect documents, wrong thing built |
| Works most with | Sponsors, users, the delivery team | Subject-matter experts, architects, testers |

Neither role is senior to the other. A product without analysis builds the right thing badly; analysis without product ownership builds the wrong thing well.

You will also meet two neighbouring roles. A **product manager** (common in software companies) usually owns the longer-term strategy and market, and may have several POs working with teams. A **project manager** owns time, cost and coordination for a fixed piece of work. If someone in your organisation holds one of those titles, agree with them early who decides what. Most friction between these roles comes from never having that conversation.

## The one job underneath both

Strip away the titles and both roles do the same underlying thing: **they keep a line unbroken from a real problem to a working change that solves it.**

That line has links: a problem that is real and worth solving, the people who have it, an idea for what to change, the decisions about scope, the requirements and rules that describe the change, the stories the team builds, the tests that prove it works, the release that puts it in front of people, and the measurement that tells you whether the problem actually went away.

When the line is unbroken, anyone can ask "why does this exist?" of any story, test or decision and get an answer. When it breaks (and it breaks constantly), you get the familiar symptoms:

- A feature nobody asked for, built because "it was on the roadmap".
- A requirement that contradicts another one, discovered in UAT.
- A promise made to a VP that the delivery forecast never supported.
- A release that went out on time and changed nothing anybody can measure.
- An auditor asking why an access rule exists, and nobody knowing.

This book, and the tool it comes with, are named after that line: the **throughline**. Almost every technique you will learn exists to protect one of its links.

## Five responsibilities

If you want a checklist for the job, it is these five. They apply to POs and BAs alike, with different emphasis.

1. **Know the problem and the people.** Who has the problem, how often, how badly, and who else cares about the solution: the sponsor, the security team, the auditor, the people who will support it at 3 a.m.
2. **Make the work clear.** Turn conversations into something a team can build and test without guessing: requirements, rules, models, examples, acceptance criteria.
3. **Make choices.** There is always more to do than capacity. Decide what comes first, what comes later and what doesn't happen, and explain why in terms the business understands.
4. **Keep promises honest.** Know what has been promised to whom, and whether delivery can actually support it. Raise the alarm early, with evidence, not late with apologies.
5. **Check that it worked.** After release, go back and measure. Did the problem shrink? What did we learn? What would we do differently?

Notice what is missing: writing tickets, running ceremonies, maintaining a backlog. Those are activities. They matter, but they are how you do the job, not the job itself.

> [!trap] The backlog administrator
> The most common way to fail as a PO is to become a very efficient administrator of other people's requests. The backlog is groomed, the sprint is full, stakeholders feel heard, and nothing important changes. If you can't explain how the top five items on your backlog move a number someone cares about, you are administering, not owning.

## What good looks like

You can spot a strong PO or BA by what happens around them, not by their documents.

- **Developers ask them fewer clarifying questions mid-sprint,** because the hard questions were asked before the work started.
- **Stakeholders are rarely surprised.** Bad news arrives early, with options. Good news comes with numbers.
- **"Why?" always has an answer.** For any piece of work there is a problem, a decision and a person behind it, and they can point to all three.
- **They say no regularly, and people accept it,** because the reasons are visible and fair.
- **They know what worked last quarter and what didn't,** and their confidence in new bets is calibrated by that history.
- **The team trusts their priorities** enough that they don't need to relitigate them every week.

And you can spot the weak versions just as easily:

- **The order-taker** writes down whatever the loudest stakeholder says and calls it a requirement.
- **The proxy** stands between the team and the users, so the team never hears from a real user and the PO becomes a bottleneck.
- **The document factory** produces long specifications that nobody reads and that are out of date before sign-off.
- **The hero** keeps everything in their head. They are indispensable, exhausted and a single point of failure.

## The internal IT twist

Most writing about product ownership assumes a commercial product: customers who can leave, revenue to grow, competitors to beat. If you work in internal IT (and this book assumes many readers do) the job has the same shape but different pressures.

**Your users can't leave.** An employee can't switch to a competitor's laptop provisioning. That sounds comfortable, but it means you lose the clearest feedback signal there is. Unhappy internal users don't churn; they work around you, complain to their VP, or quietly lose hours every week. You have to go and find that pain, because it won't find you.

**Value is measured differently.** You rarely have revenue. You have time saved, risk reduced, cost avoided, audit findings closed, satisfaction scores, and the productivity of the people you serve. Those numbers exist, but you usually have to define and collect them yourself.

**There are more people with a veto.** Security, data protection, internal audit, enterprise architecture, the change advisory board, works councils, HR, finance. Each has legitimate power to stop or reshape your work. Stakeholder management is not a soft skill in IT; it is half the job.

**You often configure rather than build.** Much internal IT is assembling and configuring platforms: an identity platform, an ITSM tool, an HR system. Requirements still matter just as much, but "what can the platform do out of the box?" becomes a constant question, and "build vs buy vs configure" is a decision you will make repeatedly.

**Governance is real.** Changes go through change management. Access rules are audited. Some requirements exist because a regulation says so, and you need to be able to prove they were met. Traceability is not paperwork in this world; it is what lets you pass the audit.

None of this makes the job less of a product job. It makes it a product job with more stakeholders, quieter users and stricter proof.

## Meet Northwind

Every chapter in this book uses one running example, and the sample workspace in Throughline contains the same story, so you can open what you read about.

**Northwind** is a mid-sized company with about 1,900 employees and contractors across offices, sales teams and warehouses, hiring around 600 people a year. Its IT department runs **ServiceHub**, the internal platform employees use to get set up, request access, reset passwords and get help.

- **Alex Rivera** is the Product Owner for Employee IT Services.
- **Jordan Kim** is the Business Analyst for Identity & Access.
- **Priya Nair** leads the Identity & Access engineering team; **Tomás Herrera** runs the service desk; **Grace Okoye** runs infrastructure and endpoints.
- **Morgan Blake** (CIO) sponsors the work. **Dana Whitfield** (CISO) cares about security and owns the audit objective. **Kim Lee** runs internal audit. **Elena Petrova** is the Data Protection Officer.
- **Hannah Lee** runs HR operations. **Daniel Brooks**, VP Sales, is impatient: he has a large cohort of new sales reps starting in January and wants them productive on day one. **Olivia Hart** runs warehouse operations, where shift workers share scanners and don't have company phones.
- **Noah Williams** chairs the change advisory board.

The problems are familiar to anyone in IT. New hires wait about **72 hours** to be fully productive because laptops are imaged by hand and access requests bounce between managers and system owners. The service desk handles about **1,450 password reset tickets a month.** Leavers keep access after they go, and quarterly access reviews are done in spreadsheets, which is a problem with a **SOX IT general controls audit** coming up.

Alex and Jordan's big bets for the quarter are **automated joiner–mover–leaver (JML) access**, **self-service password reset (SSPR)**, an **access request portal** and **automated access reviews**. Over the coming chapters you'll see them work through stakeholders, discovery, requirements, process models, prioritisation, forecasts, releases and audits, and make some of the mistakes you are learning to avoid.

> [!try] Open the sample
> If you signed in to the ServiceHub demo, everything above is already there. Open [Stakeholders](tool:stakeholders) to meet the cast, or [Vision & OKRs](tool:vision) to see the objectives Alex is working towards. If you're in your own workspace, create a new workspace from the switcher at the top of the sidebar and start it from the **IT sample**.

## How to use this book

**Part I, The craft,** is about the job and works without any tool. Each chapter covers one area, shows it applied at Northwind, names the common traps and ends with a few questions to check yourself. Read it in order if you're new to the role; dip in by topic if you're not.

**Part II, Working in Throughline,** maps the craft onto the tool: where each technique lives, how the pieces connect, and recipes for a real working week. Read it once you're using Throughline, or alongside Part I. Each craft chapter links to the tools it uses.

The **appendices** hold fill-in templates (problem statements, interview guides, user stories, decision records, release checklists) and a glossary.

Throughout, callouts mark four kinds of aside:

> [!tip]
> Practical advice that makes the technique easier.

> [!trap]
> A mistake people make often enough to name.

> [!example] At Northwind
> The technique applied to the running example.

> [!try]
> Where to find it in Throughline.

## Check yourself

```quiz
Q: A stakeholder asks why a particular access rule exists. In a team with a healthy "throughline", what should happen?
- Someone remembers the meeting where it was decided
- The rule is removed until someone complains
- * The rule links to the requirement, decision and problem behind it, so anyone can answer
- The BA rewrites the specification to include a rationale section
Why: The point of an unbroken line is that "why?" can be answered from the work itself, not from someone's memory. Memory leaves when people do, and auditors don't accept it.
```

```quiz
Q: Which of these is most clearly the Product Owner's call rather than the Business Analyst's?
- How the leaver process handles contractors
- * Whether self-service password reset ships before the access request portal
- Which fields the access request form needs
- How to phrase the acceptance criteria for account unlock
Why: Ordering the work, and owning the outcome that order produces, is the core PO responsibility. The other three are questions of clarity and correctness, where a BA leads (though in many teams one person does both).
```

```quiz
Q: What is the biggest practical difference between internal IT products and commercial ones?
- Internal products don't need roadmaps
- Internal users give more feedback because they work in the same company
- * Internal users can't leave, so dissatisfaction shows up as workarounds and escalations rather than churn
- Internal products have fewer stakeholders
Why: Captive users remove the clearest feedback signal. You have to go and look for the pain (in tickets, workarounds, time lost) because it won't announce itself through lost customers.
```

Next: [Problems before solutions](guide:problems-first).
