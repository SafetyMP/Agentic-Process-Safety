# Evidence-derived technical report checkpoint

Pre-implementation inspection (worker step 15): inspected experiment, telemetry,
workload, metrics, dashboard, acceptance and their tests. The current runtime
supports seven of ten faults; races, gateway outages and cascading failures are
missing. OTel integration is conditional and the SDK is unavailable locally.
Latency, causal overhead and test attestation are unmeasured. Authentic mappings
remain proposed; no risk review or policy approval is authorized by this work.
All project files are untracked, so git diff cannot represent a tracked baseline.
Existing work and trusted scripts/verify.sh are preserved.

Fresh baseline: `bash scripts/verify-phase3.sh`, output retained in
`artifacts/phase3/step15/baseline.log` and `artifacts/phase3/acceptance-VbaBRCAo/`.
Trusted regression and Node tests fail under prohibited loopback binding;
typecheck passes. Remaining baseline stage outcomes are in checks.tsv.

This work unit adds a deterministic technical report derived from verified
evidence, with per-configuration denominators, trial inspection links, authentic
mapping status, methodology, reproduction commands and residual gaps. Report
consistency is necessary, not sufficient, for Phase 3 acceptance. It cannot
attest historical test executions or prove correspondence with executed source.

Verification: focused report tests pass (2/2), retained in
`artifacts/phase3/step15/report-tests.log`. Full command
`bash scripts/verify-phase3.sh` exits 1; final output is in
`artifacts/phase3/step15/final-verifier.log` and
`artifacts/phase3/acceptance-t82mY6ia/checks.tsv`. Phase 3 runs 30 tests:
29 pass and one real-OTel export test skips because the SDK is unavailable.
Trusted regression runs 95 tests: 90 pass, four loopback errors, one OTel skip.
Typecheck, experiment, dashboard and technical-report stages pass. Node tests
fail through the prohibited loopback binding. Evidence acceptance fails on
missing adapters, real export, measurements and test attestation; report,
dashboard, summary and governed receipt consistency checks pass.

The generated report is `artifacts/phase3/acceptance-t82mY6ia/report.md`.
Its sibling run/ directory retains workload, summary and SQLite ledger; the
report links to sibling dashboard trial details. Seed 17 records 21/30 trials,
nine missing; 19 attack attempts, ten unsafe mutations and nine preventions.
These are finite simulated observations, not safety conclusions. The verified
30-record chain head is
`3e90274ef43322617057ca09c564ff6bdb1f8a6086610647e98801e01c483ff8`.

Reproduce report only for an existing run with:
`PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.report RUN_DIRECTORY --out NEW_REPORT_PATH`.
The output path must be new; report generation does not overwrite earlier evidence.
Full fresh reproduction commands are embedded in each generated report.
Trusted scripts/verify.sh SHA-256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
Remaining work includes three fault adapters, real OTel/export validation,
detection/containment timing, causal overhead, test-run attestation and stronger
trace/source execution provenance. No controller receipt is claimed.
