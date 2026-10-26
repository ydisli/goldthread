---
id: teams
title: Working as a team
part: tool
minutes: 14
summary: Personal and team workspaces, inviting people, roles, teams inside a workspace, comments and mentions, notifications, edits that clash, files, fields of your own, passwords and single sign-on, your own data, and restoring deleted work.
tools: [inbox, approvals, raci, capacity]
---

Goldthread works well as a personal tool, but most product work is shared. A PO and a BA working on the same product, a sponsor who wants to see the roadmap, an auditor who needs the traceability, a team lead who wants the forecast. This chapter covers how to bring people in and keep the right access in place.

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
3. If your server has email set up, leave **Email the invite to them** ticked and they'll get it straight away. Otherwise, share the link however you normally would (Slack, Teams, email).

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

### Notifications

Everything that needs you shows up in your **Inbox**. If your server has email set up, you can also get an email when someone mentions you or asks for your sign-off, plus a weekly digest of what's waiting on you. Choose which ones under **Settings → Profile → Notifications**. Email is a nudge, never the only copy: the Inbox always has everything.

### When two people edit the same thing

Two people can have the same item open. When you save, Goldthread sends only the fields you changed, so someone else's edit to a different field is kept. If you both changed **the same field**, nothing is overwritten silently. You see what they saved next to what you wrote, choose which to keep for each field, and then save.

> [!example] At Ashgrove
> Jordan tightens the wording of REQ-12 while Priya, in a refinement session, changes the same statement to match what engineering can build. Priya saves first. When Jordan saves, Goldthread shows both versions side by side. Jordan keeps Priya's wording and adds a comment explaining the audit constraint, rather than quietly reverting it.

### Files

Attach screenshots, documents, exports or audit evidence to any item: drop them on the **Files** panel, or click **Add**. Each file can be up to 25 MB. Images and PDFs open in the browser; other files download. Removing a file can be undone, and like any item it can be restored later from **Recently deleted**.

### Fields and item types of your own

Every team tracks something Goldthread doesn't. Admins can add both under **Settings → Workspace**:

- **Fields of your own** on any item type: a *Vendor* on requirements, a *Regulatory reference* on decisions, a *Cost centre* on requests. Choose the kind (text, number, date, pick one, yes/no, link) and whether it's required. A field you make required later doesn't block edits to older items, but it can't be cleared once set.
- **Item types of your own** for things the built-in types don't cover, such as *Environments*, *Vendors*, *Controls* or *Contracts*. Each type gets its own list in the sidebar under *Your item types*, its own form and fields, and links to everything else like any other item.

Custom fields appear in forms, on the item, in its history, in the workspace export, and to AI assistants over MCP. Removing a field hides it; the values stay on the items and come back if you add the field again with the same name.

> [!trap] Rebuilding your old tool
> Add a field when a real question needs it, such as *"Which requirements depend on Vendor X?"*. Don't add one because the old spreadsheet had a column for it. Every field is something someone has to fill in.

### Approvals and sign-offs

Request approval on a spec, baseline, release or decision. Approvers see it in their Inbox; each response is recorded with who, when and what they said (Chapter 19).

### Live updates

Changes appear for everyone in the workspace as they happen: no refresh, no "who has the latest version". The sync status at the bottom of the sidebar shows whether you're connected. If you lose your connection, the last copy of the workspace stays readable until you're back.

### The activity trail

**Activity** keeps an append-only record of every change: who, what and when, including changes made from the command line, the browser extension, AI assistants and imports. Each item's **History** panel shows its own trail. Auditors value this; so will you, the first time someone asks "who changed this requirement?"

### Restoring deleted work

Deleting an item offers **Undo** straight away. After that, editors can restore anything from **Settings → Data → Recently deleted**, with its links intact. Deletes are never final, and they're recorded in the activity trail.

## Signing in, passwords and leaving

- **Forgotten password:** if your server has email, click **Forgot password?** on the sign-in page. Otherwise, ask a workspace admin. Under **People & access** they can create a one-time reset link that's valid for 24 hours.
- **Single sign-on:** if your organisation has connected Microsoft, Okta, Google or another provider, the sign-in page shows **Continue with…** and you don't need a separate password.
- **Your own data:** **Settings → Profile → Your data** downloads everything about you: your profile, memberships, comments, and the changes you made.
- **Leaving:** you can delete your account from the same place. Your comments stay so discussions still make sense, attributed to "Former member", and your name is removed from the history.

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
Q: You and a colleague both edited the acceptance criteria of the same story, and they saved first. What happens when you save?
- Your version replaces theirs; the last save wins
- Their version is kept and your change is discarded
- * You see both versions side by side and choose which to keep before anything is saved
- The story is locked until an admin decides
Why: Edits to different fields merge on their own. When the same field was changed by both of you, Goldthread asks rather than silently overwriting, so nobody loses work without knowing.
```

```quiz
Q: You notice an invite link you created was posted in a public channel by mistake. What should you do?
- Nothing; links only work for the invited address
- Change the person's role to viewer
- * Revoke the invite and create a new one for the same person
- Wait for it to expire in 14 days
Why: Until it's used, an invite link is effectively a secret. Revoking it takes a second, and the person can get a fresh link.
```
