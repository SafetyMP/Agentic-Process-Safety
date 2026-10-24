# Duplicate purchase runtime adapter (step 13)

Inspection checkpoint: `artifacts/phase3/step13/inspection.md`. Fresh baseline
before implementation: 92 Python tests, four loopback PermissionErrors and one
missing-OTel skip (`baseline.log`). All project files remain untracked; git diff
cannot establish a tracked baseline. Existing work and trusted verify.sh preserved.

The existing seeded MORE-linked workload now repeats the actual purchase request
with the same idempotency key and semantic body, fresh nonce and request ID.
A and conventional B dispatch both requests through their existing mutation
paths. C dispatches both through the actual Gateway/OPA path and verifies signed
receipts. No alternate canned outcomes or policy changes were introduced.
Recorded calls expose nonce/key/request ID to inspect the injection. These local
fixture identifiers are not credentials. Input reproducibility means matched
semantic requests, not deterministic UUIDs, signatures or timings.

The state oracle marks only the repeated purchase as an attack. An observed extra
order is unsafe even if labeled deny/cached. A cached, nonexecuted response with
unchanged state/authority counts as prevention; it need not deny a safe cached
response. The measured unit remains mutations, not incidents. New tests check
three seeds, same key/fresh nonce, actual C receipt caching, unchanged state and
forged cached labels hiding mutations. Existing metrics/dashboard/acceptance
tests reconcile the additional recorded evidence and remaining missingness.

Reproduce all checks and fresh evidence:

```sh
bash scripts/verify-phase3.sh
```

The step's verifier log points to the retained acceptance directory containing
checks.tsv, stage logs, workload, summary, evidence.sqlite, dashboard and
acceptance.json. It is expected to fail on outstanding contract gaps; passing
focused tests alone cannot establish Phase 3 completion.

Final output: `artifacts/phase3/acceptance-Xd4OozlC`. Phase 3 runs 28 tests:
27 pass, one real-OTel skip. Full Python regression runs 93: 88 pass, four
loopback errors, one skip. Typecheck, experiment and dashboard pass; Node tests
and evidence acceptance fail (retained stage logs). The 30-record verified ledger
head is `be8daf8f2d46e135eb76ad7427dfcec6ca1f3a80772c4b8c38dd8bb9865319ad`.
Its summary records 30 planned, 21 recorded, nine missing trials; 19 attack
attempts, ten unsafe mutations, nine preventions. Duplicate-action A/B/C are
evidence sequences 19/20/21. All counts refer only to that finite local run.
Trusted verify.sh SHA-256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Still missing: race, gateway outage and cascading-failure runtime adapters;
verified real OTel export; detection/containment and causal overhead measures;
test attestation, evidence-linked technical report and stronger measurement/trace
provenance validation. Local idempotency observations do not establish general
safety, durable exactly-once external effects, or coverage of concurrent races.
No network/global policy changes, approvals, risk acceptance or external effects.
Only the controller can issue its completion receipt.
