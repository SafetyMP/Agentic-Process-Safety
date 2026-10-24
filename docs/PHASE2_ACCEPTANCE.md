# APS Phase 2 acceptance record

## Scope and acceptance boundary

Phase 2 implements local authorization and audit controls around the existing simulated procurement workflow. It adds a separate Python enforcement gateway, real OPA/Rego evaluation, scoped authenticated callers, transactional state and approval checks, signed decision receipts, and an offline policy/requirement review workflow. It does not establish operational safety or accept the underlying HAZOP findings.

This document describes the current implementation and the evidence required for acceptance. Final acceptance requires the trusted verifier's **fresh full baseline regression**, current artifact/schema and policy immutability checks, and a coordinating-chat validation of a fresh controller completion receipt. Existing logs and JSON files are inspectable evidence, but their presence alone does not establish that those checks passed for the current checkout. The controller completion receipt is distinct from the application's signed authorization receipts.

The design and trust boundaries are documented in [governance architecture](GOVERNANCE_ARCHITECTURE.md), attack assumptions and residual risks in the [threat model](THREAT_MODEL.md), and provisioning, verification, review, promotion and recovery commands in [operations](PHASE2_OPERATIONS.md). [Traceability](TRACEABILITY_MATRIX.md) links the proposed requirements to source, named tests and explicit coverage gaps. [Methodology](METHODOLOGY.md) retains the human HAZOP review gates.

## Implemented controls and their limits

| Control area | Current implementation and evidence |
| --- | --- |
| Independent enforcement | `packages/governance/aps_governance/gateway.py` owns simulated effects; `service.py` exposes only the loopback call API. The TypeScript simulator delegates execution to the trusted runner. OPA evaluates the frozen Rego module; policy failures do not fall back to Python authorization. Gateway and HTTP tests cover bypass attempts and unavailable/malformed policy outcomes. |
| Identity and least privilege | Hashed bearer credentials identify individual actors. Body identity, exact task/resource, opaque server-issued context and capability must agree. Rego allowlists separate orchestrator, demand, inventory, supplier, finance and purchase authority. Server-derived delegation ancestry prevents clients from widening scope or depth. |
| Typed requests and state | Strict request schemas and private adapter contracts constrain accepted input. Server-owned stage/version predicates enforce workflow prerequisites. SQLite transactions serialize policy checks, effects, spend, idempotency and receipt persistence; failed signing or persistence rolls back local effects. |
| Financial authorization | Task and policy spending caps deny over-budget actions. Above-threshold requests require independent offline human review. Purchase approval binds the exact purchase, actor, context, state and policy digest; it expires and is consumed. Finance and purchase have separate duties. Tests cover cap/threshold boundaries, changed bindings, expiry and review escalation. |
| Replay and concurrency | Persistent nonces reject replays across restart. Idempotency permits an identical retry with a fresh nonce without another effect; changed content is denied. Concurrency tests check duplicate submission behavior. Cache retrieval still requires current authority and policy checks. |
| Policy administration | The offline administrator signs exact policy/trace/simulation manifests. Used versions cannot be reused; activation invalidates a running old snapshot and prior policy-bound approvals. Simulation alone cannot activate policy. The demonstration's explicitly labeled sandbox bootstrap is not human hazard approval. |
| Audit evidence | Ed25519 authorization receipts bind request/result hashes, authenticated identity, policy version/digest, decision, execution/cache flags and the preceding receipt hash. Public-key verification checks schema, signatures, sequence and chain. These are records of decisions under a key, not safety judgments. |

Detailed tests live in `tests/test_governance.py`, `tests/test_governance_http.py`, `tests/test_governance_properties.py` and `tests/test_governance_promotion.py`; the threat model maps attacks to named tests. Synthetic reviewer identities and grants used inside isolated tests are fixtures, not actual human approvals of the study.

## Policy snapshot mutation regression

`packages/governance/aps_governance/policy.py` defines `PolicyEngine` as a frozen, slotted dataclass. Effective Rego and canonical configuration are immutable bytes; version and digest are captured strings. Each `config` read decodes an independent object, including nested allowlists. Evaluation writes the captured Rego bytes to a private temporary module rather than rereading the source bundle. This keeps the evaluated snapshot tied to the digest checked by the gateway.

Two complementary regressions are included in full unittest discovery:

- `GovernanceTests.test_unsigned_policy_mutation_cannot_change_effective_snapshot` in `tests/test_governance.py` changes a returned configuration and nested allowlist, checks that engine field assignments raise `AttributeError`, then verifies that delegation retains the original receipt policy digest and an unauthorized tool remains denied without advancing task state.
- `PromotionTests.test_modified_policy_file_cannot_change_running_snapshot` in `tests/test_governance_promotion.py` loads a copied bundle, replaces its on-disk Rego with an allow-all decision, and checks that the loaded snapshot still passes its original cases. A newly loaded engine has a different digest and fails those cases. `test_policy_activation_stops_old_worker` separately checks rejection of an old worker after signed activation and rejection of reused policy versions.

These tests address supported object mutation and policy-file replacement. Python object freezing is not OS isolation against an unrestricted process able to replace code, invoke privileged internals or alter keys/database state. The trusted OS/key boundary remains essential. Fresh verifier output must show these regressions passing; historical policy-integrity logs are supplementary evidence only.

## Phase 1 preservation and traceability status

Phase 1 hazard IDs, ID derivation, report fields and original schemas are preserved. The TypeScript `simulate()` result retains its original simulation receipt contract. The baseline report remains **96 unverified findings, zero approved requirements and no actual human approvals**. The current trace JSON contains **16 proposed requirements**, with no review signatures. All 16 must remain proposed; a control marked implemented is a source/test association, not an approved requirement or evidence of complete hazard coverage.

The generated matrix may contain multiple control lines for one proposed requirement. Its explicit gaps include goal drift, conflicting objectives, physical stock reconciliation, transactional AFTER semantics and command/cancellation intent. The remaining generated findings without individual proposals are not implicitly covered. Requirement promotion requires real Phase 1 human review plus independent signed Phase 2 approval; wording revisions invalidate prior approval. No such promotion is part of this acceptance task.

## Reproducible evidence and freshness

The pinned [full verification script](../scripts/verify.sh) is unchanged. In the trusted verifier environment it runs all Python tests, TypeScript checking/tests, the governed compatibility demo, original JSON validation, deterministic report comparison, CSV export/deduplication, strict Rego checking, policy-case simulation, trace generation, HTTP integration, public-key receipt verification and latency measurement. Socket-dependent tests, demos and benchmarks must run in that environment, not a worker sandbox that cannot bind loopback sockets.

| Evidence artifact | Acceptance interpretation |
| --- | --- |
| `artifacts/report.json`, `repeat.json`, `deduplicated.json`, `hazards.csv` | Baseline report schema, stable IDs/output, unchanged review status, CSV export and idempotent deduplication. The full script compares repeated and deduplicated JSON byte-for-byte. |
| `artifacts/simulation.json` | Governed legacy demo output validated against the original simulation schema; demonstrates compatibility of the returned contract. |
| `artifacts/phase2/policy-simulation.json` | Schema-valid current policy version/digest and per-case outcomes. Inspect `passed` and every result, rather than inferring success from file existence. |
| `artifacts/phase2/traceability.json` and `docs/TRACEABILITY_MATRIX.md` | Current report-bound proposals, control links and explicit gaps. `scripts/verify_phase2_artifacts.py` checks exact equality with freshly proposed traceability and renders the matrix. |
| `artifacts/phase2/demo-stdout.json`, `governed-simulation.json` | Disposable local HTTP workflow evidence. These outputs demonstrate simulated execution, not a real purchase or human risk acceptance. |
| `artifacts/phase2/authorization-receipts.json`, `receipt-public-key.txt` | Current schema-valid authorization receipt chain, verified using the exported public key. Individual request/result hashes must be compared with the corresponding inputs/results when auditing an action. |
| `artifacts/phase2/integration-latency.json` | Measured loopback HTTP scope, sample count and latency distribution from the current integration run. Read numeric results from the JSON. |
| `artifacts/phase2/enforcement-latency.json` | Measured gateway allow-cache and policy-denial distributions, platform/runtime, clock, warmup and scope. Read sample counts and timing values from the refreshed JSON; cached allow timing is not fresh-purchase throughput or a production SLA. |
| Trusted verifier logs and fresh controller completion receipt | Establish which commands and current acceptance checks passed. A historical log or cancelled audit job cannot substitute for the current run. |

The artifact validator additionally checks the baseline finding states, absence of approved requirements, exact proposed trace set, passing simulation, public-key receipt chain and both latency schemas. The registered acceptance checks must also inspect this document and policy immutability evidence. Generated artifacts are local and regenerated by verification; this document intentionally does not freeze measured timing values or test totals that can become stale.

For measurement review, use `integration-latency.json` fields `samples`, `unit`, `scope`, `p50`, `p95`, `min` and `max`. In `enforcement-latency.json`, inspect `results.allow_idempotent` and `results.deny_policy` separately: each contains `samples`, `p50_ms`, `p95_ms`, `p99_ms`, `min_ms` and `max_ms`. Retain the accompanying `clock`, `python`, `platform`, `opa`, `scope` and `warmup` metadata when comparing runs. The two files measure different paths and do not establish an end-to-end production capacity result. Their schemas validate field shape and nonnegative values; schema success alone does not establish representative sampling or statistical confidence.

Artifact validation has a narrower scope than current-run acceptance. `scripts/verify_phase2_artifacts.py` does not independently compare the simulation's policy digest with a newly loaded `PolicyEngine`, establish when the JSON files were generated, or bind the exported receipt public key to an external trusted identity. A passing receipt-chain check establishes consistency under that supplied key. Freshness and association with this checkout therefore depend on the trusted verifier regenerating the outputs from the current source and recording successful checks in the fresh controller completion receipt; existing JSON files alone cannot supply that association.

## Completion protocol

Completion has three separate responsibilities, in this order:

1. **Worker assigned artifact work completion.** The worker inspects the relevant files, completes the assigned artifact edit and returns its structured report. `claimed_complete=true` means only that the assigned work unit is ready for independent checks. It does not assert that trusted tests ran or that a controller completion receipt has been issued or validated. The worker does not wait for that receipt: the controller can issue it only after the worker report and independent checks.
2. **Controller trusted execution and verification.** After the worker handoff, the controller runs the registered trusted checks against the current workspace, including the full regression and separate artifact/documentation checks below, and records their actual results. Successful independent verification supports issuance of the current controller completion receipt; the worker report alone does not establish acceptance.
3. **Coordinator current completion_receipt validation.** Before any user-facing final completion claim, the coordinating chat validates the current successful controller `completion_receipt` against this task, workspace and trusted verification results. A worker completion flag, historical receipt or cancelled job cannot replace this validation.

This protocol assigns responsibility; it does not claim that any pending trusted execution or receipt validation has already occurred.

### Final verification handoff

The coordinating chat must confirm all of the following against the same current workspace before recording completion:

1. The trusted verifier completes the unchanged `scripts/verify.sh` successfully, including full unittest discovery with both policy snapshot mutation regressions named above. A policy-case simulation alone does not exercise the object-mutation regression.
2. The separate registered artifact check runs `scripts/verify_phase2_artifacts.py` against the refreshed outputs. That script is not invoked by `scripts/verify.sh`; its success must be checked separately. Its schema checks use `schemas/report.schema.json`, `schemas/traceability.schema.json`, `schemas/policy-simulation.schema.json`, `schemas/authorization-receipt.schema.json` and both latency schemas through the validators. The legacy demo has its own `schemas/simulation.schema.json` check in the full script.
3. Current documentation and policy immutability checks confirm that this acceptance record remains substantive, all 16 trace requirements remain proposed, and the immutable snapshot implementation and regression tests remain present. The baseline must still have 96 unverified findings, zero approved requirements and no actual human approvals.
4. The coordinating chat validates a fresh successful controller completion receipt for this task and current verification results. Cancelled audit jobs `82084fb3f9a74d3f8147ed2555e1750b` and `6ee9ce6ba6004b53aa12bfb9fde8212f` provide no completion evidence.

This document records the acceptance criteria and evidence locations; it does not itself attest that a fresh verifier run or completion-receipt validation has occurred.

## Residual limits and excluded work

**Signed receipts are not proof of safe actions.** A valid signature authenticates a recorded decision under the signing key; it does not prove correct hazard modeling, truthful inputs, competent human judgment or an uncompromised gateway. Receipt chaining cannot detect tail truncation or whole-database rollback without an independently trusted chain head/count. There is no external ledger anchoring, hardware-backed key protection or implemented key rotation.

The OS, gateway/OPA code, clock, SQLite state, administrator identity and key access controls are trusted. The disposable runner does not create an adversarial OS sandbox. Separate process/filesystem identities must prevent agents from reading other credentials or modifying trusted state. Loopback bearer HTTP has **no TLS**; **no remote deployment** is supported. Distributed execution, high availability, external-effect atomicity, audit retention, rate limiting and automatic timeout notification are not established.

Supplier data, stock and purchase effects are mocks. There is **no live procurement**, payment or external transaction integration. Physical truth, objective arbitration and broader hazard-control effectiveness remain unresolved. This delivery includes **no Phase 3**, safety certification or human approval fabrication. Acceptance is limited to the implemented local Phase 2 controls and their freshly verified evidence.
