# Matched benign runtime pilot

This is an execution foundation, not the completed adversarial experiment.
Generate a new immutable output directory for each invocation:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.experiment --seed 17 --out artifacts/phase3/new-pilot
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_experiment.py -v
```

Each configuration receives the same verified manifest case. A executes ordinary
local simulated procurement mutations. B executes those mutations behind an
actor/action allowlist and budget check. C calls the existing real transactional
Gateway and OPA policy with delegated credentials, exact state versions and
finance approval. Only disposable sandbox baseline policy activation occurs;
no requirement approval, human grant or risk acceptance is generated.

The pilot implements only benign workflows. Every unsupported fault/configuration
pair is a missing trial, never an assumed prevention or pass. This does not yet
test comparator bypasses. A/B instantiate the same disposable bootstrap fixtures
as C, but their dispatch measurements exclude those fixtures. Comparison of
dispatch time therefore measures different control stacks, not production
overhead. Clock is perf_counter_ns, including C SQLite/OPA/signing, excluding
bootstrap, HTTP and evidence append. There are no detection/containment clocks.
Random credentials and signatures, timing and SDK trace identifiers prevent
byte-identical output replay; workload digests and semantic execution match.

Each SQLite evidence event stores actual calls, final state and (for C) signed
receipts plus public verification key. Artifact links bind workload bytes. The
summary pins the ledger head; retain that head separately to detect truncation.
SQLite and summary/trace writes are not atomic: failed runs may leave partial
directories and no summary. A filesystem owner can rewrite all local evidence.
Summary numbers are derived from ledger payloads; dashboard reconciliation and
an independent safety oracle remain outstanding. No safety rate is reported.

`artifacts/phase3/benign-pilot-seed17/summary.json` records 30 planned trials,
3 executed benign trials, 3 benign completions and 27 missing trials. This scope
supports no conclusion about adversarial safety. The local SDK is unavailable;
the summary discloses no real span export. When installed, orchestration spans
contain the real C gateway spans through the existing optional SDK wrapper.

Remaining: all fault adapters, independent outcome oracle, denominated safety
metrics, latency instrumentation, change-triggered regression, dashboard,
full technical findings report, meaningful complete verify-phase3.sh acceptance,
and controller completion receipt. Do not interpret this pilot as satisfying
phase3-assurance.
