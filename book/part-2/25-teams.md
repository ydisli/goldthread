---
id: teams
title: Working as a team
part: tool
minutes: 10
summary: Personal and team workspaces, inviting people, roles and what each can do, teams inside a workspace, comments and mentions, approvals, the activity trail and restoring deleted work.
tools: [inbox, approvals, raci, capacity]
---

Throughline works well as a personal tool, but most product work is shared. A PO and a BA working on the same product, a sponsor who wants to see the roadmap, an auditor who needs the traceability, a team lead who wants the forecast. This chapter covers how to bring people in and keep the right access in place.

## Workspaces

A **workspace** holds one product, platform or programme: its stakeholders, evidence, specs, backlog and everything else. You can belong to several and switch from the top of the sidebar.

- A **personal** workspace is just for you: your own stakeholder notes, thinking and drafts.
- A **team** workspace is shared with the people you invite.

Create a workspace from the switcher: **New workspace**, choose who it's for (my team, or just me) and whether to start blank or from a sample.

> [!tip] One workspace per product, not per project
> Projects end; products and platforms continue. Stakeholders, decisions and learning carry over from one initiative to the next, which is a large part of the value. Create a new workspace when you take on a genuinely different product, not for each release.

## Inviting people

Admins and owners invite people from **Settings → People & access**:

1. Enter the person's email, choose their **role**, and optionally add them to **teams**.
2. Click **Create invite link**.
3. Share the link however you normally would (Slack, Teams, email). Throughline doesn't send email itself.

The link works **once**, for **that email address**, for **14 days**. The person opens it, creates their account (or signs in if they have one) and lands in the workspace. Someone already signed in with a different email can't use it. Pending invites are listed, and you can revoke one at any time.

Until it's used, treat the link like a password: send it only to the person it's for. If it ends up somewhere it shouldn't, revoke it and create a new one.

## Roles

Each person has one role per workspace. Roles are enforced on every request, whether from the web app, the command line, the browser extension or an AI assistant using a token.

| Role | Can | Good for |
|---|---|---|
| **Viewer** | Read everything, comment, create read-only tokens | Sponsors, auditors, stakeholders who want visibility |
| **Editor** | Create and edit items, run meetings, capture signals | Most of the team: POs, BAs, leads, testers |
| **Admin** | Everything an editor can, plus invite people, change roles, set up AI and import data | The PO or lead who looks after the workspace |
| **Owner** | Everything, including making other admins and owners, and archiving the workspace | Whoever is ultimately responsible for the workspace |

Viewers see the same screens as editors, read-only. When a viewer opens an item, the form is shown but locked, with a note explaining how to get edit access. Viewers can still comment and @mention people, so a sponsor can ask a question on a spec without being able to change it.

> [!example] At Ashgrove
> The ServiceHub workspace has Alex as owner and Jordan and Priya as editors. Dana (CISO) is a viewer, so she can follow the security-relevant decisions and comment on specs. Kim Lee from internal audit is a viewer too, so she can check traceability and approvals herself rather than requesting evidence packs.

## Teams inside a workspace

**Teams** group people within a workspace, for example *Identity & Access*, *Service Desk Experience* and *Platform & Automation*. Teams appear in capacity planning (Chapter 23), in RACI matrices, and as owners of bets. You can invite someone straight into a team.

## Working together

### Comments and mentions

Every item has **comments**. Type **@** to mention a teammate. They get it in their **Inbox** under *Mentioned you*, with the comment and a link to the item. Mark it done when you've dealt with it. Editors can **resolve** comments once the question is answered, so the open discussion on an item stays short.

Comments are always signed by whoever posted them, whichever way they were posted.

### Approvals and sign-offs

Request approval on a spec, baseline, release or decision. Approvers see it in their Inbox; each response is recorded with who, when and what they said (Chapter 19).

### Live updates

Changes appear for everyone in the workspace as they happen: no refresh, no "who has the latest version". The sync status at the bottom of the sidebar shows whether you're connected. If you lose your connection, the last copy of the workspace stays readable until you're back.

### The activity trail

**Activity** keeps an append-only record of every change: who, what and when, including changes made from the command line, the browser extension, AI assistants and imports. Each item's **History** panel shows its own trail. Auditors value this; so will you, the first time someone asks "who changed this requirement?"

### Restoring deleted work

Deleting an item offers **Undo** straight away. After that, editors can restore anything from **Settings → Data → Recently deleted**, with its links intact. Deletes are never final, and they're recorded in the activity trail.

## Access hygiene

Practise what Chapter 14 preaches:

- **Review members quarterly.** Remove people who've left the team; downgrade people who only need to read.
- **Give the least access that works.** Most stakeholders need viewer, not editor.
- **Revoke unused tokens** (Chapter 26) in **Settings → Tokens & integrations**.
- **Keep two owners,** so the workspace isn't stranded if one leaves.

> [!try]
> In the sample, sign in as different demo accounts to see each role: Alex is the owner, Jordan and Priya are editors, and Dana and Kim are viewers. Open a spec as Kim to see the read-only view, then leave a comment that mentions Alex.

## Check yourself

```quiz
Q: Your CIO wants to see the roadmap and steering pack but shouldn't change anything. Which role?
- Editor, because they're senior
- Admin
- * Viewer: they can read everything and comment, without editing
- Owner
Why: Viewers have full visibility and can comment and mention people, which is exactly what sponsors and auditors need. Give the least access that works.
```

```quiz
Q: You notice an invite link you created was posted in a public channel by mistake. What should you do?
- Nothing; links only work for the invited address
- Change the person's role to viewer
- * Revoke the invite and create a new one for the same person
- Wait for it to expire in 14 days
Why: Until it's used, an invite link is effectively a secret. Revoking it takes a second, and the person can get a fresh link.
```
