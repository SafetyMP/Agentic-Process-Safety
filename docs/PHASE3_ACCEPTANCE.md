# Milestone 10: executable evidence acceptance gate

Reinspected the untracked workspace, trusted verifier, runtime adapters, workload
generator, metrics, dashboard, telemetry and receipt verification interfaces.
Preserved all earlier files. Fresh baseline before edits is recorded in
`artifacts/phase3/step10-baseline.log`: 87 tests, 82 passes, four prohibited
loopback-bind setup errors and one absent-OTel skip. The trusted verifier stops
before Node and subsequent stages. Network permissions were not changed.

Added `scripts/verify-phase3.sh`, `aps_governance/acceptance.py` and two focused
regressions. The script records separate stage exit codes and logs, runs the
unchanged trusted verifier, independently runs TypeScript/Node and Phase 3 tests,
then creates a fresh seed-17 run and offline dashboard. Each invocation uses a
new directory under `artifacts/phase3/acceptance-*`; no prior run is overwritten.
It exits nonzero if any stage fails and prints its audit directory.

The evidence gate rechecks the pinned chain, artifact bytes, source-derived
workloads, trial identity/completeness, outcome oracle, signed C receipt chains
and their call decision bindings. It compares summary counts to ledger-derived
counts and compares both dashboard data and HTML with fresh evidence rendering.
It explicitly fails on missing fault executions per configuration, unavailable
real OTel export, absent latency/overhead measurements or absent test attestation.
It does not demand zero unsafe observations in the deliberately ungated A arm.
Check details carry missing trial sequences, verified receipt trial sequences,
actual counts and telemetry gaps. The output pins the evidence head.

Reproduce:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_acceptance.py -v
bash scripts/verify-phase3.sh
```

The two new regressions confirm current partial runs cannot pass, receipt
signatures are independently checked, fabricated summary counts are rejected,
and altered dashboard HTML fails consistency. A passing test suite means these
behaviors worked; it does not mean Phase 3 acceptance passed.

This is a necessary gate, not the complete acceptance contract. SDK status and
nonempty span bytes alone do not validate trace/event correspondence or loss.
Non-null timing values alone will not validate a future measurement methodology.
Change-trigger regression, evidence-linked technical report, trace linkage,
independently verified measurement provenance and test-run attestation still
need implementation and stronger checks. Current missing adapters are goal
conflicts, duplicate actions, races, outages and cascading failures. No receipt,
complete safety finding, approval or risk acceptance is issued by this worker.

Trusted `scripts/verify.sh` SHA-256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

## Executed checks

`artifacts/phase3/step10-acceptance-tests.log`: two focused tests pass.
`artifacts/phase3/step10-verifier.log` records the full command's exit 1 and
audit directory `artifacts/phase3/acceptance-Si2NdFhU/`. Its `checks.tsv` records
trusted regression=1, typecheck=0, Node tests=1, Phase 3 tests=0, experiment=0,
dashboard=0 and evidence acceptance=1. Phase 3 tests: 24 run, 23 pass, one SDK
skip. Full Python regression: 89 run, 84 pass, four loopback errors, one SDK
skip. Node tests: two pass, five fail through the loopback-dependent demo.

`acceptance.json` records 18 checks: nine pass and nine fail. It reconciles 30
planned trials, 15 recorded and 15 missing, with 12 attack attempts, six unsafe
mutations and six preventions. These are finite pilot observations across arms,
not comparative safety conclusions. Missing sequences and fault names are in
that JSON; signed C receipt checks reference sequences 3, 6, 12, 15 and 18.
The 30-record head hash is
`bd2e91f8876da8f41837272dbb0061279f274489a7d505f2b88d2eef1cc674f1`.
All trial numbers above derive from that fresh ledger and acceptance output.
No Phase 3 acceptance or controller receipt has been obtained.
