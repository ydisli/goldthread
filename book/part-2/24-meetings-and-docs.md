---
id: meetings-and-docs
title: Meetings and documents
part: tool
minutes: 9
summary: Meeting notes that turn into decisions, actions, risks and requirements, and documents generated from the graph so they're never out of date.
tools: [meetings, docs, decisions, raid]
---

Meetings and documents are where a lot of product work happens and a lot of it gets lost. Decisions made in a steering meeting live in someone's notebook; the PRD sent last month no longer matches the requirements. This chapter shows how Throughline keeps both connected to the rest of the work.

## Meetings

**Meetings & docs → Meetings** holds your meetings (refinement, sprint planning, reviews, retros, steering, 1:1s, workshops, stakeholder reviews), split into upcoming and past. Each meeting has a date, kind, attendees, agenda and notes.

### Before: the agenda

Write the agenda in the meeting before it starts. Link the items you'll discuss (a spec, a bet, a conflict) in **Related**, and attendees see the context in one place. For a meeting with a key stakeholder, open their **Meeting prep** tab first (Chapter 19).

### During: notes that do the work

Type notes during the meeting, or paste a transcript afterwards. Throughline reads the notes and **extracts**:

- **Decisions:** lines starting with *Decision:*, *Agreed:*, *We decided to…*, *Going with…*
- **Action items:** lines starting with *Action:*, *Todo:*, *Follow-up:* or *Next step:*, or lines that assign someone (*@Priya to check the CRM rate limit by Friday*, *Hannah will send the cohort list*). The owner is matched to your stakeholders and the due date is read from phrases like *by Friday* or *next week*.
- **Risks:** lines starting with *Risk:*, *Concern:* or *Issue:*, or sentences like *we're worried that…* or *this might slip*.
- **Open questions:** lines starting with *Question:* or ending with a question mark.
- **Requirement candidates:** sentences with *must*, *shall*, *needs to* and similar.

Transcript formats work too: timestamps and speaker names ("Priya Nair: …") are handled. Click **Import transcript** to bring in the file Teams or Zoom gives you after a recorded meeting: a WebVTT (`.vtt`), SubRip (`.srt`), Teams Word (`.docx`) or plain-text transcript. Throughline turns it into readable "Name: what they said" lines, merging consecutive lines from the same speaker, and runs the same extraction.

> [!tip] Transcripts are long; decisions are short
> A one-hour transcript holds a handful of decisions and actions. Read the extracted list against your memory of the meeting before you create anything. Spoken language is vaguer than notes, and *"we should probably look at that"* isn't an action until someone owns it.

The **Extracted from notes** panel lists everything found. Untick anything that's wrong and click **Create selected**. Decisions go to the decision log, risks to the RAID log, action items to the meeting's action list (owners see them in their Inbox), and requirement candidates to Requirements as drafts. Open questions are listed for you to follow up. Everything created stays linked to the meeting, so you can always see where a decision was made.

> [!example] At Ashgrove
> Alex's notes from the JML steering meeting include:
>
> *Decision: batch-provision the January Sales cohort the week before start.*
> *Action: @Hannah send the final January starter list by 1 December.*
> *Risk: CRM connector rate-limits bulk provisioning.*
> *Can contractors wait until Q1?*
>
> One click creates a decision record, an action for Hannah with a due date and a RAID risk, all linked to the meeting. The contractor question is listed as open, for Alex to take to Dana.

> [!tip] Write notes with the prefixes
> You don't have to, but starting lines with *Decision:*, *Action:* and *Risk:* while you take notes makes extraction exact, and makes your notes easier for humans to scan too.

### After: action items

Each meeting shows its **action items** with owners and due dates. Tick them off as they're done. Your open actions appear in your Inbox and on Home; overdue ones are flagged.

## Documents

**Meetings & docs → Documents** generates documents from the graph. Because they're assembled from the current state of your items, they're never out of date. Regenerate at any time.

| Document | Built from | Use it for |
|---|---|---|
| **PRD** | A spec, plus its bet, evidence, requirements and decisions | Sharing a complete product requirements document |
| **BRD** | A bet: objectives, stakeholders, current and future state, requirements, business case | Business requirements for governance or funding |
| **PR/FAQ** | A bet | A working-backwards press release and FAQ to test the idea's clarity |
| **Steering pack** | The whole workspace: OKRs, roadmap, promises at risk, top risks, decisions and approvals needed | Steering committee or monthly leadership update |
| **Release notes** | A release | Customer- or employee-facing notes |
| **Stakeholder update** | A bet or release, for a chosen audience | Same facts, tailored per audience (Chapter 4) |

Pick the document type and its subject, review the output, then **copy** the Markdown, download it as **Markdown** or a **Word** document, or choose **Print / PDF** for a clean printable page you can save as a PDF. If your organisation needs a particular template, generate the document and adjust it: most of the work is gathering the content, and that's done.

> [!trap] Editing the generated document instead of the source
> If you fix a requirement in the downloaded PRD rather than in Throughline, the next generated version will have the old wording. Fix the source, then regenerate.

> [!try]
> In the sample, open **Documents**, choose **Steering pack**, and read what Morgan would see at the next steering committee. Then choose **Stakeholder update** for the JML bet and switch between the executive and support audiences.

## Check yourself

```quiz
Q: Which line in meeting notes becomes an action item with an owner and due date?
- "The CRM connector is slow"
- * "Action: @Hannah send the final starter list by 1 December"
- "Decision: batch-provision the January cohort"
- "Should contractors wait until Q1?"
Why: Action prefixes or an assigned person with a deadline make a line an action. The others become a risk candidate (or nothing), a decision and an open question.
```

```quiz
Q: Why generate a steering pack from Throughline rather than writing it by hand?
- Generated documents are longer
- * It's assembled from the current state of OKRs, roadmap, promises, risks and decisions, so it's accurate and takes minutes
- Steering committees prefer Markdown
- It can't be edited
Why: Most of the effort in a steering pack is gathering accurate content. When that content already lives in the graph, the document is a view of it.
```
