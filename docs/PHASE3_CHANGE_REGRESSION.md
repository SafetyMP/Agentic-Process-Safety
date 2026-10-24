# Phase 3 content-triggered regression (step 11)

## Inspection and baseline

Before implementation, inspected experiment, workload, OPA policy, metrics,
dashboard and acceptance code/tests plus the previous acceptance JSON. Existing
Phase 1/2 interface and mapping inspection is preserved in PHASE3_PLAN.md.
The source tree remains untracked, so git diff cannot establish a baseline.
No existing source files or trusted verification scripts were edited in this unit.
Fresh baseline `bash scripts/verify.sh` exited 1: 89 tests, 84 pass, four
loopback-bind PermissionErrors and one unavailable-OTel skip. Log:
`artifacts/phase3/step11/baseline.log`. No permission or dependency changes sought.

## Implemented work unit

`aps_governance.regression` fingerprints packages (including agent/runtime code),
policies, topology/scenario examples, schemas, tests, scripts and dependency
manifests. It runs the existing complete Phase 3 verification command when
inputs change, a previous run fails, the cache is absent/invalid, the retained
log is missing/corrupt, or `--force` is requested. A rehash after execution
rejects success if inputs changed during verification. Only a matching successful
run with its retained log hash may be reused. Bytecode and artifacts are excluded.
There is no daemon, external campaign or installed git hook: invoke on changes
or in local CI. Custom agent configuration outside watched trees is not covered;
move it into watched inputs or use `--force`. Environment and toolchain changes
are not fingerprinted; use `--force` when they change. Local filesystem owners
can replace source and cache; these hashes are change detection, not attestation.

Reproduce from the workspace root:

```sh
export PYTHONPATH=packages/engine:packages/governance
.venv/bin/python -m unittest discover -s tests -p test_phase3_regression.py -v
.venv/bin/python -m aps_governance.regression --out artifacts/phase3/change-regression
# Always execute all checks, even with a matching successful prior run:
.venv/bin/python -m aps_governance.regression --out artifacts/phase3/change-regression --force
```

The two focused tests pass, using explicitly controlled runners to test source,
policy and topology changes, deletion, log corruption, failure retry, concurrent
input mutation and output-directory isolation. Their fake runner results are
unit-test fixtures, never experimental safety evidence. The actual verification
execution is retained under `artifacts/phase3/step11/change-regression/`, with
input hashes, command, exit status and verification log digest in regression.json.

Actual full run: `artifacts/phase3/acceptance-EAz8BpZg/checks.tsv` records
trusted-regression=1, typecheck=0, node-tests=1, phase3-tests=0, experiment=0,
dashboard=0, evidence-acceptance=1. Python full regression ran 91 tests: 86 pass,
four loopback errors, one OTel skip. Phase 3 ran 26 tests: 25 pass and one OTel
skip. The fresh experiment still records 15 of 30 trials, with 15 missing.
Acceptance failure remains explicit; no skipped test is counted as passing.
Focused test output is `artifacts/phase3/step11/focused-tests.log`.

## Remaining assurance gaps

This unit does not complete Phase 3. Five adversarial adapters remain missing,
and real OTel export is unavailable in the current venv. Detection/containment
latency, causal overhead, test attestation, evidence-linked technical report and
stronger trace/measurement provenance acceptance remain outstanding. No general
safety finding, approved requirement, risk acceptance or controller receipt is
claimed. Trusted verify.sh SHA-256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
