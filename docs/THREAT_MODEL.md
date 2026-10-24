# Phase 2 threat model

## Assets and assumptions

Protect scoped tool authority, task state, budget, approval integrity, policy administration, provenance references and decision evidence. Agents, their prompts, supplier text and request bodies are untrusted. The trusted computing base includes the Python gateway/HTTP server, schema validator, SQLite, cryptography implementation, OPA executable, authenticated administrator, OS and key/database access controls. Time comes from the gateway host; trusted time synchronization is assumed.

The attacker may control an agent token and all requests for that identity, replay captured requests, supply adversarial supplier text, invoke unknown endpoints, alter request fields, or race requests. The attacker does not possess the offline administrator key, another agent's token, receipt key, or write access to gateway code/state. This filesystem/process separation must be supplied by deployment; the disposable demo does not create OS sandboxes.

## Threat-to-control and evidence matrix

| Attempt | Defense | Test evidence |
| --- | --- | --- |
| Claim another actor, act across tasks/resources | Hashed bearer authentication, body-actor equality, task capability and exact resource | scope, task_resource_scope, HTTP authentication tests |
| Invoke finance/purchase from supplier | Per-agent Rego allowlist, private adapters, no direct tool endpoints | scope, no_legacy_tool_bypass, no_administration_or_direct_tool_route |
| Change/approve own policy | No administration routes, independent offline key, signed manifest | admin_and_unsigned_policy, candidate_must_be_reviewed_and_simulated |
| Tamper policy source or reuse old version | Frozen snapshot, active manifest digest, unique version history | modified_policy_file_cannot_change_running_snapshot, policy_activation_stops_old_worker |
| Forge human approval in free-form context | No approval fields in schema, server-owned context, signed offline human grant | malformed, context, review_required_then_external_approval |
| Escalate/recurse delegation | Parent-derived depth, ceiling and one-hop worker allowlists | depth |
| Act before prerequisite or on stale state | Server stage and version predicates under transaction | order, state |
| Change supplier/amount after approval | Exact purchase binding, policy digest and state checks | binding, approval, sod |
| Expired/replayed approval | TTL, consumed approval, persistent nonce uniqueness | expiry, task_expiry, replay, restart_retains_replay_and_idempotency |
| Duplicate concurrent purchase | Atomic nonce/idempotency/state/spend/receipt transaction | concurrent_submission: eight requests, one execution |
| Overspend or avoid threshold | Rego task budget/policy cap and independent human grant | caps, policy_cap_boundary, threshold_and_human_separation, review_required_then_external_approval |
| Ignore a review timeout | Persistent pending deadline, escalation, reject late grant | review_timeout |
| Exploit policy outage/error/undefined result | Strict OPA flags, subprocess timeout, validated allow/deny/review result | outage, timeout_and_policy_errors, undefined_and_builtin_errors |
| Malformed input or poisoned JSON | Strict schemas, duplicate-key/nonfinite rejection, body bound | malformed, bounded_fuzz_inputs, HTTP malformed/oversize tests |
| Forge evidence or partially commit effect | Ed25519 receipts, sequence/hash chain, atomic rollback | receipt_signatures_and_chain, atomic_receipt_failure, HTTP storage outage |

Hypothesis tests are configured for 100 examples across three properties using real OPA: allow implies cap/budget/review authority, reducing budget cannot create allow, and human grants cannot override delegation ceilings. They use deterministic generation with shrinking and no persistent database. Separately, the seeded malformed-input test exercises 80 generated cases. Neither test strategy proves exhaustive correctness. Spending boundaries, threshold boundaries, TTL equality, version changes and concurrent duplicate submissions have explicit tests. Policy-case fixtures exercise positive and negative Rego outcomes; they do not replace gateway integration tests.

## Residual risks and excluded claims

- No live transaction adapter exists. Local SQLite effects can be atomic; an external purchase/payment service would need a separate idempotency and reconciliation design.
- An OS administrator, compromised gateway/OPA binary, stolen administrator key, database writer, or process with access to every credential can defeat the model. No claim is made to stop unrestricted same-user Python execution or filesystem edits.
- Loopback HTTP uses bearer authentication without TLS. Remote deployment is not supported; TLS/mTLS, hardened proxying, secret distribution and revocation remain gaps.
- Clock rollback may extend validity. Clock synchronization, key rotation, external receipt anchoring, durable backup/restore validation and revocation are not implemented.
- SQLite serializes calls, and receipt/nonces grow without bound. There is no rate limiter, audit retention policy, background timeout notification, distributed deployment or high-availability guarantee. An attacker may cause denial of service; failed requests cannot gain tool authority.
- Context provenance proves selection of a trusted fixture-loader record, not that the forecast or physical stock is true. Supplier eligibility and prices are fixed mocks. Goal drift, conflicting objectives, physical reconciliation and cancellation intent retain explicit traceability gaps.
- Human expertise, real risk acceptance and control effectiveness are not established by these tests. Signed receipts attest to recorded authorization decisions under a key; they are never proof of safe actions.

No Phase 3 capability, live procurement integration or safety certification is included.
