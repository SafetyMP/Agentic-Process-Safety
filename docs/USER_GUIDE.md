# Explore the bearings case

Requisition **REQ-218** calls for 24 bearings by Thursday at 08:00. Follow the planner, buyer and finance approver as they establish the need, supplier terms and spending authority. Then examine what happens when someone else releases the order later. [Open the case](https://safetymp.github.io/Agentic-Process-Safety/#/study)

## Understand what is at stake

A planner checks the need date and stock position. A buyer reconciles any open order, obtains a quote and asks finance to authorize the purchase. Under the buyer-led workflow a person can investigate changes before the order goes out. The agent in the case inherits evidence from these earlier steps. While it waits, authority can expire even though the purchasing tool remains available. A pause protects the spend but leaves a question for the next shift. Where will the bearings come from?

To judge whether the issue warrants investment, find out how often approvals expire before release, how long buyers spend on exceptions and whether enough bearings are available by the need date. The modeled deadline and order amount cannot supply those site measurements. [How the bearings reach the line](https://safetymp.github.io/Agentic-Process-Safety/#/study?section=case-workflow) · [What changes while the request waits?](https://safetymp.github.io/Agentic-Process-Safety/#/study?section=case-problem)

## See the decision at release

The order diagram follows a late release and a hold from finance approval to Thursday at 08:00. Read down each path for the buyer’s and planner’s next steps. Try either stock record to see how many of the 24 bearings the crew could draw. Both are hypothetical receiving outcomes. The HAZOP worksheet then uses the guide word **LATE** on the purchase step. REF-008 raises an expired supplier quotation. The timing exhibit takes up a second question about finance approval. [Order diagram](https://safetymp.github.io/Agentic-Process-Safety/#/study?section=case-problem) · [HAZOP worksheet](https://safetymp.github.io/Agentic-Process-Safety/#/study?section=case-hazop)

Try an approval age of 59, 60 or 61 logical seconds. The order amount, permission and spending limit stay fixed. At 59 seconds both rule sets release the order. At 60 seconds the rule that checks approval age holds it, while the permission-and-spend rule still releases it. At 61 the difference persists.

In the worksheet for REQ-218, choose Tuesday 13:55 or 14:05. Quote Q-82 expires at Tuesday 14:00. The APS exhibit carries that choice forward. Choose 14:05 and an approval age of 59 seconds to see a release on fresh finance authority with expired supplier terms. At 13:55, set the approval age to 60 seconds to see APS hold the purchase while the quote is current. The buyer handoff carries forward the selected Thursday stock record and identifies the supplier acknowledgment, authorized price, arrival date and allocation of all 24 bearings to verify.

## Explore the investment

The release choice for REQ-218 carries into the buyer’s time chart. Start with 12 minutes of buyer-led work and subtract 2 minutes for review. A release also needs 4 minutes for reconciliation, leaving 6 minutes freed. A hold needs 7 minutes of follow-up, leaving 3. These are illustrative active-work estimates. Select a share of holds across the site’s 200 monthly requests to see the weighted average. At 50% held and $40/hour, 4.5 minutes saved per request cover $7,200 in first-year costs. [Assumptions and calculation](BUSINESS_CASE.md)

## What would you do?

The final decision recalls the order outcome, finance approval age, quotation, Thursday stock and chosen site mix. Try each response to see what it would mean for requests like REQ-218. To justify a four-week shadow pilot, look for recurring buyer work beyond what an ERP approval rule would address, a credible route above break-even, and receipts and allocations to track service by the need date. Price the pilot separately. Buyers retain release authority. [Discuss the case](AUDIENCE_WALKTHROUGHS.md)

## For IT implementation

The workspace opens at **Trace REQ-218 through APS** with the approval age, quote time and Thursday stock record selected in the case. Follow the modeled purchase request, the freshness check and the unsigned receipt excerpt. At 59 seconds the adapter creates one illustrative order and records 300 simulated spend units. At 60 or 61 seconds the check denies the purchase and spend stays at zero. **Change the release timing** takes you back to try another age.

Under **Inspect the recorded purchase calls**, switch between **B · Trial 14** and **C · Trial 15**. The table keeps the selected browser case beside each trial’s recorded approval age, decision and adapter execution. Both trials used an approval age of 61 seconds. The record details identify their shared case digest and each trial’s record hash. The published trial data omit raw signed receipts.

Choose **Copy comparison link** next to the trial selector, or copy the current IT workspace address. Opening that link or refreshing restores the approval age, quote time, Thursday stock record and recorded trial. These two links open the states used to check the published workspace.

| Comparison | What to look for |
| --- | --- |
| [Release at 14:05 · trial 14](https://safetymp.github.io/Agentic-Process-Safety/#/overview?age=59&quote=14%3A05&stock=0&trial=14) | At 59 seconds APS releases the order. Q-82 has expired and the selected Thursday record shows 0 of 24 bearings available. Trial 14 also executed, using 61-second-old approval under bundle B. |
| [Hold at 13:55 · trial 15](https://safetymp.github.io/Agentic-Process-Safety/#/overview?age=61&quote=13%3A55&stock=24&trial=15) | At 61 seconds APS holds the order. Q-82 is current and the selected Thursday record shows all 24 available. Trial 15 also denied the purchase under bundle C. |

Open **Inspect the request and policy contract** for the sample request, the fields in `purchase_binding`, the admission-time expiry check and the Rego rule that consumes `approval_ok`. Then open **Trace the HAZOP finding to the control**. REF-008 describes a late purchase on an expired supplier quote. Its proposed “Expire quotations” requirement maps to `CTL-EXPIRY` v1. Trials 14 and 15 exercise finance-approval freshness. To establish the supplier price still held, the site would need evidence about the quote itself.

Below the inspector, the release path and test matrix show where to enforce the check and how to test expiry and approval mismatch. **Verify the control in the repository** links the research source and focused expiry tests. [Implementation workspace](https://safetymp.github.io/Agentic-Process-Safety/#/overview) · [Research gateway architecture](GOVERNANCE_ARCHITECTURE.md) · [Development reference](DEVELOPMENT_REFERENCE.md)
