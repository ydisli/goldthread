---
id: discovery-in-goldthread
title: Discovery in Goldthread
part: tool
minutes: 12
summary: Capturing signals from anywhere, grouping them into themes, the opportunity tree with evidence strength, bets, the assumption map, the experiment lab, personas, journeys and research.
tools: [signals, opportunities, bets, assumptions, experiments, customers, research]
---

The Discovery area supports Chapters 2 and 5: getting from what people say and do to problems worth solving, and from beliefs to tested bets. Its central idea is that **evidence accumulates**. Every quote, ticket count and interview finding you capture adds weight to a problem, and Goldthread shows you how much weight each problem actually has.

## Signals: evidence from anywhere

A **signal** is one piece of evidence: a quote from an interview, a ticket, a survey comment, a data point, an observation. Each records:

- **what** was said or observed (the first line is the title; detail below),
- **where** it came from (support, interview, survey, sales call, analytics, observation…),
- **who** or which group: the person, account or segment,
- **kind**: something people **said**, or something they **did** (behaviour counts for more),
- optionally a value at stake and a link to the source.

You can capture signals from many places, so evidence doesn't get lost on the way:

- **In the app:** press **C** anywhere and choose *Signal*.
- **From the terminal:** `goldthread capture "Locked out again before my shift" --source support`.
- **From the browser:** highlight text on any page (a ticket, an email in webmail, a forum) and send it with the browser extension.
- **From your AI assistant:** "capture this as a signal" when Goldthread is connected over MCP (Chapter 26).
- **In bulk:** **Signals → Import** takes CSV from your service desk, survey tool or CRM.

### Unlinked and themes

New signals land in **Unlinked** until you connect them to an opportunity. For each one, Goldthread suggests existing opportunities that look similar. Link with a click, or create a new opportunity if nothing fits.

**Themes** groups signals by similarity, even before you've linked them, so patterns show up early: "twelve signals about lockouts before shift start" is a theme worth an opportunity.

> [!tip] Capture first, judge later
> Don't filter signals at capture time. A single comment looks trivial; the same comment from fifteen people over two months is a problem. Capture everything quickly and let the themes tell you what matters.

## Opportunities and evidence strength

**Discovery → Opportunities** is the opportunity tree from [Chapter 5](guide:discovery): outcomes at the top, the problems and needs beneath them (opportunities can nest), the bets that address them, and the experiments that test the bets.

Each opportunity shows an **evidence strength** score, computed from the signals linked to it (and to its children):

- **Volume:** how many signals.
- **Spread:** how many different people, accounts and segments. Twenty signals from one person are weaker than twenty from twenty.
- **Behaviour:** the share of signals that are observed behaviour rather than opinion.
- **Recency:** how much of the evidence is recent.

If one source dominates (say a single VP or a single site accounts for most of the signals), Goldthread warns you that the problem may be **one loud voice** rather than a broad pattern. That's the trap from [Chapter 5](guide:discovery), caught automatically.

Write each opportunity as a problem statement ([Chapter 2](guide:problems-first)): who, what gets in the way, the impact, the evidence.

## Bets

**Discovery → Bets** holds initiatives as falsifiable hypotheses. Each bet has:

- the **hypothesis** (we believe… for… will… measured by…),
- the **opportunities** it addresses and the **objective** it serves,
- a **metric**, **predicted change**, **confidence** and **check date**,
- status (idea → discovery → committed → in delivery → shipped → measured, or killed) and a now/next/later horizon,
- the inputs prioritisation needs (reach, impact, effort; business value, time criticality, risk reduction, job size),
- owner, team and dates.

A bet's page brings together its evidence, assumptions, experiments, specs, stories, forecast, promises that depend on it and an alignment check. When the check date arrives, the bet appears in the **Bet ledger** waiting for its result (Chapter 23).

## Assumptions

**Discovery → Assumptions** is the assumption map. Each assumption belongs to a bet and has a category (value, usability, feasibility, viability), an **importance** rating, an **evidence** rating, a status (untested, testing, validated, invalidated) and a test plan.

The map plots importance against evidence. **Top-left (important but unproven) is where your leaps of faith live.** Test those first.

> [!example] At Ashgrove
> The map for SSPR shows *Frontline staff can verify without a company phone* in the top-left: importance 5, evidence 1. *Office staff will register for MFA* has moved to the right after the Finance pilot (72% completion). That's exactly the picture from [Chapter 5](guide:discovery), drawn from the data.

## Experiments

**Discovery → Experiments** (the Experiment Lab) helps you design tests properly and read their results without a statistician:

- Choose a method (A/B test, prototype test, concierge, Wizard of Oz, fake door, survey or data analysis) and link the assumptions it tests. A pilot with one department is usually a prototype test or an A/B test against the rest.
- For comparative tests, enter the **baseline rate**, the **smallest effect worth detecting**, and the significance and power you want. The lab calculates the **sample size** you need. If your available population is smaller, you'll know before you start that the test can't answer the question.
- When results come in, enter the counts. The lab reports the effect, a confidence interval and whether it's statistically significant.
- Record the **decision**: persevere, pivot or kill, as you agreed before starting.

## Personas and journeys

**Discovery → Personas & journeys** holds evidence-backed **personas**: who they are, their goals, pains and jobs-to-be-done, linked to the signals that support them. Personas without evidence are guesses; the link keeps them honest.

**Journeys** map a persona's experience stage by stage: what they do, think and feel, where the pain is, and which opportunities each pain links to. Ashgrove's *First week of a new sales rep* journey is the problem statement from [Chapter 2](guide:problems-first), told as a story.

## Research

**Discovery → Research** keeps interview studies and other research: the objective, method, participants, discussion guide and findings. Link findings to signals and opportunities so the research keeps paying off after the readout.

> [!try]
> In the sample, open **Signals → Themes** and look at what has clustered. Then open the **Opportunities** tree and compare the evidence strength of *People get locked out and can't get back in without a ticket* with *Employees don't know what is happening with their request*. Finally open the **Experiments** lab and look at the Teams-vs-email A/B test result.

## Check yourself

```quiz
Q: An opportunity has 25 linked signals, but Goldthread warns that one source accounts for 70% of them. What does that suggest?
- The evidence is very strong
- * The problem may reflect one loud voice rather than a broad pattern, so look for evidence from other groups
- The signals should be deleted
- The opportunity should be split
Why: Evidence strength rewards spread across people and segments. Concentration in one source is a classic way to overestimate a problem.
```

```quiz
Q: The Experiment Lab says you need 400 participants per group, but only 150 managers exist. What should you do?
- Run the test anyway and see
- * Recognise the A/B test can't reliably answer the question; use a different method or test for a larger effect
- Lower the significance level until the sample fits
- Run it with 150 and extend until it's significant
Why: Knowing in advance that a test is underpowered saves you from inconclusive or misleading results. Choose a method that fits your population, such as a pilot, a prototype test or data analysis.
```
