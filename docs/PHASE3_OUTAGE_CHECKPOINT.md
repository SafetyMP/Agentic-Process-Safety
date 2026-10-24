# Matched local gateway outage work unit

Inspected current untracked workspace, Phase 1/2 interfaces and baseline notes,
Phase 3 plan/replacement/acceptance/report/wheelhouse checkpoints, and the latest
acceptance-kqH6yAvC evidence before edits. Preserved historical files and the
trusted verifier. No nested controller, delegation, settings or permission change.

Added gateway_outage to the actual finite experiment adapter. In each A/B/C
arm the first four stages and purchase delegation execute normally. At the
purchase transport boundary, an injected ConnectionError is raised and caught
before dispatch. The runner stops; no purchase handler or C gateway call runs
for that request. This is an in-process simulated transport outage, not a real
network outage, policy-engine outage, retry/recovery experiment or production
availability result. It follows the existing workload's pre-dispatch definition.

The matched environmental fault is not labelled an adversarial attack or credited
as policy prevention. All arms retain version 4, no orders and incomplete status.
Only race_condition remains an explicitly missing adapter (three planned trials).
Seed 17 records 27/30 trials with unchanged 24 attack attempts, 14 unsafe mutations
and 10 preventions across all arms. These are finite observations, not safety
conclusions; B remains a narrow actor/tool/budget comparator.

Both outage and existing cascade failure now emit genuine SDK transport.failure
events on the orchestration span with request identity, action, exception type
and local boundary. Export reconciliation requires exact event correspondence.
Acceptance validates failure state/authority immutability and nonexecution in
all arms, requires the outage to terminate the trial, and checks C receipt count
against only dispatched calls. Missing failure records, hidden mutations,
execution and fabricated completion are rejected by adversarial tests.

New multi-seed runtime tests cover seeds 0, 17 and 18. Test expectations for
dashboard, metrics, acceptance and report were updated to nine observed and one
missing trial per arm. The report tampering fixture now alters the current row;
the first fresh full run exposed its old literal as a no-op, which was corrected.

Remaining assurance work: barrier race adapter, timestamped detection/containment
events with provenance, a defensible matched overhead design, source-bound test
attestation, broader A/B instrumentation and full final acceptance. Current
acceptance still fails deliberately on these missing requirements. No controller
receipt or Phase 3 completion is claimed. Historical zero-demand ETIMEDOUT is
not explained by this outage experiment; no timeout was increased.

Reproduce using `bash scripts/verify-phase3.sh`; each run retains independent
logs, new evidence, real spans, dashboard, technical report and acceptance JSON.
Final verification paths and counts are appended after execution below.

## Fresh final verification

`artifacts/phase3/acceptance-nG7J0zzD/checks.tsv` records trusted regression=0,
typecheck=0, Node=0, Phase3 tests=0, experiment=0, dashboard=0, report=0 and
evidence acceptance=1. Python: 100 tests pass with no skips. Node: 7 pass;
zero-demand timeout did not reproduce. Focused Phase3: 35 pass with no skips.
HTTP tests passed in this worker run; prior loopback restrictions are historical
and were not changed by the implementation.

`acceptance.json` reconciles 27 recorded / 3 missing trials and genuine export
of 96 spans (27 orchestration roots, 69 receipt-linked gateway children), including
failure-event correspondence. Failing checks are race coverage/completeness,
three absent measurements and absent test attestation. Ledger head:
`7667b8a4c3f0fea5c3cac6c08af2a5b3c420099ae154f3463876d57f46122e0d`.
Dashboard: `artifacts/phase3/acceptance-nG7J0zzD/dashboard/index.html`.
Report: `artifacts/phase3/acceptance-nG7J0zzD/report.md`.

Fresh `bash scripts/verify-otel-wheelhouse.sh` also passes; evidence under
`artifacts/phase3/wheelhouse-verification-2syd1gvi/` verifies six packages and
two exported SDK spans after isolated hash-locked offline installation. Wheelhouse
remains at `dependencies/otel-wheels/`.

Trusted scripts/verify.sh SHA256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
No broker checkpoint tools were exposed to this worker; this local checkpoint
is the handoff. No valid completion receipt exists for the unfinished assurance.
