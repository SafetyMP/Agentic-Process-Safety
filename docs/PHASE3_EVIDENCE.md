# Phase 3 evidence foundation

`aps_governance.evidence` is an initial primitive, not completed continuous
assurance. It adds no tool authority, approval path or external action.

`EvidenceLog(path).append(run_id, kind, payload, links, expected_head=None)`
appends a canonical JSON envelope inside a serialized SQLite transaction. Every
record binds its sequence, preceding SHA-256 hash and complete event. All earlier
records are verified before each append. Update/delete triggers guard normal SQL
paths. `records()` verifies a full ordered snapshot before returning it.

Links carry `relation`, `target`, and canonical object `digest` for hazards,
requirements, policies, tests, traces and outcomes. `artifact_link(root, relative)`
instead hashes raw file bytes. `verify(records, expected_head=None,
artifact_root=None)` checks order, hashes and optionally referenced file bytes.
Retain its `{count, hash}` result independently; passing that head to later
verification detects tail truncation and rollback to an earlier prefix. Passing
the head to append provides optimistic concurrency control and rejects a stale
writer without appending. Paths escaping the supplied artifact root, including
resolved symlinks, are rejected. Callers must keep that root protected while
verification reads files; this is not an adversarial-filesystem TOCTOU defense.

Reproduce focused acceptance from the repository root:

```sh
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -W error::ResourceWarning -m unittest discover -s tests -p 'test_phase3_evidence.py' -v
```

The seven tests include fresh Phase 1 analysis and Phase 2 proposal generation:
96 findings, 16 proposed requirements, zero approved requirements. They check
alteration/reordering/deletion, valid-prefix truncation, separately pinned heads,
artifact-byte mismatch/path escape, SQL write rejection, privileged corruption,
concurrent writers, restart, caller-object mutation, and nonfinite/malformed
input. These are primitive tests, not recorded A/B/C experimental outcomes.

## Trust and integration limits

Hashes establish consistency, not authorship, human judgment, source truth or
safety. A process able to replace the database can rewrite an entire chain and
its locally stored head. No external anchoring, signing key, identity attestation,
retention or backup guarantee is added. A valid unpinned prefix is valid by design.
Semantic links are references to caller-supplied digests: this layer does not
resolve a hazard/control relationship, validate approval signatures, prove a test
ran, or prove an OTel exporter delivered a span. Artifact verification checks
bytes only when the caller supplies `artifact_root`; otherwise links remain
unresolved. Missing artifacts raise errors rather than imply successful coverage.

No automatic timestamp is added: runners must name measured clocks, scope and
missingness in event payloads. No telemetry or metrics are invented. Do not write
bearer tokens or private keys into payloads. Payload confidentiality/redaction,
size limits, schema-specific events and retention remain integration work.
Append currently verifies the full chain, so total append work grows quadratically
with chain length; finite local experiments only until scaling is designed.

This log is separate from the gateway transaction. Recording an effect here
cannot yet be atomic with that effect. Future runners must preserve gateway
authorization receipts and record reconciliation gaps; the dashboard must expose
missing/unresolved evidence. Requirement review states must be copied from the
authentic trace and may not be promoted based on passing experiments.

`scripts/verify.sh` remains unchanged. A complete `scripts/verify-phase3.sh`
remains to be implemented alongside the seeded runtime, OTel, metrics, dashboard
and report. This foundation alone does not meet that acceptance goal.
