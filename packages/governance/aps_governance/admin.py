"""Offline policy administration. Not imported by the agent-facing HTTP handler."""
import json
import secrets
import time
from pathlib import Path
from .contracts import sha, validate
from .signing import public_hex, sign, verify, read_public
from .store import Store, meta, put_meta, get
from .gateway import purchase_binding

AGENTS = ('demand','inventory','supplier','finance','purchase','orchestrator')

class Administration:
    def __init__(self, store, private_key):
        self.store = store; self.key = private_key
        with store.transaction() as db:
            pinned = meta(db, 'admin_public')
            if pinned is None: put_meta(db,'admin_public',public_hex(private_key))
            elif pinned != public_hex(private_key): raise PermissionError('Wrong administration key')

    def activate(self, engine, trace, reviewer, reason, human=False, baseline=False, simulation=None):
        validate('traceability',trace)
        if reviewer in AGENTS or not reviewer.strip() or not reason.strip() or (not human and not baseline):
            raise PermissionError('Independent human administrator required')
        if not baseline and any(r['state'] != 'approved' for r in trace['requirements']):
            raise ValueError('Proposed requirements cannot activate')
        if not baseline:
            validate('policy-simulation',simulation)
            if (not simulation['passed'] or not all(r['passed'] and r['actual']['decision']==r['expected'] for r in simulation['results']) or simulation['policy_digest']!=engine.digest or not any(r['expected']=='deny' for r in simulation['results']) or not any(r['expected']=='allow' for r in simulation['results'])):
                raise ValueError('Passing candidate simulation with allow and deny coverage required')
            from .traceability import check_trace
            check_trace(trace, self.key.public_key())
        manifest = sign(self.key, {'version':engine.version,'digest':engine.digest,'reviewer':reviewer,'reason':reason,
                                  'mode':'sandbox_baseline' if baseline else 'human_reviewed','trace_digest':sha(trace),'simulation_digest':sha(simulation)})
        validate('policy-manifest',manifest)
        with self.store.transaction() as db:
            if baseline and meta(db,'active_manifest') is not None: raise PermissionError('Bootstrap is one-time only')
            if meta(db,'policy_version:'+engine.version) is not None: raise ValueError('Policy version already used')
            prior = meta(db,'active_manifest')
            if prior:
                old = json.loads(prior)
                if engine.version == old['version']: raise ValueError('Policy promotion requires a new version')
            put_meta(db,'active_manifest',json.dumps(manifest))
            put_meta(db,'policy_version:'+engine.version,json.dumps(manifest))
        return manifest

    def provision(self, task_id, demand=100, stock=20, budget=1000, lifetime=300, now=None):
        now = int(time.time()) if now is None else now
        if not isinstance(task_id,str) or not task_id or len(task_id)>128: raise ValueError('Invalid task')
        for x in (demand,stock,budget,lifetime):
            if type(x) is not int or not 0 <= x <= 100000: raise ValueError('Invalid task bounds')
        if not 1 <= lifetime <= 3600: raise ValueError('Invalid task lifetime')
        tokens = {a:secrets.token_urlsafe(32) for a in AGENTS}
        context_id = secrets.token_urlsafe(24)
        state={'version':0,'demand':0,'stock':stock,'quantity':0,'supplier':'','quote':0,'authorization':'','orders':[]}
        task={'id':task_id,'state':state,'stage':0,'demand_input':demand,'budget':budget,'spent':0,'expires':now+lifetime,'context_id':context_id}
        with self.store.transaction() as db:
            for actor,token in tokens.items():
                # Provisioning new tasks never rotates existing identity credentials implicitly.
                existing=db.execute('SELECT 1 FROM identities WHERE actor=?',(actor,)).fetchone()
                if existing: raise ValueError('Use a separate sandbox database for a new identity set')
                db.execute('INSERT INTO identities VALUES (?,?)',(actor,sha(token)))
            db.execute('INSERT INTO tasks VALUES (?,?)',(task_id,json.dumps(task)))
            db.execute('INSERT INTO contexts VALUES (?,?)',(context_id,json.dumps({'task_id':task_id,'source':'trusted_fixture_loader','digest':sha({'demand':demand,'stock':stock}),'expires':now+lifetime})))
            db.execute('INSERT INTO capabilities VALUES (?,?,?)',(task_id,'orchestrator',json.dumps({'depth':0,'expires':now+lifetime,'parent':None})))
        return {'task_id':task_id,'context_id':context_id,'tokens':tokens}

    def approve_spend(self, task_id, reviewer, reason, human=False, now=None):
        if not human or reviewer in AGENTS or not reviewer.strip() or not reason.strip(): raise PermissionError('Human review required')
        now = int(time.time()) if now is None else now
        with self.store.transaction() as db:
            task=get(db,'tasks','id',task_id)
            if not task or task['stage'] != 3: raise ValueError('Review requires a finalized supplier quote')
            review=db.execute('SELECT deadline,status FROM reviews WHERE task=?',(task_id,)).fetchone()
            if not review or review[0] <= now or review[1] != 'pending': raise ValueError('Missing or timed-out review; escalate and provision a new task')
            manifest=json.loads(meta(db,'active_manifest'))
            grant=sign(self.key,{'task_id':task_id,'binding':purchase_binding(task,manifest['digest']),
                                 'expires':min(now+60, task['expires'],review[0]),'reviewer':reviewer,'reason':reason})
            db.execute('INSERT OR REPLACE INTO human_grants VALUES (?,?)',(task_id,json.dumps(grant)))
            db.execute('UPDATE reviews SET status=? WHERE task=?',('approved',task_id))
            return grant
