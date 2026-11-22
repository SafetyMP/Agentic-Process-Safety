# Explore APS with one purchasing case

[Open APS at the site root](https://safetymp.github.io/Agentic-Process-Safety/) · [Short study](https://safetymp.github.io/Agentic-Process-Safety/#/study) · [Full workspace](https://safetymp.github.io/Agentic-Process-Safety/#/overview) · [Project vision](VISION.md) · [Documentation map](README.md)

## Start with the short study

APS opens the short study at the site root, including when you load `index.html`. Use `#/study` to link directly to it or return via the study navigation. The shared walkthrough follows a fictional need for 24 bearings by Thursday and a request for 300 simulated spend units.

1. **Follow the handoff.** Buyer-led ERP and agent-delegated purchasing can both automate approvals and order release, and both can act on stale facts. With delegation, a later worker can act on earlier workers’ results.
2. **Ask what happens when purchase is LATE.** The intent is one currently authorized order. Make a prediction before revealing the model result, then compare 59, 60 and 61 logical seconds of approval age. Both bundles evaluate the same agent request from the same starting state. B checks tool permission and spend. C adds lifecycle checks, including approval freshness.
3. **Record one proposed decision after the reveal.** As an executive, decide whether to sponsor a shadow pilot and give a stop condition. As a field manager, use a 60- or 61-second comparison where C holds the order. Select one fictional purchasing update and propose a disposition with evidence, an owner and a deadline. As a professor or researcher, interpret the timing boundary and name one limit or field observation. Review your summary and revise your decision if needed. The proposal stays with its comparison during the visit. Use **Back to comparison** to return to that approval age.

The source scenario **REF-008** is unverified. It asks whether a late purchase would use an expired supplier quotation and commit above the authorized price. The browser models the related finance approval age check. A current approval leaves quotation validity, stock and demand open. Expand **Sources and full workspace** after the reveal for the exact hazard, proposed control and frozen stale-approval trials (B sequence 14 and C sequence 15). Those trials are separate synthetic evidence. Recorded visitor decisions are proposals for discussion.

## Follow the opening case in Case Lab

Use the established workspace for all nine cases, retained comparisons and the full discussion and download tools. The audience sections below describe the detailed workspace tasks. APS runs in your browser without an account or API key. The browser model illustrates declared rules, and the Python/OPA research gateway runs separately. [Start here](https://safetymp.github.io/Agentic-Process-Safety/#/overview) · [Case Lab](https://safetymp.github.io/Agentic-Process-Safety/#/simulator) · [Hazard study](https://safetymp.github.io/Agentic-Process-Safety/#/hazop?hazard=APS-f47191931b96a999a61c) · [Controls](https://safetymp.github.io/Agentic-Process-Safety/#/governance?control=CTL-EXPIRY) · [Evidence](https://safetymp.github.io/Agentic-Process-Safety/#/assurance?story=stale)

### 1. Compare one request

From **Start here**, choose **Explore the approval case**. A purchase request for 300 sandbox units reaches the checks 61 logical seconds after approval. The declared approval rule requires an age below 60 seconds. These are illustrative inputs, not an imported historical transaction.

The Case Lab introduces two fixed control bundles:

- **B · Tool permission + spend limit** checks who may use the tool and whether the amount is within its limit.
- **C · Lifecycle checks added** also checks conditions connecting the request to its task, approval and workflow.

Optionally predict the result, then select **Run comparison**. Both lanes evaluate the same request from the same starting state. At 61 seconds, B permits the request and C blocks it at approval freshness. The display separates the invalid condition from the execution status: C holds the modeled boundary while the purchase remains outstanding.

Expand **Compare every modeled check** for reached and skipped checks, or include **A · no modeled checks** as another reference. B is this specific comparator; ordinary security designs can also implement expiry and other lifecycle checks.

### 2. Change one condition and inspect the path

Choose **Try 59 seconds**. This edits the draft and focuses the age input; it does not evaluate a new result. The previous comparison remains labeled with its original inputs until you select **Run comparison** again.

At 59 seconds, both B and C permit the request. The timing comparison explains that only approval age differs and that both runs started from the same modeled state. At exactly 60 seconds, C rejects the request because the fixed rule is *below* 60. Reading the page does not advance logical time.

**Follow the decision path** explains the assumed prerequisites, supplied condition, request boundary, branch decisions and remaining question. Select a stage to inspect its meaning. The path changes with the actual case and retained input; a current approval does not retain an “approval expires” story.

### 3. Form a position

Choose **Form a position**. The worksheet belongs to the selected comparison and retains its own recommendation, rationale, evidence, assumptions, open question and dissent.

Select **Recommended next action** to see what that choice calls for. A current approval leads to verifying business inputs; expired or missing approval raises authorization questions. Other cases lead to the relevant role, amount, delegation, receipt, provenance or objective question. Information-gathering actions add an explicitly unresolved question to the position. They do not fetch or verify new evidence.

Use **Attach this comparison’s decisive check** to append the actual modeled check and run identity without replacing your notes. Expand **Inspect supporting evidence** or **Record assumptions or disagreement** when needed. Explain the reason for the recommendation and what would change your mind. The position summary shows missing information rather than inventing it.

**Mark ready for discussion** requires a rationale. It invites review; it does not certify the evidence, complete every field or change either modeled outcome. Editing the position makes it a draft again.

## Review a held order with a buying team

From **Start here**, select **Prepare a shift handoff**, then **Run comparison** with approval age at 61. You can also select a retained result in Case Lab and choose the task under **Use this comparison**. The two fictional updates below apply when lane C holds the order at 60 or 61 seconds. At 59 seconds both bundles release the order, so reconcile whether the modeled order covers the requisition before considering another release. The request amount of 300 is simulated spend. The separate fictional requisition calls for 24 bearings at North assembly by Thursday at 08:00 plant time.

| Purchasing update | Evidence the buyer receives | A disposition to consider |
| --- | --- | --- |
| **Wednesday inbound confirmed** | The receiving desk confirms inbound PO-417. Planning has reserved its 24 bearings for Thursday. | Reconcile the inbound order and propose closing the requisition. Give the next shift a checkpoint in case the delivery slips. |
| **Thursday requirement uncovered** | The planner reports no covering inbound. A supplier can meet the need if the buyer orders before the Tuesday quote cutoff. | Check order history, confirm the current terms and seek renewed authority. Identify who will escalate if the cutoff is at risk. |

Choose **Proposed disposition** and record the **Action owner**, **Due by**, evidence, next checkpoint, escalation condition, and reason or dissent. **Preview this shift handoff** shows what the next shift will read. **Download selected handoff** exports the selected comparison, lane C, fictional update and its proposed action. Each update has its own draft, so you can return to the other ending and recover its notes. The purchasing records are discussion material. Selecting an update leaves the modeled order counts and spend fixed.

For a second exercise, choose **Practice a missing order acknowledgment** and run the replay case. The team inbox lacks a reply and the supplier ledger still needs reconciliation. Tell the next shift what record would establish whether the original order exists and when to escalate an uncertain outcome.

## Prepare a sponsor decision

Choose **Decide on a purchasing pilot** and run the opening comparison. Use the pilot form to propose a shadow evaluation at one site, defer pending evidence, or retain the current workflow. In a shadow pilot, staff would compare recommendations with buyer-led ERP purchasing under the same approval policy and records. Buyers would retain release authority.

Identify the site and category, sponsor, policy and renewal owner, material availability owner, stop condition, and next review date. Describe the trade-off and what evidence would change the decision. The scorecard suggests a source and owner for each field measure, including expired releases per attempted release, buyer minutes per requisition, time a shortage stays open, and material covered by the need date. Set the observation window and owners for the proposed pilot.

**Estimate the cost of a hold** accepts handling minutes, hourly labor cost, and expedite cost in one currency. For example, 15 minutes at 40 per hour plus 20 for expediting gives 30 currency units per hold. Those inputs are assumptions to discuss. Actual cost and service impacts require field observations. Use **Preview sponsor brief** and **Download sponsor brief** to share the decision for this comparison.

## Design a supply chain study

Choose **Reproduce or teach the case**. State a prediction, then run the opening case at 59, 60 and 61 logical seconds. Record the amount and baseline. **Download browser comparison CSV** exports B and C rows for retained original expiry comparisons, including the run and request IDs, build, model version, baseline, age, spend, decision and modeled order count. A repeated input reproduces a deterministic answer and adds no independent requisition.

Expand **Replication instructions and variable dictionary** to find the expected outputs, frozen selection and source command. **Download recorded pair CSV** exports the related synthetic B and C trial records. Inspect **000-stale_approval**, B sequence 14 and C sequence 15, by case digest, configuration and record hash. The browser ID identifies a local comparison. The trial sequence identifies an event record in the separate frozen experiment. Match these sources by the question they examine.

From the matching checkout, `npm run demo:fixtures:check` checks the public snapshot hashes and relationships. To generate fresh runtime evidence, use the research setup and verification commands. [Experiment operations and recorded evidence](PHASE3_OPERATIONS.md)

Open **Plan a field comparison** for the field-study worksheet. Specify eligibility, urgency, supplier lead time, assignment or matching, and a common approval policy for one requisition as the unit of analysis. Include unresolved holds at the end of observation. Record material available by its need date separately from order release.

## Teach the purchasing case

Under **Reproduce or teach the case**, open **Teach the case** and share **Open learner task** from the build used in class. Students can download a blank learner sheet and record predictions before entering Case Lab. The downloadable instructor guide includes the answer key, timing, debrief prompts and scoring rubric.

Allow 20 minutes. Collect predictions, run the three timing comparisons, then assign one fictional purchasing update to each team. Have students exchange shift handoffs and defend a disposition using the cited record. Ask what would change their decision, then transfer the exercise to a missing purchase acknowledgment. Score the explanation, cited evidence, alternative interpretation and conditions that would change the recommendation.

## What the five views do

| View | Use it to | Return with |
| --- | --- | --- |
| **Start here** | Understand the permission-versus-process question, coordinated task and opening case | A concrete request to compare |
| **Case Lab** | Compare, inspect, vary approval timing and retain a position | An explanation and a proposed next investigation |
| **Hazard study** | Inspect the related finding, then optionally search all 96 screening entries, the node × deviation matrix or 16 authored scenarios | A possible deviation and its assumptions, not a verified risk rating |
| **Controls** | Inspect the mapped condition, implementation/test links, authority and gaps | What the control checks and what remains outside it |
| **Evidence** | Separate the selected browser comparison from frozen experiments; inspect the decisive recorded event before the full paired trace, replay or ledger | A source-supported observation and its limits |

Supporting pages explain whether the inspected source relates to the current case. **Return to your reasoning** navigates back to the worksheet; it does not copy the source into the position. In Evidence, the separate recorded-event attachment action appends its trial identity and observation when it matches a retained, evaluated comparison and the draft inputs have not changed. Attaching evidence preserves notes and resets readiness. A related trial remains distinct from your browser run.

## The nine cases

| Case | Condition under inspection | Relevant next question |
| --- | --- | --- |
| A currently authorized purchase | Passing declared checks | Are the quotation, stock record and demand correct? |
| A supplier attempts a purchase | Actor/tool scope | Which authorized role should submit the request? |
| Excessive spending | Spend ceiling | What quantity, quotation and budget support the amount? |
| Recursive delegation | Bounded delegation depth | Who owns completion and what stops the chain? |
| Missing approval | Matching finance approval | What authority is needed before another attempt? |
| Replay attempts | Reused request identity | What receipt or authoritative state establishes the prior outcome? |
| Purchase after approval expiry | Approval age below 60 logical seconds | What current authorization and business evidence justify another attempt? |
| Conflicting agent objectives | An unresolved objective conflict | Who can resolve the trade-off and on what evidence? |
| Context belongs to another task | Task/context binding | Which trusted source establishes the correct task and information? |

Only the approval-expiry case exposes editable timing. Other presets hold request fields fixed so you can inspect their condition. Normal, unauthorized and approval-expiry comparisons include bounded illustrative purchase effects; downstream business effects for the other cases remain unmodeled. The recorded context case operates at demand, while its browser illustration operates at purchase. The recorded goal-conflict case measures a budget violation, not successful arbitration.

## Explore a hypothetical fresh approval

For an eligible denied approval-expiry comparison, choose the recommendation to obtain a new matching approval. **Explore a fresh-approval request** creates a separate hypothetical child with a new request identity and starts both lanes from C’s unchanged no-effect state. Restore the selected comparison’s inputs first if the draft has changed.

This preserves the denied parent and its discussion. It does not continue B’s already executed purchase, issue a real approval or demonstrate recorded recovery. Renewing approval does not establish quotation validity, stock truth or whether the purchase is needed. A 59-second comparison does not offer renewal as its new primary recommendation.

## Keep, revisit and share reasoning

Use **Selected comparison** or **Compare with a retained run** to revisit earlier snapshots. Each run keeps its own inputs, prediction and worksheet. Comparing different cases is not evidence that approval age alone caused their difference.

Under **Keep or export this discussion**:

- **Save in this browser** writes an explicit local copy. Later edits require saving again.
- **Load saved session** asks before replacing the current in-memory session.
- **Download discussion brief** produces Markdown; **Download session JSON** retains structured session data. Both include retained comparisons, discussion notes and entered audience drafts. Use **Download selected handoff** or **Download sponsor brief** when the recipient needs only that task.
- The **configuration-only link** carries the draft’s case and bounded inputs. It carries no notes, outcomes or approvals and does not turn them into recorded evidence.
- **Delete browser copy** leaves the current in-memory session intact. **Clear current session** leaves a separately saved browser copy intact. Both ask for confirmation.

Notes are otherwise held in memory and can be lost when the page is reloaded or closed. Browser-local storage is not a shared workspace or a secure evidence repository. Do not put private operational data into a discussion intended for sharing.

## Read the result at the right level

An executed modeled action is not proof of a completed procurement process. A blocked action is not proof that the system is safe. A proposed requirement is not an approved requirement, and a recorded event is not the same as a new browser request. The useful output is a traceable explanation of what happened in the model, what evidence supports that interpretation, and what people still need to decide.

For implementation details, see the [browser domain reference](../apps/aps-demo/src/domain/README.md), [fixture provenance](../apps/aps-demo/src/fixtures/README.md) and [research methodology](METHODOLOGY.md). Report problems through [Support](../SUPPORT.md).
