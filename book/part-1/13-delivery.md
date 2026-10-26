---
id: delivery
title: Delivery, quality and release
part: craft
minutes: 18
summary: The PO and BA during build, testing from requirements, UAT that isn't a first look, defects as feedback, operational readiness, IT change management and rollout.
tools: [uat, releases, trace, raid]
---

Once work is in delivery, it's tempting for POs and BAs to step back. The requirements are written, the team is building, and there's a backlog to refine and stakeholders to manage. But many of the most consequential product decisions happen during delivery: what to do when a story turns out bigger than expected, whether a defect blocks release, whether the service desk is ready, whether to roll back.

This chapter covers your role from "the team starts building" to "it's live and stable".

## During the build

Your most valuable contribution during a sprint is **availability**. Developers and testers will have questions, and the cost of a question waiting a day is a developer guessing, building the wrong thing, or switching to something else. Good habits:

- **Answer questions within hours, not days.** Block time for it. If you can't, delegate to someone who can, and tell the team who.
- **Look at work as it's built,** not just at the end of the sprint. A quick look at a half-built screen catches misunderstandings while they're cheap.
- **Don't add scope mid-sprint.** If something new is urgent, swap it for something of similar size, openly, with the team.
- **Accept or reject promptly** against the acceptance criteria. "Done but not accepted" items pile up and hide problems.
- **Record decisions as you make them.** The small decisions made in conversation during build ("let's show the error inline, not as a popup") are exactly the ones nobody remembers later.

## Testing from requirements

Testing isn't only the testers' job. POs and BAs contribute the most important thing: **knowledge of what should happen**, including the cases nobody thought to build.

Good requirements make test design straightforward:

- Each **acceptance criterion** becomes at least one test.
- Each **rule in a decision table** becomes a test, and gaps in the table become questions before testing starts (Chapter 9).
- Each **state transition**, including the ones that shouldn't be possible, becomes a test.
- Each **exception** found during elicitation (rehires, movers mid-leave, missing job codes) becomes a test.
- Each **non-functional requirement** needs a way to measure it: a performance test, a security check, an accessibility audit.

Trace tests back to the requirements they cover. Then you can answer two questions that matter enormously at release time: **Is every requirement tested?** and **If this test fails, which requirement is at risk?**

## User acceptance testing

**User acceptance testing (UAT)** is where real users or their representatives confirm the change works for their needs, in conditions close to real life. It's the last check before release, and it's often done badly.

### UAT done badly

The typical failure: UAT is the first time business users see the solution. They find that it doesn't match how they work, not because of bugs but because of misunderstandings that were baked in months ago. Now everything is late and expensive to change.

### UAT done well

- **Users have seen it before.** Through demos and early previews during build, UAT should be confirmation, not discovery.
- **Clear scope and entry criteria.** What's being tested, which environment, what data, what must be true before UAT starts (system tests passed, environment stable, test data loaded).
- **Realistic scenarios,** written with or by users, based on real cases. "Process a joiner" is weak. "Maria starts in Sales on 6 January with job code S-204; her manager is on leave; she was a contractor here last year" is strong.
- **The right testers:** people who do the work, including the awkward cases. A warehouse shift lead, not their manager.
- **Clear exit criteria.** What pass rate, which severity of open defects is acceptable, who signs off.
- **Recorded results.** Who tested what, when, with what result. In audited environments, this record is evidence.

> [!example] At Ashgrove
> For SSPR, UAT included office staff from Finance (who had been in the pilot) and, crucially, three warehouse associates testing badge-and-PIN unlock on a real shift scanner at 5:45 a.m. They found that the scanner's on-screen keyboard covered the PIN field, a problem invisible in the office test environment. Fixed in two days, before release rather than on 1,000 shift workers' first morning.

### Test data in IT

Internal systems often lack good test environments. Ashgrove has no test environment for the Workday integration, so changes are tested on real hires. That's a risk to record (RAID), a reason for technical debt work, and a constraint on how you design tests (smaller changes, feature flags, careful monitoring). Know your test environment limitations before you plan UAT around them.

## Defects as feedback

Defects will be found. How you handle them says a lot about the team.

**Triage** each defect on two dimensions:

- **Severity:** how bad is the effect? (S1 critical: no workaround, major impact. S4 trivial: cosmetic.)
- **Priority:** how soon must it be fixed? A low-severity defect on the CEO's sign-in screen may be high priority.

**Classify root causes,** at least roughly: requirement, design, code, environment, data. Then look at the pattern. If a large share of defects trace back to **requirements** (missing exceptions, ambiguous criteria, misunderstood rules), that's direct feedback on your work as a PO or BA. It isn't a reason for blame; it's information about where to invest more effort next time.

> [!tip] Track requirement defects honestly
> Teams often classify everything as "code" because it's comfortable. A defect where the code does exactly what the story said, but the story was wrong, is a requirement defect. Counting them honestly is how you improve elicitation.

## Operational readiness

Software being finished doesn't mean the change is ready. In IT, a release is ready when **the organisation is ready to run it.** Check:

- **Support:** does the service desk know what's changing, what users will ask and how to help? Are knowledge articles and scripts updated? Was there a walkthrough?
- **Runbooks:** do operators know how to monitor it, what alerts mean and what to do when it fails?
- **Monitoring and alerting:** will you know if it breaks before users tell you?
- **Access and accounts:** are service accounts, permissions and secrets in place for production?
- **Communications:** do affected users know what's changing, when, and why it's good for them?
- **Training:** for changes to how people work, has anyone shown them?
- **Rollback:** if it goes wrong, how do you undo it, how long does that take, and who decides?

## IT change management

Most IT organisations control production changes through a change management process, often with a **change advisory board (CAB)**. Its purpose is reasonable: reduce the risk that a change breaks something important. Working with it well is part of the job.

- **Know the change types.** *Standard* changes are pre-approved, low-risk and repeatable. *Normal* changes need assessment and approval. *Emergency* changes are for fixing urgent problems and get expedited review.
- **Aim for standard changes.** If your releases are frequent, small, tested and easily rolled back, work with the change manager to get that type of release pre-approved. This is often the single biggest lever for releasing faster in IT.
- **Bring evidence, not reassurance.** Test results, rollback plan, monitoring, the release window, who's on call. CAB members are assessing risk; give them what they need.
- **Watch the change failure rate.** The percentage of changes that cause an incident or rollback. Ashgrove's is 18%, which is one reason the CAB is cautious. Smaller, better-tested releases bring it down, and that buys trust.

> [!example] At Ashgrove
> Noah Williams chairs Ashgrove's CAB. Rather than presenting SSPR as one big change, Alex and Priya propose a wave plan: Finance (pilot users) in week 1, all office staff in week 2, warehouse sites one at a time in weeks 3–5. Each wave has explicit rollback criteria: more than 2% of reset attempts failing, or more than 20 related tickets in a day. Noah approves the plan once, and each wave goes through as a standard change.

## Rolling out

How you release matters as much as what. Options, roughly from least to most cautious:

- **Big bang:** everyone at once. Simple; risky for anything significant.
- **Phased by group:** department by department, site by site. Common and sensible in IT.
- **Pilot then wave:** a friendly pilot group first, then waves with checkpoints.
- **Feature flags:** deploy the code to everyone, but turn the feature on for chosen groups, and off instantly if needed.
- **Parallel run:** old and new side by side for a period, comparing results. Expensive, but sometimes necessary for critical processes.

Define **rollback criteria in advance**: the measurable conditions under which you stop or reverse. Decided beforehand, they're objective. Decided during an incident, they're a debate.

### Hypercare

After go-live, plan a period of **hypercare**: extra support, daily check-ins, the team watching metrics and tickets closely, quick fixes prioritised. A week or two for most changes; longer for big process changes. Hypercare ends with an explicit handover to normal support.

## Release notes for different readers

Like stakeholder updates (Chapter 4), release notes need different versions:

- **For users:** what's new for them, in their language, and what to do. One screen, not a changelog.
- **For the service desk:** what changed, what users will ask, known issues and workarounds.
- **For technical teams:** the detailed changes, configuration, dependencies.
- **For audit and governance:** which requirements and controls are affected, with traceability to tests and approvals.

## Common traps

> [!trap] UAT as the first look
> If business users first see the solution in UAT, it's not acceptance testing; it's discovery, at the most expensive moment. Show work early and often.

> [!trap] Release equals done
> The release is when you start learning whether it worked (Chapter 15). Plan the measurement before you release.

> [!trap] Forgetting the service desk
> The fastest way to make a good change look bad is to have the service desk find out from the first confused caller.

> [!exercise] Readiness review
> For your next release, write the operational readiness checklist above as questions and get a named person to answer each one. Write rollback criteria with numbers. Write the four versions of the release notes. Notice which questions nobody can answer yet. Those are your risks.

> [!try]
> [UAT & quality](tool:uat) holds test cases traced to stories and requirements, records who ran what with which result, and analyses defects by root cause. [Releases](tool:releases) has a launch-readiness checklist, rollout plan, rollback criteria and release notes generated per audience. [Traceability](tool:trace) shows whether every requirement has passing tests before you release.

## Check yourself

```quiz
Q: In UAT, business users discover the access request flow doesn't match how approvals really work. What does this most likely indicate?
- The testers need more training
- The code has bugs
- * The users weren't involved early enough, so a misunderstanding survived until UAT
- UAT should be cancelled
Why: UAT should confirm, not discover. Finding fundamental mismatches there means feedback loops during discovery and build were missing.
```

```quiz
Q: Many defects in your last release were cases where the code did exactly what the story said, but the story was wrong. How should they be classified?
- As code defects, since the code was changed to fix them
- * As requirement defects, which is useful feedback on elicitation and acceptance criteria
- As environment defects
- They aren't defects
Why: Honest root-cause classification shows where quality problems start. Requirement defects point to improvements in how you elicit and specify.
```

```quiz
Q: What's the best way to make frequent releases acceptable to a cautious change advisory board?
- Release outside the CAB process
- Bundle changes into fewer, larger releases
- * Make releases small, tested and easily rolled back, and agree with the change manager to treat that pattern as a standard change
- Escalate to the CIO
Why: Standard changes are pre-approved because they're low-risk and repeatable. Earning that status through evidence is the sustainable way to release more often.
```
