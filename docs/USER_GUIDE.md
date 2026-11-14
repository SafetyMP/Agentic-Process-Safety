# Explore APS: from comparison to a position

[Open the live app](https://safetymp.github.io/Agentic-Process-Safety/) · [Project vision](VISION.md) · [Documentation map](README.md)

APS runs entirely in your browser. It needs no account or API key and sends no discussion notes to a server. The browser model illustrates declared rules; it does not execute the Python/OPA research gateway, buy stock, issue finance approval or establish production safety.

## Follow the opening case

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
- **Download discussion brief** produces Markdown; **Download session JSON** retains structured session data. Both contain the retained comparisons and local free-text reasoning.
- The **configuration-only link** carries the draft’s case and bounded inputs. It carries no notes, outcomes or approvals and does not turn them into recorded evidence.
- **Delete browser copy** leaves the current in-memory session intact. **Clear current session** leaves a separately saved browser copy intact. Both ask for confirmation.

Notes are otherwise held in memory and can be lost when the page is reloaded or closed. Browser-local storage is not a shared workspace or a secure evidence repository. Do not put private operational data into a discussion intended for sharing.

## Read the result at the right level

An executed modeled action is not proof of a completed procurement process. A blocked action is not proof that the system is safe. A proposed requirement is not an approved requirement, and a recorded event is not the same as a new browser request. The useful output is a traceable explanation of what happened in the model, what evidence supports that interpretation, and what people still need to decide.

For implementation details, see the [browser domain reference](../apps/aps-demo/src/domain/README.md), [fixture provenance](../apps/aps-demo/src/fixtures/README.md) and [research methodology](METHODOLOGY.md). Report problems through [Support](../SUPPORT.md).
