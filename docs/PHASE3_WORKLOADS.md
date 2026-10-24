# Seeded workload inputs (milestone 2)

This is an input-generation milestone, not an executed A/B/C experiment. No unsafe
action, prevention, completion, latency or overhead measurements exist here.

Reproduce from the repository root:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.workloads --seed 17 --repeats 2 --out artifacts/phase3/workload-seed17.json
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p 'test_phase3*.py' -v
```

The versioned SHA-256 counter generator creates ten cases per block: one benign
control and the nine requested fault families. All cases in a block share demand,
stock and budget. A/B/C identifiers are outside case inputs, allowing the future
runner to replay identical case bytes in all configurations. There are no random
UUIDs, wall clock values or global PRNG dependencies in input generation.

The manifest binds topology, scenarios, policy configuration, freshly analyzed
Phase 1 report and freshly proposed Phase 2 traceability. Each case carries real
hazard IDs/digests/review states and proposed requirement/control mappings. Broad
deviation mappings are not proof of effective mitigation; unmapped goal-conflict
controls retain their existing gap status. No approval or risk acceptance occurs.
`verify_manifest` regenerates the entire manifest from source inputs, so editing
and rehashing a case does not evade the check. Generator source identity and OPA
module identity must also be pinned by the future execution manifest.

Logical clock offsets and barrier participant counts are schedule inputs. They
do not measure real detection/containment latency or promise deterministic thread
lock ordering. Fault injection strings and oracle definitions still require a
runtime adapter and independent state-based outcome classification. The runner
must record missing outcomes rather than treating these definitions as results.
Goal semantics beyond observable budget violations remain unmeasured.

`artifacts/phase3/workload-tests.log` records five focused passing tests.
`artifacts/phase3/step2-tests.log` records the combined evidence/workload suite.
The 20-case seed-17 artifact is input evidence only, not 60 completed trials.
