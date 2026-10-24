# Milestone 9: offline assurance evidence inspection

Before implementation, inspected current untracked workspace and experiment,
evidence, metrics, workload and authentic Phase 2 traceability interfaces.
All existing files were preserved. Baseline `bash scripts/verify.sh` output is
`artifacts/phase3/step9-baseline.log`: 85 tests, 80 passed, four prohibited
loopback-bind errors and one unavailable-OTel skip. Later verifier stages did
not execute. No network or policy changes were attempted.

The dashboard verifies the evidence chain, pinned head, artifact bytes and outcome
oracle through metrics.measure. It additionally regenerates source-derived workload
mappings and rejects mismatched run/case identities, duplicate trials, unknown
configurations/statuses and absent planned trial records. It renders a static page
with expandable complete recorded trial payloads (calls, state/authority changes,
signed C receipts, evidence sequences/hashes), missing trials, measured outcomes,
planned hazard mappings, proposed requirements/control labels, a human review
queue and simulated incident sequence references. There is no approval interface.

Reproduce from the existing seed-17 recorded run:

```sh
export PYTHONPATH=packages/engine:packages/governance
.venv/bin/python -m unittest discover -s tests -p test_phase3_dashboard.py -v
.venv/bin/python -m aps_governance.dashboard artifacts/phase3/metrics-seed17 --out artifacts/phase3/dashboard-seed17
```

Output must be a new directory; existing output is not overwritten. Open
`artifacts/phase3/dashboard-seed17/index.html` locally. `data.json` contains the
same inspected model. No server, remote assets, scripts or external effects are
needed; untrusted payload text is HTML escaped and CSP forbids scripts/network.
Two focused regressions pass in `artifacts/phase3/step9-dashboard-tests.log`,
including a replacement valid chain/pinned head with duplicate trial identity.
Recorded seed 17 has 30 planned trials, 15 recorded, 15 explicitly missing;
six simulated incident trials are inspectable by sequence. These counts derive
from the verified ledger, not dashboard constants.

Limits: mappings describe planned coverage, not demonstrated hazard closure.
Control implementation status comes from authentic proposals and does not assert
effectiveness or approval. Source changes fail dashboard generation until evidence
is regenerated. Test status is explicitly not attested because the ledger has no
test execution attestation. OTel gaps and unmeasured latencies/causal overhead are
shown through metrics. Ledger and pinned head can both be replaced by the filesystem
owner. No complete safety finding, human risk acceptance or controller receipt is
claimed. Five fault adapters, change-trigger regression, technical report, real
OTel export validation and complete verify-phase3.sh remain outstanding.

Trusted scripts/verify.sh remains unchanged at SHA-256
8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15.

Post-change full verifier output: `artifacts/phase3/step9-regression.log`.
87 Python tests ran: 82 passed, the same four HTTP loopback setup errors,
one unavailable-OTel skip. Full verifier exits 1 before subsequent stages;
these environment failures are not represented as successful regression checks.
