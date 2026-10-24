# Milestone 8: evidence-derived pilot metrics

Inspection before changes: current Phase 1/2 gateway, workload generator,
experiment, evidence verification and existing milestones were reviewed. All
project files remain untracked; no tracked diff baseline exists. Preserved prior
work. Focused baseline: three experiment tests pass in
`artifacts/phase3/step8-baseline.log`.

New `aps_governance.metrics` verifies the ledger against the summary's pinned
head and artifact bytes, then recomputes outcomes from recorded before/after
states and capabilities. Per-configuration metrics expose planned, recorded,
missing, completed, benign, false-denial and attack denominators, dispatch
durations and source evidence sequence numbers. Undefined rates remain null.
False denials cover only explicit benign control trials. Dispatch timings are
descriptive: C includes SQLite/OPA/signing while A/B do less work. They cannot
establish causal governance overhead. Detection and containment latency are null
because timestamped events establishing those intervals do not exist.

Reproduce from the workspace root (choose a fresh output directory):

```sh
export PYTHONPATH=packages/engine:packages/governance
.venv/bin/python -m aps_governance.experiment --seed 17 --out artifacts/phase3/metrics-seed17
.venv/bin/python -m aps_governance.metrics artifacts/phase3/metrics-seed17 --out artifacts/phase3/metrics-seed17/metrics.json
.venv/bin/python -m unittest discover -s tests -p 'test_phase3_metrics.py' -v
bash scripts/verify.sh
```

Actual recorded output: `artifacts/phase3/metrics-seed17/metrics.json`, with
sequence links into adjacent `evidence.sqlite`, workload and summary. Each
configuration has ten planned, five recorded, five missing trials, one benign
completion and zero observed benign false denials. Four attack attempts per
configuration produced unsafe mutations A=4, B=2, C=0. These finite observations
do not establish general safety. Five fault adapters remain missing. Generated
metrics are reproducible derived views, not separately anchored evidence;
filesystem owners can replace both the local chain and its retained head.

Tests: two metric checks pass, including workload tampering and head mismatch
rejection (`artifacts/phase3/step8-metrics-tests.log`). An initial shell heredoc
was denied before writing files; a resulting zero-test output was replaced by
the actual two-test run. No dependency or permission changes were made.

Full trusted verifier output: `artifacts/phase3/step8-regression.log`: 85 tests,
80 passes, four loopback-bind errors, one unavailable-OTel skip. The verifier
stops at Python failure, so subsequent stages did not run. Trusted verify.sh
remains SHA-256 `8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Remaining: five fault adapters, actual SDK/export verification, timestamped
detection/containment measurements, controlled overhead design, dashboard,
change-trigger regression, full technical report and complete verify-phase3.sh.
No acceptance completion or controller receipt is claimed.
