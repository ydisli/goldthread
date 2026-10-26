---
id: governance
title: Governance without bureaucracy
part: craft
minutes: 17
summary: Decision records, RACI that works, approvals with an audit trail, traceability for SOX, ISO 27001 and GDPR, and keeping governance proportionate.
tools: [decisions, raci, approvals, trace, requirements]
---

Governance has a reputation as the thing that slows everything down: approval chains, sign-off templates, committees. Some of that reputation is earned. But governance exists for real reasons. Organisations need to know who decided what and why, to prove that controls work, and to stop one person making a risky change alone.

The craft is to provide those things with the least possible friction. Good governance is mostly a by-product of working well: if you record decisions as you make them and keep the line from requirement to test unbroken, most of what auditors and committees need already exists.

## Decisions

Teams make hundreds of decisions, and forget the reasons for most of them within months. Then someone new asks "why don't we use SMS for password reset?" and the debate starts again from scratch, or worse, the decision gets reversed without anyone remembering why it was made.

A **decision record** is a short note capturing a significant decision:

- **Title:** the decision in a sentence. *No SMS reset for office workers.*
- **Context:** the situation and forces at play. *SMS codes can be intercepted through SIM-swap attacks; office workers all have the authenticator app.*
- **Options considered,** with their trade-offs.
- **Decision:** what was chosen, and by whom.
- **Consequences:** what follows, good and bad. *Frontline workers without company phones need another method.*
- **Status and date.** Proposed, decided, superseded (and by what).
- **Revisit date,** if the decision depends on something that might change.

Not every decision needs a record. Write one when the decision is **hard to reverse**, **likely to be questioned later**, **affects other teams**, or **was contested**. A useful test: would someone joining in six months benefit from knowing why?

> [!example] At Ashgrove
> Some of the decisions in ServiceHub's log: *Workday is the source of truth for identity* (three systems held conflicting job data). *Use the identity platform's access packages, not custom role tables.* *Create accounts three business days before the start date* (endpoint needs accounts to pre-enrol laptops). *Defer contractor lifecycle to Q1* (contractors aren't in Workday yet). Each takes five minutes to write and has already saved hours of re-debate.

### Decision rights

Many governance problems are really unclear decision rights: nobody knows who decides, so either nobody does or everybody does. Before contentious decisions, agree **who decides**, **who must be consulted** and **how disagreement is escalated**. Some teams use **DACI** (Driver, Approver, Contributors, Informed) for decisions specifically: the driver runs the process, one approver decides.

## RACI that works

Chapter 3 introduced RACI. Here's how to make it useful rather than decorative.

For each **activity or deliverable** (rows) and **person or role** (columns), assign:

- **R**esponsible: does the work. Can be several people.
- **A**ccountable: owns the outcome and has the final say. **Exactly one** per row.
- **C**onsulted: input sought before, two-way.
- **I**nformed: told after, one-way.

Check your matrix for common problems:

- **No A on a row:** nobody owns it, so it will drift.
- **More than one A:** two people think they decide, and they'll find out in an argument.
- **No R:** someone is accountable but nobody is doing the work.
- **Too many Cs:** every C is a meeting and a delay. Ask whether each is really needed before the decision, or could be an I.
- **A person with an A on everything:** a bottleneck, usually the sponsor. Delegate.

> [!example] At Ashgrove
> The first draft of the JML RACI had both Dana and Priya as **A** for "Define birthright access". Writing it down exposed the disagreement: Priya thought it was a technical configuration; Dana thought it was a security policy. The resolution: Dana is accountable for **which** access is birthright (a policy), Priya is accountable for **implementing** it, and they became two rows instead of one.

## Approvals and sign-off

Approvals are where governance becomes visible. To make them work without becoming a bottleneck:

- **Be clear what's being approved.** A specific version of a specific thing, not "the project".
- **Approvers see it before the request.** The formal request should be a formality (Chapter 10).
- **Set a due date.** Approvals without dates wait forever.
- **Record the outcome:** approved, rejected or changes requested, by whom, when, with comments.
- **Keep the trail.** Auditors don't just want to know that something was approved; they want to see who approved which version, when.

When approval chains are long, ask whether each approver adds information or just adds a signature. Approvals that exist to spread blame rather than to check something slow everyone down without reducing risk.

## Traceability: the audit's best friend

**Traceability** is the ability to follow the line from a need to its implementation and proof: business need → requirement → design/rules → stories → tests → test results → release → evidence in production. Forward (what implements this requirement?) and backward (why does this code exist?).

It matters for three reasons:

1. **Impact analysis.** When a requirement changes, traceability tells you which stories, tests and releases are affected (Chapter 10).
2. **Coverage.** Before release, you can see whether every requirement has a passing test.
3. **Audit.** When an auditor asks you to prove a control works, traceability is the proof.

### What auditors ask in IT

Internal IT is heavily audited, and the same few control areas come up again and again:

- **SOX IT general controls (ITGC):** for companies subject to Sarbanes-Oxley, controls over systems that affect financial reporting. Typically **access management** (joiners get appropriate access, movers lose access they no longer need, leavers are removed promptly, access is reviewed periodically, privileged access is restricted) and **change management** (changes are authorised, tested and approved before production; developers can't deploy their own changes unreviewed).
- **ISO 27001:** an information security management standard with controls covering access, change, supplier management, logging and more.
- **GDPR and other privacy law:** lawful basis, data minimisation, retention, subject rights, records of processing.

Notice how closely these map to IT product work. JML is literally an access management control. The CAB is a change management control. Leaver mailbox retention is a GDPR question.

> [!example] At Ashgrove
> Kim Lee (internal audit) asks for evidence that leavers lose access within one hour, as the control description states. With traceability in place, Jordan can show: **REQ-5** (Leaver deprovisioning: accounts disabled within one hour of the HR termination time), its source and rationale; the four **stories** that implement it; the **tests** that verify it, with results and dates; the **release** that delivered it, with its change approval; and the **production log** sample showing actual deprovisioning times. That's an evidence pack assembled in an hour rather than a fortnight of archaeology, and it's what makes "pass the audit without findings" achievable.

### Compliance as a source of requirements

Write regulatory and policy obligations as **requirements**, with the regulation or policy as their source and the accountable person (often the CISO, DPO or a control owner) as their owner. Then they go through the same lifecycle as other requirements: traced to stories, tested, released, evidenced. Compliance stops being a separate world and becomes part of the product.

## Proportionate governance

The test of good governance is **proportionality**: the effort matches the risk.

| Work | Appropriate governance |
|---|---|
| Copy change in the portal | Team decision; normal review |
| New feature, no controls affected | PO decision; decision record if contested; standard release |
| Change to access rules or audit controls | Decision record; accountable owner approves; traceability to tests; change approval |
| Change affecting regulation, contracts or several teams | Full change request; formal approvals; baseline update |

When governance is disproportionate, people route around it, which is worse than lighter governance that people actually follow.

## Common traps

> [!trap] Governance theatre
> Approval forms filled in after the work is done, decision logs written for the audit week, RACI charts nobody has read. They cost effort and provide no real control. If a governance step doesn't change any decision or catch any problem, question it.

> [!trap] Documentation after the fact
> Reconstructing traceability before an audit is miserable and unreliable. Capturing links as you work (story implements requirement; test verifies story) is nearly free.

> [!trap] Approvals as blame insurance
> Adding approvers so that "everyone signed off" spreads responsibility until nobody holds it. One accountable approver who actually reviews is worth five who skim.

> [!exercise] Prepare for an audit question
> Pick one control that applies to your product (for example "leavers lose access promptly" or "production changes are approved before deployment"). Try to assemble the evidence chain: the requirement, its source, the stories, the tests and results, the release and its approval, and evidence from production. Note every link you can't find. Those gaps are your governance backlog.

> [!try]
> [Decisions](tool:decisions) holds decision records with context, options, consequences and revisit dates. [RACI](tool:raci) flags rows with no accountable, more than one, or no responsible. [Approvals](tool:approvals) keeps sign-offs with due dates and an audit trail. [Traceability](tool:trace) shows the matrix from requirement to story to test to release, finds gaps, and runs impact analysis on any requirement. [Requirements](tool:requirements) records source, rationale and owner for each requirement, including regulatory ones.

## Check yourself

```quiz
Q: When should you write a decision record?
- For every decision the team makes
- Only for decisions made by executives
- * When the decision is hard to reverse, likely to be questioned, affects other teams, or was contested
- Only when an auditor asks
Why: Decision records are cheap but not free. Write them where the reasoning will matter to someone later; skip the trivial ones.
```

```quiz
Q: A RACI row has two people marked Accountable. What should you do?
- Leave it; shared accountability is good teamwork
- Make one of them Responsible instead, at random
- * Find out what each thinks they decide; often the row is really two different decisions that need splitting
- Add a third person as tie-breaker
Why: Two As signals a disagreement or a conflated activity. Splitting it into two rows, each with one accountable, usually resolves both.
```

```quiz
Q: What makes traceability most useful during an audit?
- A spreadsheet created the week before the audit
- * Links captured during normal work from requirement to story, test, release and evidence
- A long requirements document
- Screenshots of the production system
Why: Traceability captured as you work is nearly free and reliable. Reconstructed traceability is expensive, error-prone and less credible.
```
