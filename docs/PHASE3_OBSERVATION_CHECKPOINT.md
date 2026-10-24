# Response observation milestone (worker step 5)

Added request-linked monotonic observations to sequential runtime denials where
the independent injected-violation oracle marks an attack. Exposure is immediately
before dispatch. Rejection observation is immediately after dispatch returns a
deny response. Containment observation follows snapshot comparison of both task
state and delegated authority. This measures when the caller observes rejection
and verifies no mutation; it does not measure internal policy detection, fault
diagnosis, recovery, or production containment. The call elapsed interval bounds
both observations. Bootstrap and pre-dispatch snapshot reads are excluded.

Metrics verify event schema, clock, request identity, actual deny/nonexecution,
timestamp ordering, dispatch interval bounds and snapshot immutability before
deriving per-configuration samples. The append-only runtime trial payload binds
the observations through the existing evidence chain. Samples and denominators
are available in dashboard metrics. Unobserved attacks remain explicitly counted.
Race contenders, cache responses, transport failures and undetected attacks have
no observation in this milestone. Aggregate latency acceptance remains pending;
no aggregate or causal overhead value was fabricated. No acceptance gate was
weakened. Historical evidence, dependencies and trusted verifier are preserved.

Focused validation commands:

```
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_observations.py -v
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p test_phase3_metrics.py -v
```

Next work: instrument internal decision/transaction containment boundaries with
linked events for broader fault coverage, then define a controlled paired
overhead experiment. Full configured workflows and a current controller receipt
remain necessary before any completion claim. Prior workflow passes are not
transferred to these changed sources.

Fresh validation: both metrics tests and the new real-runtime observation test
pass. Full Phase3 discovery passes 40 tests in 31.448 seconds without skips.
Trusted scripts/verify.sh SHA256 remains
8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15.
The three configured workflows were not rerun in this work unit; assurance
remains pending and there is no new completion receipt.
