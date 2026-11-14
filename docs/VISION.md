# APS vision and research questions

APS helps people examine whether an agent's action is justified within a coordinated process. Tool access answers who may invoke an operation. It does not, by itself, establish that an earlier approval is still current, information belongs to the task, a request has not already executed, or the requested work still makes sense.

The project connects a concrete request to its possible failure path, proposed control, observed evidence and human judgment. Its organizing question is: **what must remain true when the action occurs, and what should happen when a condition no longer holds?**

Start with the [live investigation](https://safetymp.github.io/Agentic-Process-Safety/) or the [user guide](USER_GUIDE.md). The [documentation map](README.md) separates current guidance from technical references and retained historical records.

## What the experience is for

- Engineers can compare the behavior of explicit control bundles and inspect the condition where decisions diverge.
- Researchers can examine HAZOP-inspired screening, source mappings and bounded synthetic experiments.
- Reviewers can explain a recommendation, attach its evidence, preserve disagreement and identify the information or accountable decision still needed.

The procurement setting provides a shared concrete example: demand, inventory and supplier information feed finance and purchase decisions, with an orchestrator coordinating work. It is a way to reason about dependencies and authority across an agent workflow. It does not require users to assume that the model contains independently reasoning agents or represents a deployed purchasing system.

## The current product contract

**Compare → Change or inspect → Form a position** is the main journey. Each comparison retains its inputs and starting state. The interface explains a case-specific causal path and distinguishes execution with an invalid condition, a held boundary, a pending review and an outstanding task. A blocked request is not presented as completion of the intended work.

Recommendations change what the user investigates next. Current approvals lead to business-evidence questions; missing or expired approvals raise authorization questions; replay, scope, delegation, context and conflict cases raise their own questions. A narrowly modeled fresh-approval exploration creates a separate hypothetical request. Free-text reasoning and a “ready for discussion” status do not authorize operations.

Supporting views connect the selected request to hazards, controls and recorded trials. They explain where those sources differ before showing the larger register or trace. For example, approval freshness is narrower than quotation validity; a recorded demand-stage context substitution is not the same execution as the browser's purchase-stage illustration; a budget violation does not demonstrate objective arbitration.

## Three kinds of evidence, three responsibilities

| Layer | Responsibility | Limit |
| --- | --- | --- |
| Browser illustration | Explain fixed model behavior with retained, comparable inputs | Does not execute the research gateway or demonstrate a real-world outcome |
| Research implementation and frozen records | Make synthetic experiments and their source lineage inspectable | Finite trials and incomplete measurements cannot establish broad effectiveness |
| Human reasoning | State the proposed next action, evidence, assumptions and unresolved questions | Recording a position does not verify it or grant authority |

The [HAZOP methodology](METHODOLOGY.md), [gateway architecture](GOVERNANCE_ARCHITECTURE.md) and [threat model](THREAT_MODEL.md) describe the underlying research contracts. Those contracts remain distinct from the browser's teaching model.

## Questions still to answer

1. **Understanding:** does the guided experience help a newcomer explain the causal path, identify the decisive condition, distinguish illustration from recorded evidence, and name a residual gap?
2. **Analysis quality:** does HAZOP-assisted review identify additional applicable hazards or improve reasoning compared with an equal-information alternative at an acceptable review cost?
3. **Control trade-offs:** under what stated workload and trust assumptions do particular controls prevent invalid actions while leaving a workable route to completion?
4. **Human judgment:** what evidence and accountable review are needed to resolve conflicting objectives or justify a new attempt?

The existing interface and automated tests do not answer these empirical questions. Comprehension needs observation of people using the experience. Method comparisons need a fair protocol, independent assessment and preserved counterexamples. Recorded counts should retain their denominators and missing measurements; clicks, completion rates or model confidence alone are insufficient evidence of better judgment.

## Direction for future work

The next useful work is to evaluate comprehension, improve the explanation of residual business questions, and expand case coverage only where source evidence and semantics support it. Richer recovery or objective arbitration would need explicit state, authority and evidence contracts before becoming an interactive outcome. Broader domain examples should make their assumptions and limits as clear as the procurement case.

These are research directions, not scheduled features or promises. Contributions should identify the concrete question, intended behavior, meaningful checks and remaining uncertainty. See [Contributing](../CONTRIBUTING.md).

APS provides no safety certification or production protection. Its value today is an inspectable conversation about conditions, consequences, controls and evidence—not a claim that a particular method or control bundle makes agent systems safe.
