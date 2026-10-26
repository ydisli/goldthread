---
id: forecasting
title: Planning and forecasting honestly
part: craft
minutes: 18
summary: Estimates, forecasts and commitments; forecasting from throughput with Monte Carlo; roadmaps with ranges; RAID logs; and why plans slip.
tools: [pulse, roadmap, raid, commitments, capacity]
---

"When will it be done?" is the question stakeholders ask most and the one teams answer worst. The usual answer is a single date produced by adding up estimates, padded a little, and delivered with more confidence than anyone feels. It's then missed, and trust erodes a little more.

There's a better way, and it doesn't require more estimation. It requires counting what the team actually finishes and being honest about uncertainty.

## Estimates, forecasts and commitments

Three different things often get the same word:

- An **estimate** is a guess about effort or size: "this story is about 3 points" or "about four days".
- A **forecast** is a probabilistic statement about when something will be done: "85% likely by 12 December".
- A **commitment** is a promise to someone: "the January cohort will have access on day one."

The common failure is turning an estimate directly into a commitment, skipping the forecast. A commitment should only be made when a forecast supports it with high confidence, and it should be tracked against the forecast continuously (Chapter 4).

## Forecasting from throughput

The simplest honest forecast uses **throughput**: how many items the team actually finishes per week. Not points, not hours: completed items.

Why items rather than estimates? Because estimates are consistently optimistic in ways that are hard to correct, while throughput already includes everything that really happens: interruptions, sick days, production incidents, meetings, and the story that turned out three times bigger. If the team has finished between 3 and 9 items a week for the last twelve weeks, that range is the best evidence you have about the next twelve.

This works best when items are roughly similar in size, which is another reason to slice stories thin (Chapter 11). It doesn't require them to be identical; the variation is part of the data.

### Monte Carlo, simply

Suppose JML has 34 items remaining, and the team's weekly throughput over the last 12 weeks was: 5, 3, 7, 4, 6, 2, 5, 8, 4, 6, 5, 3.

A **Monte Carlo simulation** asks: if the coming weeks look like randomly chosen past weeks, how long does it take to finish 34 items? It runs that "random future" thousands of times:

- Run 1: pick a random past week (6), then another (3), then another (5)… until the total reaches 34. That took 7 weeks.
- Run 2: 4, 8, 2, 5, 6, 4, 3, 5. That took 8 weeks.
- …repeat 10,000 times.

The result is a distribution of completion dates. You then read off percentiles:

- **50%** of runs finished by week 7: a coin flip. Never commit to this.
- **85%** of runs finished by week 9: a reasonable date to plan around.
- **95%** of runs finished by week 10: a date for promises with serious consequences.

That's it. No formulas to memorise. The power is that it turns "when will it be done?" into "how confident do you need to be?", which is a much better conversation.

> [!example] At Ashgrove
> Daniel asks if JML will be done by the January start date. Alex's forecast shows the remaining JML scope finishing by **15 December at 50%** and **9 January at 85%**, but the January cohort needs accounts created three business days before 6 January, so by 1 January. The chance of making that from JML alone is low. That's why Alex offered batch provisioning as a fallback (Chapter 4), and why the conversation was calm rather than defensive: the numbers did the talking.

### Remaining scope isn't fixed

Forecasts slip for a predictable reason: **scope grows while you work.** Stories get split, edge cases get discovered, change requests land. If the backlog for JML grows by 15% over the project, a forecast that assumed fixed scope will be wrong.

Track **scope creep** (how much the remaining work has grown, and how fast) and include expected growth in the forecast. If your team historically discovers one new item for every three finished, the 34 remaining items are really about 45.

### Too much at once

Another quiet cause of slow delivery is **too much work in progress**. When a team works on eight things at once, each takes longer than if they'd done fewer at a time, because of context switching and waiting. If your forecast keeps slipping and the team is busy, look at how many items are in progress simultaneously. Reducing work in progress often speeds delivery more than adding people.

## Roadmaps with ranges

A roadmap communicates direction and sequence. It's not a delivery schedule, and treating it as one is how roadmaps become broken promises.

A format that works well, especially for internal products:

- **Now:** what's in delivery, with forecast ranges. *SSPR: rolling out, completion 85% by 20 Nov. JML: in delivery, 85% by 9 Jan.*
- **Next:** what's committed to start soon, with rough ordering, no firm dates. *Access request portal; access reviews (before the audit window).*
- **Later:** what you intend to explore, unordered. *Zero-touch laptops; answer-first search.*

Show each item as an **outcome** where possible ("New hires productive on day one: JML") rather than just a feature name, so readers understand why it's there.

> [!tip] Dates as ranges, always
> Write "late November to mid-December" rather than "30 November". Ranges communicate uncertainty honestly. If a stakeholder needs a single date for their own plan, give them the 85% date and tell them that's what it is.

## Dependencies and RAID

Most IT work depends on other teams, vendors, environments and decisions. Dependencies are where plans quietly break. A **RAID log** keeps four kinds of item visible:

- **Risks:** things that might happen and would hurt. Rate probability and impact; name an owner and a response (avoid, reduce, transfer, accept). *The Workday test environment doesn't exist, so integration changes are tested on real hires: probability high, impact high.*
- **Assumptions:** things you're treating as true without proof. *HR enters hires at least five days before start.* Each needs a way to check it.
- **Issues:** risks that have happened. They need action, not monitoring. *The CRM connector rate-limits bulk provisioning.*
- **Dependencies:** things you need from others, with who, what and by when. *Identity platform licence upgrade from the vendor by 15 November.*

Review the RAID log weekly with the team, and bring the top few risks to stakeholders in your updates. A risk discussed early is a plan; a risk discovered late is an excuse.

## Capacity and the unplanned

In IT, much of a team's time goes to work that isn't on any roadmap: incidents, urgent access fixes, audit evidence requests, vendor upgrades. If 40% of the team's time is unplanned and your plan assumes 10%, your roadmap is fiction.

Measure it. Look back over a few months at how the team's time actually split between planned features, technical debt, maintenance and unplanned work. Then plan with those numbers, not the ones you wish were true. If unplanned work is too high, that's a problem worth solving in its own right, often with technical debt work that looks unglamorous on a roadmap.

Throughput-based forecasting has a quiet advantage here: because it's based on what the team actually finished, it already includes the unplanned work. Estimate-based plans don't.

## Making and keeping commitments

Put it together and you get a few rules for commitments:

1. **Commit at a high percentile.** For external or high-stakes promises, use the 85% or 95% forecast date, not the 50%.
2. **Commit to outcomes and ranges where you can.** "Day-one access for January starters, via batch provisioning if JML isn't ready" is more robust than "JML by 1 January".
3. **Re-forecast weekly** and compare each commitment with the latest forecast. When the probability drops below your threshold, renegotiate.
4. **Never commit for the team without the team.** A date the people doing the work didn't contribute to is a hope, not a commitment.

## Common traps

> [!trap] Planning to 100% capacity
> A plan that uses every hour of the team's time will slip the first time anything unexpected happens, which in IT is weekly. Leave room.

> [!trap] Single-point dates
> "It'll be done on the 30th" hides all uncertainty and guarantees surprise. Give ranges and percentiles.

> [!trap] Velocity as productivity
> Story points per sprint are a planning tool for the team, not a performance measure. Use them to compare teams or reward people and they'll inflate, and stop being useful for planning.

> [!trap] Adding people late
> Adding people to a late project usually makes it later in the short term, because new people need onboarding and coordination grows. Reduce scope or move dates first.

> [!exercise] Forecast your current work
> Count how many items your team finished each week for the last 8–12 weeks. Count the items remaining in your current initiative. Using the Monte Carlo idea (even approximately, by picking random past weeks a dozen times by hand) estimate the 50% and 85% completion weeks. Compare with the date you've been telling people. If they differ, decide what to say and to whom this week.

> [!try]
> [Forecast](tool:pulse) runs a Monte Carlo simulation from your team's real throughput (finished stories with done dates), shows 50/85/95% dates, tracks scope creep and flags too much work in progress. [Roadmap](tool:roadmap) shows Now / Next / Later with forecast ranges. [RAID log](tool:raid) keeps risks, assumptions, issues and dependencies with owners and a risk matrix. [Promises](tool:commitments) checks each promise against the forecast, and [Capacity](tool:capacity) compares planned and actual allocation. If your backlog lives in Jira or Azure DevOps, import it with resolved dates and the forecast uses your real history.

## Check yourself

```quiz
Q: Your Monte Carlo forecast says 50% by 28 Nov, 85% by 12 Dec, 95% by 19 Dec. A VP needs a date for a board commitment. Which do you give?
- 28 Nov, because it's the most likely date
- * 12 Dec or 19 Dec, explaining the confidence level, because a board commitment needs high confidence
- The average of the three
- Refuse to give a date
Why: 50% is a coin flip. High-stakes commitments should use a high percentile, stated as such, so the VP understands the risk they're taking.
```

```quiz
Q: Why forecast from throughput (items finished per week) rather than summed estimates?
- Estimates are always wrong by exactly 50%
- * Throughput already reflects everything that really happens, including interruptions, incidents and stories that grew
- Throughput doesn't need any data
- Because story points are banned
Why: Historical throughput is evidence about the team's real delivery rate, with all the messiness included. Summed estimates reflect hopes about ideal conditions.
```

```quiz
Q: The forecast slips every week even though the team is finishing work at its normal rate. What's the most likely cause?
- The Monte Carlo simulation is broken
- * Scope is growing: new items are being added as fast as old ones finish
- The team is lazy
- The percentiles are wrong
Why: If throughput is steady but the finish date moves out, remaining scope is growing. Track scope creep and include it in the forecast, or control it.
```
