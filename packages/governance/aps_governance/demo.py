"""Disposable integration fixture. Bootstrap keys/tokens never enter the output artifacts."""
import argparse
import json
import math
import statistics
import tempfile
import threading
import time
import urllib.request
import uuid
from pathlib import Path
from .admin import Administration
from .contracts import ROOT, sha, validate
from .gateway import Gateway, verify_receipts
from .policy import PolicyEngine
from .service import make_server
from .signing import new_key, public_hex
from .store import Store


def request(actor, task_id, context_id, action=None, version=0, depth=1, value=0, target='', key=None):
    return {'request_id':str(uuid.uuid4()),'nonce':str(uuid.uuid4()),'idempotency_key':key or str(uuid.uuid4()),
            'actor':actor,'task_id':task_id,'resource':'procurement:'+task_id,'action':action or actor+'_mock',
            'state_version':version,'delegation_depth':depth,'context_id':context_id,'payload':{'value':value,'target':target}}

def post(url, token, body):
    wire=json.dumps(body).encode()
    req=urllib.request.Request(url+'/v1/call',data=wire,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=5) as response:
        return validate('governance-response',json.load(response))

def run(options=None, audit_dir=None):
    options=options or {}
    with tempfile.TemporaryDirectory(prefix='aps-demo-') as d:
        store=Store(Path(d)/'gateway.sqlite'); store.initialize()
        admin_key=new_key(); receipt_key=new_key()
        engine=PolicyEngine(ROOT/'policies/v1')
        admin=Administration(store,admin_key)
        empty_trace={'schema_version':'2.0','report_digest':sha({}),'requirements':[]}
        admin.activate(engine,empty_trace,'sandbox-bootstrap','Disposable integration fixture; no human hazard review',baseline=True)
        credentials=admin.provision('demo-task',demand=options.get('demand',100),stock=options.get('stock',20),budget=options.get('budget',1000))
        gateway=Gateway(store,engine,receipt_key)
        server=make_server(gateway); thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        url=f'http://127.0.0.1:{server.server_port}'
        receipts=[]; latencies=[]; state=None; events=[]
        try:
            for index,actor in enumerate(('demand','inventory','supplier','finance','purchase')):
                delegate=request('orchestrator','demo-task',credentials['context_id'],'delegate_mock',index,0,target=actor)
                for body in [delegate,request(actor,'demo-task',credentials['context_id'],version=0 if options.get('staleVersion') and actor=='purchase' else index,value=options.get('demand',100) if actor=='demand' else 0)]:
                    start=time.perf_counter_ns()
                    response=post(url,credentials['tokens'][body['actor']],body)
                    latencies.append((time.perf_counter_ns()-start)/1e6); receipts.append(response['receipt'])
                    if response['receipt']['decision']!='allow':
                        reason=response['receipt']['reason']
                        if 'spending_cap' in reason: raise ValueError('Budget exceeded')
                        if 'state_mismatch' in reason: raise ValueError('State version conflict')
                        raise ValueError(reason)
                    state=response['state']
                events.append({'agent':actor,'tool':actor+'_mock','version':state['version']})
            result=validate('simulation',{'schema_version':'1.0','sandbox':True,'state':state,'events':events})
            verify_receipts(receipts,receipt_key.public_key())
            if audit_dir:
                audit=Path(audit_dir); audit.mkdir(parents=True,exist_ok=True)
                (audit/'authorization-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
                (audit/'receipt-public-key.txt').write_text(public_hex(receipt_key)+'\n')
                (audit/'governed-simulation.json').write_text(json.dumps(result,indent=2)+'\n')
                sorted_ms=sorted(latencies)
                (audit/'integration-latency.json').write_text(json.dumps(validate('integration-latency',{'samples':len(latencies),'unit':'ms','scope':'loopback HTTP + SQLite transaction + real OPA subprocess + Ed25519 receipt',
                   'p50':statistics.median(latencies),'p95':sorted_ms[math.ceil(.95*len(sorted_ms))-1],'min':min(latencies),'max':max(latencies)}),indent=2)+'\n')
            return result
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=2)

def main():
    p=argparse.ArgumentParser();p.add_argument('--options',default='{}');p.add_argument('--audit-dir')
    a=p.parse_args()
    try: print(json.dumps(run(json.loads(a.options),a.audit_dir),indent=2))
    except Exception as e: p.exit(1,str(e)+'\n')
if __name__=='__main__': main()
