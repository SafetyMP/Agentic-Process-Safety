"""Trace proposals preserve Phase 1 IDs and require independent, signed human promotion."""
import copy
from aps.core import validate as validate_phase1
from .contracts import sha, validate
from .signing import sign, verify
from .admin import AGENTS

# Explicitly bounded claims. A control may only partially mitigate a broad HAZOP deviation.
CATALOG = {
 'AUTHORITY_ESCALATION': [('CTL-SCOPE','Scoped authenticated identities and per-agent allowlists','gateway.py;procurement.rego','test_scope')],
 'RECURSIVE_DELEGATION': [('CTL-DEPTH','Server-derived delegation depth ceiling','gateway.py;procurement.rego','test_depth')],
 'CONTEXT_CONTAMINATION': [('CTL-CONTEXT','Opaque task-bound provenance, not free-form assertions','gateway.py;store.py','test_context')],
 'STATE_DIVERGENCE': [('CTL-STATE','Atomic state/version preconditions','gateway.py','test_state')],
 'BEFORE': [('CTL-APPROVAL','Finance-issued exact purchase binding and separation of duties','gateway.py;procurement.rego','test_approval')],
 'LATE': [('CTL-EXPIRY','Task, context, approval and human-review expiry','gateway.py','test_expiry')],
 'MORE': [('CTL-CAP','Task and policy spend ceilings','procurement.rego','test_caps'),('CTL-REPLAY','Persistent nonce uniqueness and idempotency','gateway.py;store.py','test_replay')],
 'EARLY': [('CTL-ORDER','Server-owned workflow prerequisites','gateway.py','test_order')],
 'OTHER_THAN': [('CTL-BINDING','Fixed supplier mock and approval-to-action binding','gateway.py','test_binding')],
 'AS_WELL_AS': [('CTL-SCHEMA','Strict request schema and adapter contract','schemas/governance-request.schema.json','test_malformed')],
 'NO': [('CTL-FAILURE','Fail closed on policy errors, timeouts and missing context','policy.py;gateway.py','test_outage')]
}

def propose(report):
    validate_phase1('report',report)
    rows=[]
    for h in report['hazards']:
        if not h['provenance']['scenario_id'].startswith('REF-') and h['review_state']!='approved_requirement': continue
        controls=[]
        for cid,text,implementation,test in CATALOG.get(h['deviation'],[]):
            controls.append({'id':cid,'version':1,'description':text,'implementation':implementation,'test':test,
                             'status':'implemented','gap':'Coverage is limited to the simulated gateway; effectiveness requires human review'})
        if not controls:
            controls=[{'id':'GAP-'+h['deviation'],'version':1,'description':'No direct Phase 2 control for full deviation semantics',
                       'implementation':'none','test':'none','status':'gap','gap':'Goal conformance, objective arbitration, physical stock truth and command-intent interpretation require additional expert design'}]
        rows.append({'id':'REQ-'+sha({'hazard':h['id']})[:20],'version':1,'hazard_id':h['id'],'hazard_digest':sha(h),
                     'previous_digest':None,'text':h['candidate_controls'][0],'state':'proposed','reviewer':None,'review_reason':None,
                     'review_signature':None,'controls':controls})
    return validate('traceability',{'schema_version':'2.0','report_digest':sha(report),'requirements':rows})

def approve_requirement(trace, report, requirement_id, reviewer, reason, private_key, human=False):
    validate_phase1('report',report); validate('traceability',trace)
    if reviewer in AGENTS or not reviewer.strip() or not reason.strip() or not human: raise PermissionError('Independent human reviewer required')
    if trace['report_digest']!=sha(report): raise ValueError('Trace report mismatch; regenerate proposal from reviewed report')
    result=copy.deepcopy(trace)
    matches=[r for r in result['requirements'] if r['id']==requirement_id]
    if len(matches)!=1: raise ValueError('Unknown or duplicate requirement')
    r=matches[0]; h=next(h for h in report['hazards'] if h['id']==r['hazard_id'])
    if h['review_state']!='approved_requirement' or sha(h)!=r['hazard_digest']: raise ValueError('Human-approved Phase 1 finding required')
    r.update(state='approved',reviewer=reviewer,review_reason=reason,review_signature=None)
    r['review_signature']=sign(private_key,{k:v for k,v in r.items() if k!='review_signature'})['signature']
    return validate('traceability',result)

def check_trace(trace, public_key):
    validate('traceability',trace)
    ids=[r['id'] for r in trace['requirements']]
    hazards=[r['hazard_id'] for r in trace['requirements']]
    if len(set(ids))!=len(ids) or len(set(hazards))!=len(hazards): raise ValueError('Duplicate trace identity')
    for r in trace['requirements']:
        if r['state']!='approved' or r['reviewer'] in AGENTS or not r['reviewer'] or not r['review_reason']:
            raise ValueError('Unapproved trace requirement')
        verify(public_key,{**{k:v for k,v in r.items() if k!='review_signature'},'signature':r['review_signature']})
    return trace


def revise_requirement(trace, requirement_id, text):
    """New immutable revision; prior approvals cannot carry forward after edits."""
    validate('traceability',trace)
    if not isinstance(text,str) or not text.strip() or len(text)>256: raise ValueError('Invalid requirement text')
    result=copy.deepcopy(trace)
    matches=[r for r in result['requirements'] if r['id']==requirement_id]
    if len(matches)!=1: raise ValueError('Unknown or duplicate requirement')
    r=matches[0];prior=sha(r)
    r.update(text=text,version=r['version']+1,previous_digest=prior,state='proposed',reviewer=None,review_reason=None,review_signature=None)
    return validate('traceability',result)
