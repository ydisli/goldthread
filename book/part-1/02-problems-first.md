---
id: problems-first
title: Problems before solutions
part: craft
minutes: 14
summary: Why requests arrive as solutions, how to dig down to the problem underneath, write it as a problem statement, and tell outputs from outcomes.
tools: [signals, opportunities, bets]
---

Almost nothing arrives on your desk as a problem. It arrives as a solution with a deadline. "We need a chatbot." "Can we buy a new ITSM platform?" "Sales needs managers to pre-approve access before day one." "Add an export button." Each of these is somebody's answer to a question they haven't told you.

Your first job, before any requirement or backlog item exists, is to recover that question. Not because the proposed solution is wrong (sometimes it's exactly right) but because you can't judge it, size it, prioritise it or measure it without knowing what it's for.

## Why solutions arrive first

People bring solutions for good reasons. They have lived with the problem long enough to imagine a fix. Solutions are concrete and easy to ask for; problems are vague and feel like complaining. And in many organisations, asking for a thing is how you get budget.

The trouble is that a solution carries hidden assumptions:

- that the problem is the one the requester thinks it is,
- that it affects the people they think it affects, at the scale they imagine,
- that this solution is the best way to fix it,
- that fixing it matters more than the other things competing for the same team.

Any of these can be false. When they are, you build the requested thing on time and the problem stays.

> [!example] At Ashgrove
> Daniel Brooks, VP Sales, asks Alex for a change: "Let hiring managers pre-approve their new reps' access before day one." It's specific, it sounds cheap and Daniel is powerful. Alex could put it straight on the backlog. Instead, Alex asks what happens to a new rep today. The answer: reps start on Monday, get their laptop on Monday afternoon and get CRM access on Wednesday, because the CRM access request waits for the manager, then for the CRM system owner. They can't call a customer until Thursday. **The problem is not "managers can't pre-approve". It's "new reps lose three selling days because access arrives in sequence after they start."** Pre-approval is one possible fix. Automatic access from job code (already part of the JML bet) is another, and it doesn't need managers to remember anything.

## From request to problem

You don't need a framework to get from a request to a problem. You need a handful of questions and the patience to ask them without sounding like you're blocking.

**"What happens today?"** Ask them to walk you through the last time it happened, step by step. The last real occurrence gives you facts. "What usually happens" gives you opinions.

**"Who does this happen to, and how often?"** One sales rep last month, or every new hire, every week? This is the start of sizing.

**"What does it cost when it happens?"** Time lost, money, risk, frustration, a missed target, an audit finding. Get a number if you can, even a rough one.

**"What have you tried?"** Workarounds are gold. A spreadsheet someone maintains, a favour they call in, a shadow process. Each workaround tells you the problem is real and how people currently pay for it.

**"What would be different if this were solved?"** This is where you hear the outcome they actually want, which is usually broader than the solution they asked for.

**"Why now?"** A deadline, an incident, an audit, a new executive. The answer tells you about urgency and sometimes about the real sponsor.

Notice what's absent: "why do you want that?" asked five times in a row. Repeated whys are a fine thinking tool but a poor interviewing technique; people hear them as a challenge. Ask about events and consequences instead and you'll get to the same place.

> [!tip] Keep the solution, park it
> Never throw away the requested solution. Write it down next to the problem as "option 1". People relax when they see their idea recorded, and you'll need it when you compare options later.

## Writing a problem statement

Once you understand the problem, write it down in a form that others can check. A good problem statement fits in a paragraph and has five parts:

1. **Who** has the problem: a specific group, not "users".
2. **What** they are trying to do: the goal, in their words.
3. **What gets in the way**: the obstacle, described without a solution.
4. **The impact**: what it costs, ideally in numbers.
5. **The evidence**: how you know.

A template you can reuse:

```
[Who] can't / struggles to [goal] because [obstacle].
This costs [impact: time, money, risk, frequency].
We know this because [evidence: data, tickets, interviews, observation].
```

> [!example] At Ashgrove
> **New hires in Sales** can't start selling in their first week because **laptops and access arrive in sequence after their start date** (laptop on day one afternoon, CRM on day three). **About 40 reps a quarter lose roughly three selling days each,** and the January cohort alone is 120 people. **We know this from** 14 onboarding interviews, access request timestamps (median 46 hours from request to provisioned) and the service desk's day-one ticket volume.

Read that statement and notice what it allows. Engineering can see several possible fixes. Finance can estimate the cost of doing nothing. Daniel can check it matches his experience. And later, Alex can measure whether it got better.

### Testing your statement

A problem statement is ready when it passes four checks:

- **Solution-free.** If you can see the answer in it ("users need a dashboard"), you've written a solution in disguise. Ask what the dashboard would let them do, and write that.
- **Specific about who.** "Employees" is almost never right. Office staff, warehouse shift workers and contractors have very different problems with the same password policy.
- **Sized.** Frequency and cost, even if rough. "Some people are annoyed" can't compete for priority with anything.
- **Evidenced.** At least one source that isn't the requester's opinion.

## Outputs, outcomes and impact

The most useful distinction in product work is between what you ship and what changes because you shipped it.

- An **output** is the thing you deliver: the self-service reset page, the access request portal, the automated review campaign.
- An **outcome** is a change in what people do: employees reset their own passwords; managers approve access in hours, not days; reviewers complete reviews on time.
- **Impact** is the result the organisation cares about: fewer tickets and less service desk cost; new hires productive on day one; a clean audit.

Outputs are necessary but they are not the goal. You can ship every output on the roadmap, on time, and move no outcome at all. The chatbot Ashgrove launched last year is the classic case: delivered on schedule, it deflected 4% of tickets instead of the predicted 30%, and satisfaction dropped.

When you define work, define it at the outcome level and treat outputs as your current best guess for how to get there:

| Output (what we ship) | Outcome (what changes) | Impact (why it matters) |
|---|---|---|
| Self-service reset with MFA | Employees reset and unlock without calling | Password tickets 1,450 → 300 a month; desk time freed |
| Access from job code on HR events | Hires have the right access before day one | Time to productive 72h → 24h |
| Review campaigns pre-filled with usage | Managers complete reviews on time | 100% reviews complete; zero orphaned accounts at audit |

> [!trap] Measuring the output
> "Launched the portal" is not a result. Neither is "1,200 people visited the reset page". Visits are activity. The outcome is how many people completed a reset without a ticket, and the impact is whether tickets went down.

## How big is the problem?

You'll need to compare problems against each other. A rough size beats no size. Three numbers usually get you there:

- **Reach:** how many people or events per period.
- **Severity:** how much each occurrence costs (time, money, risk).
- **Frequency:** how often it happens per person.

Multiply and you have a crude cost of the problem.

> [!example] At Ashgrove
> Password lockouts: about 1,450 tickets a month. Each takes an agent around 8 minutes, and the employee loses around 25 minutes waiting. That's roughly 190 agent hours and 600 employee hours **every month**: about 4.5 full-time equivalents of lost time, before counting the shift workers who miss the start of their shift.
>
> Rehires getting a second identity: maybe four cases a year. Each causes a messy clean-up and a small audit risk. Real, but much smaller.

Rough sizing does two things. It stops small, loud problems from beating large, quiet ones. And it gives you the baseline for measuring the outcome later.

## Keep more than one option

Once the problem is clear, resist jumping to the first solution, including your own. A simple discipline: **always write down at least three options, one of which is "do nothing".**

For the Sales onboarding problem:

1. **Do nothing.** Reps keep losing three days. Cost: about 120 reps × 3 days in January alone.
2. **Manager pre-approval** (Daniel's request). Helps when managers remember; adds a step for every manager; creates access before the HR record is final, which security will dislike.
3. **Access from job code via JML.** No manager action needed for standard access; already in progress; depends on job codes being reliable.
4. **A manual "cohort pack"** for January only. The service desk provisions the 120 reps in a batch the week before. Ugly, but it works for the deadline while JML matures.

Option 4 might be the right answer for January and option 3 the right answer for the long run. You would never see either if you had taken the request at face value.

"Do nothing" is on the list because sometimes it wins. It's the honest baseline: every other option has to beat it.

## Saying "not yet" without saying no

When you redirect a request from solution to problem, the person can feel blocked. A few habits help:

- **Start by agreeing with the pain.** "Three lost selling days per rep is a real cost; I want to fix it."
- **Show the problem statement back to them** and ask if it's right. People rarely argue with an accurate description of their own problem.
- **Bring options, including theirs.** Their idea is option 2, not rejected.
- **Give a date for the decision**, not a vague "we'll look at it".

Done well, this makes stakeholders feel more heard, not less, because you've understood their problem better than their request did.

## Common traps

> [!trap] The solution in disguise
> "Users need better visibility of their requests" is a solution (visibility) wearing a problem's clothes. What do they do without visibility? They chase the service desk. "Employees chase the desk for updates, about 300 'any update?' tickets a month" is the problem.

> [!trap] The problem that's too big
> "Onboarding is bad" is true and useless. Break it down until each piece has a clear who and obstacle: laptop arrives late; access arrives in sequence; nobody explains the first-day setup. Each can be sized and solved.

> [!trap] Nobody owns the problem
> If you can't name a person who will be happier when the problem is solved, and who will tell you if it isn't, the problem probably isn't worth solving yet.

> [!exercise] Rewrite three requests
> Take three requests from your inbox or backlog that are written as solutions. For each, write a problem statement using the template above. Then list three options, including "do nothing". Check each statement for the four tests: solution-free, specific who, sized, evidenced. If you can't fill in the evidence line, that's your next conversation.

> [!try]
> Capture what people tell you as **signals** in [Signals](tool:signals): each quote, ticket or data point, tagged with who said it. Group them into problems in [Opportunities](tool:opportunities), where each opportunity holds its problem statement and shows how strong the evidence is. When you pick a solution, it becomes a **bet** in [Bets](tool:bets), linked back to the problem it is meant to solve.

## Check yourself

```quiz
Q: Which of these is a problem statement rather than a solution in disguise?
- Managers need a dashboard showing their team's access
- We should automate quarterly access reviews
- * Reviewers rubber-stamp 400-line spreadsheets because they can't tell which access is unused, so 37 orphaned accounts survived last quarter's review
- The access review process needs to be modernised
Why: Only the third names who has the problem, what gets in the way and what it costs, without prescribing the fix. "Dashboard", "automate" and "modernise" are solutions or directions.
```

```quiz
Q: The access request portal launched on time and 1,600 employees used it in the first month. What has been shown?
- The outcome has been achieved
- * An output was delivered and adopted. Whether access arrives faster is still unknown
- The impact on time to productive is positive
- Nothing, because usage numbers are vanity metrics
Why: Usage shows adoption of the output, which is necessary. The outcome (faster access) and the impact (people productive sooner) have to be measured separately, against the baseline.
```

```quiz
Q: Why include "do nothing" in your options?
- To show stakeholders you considered everything
- Because it's usually the cheapest option
- * Because it's the honest baseline: every other option has to beat the cost of leaving the problem alone
- To make the preferred option look better
Why: Doing nothing has a real cost (the problem continues) and a real benefit (the team does something else). Making that explicit stops you from building things that aren't worth more than their opportunity cost.
```
