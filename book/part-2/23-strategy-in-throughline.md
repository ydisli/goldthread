---
id: strategy-in-throughline
title: Strategy and learning in Throughline
part: tool
minutes: 11
summary: The vision board and OKRs, the metric tree and tracking plan, business cases with sensitivity, alternatives, capacity and tech debt, the bet ledger and the feature catalog.
tools: [vision, metrics, business-cases, market, capacity, ledger, features]
---

The Strategy and Learning areas bracket everything else. Strategy says where you're going and why; Learning says whether you got there. Between them, they turn Chapters 6 and 15 into something you look at monthly rather than once a year.

## Vision & OKRs

**Strategy → Vision & OKRs** holds two things.

The **vision board**: the vision statement, who it's for, their needs, what the product is and the business goals, the elements from [Chapter 6](guide:strategy). Keep it to one screen. Revisit it when your pillars change, not every week.

**Objectives and key results** for the current period. Each objective has an owner, a pillar and a status (on track, at risk, off track). Each key result has a **baseline, target and current value**, optionally linked to a metric in the metric tree so the current value stays in sync. Bets link to objectives, so each objective shows the bets working towards it.

Give each key result a **confidence** (how likely you think it is to be hit) and update it as the quarter goes. Key results whose confidence drops below 40% show up on Home, so you see them before the quarterly review, not at it.

## Metric tree

**Strategy → Metric tree** shows how your metrics connect: the **north star** at the top, **input** metrics that drive it, **output** metrics beneath those, and **guardrail** and **health** metrics alongside. Each metric has a precise **definition**, a current value, a target and the bets trying to move it.

The **Tracking plan** tab lists the measurement each bet needs before it can be checked: the events or data that must exist, and whether they do. A bet whose metric isn't being collected can't be measured; finding that out before launch is the point.

## Business cases

**Strategy → Business cases** calculates the numbers from [Chapter 6](guide:strategy): one-time cost, annual cost, annual benefit with a **ramp-up** per year, discount rate and horizon. Throughline computes **NPV, ROI, payback period, IRR** and **cost of delay per week**, and ranks your business cases by value.

The **assumptions** field is where you write out each benefit line, so anyone can challenge it. The sensitivity view shows which input the answer depends on most: halve the benefit, double the cost, and see whether the decision survives.

> [!example] At Northwind
> The JML case ($220k one-time, $30k a year to run, $640k a year of benefit at a 35/80/100% ramp, 8% discount rate) pays back within the second year and has a cost of delay of about $12k a week. The SSPR case is smaller but approved; the access reviews case is still a draft.

## Alternatives

**Strategy → Alternatives** compares options **capability by capability**: competitors for a commercial product, or, for internal IT, vendors and build/buy/configure options, as in [Chapter 6](guide:strategy). Score your own product (or current platform) and each alternative on each capability, weighted by importance, and record strengths, weaknesses and positioning. For commercial products, it also tracks why deals are won or lost.

## Capacity

**Strategy → Capacity** compares each team's **planned** allocation (features, technical debt, maintenance) with what they **actually** spent their time on over the last twelve weeks, from finished work. A team planned at 60% features that actually spends 35% on them is a roadmap risk you can now see.

The **tech-debt register** describes each piece of debt in business terms: its impact, the "interest" it charges (slower delivery, incidents, risk) and the cost to fix. That's the conversation from [Chapter 6](guide:strategy): debt as a business decision, not a developer preference.

## Bet ledger

**Learning → Bet ledger** is the learning ledger from [Chapter 15](guide:outcomes):

- **Awaiting measurement:** shipped bets whose check date has arrived or is coming up, with a button to record the result. Late ones are flagged.
- **Bets without a check date** that should have one.
- **Results** for measured bets: success, partial, failed or inconclusive, with the actual result and the learning.
- **Calibration:** your success rate, **calibration bias** (how over- or underconfident your stated confidence has been) and **Brier score**, with a chart comparing stated confidence with actual results.

The ledger gets more valuable every quarter you use it. After a year, it tells you how much to trust a 70%.

## Feature catalog

**Learning → Feature catalog** lists what the product does today: each feature's **lifecycle** (alpha, beta, generally available, deprecated, sunset), **adoption** and its **trend** (rising, flat, falling), **maintenance cost** and any retirement plan. Sort by falling adoption and high cost to find retirement candidates, then retire them deliberately, as [Chapter 15](guide:outcomes) describes.

> [!try]
> In the sample, open the **Bet ledger** and look at the calibration chart: the chatbot bet at 85% confidence that failed is one of the points. Then open **Business cases**, open the JML case and change the annual benefit to see how payback moves.

## Check yourself

```quiz
Q: What is the Tracking plan in the metric tree for?
- Tracking the team's tasks
- * Listing the data each bet needs to be measured, so you find missing measurement before launch rather than at the check date
- Tracking stakeholder engagement
- Scheduling OKR reviews
Why: A bet can't be checked if its metric isn't collected. The tracking plan surfaces that gap while there's still time to add the measurement.
```

```quiz
Q: The capacity view shows a team planned at 60% features actually spent 35% on features. What's the most useful response?
- Ask the team to work harder on features
- Ignore it; plans are always optimistic
- * Find out what consumed the rest (incidents, debt, unplanned work), adjust the roadmap to the real capacity, and decide whether to invest in reducing the unplanned work
- Move the team to a different product
Why: The roadmap should be built on real capacity. A large gap often points to technical debt or operational load that deserves its own investment.
```
