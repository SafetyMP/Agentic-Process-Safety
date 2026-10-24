# Replacement run: dependency and timeout investigation

Fresh worker inspection on 2026-10-20. Previous pass status is not transferred.
All project files remain untracked; existing evidence and partial step16 work
are preserved. No controller, settings, permissions, accounts or policies changed.

Inspected Phase1/2 simulator adapter, Python demo, real OPA evaluator, gateway
interfaces, Phase3 plan/report/acceptance, telemetry and experiment implementation
and focused tests. Current experiment explicitly leaves race and outage adapters
missing. Cascade injection is present. Hazard requirement proposals and human
risk acceptance remain human gates, not approvals established by simulation.

The latest supplied audit `artifacts/phase3/acceptance-DedjQBvL/checks.tsv`
records zero exit codes for regression, typecheck, Node, Phase3 tests, experiment,
dashboard and report, but evidence acceptance exits 1. Its acceptance JSON still
rejects six missing race/outage trials, unavailable SDK export, missing latency
and causal overhead, and absent test attestation. These are inspected historical
outputs, not fresh successful executions from this worker.

## Fresh focused evidence

All new output is under `artifacts/phase3/replacement-step1/`.

- `zero-demand.log`: the single selected Node zero-demand test fails in about
  129 ms with Operation not permitted. It does not reproduce ETIMEDOUT.
- `zero-demand-python.log`: direct Python execution confirms the failure is
  `socket.bind` at service.py's ThreadingHTTPServer construction, before any
  request dispatch. This restriction prevents timeout reproduction here.
- `telemetry-tests.log`: three tests run, two pass, one explicitly skips because
  the real SDK is missing. Real export is unverified.
- `otel-installed.log`: pip reports both opentelemetry-api and opentelemetry-sdk
  absent. `pip-cache.log` reports pip's cache command disabled because the cache
  directory is not writable by this worker.
- `local-dependency-inventory.json`: independent read-only inspection of the
  readable pip HTTP cache scans 11 ZIP archives with no read errors and finds
  none containing OpenTelemetry. The default Python import spec is absent.
  A filename search of the local runtime cache also found no OTel dependency.
  This is a bounded local search, not proof that no copy exists anywhere.

Reproduce the focused Node test:

```sh
node --experimental-strip-types --test --test-name-pattern='zero demand' packages/simulator/src/simulate.test.ts
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_telemetry.py -v
```

The prior 52.7-second timeout remains unexplained. Do not increase the client
timeout or bypass the real gateway on this evidence. A permitted execution of
the focused test with process/thread stack capture during a stall is needed to
distinguish scheduling, subprocess, HTTP and shutdown delays.

## Narrow unblock decision and next work

With network_access=false retained, provide a reviewed offline wheel set for
opentelemetry-sdk and its compatible dependencies in the workspace, including
version and hash provenance. Then pin authentic distributions and verify real
local export, event linkage and loss. No package version or authenticity is
invented here. This worker has not requested expanded network or bind authority.
The coordinator must obtain any required human decision; this report grants none.

Race/outage implementations and measurement/attestation provenance remain
independent pending work. Avoid unrelated full reruns until those gaps change.
The trusted verifier remains SHA-256
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
No complete Phase3 claim or completion receipt is issued.
