"""Atomic policy enforcement point. Only this module mutates simulated tool state."""
import copy
import json
import sqlite3
import time
from .contracts import canonical, sha, validate
from .signing import sign, verify, read_public, public_hex
from .store import meta, get

WORKERS = ('demand','inventory','supplier','finance','purchase')
ACTIONS = tuple(a+'_mock' for a in WORKERS)

def purchase_binding(task, policy_digest):
    s=task['state']
    return sha({'actor':'purchase','task_id':task['id'],'resource':f"procurement:{task['id']}",'action':'purchase_mock',
                'quantity':s['quantity'],'supplier':s['supplier'],'amount':s['quote'],
                'state_version':4,'context_id':task['context_id'],'policy_digest':policy_digest})

class Gateway:
    def __init__(self, store, engine, receipt_key, clock=None):
        self.store=store; self.engine=engine; self.key=receipt_key
        self.clock=clock or (lambda:int(time.time()))
        self.key_id=sha(public_hex(receipt_key))
        # Pin receipt identity per database; restarting must retain the same key.
        with store.transaction() as db:
            pinned=meta(db,'receipt_public')
            if pinned and pinned != public_hex(receipt_key): raise ValueError('Receipt key changed')
            db.execute('INSERT OR IGNORE INTO meta VALUES (?,?)',('receipt_public',public_hex(receipt_key)))

    def call(self, token, raw):
        return self.call_observed(token, raw)[0]

    def call_observed(self, token, raw):
        """Request-local clocks; transaction exit includes commit and close.

        Exceptions and failed commits return no observation. These clocks
        describe a gateway decision, not diagnosis of an external fault.
        """
        observation = {'schema_version': 'gateway-boundaries-v1',
                       'clock': 'perf_counter_ns', 'entered_ns': time.perf_counter_ns()}
        response = self._call(token, raw, observation)
        observation['transaction_exited_ns'] = time.perf_counter_ns()
        observation['receipt_hash'] = sha(response['receipt'])
        return response, observation

    def _call(self, token, raw, observation):
        # Copies isolate callers from mutation while a decision is in flight.
        request=copy.deepcopy(raw)
        observation['request_hash'] = sha(request)
        observation['request_id'] = request.get('request_id') if isinstance(request, dict) else None
        with self.store.transaction() as db:
            now=self.clock()
            row=db.execute('SELECT actor FROM identities WHERE token_hash=?',(sha(token),)).fetchone()
            actor=row[0] if row else 'unauthenticated'
            result=None; cached=False; executed=False
            def finish(decision, reason):
                observation['decision_ns'] = time.perf_counter_ns()
                return self._record(db,request,actor,decision,reason,result,executed,cached,now)
            try: validate('governance-request',request)
            except Exception: return finish('deny','invalid_input')
            if not row or actor != request['actor']: return finish('deny','unknown_or_mismatched_identity')
            try: db.execute('INSERT INTO nonces VALUES (?,?)',(actor,request['nonce']))
            except sqlite3.IntegrityError: return finish('deny','replay')
            try:
                manifest=json.loads(meta(db,'active_manifest') or 'null')
                admin_public=read_public(meta(db,'admin_public'))
                verify(admin_public,manifest); validate('policy-manifest',manifest)
                if manifest['digest'] != self.engine.digest or manifest['version'] != self.engine.version:
                    return finish('deny','policy_changed_or_unsigned')
            except Exception: return finish('deny','policy_changed_or_unsigned')
            task=get(db,'tasks','id',request['task_id'])
            if not task: return finish('deny','unknown_task')
            if task['expires'] <= now: return finish('deny','task_expired')
            resource='procurement:'+task['id']
            if request['resource'] != resource: return finish('deny','resource_scope')
            context=get(db,'contexts','id',request['context_id'])
            context_ok=bool(context and request['context_id']==task['context_id'] and context['task_id']==task['id']
                            and context['source']=='trusted_fixture_loader' and context['expires']>now)
            caprow=db.execute('SELECT body FROM capabilities WHERE task=? AND actor=?',(task['id'],actor)).fetchone()
            cap=json.loads(caprow[0]) if caprow else None
            cap_ok=bool(cap and cap['expires']>now and request['delegation_depth']==cap['depth'])
            semantic={k:v for k,v in request.items() if k not in ('nonce','request_id')}
            fingerprint=sha({'request':semantic,'policy_digest':self.engine.digest})
            prior=db.execute('SELECT fingerprint,state FROM idempotency WHERE task=? AND actor=? AND key=?',
                             (task['id'],actor,request['idempotency_key'])).fetchone()
            if prior and prior[0]!=fingerprint: return finish('deny','idempotency_conflict')
            cached=bool(prior)
            action=request['action']; payload=request['payload']; state=task['state']
            if action=='delegate_mock':
                target=payload['target']
                targetrow=db.execute('SELECT body FROM capabilities WHERE task=? AND actor=?',(task['id'],target)).fetchone()
                payload_ok=actor=='orchestrator' and target in WORKERS and payload['value']==0
                # Repeated delegation must never widen or renew an existing grant.
                if targetrow and not cached: payload_ok=False
                depth=(cap['depth']+1) if cap else 1000000
                stage_ok=True
            else:
                target=''; depth=request['delegation_depth']
                payload_ok=action in ACTIONS and payload['target']=='' and payload['value']==(task['demand_input'] if action=='demand_mock' else 0)
                stage_ok=task['stage']<5 and action==ACTIONS[task['stage']]
            if cached: stage_ok=True
            binding=purchase_binding(task,self.engine.digest)
            approval=get(db,'approvals','task',task['id'])
            approval_ok=bool(approval and approval['binding']==binding and approval['expires']>now
                             and not approval['consumed'] and approval['policy_digest']==self.engine.digest)
            if action=='purchase_mock' and cached and (not approval or approval['expires']<=now):
                return finish('deny','approval_expired')
            human=get(db,'human_grants','task',task['id']); human_ok=False
            if human:
                try:
                    verify(admin_public,human)
                    human_ok=(human['binding']==binding and human['expires']>now and human['reviewer'] not in WORKERS+('orchestrator',))
                except Exception: pass
            review=db.execute('SELECT deadline,status FROM reviews WHERE task=?',(task['id'],)).fetchone()
            if review and review[0]<=now and review[1]=='pending':
                db.execute('UPDATE reviews SET status=? WHERE task=?',('escalated',task['id']))
                return finish('deny','review_timeout_escalated')
            if review and review[1]=='escalated': return finish('deny','review_timeout_escalated')
            facts={'actor':actor,'action':action,'identity_ok':True,'context_ok':context_ok,'capability_ok':cap_ok,
                   'depth':depth,'config':self.engine.config,'state_ok':cached or request['state_version']==state['version'],
                   'stage_ok':stage_ok,'payload_ok':payload_ok,'amount':0 if cached or action not in ('finance_mock','purchase_mock') else state['quote'],
                   'spent':task['spent'],'budget':task['budget'],'approval_ok':cached or approval_ok,
                   'approver':approval['actor'] if approval else '', 'human_ok':human_ok}
            try: decision=self.engine.evaluate(facts)
            except Exception: return finish('deny','policy_unavailable_or_error')
            if decision['decision']=='review_required':
                db.execute('INSERT OR IGNORE INTO reviews VALUES (?,?,?)',(task['id'],now+self.engine.config['review_timeout'],'pending'))
                return finish('review_required',decision['reason'])
            if decision['decision']!='allow': return finish('deny',decision['reason'])
            if cached:
                result=json.loads(prior[1]); return finish('allow','idempotent_result')
            # No callable tool object is returned to the caller. Execution happens under this transaction.
            if action=='delegate_mock':
                db.execute('INSERT INTO capabilities VALUES (?,?,?)',(task['id'],target,json.dumps({'depth':depth,'expires':task['expires'],'parent':actor})))
            elif action=='demand_mock': state['demand']=payload['value']; task['stage']+=1; state['version']+=1
            elif action=='inventory_mock': state['quantity']=max(0,state['demand']-state['stock']); task['stage']+=1; state['version']+=1
            elif action=='supplier_mock':
                state['supplier']='sandbox-supplier'; state['quote']=state['quantity']*5; task['stage']+=1; state['version']+=1
            elif action=='finance_mock':
                approval={'actor':actor,'binding':binding,'expires':min(now+self.engine.config['approval_ttl'],task['expires']),
                          'policy_digest':self.engine.digest,'consumed':False}
                db.execute('INSERT OR REPLACE INTO approvals VALUES (?,?)',(task['id'],json.dumps(approval)))
                state['authorization']=f"sandbox:{state['supplier']}:{state['quantity']}:{state['quote']}"
                task['stage']+=1; state['version']+=1
            elif action=='purchase_mock':
                if state['quantity']>0: state['orders'].append('SIMULATED:'+state['authorization'])
                task['spent']+=state['quote']; approval['consumed']=True
                db.execute('UPDATE approvals SET body=? WHERE task=?',(json.dumps(approval),task['id']))
                task['stage']+=1; state['version']+=1
            else: return finish('deny','unknown_adapter')
            validate('simulation',{'schema_version':'1.0','sandbox':True,'state':state,
                       'events':[{'agent':a,'tool':a+'_mock','version':i+1} for i,a in enumerate(WORKERS)]})
            db.execute('UPDATE tasks SET body=? WHERE id=?',(json.dumps(task),task['id']))
            result=copy.deepcopy(state); executed=True
            db.execute('INSERT INTO idempotency VALUES (?,?,?,?,?)',(task['id'],actor,request['idempotency_key'],fingerprint,json.dumps(result)))
            return finish('allow','policy_allow')

    def _record(self, db, request, actor, decision, reason, state, executed, cached, now):
        prev=db.execute('SELECT sequence,body FROM receipts ORDER BY sequence DESC LIMIT 1').fetchone()
        def field(name):
            value=request.get(name) if isinstance(request,dict) else None
            return value if isinstance(value,str) and 0<len(value)<=256 else 'invalid'
        receipt=sign(self.key,{'schema_version':'2.0','sequence':prev[0]+1 if prev else 1,
                    'previous_hash':sha(json.loads(prev[1])) if prev else '0'*64,'request_hash':sha(request),'actor':actor,
                    'task_id':field('task_id'),'resource':field('resource'),'action':field('action'),
                    'policy_version':self.engine.version,'policy_digest':self.engine.digest,'decision':decision,'reason':reason,
                    'executed':executed,'cached':cached,'result_hash':sha(state),'issued_at':now,'key_id':self.key_id})
        response=validate('governance-response',{'receipt':receipt,'state':state})
        db.execute('INSERT INTO receipts VALUES (?,?)',(receipt['sequence'],json.dumps(receipt)))
        return response


def verify_receipts(receipts, public_key):
    previous='0'*64
    for index,r in enumerate(receipts,1):
        validate('authorization-receipt',r); verify(public_key,r)
        if r['sequence']!=index or r['previous_hash']!=previous or r['key_id']!=sha(public_hex(public_key)):
            raise ValueError('Receipt chain mismatch')
        previous=sha(r)
    return previous
