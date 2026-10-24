# Phase 3 inspection and durable milestones

## Source-bound test execution milestone (replacement worker step 4)

See PHASE3_TEST_ATTESTATION.md. Fresh subprocess records bind four test stages,
commands, exits, monotonic durations, source snapshots and logs to appended
evidence. Dashboard/report consume reverified provenance; failed, altered or
source-stale test records cannot satisfy acceptance. Stable fresh audit
acceptance-jJpWjZc4 passes 104 Python, seven Node and 39 Phase3 tests, authentic
trace reconciliation and test attestation. Wheelhouse verifies offline. Assurance
still fails only the three absent measurements; no controller receipt claimed.
Historical audit with a source change during testing is retained and correctly
rejected. Trusted verify.sh is unchanged and existing evidence preserved.

## Matched race milestone (authorized replacement worker step 3)

See PHASE3_RACE_CHECKPOINT.md for runtime definition, limitations and fresh
verification. All ten finite adapters now execute in A/B/C, including two
same-version purchases released at a real thread barrier. Acceptance validates
race observations and existing genuine trace/receipt correspondence. Fresh
102 Python, seven Node and 37 Phase3 tests pass; wheelhouse verifies offline.
Audit acceptance-oGwBpCeX fails only on three absent measurements and test
attestation. Broader A/B tracing and provenance remain required. No Phase3
completion or controller receipt is claimed; historical evidence is retained.

## Matched outage milestone (authorized replacement worker step 2)

See PHASE3_OUTAGE_CHECKPOINT.md for current inspection, runtime definition,
verification and limitations. Added matched pre-dispatch purchase transport
failure in A/B/C, genuine SDK failure events and exact reconciliation, all-arm
immutability/nonexecution acceptance and adversarial tampering tests. Race is
the remaining missing adapter. Measurements, test attestation and broader trace
coverage remain outstanding. Historical evidence and trusted verify.sh preserved.
No complete assurance or controller receipt is claimed.

## Milestone 15: evidence-derived technical report

See PHASE3_REPORT.md for inspection, baseline, reproduction and limitations.
Added deterministic report.py consuming verified dashboard/evidence inspection,
with per-configuration denominators, all trial sequence links, workload/input
digests, authentic proposed mapping states, methodology and residual risks.
Two focused tests verify reproducible rendering, trial/aggregate reconciliation,
report alteration detection and rejection of a corrupted workload artifact.
verify-phase3.sh now generates the report and acceptance re-renders it to check
consistency. A matching report alone never passes the remaining assurance gate.
Trusted verify.sh is unchanged. Three adapters, OTel export, measurements,
test attestation and stronger execution provenance remain outstanding.
Verification artifacts: artifacts/phase3/step15 and acceptance-t82mY6ia.
No Phase 3 completion or controller receipt is claimed.

## Milestone 13: actual duplicate purchase dispatch

See PHASE3_DUPLICATE_ACTION.md and artifacts/phase3/step13 for inspection,
baseline and verification. Existing MORE-linked workload now dispatches a fresh
nonce with the same idempotency key through A/B/C, including actual C gateway
cache and signed receipt verification. State oracle and reconciliation tests
include safe nonexecuted cache responses. Three fault adapters and earlier
telemetry/measurement/attestation/report gaps remain. No full completion claim.

## Milestone 12: bounded goal conflict

See PHASE3_GOAL_CONFLICT.md for inspection, fresh baseline, runtime semantics,
commands and evidence. Added matched over-budget goal conflict through real
dispatch and C Gateway/OPA budget denial, with state-based oracle and multi-seed
tests. Extended B's conventional budget check to authorization. Four fault
adapters remain missing; telemetry, measurement, attestation/report and provenance
gaps persist. Final validation output: artifacts/phase3/step12/verifier-final.log.
Trusted verify.sh is unchanged. No completion receipt or full Phase 3 claim.

## Milestone 11: content-triggered regression

See PHASE3_CHANGE_REGRESSION.md for inspected interfaces, baseline, commands and
limitations. Added an on-demand source/policy/topology fingerprint and regression
runner; successful cache reuse requires unchanged inputs and intact retained log.
Failed checks and input changes during execution cannot establish success. Two
focused tests pass. Actual full Phase 3 verification output is retained under
artifacts/phase3/step11/change-regression. The trusted verifier is unchanged.
Five adapters and telemetry/measurement/report/attestation gaps remain; no
Phase 3 completion or controller receipt is claimed.

## Milestone 10: necessary acceptance gate and failure evidence

See PHASE3_ACCEPTANCE.md for fresh inspection/baseline, reproduction, check scope
and gaps. Added verify-phase3.sh with independent stage logs, fresh matched run,
dashboard regeneration and evidence acceptance JSON. The gate fails explicitly
on incomplete fault coverage, missing OTel/measurements/test attestation and
cross-artifact inconsistencies. Two focused regressions pass. This gate remains
necessary rather than sufficient; outstanding adapters, report, change-trigger
regression and stronger trace/measurement provenance checks remain. Trusted
verify.sh is unchanged. No Phase 3 completion or controller receipt claimed.

## Milestone 9: offline verified evidence dashboard

See PHASE3_DASHBOARD.md for inspection, baseline, reproduction and limitations.
Added dashboard.py and two passing consistency/tampering/rendering regressions.
Generated static HTML and JSON from the verified seed-17 ledger with inspectable
trial payloads, mappings, proposed control status, human review queue, incidents,
missingness and honest unattested test status. No approvals or external actions.
Remaining assurance gaps persist; no complete acceptance script or receipt claimed.

## Milestone 8: evidence-derived descriptive metrics

See PHASE3_METRICS.md for inspection, baseline, reproduction and limitations.
Added verified-ledger metrics with explicit per-configuration denominators,
source sequence links, missingness and dispatch-only timing. Two new tests pass.
Seed 17 records 15 executed and 15 missing trials; unsafe mutations A=4/B=2/C=0
are finite observations, not safety findings. Full verifier: 85 tests, 80 pass,
four loopback-bind errors and one unavailable-OTel skip. Trusted verifier unchanged.
Five fault adapters and remaining assurance work are still outstanding; no
completion receipt claimed.

## Milestone 7: recursive delegation and authority observations

See PHASE3_RECURSIVE_DELEGATION.md for fresh inspection/baseline, commands,
evidence head, measured counts and limitations. Added a matched worker-delegation
injection and independent capability-state observations. Three focused tests pass.
Seed 17 now executes 15 trials with 15 missing, recording 12 attack attempts,
six unsafe mutations and six preventions. Five adapters and the remaining
assurance/report/dashboard/acceptance work remain. No completion receipt claimed.

## Milestone 6: approval expiry

See PHASE3_APPROVAL_EXPIRY.md for inspection, baseline, commands, observed counts,
oracle scope, evidence head and remaining work. The expiry adapter advances a
matched logical clock and exercises the real C gateway; A/B permit the expired
purchase and C prevents it. Focused tests pass. No complete assurance claim or
controller receipt is made; six fault adapters and the dashboard/report/metrics/
acceptance work remain.

## Initial inspection checkpoint (2026-10-20)

Controller worker step 1, before implementation. All existing project files are
untracked (`git status --short`); `git diff` is empty because there is no tracked
project baseline. Preserve all existing files. Trusted `scripts/verify.sh` SHA-256:
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Fresh baseline: `bash scripts/verify.sh > artifacts/phase3/baseline.log 2>&1`.
Exit 1: 65 Python tests ran, 61 passed, four `test_governance_http` setup errors
were `PermissionError` binding 127.0.0.1. No skipped tests were converted to passes.
Because the script uses `set -e`, Node checking/testing, demos and subsequent
artifact regeneration did not execute. Controller checks must run the full
unchanged script in their permitted environment. Worker does not seek network
or policy changes. OpenTelemetry lookup in `.venv` raised `ModuleNotFoundError`;
no SDK, exporter, real spans or export success is claimed.

### Inspected interfaces and relationships

- `aps.core.analyze` validates topology/scenarios and derives deterministic hazard
  identities. Its human review state machine rejects unreviewed approvals. Existing
  engine tests cover identity, deduplication and review boundaries.
- `aps_governance.traceability.propose` derives authentic proposals from reference
  findings and approved findings. Existing report/matrix describe 96 unverified
  findings and 16 proposed requirements; regenerate these before final acceptance.
  No real review is authorized here.
- `Gateway.call(token, request)` validates identity/schema, scope, nonces, context,
  state, capabilities, approval binding/expiry, signed active policy and OPA result.
  Mutation, idempotency and Ed25519 receipts share one SQLite transaction.
- `PolicyEngine.evaluate` invokes real OPA using an immutable policy snapshot;
  errors fail closed at the gateway. Conventional B must be an explicitly named
  comparator, never an undisclosed replacement for this C control path.
- `Store.transaction` uses BEGIN IMMEDIATE; existing concurrent duplicate tests
  exercise serialization. External effects remain mocks. A new evidence database
  cannot atomically commit with the gateway database without an integration design;
  runners must disclose missing evidence after failed writes.
- TypeScript `simulate` invokes the governed Python demo; it is not an ungated A
  runtime. Preserve its Phase 1 output schema.
- Existing regressions cover depth/scope, stale binding/expiry, context,
  version/order, budget, replay, concurrent duplicates, policy outages, receipt
  rollback, malformed input and policy snapshot mutation. They do not constitute
  a matched A/B/C adversarial experiment.
- Existing trace gaps include GOAL_DRIFT, CONFLICTING_OBJECTIVES, physical truth,
  AFTER and cancellation intent. Test/control links alone do not close these gaps.
- Existing benchmark clock is perf_counter_ns; scope is in-process gateway
  including SQLite/OPA/signing. It is not detection/containment latency or a
  production throughput result.

### Plan and acceptance boundaries

1. Inspection/baseline and append-only evidence primitive with corruption,
   concurrency, artifact and pinned-head verification tests.
2. Seeded workload model and A/B/C runtimes using actual simulated execution;
   exercise requested faults, record oracle definitions, matched input digests,
   true negatives, missing outcomes and human-review boundaries.
3. Real OTel integration when SDK is available, with locally exported spans and
   explicit unavailable/export-gap states. Never simulate OTel API success.
4. Evidence-linked metrics and reproducibility manifests with source/policy/
   topology/workload digests; regression under agent/policy/topology change.
5. Local dashboard with evidence inspection, honest coverage, incident/test data
   and human risk-review queue; test dashboard/ledger/report consistency.
6. Technical report, documentation, meaningful `scripts/verify-phase3.sh`, full
   checks and controller handoff. Acceptance script must cover the complete
   contract before passing; a primitive-only check cannot establish Phase 3.

Each milestone records actual outputs and remaining gaps. Only the controller
issues its receipt after independent checks. Step 1 is a bounded work unit;
full Phase 3 acceptance remains pending.

## Milestone 1 handoff

Added only `packages/governance/aps_governance/evidence.py`,
`tests/test_phase3_evidence.py`, this plan and `PHASE3_EVIDENCE.md`.
No existing implementation, policy, schema, review state or trusted script changed.
The script hash above was checked again after implementation and is identical.

Fresh outputs:

- `artifacts/phase3/evidence-tests.log`: seven focused tests pass, including fresh
  analysis confirming 96 findings / 16 proposed requirements / zero approvals;
  ResourceWarning promoted to error. Exact reproduction is in PHASE3_EVIDENCE.md.
- `artifacts/phase3/post-foundation-regression.log`: unchanged full verifier exits
  1; 72 tests ran, 68 passed, same four loopback-bind setup errors. Subsequent
  verifier stages remain unexecuted. No full regression success claimed.
- `artifacts/phase3/typecheck.log`: independent `npm run typecheck` exits 0.
- `artifacts/phase3/node-tests.log`: independent `npm test` exits 1; two tests
  pass and five fail through the Python demo's prohibited loopback bind.

No acceptance-script placeholder was added: phase3-assurance remains unmet.
Next work unit: implement seeded workload/oracle manifests and real A/B/C
runtime paths against the inspected gateway, then reconcile outcomes into the
evidence log. OTel dependencies remain unavailable in the worker venv; preserve
an explicit unavailable state until real SDK/export can be verified. There is
no runtime evidence integration, dashboard, experiment metrics or technical
findings report yet. No controller completion receipt is claimed by this worker.

## Milestone 2 handoff: deterministic input foundation

Reinspected the gateway, policy evaluator, demo, authentic traceability catalog,
existing evidence module and current untracked workspace before changes. Preserved
all prior implementation and user files. Fresh pre-implementation baseline in
`artifacts/phase3/step2-baseline.log`: 72 tests, 68 pass, four loopback-bind setup
errors. This worker does not change network permissions or seek escalation.

Added `workloads.py`, five workload regression tests and `PHASE3_WORKLOADS.md`.
Generated seed 17 with two blocks: 20 input cases, no executed trials. New tests
verify stable replay, matched blocks, real proposed mappings, rehashed tampering,
source-change invalidation, parameter bounds and PRNG isolation. The trusted
verifier remains unchanged. No partial acceptance script was introduced.

Next concrete unit: implement actual finite A/B/C runtime adapters consuming
these cases, including state-based independent oracles, authentic C Gateway/OPA
calls and evidence reconciliation. Then real OTel with honest dependency/export
status, metrics, dashboard, report and complete acceptance checks remain. This
milestone does not resolve Phase 3 assurance or authorize a completion receipt.

## Milestone 3: optional real SDK tracing boundary

Reinspected actual gateway transaction/receipt, policy, workload and evidence
interfaces before implementation. Baseline `step3-baseline.log`: 77 tests,
73 pass and four loopback PermissionErrors. All project files remain untracked;
there is no tracked git diff baseline. Existing user files were preserved.
The venv lookup confirms no OpenTelemetry package. No network change attempted.

Added `telemetry.py`, three focused tests and `PHASE3_TELEMETRY.md`.
The optional wrapper executes the authentic gateway and emits commit events only
after its transaction returns. Actual SDK/export code is conditional; it does
not fabricate spans when unavailable. Focused results: two passes, one explicit
real-export skip. No modification to trusted verify.sh or existing runtime.

Remaining: runner integration, SDK dependency pinning and real export validation,
export-failure reconciliation, matched A/B/C execution, independent runtime
oracles/metrics, dashboard/report, regression triggers and complete verify-phase3.sh.
No full Phase 3 completion or controller receipt is claimed. Next unit should
prioritize the actual matched runtime adapters; telemetry alone is not assurance.

Post-change full verifier: `artifacts/phase3/step3-regression.log`, exit 1,
80 tests: 75 passed, four loopback-bind errors, one real-SDK export skip.
Later verifier stages did not execute because the script exits on Python failure.
Trusted verify.sh SHA-256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

## Milestone 4: matched benign execution foundation

Reinspected current gateway, workload, evidence, telemetry, admin and baseline
interfaces. Existing project remains entirely untracked; preserved user work.
Fresh pre-implementation `step4-baseline.log`: 80 tests, 75 passes, four loopback
bind errors and one absent-SDK skip. No permission/network changes requested.

Added experiment.py and two integration regressions. Seed 17 pilot records 30
planned trials: three actual benign executions/completions and 27 explicitly
missing adversarial trials. C executes ten real Gateway/OPA calls with verified
signed receipts. A/B execute local mutations, B with allowlist/budget checks.
Each trial is appended to evidence with workload artifact binding. Summary pins
the full ledger head and discloses unmeasured safety and latencies and SDK gaps.
See PHASE3_RUNTIME_PILOT.md for commands, measurement scope and limitations.

This bounded work unit does not satisfy Phase 3 acceptance. Next unit must add
fault dispatch and independent runtime outcome classification, then metrics,
dashboard/report and full acceptance script. Do not add a passing primitive-only
verify-phase3.sh. No worker-issued controller receipt or completion claim.

Verification: `step4-pilot-tests.log` records two focused tests passing.
`step4-regression.log` records 82 tests: 77 pass, four unchanged loopback-bind
errors, one absent-SDK skip. Later trusted-verifier stages remain unexecuted.
Trusted verify.sh hash is unchanged at the value above. No full-check success
is claimed. Pilot workload, summary and 30-record SQLite evidence are under
`artifacts/phase3/benign-pilot-seed17/`.

## Milestone 5: two observed adversarial paths

See PHASE3_SCOPE_CONTEXT.md for inspection, commands, oracle, findings and
limitations. Added unauthorized purchase and poisoned-context runtime injections;
fixed A/B dispatch to execute requested actions. Six attack attempts in seed 17
record three unsafe mutations and three prevented attempts. Nine trials now
execute, 21 remain missing. Evidence retains all 30 planned trial records and
pins head b8b4b4c9e539db0738a1969ff166d4f504d578964af811f6decd315e6af9995a.
Focused tests: three pass. Full verifier: 83 tests, 78 passes, four unchanged
loopback-bind errors and one absent-OTel skip. Subsequent verifier stages did not
execute. Trusted verify.sh hash remains unchanged. No complete acceptance script
or receipt is claimed; remaining work is listed in the milestone document.
