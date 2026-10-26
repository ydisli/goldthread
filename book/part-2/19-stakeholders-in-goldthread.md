---
id: stakeholders-in-goldthread
title: Stakeholders in Goldthread
part: tool
minutes: 13
summary: The People area tool by tool, from profiles, maps and meeting prep to cadence, requests, promises checked against the forecast, RACI, approvals and conflicts.
tools: [stakeholders, maps, engagement, requests, commitments, raci, approvals, conflicts]
---

The People area turns Chapters 3, 4 and 14 into daily practice. It's where many POs and BAs spend the most time, and where Goldthread differs most from a ticket tracker: it treats relationships as work worth managing, with the same care as requirements.

## Stakeholders

**People → Stakeholders** is the registry: everyone with a stake, with the ratings from [Chapter 3](guide:stakeholders): power, interest, legitimacy, urgency, current and desired engagement, plus organisation, role, what they care about and how they like to communicate. Vendors and customers can be stakeholders too; set the kind accordingly.

The list shows each person's quadrant, engagement gap, salience, last touch, sentiment and open asks, so you can sort by what matters today.

### A profile in four tabs

Open a person and you get:

- **Meeting prep:** a one-page briefing for your next conversation: what they care about, what's open between you (their requests, your promises, approvals waiting on them, conflicts involving them), what's been decided since you last spoke, and suggested talking points. Copy it into your notes or read it on your phone on the way to the meeting. This is the five-minute prep from [Chapter 4](guide:relationships), done for you.
- **360° view:** everything connected to this person across the graph: bets they sponsor, requirements they're the source of, decisions they made, RACI rows, approvals, influence links.
- **Interactions:** the log of conversations, with sentiment over time. A run of negative sentiment is an early warning.
- **Details:** all their fields.

> [!example] At Ashgrove
> Before meeting Daniel, Alex opens his **Meeting prep**. It shows one open request (pre-approval for the January cohort), one promise at risk (the forecast gives it about 2%), no approvals waiting on Daniel, and a suggested talking point: renegotiate the January promise with the batch-provisioning fallback. Prep took two minutes.

## Maps

**People → Maps** draws your stakeholder landscape from the ratings you've entered. Nothing to maintain separately:

- **Power / interest grid** with the four quadrants and the strategy for each.
- **Salience**: who is definitive, dominant, dangerous or dependent right now.
- **Engagement assessment matrix**: current versus desired engagement for each person, so the gaps (your relationship plan) are visible.
- **Influence network**: who influences whom, the most influential people, and the **path to influence** for reaching someone indirectly.

Record influence from a person's Details ("influenced by"). Even a few links make the network useful.

## Engagement

**People → Engagement** keeps relationships on cadence:

- **Touchpoints** shows who you're overdue to talk to, against the cadence you set for each person, key players first. The same list feeds **People to reach** on Home.
- **Comms plan** holds planned communications (what goes to whom, how often, through which channel) and flags overdue ones.
- **Interaction log** is the history of conversations, filterable by person and sentiment.

Log interactions quickly with **C → Interaction**: who, a line of what was said, sentiment. Thirty seconds after a meeting saves you from "when did I last speak to Elena?"

## Requests

**People → Requests** is the intake for asks from stakeholders. Each request has a requester, priority, a **respond-by** date and a status (new, triaging, accepted, declined, done…). New requests show up in your Inbox; overdue ones are flagged.

Use it exactly as [Chapter 4](guide:relationships) describes: capture everything, acknowledge quickly, triage into a problem, decide with a reason, and **close the loop**. When you accept a request, link it to the bet, story or requirement that will satisfy it. Then the requester's profile shows progress and you'll know who to tell when it ships.

## Promises

**People → Promises** is the commitment ledger: what was promised, to whom, by when, by whom. Goldthread checks each promise against the **delivery forecast** for the work it depends on and shows the probability of keeping it. Promises below your comfort level are flagged on Home and in the stakeholder's prep.

This is what turns [Chapter 12](guide:forecasting) into trust: you find out a promise is in trouble while there's still time to renegotiate. Link each promise to the bet or release it depends on, or the forecast can't check it.

## RACI

**People → RACI** holds RACI matrices: activities as rows, people as columns, R/A/C/I in the cells. Click a cell to cycle the role. Goldthread validates each matrix as you go: rows with **no accountable**, **more than one accountable**, or **no responsible** are flagged, along with people who are accountable for too much. Add activities, rename by double-clicking, and link a matrix to the bet or release it governs.

## Approvals

**People → Approvals & sign-offs** tracks every approval request: what's being approved (a spec, a baseline, a release, a decision), who must approve, the due date, and each approver's response (approved, rejected, changes requested) with comments. Approvals waiting on you appear in your Inbox. For approvers who aren't in Goldthread, copy a ready-made reminder message.

Every response is kept as an audit trail: who approved which version, when. Request approval directly from a spec in Spec Studio; a baseline shows the approval that signed it off.

## Conflicts

**People → Conflicts & escalations** records disagreements the way [Chapter 4](guide:relationships) recommends: the parties, their **positions**, their underlying **interests**, the **options** considered, and the **resolution** or escalation. Link conflicting requirements to the conflict so the resolution and the requirements stay together.

> [!example] At Ashgrove
> Two conflicts are open in the sample: *MFA on every sign-in vs fast shift starts* (Dana versus Olivia) and *Leaver mailboxes: 30 days (DPO) vs 90 days (handover)* (Elena versus Tomás). A third, *Retire the chatbot*, is resolved, with the resolution recorded.

## Alignment checks

On bets, releases and decisions you'll find an **Alignment check** panel. It looks at who has a stake in the item (through links, RACI and influence) and flags people who are **not involved** or are **resistant**. It's a quick way to catch the "follow the approvals" stakeholder you forgot before you announce something.

## Tailored updates

On a release, the **stakeholder update** view renders the same facts for different audiences: executives, sales and customer success, support, engineering, customers. Pick an audience, review, and send it through your normal channel. Same facts, different emphasis, as [Chapter 4](guide:relationships) describes. You can also generate a stakeholder update document from **Meetings & docs → Documents**.

> [!try]
> In the sample, open **People → Stakeholders → Daniel Brooks → Meeting prep**. Then open **Promises** and find the January promise and its probability. Finally, open **Maps** and find Daniel in the salience view.

## Check yourself

```quiz
Q: Where does Goldthread get the probability shown next to a promise?
- From the stakeholder's sentiment
- * From the delivery forecast for the bet or release the promise depends on
- From the requester's priority
- It's entered by hand
Why: Promises link to the work they depend on, and the Monte Carlo forecast for that work gives the chance of meeting the promised date.
```

```quiz
Q: What does the Alignment check on a bet flag?
- Requirements that contradict each other
- * Stakeholders connected to the bet who aren't involved or are resistant
- Stories without acceptance criteria
- Approvals that are overdue
Why: It looks across links, RACI and influence to find people with a stake who might be surprised or opposed, before you announce or release.
```
