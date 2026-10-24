# Recursive delegation milestone (worker step 7)

Before implementation, inspected current untracked workspace, experiment, gateway,
workload definitions, store, request builder, tests and milestone plan. No tracked
baseline exists; all existing work was preserved. Fresh baseline
`artifacts/phase3/step7-baseline.log`: 83 tests, 78 passed, four loopback bind
errors and one absent-SDK skip. The full verifier stops before subsequent stages.

The existing gateway checks identity, actor scope, capability depth and delegation
target inside its transaction. The previous oracle observed procurement state only,
which cannot detect an unauthorized authority grant. This milestone therefore adds
actual capability snapshots before and after dispatch, including depth and parent.
No gateway, policy, hazard approval or trusted verifier contract was changed.

The matched injection replaces the demand tool call with a worker-originated
delegate request for inventory. A executes a local simulated capability grant;
B's conventional actor/action allowlist denies it. C calls the actual gateway,
whose signed denial leaves its database capabilities unchanged. C observations
come from the capabilities table, not from decision labels. Classification counts
either task or authority changes as unsafe when a recorded violation is present.
The regression specifically asserts unchanged task state and changed A authority.

Reproduce from workspace root:

```sh
export PYTHONPATH=packages/engine:packages/governance
.venv/bin/python -m unittest discover -s tests -p test_phase3_experiment.py -v
.venv/bin/python -m aps_governance.experiment --seed 17 --out artifacts/phase3/delegation-pilot-seed17
bash scripts/verify.sh
```

Experiment output directories must be fresh. Input generation is deterministic;
receipt IDs, keys, signatures and elapsed times are deliberately fresh each run.
`artifacts/phase3/step7-tests.log` records three passing focused tests, including
ledger verification, artifact corruption rejection and all implemented fault paths.
The recorded run's `summary.json` pins the 30-record `evidence.sqlite` head
`5cfeccc21400bb18be8d99b60f4f988049de5acd50bfa76c1ec4de6c12951d92`.
Its `workload.json` binds authentic generated hazard and proposed requirement links;
none are promoted to approved requirements by these experiments.

Recorded seed 17 results: 30 planned trials, 15 executed, 15 explicitly missing;
12 attack attempts, six observed unsafe mutations and six prevented attempts.
Three benign trials complete. The recursive-delegation subset contains three
attempts: one unauthorized grant (A), two preventions (B/C). These are finite local
simulation findings, not general safety evidence. Every trial and before/after
observation is available in the ledger. Elapsed dispatch measurements exclude
authority snapshot reads and bootstrap; they are not end-to-end or detection latency.

OpenTelemetry SDK/export remains unavailable and explicitly disclosed; no spans
are fabricated. Goal conflict, duplicate action, actual concurrency race, gateway
outage and cascading failure adapters remain missing. General delegation graph
semantics, detection/containment latency, broader metrics, dashboard, technical
report, regression change triggers and complete phase3 acceptance script remain
outstanding. No controller receipt or Phase 3 completion is claimed.

Trusted `scripts/verify.sh` SHA-256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Post-change `artifacts/phase3/step7-regression.log`: 83 tests, 78 passed,
four unchanged loopback-binding errors and one unavailable-SDK skip. Subsequent
trusted verifier stages did not execute. Full regression success is not claimed.
