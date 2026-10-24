"""Optional real OpenTelemetry integration; no synthetic fallback spans."""
from contextlib import contextmanager
import json


def verify_export(path, trials):
    """Reconcile real SDK ConsoleSpanExporter objects with verified trial receipts.

    This checks correspondence and observed loss, not exporter authenticity or
    completeness of the runtime instrumentation outside these recorded trials.
    """
    raw = path.read_text().strip()
    spans, decoder = [], json.JSONDecoder()
    while raw:
        span, end = decoder.raw_decode(raw)
        spans.append(span)
        raw = raw[end:].lstrip()
    identities = [(s['context']['trace_id'], s['context']['span_id']) for s in spans]
    if len(set(identities)) != len(identities):
        raise ValueError('Duplicate exported span identity')
    parents = {}
    for span in spans:
        if span['name'] == 'orchestration':
            attrs = span['attributes']
            key = (attrs['aps.case'], attrs['aps.configuration'])
            if key in parents or span.get('parent_id') is not None:
                raise ValueError('Duplicate or nested orchestration')
            parents[key] = span
        elif span['name'] != 'gateway.call':
            raise ValueError('Unexpected exported span')
    expected_trials = {(t['case_id'], t['configuration']): t for t in trials
                       if t['status'] == 'recorded'}
    if parents.keys() != expected_trials.keys():
        raise ValueError('Orchestration export loss or unexpected trial')
    consumed = set()
    receipt_count = 0
    for key, trial in expected_trials.items():
        parent = parents[key]
        expected_failures = [('transport.failure', {
            'action': c['action'], 'request_id': c['request_id'],
            'boundary': 'local_pre_dispatch', 'exception_type': 'ConnectionError'})
            for c in trial['calls'] if c.get('transport_error')]
        if [(e['name'], e['attributes']) for e in parent['events']] != expected_failures:
            raise ValueError('Transport event correspondence mismatch')
        children = [s for s in spans if s['name'] == 'gateway.call'
                    and s['parent_id'] == parent['context']['span_id']
                    and s['context']['trace_id'] == parent['context']['trace_id']]
        receipts = trial.get('receipts', [])
        if len(children) != len(receipts):
            raise ValueError('Gateway export loss or unexpected call')
        by_sequence = {s['attributes']['aps.sequence']: s for s in children}
        if len(by_sequence) != len(children):
            raise ValueError('Duplicate receipt span')
        for receipt in receipts:
            span = by_sequence.get(receipt['sequence'])
            if span is None or any(span['attributes'].get('aps.' + f) != receipt[f]
                                   for f in ('actor', 'action', 'decision', 'reason', 'executed',
                                             'cached', 'sequence', 'request_hash', 'policy_digest', 'result_hash')):
                raise ValueError('Span receipt correspondence mismatch')
            from .contracts import sha
            linked = [c['gateway_observation'] for c in trial['calls']
                      if (c.get('gateway_observation') or {}).get('receipt_hash') == sha(receipt)
                      ]
            if len(linked) > 1:
                raise ValueError('Duplicate gateway boundary linkage')
            if linked and any(span['attributes'].get('aps.boundary.' + f) != linked[0][f]
                              for f in ('entered_ns', 'decision_ns', 'transaction_exited_ns',
                                        'request_id', 'request_hash', 'receipt_hash')):
                raise ValueError('Span gateway boundary correspondence mismatch')
            expected = [('policy.decision', {'decision': receipt['decision'], 'reason': receipt['reason']})]
            if receipt['executed']:
                expected.append(('delegation.committed' if receipt['action'] == 'delegate_mock'
                                 else 'state_change.committed', {'receipt_sequence': receipt['sequence']}))
                if receipt['action'] == 'purchase_mock':
                    expected.append(('external_action.simulated', {'receipt_sequence': receipt['sequence']}))
            actual = [(e['name'], e['attributes']) for e in span['events']]
            if actual != expected:
                raise ValueError('Span event correspondence mismatch')
            consumed.add((span['context']['trace_id'], span['context']['span_id']))
            receipt_count += 1
    if len(consumed) + len(parents) != len(spans):
        raise ValueError('Unlinked exported gateway span')
    return {'exported_spans': len(spans), 'orchestrations': len(parents),
            'matched_receipts': receipt_count, 'missing_spans': 0}


class Telemetry:
    def __init__(self, output=None):
        self.provider = self.tracer = self.stream = None
        self.status = {'sdk_available': False, 'export_configured': False,
                       'flush_success': None, 'gap': 'not initialized'}
        try:
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
        except ImportError as exc:
            self.status['gap'] = 'OpenTelemetry SDK unavailable: ' + str(exc)
            return
        self.status['sdk_available'] = True
        if output is None:
            self.status['gap'] = 'No local export destination configured'
            return
        try:
            self.stream = open(output, 'x', encoding='utf-8')
            self.provider = TracerProvider()
            self.provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter(out=self.stream)))
            self.tracer = self.provider.get_tracer('aps.assurance', '0.1')
            self.status.update(export_configured=True, gap=None)
        except Exception as exc:
            if self.stream:
                self.stream.close()
            self.status['gap'] = 'Exporter initialization failed: ' + type(exc).__name__

    @contextmanager
    def span(self, name, attributes=None):
        if self.tracer is None:
            yield None
            return
        with self.tracer.start_as_current_span(name, attributes=attributes or {}) as span:
            yield span

    def flush(self):
        if self.provider is None:
            return False
        try:
            ok = self.provider.force_flush()
            self.stream.flush()
            self.status['flush_success'] = bool(ok)
            if not ok:
                self.status['gap'] = 'SDK force_flush returned false'
            return bool(ok)
        except Exception as exc:
            self.status.update(flush_success=False, gap='Flush failed: ' + type(exc).__name__)
            return False

    def close(self):
        self.flush()
        if self.provider:
            self.provider.shutdown()
        if self.stream and not self.stream.closed:
            self.stream.close()


class TracedGateway:
    """Wrap actual calls. Commit events follow successful transaction exit.

    Export and SQLite are not atomic. Missing traces never prove missing actions.
    Credentials, context content and payloads are excluded from attributes.
    """
    def __init__(self, gateway, telemetry):
        self.gateway, self.telemetry = gateway, telemetry

    def call(self, token, request):
        return self.call_observed(token, request)[0]

    def call_observed(self, token, request):
        with self.telemetry.span('gateway.call') as span:
            response, observation = self.gateway.call_observed(token, request)
            receipt = response['receipt']
            if span is not None:
                for field in ('entered_ns', 'decision_ns', 'transaction_exited_ns',
                              'request_id', 'request_hash', 'receipt_hash'):
                    if observation[field] is not None:
                        span.set_attribute('aps.boundary.' + field, observation[field])
                for field in ('actor', 'action', 'decision', 'reason', 'executed', 'cached',
                              'sequence', 'request_hash', 'policy_digest', 'result_hash'):
                    span.set_attribute('aps.' + field, receipt[field])
                span.add_event('policy.decision', {'decision': receipt['decision'], 'reason': receipt['reason']})
                if receipt['executed']:
                    event = 'delegation.committed' if receipt['action'] == 'delegate_mock' else 'state_change.committed'
                    span.add_event(event, {'receipt_sequence': receipt['sequence']})
                    if receipt['action'] == 'purchase_mock':
                        span.add_event('external_action.simulated', {'receipt_sequence': receipt['sequence']})
            return response, observation
