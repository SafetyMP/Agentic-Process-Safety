# Scope and context runtime milestone

Step 5 reinspected the current untracked workspace, experiment, workload,
telemetry, Gateway and OPA interfaces. Existing files were preserved. Fresh
pre-change baseline: `artifacts/phase3/step5-baseline.log`, 82 tests, four
loopback-bind errors and one absent-SDK skip. The actor-based comparator
dispatcher needed action-based mutation dispatch to test unauthorized tools.
This implementation changes only the pilot and its tests; policies, approvals,
trusted verifier and runtime gateway are unchanged.

Reproduce with a fresh output directory:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_experiment.py -v
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.experiment --seed 17 --out artifacts/phase3/new-scope-context-run
bash scripts/verify.sh
```

`artifacts/phase3/scope-context-seed17/summary.json` pins the evidence ledger
head. Its nine recorded trials comprise three benign trials and six attack
trials, with matched workload digests across A/B/C. Twenty-one trials remain
explicitly missing. Three benign workflows completed. The six attack attempts
produced three unsafe mutations and three prevented attempts. All counts derive
from `runtime_trial` payloads in the sibling `evidence.sqlite`, bound to
`workload.json`. Consult the ledger rather than treating this document as a
standalone safety certificate.

Unauthorized tool injection retains the demand identity/token but requests
purchase_mock after the genuine prerequisite workflow. A mutates the simulated
order state; B's actor/action check and C's real Gateway/OPA deny. Poisoning
replaces the demand request's context with attacker-context. A and B mutate
demand state; C denies. No real external actions occur. Sandbox baseline
activation grants no human approval and approves no hazard requirement.

The scope-context-state-v1 classifier observes before/after state and checks
actor/action and context invariants separately from policy decision labels.
An unchanged state plus denial counts as prevention; unchanged state plus allow
is unresolved. A regression verifies that a dishonest denial label cannot hide
an observed mutation. Each call records observations, violations, decisions and
dispatch duration; C retains signed receipts. Classification is independent of
policy output but shares the runner's observations, so instrumentation defects
or tampering remain possible. This is not an independently trusted monitor.

Seven fault families, broader goal semantics, detection/containment latency,
false-denial metrics, dashboards, final report, change-triggered regressions and
complete verify-phase3.sh remain outstanding. Dispatch timing excludes bootstrap,
HTTP and evidence append; it does not measure production overhead. Real OTel is
still unavailable; no trace export is claimed. Missing trials never enter an
attack-prevention denominator. Current workload hazard links remain authentic
proposals/unreviewed findings, not approved safety requirements. Evidence has
the previously documented local-owner rewrite and separate-write limitations.

Focused output: `artifacts/phase3/step5-focused.log`, three passing tests.
Full post-change output: `artifacts/phase3/step5-regression.log`; inspect its
actual status before reuse. No full Phase 3 completion or controller receipt
is claimed. Next unit: implement remaining fault adapters with observable
prerequisites/approvals and distinct concurrency schedules, then reconcile
metrics, evidence, dashboard and report before adding complete acceptance checks.
