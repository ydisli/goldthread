---
id: discovery
title: "Discovery: evidence over opinion"
part: craft
minutes: 19
summary: Where evidence comes from in IT, how to weigh it, how to interview without leading, and how to turn beliefs into assumptions you test before you build.
tools: [signals, opportunities, assumptions, experiments, bets, customers, research]
---

Most ideas don't work the way their authors expect. That isn't pessimism; it's what every organisation that measures its results finds. Some ideas fail outright, many have a smaller effect than predicted, and a few work better than anyone hoped. You can't tell which in advance from the strength of the conviction behind them.

Discovery is the work of reducing that uncertainty cheaply, before you spend months building. It answers three questions: **Is the problem real and big enough? Will this solution actually solve it? Can we deliver it in a way that works for the organisation?**

In internal IT, discovery is often skipped entirely ("the business asked for it, so we're building it") or done as theatre ("we ran a survey"). This chapter is about doing it properly and proportionately.

## Where evidence comes from

You have more evidence available than you think. It's scattered, it's messy, and nobody has put it together. Typical sources in IT:

| Source | What it tells you | Watch out for |
|---|---|---|
| **Service desk tickets** | Volume, categories, free-text descriptions of real problems | Miscategorisation; tickets only show problems people bothered to report |
| **System logs and telemetry** | What people actually do: sign-ins, failures, time between steps | Shows *what*, rarely *why* |
| **Process timestamps** | Lead times, waiting times, handoffs (e.g. request → approved → provisioned) | Clock starts and stops are often defined inconsistently |
| **Interviews** | Context, motivation, workarounds, language people use | Small samples; people describe what they think they do |
| **Observation / shadowing** | What people really do, including workarounds they don't mention | Time-consuming; the observer changes behaviour |
| **Surveys and CSAT** | Breadth: how widespread a sentiment is | Low response rates; leading questions; satisfaction ≠ behaviour |
| **Workarounds and shadow IT** | Proof that a problem hurts enough for people to pay for it | Hard to find unless you look |
| **Escalations and executive complaints** | What powerful people feel strongly about | One loud voice is not a trend |

The best discovery combines at least two kinds: one that shows **scale** (tickets, logs, surveys) and one that shows **cause** (interviews, observation). Numbers without stories lead to the wrong fix; stories without numbers lead to fixing the wrong problem.

## Weighing evidence

Not all evidence is equal. When you collect signals, keep track of a few attributes so you can weigh them later:

- **Said vs did.** "I'd use self-service reset" is weaker than "72% of pilot users completed a reset without help". Behaviour beats opinion.
- **Who and how many.** One senior manager vs 400 tickets from warehouse staff. Both matter, differently.
- **Recency.** A complaint from two years ago, before the last system change, may no longer apply.
- **Directness.** A first-hand quote from a user beats a manager's summary of what users think.
- **Independence.** Five tickets from one person about one incident are one signal, not five.

> [!trap] The loudest voice
> An executive escalation feels urgent and specific. A thousand tickets feel like background noise. Put them side by side with numbers attached and the priorities often reverse. Weigh by reach and cost, not by volume of complaint.

## Interviewing without leading

Interviews are the most powerful discovery tool and the most commonly misused. The core rule: **ask about specific past behaviour, not opinions or hypotheticals.**

People are good at describing what happened last Tuesday. They are poor at predicting what they'd do with a feature that doesn't exist, and they are polite: if you describe your idea, most will tell you it sounds great.

| Instead of… | Ask… |
|---|---|
| "Would you use self-service password reset?" | "Tell me about the last time you got locked out. What did you do?" |
| "Is the access request process slow?" | "Walk me through the last access request you raised. When did you get the access?" |
| "What features do you want in the portal?" | "What did you need from IT last month? How did you get it?" |
| "Do you find onboarding confusing?" | "What happened on your first day? What were you waiting for?" |

Good follow-up questions:

- "What happened next?"
- "How long did that take?"
- "What did you do while you were waiting?"
- "How often does that happen?"
- "Is there anything you do to avoid that happening?" (This finds workarounds.)
- "Who else is involved when that happens?"

And a few habits:

- **Talk less.** Aim for the interviewee speaking 80% of the time. Silence is a useful tool; people fill it.
- **Don't pitch.** If you mention your solution, do it in the last five minutes, and treat their reaction as weak evidence.
- **Two people if you can:** one asks, one takes notes. Write down exact phrases. The words people use become the words in your product.
- **Five to eight interviews per segment** usually surfaces the main patterns. Stop when you stop hearing new things.

> [!example] At Northwind
> Jordan interviews 14 recent hires and 6 hiring managers about their first week. Nobody says "access requests bounce between approvers". They say things like "my manager emailed IT a list on Monday and I got Salesforce on Wednesday" and "I didn't know which systems I needed, so I just asked my desk neighbour what they had." The second quote turns into an important insight: managers don't know what access a role needs, so a catalog of packages by job role is part of the solution, not just faster approvals.

### Observation

In IT, watching often beats asking. Sit with a service desk agent for a morning. Shadow a new hire's first day. Stand in the warehouse at 5:45 a.m. when the shift starts and watch people sign in to shared scanners.

You'll see workarounds nobody mentioned because they've become normal: the sticky note with the shared password, the agent who keeps a personal spreadsheet of which manager approves which system, the shift lead who signs everyone in with their own account.

## From signals to problems

As evidence accumulates, group related signals into **opportunities**: problems worth solving, phrased from the user's side. Clustering is partly mechanical (similar words, same system, same group of people) and partly judgement.

A useful structure is the **opportunity tree**:

- At the top, the **outcome** you're trying to move: "New hires productive on day one."
- Below it, **opportunities**: the problems and needs that stand in the way. "Laptops arrive late." "Access requests bounce between approvers." "Managers don't know what access a role needs."
- Below each opportunity, **solutions** you could try.
- Below each solution, the **experiments** that would tell you whether it works.

The tree keeps you honest in two ways. It stops you jumping from outcome straight to solution. And it makes visible that most outcomes have several opportunities under them, and most opportunities have several possible solutions.

## Beliefs become bets

When you decide to pursue a solution, write it as a **bet**: a hypothesis with a measurable prediction and a date to check.

```
We believe [this change]
for [these people]
will [achieve this outcome],
measured by [metric] moving from [baseline] to [target]
by [check date].
Confidence: [%]
```

> [!example] At Northwind
> "We believe **self-service reset and unlock with MFA** for **all employees** will **cut password tickets**, measured by password and lockout tickets moving **from 1,450 to 300 a month** within **60 days of rollout**. Confidence: 75%."

Writing the confidence down feels uncomfortable at first. Do it anyway. Over time, comparing your stated confidence with what actually happened is how you learn to calibrate (Chapter 15). Northwind's chatbot was bet at 85% confidence and deflected 4% of tickets instead of 30%. That's a lesson worth having written down.

## Assumptions: what must be true

Every bet rests on assumptions. Most of them are fine. A few, if wrong, sink the whole thing. Discovery is mostly about finding those few and testing them early.

Sort assumptions into four kinds:

- **Value:** will people want it and use it? *Office staff will register for MFA-based reset when prompted.*
- **Usability:** can people actually use it? *Managers review the access summary within two days.*
- **Feasibility:** can we build it with our technology, data and skills? *Workday job codes reliably predict the access a person needs.*
- **Viability:** does it work for the organisation: cost, policy, operations, compliance? *System owners will maintain their access package definitions.*

Then rate each on **importance** (how badly the bet fails if this is wrong) and **evidence** (how much you actually know). The assumptions that are important and poorly evidenced are your **leap-of-faith** assumptions. Test those first.

> [!example] At Northwind
> For SSPR, "office staff will register for MFA" is important but well evidenced: a pilot showed 72% completion without help. "Frontline staff can verify without a company phone" is just as important and has almost no evidence. Warehouse associates don't have company phones, and many share scanners. If this assumption is wrong, SSPR doesn't work for a third of the workforce. Jordan designs a prototype test before anything is built: PIN plus badge on a shared scanner, with five associates, success meaning sign-in within 30 seconds.

## Experiments that fit IT

Commercial products run A/B tests on millions of users. Internal IT rarely has the volume or the appetite. You have other tools:

- **Pilots** with one team or department. Real software, real users, small blast radius. The SSPR pilot with Finance is a classic.
- **Prototypes:** clickable mockups or a rough working version tested with five users each. Cheap and fast for usability questions.
- **Concierge tests:** do it by hand before automating. Before building automated access packages, have a person provision access from job codes for one month's hires and see how often the packages are wrong.
- **Data analysis:** test a feasibility assumption against existing data. Compare the access that job codes would generate with the actual access of 100 current employees.
- **Fake doors:** put a link or button in the portal for a feature that doesn't exist yet, and measure clicks. Use sparingly and honestly ("coming soon, tell us what you need").
- **A/B tests** where you do have volume, for example manager notifications. Northwind compared a Teams card with an email for the access summary: 52% of managers reviewed within two days with Teams, against 35% with email.

### How much evidence is enough?

Small samples can only detect big effects. If your pilot has 30 people, you can tell the difference between 20% and 60% success, but not between 50% and 55%. Before running an experiment, decide:

- **What would change your decision?** If the pilot shows 40% completion, would you stop, change the design, or carry on?
- **What's the smallest effect worth detecting?** Then check whether your sample can detect it.
- **What's the stopping rule?** Decide in advance when you'll look at the result. Peeking daily and stopping when it looks good produces false positives.

You don't need to be a statistician. You need to decide before you look, and to be suspicious of small samples that confirm what you hoped.

> [!tip] Decide the decision first
> For every experiment, write down before it starts: "If the result is above X, we persevere. Between Y and X, we change the design. Below Y, we stop." This one habit eliminates most bad experiment practice.

## How much discovery?

Discovery should be proportional to risk and cost. A one-day configuration change needs a conversation. A six-month programme that changes how 1,900 people sign in needs weeks of discovery and several experiments.

A rough guide:

- **Low cost, easily reversed:** a quick check of the evidence, then build and measure.
- **Medium:** problem interviews, an assumption map, one or two cheap tests of the riskiest assumptions.
- **High cost or hard to reverse:** full problem validation, prototypes, a pilot, and explicit go/no-go decisions.

And discovery never fully stops. Once something ships, measurement and feedback are discovery for the next iteration.

## Common traps

> [!trap] Discovery theatre
> Running interviews or surveys to confirm a decision that's already been made. If no possible result would change the plan, it isn't discovery. Say so honestly and save everyone's time.

> [!trap] Asking users to design the solution
> Users are experts in their problems, not in solutions. "What features do you want?" produces a list of features. "Tell me about the last time…" produces understanding.

> [!trap] Taking tickets at face value
> Tickets are categorised by busy agents choosing from a dropdown. "Password" might include SSO failures, MFA problems and account lockouts from leaver processes. Read a sample of the free text before trusting the categories.

> [!trap] Testing the safe assumptions
> It's tempting to test what you're fairly sure of, because the result will be good news. Test the assumption that scares you.

> [!exercise] Map the assumptions behind one bet
> Take one initiative you're about to start. Write it as a bet with a measurable prediction and a confidence. List at least eight assumptions across value, usability, feasibility and viability. Rate each for importance and evidence. Pick the two riskiest and design the cheapest test that would change your mind about each.

> [!try]
> Capture evidence in [Signals](tool:signals). Throughline groups similar signals into themes and shows how strong each theme is. Organise problems in [Opportunities](tool:opportunities), write bets in [Bets](tool:bets), map risk in [Assumptions](tool:assumptions) and size tests in [Experiments](tool:experiments), which calculates sample sizes and significance for you. Personas and journeys live in [Personas & journeys](tool:customers), and interview plans and findings in [Research](tool:research).

## Check yourself

```quiz
Q: Which interview question is most likely to give you reliable evidence?
- "Would you use a self-service portal to request access?"
- "How frustrating is the current access process, from 1 to 10?"
- * "Tell me about the last access request you raised. What happened?"
- "What features should the new portal have?"
Why: Questions about specific past events produce facts. Hypotheticals, ratings and feature requests produce opinions, and people are polite about your ideas.
```

```quiz
Q: For an SSPR bet, which assumption should you test first?
- Office staff will register for MFA (importance high, strong pilot evidence)
- The reset page will load in under 2 seconds (importance low, well understood)
- * Frontline staff can verify without a company phone (importance high, almost no evidence)
- Managers will like the new design (importance low, no evidence)
Why: Leap-of-faith assumptions are both important and poorly evidenced. If the frontline assumption is wrong, the bet fails for a large part of the workforce.
```

```quiz
Q: A 20-person pilot shows 55% success against a 50% target. What can you conclude?
- The pilot succeeded
- The pilot failed
- * Very little: a sample that small can't reliably distinguish 55% from 50%
- You should extend the pilot until it shows significance
Why: Small samples only detect large effects. Extending a test until it shows what you want is a classic way to produce a false positive. Decide sample size and stopping rule before you start.
```
