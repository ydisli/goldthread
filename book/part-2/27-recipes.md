---
id: recipes
title: Recipes for a real week
part: tool
minutes: 14
summary: Step-by-step recipes that combine the craft and the tool for the situations that come up every week, from Monday planning to an audit request.
tools: [home, inbox, stakeholders, specs, prioritize, pulse, trace, meetings, docs]
---

The earlier chapters went area by area. Real work doesn't arrive by area; it arrives as situations. This chapter is a set of recipes for the situations POs and BAs meet most often, each combining the craft from Part I with the tools from Part II. Use them as checklists until they become habit.

## Monday: plan the week (20 minutes)

1. **Home → Needs you.** Read the top items. Anything urgent becomes today's first task.
2. **People to reach** on Home: book time with anyone overdue who matters this week.
3. **Promises** (via the Shortcuts card or People → Promises): any promise whose probability dropped? If so, plan the renegotiation conversation now ([Chapter 4](guide:relationships)).
4. **Forecast:** has any active bet's 85% date moved? Why: scope, throughput or work in progress?
5. **RAID log:** top three risks. Any new ones from last week's meetings?
6. Write three outcomes for the week in your notes. Not tasks: outcomes. *"Dana agrees the birthright list." "Contractor decision made." "Portal spec ready for review."*

## A new request arrives

1. Press **C → Request**. Record who asked, what they asked for and a **respond-by** date. Tell them when they'll hear back.
2. Before deciding, recover the problem ([Chapter 2](guide:problems-first)): ask what happens today, how often and what it costs. Add what you learn as **signals** linked to an existing or new opportunity.
3. Check **Opportunities**: is this part of a problem you already know? What does the evidence strength look like with this added?
4. Decide: accept (link the request to the bet or story that will satisfy it), merge, or decline with a reason and an alternative.
5. Update the request status. When the linked work ships, close the loop with the requester.

## Preparing for a key stakeholder meeting (5 minutes)

1. Open the stakeholder → **Meeting prep**.
2. Read the open items: their requests, your promises (with probabilities), approvals waiting on them, conflicts involving them, decisions since you last spoke.
3. Decide the one thing you need from them and the bad news you must bring first.
4. After the meeting: **C → Interaction**, with a line of what was said and the sentiment. Log any decision or new promise straight away.

## Refinement session

**Before (30 minutes):**
1. In **Backlog health**, pick the next stories from the top of the order. Check each against the **Definition of Ready** on its page.
2. For anything without acceptance criteria, draft them, including unhappy paths ([Chapter 8](guide:requirements)).
3. If a story involves rules, open or create its **decision table** and check for gaps.
4. List open questions on each story as comments, @mentioning whoever can answer.

**During:**
5. Walk through each story with examples. Use example mapping for anything with many rules ([Chapter 7](guide:elicitation)).
6. Split stories that are too big, using the patterns from [Chapter 11](guide:prioritisation).
7. Capture new decisions with **C → Decision** as they happen.

**After:**
8. Update stories, mark the ready ones, and push new stories to Jira with **Export → New stories only** if that's where the team works.

## Writing a spec from scratch

1. **Spec Studio → New spec.** Start with the problem statement and the success metric. If you can't write them, go back to discovery.
2. Write scope and **non-goals** next.
3. Draft requirements. Watch the **Quality** tab and fix vague terms as you go.
4. Draw the process model or decision table for anything tangled; link it.
5. Run the **completeness** check and fill or explicitly dismiss each gap.
6. **Extract requirements** to make them managed and traceable.
7. Run the **Review board**. Answer each question by improving the spec, or accept it as a risk.
8. Walk the key reviewers through it in person ([Chapter 10](guide:specs-and-reviews)), then **Request approval**.

## Quarterly planning

1. **Bet ledger:** record results for bets due for measurement. Look at calibration before setting new confidences ([Chapter 15](guide:outcomes)).
2. **Vision & OKRs:** close last quarter's key results with their final values; draft the new objectives with owners.
3. **Opportunities:** which problems have the strongest evidence now?
4. **Bets:** write or update bets for the candidates, with hypotheses, confidence and check dates.
5. **Prioritize:** rank by WSJF or RICE; check what would change the order; discuss the fragile pairs with stakeholders.
6. **Capacity:** plan with real allocation, not hoped-for allocation.
7. **Forecast:** check which committed bets can realistically land this quarter at 85%.
8. **Roadmap:** update Now / Next / Later. Generate a **steering pack** for the planning review.

## A stakeholder asks "when will it be done?"

1. Open **Forecast** for the bet. Read the 50%, 85% and 95% dates.
2. Ask what they need the date for. A board commitment needs the 95% date; their own planning may be fine with 85%.
3. Answer with a range and a confidence: *"Most likely mid-December; I'd plan around 9 January; I'll update you weekly."*
4. If they need it sooner, discuss options: reduce scope, a fallback, a phased release. Not "work harder".
5. If you make a promise, record it in **Promises** linked to the bet, so it's checked against the forecast from now on.

## Two stakeholders want opposite things

1. **People → Conflicts → New.** Record the parties and their **positions**.
2. Talk to each separately; record their **interests** ([Chapter 4](guide:relationships)).
3. Link the conflicting requirements or decisions to the conflict.
4. Generate options that serve both sets of interests; bring in engineering or legal for constraints.
5. If the parties agree, record the resolution and create a **decision**. If not, escalate the decision (not the people) to whoever is accountable in the **RACI**, with options laid out.
6. Update the requirements and tell everyone affected.

## A requirement needs to change after sign-off

1. Open the requirement → **Change request**. Describe the change and the reason.
2. Run **Impact**: affected stories, tests, releases, promises and stakeholders.
3. Estimate the cost: effort, delay (use the bet's cost of delay), risk.
4. Decide, with the accountable person if it touches controls or promises. Record the reasoning.
5. If accepted, update the requirement (a new version is created automatically), adjust stories and tests, and tell the affected stakeholders. Use the **Alignment check** to make sure nobody's missed.

## Preparing a release

1. **Releases →** your release. Check stories done, tests passing, open defects.
2. Work through **launch readiness**: service desk briefed, runbooks, monitoring, CAB approval, comms, rollback ([Chapter 13](guide:delivery)).
3. Write the **rollout plan** and **rollback criteria** with numbers.
4. Check **Traceability** for gaps on the requirements in this release.
5. Generate **release notes** for each audience and the stakeholder updates.
6. Run the **Alignment check** for anyone who'd be surprised.
7. After release: add the **check date** to each bet if it's missing, and plan hypercare.

## An auditor asks for evidence

1. Find the control's requirement in **Requirements** (or search with ⌘K).
2. Open **Traceability**: its source, stories, tests with results and dates, and the release.
3. Open the release for its change approval, and **Approvals** for sign-offs on the baseline.
4. Show the **History** of the requirement for who changed what and when.
5. Add production evidence from the system itself (logs, reports) to the requirement as a link or comment.
6. If there are gaps, record them honestly as RAID issues with owners, and fix the process, not just the evidence ([Chapter 14](guide:governance)).

## Friday: review the week (15 minutes)

1. Did the three outcomes happen? If not, why?
2. **Activity:** skim what changed this week across the workspace.
3. **Inbox:** clear what you can; schedule the rest.
4. Note one thing you learned and one thing you'll do differently.
5. Close your laptop.

## Check yourself

```quiz
Q: A stakeholder needs a date for a commitment to the board. Following the recipe, what do you give them?
- The 50% date, because it's the most likely
- * The 95% date (or 85% with a clear warning), with the confidence stated and a promise recorded against the forecast
- The date the team estimated in planning
- No date until the work is done
Why: High-stakes commitments need high-confidence dates, stated as such. Recording the promise means you'll know early if the forecast stops supporting it.
```

```quiz
Q: In the "new request" recipe, what do you do before deciding whether to accept it?
- Estimate it with the team
- Add it to the backlog
- * Recover the underlying problem and check it against existing opportunities and evidence
- Escalate it to the sponsor
Why: Requests arrive as solutions. Understanding the problem, and whether it's part of one you already know, is what makes the decision sound and explainable.
```
