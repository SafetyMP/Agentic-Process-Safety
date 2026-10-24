"""Finite local policy ablation; never a production gateway mode."""
import copy
from .contracts import sha, ROOT
from .policy import PolicyEngine
from .regression import snapshot
from .gateway import verify_receipts
from .signing import read_public
from .observations import gateway_boundaries

METHOD = {
    'clock': 'perf_counter_ns',
    'toggle': 'OPA policy evaluation/enforcement only; gateway prechecks remain enabled',
    'runtime': 'same C gateway, fresh SQLite, signed receipts, actual OTel exporter in both arms',
    'scope': 'sum of ten dispatch intervals including state/authority observations; no HTTP',
    'excluded_costs': 'bootstrap, provisioning, keys, warmup, final read, ledger append and exporter close',
    'warmup': 'one discarded complete workload per arm before four measured pairs',
    'limitations': 'four local pairs; scheduler/cache/process noise; negative differences retained; not total governance stack overhead or production performance',
}


class PolicyAblation:
    """Disposable experiment proxy retaining immutable policy identity/configuration."""
    def __init__(self, engine): self.engine = engine
    def __getattr__(self, name): return getattr(self.engine, name)
    def evaluate(self, facts):
        return {'decision': 'allow', 'reason': 'policy_allow'}


def input_digest(task, result):
    # Fresh fixture identity, credentials and replay keys are nuisance variables.
    excluded = {'request_id', 'nonce', 'idempotency_key', 'task_id', 'resource', 'context_id'}
    requests = [{k: v for k, v in c['submitted_request'].items() if k not in excluded}
                for c in result['calls']]
    return sha({'task': task, 'requests': requests})


def collect(case, telemetry):
    from .experiment import trial
    case = copy.deepcopy(case)
    case['task'].update(demand=3, stock=1, budget=100)
    policy = PolicyEngine(ROOT/'policies/v1')
    provenance = {'source_digest': snapshot(ROOT)['digest'], 'policy_digest': policy.digest,
                  'input_source_case_digest': case['digest'], 'task': case['task'], 'method': METHOD}
    def arm(index, label):
        fixture = dict(case, id=f'overhead-{index}-{label}')
        result = trial(fixture, 'C', telemetry, _policy_enforcement=label == 'governed')
        return dict(result, case_id=fixture['id'], configuration='C')
    warmups = [arm('warmup', 'control'), arm('warmup', 'governed')]
    pairs = []
    for index in range(4):
        order = ('control', 'governed') if index % 2 == 0 else ('governed', 'control')
        results = {label: arm(index, label) for label in order}
        pair = {'pair_id': index, 'order': order[0]+'-first', 'setup': provenance}
        if index == 0: pair['warmup_trials'] = warmups
        for label, result in results.items():
            pair.update({label+'_input_digest': input_digest(case['task'], result),
                         label+'_elapsed_ns': sum(c['elapsed_ns'] for c in result['calls']),
                         label+'_final_state': result['state'], label+'_trial': result})
        pairs.append(pair)
    return pairs


def validate_pairs(records, workload_digest):
    pairs = []
    source_digest = snapshot(ROOT)['digest']
    policy_digest = PolicyEngine(ROOT/'policies/v1').digest
    for record in records:
        event = record['event']
        if event['kind'] != 'overhead_pair': continue
        p = event['payload']
        if event['run_id'] != workload_digest:
            raise ValueError('Overhead workload mismatch')
        if type(p['pair_id']) is not int or p['pair_id'] != len(pairs):
            raise ValueError('Invalid overhead pair identity')
        if p['order'] != ('control-first' if p['pair_id'] % 2 == 0 else 'governed-first'):
            raise ValueError('Invalid overhead order')
        setup = p['setup']
        if setup['method'] != METHOD or setup['policy_digest'] != policy_digest:
            raise ValueError('Invalid overhead method/policy')
        if setup['source_digest'] != source_digest:
            raise ValueError('Overhead source drift')
        for label in ('control', 'governed'):
            t = p[label+'_trial']; calls = t['calls']
            verify_receipts(t['receipts'], read_public(t['receipt_public_key']))
            gateway_boundaries(calls, t['receipts'])
            if (p[label+'_input_digest'] != input_digest(setup['task'], t) or not t['completed']
                    or len(calls) != 10 or len(t['receipts']) != 10
                    or t['state'] != p[label+'_final_state'] or t['state']['version'] != 5
                    or len(t['state']['orders']) != 1):
                raise ValueError('Unmatched or unsuccessful overhead workload')
            previous_end = -1
            previous_state = None
            previous_authority = None
            for c, r in zip(calls, t['receipts']):
                start, end = c['dispatch_started_ns'], c['dispatch_ended_ns']
                if (type(start) is not int or type(end) is not int or not 0 <= start <= end
                        or start < previous_end or end-start != c['elapsed_ns']
                        or not c.get('gateway_observation') or c['transport_error']
                        or c['violations'] or not c['executed'] or c['decision'] != 'allow'
                        or r['result_hash'] != sha(c['after_state'])
                        or r['request_hash'] != sha(c['submitted_request'])
                        or r['policy_digest'] != policy_digest
                        or not start <= c['gateway_observation']['entered_ns']
                        <= c['gateway_observation']['transaction_exited_ns'] <= end
                        or previous_state is not None and c['before_state'] != previous_state
                        or previous_authority is not None and c['before_authority'] != previous_authority):
                    raise ValueError('Invalid overhead dispatch chronology/effect')
                previous_end = end
                previous_state, previous_authority = c['after_state'], c['after_authority']
            if previous_state != t['state']:
                raise ValueError('Overhead final state not bound to calls')
            elapsed = p[label+'_elapsed_ns']
            if type(elapsed) is not int or elapsed < 0 or elapsed != sum(c['elapsed_ns'] for c in calls):
                raise ValueError('Invalid overhead elapsed sum')
        if p['control_final_state'] != p['governed_final_state']:
            raise ValueError('Overhead states differ')
        if p['control_input_digest'] != p['governed_input_digest']:
            raise ValueError('Overhead inputs differ')
        first, second = ('control', 'governed') if p['order'] == 'control-first' else ('governed', 'control')
        if p[first+'_trial']['calls'][-1]['dispatch_ended_ns'] > p[second+'_trial']['calls'][0]['dispatch_started_ns']:
            raise ValueError('Overhead arm chronology disagrees with order')
        pairs.append(dict(p, evidence_sequence=record['sequence']))
    if pairs and len(pairs) != 4:
        raise ValueError('Incomplete overhead pairs')
    return {'clock': 'perf_counter_ns', 'pairs': pairs}
