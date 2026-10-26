---
id: strategy
title: Strategy people can use
part: craft
minutes: 18
summary: A vision people can repeat, outcomes that guide choices, metric trees that connect daily work to results, honest business cases, and build-versus-buy decisions.
tools: [vision, metrics, business-cases, market, capacity]
---

Strategy has a bad reputation among people who do delivery work, mostly because so much of it is unusable: a slide of values, a vision statement nobody remembers, a list of twenty "strategic priorities" that includes everything.

Usable strategy does one job: **it helps people make choices without asking you.** When a developer, a BA or a service desk lead faces a trade-off, the strategy should tell them which way to lean. If it can't, it isn't strategy, it's decoration.

As a PO you may not write the organisation's strategy, but you need one for your product, and you need to be able to connect your work to the organisation's.

## A vision people can repeat

A product vision describes the future you're working towards, in a sentence or two that people can remember and repeat. It should be:

- **Concrete enough to rule things out.** "Delight our users" rules out nothing.
- **About the people you serve,** not about your technology.
- **Ambitious but believable.** A destination for two or three years, not next quarter.

> [!example] At Northwind
> ServiceHub's vision: **"Every employee is productive from minute one, and never has to wait on IT."**
>
> It's repeatable. It rules things out: a beautiful new ticket form doesn't serve "never has to wait", but removing the need for the ticket does. And it points at measurable things: time to productive, waiting time, tickets that shouldn't exist.

A vision board fills in the rest: **who it's for** (all employees, with new hires, frontline staff and managers first), **what they need** (access on day one, fixing common problems without a ticket, knowing what's happening with a request), **what the product is** (identity lifecycle, password self-service, access requests, knowledge) and **what the organisation gets** (day-one productivity for 600 hires a year, 40% fewer tickets, a clean audit).

## Pillars: where you'll focus

Between the vision and the backlog, you need a small number of focus areas. Some teams call them pillars or themes. Three is usually right; five is the maximum before they stop guiding anything.

ServiceHub has three:

1. **Day-one ready:** new hires have laptop, accounts and access before they start.
2. **Self-service first:** employees fix common problems without an agent.
3. **Trusted access:** the right people have the right access, provably.

Every bet on the roadmap should sit under one pillar. If something doesn't fit any of them, that's a strong hint it shouldn't be on the roadmap, or that the pillars are wrong.

## Objectives and key results

OKRs translate pillars into time-boxed goals. An **objective** is a qualitative statement of what you want to achieve this period. **Key results** are the measurable evidence that you've achieved it.

The single most important rule: **key results are outcomes, not tasks.**

| Weak key result (output) | Strong key result (outcome) |
|---|---|
| Launch self-service password reset | Password reset tickets from 1,450 to 600 a month |
| Build the JML integration | Time to productive from 72 hours to 24 hours |
| Run access review campaigns in ServiceHub | 100% of quarterly access reviews completed on time |
| Deliver the leaver automation | Zero orphaned accounts at quarter end |

Strong key results have a **baseline**, a **target** and a **current value** you can check weekly. They leave the "how" open, which is the point: if SSPR doesn't move password tickets enough, the team is free to try something else.

> [!example] At Northwind
> **Objective:** New hires are productive on day one. (Pillar: Day-one ready; owner: Alex.)
> - Time to productive from 72h to 24h. *Currently 54h.*
> - 95% of hires have laptop and access on day one. *Currently 61%.*
>
> **Objective:** Pass the SOX ITGC audit without findings. (Pillar: Trusted access; owner: Dana.)
> - 100% of quarterly access reviews completed. *Currently 72%.*
> - Zero orphaned accounts at quarter end. *Currently 37 → target 0.*

Notice that Dana owns the audit objective, not Alex. Objectives should be owned by whoever is accountable for the result, even when your team does much of the work.

> [!trap] OKRs as a task list
> If every key result starts with "launch", "build", "deliver" or "complete", you've written a project plan in OKR format. You'll hit every one and possibly change nothing. Rewrite each as the change you expect the output to cause.

## Metric trees: connecting work to results

The outcome you care about most is usually slow and influenced by many things. Time to productive moves when laptops arrive earlier, when access is provisioned faster, when managers request the right access, when the service desk has fewer password tickets clogging the queue. A **metric tree** makes those connections explicit.

At the top sits one **north star** metric: the best single measure of the value your product delivers. Below it, **input metrics** that drive it and that teams can influence directly. Alongside, **guardrails** that must not get worse while you push the north star, and **health** metrics that tell you the product is in good shape overall.

> [!example] At Northwind
> - **North star:** Time to productive for new hires (hours from HR start time to laptop, accounts and access all ready). 72h → 24h.
>   - **Input:** Access request lead time (median request → provisioned). 46h → 4h.
>   - **Input:** Laptops ready on day one (%).
>   - **Input:** Self-service resolution rate. 34% → 50%.
>     - **Output:** Password reset tickets per month. 1,450 → 600.
> - **Guardrails:** Orphaned accounts (must fall, never rise). Change failure rate (18%; must not rise as release frequency increases).
> - **Health:** Employee IT satisfaction.

The tree does three things. It tells each team which number they can move. It explains why a story matters ("this cuts access lead time, which feeds time to productive"). And the guardrails stop you from winning the wrong way, for example by automating access so aggressively that orphaned accounts rise.

### Leading and lagging

Lagging metrics (time to productive, audit findings) tell you whether you succeeded, but only after the fact. Leading metrics (managers approving within two days, MFA registrations) move first and predict the lagging ones. Watch the leading metrics weekly; report the lagging ones monthly or quarterly.

## Business cases that tell the truth

In IT, most significant work needs a business case: a structured argument that the benefits justify the costs. Business cases have a reputation for fiction, usually because they're written to justify a decision already made. Written honestly, they're one of the best thinking tools you have.

A business case needs:

- **Costs:** one-time (build, licences, migration, change management, training) and recurring (run cost, licences, support, maintenance).
- **Benefits:** time saved × cost of that time; tickets avoided × cost per ticket; risk reduced (expected cost of incidents or audit findings avoided); costs retired (old systems, contracts).
- **Ramp-up:** benefits rarely arrive in full on day one. Year one might be 35%, year two 80%, year three 100%.
- **Time value:** future money is worth less than money today. **Net present value (NPV)** discounts future cash flows at an agreed rate (often 8–10%) so you can compare options fairly.
- **Payback period:** how long until cumulative benefits exceed cumulative costs.
- **Assumptions,** written out, each one challengeable.

> [!example] At Northwind
> Automated JML: one-time cost $220k, running cost $30k a year, full annual benefit $640k with a 35% / 80% / 100% ramp. The benefit assumptions are written out:
> - Productivity: 600 hires × 1.5 days saved × $400/day ≈ $360k
> - Service desk: 2,000 fewer tickets × $25 ≈ $50k
> - Audit: avoided remediation and findings ≈ $230k
>
> Anyone can challenge any line. The audit line is the softest. If Finance's Sofia Rossi doubts it, Alex can show the case still pays back without it, just more slowly. That's a stronger position than defending a single big number.

### Cost of delay

The most underused number in IT is **cost of delay**: what it costs, per week, to not have the benefit yet. JML's cost of delay is about $12,000 a week. That number does a lot of work:

- It makes the price of a slip visible. A four-week delay costs roughly $48k of benefit.
- It helps prioritisation. Work with high cost of delay and short duration should go first (Chapter 11).
- It makes "let's take another month to get it perfect" a trade-off rather than a free choice.

### Sensitivity: what really drives the answer

Business cases rest on a few assumptions that matter and many that don't. Find the ones that matter by asking: "If this number were half what we think, does the decision change?" If the answer is yes, that assumption deserves discovery work. If no, stop debating it.

> [!trap] The case written backwards
> If the conclusion was decided before the numbers were gathered, the business case is advocacy, not analysis. A useful test: did writing it ever make you change your mind or your scope? If not, it probably wasn't honest.

## Build, buy or configure

Internal IT constantly faces the question of whether to build something, buy a product, or configure a platform you already own. Each has a different cost profile:

| | Build | Buy | Configure what you have |
|---|---|---|---|
| Fit to need | Exact, if you get the requirements right | Good for standard processes, poor for unusual ones | Limited by the platform |
| Upfront cost | High | Licences + implementation | Usually lowest |
| Ongoing cost | You maintain it forever | Licences, upgrades, vendor dependency | Platform skills, upgrade compatibility |
| Speed | Slowest | Medium | Fastest for standard needs |
| Risk | Delivery risk | Vendor and integration risk | Customisation debt |

Compare alternatives **capability by capability**, not by brochure. List the capabilities you need, weighted by importance, and score each option honestly, including your current platform and "build". Add total cost of ownership over three to five years and the cost of switching later.

> [!example] At Northwind
> For identity governance and the portal, the alternatives are ServiceNow (the "buy" option: mature but expensive, with a long implementation), Jira Service Management (already licensed for engineering, cheap, but weaker on identity lifecycle) and Freshservice (good portal UX, limited integration with the identity platform), compared against configuring the existing identity platform plus a thin custom portal. Scoring by capability shows the existing platform covers lifecycle and access packages well; the portal is where the options differ. That narrows the decision to one capability rather than a whole-platform choice.

## Capacity: the strategy you can afford

A strategy that ignores capacity is a wish list. Two capacity questions matter to a PO:

- **How is the team's time split?** Between new features, technical debt and maintenance or operational work. Agree target percentages with the engineering lead, then compare with actuals. If "features: 60%" turns out to be 35% because incidents eat the rest, your roadmap is fiction.
- **What technical debt is charging interest?** Keep a register: the debt, its business impact, and how much it slows or endangers delivery. Northwind's legacy LDAP sync scripts (fourteen cron jobs, no monitoring) fail silently and block reliable JML. That's not a developer preference; it's a strategic risk with a cost.

> [!tip] Make debt a business conversation
> "The LDAP scripts are bad" won't win budget. "The LDAP scripts fail silently about twice a month, each failure leaves leavers with active accounts for up to a week, and the auditors test exactly that control" will.

## Strategy as a filter

The real test of a strategy is whether it helps you say no. When a request arrives, ask:

1. Which pillar does it serve?
2. Which key result would it move, and by roughly how much?
3. What's its cost of delay compared with what's already planned?

If it serves no pillar and moves no key result, it's a candidate for "not now", however senior the requester. And you now have a fair, impersonal reason to give them.

## Common traps

> [!trap] Too many priorities
> Ten objectives means no objectives. If everything is a priority, the team decides for themselves which ones are real, and they may decide differently than you would.

> [!trap] Vanity metrics
> Portal visits, pages published, features shipped. These go up and to the right and tell you nothing about whether anyone's life got better. Always ask what behaviour change the number represents.

> [!trap] Strategy that never meets the backlog
> If you can't trace the top ten backlog items to the objectives, either the backlog or the strategy is wrong. Check monthly.

> [!exercise] Build a metric tree
> For your product, choose a north star that reflects the value users get. Find three input metrics your team can influence directly, one guardrail you must not harm, and one health metric. For each, write the definition precisely enough that two people would calculate the same number, then find the current value. You'll be surprised how often the current value is unknown.

> [!try]
> [Vision & OKRs](tool:vision) holds the vision board and this quarter's objectives, with key results tracked against baseline and target. [Metric tree](tool:metrics) draws how metrics roll up to the north star. [Business cases](tool:business-cases) calculates NPV, ROI, payback and cost of delay, and shows which assumption the answer is most sensitive to. [Alternatives](tool:market) compares options capability by capability, and [Capacity](tool:capacity) compares planned and actual allocation and holds the tech-debt register.

## Check yourself

```quiz
Q: Which is the strongest key result for the objective "Employees fix common issues themselves"?
- Launch self-service password reset by November
- Publish 50 new knowledge articles
- * Self-service resolution rate from 34% to 50%
- Portal visits up 40%
Why: It measures the outcome (people fixing issues without an agent) with a baseline and target, and leaves the team free to choose how to get there. The others are outputs or vanity metrics.
```

```quiz
Q: What is a guardrail metric for?
- To measure the team's productivity
- * To make sure you don't damage something important while pushing your main metric
- To replace the north star when it's hard to measure
- To report to executives
Why: Guardrails catch winning the wrong way, such as automating access so aggressively that orphaned accounts or change failures rise.
```

```quiz
Q: A business case's conclusion barely changes if the softest benefit is removed. What does that tell you?
- The business case is too conservative
- * The decision is robust to that assumption, so there's no need to spend effort debating it
- The softest benefit should be increased
- The business case needs more benefits
Why: Sensitivity analysis tells you which assumptions matter. If removing one doesn't change the decision, debating it is a waste of time.
```
