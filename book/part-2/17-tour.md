---
id: tour
title: A tour of Throughline
part: tool
minutes: 10
summary: How Throughline is organised, how everything links together, and the handful of moves you'll use every day.
tools: [home, inbox, ask, guide]
---

Part I described the craft without any tool. Part II shows how Throughline supports it. This chapter is the map: how the app is organised, the idea that ties it together, and the few moves you'll use constantly. The following chapters go area by area.

## The idea underneath: one connected graph

Throughline is built around the throughline idea from Chapter 1. Everything you put in, whether a stakeholder, a signal, a requirement, a story, a test, a decision or a release, is an item in one connected **graph**. Items link to each other through ordinary fields: a story has a *Requirements* field, a test has *Stories*, a bet has *Opportunities*, a commitment has a *Stakeholder*.

You never maintain those connections twice. Because the links live in the items themselves, Throughline can work out the rest:

- every item shows **what links to it** (a requirement shows its stories, tests, defects and decisions),
- the **traceability matrix** is generated, never hand-maintained,
- **impact analysis** follows the links from anything you might change,
- a stakeholder's **360° view** gathers everything connected to that person,
- the **daily brief** on Home looks across all of it for things that need attention.

The more you link, the more Throughline can do for you. A story with no requirement is fine, but it can't show up in the audit trail.

## The layout

### Sidebar

The left sidebar is deliberately short:

- **Search** (or **⌘K**) jumps to any item, tool or action.
- **Capture** (or the **C** key) records something quickly from anywhere: a signal, a request, a conversation, a decision, a risk or an idea.
- **Home** is your day: what needs you, who to reach, what's coming up.
- **Inbox** collects mentions, sign-offs waiting on you, requests to triage, review questions and your action items.
- **Ask** searches everything, and answers questions in plain language if your workspace has an AI provider.
- **Field guide** is this book.
- **Pinned** holds the tools you use every week. Pick them in **All tools**; there are sensible defaults for POs and BAs.
- **All tools** lists the seven areas. Each opens a page with its tools.

At the bottom: your account menu (profile, connect tools, pinned tools, keyboard shortcuts, theme, sign out) and the sync status.

### The seven areas

| Area | What lives there | Book chapters |
|---|---|---|
| **People** | Stakeholders, maps, engagement, requests, promises, RACI, approvals, conflicts | 3, 4, 14 |
| **Discovery** | Signals, opportunities, bets, assumptions, experiments, personas and journeys, research | 2, 5 |
| **Specs & analysis** | Spec Studio, requirements, decisions, business rules, process models, story map, BA toolkit, glossary | 7, 8, 9, 10 |
| **Delivery** | Roadmap, prioritise, backlog health, releases, forecast, RAID, UAT & quality, traceability | 11, 12, 13 |
| **Strategy** | Vision & OKRs, metric tree, business cases, alternatives, capacity | 6 |
| **Learning** | Bet ledger, feature catalog | 15 |
| **Meetings & docs** | Meetings with extraction, generated documents | 4, 10 |

When you're inside a tool, tabs across the top show the other tools in the same area, so related work is one click away.

### Every item has the same shape

Open any item (a requirement, a bet, a stakeholder) and you'll find the same layout:

- a **header** with its key (like REQ-5), title, status and actions,
- **Details**: its fields, editable by anyone with editor access,
- tool-specific panels (a decision table editor, a process canvas, a forecast),
- on the side: **Linked from** (everything that points here), **Comments** (with @mentions) and **History** (who changed what, when).

## Moves you'll use every day

**Capture without breaking flow.** Press **C**. Type what you heard; the first line becomes the title. Choose what it is (signal, request, interaction, decision, risk or bet), who it's from, and save. Sort it out later. Throughline warns you if something very similar was captured already.

**Find anything.** Press **⌘K** and type. Item keys work (REQ-12, ST-4), so do filters like `type:decision`. Tools and actions show up too.

**Jump between places.** Press **G** then a letter: **G H** Home, **G I** Inbox, **G A** Ask, **G T** All tools, **G F** Field guide, **G S** Settings. Press **?** to see all shortcuts.

**Link as you go.** Most fields that reference other items have a picker: start typing a name. Linking takes seconds when you do it at the time and hours when you reconstruct it later.

**Mention people.** In any comment, type **@** and pick a teammate. It lands in their Inbox.

**Undo.** Deleted something by mistake? The toast offers **Undo**, and **Settings → Data → Recently deleted** can restore anything later, links intact.

## Guides and explanations

Most tools open with a short **guide** panel explaining how they work. Dismiss it once you're comfortable; it's remembered for your account. Jargon terms have a dotted underline: hover or focus them for an explanation. And each Field Guide chapter links to the tools it describes, while many tools link back to the craft behind them.

## Personal or team

A **workspace** holds one product or programme. You can keep one just for yourself (a personal workspace for your own notes, stakeholders and thinking) or create a team workspace and invite others. You can belong to several and switch from the top of the sidebar. Chapter 25 covers teams, roles and access.

## The sample workspace

If you signed in with a demo account, you're in **ServiceHub (demo)**, the Ashgrove example used throughout this book. Everything Part I describes is in there: the stakeholders, the JML and SSPR bets, the contradictory mailbox requirements, the decision table with gaps, the as-is and to-be onboarding processes, the forecast that doesn't support Daniel's promise. Explore freely; an admin can put it back to its original state from **Settings → Data**.

> [!try]
> Press **G H** to go Home and look at **Needs you**: each item there is something the graph noticed. Open one, follow a link, then press **⌘K** and search for `mailbox` to find the contradiction from Chapter 8.

## Check yourself

```quiz
Q: Why does Throughline never ask you to maintain a traceability matrix by hand?
- It doesn't support traceability
- * Links live in the items themselves (a story's Requirements field, a test's Stories field), so the matrix is generated from them
- An AI writes it
- It imports it from Jira
Why: Because every item is part of one graph, traceability, impact analysis, backlinks and 360° views are derived automatically from the links you make while working.
```

```quiz
Q: You hear something important in a hallway conversation. What's the fastest way to record it without losing your place?
- Open the Signals tool and create a new item
- Email it to yourself
- * Press C to capture it, then sort it out later
- Add a comment on the nearest item
Why: Capture works from anywhere, takes seconds, and lands the note in the right place as a signal, request, interaction, decision, risk or bet.
```
