---
id: prioritisation
title: Backlogs and prioritisation
part: craft
minutes: 20
summary: The backlog as a set of options, refinement that works, slicing stories thin, cost of delay, RICE and WSJF, sensitivity, and saying no fairly.
tools: [prioritize, backlog, story-map, roadmap]
---

Prioritisation is the part of the Product Owner role everyone recognises and nobody finds easy. There is always more worth doing than the team can do. Every item has a supporter. Every "not now" disappoints someone. And the methods people reach for (scoring frameworks, voting, MoSCoW) often produce false precision rather than better decisions.

This chapter is about keeping a backlog that helps you decide, preparing work so it's ready to build, slicing it thin, and choosing the order in a way you can explain and defend.

## The backlog is a set of options

A backlog is not a to-do list and not a promise. It's a set of **options**: things you might do, ordered by your current best judgement of what's most valuable next. Treat it that way and several things follow:

- **The top is detailed; the bottom is vague.** Items about to be built need acceptance criteria and estimates. Items months away need a title and a reason. Detailing distant items is waste, because they'll change.
- **It should be short enough to read.** If your backlog has 600 items, nobody can reason about it. Most healthy product backlogs have a few dozen items in "now" and "next", plus a separate pile of ideas.
- **Deleting is healthy.** An item nobody has touched in six months is telling you something. Archive it. If it matters, someone will bring it back, with fresher context.

> [!tip] Separate ideas from the backlog
> Keep an ideas list (or let signals and opportunities do that job) and promote items into the backlog only when they're credible candidates for the next few months. The backlog stays small and meaningful; nothing is lost.

## Refinement

Refinement (sometimes called grooming) is the regular work of getting items ready to build. It's where the BA craft (elicitation, examples, acceptance criteria) meets the team.

A sustainable pattern:

- **Weekly, about an hour,** with the PO or BA, a couple of developers and a tester. Not the whole team every time.
- **Look two sprints ahead,** not ten.
- **Prepare beforehand.** Bring items with the problem, a draft of the acceptance criteria and open questions. Refinement is for testing understanding, not starting it.
- **End each item in a known state:** ready, needs more work (with an owner for the questions), split into smaller items, or dropped.

### Definitions of Ready and Done

Two lightweight checklists keep quality consistent.

A **Definition of Ready** says when an item can enter a sprint. Keep it short:

- The problem and the user are clear.
- Acceptance criteria exist, including unhappy paths.
- Dependencies are known and not blocking.
- The team has estimated it and it fits in a sprint.

A **Definition of Done** says when an item is finished:

- Acceptance criteria pass.
- Tests are automated where practical.
- It's deployed to an environment where it can be demonstrated.
- Documentation, runbooks and monitoring are updated if needed.
- The PO has accepted it.

Don't let either turn into bureaucracy. The point is to stop the same avoidable problems recurring, not to fill in forms.

## Slicing stories thin

Big stories are risky: they hide uncertainty, take longer than expected, and deliver nothing until they're entirely done. The fix is to **slice vertically**: each slice delivers something that works end to end, however small, rather than slicing by layer ("build the database", "build the API", "build the screen"), which delivers nothing usable until all layers are done.

Useful slicing patterns:

| Pattern | Example from JML |
|---|---|
| **Workflow steps** | Joiners first; movers next; leavers after |
| **Business rule variations** | Birthright access first; job-code packages next; manager-requested extras last |
| **Data variations** | Employees first; contractors (not in Workday yet) later |
| **Happy path first** | Create accounts for clean HR records; handle missing job codes in the next slice |
| **Simple interface first** | Notify managers by email; Teams card later |
| **Defer performance** | Correct provisioning first; optimise to the 15-minute target next |
| **Manual first** | Flag rehires for manual matching; automate matching later |
| **Spike** | Time-boxed investigation of the CRM connector before estimating the real work |

> [!example] At Ashgrove
> "Automated JML" started as one epic estimated at "about a quarter". Sliced by workflow and rule variation, the first releasable slice was: *create accounts and birthright groups for employee joiners three days before start, from clean HR records.* Small enough to ship in three weeks, valuable on its own (the service desk stops creating accounts by hand) and a solid foundation for the rest. Movers, leavers, packages and contractors followed as their own slices, each releasable.

A good slice is still a **story**: it has a user, a benefit and acceptance criteria. "Set up the Workday connector" isn't a slice; it's a task.

## How to decide the order

Prioritisation methods all try to answer one question: **what gives us the most value for the effort, soonest?** The methods differ in how they estimate value.

### Cost of delay

The most useful single idea in prioritisation is **cost of delay**: how much value you lose for each week something isn't done. Chapter 6 introduced it for business cases. For prioritisation, combine it with duration:

**Do first the items with the highest cost of delay divided by duration.**

This is sometimes called **CD3** (cost of delay divided by duration). The logic is simple: a short item with a high cost of delay should jump the queue, because doing it first costs the other items little delay while capturing a lot of value early.

> [!example] At Ashgrove
> SSPR has a cost of delay of about $4k a week and takes about 3 weeks. JML costs about $12k a week of delay and takes about 10 weeks. Access reviews cost about $5k a week, rising sharply as the audit date approaches, and take about 6 weeks.
>
> CD3: SSPR ≈ 1.3, JML ≈ 1.2, reviews ≈ 0.8 now (but higher in a month). The numbers say SSPR and JML are close, and reviews can wait a little but not long. That matches intuition, but now Alex can explain it.

### WSJF

**Weighted Shortest Job First** is a structured version of cost of delay, popular in larger organisations. Cost of delay is estimated as the sum of three relative scores:

- **Business value:** how much users or the business benefit.
- **Time criticality:** how quickly value decays if you wait (deadlines, audit dates, contract renewals).
- **Risk reduction / opportunity enablement:** does it reduce risk or unlock other work?

Then divide by **job size** (relative effort). Score each on a relative scale (a Fibonacci-like 1, 2, 3, 5, 8, 13, 20), comparing items against each other rather than in absolute terms.

WSJF is good at making time criticality and risk reduction explicit. These are exactly the factors that matter in IT (audit deadlines, end-of-support dates, security risk) and get forgotten in pure "value vs effort" thinking.

### RICE

**RICE** comes from consumer software and estimates value from usage:

- **Reach:** how many people are affected per period.
- **Impact:** how much each person is affected (a small scale, e.g. 0.25 / 0.5 / 1 / 2 / 3).
- **Confidence:** how sure you are of these estimates (as a percentage).
- **Effort:** person-weeks or months.

Score = Reach × Impact × Confidence ÷ Effort.

RICE is good when reach varies a lot between items, which in internal IT it often does: something affecting 1,900 employees versus something affecting 40 approvers. The confidence factor is useful too: it rewards evidence and punishes optimism.

### Methods to use carefully

**MoSCoW** (Must, Should, Could, Won't) is useful for scoping a single release ("what must be in the January release?") but poor for ordering a backlog. In practice everything drifts into Must. If you use it, cap Musts at around 60% of capacity.

**Value vs effort 2×2** is a good conversation starter in a workshop, and too coarse for ordering more than a handful of items.

**Voting** (dot votes, stakeholder points) tells you about preferences and politics, which is useful information. But it's not a prioritisation method; it's an input.

## Sensitivity: how solid is the order?

Every scoring method produces numbers that look more precise than the estimates behind them. A score of 14.2 versus 13.8 means nothing. Before trusting an order, ask:

- **Which items are close?** If two items' scores are within the uncertainty of the estimates, the method can't separate them. Use judgement, and say so.
- **Which input would change the order?** If doubling the reach estimate for one item moves it from fifth to first, that estimate deserves more evidence.
- **Is the top stable?** If the top three stay the top three under reasonable changes to the inputs, you can be confident. If they shuffle with every tweak, you need better information, not a better formula.

> [!tip] Show the reasoning, not the score
> When you explain priorities to stakeholders, never lead with the score. Lead with the drivers: "SSPR goes first because it's short and affects everyone; reviews move up next month because the audit date is fixed." Scores invite haggling over numbers; reasons invite understanding.

## Saying no fairly

Prioritisation means most requests are not done now. You'll keep stakeholders' trust if the process is visible and fair:

- **Use the same method for everyone.** If the VP's request skips the queue, the queue stops meaning anything.
- **Make the inputs visible.** Let people see the reach, value and effort estimates, and challenge them. Challenges to estimates are welcome; they often improve them.
- **Give "not now" a reason and a review point.** "It ranks below these three because its reach is small; we'll review in the next quarterly planning."
- **Allow an explicit override,** owned by the accountable person, when strategy or politics demands it. An honest "the CIO has decided this goes first" is better than fudging the scores.

## Keeping the backlog healthy

Backlogs decay. Watch for:

- **Duplicates:** the same need written three times by three people.
- **Stale items:** untouched for months.
- **Orphans:** items with no link to a requirement, bet or objective. Why do they exist?
- **Missing acceptance criteria** on items near the top.
- **Oversized items** near the top: split them before they enter a sprint.
- **Dependency tangles:** items that depend on each other in cycles.

A monthly hygiene pass of thirty minutes keeps the backlog useful.

## Common traps

> [!trap] Precision theatre
> Spending hours debating whether an item's business value is 8 or 13. The difference rarely changes the order. Estimate quickly, check sensitivity, move on.

> [!trap] The HiPPO
> The highest-paid person's opinion overrides everything, silently. If an executive's priority must win, make it an explicit, recorded decision. Don't distort the scores to justify it.

> [!trap] Everything is urgent
> If every item is marked high time criticality, none is. Ask: "What actually happens if this is four weeks late?" Only real consequences count.

> [!trap] Prioritising features over learning
> Sometimes the most valuable next item is an experiment that tells you whether the big item is worth doing. Learning has value; give it a place in the order.

> [!exercise] Re-rank your top ten
> Take the top ten items in your backlog. For each, estimate cost of delay per week (even roughly) and duration. Calculate CD3 and compare with your current order. Where they differ, decide which is right and why. Then pick the two items whose order you're least sure about, and ask what one piece of evidence would settle it.

> [!try]
> [Prioritize](tool:prioritize) ranks bets by RICE or WSJF, shows which items are too close to separate, and runs sensitivity checks: what change to which input would alter the order. [Backlog health](tool:backlog) finds duplicates, stale items, orphans, missing acceptance criteria, oversized stories and dependency cycles automatically, and imports your backlog from Jira or Azure DevOps. The [Story map](tool:story-map) lays out the user journey and lets you slice it into releases.

## Check yourself

```quiz
Q: Item A has a cost of delay of $6k/week and takes 2 weeks. Item B has $10k/week and takes 10 weeks. Using CD3, which goes first?
- * A, because $6k ÷ 2 = 3 is higher than $10k ÷ 10 = 1
- B, because it has the higher cost of delay
- They're equal
- It depends on stakeholder votes
Why: CD3 favours short items with high cost of delay. Doing A first delays B by two weeks (about $20k of lost value); doing B first would delay A by ten weeks (about $60k).
```

```quiz
Q: Your backlog has 640 items. What's the most useful first step?
- Score all 640 with WSJF
- Ask the team to estimate everything
- * Archive items untouched for months and move speculative ideas out, so the backlog holds credible near-term options
- Split it into four backlogs of 160
Why: A backlog nobody can read can't guide decisions. Shrinking it to credible options is the prerequisite for any prioritisation method to help.
```

```quiz
Q: Two items score 14.2 and 13.8 on RICE. What should you conclude?
- The first item is clearly more valuable
- * The method can't separate them given the uncertainty in the estimates, so use judgement or get better evidence
- RICE is the wrong method
- Re-score until the gap is bigger
Why: Scores carry the uncertainty of their inputs. Close scores mean "too close to call"; treating the difference as meaningful is false precision.
```
