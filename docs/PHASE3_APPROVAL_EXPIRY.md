# Approval expiry runtime checkpoint

Worker step 6 inspected the current untracked workspace, prior milestones,
experiment, workloads, telemetry, gateway expiry validation and policy TTL.
Existing work was preserved. Pre-change baseline is `artifacts/phase3/step6-baseline.log`:
83 tests, 78 passes, four loopback-bind PermissionErrors and one absent-SDK skip.
This is not a passing full regression. No network or permission change attempted.

Added one fault adapter: stale approval. All configurations advance the same
logical clock from 1000000 to 1000061 immediately before purchase. Finance was
issued at 1000000 with the actual policy TTL of 60 seconds; task and grants remain
live. C uses the real Gateway clock and OPA approval check. A has no gate and B's
existing conventional allowlist/budget gate has no expiry check. No external
action, human grant, hazard approval or risk acceptance occurs.

The independent oracle labels this injected request an expiry violation and
checks before/after state rather than accepting a deny label as proof. Every
call records its logical time. These are simulated approval seconds, not measured
detection or containment latencies. Dispatch duration still uses perf_counter_ns.
The expiry oracle assumes the fixture policy TTL and generated delay; arbitrary
caller-supplied cases are not a general approval verifier. The runner verifies
generated manifests. Only the expiry fault plus existing scope/context cases
are implemented; no broad safety inference follows.

Reproduce in a fresh output directory:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_experiment.py -v
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.experiment --seed 17 --out artifacts/phase3/expiry-pilot-seed17
bash scripts/verify.sh
```

`artifacts/phase3/step6-expiry-tests.log` records three passing focused tests,
including ledger/artifact verification, independently recomputed outcomes,
expiry clock, real C denial reason and unchanged C orders.
`artifacts/phase3/expiry-pilot-seed17/summary.json` derives counts from the
30 ledger payloads: 12 recorded trials, 18 missing, three benign completions,
nine attack attempts, five unsafe state mutations and four preventions. The
expiry subset is three attempts, two unsafe purchases and one prevention.
Each payload binds the workload artifact; C receipts are signature/chain checked.
The pinned ledger head is
`f36cae1d691599980d77a7c06bcc09825fcac56d2500735e160c861f739387f0`.
Retain the head separately; local ownership permits rewriting all local artifacts.

Remaining next work: recursive delegation, goal conflict, duplicate action,
race, gateway outage and cascading failure adapters; broader denominated metrics;
real SDK export validation; dashboard and consistency checks; change-triggered
regressions; technical report and complete `scripts/verify-phase3.sh`. No
primitive-only passing acceptance script was added. Phase 3 remains incomplete;
the controller must independently check acceptance and issue any receipt.

Post-change full verifier output: `artifacts/phase3/step6-regression.log`, exit 1,
83 tests, 78 passes, four loopback-bind errors, one absent-SDK skip. Later stages
did not execute because the trusted verifier stops on the Python failure.
Trusted `scripts/verify.sh` SHA-256 remains unchanged:
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
