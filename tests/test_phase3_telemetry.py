import builtins
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import test_governance as fixtures
from aps_governance.telemetry import Telemetry, TracedGateway, verify_export


class ExportReconciliationTests(unittest.TestCase):
    """Synthetic parser fixtures only; these never attest real SDK export."""
    def test_loss_linkage_and_outcome_corruption_are_rejected(self):
        import copy
        receipt = dict(actor='purchase', action='purchase_mock', decision='allow',
                       reason='ok', executed=True, cached=False, sequence=1,
                       request_hash='request', policy_digest='policy', result_hash='result')
        parent = dict(name='orchestration', context=dict(trace_id='trace', span_id='parent'),
                      parent_id=None, attributes={'aps.case': 'case', 'aps.configuration': 'C'}, events=[])
        child = dict(name='gateway.call', context=dict(trace_id='trace', span_id='child'),
                     parent_id='parent', attributes={'aps.'+k: v for k, v in receipt.items()},
                     events=[dict(name='policy.decision', attributes=dict(decision='allow', reason='ok')),
                             dict(name='state_change.committed', attributes=dict(receipt_sequence=1)),
                             dict(name='external_action.simulated', attributes=dict(receipt_sequence=1))])
        trials = [dict(case_id='case', configuration='C', status='recorded', receipts=[receipt], calls=[])]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'spans.jsonl'
            def write(spans):
                path.write_text('\n'.join(json.dumps(s, indent=2) for s in spans))
            write([child, parent])
            self.assertEqual(verify_export(path, trials)['matched_receipts'], 1)
            trials[0]['calls'] = [dict(action='purchase_mock', request_id='failed', transport_error='unavailable')]
            with self.assertRaisesRegex(ValueError, 'Transport event'):
                verify_export(path, trials)
            parent['events'] = [dict(name='transport.failure', attributes={
                'action': 'purchase_mock', 'request_id': 'failed',
                'boundary': 'local_pre_dispatch', 'exception_type': 'ConnectionError'})]
            write([child, parent])
            self.assertEqual(verify_export(path, trials)['matched_receipts'], 1)
            parent['events'] = []
            trials[0]['calls'] = []
            variants = [[parent], [parent, child, child], [child]]
            for field, value in [('parent_id', 'orphan'), ('context', dict(trace_id='wrong', span_id='child')),
                                 ('events', child['events'][:-1]),
                                 ('attributes', {**child['attributes'], 'aps.executed': False})]:
                damaged = copy.deepcopy(child)
                damaged[field] = value
                variants.append([parent, damaged])
            for spans in variants:
                with self.subTest(spans=spans):
                    write(spans)
                    with self.assertRaises(ValueError):
                        verify_export(path, trials)
            path.write_text('{truncated')
            with self.assertRaises(ValueError):
                verify_export(path, trials)


class TelemetryTests(unittest.TestCase):
    def test_missing_sdk_is_explicit_and_not_fake_export(self):
        original = builtins.__import__
        def unavailable(name, *args, **kwargs):
            if name.startswith('opentelemetry'):
                raise ImportError('deliberately unavailable')
            return original(name, *args, **kwargs)
        with patch('builtins.__import__', side_effect=unavailable):
            telemetry = Telemetry()
        self.assertFalse(telemetry.status['sdk_available'])
        self.assertFalse(telemetry.status['export_configured'])
        self.assertIsNone(telemetry.status['flush_success'])
        self.assertIn('unavailable', telemetry.status['gap'])
        with telemetry.span('orchestration') as span:
            self.assertIsNone(span)
        self.assertFalse(telemetry.flush())

    def test_real_gateway_without_sdk_preserves_enforcement(self):
        fixture = fixtures.GovernanceTests()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        telemetry = Telemetry()
        self.addCleanup(telemetry.close)
        fixture.g = TracedGateway(fixture.g, telemetry)
        fixture.deny(fixture.call(fixture.body('purchase')), 'capability_scope')
        fixture.ready()
        fixture.allow(fixture.call(fixture.body('purchase')))
        self.assertEqual(len(fixture.read_task()['state']['orders']), 1)

    def test_real_sdk_export_when_installed(self):
        if importlib.util.find_spec('opentelemetry') is None:
            self.skipTest('OpenTelemetry unavailable: real export remains unverified')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'spans.jsonl'
            telemetry = Telemetry(path)
            self.addCleanup(telemetry.close)
            if not telemetry.status['sdk_available']:
                self.skipTest(telemetry.status['gap'])
            self.assertTrue(telemetry.status['export_configured'], telemetry.status)
            with telemetry.span('orchestration'):
                with telemetry.span('delegation'):
                    pass
            self.assertTrue(telemetry.flush())
            # ConsoleSpanExporter emits pretty JSON objects, not JSON lines.
            decoder = json.JSONDecoder()
            raw = path.read_text().strip()
            spans = []
            while raw:
                span, end = decoder.raw_decode(raw)
                spans.append(span)
                raw = raw[end:].lstrip()
            self.assertEqual({s['name'] for s in spans}, {'orchestration', 'delegation'})
            child = next(s for s in spans if s['name'] == 'delegation')
            parent = next(s for s in spans if s['name'] == 'orchestration')
            self.assertEqual(child['parent_id'], parent['context']['span_id'])
