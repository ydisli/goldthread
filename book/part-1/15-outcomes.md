---
id: outcomes
title: "Did it work? Learning from outcomes"
part: craft
minutes: 15
summary: Measuring after release, judging results honestly, recording what you learned, calibrating your confidence, and retiring what no longer earns its keep.
tools: [ledger, features, metrics, bets]
---

Most teams celebrate the release and move on. The release was the goal; the next item is waiting. Months later, nobody can say whether the thing they shipped changed anything. The roadmap keeps filling with new bets placed with the same confidence as the last ones, whether or not the last ones paid off.

This is the link in the throughline that breaks most often, and it's the one that teaches the most. This chapter is about closing the loop: going back, measuring, learning, and letting what you learn change how you bet next time.

## Plan the measurement before you ship

You can't measure an outcome you didn't define, against a baseline you didn't record. By the time something ships, you should already know:

- **The metric:** the outcome measure from the bet (Chapter 5). *Password and lockout tickets per month.*
- **The baseline:** its value before the change, over a representative period. *1,450 a month, averaged over the last six months.*
- **The target:** what success looks like. *300 a month.*
- **The check date:** when you'll look. Long enough for the change to take effect and adoption to settle; short enough that the learning is still useful. *60 days after the final wave.*
- **Leading indicators** that tell you early whether it's heading the right way. *Self-service reset completions, MFA registration rate.*

Put the check date in the calendar, owned by someone. Without a date, measurement doesn't happen.

## Judging the result honestly

When the check date arrives, compare the outcome with the prediction and classify it:

- **Success:** the outcome moved as predicted, or better.
- **Partial:** it moved, but less than predicted, or only for some groups.
- **Failed:** it didn't move, or moved the wrong way.
- **Inconclusive:** you can't tell, because the data is missing, or too much else changed at the same time.

Then write down **what actually happened** in numbers, and **what you learned** in a sentence or two.

> [!example] At Northwind
> Three of ServiceHub's past bets, recorded honestly:
>
> **Service catalog redesign** (confidence 70%). Predicted: misrouted tickets −25%. Actual: −31%. **Success.** Learning: task-based wording ("I need to…") worked better than system names.
>
> **Always-on VPN** (confidence 80%). Predicted: zero VPN connection tickets. Actual: −65%. **Partial.** Learning: the remaining tickets are home-router problems, which VPN can't fix. The prediction was too absolute.
>
> **IT chatbot v1** (confidence 85%). Predicted: −30% tickets. Actual: 4% deflection, and satisfaction dropped. **Failed.** Learning: people came to the portal to get something done, not to have a conversation; answers needed to appear before the ticket form, not in a chat window. That learning became the "answer-first search" bet.

### Attribution: did *we* cause it?

Outcomes move for many reasons. Before claiming success, ask:

- **Did something else change at the same time?** A reorganisation, a new policy, a seasonal pattern (password tickets spike after holidays and password expiry cycles).
- **Is there a comparison group?** If the change rolled out in waves, compare groups that had it with groups that didn't yet. Wave rollouts are a free experiment.
- **Does the mechanism show up?** If password tickets dropped, did self-service resets actually rise by a similar amount? If tickets dropped but self-service usage didn't rise, something else is going on.

You don't need academic rigour, but you do need to be honest about doubt. "Tickets fell 60%, and about 80% of that is explained by self-service resets; the rest probably reflects the SSO rollout" is a credible claim.

> [!trap] Moving the goalposts
> When the result disappoints, it's tempting to find a different metric that looks better: "tickets didn't drop much, but portal visits tripled!" Record the original prediction and its result first. Then, separately, note anything else you learned.

## Calibration: how much to trust a 70%

Every bet has a confidence attached. Over time, you can check whether your confidence means anything. If you say 70% about ten bets, roughly seven should succeed. If only three do, you're **overconfident**. If all ten do, you're underconfident, and probably not taking enough risk.

This is **calibration**, and it's one of the most valuable things a product team can learn about itself. Most teams are overconfident, especially about their favourite ideas. Northwind bet on the chatbot at 85% and it failed. That's not a disaster on its own (85% means one in seven should fail) but if the team's 80%+ bets fail half the time, something is wrong with how they judge.

A simple score for calibration is the **Brier score**: for each bet, take (confidence − outcome)², where outcome is 1 for success and 0 for failure, and average them. 0 is perfect; 0.25 is what you'd get by always saying 50%. You don't need to compute it by hand; the point is the habit of comparing prediction with result.

What calibration buys you:

- **Better portfolio decisions.** If your team's 70% really means 70%, you can reason about risk across bets.
- **Humility in the right places.** A team that knows it's overconfident asks for more evidence before committing.
- **Credibility.** Stakeholders learn that your confidence statements are honest.

## The learning ledger

Keep every bet, its prediction, its confidence, its result and its learning in one place: a **ledger**. Over a year or two, the ledger becomes one of your team's most valuable assets:

- New team members read it to understand what's been tried.
- When an old idea resurfaces ("let's try a chatbot!"), you can see what happened last time and what would need to be different.
- Patterns appear: which kinds of bets succeed, which assumptions are usually wrong, which stakeholders' ideas tend to work.

**Failed bets are assets, not embarrassments**, as long as you learned something. The chatbot failure led directly to a better idea. Hiding failures wastes them.

## Retiring what doesn't earn its keep

Learning from outcomes also means looking at what already exists. Every feature, integration and script has a maintenance cost: it needs patching, supporting, testing on every release, explaining to new staff. Some of them no longer earn that cost.

For each significant capability, it's worth knowing:

- **Adoption:** how many people use it, and is that rising or falling?
- **Maintenance cost:** how much effort does it take to keep running?
- **Strategic fit:** does it still serve a pillar?

Things with low adoption, high cost and poor fit are candidates for **retirement**. In IT, retirement is often more valuable than new features: the legacy LDAP sync scripts, the old chatbot, the duplicate request form nobody maintains. Retiring them reduces risk, frees capacity and simplifies the experience.

Retire deliberately: decide, communicate, provide alternatives, set a date, then remove it. Half-retired features that linger are the worst of both worlds.

> [!example] At Northwind
> After the chatbot failed, Tomás wanted it removed immediately; Alex wanted to keep it until something replaced it. The resolution, recorded as a decision: retire the chatbot once answer-first search ships, moving its content into knowledge articles. A dated plan, not a debate that drags on.

## Learning beyond the metric

Not all learning is in numbers. After a significant release, hold a short **outcome review** (distinct from a sprint retrospective, which looks at how the team worked):

- What did we expect, and what happened?
- Which assumptions turned out wrong?
- What would we do differently in discovery, in the requirements, in the rollout?
- What should we tell other teams?

Write down the two or three most important answers and link them to the bet.

## Common traps

> [!trap] Never measuring
> The most common failure. Fix it with a check date on every bet, owned by a named person, in the calendar.

> [!trap] Blaming execution
> "It would have worked if we'd built it properly" is sometimes true, and often a way to avoid admitting the idea was wrong. Look at whether the mechanism (people using the feature) happened before blaming delivery.

> [!trap] Learning that changes nothing
> If the outcome review produces insights but your next discovery process is identical, you didn't learn. Change one practice per review.

> [!exercise] Audit your last three releases
> For each of your last three significant releases, try to answer: what was the predicted outcome and confidence? What actually happened, in numbers? What did you learn? If you can't answer, set a check date now, find the baseline, and measure. Then look at your current roadmap and add a check date to every bet that doesn't have one.

> [!try]
> The [Bet ledger](tool:ledger) shows every bet's prediction, confidence and result, what's awaiting measurement, and your team's calibration: success rate, bias and Brier score. The [Feature catalog](tool:features) tracks adoption, maintenance cost and lifecycle, including retirement plans. [Metric tree](tool:metrics) shows current values against baselines, and [Bets](tool:bets) holds the check date for each hypothesis.

## Check yourself

```quiz
Q: Your bet predicted password tickets would fall 80%. They fell 50%. How do you record it?
- Success, because tickets fell a lot
- * Partial: it moved, but less than predicted, with a note on why
- Failed, because the target was missed
- Inconclusive
Why: Partial captures that the mechanism worked but the size of the effect was overestimated. The "why" is the valuable learning, and it feeds your calibration.
```

```quiz
Q: Over two years, your team's bets made at 80% confidence succeeded 45% of the time. What does that tell you?
- The team is unlucky
- * The team is overconfident and should demand more evidence before committing at high confidence
- The bets were too ambitious
- Confidence numbers are meaningless
Why: Calibration compares stated confidence with actual results. A large gap means the team's confidence statements are biased, which is fixable once it's visible.
```

```quiz
Q: Tickets fell 40% after your release, but self-service usage barely changed. What should you suspect?
- * Something other than your change caused most of the drop
- Your change worked better than expected
- The self-service metric is broken
- Nothing; a drop is a drop
Why: If the mechanism (people using self-service) didn't happen, the outcome likely has another cause, such as seasonality, another release or a policy change.
```
