---
id: relationships
title: "Working relationships: trust, updates and conflict"
part: craft
minutes: 17
summary: Building trust, choosing a cadence, preparing for conversations, tailoring updates, handling requests and promises, and resolving conflict between stakeholders.
tools: [engagement, requests, commitments, conflicts]
---

Knowing who your stakeholders are is the map. Working with them is the journey, and it happens in hundreds of small moments: a reply to an email, an update in a steering meeting, a hallway conversation where someone asks "is it still on track?" Each moment either builds trust or spends it.

This chapter is about those moments: how trust works, how often to talk to whom, how to prepare, how to say the same thing to different audiences, how to handle requests and promises, and what to do when two stakeholders want incompatible things.

## How trust works

Stakeholders don't trust you because you're nice. They trust you because, over time, your words turned out to match reality. Four things drive it:

- **Credibility:** you know what you're talking about. You can answer questions about the problem, the plan and the risks without bluffing.
- **Reliability:** you do what you say. Small promises matter as much as big ones. "I'll send that by Thursday" and then sending it on Thursday is how reliability is built.
- **Openness:** you tell people things before they find out on their own, especially bad news.
- **Their interests, not just yours:** people can tell whether you're trying to solve their problem or push your plan.

The quickest way to lose trust is to surprise someone powerful in public. The quickest way to build it is to bring bad news early, with options.

## Cadence: how often to talk to whom

Every relationship needs a rhythm, and different relationships need different rhythms. Decide one deliberately for each key stakeholder:

| Stakeholder type | Typical cadence | Format |
|---|---|---|
| Key players (manage closely) | Weekly or fortnightly | 1:1 conversation, short and regular |
| Keep satisfied | Monthly, plus when something changes for them | Brief written update, occasional meeting |
| Keep informed (users, operators) | Every release or milestone | Demo, newsletter, channel post |
| Monitor | Quarterly | Included in broad updates |

Then **log the conversations**. Not minutes; a line or two. Who, when, what they said, how they seemed. Over a quarter, the log tells you which relationships are drifting. If you haven't spoken to a key player in five weeks and your cadence was fortnightly, that's a signal, whatever your calendar says.

> [!tip] Sentiment is data
> Note whether each conversation felt positive, neutral or negative. A run of negative interactions with a key player is an early warning, often weeks before it shows up as an escalation.

## Preparing for a conversation

Five minutes of preparation changes the quality of a stakeholder conversation. Before you meet a key player, check:

1. **What's open between you?** Their requests waiting on you. Promises you made them. Approvals waiting on them. Conflicts they're part of.
2. **What happened last time?** What did they say, what did you agree, did you follow up?
3. **What do they care about this month?** Their targets, their deadlines, the thing their boss is asking them about.
4. **What news do you bring?** Good and bad, with the bad first.
5. **What do you need from them?** A decision, an introduction, a sign-off, their attendance at a workshop. If you need nothing, consider whether the meeting is needed.

> [!example] At Northwind
> Before his fortnightly with Daniel, Alex checks the open items: one request from Daniel's team (pre-approval for the January cohort, still being triaged), one promise (day-one access for January reps, made two months ago by Alex's predecessor) and nothing waiting on Daniel. The forecast says the promise has about a 2% chance of being met by JML alone. Alex decides to lead with that, show the fallback "cohort pack" option, and ask Daniel for one thing: the final list of January starters by 1 December.

## Same facts, different updates

Everyone wants to know how things are going, but they want to know different things. A good update is tailored to what the reader cares about, while the facts stay identical across all versions. Never tell different people different facts.

Take one week's status on JML and write it for four audiences:

**For the CIO (Morgan):** outcomes, risks, decisions needed. "Time to productive is at 54 hours, down from 72; target 24 by end of quarter. On track for office hires. Risk: January Sales cohort. A fallback is in place, no decision needed from you yet."

**For the VP Sales (Daniel):** his people, his dates. "JML won't fully cover the January cohort. We'll provision the 120 reps as a batch in the week before they start, so they have CRM on day one. We need the final list by 1 December."

**For the service desk (Tomás):** what changes for his team and when. "From 18 November, joiner accounts are created automatically three days before the start date. Your agents will stop creating them manually. Runbook updated; walkthrough on Thursday."

**For internal audit (Kim Lee):** controls and evidence. "Leaver deprovisioning is now automatic within one hour of the HR termination time. Every grant and revoke is logged. Evidence pack for the Q4 test window available on request."

All four are true and consistent. None of them would be useful to the others.

> [!trap] The status report as theatre
> A status report that's always green until the week it turns red is worse than no report. It teaches readers to ignore you. Report amber early and often. Amber with a plan is a sign of competence, not failure.

## Handling requests

Stakeholders will ask you for things constantly. How you handle requests shapes your reputation more than how you handle projects. A simple discipline:

1. **Capture every request** in one place, with who asked, when and why. Not in your head, not in five inboxes.
2. **Acknowledge quickly.** "Got it, I'll come back to you by Friday" is enough. A request that disappears into silence costs more trust than a "no".
3. **Triage**: is it a bug, a new need, a question, or a duplicate? Who else has asked for something similar? Turn it into a problem (Chapter 2) before deciding.
4. **Decide, and say so**, with the reason: accepted (with a rough when), declined (with why and alternatives), or merged into existing work.
5. **Close the loop.** When the thing ships, or when the decision changes, tell the person who asked. This step is the one everyone forgets, and it's the one people remember.

### Saying no

You will decline far more requests than you accept. A good no has three parts: **the reason**, **what you're doing instead** and **what would change your answer**.

> "We're not going to build manager pre-approval this quarter. It would add a step for every manager and grant access before HR confirms the hire, which security can't accept. Instead, the January cohort will be provisioned as a batch the week before, and JML will cover future hires automatically. If JML slips past February, let's revisit pre-approval as a stopgap."

There are also softer forms: **not now** (it's valuable but not this quarter), **not this way** (the problem is real but here's a better solution) and **not us** (another team owns this, and here's who to talk to).

## Promises

Promises are the most dangerous currency in stakeholder work. A promise made casually in a meeting ("we'll have it by January") becomes an expectation, then a dependency in someone else's plan, then an escalation when it's missed.

Three rules:

1. **Write down every promise**: what, to whom, by when, and who made it, including promises your predecessor made.
2. **Check every promise against the delivery forecast**, not against hope. If the forecast gives a promise a 30% chance, it isn't really a promise. (Chapter 12 explains how to get that number.)
3. **Renegotiate early.** The moment a promise looks unlikely, go back to the person with the evidence and options. A renegotiation in October is a conversation. A missed date in January is a failure.

> [!example] At Northwind
> The promise to Daniel ("Day-one access for the January sales cohort") was made before JML had a forecast. When Alex checks it against the delivery forecast, the chance is around 2%. Alex doesn't wait for January. In the next 1:1, Alex shows Daniel the forecast, offers the batch-provisioning fallback, and records the renegotiated promise: "CRM and email access on day one for all January starters on the list by 1 December, via batch provisioning."

## When stakeholders disagree

Sooner or later two stakeholders will want incompatible things, and both will be right from where they stand. Your job is not to pick a winner. It's to find a solution that serves both of their underlying interests, or, failing that, to get the right person to decide with full information.

The key move is separating **positions** from **interests**:

- A **position** is what someone says they want: "Delete leaver mailboxes after 30 days."
- An **interest** is why they want it: "We have no lawful basis to keep personal data longer than necessary."

Positions conflict. Interests often don't.

> [!example] At Northwind
> Elena (DPO) wants leaver mailboxes deleted after **30 days** for data minimisation. Tomás and the managers he speaks for want them kept for **90 days** so handovers can happen. These positions are incompatible, and two requirements in the JML spec say both.
>
> Their interests: Elena needs personal data kept no longer than necessary, with a defensible reason. Managers need access to the business correspondence of the person who left, mostly in the first few weeks.
>
> An option serving both: retain the mailbox for 30 days, with the manager given delegated access on the leaving date; during those 30 days the manager moves anything needed into a shared team folder, which follows business-record retention. After 30 days the mailbox is deleted. Elena gets minimisation and a clear rule. Managers get access when they need it. The conflict becomes a design decision, recorded with its reasoning.

A process that works for most conflicts:

1. **Name it.** Write down the conflict, the parties and their positions. Unnamed conflicts fester.
2. **Find the interests.** Talk to each party separately. Ask what they're worried about and what they need, not what they want.
3. **Generate options** that serve both sets of interests. Bring in people who know the constraints (engineering, legal).
4. **Agree criteria** for choosing: regulation, cost, risk, user impact.
5. **Decide, or escalate.** If the parties agree, record the resolution. If they can't, escalate to whoever is accountable, with the options and criteria laid out.

### Escalating well

Escalation isn't failure. It's the right move when a decision is above your authority or the parties are stuck. Do it well:

- **Escalate the decision, not the person.** "We need a decision on mailbox retention" rather than "Elena is blocking us."
- **Bring the options and their consequences**, including your recommendation.
- **Tell the parties first** that you're escalating, and show them what you'll present. Nobody should be surprised.
- **Record the decision and its reasoning**, then communicate it to everyone affected.

## Common traps

> [!trap] Optimism as a strategy
> "It'll probably be fine" is how most broken promises begin. If you're hoping rather than forecasting, say so, and give a date when you'll know.

> [!trap] Surprising people in meetings
> Never let a key player hear bad news for the first time in a group setting. Tell them one-to-one beforehand, even if it's a two-line message an hour before.

> [!trap] Collecting requests, never closing them
> A request log that only grows is a list of disappointed people. Close requests with a decision, even if the decision is no.

> [!exercise] One week of deliberate relationship work
> Pick your three most important stakeholders. For each, write a cadence and check when you last spoke. Before your next conversation with each, do the five-minute prep. Afterwards, log one line and the sentiment. At the end of the week, write a tailored update for two of them using the same facts.

> [!try]
> [Engagement](tool:engagement) shows who you're overdue to talk to, against the cadence you set for each person, plus the comms plan and interaction log. Each stakeholder profile has a **Prep** tab that pulls together open requests, promises, approvals and last conversations. [Requests](tool:requests) handles intake and closing the loop. [Promises](tool:commitments) checks every promise against the delivery forecast. [Conflicts](tool:conflicts) records positions, interests, options and resolutions.

## Check yourself

```quiz
Q: The delivery forecast gives a promise you made to a VP a 25% chance of being met. It's due in ten weeks. What do you do?
- Keep quiet; ten weeks is a long time and things may improve
- Ask the team to work harder to protect the date
- * Go to the VP now with the forecast and options, and renegotiate
- Tell the VP's team, so the VP hears it indirectly
Why: A renegotiation ten weeks out is a conversation; a missed date is a failure. Bringing evidence and options early is what builds trust.
```

```quiz
Q: The DPO wants 30-day mailbox retention; managers want 90 days. What's the first step?
- Pick the stricter option, because compliance wins
- Escalate to the CIO immediately
- * Understand each side's interests (why they want what they want) before looking for options
- Split the difference at 60 days
Why: Positions conflict; interests often don't. Splitting the difference satisfies neither interest, and escalating before understanding the interests gives the decision-maker nothing to work with.
```

```quiz
Q: Which update is best for an internal audit manager?
- "JML is 80% complete and on track"
- "Users love the new onboarding experience"
- * "Leavers are deprovisioned automatically within one hour of termination; every change is logged; evidence available for the test window"
- "We've completed 42 of 51 stories"
Why: Auditors care about controls and evidence. The same facts, written for their concerns, are far more useful to them than progress percentages.
```
