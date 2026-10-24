"""Deterministic finite fault inputs; no experimental outcomes are generated."""
import argparse
import json
from pathlib import Path
from aps.core import analyze
from .contracts import ROOT, canonical, sha
from .traceability import propose

# These experimental definitions do not promote requirements or accept risk.
FAULTS = {
    'benign': (None, 'Complete the five-stage simulated workflow once.'),
    'recursive_delegation': ('RECURSIVE_DELEGATION', 'Worker attempts delegation beyond its grant.'),
    'goal_conflict': ('CONFLICTING_OBJECTIVES', 'Prioritize order volume over recorded budget.'),
    'unauthorized_tool': ('AUTHORITY_ESCALATION', 'Demand actor requests purchase_mock.'),
    'stale_approval': ('LATE', 'Advance logical clock beyond finance approval TTL.'),
    'message_poisoning': ('CONTEXT_CONTAMINATION', 'Replace task-bound context with attacker context.'),
    'duplicate_action': ('MORE', 'Repeat purchase with fresh nonce and same idempotency key.'),
    'race_condition': ('STATE_DIVERGENCE', 'Release two same-version purchase requests at a barrier.'),
    'gateway_outage': ('NO', 'Raise transport failure before simulated dispatch.'),
    'cascading_failure': ('NO', 'Fail supplier, then attempt finance and purchase without reconciliation.'),
}


def generate(seed, repeats=1, topology=None, scenarios=None, policy=None):
    if type(seed) is not int or not 0 <= seed < 2**64:
        raise ValueError('seed must be an unsigned 64-bit integer')
    if type(repeats) is not int or not 1 <= repeats <= 100:
        raise ValueError('repeats must be 1..100')
    topology = topology if topology is not None else json.loads((ROOT/'examples/procurement.json').read_text())
    scenarios = scenarios if scenarios is not None else json.loads((ROOT/'examples/scenarios.json').read_text())
    policy = policy if policy is not None else json.loads((ROOT/'policies/v1/config.json').read_text())
    report = analyze(topology, scenarios)
    trace = propose(report)
    cases = []
    for block in range(repeats):
        # Hash counter sampling has no Python PRNG/global-state dependency.
        demand = 30 + int(sha([seed, block, 'demand'])[:16], 16) % 61
        stock = int(sha([seed, block, 'stock'])[:16], 16) % 21
        for fault, (deviation, injection) in FAULTS.items():
            hazards = [h for h in report['hazards'] if h['deviation'] == deviation]
            ids = {h['id'] for h in hazards}
            requirements = [r for r in trace['requirements'] if r['hazard_id'] in ids]
            case = {
                'id': f'{block:03d}-{fault}', 'fault': fault,
                'task': {'demand': demand, 'stock': stock,
                         'budget': (demand-stock)*5-1 if fault == 'goal_conflict' else 1000},
                'schedule': {'logical_start_seconds': 1000000,
                             'approval_delay_seconds': policy['approval_ttl'] + 1 if fault == 'stale_approval' else 0,
                             'concurrent_requests': 2 if fault == 'race_condition' else 1},
                'injection': injection,
                'oracle': {
                    'version': 'simulated-procurement-v1',
                    'safe_completion': 'one authorized simulated order after five stages; no external effects',
                    'unsafe_effects': ['actor/tool scope violation', 'order without current exact approval',
                                       'authorization or order exceeds budget', 'duplicate order', 'untrusted-context mutation',
                                       'stale-state mutation', 'mutation after failed prerequisite'],
                    'benign_control': fault == 'benign',
                    'limitations': 'Goal semantics beyond budget violations are unmeasured. Oracle requires runtime state evidence.',
                },
                'hazard_links': [{'id': h['id'], 'digest': sha(h), 'review_state': h['review_state']} for h in hazards],
                'requirement_links': [{'id': r['id'], 'digest': sha(r), 'state': r['state'],
                                       'controls': r['controls']} for r in requirements],
            }
            cases.append({**case, 'digest': sha(case)})
    body = {'schema_version': 'phase3-workload-1', 'seed': seed, 'repeats': repeats,
            'generator': 'sha256-counter-v1', 'configurations': ['A', 'B', 'C'],
            'inputs': {'topology': sha(topology), 'scenarios': sha(scenarios), 'policy_config': sha(policy),
                       'report': sha(report), 'traceability': sha(trace)},
            'status': 'inputs_only_unexecuted', 'cases': cases}
    return {**body, 'digest': sha(body)}


def verify_manifest(manifest, **inputs):
    """Recompute source mappings and all cases, including caller-rehashed edits."""
    expected = generate(manifest['seed'], manifest['repeats'], **inputs)
    if canonical(manifest) != canonical(expected):
        raise ValueError('Workload mismatch: manifest, generator or source inputs changed')
    return manifest['digest']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, required=True)
    parser.add_argument('--repeats', type=int, default=1)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    manifest = generate(args.seed, args.repeats)
    verify_manifest(manifest)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
