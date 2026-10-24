# Phase 3 operations and evidence handoff

Run commands from the repository root. Phase 1 provides HAZOP screening; Phase 2
provides the policy gateway; Phase 3 measures finite simulated A/B/C workloads
and checks their evidence. All finite workload adapters are implemented. Older
checkpoint documents retain accurate historical partial states, not current gaps.
No real purchase, payment or production action is authorized by these workflows.

## Prerequisites and offline SDK

Use Python 3.11+, Node 22.18+, OPA 1.x on PATH, the project `.venv`, installed
`requirements.lock` dependencies and `npm ci` dependencies. README covers initial
setup; the following commands assume these already exist. Regression tests need
local loopback binding. The wheelhouse verifier uses disposable system temporary
storage under `/private/tmp/aps-otel-verification-*`, removes that environment and
retains evidence in the workspace. Restricted workers must report permission
failures without seeking escalation or moving the verifier environment.

Install the supplied SDK and its dependencies without network or source builds:

```sh
.venv/bin/python -m pip install --no-index --find-links dependencies/otel-wheels --require-hashes -r dependencies/otel-wheels/requirements.lock
```

The wheel manifest and lock pin SDK/API 1.38.0, semantic conventions 0.59b0 and
runtime dependencies. These are selected releases, not a latest-version claim.
See [wheelhouse details](../dependencies/otel-wheels/README.md). Offline SDK
installation does not supply unrelated base Python, Node or OPA prerequisites.

## Three verification commands

```sh
bash scripts/verify.sh
bash scripts/verify-otel-wheelhouse.sh
bash scripts/verify-phase3.sh
```

The first is the unchanged trusted regression verifier. Its SHA256 is
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
The second validates wheel bytes/locks, isolated offline installation and real
SDK export. The third is the PRIMARY complete fresh attested assurance workflow:
it executes trusted regression, typecheck, Node tests and Phase 3 tests with
source snapshots and raw log hashes, runs an experiment, attaches those genuine
executions, and generates dashboard, technical report and evidence acceptance.
It continues recording stage failures, exits nonzero if any stage fails and
prints `Phase 3 audit outputs: artifacts/phase3/acceptance-XXXXXXXX (failure=...)`.
Do not convert failed or skipped tests into successful evidence.

Each invocation creates a fresh output directory; preserve failures and previous
successful runs. Do not edit source during verification. Source-bound provenance
rejects changed inputs, including report template changes. A report-only rerender
cannot refresh old test attestation. Never forge or reuse execution attestation;
rerun the full script for coherent current evidence.

## Inspect the printed directory

Paths below are relative to that directory; keep the sibling layout intact:

* `checks.tsv` and stage `*.log`: actual stage exits, test counts, skips and errors.
* `report.md`: evidence-derived denominators, sample identities, limits and links
  to `dashboard/index.html#evidence-N`.
* `dashboard/index.html` and `dashboard/data.json`: offline trial/state/authority
  inspection, mappings, measurements, missingness, trace reconciliation and human
  review queue. No server or approval interface is required.
* `acceptance.json`: individual gate outcomes and pinned evidence head. All checks
  must pass; the existence of the file is not a pass or a controller receipt.
* `run/workload.json`, `run/summary.json`, `run/evidence.sqlite`: generated inputs,
  summary and append-only linked evidence ledger. Inspect trial and overhead pair
  sequences against the pinned head rather than trusting aggregate counts alone.
* `run/spans.jsonl`, `run/overhead-spans.jsonl`: real SDK spans and paired-arm trace
  evidence. Check identities and reconciliation, not just nonempty files.
* `run/test-executions/`: copied raw logs and execution records bound by the
  ledger test_attestation event. Compare source snapshots, commands, run identity,
  clocks, statuses and log digests; sibling execution files retain original runs.

Prior verified evidence is retained at
[report](../artifacts/phase3/acceptance-k1FQQ67v/report.md),
[dashboard](../artifacts/phase3/acceptance-k1FQQ67v/dashboard/index.html) and
[acceptance](../artifacts/phase3/acceptance-k1FQQ67v/acceptance.json).
[Historical recheck](PHASE3_ASSURANCE_RECHECK.md) documents `acceptance-sf99nFBL`.
These are historical observations: after this report-template edit they do not
establish current source-bound freshness. Artifacts may be local/ignored; use a
fresh full command to regenerate. Independent prior seed-29 validation is already
recorded; this handoff creates no new experimental results or timing estimates.

## Seed controls and interpretation

The full script fixes `--seed 17 --repeats 1`; it has no seed/repeats CLI flags.
`APS_PYTHON` selects the script interpreter, but the attested Phase 3 test command
still uses the project venv. For manual exploration only:

```sh
export PYTHONPATH=packages/engine:packages/governance
.venv/bin/python -m aps_governance.experiment --seed 29 --repeats 1 --out NEW_DIRECTORY/run
.venv/bin/python -m aps_governance.dashboard NEW_DIRECTORY/run --out NEW_DIRECTORY/dashboard
.venv/bin/python -m aps_governance.report NEW_DIRECTORY/run --out NEW_DIRECTORY/report.md
```

Choose a nonexistent run/output path. These commands are unattested: acceptance
will fail without genuine executed source-bound test attestation. They do not
claim a passing full workflow. Seeds reproduce workload inputs, not keys, nonces,
timings or evidence bytes. Repeats change generated workload blocks, not the fixed
four-pair overhead design. A/B/C share matched task inputs but execute different
work; their dispatch durations cannot establish causal overhead.

Inspect planned/recorded/missing trial denominators separately. Missing trials
are excluded from observed outcome rates, false denials use explicit benign
controls, and undefined rates stay null. Authorization and order mutations are
events, not unique incidents. Complete fault execution does not mean complete
internal timing coverage: prior validated repeats-1 evidence has six internal C
samples, with missing internal measurements A 10/10, B 9/9, C 2/8 attack calls.
These are missing measurements, not missing adapters or successful detections.

Detection measures caller exposure to internal gateway decision; containment
measures exposure to successful transaction exit after committed denial, with
unchanged simulated task state and delegated authority. `perf_counter_ns` is a
local monotonic clock; signed receipts bind identities, not signed clock values.
Caller-response rejection observations are distinct from internal decision clocks.
Dispatch excludes bootstrap and HTTP; logical approval-expiry time is injected.
Neither containment scope nor clock scope proves physical-world containment.

Overhead uses four ledger-bound counterbalanced matched pairs with warmup per
arm. Only OPA policy enforcement is ablated; gateway prechecks remain. This is
incremental policy enforcement overhead, not whole governance stack cost.
Inspect raw intervals, arm setup, receipts and pair sequences. Negative differences
are retained; four pairs remain subject to scheduler/cache noise.

## Content-triggered regression

The actual CLI is on demand, with optional `--root`, required `--out`, and `--force`:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.regression --out artifacts/phase3/change-regression
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.regression --out artifacts/phase3/change-regression --force
```

It fingerprints packages, policies, examples, schemas, tests, scripts and selected
dependency manifests, invokes the full script, rehashes inputs after execution,
and retains `regression.json` and `verification.log`. Only a matching successful
snapshot with intact retained log can be reused. Failed/invalid/missing cache
executes again. Output must be outside watched trees. No watcher or hook is
installed. README/docs, external agent configuration and environment/toolchain
changes are not all fingerprinted: use `--force` for such changes. Local cache
hashes are change detection, not independent attestation.

## Residual limits and human decision

Semantic goals beyond the implemented oracle, physical truth, cancellation
intent, unmapped/unreviewed hazards and production distributions remain outside
these finite observations. Local owners can replace ledger, pinned head, source
and logs together; there is no external trust anchor. Evidence, gateway state and
trace export are not atomic. Shared oracle errors can survive consistency checks.

Intermittent Python spawnSync timeouts occurred in retained Node subprocess
trials. They were not reproduced in the latest prior passing workflow, but their
CAUSE IS UNRESOLVED; this is not a fix claim. Preserve timeout trials and logs.
Restricted loopback failures must likewise remain explicit, with independent
configured verifiers responsible for checks the worker cannot execute.

Human review is mandatory for hazard applicability, requirement approval,
residual-risk acceptance and any production decision. Passing local acceptance
does not grant these approvals, establish complete safety or replace a current
independently validated controller completion receipt.
