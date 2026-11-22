# Walkthroughs for supply chain audiences

Use these tasks to observe how executives make a pilot decision, field managers hand off a held order, and researchers or professors reproduce or teach the result. The outputs give a second reader something concrete to interpret. The activities below are a proposed study protocol.

## Moderator setup

Run the checkout under review with Node 22.18+ and npm. A first installation needs registry access or a populated npm cache. From the repository root run `npm ci` if dependencies are missing, then `npm run demo:dev`. Record the URL, `git rev-parse HEAD`, and the build identifier in the app footer. Use that installation for the task cards, handoffs and learner links. Start each participant in a fresh browser session with fictional notes.

Give each participant only their task. Ask what they would do in their own ERP workflow and what work changes if an agent can submit the order. Capture their answer before and after the exercise. For the academic tasks, collect predictions before showing the guide or answer key. Note time, prompts, misunderstandings and which sources participants opened. If they stall, ask what they expected to find before offering help.

## Field manager task

A requisition needs a decision before Thursday’s assembly run. Open **Prepare a shift handoff**. Run the 61-second case and explain what happened in each lane, what quantity the site needs, and what the 300 measures.

Give the manager one update at a time. Counterbalance the order across participants. Use the same retained comparison for both endings. Keep the second ending out of the discussion until the first brief has been exported.

- **Wednesday inbound confirmed.** Work out whether the planned delivery covers the need. Record the decision, next action, owner, timing, record and escalation condition. Preview and download the selected handoff.
- **Thursday requirement uncovered.** Examine the material plan, quote, cutoff and approval status. Prepare the next shift’s handoff for this version. Switch back to check the first handoff.

Give each export to a colleague who did not see the exercise. Ask them to name what already happened, what remains open, which record they will check, who acts and by when. Repeat on a narrow screen. For transfer, ask the participant to run the missing-acknowledgment case and identify the evidence required before a retry.

## Executive task

Your team is considering delegated purchasing at one site. Take three minutes to examine the opening case and prepare a proposal for another director. Choose whether to evaluate in shadow mode, defer pending evidence, or retain the current workflow. Set the scope, accountable sponsor, authority, review date and condition that would cause someone to pause.

Ask the director to preview and export the sponsor brief. Give it to a colleague who did not attend. Ask which decision is sought, which policy both groups would use, who can release an order and who can pause the work. Ask which measure would expose an expensive hold and where the data would come from. If the participant entered cost assumptions, ask the reader to identify those assumptions and explain the separate modeled spend figure.

## Researcher task

Write a prediction and define one observation. Under **Reproduce or teach the case**, compare ages of 59, 60 and 61 logical seconds. Export the browser comparisons and the recorded pair. Give a peer the files, build identifier, model version and directions to the recorded event. Ask them to reproduce the boundary and identify what is held fixed. What does an extra click at 61 add?

Starting from the replication instructions, find the snapshot check and explain what a fresh gateway experiment would add. Use the field-study worksheet to design a comparison with buyer-led ERP. Choose the unit, common policy, information and authority, observation window, outcome, treatment of open holds and likely confounders. Identify which measurements would require purchasing records or observations outside APS.

## Professor and learner task

Ask the instructor to give students the learner URL or prediction sheet before opening the instructor guide. Collect predictions and an explanation, then allow 20 minutes for the activity. Assign one purchasing update to each group. After students exchange briefs, ask them to defend their disposition to a group with the other update. Give them the missing-acknowledgment case and ask what they would check before another purchase attempt.

Collect the initial predictions, the two handoffs and a response to the transfer question. Ask the instructor to use the rubric and identify where students attributed a result to finance authority, material availability or human judgment. Ask how much setup they needed and what they would change for their own class.

## Moderator observations

| Task | Evidence to look for |
| --- | --- |
| Field decision | The participant identifies 24 physical bearings and 300 simulated spend units. Lane B creates one order and C holds. The inbound and uncovered records can justify different dispositions for that same hold. Credit another decision grounded in the supplied evidence. |
| Shift handoff | A reader recovers disposition, owner, due time, next checkpoint and outstanding evidence from each selected handoff. Switching updates preserves the first draft. For replay the participant asks about the original order or receipt. |
| Sponsor brief | A colleague recovers pilot disposition, comparator, scope, accountable people and a stop or review trigger. The reader distinguishes a proposed field measure or cost assumption from a modeled observation. |
| Replication | The browser data has one B and one C row per original expiry comparison. B yields one order at each age. C yields one at 59 and zero at 60 and 61. The peer uses recorded pair B #14 / C #15 and its case digest for a separate question. |
| Field-study design | The proposed comparison keeps the policy and information comparable, defines numerator and denominator, and accounts for unresolved holds, urgency and lead time. |
| Teaching | Students identify the decisive condition, cite a record, give an alternative explanation and say what evidence would change the recommendation. On transfer they identify the need to reconcile the previous purchase. |

For a first formative round, aim for five people per audience and include both research and teaching faculty. A proposed target is four of five completing the audience’s core task unaided. Report the actual counts for each task, including separate researcher and instructor counts. Investigate consequential misunderstandings even when the group meets its target.

| Session / role / build | Task and elapsed time | Outcome (unaided, prompted, blocked) | Observed action or quotation | Handoff discrepancy or follow-up |
| --- | --- | --- | --- | --- |
| | | | | |

Record participant words separately from moderator interpretation. Revisit the screen or export where a handoff failed. After revision, repeat the same task with a new reader and note the build tested.
