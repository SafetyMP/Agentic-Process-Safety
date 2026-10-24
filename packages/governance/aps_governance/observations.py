"""Validate bounded response-observation measurements, never internal decision clocks."""
from .contracts import sha


def gateway_boundaries(calls, receipts):
    """Validate internal clocks against signed-receipt identities and caller bounds.

    Receipt signature verification belongs to the evidence consumer. This
    function links the clocks to those receipts; clocks are not themselves signed.
    Only unchanged denied attack calls yield containment samples. Denial may
    still persist nonces, receipts or review metadata; containment here covers
    simulated task state and delegated authority only.
    """
    by_hash = {sha(r): r for r in receipts}
    rows, seen = [], set()
    for call in calls:
        observation = call.get('gateway_observation')
        if observation is None:
            continue
        receipt_hash = observation.get('receipt_hash')
        receipt = by_hash.get(receipt_hash)
        if (observation.get('schema_version') != 'gateway-boundaries-v1'
                or observation.get('clock') != 'perf_counter_ns'
                or receipt is None or receipt_hash in seen
                or observation.get('request_id') != call['request_id']
                or observation.get('request_hash') != receipt['request_hash']
                or any(call[f] != receipt[f] for f in ('actor', 'action', 'decision', 'executed', 'cached'))):
            raise ValueError('Invalid gateway boundary provenance')
        seen.add(receipt_hash)
        entered, decision, exited = (observation[f] for f in
                                    ('entered_ns', 'decision_ns', 'transaction_exited_ns'))
        if (any(type(n) is not int for n in (entered, decision, exited))
                or not 0 <= entered <= decision <= exited
                or exited-entered > call['elapsed_ns']):
            raise ValueError('Invalid gateway boundary clock')
        caller = call.get('safety_observation')
        if not caller:
            continue
        # Reuse the independent deny, snapshot and dispatch-clock checks.
        rejection_observations([call])
        if not caller['exposure_ns'] <= entered <= exited <= caller['rejection_observed_ns']:
            raise ValueError('Gateway clock outside caller exposure')
        unchanged = (call['before_state'] == call['after_state']
                     and call['before_authority'] == call['after_authority'])
        rows.append({'request_id': call['request_id'], 'receipt_hash': receipt_hash,
                     'receipt_sequence': receipt['sequence'],
                     'detection_latency_ns': decision-caller['exposure_ns'],
                     'containment_latency_ns': exited-caller['exposure_ns'] if unchanged else None})
    return rows


def summarize_observations(calls):
    """Report observed samples separately from missing attack-call measurements."""
    rows = rejection_observations(calls)
    attacks = sum(bool(c['violations']) for c in calls)
    result = {'clock': 'perf_counter_ns', 'attack_call_denominator': attacks,
              'scope': 'request exposure to denial response / unchanged snapshot verification',
              'samples': rows}
    for field in ('detection_latency_ns', 'containment_latency_ns'):
        values = [r[field] for r in rows if r[field] is not None]
        result[field] = {'observed_count': len(values),
                         'missing_count': attacks-len(values),
                         'total_ns': sum(values),
                         'mean_ns': sum(values)/len(values) if values else None,
                         'min_ns': min(values) if values else None,
                         'max_ns': max(values) if values else None}
    return result


def rejection_observations(calls):
    rows = []
    for call in calls:
        observation = call.get('safety_observation')
        if observation is None:
            continue
        if (observation.get('schema_version') != 'response-rejection-v1'
                or observation.get('clock') != 'perf_counter_ns'
                or observation.get('request_id') != call['request_id']
                or not call['violations'] or call['decision'] != 'deny'
                or call['executed']):
            raise ValueError('Invalid rejection observation provenance')
        start = observation['exposure_ns']
        detected = observation['rejection_observed_ns']
        contained = observation['containment_verified_ns']
        if (type(start) is not int or type(detected) is not int
                or not 0 <= start <= detected
                or detected-start > call['elapsed_ns']):
            raise ValueError('Invalid rejection observation clock')
        if contained is not None:
            if (type(contained) is not int or contained < detected
                    or contained-start > call['elapsed_ns']
                    or call['before_state'] != call['after_state']
                    or call['before_authority'] != call['after_authority']):
                raise ValueError('Invalid containment observation')
        rows.append({'request_id': call['request_id'],
                     'detection_latency_ns': detected-start,
                     'containment_latency_ns': contained-start if contained is not None else None})
    return rows
