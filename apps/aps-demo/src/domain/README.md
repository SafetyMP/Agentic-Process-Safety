# Browser comparison and investigation model

This directory implements the illustrative domain used by the current APS Case Lab. Start with the [project vision](../../../../docs/VISION.md), [user guide](../../../../docs/USER_GUIDE.md) and [architecture](../../../../docs/ARCHITECTURE.md). It is a separate TypeScript model; it does not invoke the Python/OPA gateway or mutate frozen research results.

## Current modules

| Module | Contract |
| --- | --- |
| `scenarios.ts` | Defines the nine case presets and the selected A/B/C control bundles. |
| `cases.ts` | Resolves case descriptions, source relationships and bounded drafts; validates the editable approval-age input. |
| `simulation.ts` | Supplies pure request evaluation and ordered check traces used by comparisons; also retains the older timer-based reducer described below. |
| `comparison.ts` | Creates immutable, versioned request snapshots and independent lane outcomes from an equal baseline; separates constraint violations from execution status and bounded illustrative effects. |
| `session.ts` | Owns draft/run selection, retained predictions and run-bound discussion, explicit hypothetical recovery, bounded configuration links, saved-session validation and exports. |
| `presentation.ts` | Derives truthful run titles, constraint meaning and case-specific causal stages from retained inputs and outcomes. |

`components/SessionContext.tsx` is the shared route-level state owner. The current interaction is **Compare → Change/Inspect → Form a position**. No browser timer ages an evaluated request. An input edit creates a dirty draft; it does not relabel the selected result. Only an explicit comparison evaluates the new input.

## Comparison and reasoning invariants

- Every lane receives the same retained request and baseline. A has no modeled checks; B checks actor/tool scope and spend; C adds defined workflow conditions. These are selected bundles, not a claim that conventional systems cannot implement expiry or task binding.
- Approval age is a logical input. C's fixed freshness rule is `approvalAge < 60`; ages 60 and 61 fail, while 59 passes when the other preset conditions hold. The comparison does not measure wall-clock latency.
- Illustrative order/spend effects are exposed only for supported purchase cases; secondary cases explicitly leave business effects unmodeled. A passed check does not establish quotation, stock or demand truth.
- Retained comparisons keep their input, request identity, prediction and discussion. Ordinary reruns use an equal starting state; they do not accumulate orders from previous results.
- An eligible fresh-approval exploration creates a new hypothetical request from the denied parent's C no-effect state. The parent remains unchanged. This is not a continuation of B's executed purchase or a recorded recovery demonstration.
- Recommendations choose an investigation, review question or eligible hypothetical exploration. Their text, evidence attachments and discussion-ready status never grant tool authority, approve a hazard or change a policy.
- Evidence notes identify the selected modeled check or related recorded event. Appending an attachment preserves authored text and distinguishes its source; a recorded case may differ from the browser illustration.
- Save/load/delete are explicit browser-local actions. Configuration links carry bounded inputs only; Markdown and session JSON exports include free-text discussion. No account, network request or telemetry is involved.

The session envelope uses schema version 1 and model `aps-case-comparison-v1`. Parsing validates saved inputs, identities, parent links and discussion references, and reconstructs modeled outcomes rather than trusting arbitrary saved result claims. Keep model/session changes explicit and review compatibility before changing these contracts.

## Retained legacy simulation reducer

The timer-based `simulation.ts` reducer and its tests remain available as a legacy module, not the current Case Lab's user flow. In that reducer a dispatched `timer` action advances logical state only while running; `step` advances a stage; review suspends progression; reset/configuration clear prior events and injected faults. Seeds use a deterministic benign amount generator distinct from the Python research workload, and `sim-` event IDs carry no receipt authenticity. Do not describe its Start/Pause/Step controls or approve/deny actions as current guided-app features.

All browser decisions and effects are illustrative. The module performs no procurement, cryptographic signing, authentication or backend calls. Recorded experiment metrics come only from the separate [frozen fixtures](../fixtures/README.md). Tests establish bounded implementation behavior, not operational safety or the quality of a user's reasoning.
