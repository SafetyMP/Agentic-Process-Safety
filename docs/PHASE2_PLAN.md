# Phase 2 plan and inspection

Inspected all Phase 1 Python/TypeScript source, schemas, examples, tests, manifests, verification scripts and documentation before changes. The baseline regression suite passed (`artifacts/phase1-baseline.log`). Phase 1 findings are all unverified; none may silently become an approved requirement.

1. Add strict governance contracts, independent OPA/Rego evaluation and a deny-by-default policy library.
2. Introduce an execution gateway with authenticated, scoped clients; server-owned state, provenance, approvals and capabilities; atomic replay/idempotency/budget handling; tamper-evident receipts.
3. Keep administration offline and credential-separated. Add proposed requirement/control traceability, human promotion gates and simulation-before-activation tooling.
4. Route the five existing mock tools through the gateway, retaining Phase 1 simulation output and hazard identity behavior.
5. Exercise positive, negative, malformed, outage, timeout, boundary, concurrency and bypass cases; rerun full regressions; measure local enforcement latency.
6. Document architecture, threat model, controls, evidence and remaining limitations. Stop at Phase 2.
