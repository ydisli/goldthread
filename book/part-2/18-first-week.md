---
id: first-week
title: "Your first week: setting up"
part: tool
minutes: 12
summary: A day-by-day plan for setting up Throughline for your real work, from the first stakeholders and backlog import to your first spec and your daily rhythm.
tools: [stakeholders, backlog, specs, signals, bets, vision]
---

The fastest way to get value from Throughline is not to configure everything up front. It's to put in the few things that pay back immediately (your people, your current backlog, the spec you're working on) and let the rest grow as you work. This chapter is a five-day plan. Each day takes about an hour.

## Before you start

**Create your account** and choose how you work: Product Owner, Business Analyst, or a bit of both. This sets your starting pinned tools; change them any time from **All tools**.

**Choose what to start with.** For your real work, start **blank**. If you want to explore first, open the **IT sample** (ServiceHub) in a separate workspace from the workspace switcher at the top of the sidebar: **New workspace → Start with: IT sample**. You can keep both and switch between them.

> [!tip] Personal first, team later
> Many people start with a personal workspace for their own stakeholders, notes and thinking, and only invite others once it's useful. Nothing is lost: a personal workspace can become a team workspace when you invite someone.

## Day 1: your people

Stakeholders are where Throughline pays back first, so start there.

1. Open **People → Stakeholders** and add the eight to fifteen people who matter most for your current work. Use the five "follow the…" questions from [Chapter 3](guide:stakeholders): money, data, approvals, support path, and who could stop it.
2. For each, set **power** and **interest** (1–5), tick **legitimacy** and **urgency** if they apply, and choose **current** and **desired engagement**.
3. Add a line or two on what each cares about and how they like to communicate.
4. Set a **cadence** (how often you want to talk) for your key players.
5. Open **Maps**. Your power/interest grid and engagement gaps are already drawn.

You'll also see yourself as a stakeholder, linked to your account. That's how Throughline knows which approvals and action items are yours.

## Day 2: your backlog

If your team's backlog lives in Jira or Azure DevOps, bring it in. You keep using that tool for day-to-day delivery; Throughline adds the analysis around it.

1. In Jira, run a filter for your project and choose **Export → Export CSV (all fields)**. In Azure DevOps, open a query and choose **Export to CSV**. Include resolved or closed dates if you can; they let the forecast use your team's real history.
2. Open **Delivery → Backlog health** and click **Import from Jira / ADO**. Choose the file. Throughline detects the source, shows how it mapped the columns, and previews what will be created.
3. Bugs become **defects** (you can switch that off). Epics are skipped, because in Throughline they're **bets**, which you'll create deliberately on Day 4.
4. Import. The backlog health checks run immediately: duplicates, stale items, missing acceptance criteria, oversized stories.

Re-importing the same export later **updates** stories by their key instead of duplicating them, so you can refresh weekly. If you'd rather automate it, the command-line tool can import on a schedule (Chapter 26).

No Jira? Add a handful of stories by hand from **Backlog health → New story**, or use the story map.

## Day 3: the spec you're working on

1. Open **Specs & analysis → Spec Studio** and create a spec for the piece of work you're currently defining.
2. Paste your current draft, or start writing. The **Quality** tab flags vague words, weak modals, compound requirements and glossary conflicts as you type, each with a suggested fix.
3. Check completeness: what's missing that a reviewer will ask about.
4. On the **Requirements** tab, extract requirements from the text with one click and link them to the spec.
5. Add the two or three terms people argue about to the **Glossary**.

If you have an AI provider set up, run the **Review board** now and see what a tester, security reviewer and support lead would ask. Without one, the review board still runs, using built-in checks.

## Day 4: why you're doing it

Now connect the work to its reasons.

1. In **Discovery → Bets**, create a bet for your current initiative. Write the hypothesis using the template from [Chapter 5](guide:discovery), with a metric, baseline, target, confidence and check date.
2. Link the spec to the bet, and link your most important imported stories to the bet or to requirements. The rest you can link as you refine them.
3. Add a few **signals**, the evidence behind the bet: a quote, a ticket count, an interview finding. Press **C** to capture each one.
4. If your organisation has quarterly objectives, add them in **Strategy → Vision & OKRs** and link the bet to the objective.

Now the throughline exists for your main initiative: evidence → bet → spec → requirements → stories.

## Day 5: your rhythm

1. **Pin** the six to eight tools you'll use weekly. Unpin the rest; they're always one click away in All tools.
2. Look at **Home**. With people, backlog, spec and bet in place, **Needs you** starts showing real things: people you're overdue to talk to, stories that aren't ready, promises the forecast doesn't support.
3. Log the last conversation you had with each key stakeholder (press **C** and choose **Interaction**), so cadence tracking starts from reality.
4. Record any promises you've made in **People → Promises**.
5. Set up your weekly rhythm from [Chapter 16](guide:growing): daily Home check, weekly prep and refinement, Friday review.

## After the first week

From here, grow it as you work rather than as a project:

- Capture signals as you hear them.
- Log decisions when you make them.
- Prep for key stakeholder meetings with the **Meeting prep** tab.
- Draw a process model or decision table when a conversation gets tangled.
- Invite your BA, PO or team when you want to share (Chapter 25).
- Connect your AI assistant (Chapter 26).

> [!trap] Importing everything on day one
> It's tempting to load every stakeholder, every historical decision and every old spec. Resist. Throughline is most useful when what's in it is current and accurate. Add history only when you need it.

## Check yourself

```quiz
Q: You re-import the same Jira export a week later after the team updated statuses. What happens?
- Every story is duplicated
- * Stories are updated by their Jira key; links and notes you made in Throughline are kept
- The import is refused
- Old stories are deleted and recreated
Why: Re-imports match on the issue key and only update fields the tool owns (title, status, points, sprint, done date), so you can refresh regularly.
```

```quiz
Q: What's the best thing to set up on day one?
- Every historical decision
- * Your key stakeholders, with ratings, engagement and cadence
- All the tools, configured
- A complete metric tree
Why: Stakeholder information pays back immediately: maps, overdue conversations and meeting prep all start working as soon as people are in.
```
