# Same-version purchase race work unit

Inspected the untracked workspace, Phase1/2 interface notes, Phase3 plan,
replacement checkpoint, acceptance/report, latest outage changes and audit
acceptance-XrxLRKzX before editing. Existing files and historical evidence were
retained. No nested controller, external action or permission change was used.

The final missing finite adapter now submits two distinct purchase requests at
a two-party threading.Barrier after ordinary purchase delegation. Both carry
version 4, with different nonces, request IDs and idempotency keys. A/B use their
existing allowlist/budget semantics and serialize state mutation under a lock;
neither checks state versions. C concurrently invokes the actual Gateway, whose
SQLite transaction, OPA policy and signed receipt path serialize the requests.
Thread execution inherits the actual orchestration tracing context. Winner
identity is scheduling dependent; seeded inputs and the two-request schedule are
reproducible, not OS thread scheduling.

Observations are ordered by signed receipt sequence in C and locked mutation
version in A/B. C before-state is reconstructed from the preceding committed
response, not sampled concurrently outside the transaction. Denied responses
carry no state; the preceding committed state is retained. The second attempt
is classified stale by submitted versus observed commit-time version. A/B
produce two orders; C produces one and denies the stale request. This is a
bounded stale-state race, not a claim about all concurrency faults.

Acceptance rechecks distinct identities, shared submitted version, barrier
metadata, commit-state continuity, stale-attempt labels and final state; normal
receipt signatures, outcome reconciliation and authentic SDK span/event checks
still apply. New runtime tests cover seeds 0, 17 and 18; adversarial acceptance
tests alter version, nonce, violation and before-state in each arm.

Remaining assurance gaps: timestamped detection/containment provenance, causal
overhead design, source-bound test attestation and broader A/B tracing. The
finite budget comparator does not close broad semantic goal-conflict gaps.
No human risk acceptance, production approval or completion receipt is claimed.

Reproduce: `bash scripts/verify-phase3.sh` and
`bash scripts/verify-otel-wheelhouse.sh`. Fresh results are appended below.

## Fresh verification

`artifacts/phase3/acceptance-oGwBpCeX/checks.tsv`: trusted regression,
typecheck, Node, Phase3 tests, experiment, dashboard and technical report pass.
Python regression: 102 tests pass, no skips; Node: seven pass, including zero
demand. The historical ETIMEDOUT did not reproduce; no timeout was changed.
Phase3: 37 tests pass, no skips. Evidence acceptance exits 1 solely for three
unmeasured latency/causal-overhead fields and absent test attestation.

The fresh ledger records all 30 matched trials, no missing adapters, 27 attack
attempts, 16 unsafe mutations and 11 preventions. Per-arm unsafe mutations are
A=10, B=6, C=0, finite observations only. Genuine SDK export reconciles 110 spans:
30 orchestration roots and 80 receipt-linked children, with zero observed gaps.
Ledger head: `2b45fac505e9b4ca4c73b40934eba564c8fea04cb713fbfae71ee72a8fcb4ace`.
Dashboard: `artifacts/phase3/acceptance-oGwBpCeX/dashboard/index.html`.
Report: `artifacts/phase3/acceptance-oGwBpCeX/report.md`.

Offline wheelhouse verification passes with isolated install/export evidence at
`artifacts/phase3/wheelhouse-verification-1ex55nzc/`; wheels remain in
`dependencies/otel-wheels/`. Trusted verify.sh remains SHA256
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
No completion receipt is claimed. This checkpoint hands off remaining assurance
work to the controller.
