#!/usr/bin/env bash
# Fresh local simulations; retain failures and never convert missingness to success.
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH=packages/engine:packages/governance
PYTHON_BIN="${APS_PYTHON:-.venv/bin/python}"
mkdir -p artifacts/phase3
OUTPUT_DIR="$(mktemp -d artifacts/phase3/acceptance-XXXXXXXX)"
FAILED=0
run_check() {
    local label="$1"
    shift
    local status=0
    "$@" > "$OUTPUT_DIR/$label.log" 2>&1 || status=$?
    printf '%s\t%s\n' "$label" "$status" >> "$OUTPUT_DIR/checks.tsv"
    if [ "$status" -ne 0 ]; then FAILED=1; fi
}
for label in trusted-regression typecheck node-tests phase3-tests; do
    status=0
    "$PYTHON_BIN" -m aps_governance.attestation "$label" "$OUTPUT_DIR" || status=$?
    printf '%s\t%s\n' "$label" "$status" >> "$OUTPUT_DIR/checks.tsv"
    if [ "$status" -ne 0 ]; then FAILED=1; fi
done
run_check experiment "$PYTHON_BIN" -m aps_governance.experiment --seed 17 --repeats 1 --out "$OUTPUT_DIR/run"
run_check test-attestation "$PYTHON_BIN" -m aps_governance.attestation attach "$OUTPUT_DIR/run"
run_check dashboard "$PYTHON_BIN" -m aps_governance.dashboard "$OUTPUT_DIR/run" --out "$OUTPUT_DIR/dashboard"
run_check technical-report "$PYTHON_BIN" -m aps_governance.report "$OUTPUT_DIR/run" --out "$OUTPUT_DIR/report.md"
run_check evidence-acceptance "$PYTHON_BIN" -m aps_governance.acceptance "$OUTPUT_DIR/run" --out "$OUTPUT_DIR/acceptance.json"
printf 'Phase 3 audit outputs: %s (failure=%s)\n' "$OUTPUT_DIR" "$FAILED"
exit "$FAILED"
