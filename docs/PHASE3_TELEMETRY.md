# Optional OpenTelemetry boundary

`aps_governance.telemetry.Telemetry(path)` uses the actual OpenTelemetry SDK's
TracerProvider, SimpleSpanProcessor and ConsoleSpanExporter to a newly created
local file. It does not install a global provider or use a remote collector.
The file contains successive pretty JSON span objects, not JSONL. No SDK is
vendored, downloaded or claimed to be installed. A reviewed environment needs
`opentelemetry-sdk` before actual export can be verified; dependency pinning is
still outstanding.

Use `with telemetry.span('orchestration'):` around a runner, and wrap its existing
gateway in `TracedGateway(gateway, telemetry)`. Actual gateway responses supply
decision, policy and receipt hashes. Delegation, state changes and simulated
purchase events occur only after the real gateway transaction returns. Exceptions
propagate and are handled by the SDK's context manager. No credentials, payloads
or context text are added to attributes. Existing gateway defaults are unchanged;
the experiment runner must explicitly integrate this wrapper.

Inspect `status` and call `flush()` before recording telemetry status as evidence.
SDK absence, no export destination, initialization failures and flush failures
are explicit gaps. Flush success is an SDK result, not independent proof of
complete durable export. Exporter-internal errors can be logged by OTel without
raising; reconcile exported receipt sequences against gateway receipts. Such
reconciliation and export-failure tests remain outstanding. Traces are not
atomic with SQLite; process failure may leave committed actions without spans.
Denied policy decisions are recorded from the receipt, not from internal OPA
evaluation spans. Logical approval time and SDK wall-clock timestamps must not
be treated as interchangeable latency measurements.

Current worker validation:

```
PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m unittest discover -s tests -p 'test_phase3_telemetry.py' -v
```

See `artifacts/phase3/telemetry-tests.log`: two passes and one explicit SDK export
skip. This is integration scaffolding with verified unavailable behavior, not
complete tracing acceptance, matched experiments or evidence of safety.
