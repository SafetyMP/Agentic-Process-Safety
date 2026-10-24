#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH=packages/engine:packages/governance
PYTHON_BIN="${APS_PYTHON:-.venv/bin/python}"
mkdir -p artifacts/phase2
"$PYTHON_BIN" -m unittest discover -s tests -v
npm run typecheck
npm test
npm run --silent demo > artifacts/simulation.json
"$PYTHON_BIN" -m aps.cli validate simulation artifacts/simulation.json
"$PYTHON_BIN" -m aps.cli validate topology examples/procurement.json
"$PYTHON_BIN" -m aps.cli validate scenarios examples/scenarios.json
"$PYTHON_BIN" -m aps.cli analyze examples/procurement.json examples/scenarios.json --out artifacts/report.json
"$PYTHON_BIN" -m aps.cli analyze examples/procurement.json examples/scenarios.json --out artifacts/repeat.json
cmp artifacts/report.json artifacts/repeat.json
"$PYTHON_BIN" -m aps.cli validate report artifacts/report.json
"$PYTHON_BIN" -m aps.cli csv artifacts/report.json --out artifacts/hazards.csv
"$PYTHON_BIN" -m aps.cli dedup artifacts/report.json --out artifacts/deduplicated.json
cmp artifacts/report.json artifacts/deduplicated.json

opa check --strict policies/v1/procurement.rego
"$PYTHON_BIN" -m aps_governance.cli simulate-policy --bundle policies/v1 --cases policies/v1/cases.json --out artifacts/phase2/policy-simulation.json
"$PYTHON_BIN" -m aps_governance.cli trace artifacts/report.json --out artifacts/phase2/traceability.json
"$PYTHON_BIN" -m aps_governance.demo --audit-dir artifacts/phase2 > artifacts/phase2/demo-stdout.json
"$PYTHON_BIN" -m aps_governance.cli verify-receipts artifacts/phase2/authorization-receipts.json --public-key artifacts/phase2/receipt-public-key.txt
"$PYTHON_BIN" -m aps_governance.benchmark --out artifacts/phase2/enforcement-latency.json
