# Phase 1 methodology

This is an auditable HAZOP-inspired screening engine for agent workflows. The general guideword study structure is informed by the public description of [IEC 61882:2016](https://webstore.iec.ch/en/publication/24321), which covers study preparation, examination, documentation and follow-up. Only the public description was consulted; this implementation has not been assessed against the full standard. The six agent-specific deviations are project extensions, not claims about IEC guidewords. No certification or completeness claim is made.

## Study procedure

1. Define the sandbox boundary, worker intent, messages, tools, authority and shared data. Confirm the topology with system owners.
2. Apply each of the 16 deviations to each of the six nodes, including orchestration. Current coverage is 96 node/deviation pairs. A guideword-specific rule proposes a cause, downstream consequence and candidate control. A curated reference scenario replaces generic wording for its matching pair. All results remain `unverified` and `ai_generated`, including those produced deterministically from AI-authored rules.
3. Examine causes, consequences, declared safeguards and assumptions. Declared constraints are not proven safeguards. Reference scenarios are illustrative authored examples, not incident evidence or a measured benchmark.
4. Follow directed communication edges from each affected node. Breadth-first traversal emits one shortest representative path per reachable destination per hazard, including paths spanning several workers. Visited sets terminate cycles. This identifies potential common dependencies and cascades; it does not estimate propagation likelihood or enumerate every alternate route. Shared-state divergence and conflicting goals are examined explicitly at every node, but undeclared communication/shared-state relationships cannot be inferred.
5. A human accepts applicability or rejects a finding with rationale. Acceptance alone does not authorize a requirement.
6. A human assesses severity, likelihood and residual risk. Only then may a human approve the referenced candidate control as a requirement. Export preserves all findings and audit events.

## Guideword interpretation

| Deviation | Interpretation |
| --- | --- |
| NO | Missing intended action or output |
| MORE | Excess quantity, frequency or authority |
| LESS | Insufficient quantity, evidence or resources |
| REVERSE | Inverted polarity or communication direction |
| AS_WELL_AS | Additional unintended action or data |
| OTHER_THAN | Substituted agent, item, tool or supplier |
| EARLY | Execution before inputs mature |
| LATE | Execution after a deadline or validity window |
| BEFORE | Dependent action precedes its prerequisite |
| AFTER | Prerequisite arrives after the action it should gate |
| GOAL_DRIFT | Behavior departs from declared objective |
| AUTHORITY_ESCALATION | Capabilities exceed delegated permissions |
| RECURSIVE_DELEGATION | Repeated or unbounded delegation |
| CONTEXT_CONTAMINATION | Untrusted content influences control context |
| CONFLICTING_OBJECTIVES | Local goals conflict across workers |
| STATE_DIVERGENCE | Workers use inconsistent state versions |

## Human review and risk conventions

`unverified → accepted → assessed → approved_requirement`; rejection is allowed from unverified, accepted or assessed and is terminal. Reassessment is allowed before approval. Invalid transitions fail without mutating the input. To revisit terminal findings, retain the original as evidence and start a separately governed study; automatic reopening is not implemented.

Each transition requires `--human`, a named actor and a nonempty reason. Assessment events snapshot ratings; report validation checks that current ratings match the event history. Approval requires a complete assessment and a human `acceptable` residual-risk decision. Reports contain requirement references only for approved findings. There is no automatic acceptance, automatic scoring, or threshold that silently approves a requirement. A requirement reference identifies the candidate control text in its hazard; implementation and control effectiveness still require follow-up outside this prototype.

Severity and likelihood use integer 1–5 ordinal categories for this sandbox only. Suggested severity anchors: 1 negligible reversible disturbance; 2 minor delay/rework; 3 material shortage or expenditure; 4 major operational loss; 5 critical sustained disruption or severe downstream harm. Suggested likelihood anchors: 1 exceptional; 2 unlikely; 3 plausible; 4 frequent; 5 expected in ordinary operation. These are qualitative judgments, not frequencies. The reviewer must record the evidence and rationale, including the effect of proposed controls, in the assessment reason. The record holds one current pair of ratings, not independent inherent and residual numerical assessments. Residual acceptance is a separate human decision. Organizations must establish their own consequence scales and acceptance criteria before operational use.

## Identity, provenance and deduplication

Hazard ID = `APS-` plus the first 20 hexadecimal characters of SHA-256 over canonical JSON containing topology identity, node identity, node intent and deviation. JSON keys are sorted and whitespace canonicalized. Repeated runs preserve IDs; input ordering does not alter IDs. Changing intent intentionally creates a new ID. Changing constraints or scenarios retains the pair identity while the topology digest or content provides change evidence. The digest is an identifier, not an authenticated signature. Review decisions must not be transplanted automatically to a changed study; fresh analysis always resets review state.

Provenance records generator/rule version, scenario ID and full canonical topology SHA-256. Generation yields one record per node/deviation pair. `dedup` collapses identical duplicate hazards and rejects conflicting records sharing an ID instead of silently overwriting reviews. Duplicate node/scenario IDs and dangling graph references are errors.

JSON reports are validated against strict schemas and semantic invariants before writes. CSV is a flattened review export: nested objects and arrays are JSON text in cells, null is `null`, and potential spreadsheet formula strings are prefixed with an apostrophe. CSV is not an authoritative review input and has no import command. The authoritative report retains machine-readable provenance, assessments, assumptions and review history.

## Limits and follow-up

Coverage of guidewords is not coverage of all hazards. Generic rules require expert contextual refinement; causal statements are hypotheses. No LLM runtime, fault probability model, physical process model, distributed runtime, real supplier connection, payment, or purchase execution exists. Tests establish the specified software behaviors, not the safety of an operating system. A multidisciplinary review must verify assumptions, controls, interdependencies, risk ratings and residual acceptance before relying on any finding operationally. Work stops at Phase 1.
