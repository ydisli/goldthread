---
id: glossary
title: Glossary
part: appendix
minutes: 12
summary: The terms used in this book, in plain language, with the chapter where each is explained.
tools: [glossary]
---

Terms are grouped loosely by theme. Chapter numbers point to where each is explained in depth.

## Roles and ways of working

**Product Owner (PO).** The person accountable for the order of the work and the outcome it should produce. (1)

**Business Analyst (BA).** The person accountable for the clarity and correctness of the work: understanding needs and describing change precisely. (1)

**Product manager.** Usually owns longer-term product strategy and market direction, often across several teams. (1)

**Golden thread.** The unbroken line from a real problem to a working change that solves it, through decisions, requirements, stories, tests, releases and measurement. (1)

**Refinement.** Regular work, with part of the team, to get backlog items ready to build. (11)

**Definition of Ready / Done.** Short checklists for when an item can enter a sprint, and when it's finished. (11)

**Hypercare.** A period of extra support and close monitoring right after go-live. (13)

## Problems, discovery and evidence

**Problem statement.** Who has a problem, what gets in the way, what it costs and how you know, without naming a solution. (2)

**Output / outcome / impact.** What you ship; the change in behaviour it causes; the result the organisation cares about. (2)

**Cost of the problem.** Rough size of a problem: reach × frequency × severity. (2)

**Signal.** One piece of evidence: a quote, ticket, data point or observation. "Said" signals are opinions; "did" signals are behaviour. (5, 20)

**Opportunity.** A problem or need worth solving, phrased from the user's side. (5)

**Opportunity tree.** Outcome → opportunities → solutions → experiments, kept as a tree to avoid jumping straight to solutions. (5)

**Evidence strength.** How much weight a problem's evidence carries, from volume, spread across people and segments, behaviour and recency. (20)

**Bet.** An initiative written as a falsifiable hypothesis with a metric, target, confidence and check date. (5)

**Assumption (value, usability, feasibility, viability).** Something that must be true for a bet to work: people want it; people can use it; we can build it; it works for the organisation. (5)

**Leap-of-faith assumption.** An assumption that is both important and poorly evidenced. Test these first. (5)

**Experiment.** A test designed to change your mind about an assumption: prototype, pilot, A/B test, concierge, Wizard of Oz, fake door, survey or data analysis. (5)

**Concierge test.** Delivering a service by hand before automating it, to learn whether it works. (5)

**Wizard of Oz test.** A test where users see what looks like an automated solution, but a person does the work behind the scenes. (5)

**Fake door.** A link or button for a feature that doesn't exist yet, used to measure interest. (5)

**Sample size / statistical significance.** How many observations you need to detect an effect of a given size, and whether a result is unlikely to be chance. (5)

**Persona.** An evidence-based description of a type of user, their goals and pains. (9, 20)

**Customer journey.** A person's experience step by step, with what they do, think and feel. (9)

**Jobs to be done.** The progress a person is trying to make, which they "hire" a product to help with. (2)

## People and stakeholders

**Stakeholder.** Anyone who can affect your work or is affected by it. (3)

**Power–interest grid.** Plots stakeholders by power and interest into four strategies: manage closely, keep satisfied, keep informed, monitor. (3)

**Salience.** A stakeholder's claim on attention from power, legitimacy and urgency: definitive, dominant, dangerous, dependent or latent. (3)

**Engagement level.** Unaware, resistant, neutral, supportive or leading, recorded as current and desired. (3)

**Influence network.** Who listens to whom; used to reach people indirectly. (3)

**Cadence.** How often you intend to talk to a stakeholder. (4)

**Position / interest.** What someone says they want; why they want it. Positions conflict, interests often don't. (4)

**Commitment (promise).** Something promised to someone by a date; should be checked against the forecast. (4, 12)

**RACI.** Responsible (does it), Accountable (one person, final say), Consulted (before), Informed (after). (3, 14)

**DACI.** Driver, Approver, Contributors, Informed, a variant of RACI for decisions. (14)

## Strategy and value

**Vision.** A short, repeatable description of the future you're working towards. (6)

**Pillar (theme).** One of a few focus areas between the vision and the backlog. (6)

**OKR.** Objective (qualitative goal) and key results (measurable outcomes with baseline and target). (6)

**North star metric.** The single best measure of the value the product delivers. (6)

**Input / output / guardrail / health metric.** Metrics that drive the north star; metrics of activity; metrics that must not get worse; overall product health. (6)

**Leading / lagging indicator.** Moves early and predicts the result / confirms the result after the fact. (6)

**Business case.** A structured argument that benefits justify costs. (6)

**NPV (net present value).** The value of future cash flows in today's money, after subtracting costs. (6)

**ROI / payback / IRR.** Return relative to cost; time until benefits exceed costs; the discount rate at which NPV is zero. (6)

**Cost of delay.** The value lost for each week something isn't done. (6, 11)

**Build / buy / configure.** The three ways to get a capability: make it, purchase it, or set up a platform you already have. (6)

**Technical debt.** Shortcuts or ageing technology that make future change slower or riskier; it "charges interest". (6)

## Requirements and analysis

**Elicitation.** Drawing out knowledge from stakeholders, together with them. (7)

**Example mapping.** A short workshop format: story, rules, examples under each rule, and open questions. (7)

**Business / stakeholder / solution / transition requirement.** What the organisation needs; what people need to do; what the solution must do and how well; what's needed only to move from today to tomorrow. (8)

**Functional / non-functional requirement.** Behaviour; quality attributes such as performance, security, availability and auditability. (8)

**p95.** The 95th percentile: 95% of cases are at or below this value. (8)

**User story.** "As a… I want… so that…", a placeholder for a conversation, made buildable by acceptance criteria. (8)

**INVEST.** A good story is Independent, Negotiable, Valuable, Estimable, Small and Testable. (8)

**Acceptance criteria / Given–When–Then (Gherkin).** Conditions that prove a story is done; a structured format for behaviour that doubles as a test. (8)

**MoSCoW.** Must, Should, Could, Won't (this time). (8, 11)

**Glossary.** One term, one meaning, with synonyms to avoid. (8)

**Contradiction.** Two requirements that can't both be true. (8)

**Swimlane diagram (process model).** A process drawn with a lane per role or system. (9)

**Handoff / rework loop.** A flow that crosses lanes / a flow that goes backwards. (9)

**As-is / to-be.** The process today / the process after the change. (9)

**Decision table.** Business rules as rows of conditions and actions, checked for gaps and overlaps. (9)

**Hit policy.** How a decision table handles several matching rules: unique, first or any. (9, 21)

**Gap / overlap (decision table).** A combination no rule covers / a combination two rules cover with different outcomes. (9)

**Pairwise testing.** A test set that covers every pair of condition values at least once. (21)

**State model.** The states something can be in and the transitions between them. (9)

**Data dictionary.** Definitions, source of truth, owner, sensitivity and retention for important data. (9)

**Use case.** How an actor uses the system to reach a goal, with main, alternate and exception flows. (9)

**Context diagram.** What's inside your scope and what you exchange with the outside. (9)

## Specs, governance and change

**PRD / BRD / FRS.** Product requirements document; business requirements document; functional requirements specification. (10)

**Non-goals.** What a spec explicitly does not cover. (10)

**Review board.** A review of a spec through the lenses of different roles. (10, 21)

**Baseline.** An agreed snapshot of requirements; later changes go through change control. (10)

**Change request.** A proposed change with its reason, impact, cost and decision. (10)

**Impact analysis.** Following links from a changed item to everything it affects. (10, 14)

**Decision record.** A short note of a significant decision: context, options, decision, consequences, revisit date. (14)

**Traceability.** The ability to follow need → requirement → story → test → release → evidence, forwards and backwards. (14)

**SOX ITGC.** IT general controls tested under Sarbanes-Oxley: typically access management and change management. (14)

**ISO 27001.** An information security management standard with controls for access, change, logging and more. (14)

**GDPR.** EU data protection regulation; relevant principles include lawful basis, minimisation and retention. (14)

**Data minimisation.** Collecting and keeping only the personal data you need, for as long as you need it. (4, 14)

## Delivery, forecasting and release

**Backlog.** A set of options, ordered by current best judgement of value. (11)

**Vertical slice.** A small piece of work that delivers something end to end. (11)

**Spike.** A time-boxed investigation to reduce uncertainty before estimating. (11)

**CD3.** Cost of delay divided by duration; do the highest first. (11)

**WSJF.** Weighted Shortest Job First: (business value + time criticality + risk reduction) ÷ job size. (11)

**RICE.** Reach × Impact × Confidence ÷ Effort. (11)

**Sensitivity analysis.** How much an input must change before the decision or ranking changes. (6, 11)

**HiPPO.** The highest-paid person's opinion, overriding evidence. (11)

**Estimate / forecast / commitment.** A guess about size; a probabilistic statement about timing; a promise to someone. (12)

**Throughput.** Items finished per period. (12)

**Monte Carlo simulation.** Replaying past throughput thousands of times to get a range of completion dates. (12)

**Percentile date (50 / 85 / 95%).** The date by which that share of simulated futures finished. (12)

**Scope creep.** Growth in remaining work while you deliver it. (12)

**Work in progress (WIP).** How many items are being worked on at once. (12)

**RAID log.** Risks, assumptions, issues and dependencies, with owners. (12)

**Now / Next / Later.** A roadmap format by horizon rather than by date. (12)

**UAT.** User acceptance testing: users confirm the change works for their needs. (13)

**Severity / priority.** How bad a defect's effect is / how soon it must be fixed. (13)

**Root cause (defect).** Requirement, design, code, environment or data. (13)

**Operational readiness.** Whether the organisation can run the change: support, runbooks, monitoring, comms, rollback. (13)

**Change advisory board (CAB).** A group that reviews production changes for risk. (13)

**Standard / normal / emergency change.** Pre-approved low-risk change; change needing review; expedited fix. (13)

**Change failure rate.** The share of changes that cause an incident or rollback. (13)

**Feature flag.** A switch that turns a deployed feature on or off for chosen groups. (13)

**Rollback criteria.** Measurable conditions, agreed in advance, for reversing a release. (13)

## Learning

**Check date.** When a bet's outcome will be measured. (15)

**Success / partial / failed / inconclusive.** How a bet's result compares with its prediction. (15)

**Attribution.** Whether your change, rather than something else, caused the outcome. (15)

**Calibration.** How well stated confidence matches actual success rates. (15)

**Brier score.** Average of (confidence − outcome)²: 0 is perfect, 0.25 is always saying 50%. (15)

**Feature lifecycle.** Alpha, beta, generally available, deprecated, sunset. (15)

## Goldthread terms

**Workspace.** One product, platform or programme: personal or shared with a team. (25)

**Graph.** All items in a workspace and the links between them. (17)

**Capture.** Quick entry of a signal, request, interaction, decision, risk or bet from anywhere (key **C**). (17)

**Daily brief / Needs you.** What the graph noticed that needs attention today. (17)

**Meeting prep.** A stakeholder briefing generated from everything open between you. (19)

**Alignment check.** People with a stake in an item who aren't involved or are resistant. (19)

**Personal access token.** A key that lets a tool act as you in one workspace, read-only or read & write. (26)

**MCP (Model Context Protocol).** An open standard that lets AI assistants use tools such as Goldthread. (26)
