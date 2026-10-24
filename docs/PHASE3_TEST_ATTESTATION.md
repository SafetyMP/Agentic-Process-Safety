# Local test execution provenance

Replacement worker step 4 adds subprocess provenance for the four fresh verification
stages: unchanged trusted regression, TypeScript checking, Node tests and Phase3
tests. Each stage records its actual fixed argv, exit status, monotonic start/end,
before/after source/policy/topology/test/script snapshots and raw log SHA256.
Fresh logs and execution records are copied into the experiment directory and
bound by artifact links in an appended test_attestation event. The summary head
is advanced; trial records and historical evidence are preserved.

Dashboard inspection independently checks the chain, artifacts, exact stage set,
commands, run identity, timestamps, log bytes and current source snapshot.
Nonzero statuses remain failed, never merely present or attested successes.
Source changes during or after testing invalidate provenance. Acceptance now
requires passed test execution provenance. Generated reports disclose its status.

This is local execution provenance, not an external signature. The filesystem
owner can replace source, logs, ledger and head together. Raw logs retain test
counts and skips; exit zero is the test runner's result, not proof of complete
coverage. The existing optional alternate interpreter setting does not change
the explicitly recorded Phase3 test command, which uses the project venv.

Reproduce with `bash scripts/verify-phase3.sh`. It creates a fresh audit directory.
Focused checks: `PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_attestation.py -v`.
The two new tests execute real small subprocesses, reject changed commands,
clocks, source snapshots and logs, preserve nonzero exits, and check ledger-bound
artifact alteration rejection. Three honest latency/overhead measurements remain
unimplemented; Phase3 assurance and a controller completion receipt remain pending.

## Fresh verification

Stable-input audit: `artifacts/phase3/acceptance-jJpWjZc4/`.
Trusted regression passes 104 Python tests without skips and seven Node tests;
the separate Node stage also passes seven, including zero demand. Phase3 passes
39 tests without skips. Typecheck, experiment, attestation attachment, dashboard
and technical report pass. Acceptance verifies test attestation at evidence
sequence 31 and fails only the three absent measurements. All 30 trials execute;
110 actual SDK spans reconcile. No timeout or trusted verifier check was changed.

The first audit `acceptance-MEaUq53t` is retained: report implementation changed
during its test execution, and provenance validation correctly rejected its
before/after/current source mismatch. The stable rerun above uses fresh tests
and artifacts, not transferred statuses.

Offline wheelhouse verification freshly passes at
`artifacts/phase3/wheelhouse-verification-nkfuzuxz/`; distributions remain at
`dependencies/otel-wheels/`. Stable dashboard and report are respectively
`artifacts/phase3/acceptance-jJpWjZc4/dashboard/index.html` and
`artifacts/phase3/acceptance-jJpWjZc4/report.md`.
Evidence head: count 31, SHA256
`d9072668fe55be467a27040af11e386209cca9ba847d510dfb63d169397c5a75`.
Trusted `scripts/verify.sh` remains SHA256
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Remaining work requires timestamped detection and containment observations with
explicit fault/event semantics, and a controlled paired overhead experiment.
Unmatched A/B/C dispatch times remain descriptive. Broad goal semantics and
uninstrumented actions remain limitations; interpreter/toolchain binaries are
not authenticated by these local source snapshots. No completion is claimed.
