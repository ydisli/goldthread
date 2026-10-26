---
id: stakeholders
title: "Stakeholders: who matters, and why"
part: craft
minutes: 16
summary: Finding everyone with a stake, mapping power, interest, legitimacy and urgency, knowing where each relationship stands, and the stakeholders IT teams forget.
tools: [stakeholders, maps, raci]
---

A stakeholder is anyone who can affect your work or is affected by it. That definition is deliberately wide, and in internal IT it gets very wide indeed: a single change to how accounts are created touches HR, every hiring manager, security, audit, data protection, the service desk, infrastructure, the vendor and nearly two thousand employees.

You can't give all of them equal attention, and you shouldn't try. Stakeholder management is the discipline of knowing who they are, what each of them needs from you, and spending your limited time where it changes the outcome.

This chapter is about finding and understanding stakeholders. The next is about working with them day to day.

## Finding everyone

The stakeholders you'll forget are not the powerful ones; those find you. They're the people downstream who will feel the change and the people upstream who could quietly stop it. Five questions help you find them:

1. **Follow the money.** Who pays for this, who approves the budget, whose costs go up or down?
2. **Follow the data.** Whose data does the change create, read, move or delete? Who owns the source systems? Who is accountable for that data under data protection law?
3. **Follow the approvals.** Which sign-offs does this need: architecture, security, the change advisory board, works council, legal, the vendor?
4. **Follow the support path.** When it breaks at 7 a.m. on a Monday, who gets the call? Who has to explain it to users? Who updates the runbook?
5. **Ask who could stop it, and who will be blamed if it fails.** These are often different people, and both are stakeholders.

Then ask each stakeholder you find: "Who else should I talk to?" The answers will surprise you.

> [!example] At Northwind
> When Alex first scoped automated JML, the list had five names: Morgan (sponsor), Priya (engineering), Hannah (HR, because HR events trigger everything), Tomás (service desk) and Dana (security). Following the data added **Elena**, the DPO, because leaver mailboxes contain personal data with retention rules. Following the approvals added **Noah**, who chairs the change advisory board, and **Marcus**, the enterprise architect, who must agree Workday is the source of truth. Following the support path added **Olivia** in warehouse operations, whose shift workers share scanners and would be locked out by any new MFA step. Asking "who will be blamed?" added **Kim Lee** in internal audit, because the SOX audit tests exactly these controls. Five names became sixteen.

### The groups IT teams forget

- **Operators.** Service desk agents, on-call engineers, the people who run the thing after the project ends. They know where today's process breaks, and they will decide whether your change is adopted or quietly worked around.
- **Gatekeepers with a veto.** Security, data protection, internal audit, architecture, the change board. They rarely ask for features, but they can stop a release.
- **Frontline users.** Warehouse staff, retail workers, field technicians. They are often invisible to IT because they don't sit near IT and rarely file tickets. They suffer most from changes designed for office workers.
- **Vendors.** The account manager for your identity platform has influence over roadmap, licences and support priority.
- **Your own team.** Engineers and testers are stakeholders too. They have interests (sustainable pace, interesting work, paying down debt) that deserve the same respect.

## The power–interest grid

Once you have a list, the classic first map is the power–interest grid. Rate each person on two scales (1 to 5 works well):

- **Power:** how much can they affect the outcome? Budget, authority, veto, influence over others.
- **Interest:** how much do they care, or how much will they be affected?

That puts each person in one of four quadrants, each with a default strategy:

| | Low interest | High interest |
|---|---|---|
| **High power** | **Keep satisfied.** Brief, regular, focused on what they care about. Don't overload. | **Manage closely.** Your key players. Involve them in decisions; never surprise them. |
| **Low power** | **Monitor.** Light-touch updates; watch for changes in their position. | **Keep informed.** Often your users and operators. Involve them in discovery and testing; they make or break adoption. |

The grid is useful because it forces a choice. You cannot manage sixteen people closely. If everyone is in the top right, you haven't rated honestly.

> [!tip] Rate interest by impact, not enthusiasm
> A warehouse manager who has never heard of your project but whose staff will be locked out by it has high interest, whether or not they know it yet. Rate how much they will be affected, then make sure they find out from you.

> [!example] At Northwind
> Alex's grid for JML puts Dana (CISO, power 5, interest 5), Priya (engineering lead, 4/5) and Daniel (VP Sales, 5/4) in **manage closely**. Morgan (CIO, 5/3) and Elena (DPO, 4/2) are **keep satisfied**: they need to be confident, not involved in every detail. Tomás, Olivia and Aisha (UX) are **keep informed**: high interest, less formal power, essential for adoption. The vendor account manager sits in **monitor**.

## Beyond power and interest: salience

Power and interest miss something. Two people can have the same power and interest and still need different treatment, because one has a legitimate claim and a pressing deadline and the other doesn't. The **salience** model adds two attributes:

- **Legitimacy:** is their involvement appropriate and recognised? A DPO's say over data retention is legitimate by law. A senior manager in an unrelated department weighing in on your design is less so.
- **Urgency:** is their claim time-sensitive and do they consider it critical right now?

Combine power, legitimacy and urgency and you get a sharper sense of who needs attention *now*:

- **Definitive** (all three): act on their concerns promptly. Daniel, with a January cohort of 120 reps, is definitive this quarter.
- **Dominant** (power + legitimacy): expected to have a say; keep them close. Dana and Kim Lee.
- **Dangerous** (power + urgency, no legitimacy): can disrupt through pressure or escalation. Watch carefully and steer their energy toward legitimate channels.
- **Dependent** (legitimacy + urgency, no power): have a valid, pressing claim but need an advocate. Olivia's shift workers often land here. Sometimes the advocate has to be you.
- People with only one attribute are **latent**: note them and move on, but notice if they gain another.

Salience changes faster than the power–interest grid. An audit date, an incident or a reorganisation can make someone definitive overnight. Revisit it monthly.

## Where each relationship stands

Mapping who people are is half the picture. The other half is where each relationship stands and where you need it to be. A simple five-level scale works:

- **Unaware:** doesn't know about the work or its impact on them.
- **Resistant:** knows and opposes it, actively or passively.
- **Neutral:** knows, neither for nor against.
- **Supportive:** knows and wants it to succeed.
- **Leading:** actively champions it to others.

For each key stakeholder, record **current** and **desired** engagement. The gaps are your plan.

> [!example] At Northwind
> Daniel is **resistant**. He has been burned by IT timelines before and expects JML to be late. Alex needs him **supportive** by January, not leading. That means showing him a credible forecast and a fallback for the January cohort, not enthusiasm.
>
> Dana is **neutral**: she likes automated leaver deprovisioning but distrusts anything that grants access without a human approval. The desired state is **supportive**, which means bringing her into the rules for what counts as birthright access.
>
> Priya and Aisha are already supportive; Alex would like them **leading**, explaining the approach to their own peers in engineering and design.

Not everyone needs to be leading. Moving a resistant gatekeeper to neutral is often the most valuable stakeholder work of a quarter.

## Influence: who listens to whom

Formal power is only part of the story. People are influenced by colleagues they trust, by teams they depend on and by whoever they last had lunch with. An influence map (who influences whom) shows you routes to people you can't reach directly.

Ask yourself, and ask others:

- Whose opinion does this person seek before deciding?
- Who do they complain to?
- Who has credibility with them that you lack?

> [!example] At Northwind
> Daniel trusts his own operations lead and, it turns out, Hannah in HR, who fixed his team's commission data last year. When Alex shows Hannah the problem statement and the January fallback plan, Hannah mentions it to Daniel in their weekly sync. The next conversation between Alex and Daniel starts from a better place.

## A profile worth keeping

For each person you manage closely, keep a short profile. Not a dossier; a page of working notes:

- **What they care about.** Their goals, their targets, what they're measured on.
- **What they worry about.** Their risks, what went wrong last time, what would embarrass them.
- **How they like to communicate.** Written or verbal, detail or headline, weekly or when something changes.
- **Their history with your team.** Promises kept and broken. Grudges.
- **What success looks like to them.** In their words.
- **Open items.** Their requests, your promises, approvals waiting on them, conflicts involving them.

You'll use this before every conversation. The next chapter covers how.

> [!trap] Writing things you wouldn't want them to read
> Assume any stakeholder note may one day be read by the person it describes. Write "prefers a one-page summary; has been let down by IT dates before" rather than "difficult; doesn't read". It's more useful and it's fair. In some jurisdictions people can request the data you hold about them.

## Who does what: a first look at RACI

Stakeholder maps tell you who matters. A RACI tells you who does what. For each key activity or decision, name who is:

- **Responsible:** does the work.
- **Accountable:** owns the outcome and makes the final call. Exactly one person.
- **Consulted:** gives input before the decision (two-way).
- **Informed:** told after the decision (one-way).

A RACI for automated JML might make Priya accountable for the integration build, Hannah accountable for the accuracy of HR data, Dana accountable for approving which access counts as birthright, and Alex accountable for the release decision. Writing it down surfaces disagreements early: if both Dana and Priya think they decide birthright access, you want to find out now, not in UAT. Chapter 14 covers RACI in more depth.

## Keeping the map alive

A stakeholder map made once at kickoff is wrong within a month. People change roles, priorities shift, an incident makes the quiet DPO suddenly urgent. Build small habits:

- Review the grid and engagement levels **monthly**, or after any reorganisation.
- After each significant conversation, update the profile and the engagement level if it moved.
- When someone new appears in a meeting, ask who they are and add them.
- Watch for stakeholders who have gone silent. Silence from a key player is usually not agreement.

## Common traps

> [!trap] Job title as a proxy for influence
> The enterprise architect with no budget may be the person the CIO always asks before signing. The VP with a big title may not care at all. Rate what people can actually do, not what their title suggests.

> [!trap] Treating resistance as an obstacle
> Resistant stakeholders usually have a reason, and the reason often contains a requirement you missed. Dana's resistance to automatic access is a security requirement waiting to be written down.

> [!trap] Forgetting the operators
> If the service desk learns about your change from the first angry call, you've failed a stakeholder group that could have been your best ally.

> [!exercise] Map your current initiative
> List everyone with a stake in your current most important piece of work using the five "follow the…" questions. Rate power and interest, mark legitimacy and urgency, and record current and desired engagement for the top six. Circle the two biggest gaps between current and desired. Those are your stakeholder priorities for the next two weeks.

> [!try]
> Add people in [Stakeholders](tool:stakeholders). Each has a profile with ratings, interests, communication preferences and everything linked to them. [Maps](tool:maps) draws the power–interest grid, salience, engagement gaps and influence network from those ratings. [RACI](tool:raci) checks your matrix for missing or duplicate accountables.

## Check yourself

```quiz
Q: A VP from another department has strong opinions about your portal design, can escalate to the CIO, and wants changes before Friday, but has no role in the work. In salience terms they are:
- Definitive: act on their concerns immediately
- Dependent: they need an advocate
- * Dangerous: power and urgency without legitimacy, so steer their energy into legitimate channels
- Latent: ignore them
Why: Power plus urgency without a legitimate claim can disrupt your work through escalation. You don't ignore them; you listen, acknowledge, and route their input through the proper decision-maker.
```

```quiz
Q: Which stakeholder group is IT most likely to forget when planning a change to sign-in?
- The CIO
- The security team
- * Frontline shift workers who share devices and rarely file tickets
- The engineering team building it
Why: Frontline users are often invisible to IT but feel sign-in changes most sharply. They have high interest whether or not they know about the change yet.
```

```quiz
Q: Dana, the CISO, is neutral about automated JML because she distrusts access granted without human approval. What's the best next step?
- Escalate to the CIO to get her support
- Move her to "monitor" on the grid
- * Treat her concern as a requirement: involve her in defining which access is safe to grant automatically
- Wait until UAT so she can see it working
Why: Resistance and doubt often contain a missing requirement. Bringing Dana into the birthright-access rules addresses her concern and makes the design better.
```
