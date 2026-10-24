# Replacement worker step 2: trace correspondence acceptance

Strengthened `acceptance.py` with an independent `otel_event_correspondence`
check. It parses the SDK ConsoleSpanExporter's concatenated JSON objects and
requires exactly one root orchestration per recorded case/configuration. Gateway
children must share the parent's trace and match every signed receipt's outcome,
sequence, request, policy and result identifiers. Decision and conditional commit,
delegation and simulated external-action events must match the receipt. Missing,
duplicate and unlinked spans fail. Missing or malformed export fails explicitly.

This is a necessary correspondence check, not proof that bytes came from an
authentic SDK, that all runtime operations are instrumented, or that the filesystem
owner cannot replace evidence. Real SDK export is still blocked by the absent
dependency; synthetic parser fixtures are not export evidence. A/B calls currently
have no gateway receipts and must not acquire unexpected gateway spans.

Fresh focused evidence in `artifacts/phase3/replacement-step2/`:

- `telemetry-tests.log`: 4 tests, 3 pass and 1 explicit missing-SDK skip.
- `acceptance-tests.log`: 3 tests pass, including enforcement of correspondence
  failure when SDK/export is absent. No unrelated full workflow rerun.
- Trusted `scripts/verify.sh` SHA-256 remains
  `8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Next: obtain reviewed offline authentic SDK dependencies through the coordinator's
human decision process, then validate actual export with real runtime receipts.
Race/outage adapters, measured latency/overhead and test attestation remain open;
the earlier zero-demand timeout remains unreproduced under the bind restriction.
No prior pass status is transferred and no Phase 3 completion is claimed.
