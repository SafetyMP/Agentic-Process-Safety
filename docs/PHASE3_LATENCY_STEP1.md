# Focused latency measurement work unit

Fresh seed 29, repeat 1 evidence is retained in
`artifacts/phase3/latency-step1/run`. The recorded 30 A/B/C trials preserve
unsafe mutation counts 10/6/0. Six receipt-linked internal gateway samples
produce detection mean 13804048.833333334 ns and committed-denial containment
mean 14659812.666666666 ns. Missing attack calls are A 10/10, B 9/9, C 2/8.
These are means of available internal samples, not universal coverage.
Decision clocks are internal; transaction-exit clocks follow successful commit.
Containment covers unchanged simulated task state and delegated authority only.

Metrics now verify governed receipt signatures before accepting their boundary
identities. Acceptance separately reconstructs samples from trial observations,
requires at least three samples and recomputes means and missingness. Rehashed
clock and receipt corruption, caller clock bounds, missing/duplicate boundaries,
altered aggregate, missingness and sample identities are exercised by tests.
The existing recursive source snapshot includes all changed modules and tests.

Fresh focused tests: metrics 2, observations 3, acceptance 5, report 2, all pass.
Logs, independently recomputed JSON, report, dashboard and acceptance JSON are
under `artifacts/phase3/latency-step1/`. Acceptance passes both latency checks;
it still fails paired overhead and test attestation. No full workflow pass or
completion receipt is claimed. No historical evidence or environment was deleted.

Reproduction from repository root:

```sh
export PYTHONPATH=packages/engine:packages/governance
.venv/bin/python -m aps_governance.experiment --seed 29 --repeats 1 --out NEW_DIRECTORY/run
.venv/bin/python artifacts/phase3/latency-step1/recompute.py
```

The recomputation script checks the retained run; choose a fresh directory for a
new experiment. Timing is nondeterministic. The generated report includes full
sample identities, missingness and commands. All effects are simulated; human
risk acceptance and production decisions remain mandatory and unapproved.

Independent-check launch limitation: the supplied check changes parent
`sys.path`, which subprocess Python does not inherit. Without exported
`PYTHONPATH` or an installed project, child `-m aps_governance.experiment` fails
before measuring anything. Local offline editable installation was attempted
with `--no-index --no-deps --no-build-isolation`; it fails because the existing
venv lacks `setuptools.build_meta`. No dependencies were downloaded, no settings
were changed and no startup-path workaround was installed. The coordinator must
provide the repository package path to the check process, or authorize/provide a
local build dependency for standard installation. This worker's successful fresh
run used the explicit exported package path shown above.

Next work unit: implement legitimate controlled matched overhead pairs and their
ledger validation; then run fresh complete assurance and offline wheelhouse
workflows. Trusted `scripts/verify.sh` SHA256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
