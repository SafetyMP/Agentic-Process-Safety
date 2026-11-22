# Buyer and researcher walkthroughs

Use these sessions to decide whether the current experience helps a buying team act on a hold and a researcher design a defensible comparison. Run each task on the local branch so the participant sees the revision under review.

## Moderator setup

Use Node 22.18+ and npm. A first installation needs registry access or a populated npm cache. Record `git rev-parse HEAD`, run `npm ci` and `npm run demo:dev`, and open the local URL Vite prints. Use a fresh browser profile or private session for each participant. Start on **Start here**. Give participants only their task card and a blank sheet. Let them use the app and the user guide as they ordinarily would. Record which they consult and when. Use fictional purchasing information in notes and exports.

Ask both audiences, “Who handles this request in an ERP purchasing workflow? What work or decision changes when an agent can submit it?” Ask again at the end and keep both answers. During a task, use “What are you looking for?” or “What would you do next?” If someone stalls, record the last screen and what they expected before offering help.

## Buyer and planner task card

A requisition is waiting for a decision ahead of Thursday’s production run. Open the approval case and compare what happens to the request. Tell the next shift what happened, what remains open, and which records you would check. What does the displayed amount tell you?

The moderator will give you a fictional update. For that version of the case, use the worksheet to leave the next shift a decision, its reason, the person who should act, and when the team needs an answer. Choose the wording or worksheet option you would use at work. Export a discussion brief.

Give the brief to a colleague who did not see the exercise. Ask them to explain what already happened, who should do what next, and what would justify releasing or closing the requisition.

## Moderator slips for the buyer

Give only the buyer task card and one slip. Each slip is an alternative version of the opening case. After collecting the first brief, start a fresh session and recreate the same 61-second input before revealing the other slip. A brief includes all retained comparisons and notes in its session. Label each export externally with the session and slip name.

- **Inbound delivery.** The planner confirms that a separate inbound order will arrive Wednesday and covers Thursday’s requirement.
- **Uncovered demand.** The planner confirms a shortage for Thursday. The supplier confirms the quote and lead time. Finance has supplied no newer approval for this request.

## Researcher task card

You want to study how approval expiry affects purchasing. Write a prediction and define one observation. Use the opening case to compare approval ages of 59, 60 and 61 logical seconds. Keep a record another researcher could use to reproduce the comparison. What did you hold fixed? What changes if you run the same input twice?

| Approval age | First bundle, decision and order count | Second bundle, decision and order count | Retained comparison ID |
| --- | --- | --- | --- |
| 59 | | | |
| 60 | | | |
| 61 | | | |

Find a related recorded event in **Evidence**. Give a colleague its trial identifier, what happened in that trial, and which conclusions can be drawn from it. Starting from the user guide, find one command to check the recorded snapshot in a fresh checkout. Describe what a fresh experiment would add.

Design a comparison with buyers using ERP in the field. Name the unit, comparator, information and policy available to each group, a measurable outcome, and what you would do with a hold still open at the end. Which of your proposed measures would require observations outside APS?

## Moderator observations and decision

Alternate which buyer slip comes first across participants. Ask the colleague to interpret each brief independently, without the task card. For the researcher, collect the table and trial reference before discussing expected results.

| Check | What to look for after the task |
| --- | --- |
| Buying decision | The 300 is modeled spend. B executes one order and C holds at 61 seconds. The deadline and stock information came from the card. Inbound delivery supports reconciling the inbound order and closing the duplicate need. Uncovered demand supports checking order history and obtaining current authority before another release. Credit another decision if the participant names the evidence that justifies it. |
| Handoff | Can the colleague recover the disposition, owner, deadline and outstanding evidence from each brief? Record any difference between what the author intended and what the reader understood. Note if a suitable decision fit only in free text. |
| Boundary comparison | Both bundles evaluate the same agent request at each age with the amount and baseline held fixed. B permits one modeled order in all three runs. C permits one at 59 and blocks with zero at 60 and 61. A deterministic repeat adds no independent requisition. |
| Evidence | The browser comparison has its own ID. The stale-approval trial has a case identity, configuration and ledger sequence. A snapshot check validates the recorded selection. A new runtime execution produces new evidence. Neither browser lane represents an observed human buyer. |
| Field design | Look for comparable requisitions and a common approval rule, records and decision rights. Ask how expired releases per attempted release, buyer minutes per requisition, or time from hold to resolution would be measured. Keep unresolved holds in the analysis and record urgency or lead-time differences. |

Use one row per observed task. Record unaided, completed after a prompt, or blocked. Keep participant wording distinct from the moderator’s interpretation.

| Session / role / revision | Task and outcome | Observed action or quote | Help or source used | Artifact or discrepancy |
| --- | --- | --- | --- | --- |
| | | | | |

Debrief with “What would you keep, and what made the decision harder?” If the buyer reaches a defensible decision but the recipient cannot recover it, investigate the worksheet and export together. If a researcher can explain the boundary but loses a retained run, investigate the comparison view. Record disagreements and successful paths alongside failures. Use the observations to prioritize changes after these sessions.
