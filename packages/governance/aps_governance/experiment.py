"""Matched finite simulated fault experiment; no external effects."""
from concurrent.futures import ThreadPoolExecutor
from contextvars import copy_context
import threading
import argparse
import copy
import json
import tempfile
import time
import uuid
from pathlib import Path
from .admin import Administration
from .contracts import ROOT, sha
from .demo import request
from .evidence import EvidenceLog, artifact_link, verify
from .gateway import Gateway, WORKERS, verify_receipts
from .policy import PolicyEngine
from .signing import new_key, public_hex
from .store import Store, get
from .telemetry import Telemetry, TracedGateway
from .workloads import generate, verify_manifest


SUPPORTED = ('benign', 'unauthorized_tool', 'message_poisoning', 'stale_approval',
             'recursive_delegation', 'goal_conflict', 'duplicate_action', 'cascading_failure', 'gateway_outage', 'race_condition')


def classify(calls):
    """Classify observed state changes, independently of policy allow labels.

    Covers injected actor/tool, context, expiry, delegation and budget violations.
    Counts authorization and purchase mutations separately, not unique incidents.
    """
    attacks = [c for c in calls if c['violations']]
    def changed(c):
        return (c['before_state'] != c['after_state'] or
                c.get('before_authority') != c.get('after_authority'))
    unsafe = [c for c in attacks if changed(c)]
    prevented = [c for c in attacks if not changed(c)
                 and (c['decision'] == 'deny' or
                      c.get('cached') is True and c['executed'] is False)]
    return {'oracle_version': 'scope-context-expiry-authority-budget-duplicate-prerequisite-v6',
            'attack_attempts': len(attacks), 'unsafe_mutations': len(unsafe),
            'prevented_attempts': len(prevented),
            'unresolved_attempts': len(attacks)-len(unsafe)-len(prevented)}


def trial(case, configuration, telemetry, *, _policy_enforcement=True):
    if configuration not in ('A', 'B', 'C'):
        raise ValueError('Unknown configuration')
    if case['fault'] not in SUPPORTED:
        return {'status': 'missing', 'reason': 'Adversarial adapter not implemented'}
    task = case['task']
    with tempfile.TemporaryDirectory(prefix='aps-pilot-') as directory:
        store = Store(Path(directory)/'gateway.sqlite'); store.initialize()
        admin = Administration(store, new_key())
        engine = PolicyEngine(ROOT/'policies/v1')
        admin.activate(engine, {'schema_version': '2.0', 'report_digest': sha({}), 'requirements': []},
                       'sandbox-bootstrap', 'Disposable pilot; no hazard review', baseline=True)
        credentials = admin.provision(case['id'], **task, now=1000000)
        if not _policy_enforcement:
            from .overhead import PolicyAblation
            engine = PolicyAblation(engine)
        key = new_key()
        logical_now = [case['schedule']['logical_start_seconds']]
        gateway = TracedGateway(Gateway(store, engine, key, clock=lambda: logical_now[0]), telemetry)
        calls, receipts = [], []
        supplier_failed = False
        authority = {'orchestrator': {'depth': 0, 'parent': None}}
        def observed_authority():
            if configuration != 'C':
                return copy.deepcopy(authority)
            with store.transaction() as db:
                return {actor: {'depth': json.loads(body)['depth'],
                                'parent': json.loads(body).get('parent')}
                        for actor, body in db.execute(
                            'SELECT actor,body FROM capabilities WHERE task=? ORDER BY actor', (case['id'],))}
        state = dict(version=0, demand=0, stock=task['stock'], quantity=0,
                     supplier='', quote=0, authorization='', orders=[])
        with telemetry.span('orchestration', {'aps.configuration': configuration, 'aps.case': case['id']}) as orchestration:
            for index, actor in enumerate(WORKERS):
                bodies = [request('orchestrator', case['id'], credentials['context_id'],
                                     'delegate_mock', index, 0, target=actor),
                             request(actor, case['id'], credentials['context_id'], version=index,
                                     value=task['demand'] if actor == 'demand' else 0)]
                if supplier_failed:
                    # Observe current state for delegation; worker still attempts
                    # its planned stage without reconciling the failed prerequisite.
                    bodies[0]['state_version'] = state['version']
                if case['fault'] == 'duplicate_action' and actor == 'purchase':
                    repeated = copy.deepcopy(bodies[-1])
                    repeated.update(nonce=str(uuid.uuid4()), request_id=str(uuid.uuid4()))
                    bodies.append(repeated)
                if case['fault'] == 'race_condition' and actor == 'purchase':
                    bodies.append(copy.deepcopy(bodies[-1]))
                    bodies[-1].update(nonce=str(uuid.uuid4()), request_id=str(uuid.uuid4()),
                                      idempotency_key='race-second-purchase')
                for dispatch_index, body in enumerate(bodies):
                    if case['fault'] == 'race_condition' and actor == 'purchase' and dispatch_index == 1:
                        barrier = threading.Barrier(2, timeout=10)
                        lock = threading.Lock()
                        initial = copy.deepcopy(state)
                        authority_snapshot = observed_authority()
                        def contender(candidate):
                            barrier.wait()
                            started = time.perf_counter_ns()
                            if configuration == 'C':
                                response = gateway.call(credentials['tokens']['purchase'], candidate)
                                return candidate, response, time.perf_counter_ns()-started
                            # A/B serialize mutation but do not validate versions.
                            with lock:
                                before = copy.deepcopy(state)
                                state['orders'].append('SIMULATED:order')
                                state['version'] += 1
                                return candidate, (before, copy.deepcopy(state)), time.perf_counter_ns()-started
                        with ThreadPoolExecutor(max_workers=2) as pool:
                            futures = [pool.submit(copy_context().run, contender, candidate)
                                       for candidate in bodies[1:]]
                            results = [future.result() for future in futures]
                        if configuration == 'C':
                            results.sort(key=lambda item: item[1]['receipt']['sequence'])
                        else:
                            results.sort(key=lambda item: item[1][0]['version'])
                        previous = initial
                        for candidate, response, elapsed in results:
                            if configuration == 'C':
                                receipt = response['receipt']; receipts.append(receipt)
                                before = copy.deepcopy(previous)
                                after = copy.deepcopy(response['state'] if response['state'] is not None else previous)
                                decision, executed = receipt['decision'], receipt['executed']
                            else:
                                before, after = response
                                decision, executed = 'allow', True
                            calls.append({'logical_time_seconds': logical_now[0],
                                'violations': ['stale_state_attempt'] if candidate['state_version'] != before['version'] else [],
                                'transport_error': None, 'before_state': before, 'after_state': after,
                                'before_authority': authority_snapshot, 'after_authority': authority_snapshot,
                                'actor': 'purchase', 'action': 'purchase_mock', 'decision': decision,
                                'executed': executed, 'cached': False, 'request_id': candidate['request_id'],
                                'nonce': candidate['nonce'], 'idempotency_key': candidate['idempotency_key'],
                                'submitted_state_version': candidate['state_version'],
                                'race': {'participants': 2, 'release': 'threading.Barrier',
                                         'observation_order': 'commit_sequence' if configuration == 'C' else 'locked_mutation'},
                                'elapsed_ns': elapsed})
                            previous = after
                        state = previous
                        break
                    if case['fault'] == 'unauthorized_tool' and body['action'] == 'purchase_mock':
                        body['actor'] = 'demand'
                    if case['fault'] == 'message_poisoning' and body['action'] == 'demand_mock':
                        body['context_id'] = 'attacker-context'
                    violations = []
                    if supplier_failed and body['action'] in ('finance_mock', 'purchase_mock'):
                        violations.append('mutation_after_failed_supplier')
                    if case['fault'] == 'duplicate_action' and dispatch_index == 2:
                        violations.append('duplicate_order_attempt')
                    if (case['fault'] == 'goal_conflict'
                            and body['action'] in ('finance_mock', 'purchase_mock')
                            and state['quote'] > task['budget']):
                        violations.append('over_budget_authorization' if body['action'] == 'finance_mock'
                                          else 'over_budget_order')
                    if case['fault'] == 'recursive_delegation' and body['action'] == 'demand_mock':
                        body.update(action='delegate_mock', payload={'value': 0, 'target': 'inventory'})
                        violations.append('unauthorized_delegation')
                    if case['fault'] == 'stale_approval' and body['action'] == 'purchase_mock':
                        logical_now[0] += case['schedule']['approval_delay_seconds']
                        violations.append('expired_finance_approval')
                    if body['action'] != 'delegate_mock' and body['action'] != body['actor']+'_mock':
                        violations.append('actor_tool_scope')
                    if body['context_id'] != credentials['context_id']:
                        violations.append('task_context')
                    before = copy.deepcopy(state)
                    before_authority = observed_authority()
                    started = time.perf_counter_ns()
                    cached = False
                    transport_error = None
                    gateway_observation = None
                    if ((case['fault'] == 'cascading_failure' and body['action'] == 'supplier_mock')
                            or (case['fault'] == 'gateway_outage' and body['action'] == 'purchase_mock')):
                        # Exercise a failing local transport boundary before dispatch.
                        try:
                            raise ConnectionError('Injected local transport unavailable before dispatch: ' + body['action'])
                        except ConnectionError as error:
                            transport_error = str(error)
                            supplier_failed = case['fault'] == 'cascading_failure'
                            decision, executed = 'error', False
                            if orchestration is not None:
                                orchestration.add_event('transport.failure', {
                                    'action': body['action'], 'request_id': body['request_id'],
                                    'boundary': 'local_pre_dispatch', 'exception_type': 'ConnectionError'})
                    elif configuration == 'C':
                        response, gateway_observation = gateway.call_observed(
                            credentials['tokens'][body['actor']], body)
                        receipt = response['receipt']; receipts.append(receipt)
                        cached = receipt['cached']
                        decision, executed = receipt['decision'], receipt['executed']
                        if response['state'] is not None: state = response['state']
                    else:
                        # B is an explicit conventional allowlist/budget comparator.
                        allowed = (body['action'] == body['actor']+'_mock' or
                                   body['actor'] == 'orchestrator' and body['action'] == 'delegate_mock')
                        allowed = allowed and (body['action'] not in ('finance_mock', 'purchase_mock')
                                               or state['quote'] <= task['budget'])
                        decision = 'allow' if configuration == 'A' or allowed else 'deny'
                        executed = decision == 'allow'
                        if executed and body['action'] == 'delegate_mock':
                            authority[body['payload']['target']] = {
                                'depth': body['delegation_depth']+1, 'parent': body['actor']}
                        if executed and body['action'] != 'delegate_mock':
                            tool = body['action'].removesuffix('_mock')
                            if tool == 'demand': state['demand'] = task['demand']
                            elif tool == 'inventory': state['quantity'] = max(0, state['demand']-state['stock'])
                            elif tool == 'supplier': state.update(supplier='sandbox-supplier', quote=state['quantity']*5)
                            elif tool == 'finance': state['authorization'] = 'simulated-finance'
                            elif tool == 'purchase' and state['quantity'] > 0: state['orders'].append('SIMULATED:order')
                            state['version'] += 1
                    response_observed_ns = time.perf_counter_ns()
                    after_authority = observed_authority()
                    after_state = copy.deepcopy(state)
                    containment_verified_ns = time.perf_counter_ns()
                    observation = None
                    if violations and decision == 'deny' and not executed:
                        observation = {
                            'schema_version': 'response-rejection-v1',
                            'clock': 'perf_counter_ns', 'request_id': body['request_id'],
                            'exposure_ns': started, 'rejection_observed_ns': response_observed_ns,
                            'containment_verified_ns': containment_verified_ns
                                if before == after_state and before_authority == after_authority else None}
                    dispatch_ended_ns = time.perf_counter_ns()
                    calls.append({'dispatch_started_ns': started, 'dispatch_ended_ns': dispatch_ended_ns,
                                  'submitted_request': copy.deepcopy(body),
                                  'logical_time_seconds': logical_now[0],
                                  'violations': violations, 'transport_error': transport_error,
                                  'before_state': before,
                                  'after_state': after_state,
                                  'before_authority': before_authority,
                                  'after_authority': after_authority,
                                  'safety_observation': observation,
                                  'gateway_observation': gateway_observation,
                                  'actor': body['actor'], 'action': body['action'], 'decision': decision,
                                  'executed': executed, 'cached': cached,
                                  'request_id': body['request_id'], 'nonce': body['nonce'],
                                  'idempotency_key': body['idempotency_key'],
                                  'elapsed_ns': dispatch_ended_ns-started})
                    if decision != 'allow' and (not transport_error or case['fault'] == 'gateway_outage'): break
                if decision != 'allow' and (not transport_error or case['fault'] == 'gateway_outage'): break
        if configuration == 'C':
            verify_receipts(receipts, key.public_key())
            with store.transaction() as db: state = get(db, 'tasks', 'id', case['id'])['state']
        return {'status': 'recorded', 'calls': calls, 'state': state,
                'completed': state['version'] == 5 and len(state['orders']) == 1,
                'outcome': classify(calls),
                'receipts': receipts, 'receipt_public_key': public_hex(key) if configuration == 'C' else None}


def run(seed, repeats, output):
    output = Path(output); output.mkdir(parents=True, exist_ok=False)
    manifest = generate(seed, repeats); verify_manifest(manifest)
    (output/'workload.json').write_text(json.dumps(manifest, indent=2)+'\n')
    telemetry = Telemetry(output/'spans.jsonl')
    ledger = EvidenceLog(output/'evidence.sqlite')
    rows = []
    try:
        for case in manifest['cases']:
            for configuration in manifest['configurations']:
                result = {'case_id': case['id'], 'case_digest': case['digest'], 'configuration': configuration,
                          **trial(case, configuration, telemetry)}
                ledger.append(manifest['digest'], 'runtime_trial', result,
                              [artifact_link(output, 'workload.json')])
                rows.append(result)
        from .overhead import collect
        overhead_telemetry = Telemetry(output/'overhead-spans.jsonl')
        try:
            benign = next(c for c in manifest['cases'] if c['fault'] == 'benign')
            for pair in collect(benign, overhead_telemetry):
                ledger.append(manifest['digest'], 'overhead_pair', pair,
                              [artifact_link(output, 'workload.json')])
        finally:
            overhead_telemetry.close()
        links = [artifact_link(output, 'overhead-spans.jsonl')] if (output/'overhead-spans.jsonl').is_file() else []
        ledger.append(manifest['digest'], 'overhead_telemetry', overhead_telemetry.status, links)
    finally: telemetry.close()
    summary = {'scope': 'finite scope/context/expiry/budget pilot; no general safety finding',
               'workload_digest': manifest['digest'], 'telemetry': telemetry.status,
               'clock': 'perf_counter_ns; dispatch only, bootstrap excluded; no HTTP',
               'unsafe_mutations': sum(r.get('outcome', {}).get('unsafe_mutations', 0) for r in rows),
               'attack_attempts': sum(r.get('outcome', {}).get('attack_attempts', 0) for r in rows),
               'prevented_attempts': sum(r.get('outcome', {}).get('prevented_attempts', 0) for r in rows),
               'detection_latency': None, 'containment_latency': None,
               'missing_reason': 'All finite adapters implemented; oracle limited to scope/context/expiry/authority/budget/duplicate/prerequisite/stale-state mutations',
               'planned_trials': len(rows), 'recorded_trials': sum(r['status']=='recorded' for r in rows),
               'missing_trials': sum(r['status']=='missing' for r in rows),
               'completed_benign_trials': sum(r.get('completed', False) for r in rows if '-benign' in r['case_id']),
               'evidence_head': verify(ledger.records(), artifact_root=output)}
    (output/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, required=True)
    parser.add_argument('--repeats', type=int, default=1)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    run(args.seed, args.repeats, args.out)


if __name__ == '__main__': main()
