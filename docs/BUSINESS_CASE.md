# The bearings case for change

Thursday’s assembly run needs 24 bearings. The planning record gives the quantity and need date. The buyer needs to know how much stock is available and whether another order is already on its way. Sourcing supplies the quote. Finance approves the supplier, quantity and spend for a proposed purchase of 300 simulated units. Only after purchasing releases the order can the supplier act on it. Receiving later records the quantity delivered. [Explore the bearings case](https://safetymp.github.io/Agentic-Process-Safety/#/study)

## Where the current process can break down

A buyer working through an enterprise resource planning (ERP) system can reconcile those records and handle exceptions. Delegation changes who is present at the last handoff. An agent can receive a complete-looking request with an earlier approval, permission to order, and enough budget. While the request waits, finance’s authority to buy can expire. The assembly schedule keeps running.

Releasing the request could commit money after authority expires. Holding it could leave the next shift with an uncovered requirement if no stock or inbound order covers the bearings. The model has no site receipt or production record to settle those outcomes. Purchasing needs current authority when placing the order. Assembly needs the material when the line is due to run.

**Establish the baseline.** For one category and observation window, match requisitions to approval and release timestamps, the buyer responsible for each exception, and stock reservations or receipts by the need date. Count affected requests against all eligible requests. Include unresolved holds. Compare handling time and coverage before estimating the value of changing the workflow.

## What would change for the site?

With that baseline, the site can compare three responses. A shadow pilot would fund four weeks of observation while buyers retain release authority. Live use would need a separate decision.

| Option | What the site would do | What to find out |
| --- | --- | --- |
| Keep buyer-led purchasing | Buyers and the existing enterprise resource planning (ERP) system route approvals, handle exceptions and release orders. | What share of attempts use expired approvals today? How much time do buyers spend per requisition? How often does material arrive by the need date? |
| Improve the existing ERP workflow | Check approval age at release and route a held order to a named buyer. | Could the site get the same benefit with less setup and ongoing effort? Quote this option independently. |
| Pilot an agent in shadow mode | Give the buyer and agent the same information and rules. Record their proposed actions and follow the buyer’s actual disposition. | Where do recommendations differ? What review or rework does that create? What would operating the agent cost? |

A hazard and operability (HAZOP) study gives the buyer a practical question. If purchase is **LATE**, what might expire? Source scenario REF-008 raises an expired supplier quotation and a possible price increase. That calls for a quote-validity check. The browser illustrates a related finance approval check. Recheck approval at release and give each held order a named buyer. Compare how often the ERP rule and the agent would flag expired authority, how much handling their holds require, and what a later operating trial would need to establish about on-time material. These findings can support the simpler ERP change, an agent trial or a decision to defer. [HAZOP method](METHODOLOGY.md)

The browser shows two sets of checks on one **agent request**. At 61 logical seconds, the simple checks permit release. The extra approval check holds the order. The model illustrates how to catch an expired approval. A comparison with actual buyer-led purchasing requires site records.

## Would the change pay for itself?

These hypothetical inputs illustrate a **future year of operation** relative to buyer-led purchasing. Budget the four-week shadow pilot separately. Its review workload and disagreements with buyers can guide an offline test of the time-saving assumption.

Follow REQ-218 through the buyer’s remaining work. For illustration, allow 12 active buyer minutes on a comparable buyer-led request and 2 minutes to review the agent’s recommendation. A release takes another 4 minutes to reconcile the acknowledgment, price and delivery, freeing 6 minutes. A hold takes another 7 minutes to trace incoming supply and resolve the exception, freeing 3. Use time logs for matched requests to replace all three estimates of assisted work and the buyer-led baseline. Record waiting time and material availability separately.

The chart applies the site’s assumed mix to those two paths. With 100 releases and 100 holds each month, the weighted saving is (100 × 6 + 100 × 3) ÷ 200 = **4.5 minutes per request**. To estimate the mix, replay the approval rule at each eligible requisition’s first release attempt. A hold that later releases counts once in the hold group. Track the buyer’s work through resolution and retain open holds at the end of the observation window.

| First-year assumption | Worked example |
| --- | --- |
| Eligible volume and time saved after exception handling | 200 requisitions/month × 6 minutes/requisition = 20 buyer hours/month |
| Value of freed capacity | 20 hours × $40/hour = $800/month |
| Additional expense | $2,400 once for setup and $400/month to operate |
| First-year net capacity value | 12 × ($800 − $400) − $2,400 = **+$2,400** |

At these costs, the break-even saving is **4.5 minutes per requisition**. At three minutes, first-year net value falls to **−$2,400**. Ask which work will absorb the released hours. Finance can count a cash saving if it can identify a cash outlay the site would actually avoid. Price the ERP-only improvement against the same baseline. The order’s 300 simulated spend units never enter this calculation.

## What evidence would change the decision?

Before starting, the sponsor and site manager set the site, eligible category, review date, pilot budget and stop conditions. The buyer retains final say on every order. At the review, the sponsor can close the pilot, extend observation to resolve a named gap, or request a separate investment decision.

| Stage | Evidence for the sponsor |
| --- | --- |
| Four weeks in shadow mode | Give the buyer and agent the same requisition, policy and records. Procurement logs the agent’s recommendation, whether it disagreed with the buyer, any proposal to release on expired approval, and buyer minutes spent reviewing exceptions. Planning records actual receipts and open holds under the buyer-led workflow to establish a service baseline. |
| Paired offline timing exercise | Give buyers matched requisitions offline under two conditions, with the current ERP workflow and with agent assistance. Alternate the order across buyers. Include time spent checking recommendations and resolving exceptions. Use the difference in minutes per eligible request to estimate potential capacity. |
| Later operations, if separately approved | Measure actual buyer hours used, their redeployment, operating costs and material available by the need date. Compare with a buyer-led group using the same policy and eligibility criteria. Count unresolved holds, and account for differences in urgency, stock and supplier lead times. |

At week four, an agent recommendation to release with expired approval could trigger a pause. An offline estimate below 4.5 minutes per requisition would weaken the illustrative financial case. Even a favorable estimate leaves the sponsor with a further decision about authorizing an operational trial to verify realized capacity and service. Agree on the thresholds, review date and person who can pause each stage.

## Reuse the case at another site

Copy these prompts into a decision brief. Use the same unit, time horizon and service definition when comparing options.

1. **Current operation.** Who needs what, by when? Trace one request through its approval, release and receipt. Who owns an exception between those events?
2. **Gap and alternatives.** How often does the gap arise? What would continuing today’s workflow mean? What can the existing system do, and what would delegation change?
3. **Value and cost.** What is the eligible volume? Estimate the net time change per requisition, hourly value, setup and operating costs. Name the source and owner of each assumption. At what volume or time saving would your preference change?
4. **Evidence.** Which claims come from the browser or a recorded synthetic trial? Which need field measurements? Who will collect them, over what window, and how will they count unresolved orders?
5. **Recommendation.** What do you propose now? Name the decision owner, funding request, review date, alternative, service or authority condition, and the finding that would change your recommendation.

At the decision meeting, ask everyone to choose from the same alternatives. Compare which assumptions explain any disagreement, then agree who will collect the missing evidence and when the group will decide. [Discussion prompts](AUDIENCE_WALKTHROUGHS.md)

## How to present the case

Begin with the requirement, the current workflow and the gap between the two. Explain whose work changes if the approval expires, what could follow and which records would show whether the problem occurs at this site. This follows HM Treasury’s strategic-case guidance on objectives, existing arrangements and business needs. New Zealand Treasury also asks authors to identify the event, its causes, the people affected and the evidence for the problem. [HM Treasury strategic-case guidance](https://www.gov.uk/government/publications/guidance-on-developing-business-cases/guidance-on-developing-business-cases-for-projects-and-programmes) · [New Zealand Treasury project business-case guidance, section 6.4](https://www.treasury.govt.nz/sites/default/files/2026-06/guidance-project-business-cases-mar26-v2.pdf)

Once the group can explain the problem, compare the responses. Put the three alternatives beside the cost of each and the risk it leaves. End by asking for one specific decision, with the reason to prefer it today and the evidence that could reverse it. This adapts HM Treasury’s guidance for publishing a concise account of the objective, options, costs, benefits, risks and rationale for the preferred option. [HM Treasury guidance on presenting business cases](https://www.gov.uk/government/publications/publishing-business-cases-guidance/publishing-business-cases-guidance-for-departments-accessible)

Give each exhibit one question. The timing exhibit asks when the order should be held. The financial exhibit asks how many buyer minutes would cover the investment. Show the expiry boundary and zero-value point on the first view so readers can understand the decision before trying an alternative. The Office for National Statistics recommends showing the central message on first view and using comparisons and annotations to guide exploration. [ONS guidance on interactive charts](https://service-manual.ons.gov.uk/data-visualisation/guidance/interactive-charts-and-animations)

## Where the approach comes from

The questions above are APS’s adaptation of publicly documented consulting practice. McKinsey supplies the investment logic. Bain and BCG help frame the alternatives and the operational outcomes. The bearings case and figures are APS examples.

| Source | Published practice | How APS uses it |
| --- | --- | --- |
| McKinsey | Estimate costs, benefits and risks by testing a small supply chain prototype. Value a digital investment against a realistic no-investment case using incremental cash flows and scenarios. | Ask for a bounded pilot, give the sponsor a buyer-led baseline and show the assumption at which the operating case breaks even. [Supply chain prototype guidance](https://www.mckinsey.com/capabilities/operations/our-insights/building-the-business-case-how-to-try-new-supply-chain-tech-before-you-buy) · [Digital investment valuation](https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/why-digital-is-no-different-when-it-comes-to-valuation) |
| Bain | Examine how well the current process works, set a redesign target and evaluate technology fit, cost and execution risk before piloting. | Treat improving the existing approval workflow as a serious alternative to delegating work. [How Digital Technology Supercharges Zero-Based Redesign](https://www.bain.com/insights/how-digital-technology-supercharges-zero-based-redesign/) |
| BCG | Build an automation case from the site’s operating baseline and examine impacts beyond local labor costs, including speed and fulfillment. | Check material availability at the need date alongside buyer effort. A finding at one site leaves its applicability to other sites open. [Amplify Your Warehouse Automation ROI](https://www.bcg.com/publications/2023/amplify-warehouse-automation-roi) |
