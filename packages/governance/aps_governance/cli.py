import argparse
import json
import os
import time
from pathlib import Path
from .admin import Administration
from .contracts import ROOT, sha, validate
from .gateway import Gateway, verify_receipts
from .policy import PolicyEngine
from .service import make_server
from .signing import new_key, private_hex, public_hex, read_private, read_public
from .store import Store
from .traceability import propose, approve_requirement, revise_requirement


def load(path): return json.loads(Path(path).read_text())
def write(path, data, secret=False):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    if secret:
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as f:json.dump(data,f,indent=2)
    else:path.write_text(json.dumps(data,indent=2)+'\n')

def main():
    p=argparse.ArgumentParser(description='APS Phase 2: local sandbox governance')
    sub=p.add_subparsers(dest='command',required=True)
    init=sub.add_parser('init');init.add_argument('--runtime',required=True);init.add_argument('--admin-key',required=True);init.add_argument('--clients',required=True)
    init.add_argument('--task',default='procurement-task');init.add_argument('--demand',type=int,default=100);init.add_argument('--stock',type=int,default=20);init.add_argument('--budget',type=int,default=1000)
    init.add_argument('--sandbox-bootstrap',action='store_true',required=True)
    serve=sub.add_parser('serve');serve.add_argument('--runtime',required=True);serve.add_argument('--bundle',default=str(ROOT/'policies/v1'));serve.add_argument('--port',type=int,default=8765)
    trace=sub.add_parser('trace');trace.add_argument('report');trace.add_argument('--out',required=True)
    rev=sub.add_parser('revise-requirement');rev.add_argument('trace');rev.add_argument('id');rev.add_argument('--text',required=True);rev.add_argument('--out',required=True)
    approve=sub.add_parser('approve-requirement');approve.add_argument('report');approve.add_argument('trace');approve.add_argument('id');approve.add_argument('--admin-key',required=True)
    for key in ['reviewer','reason','out']:approve.add_argument('--'+key,required=True)
    approve.add_argument('--human',action='store_true',required=True)
    sim=sub.add_parser('simulate-policy');sim.add_argument('--bundle',required=True);sim.add_argument('--cases',required=True);sim.add_argument('--out',required=True)
    activate=sub.add_parser('activate-policy');activate.add_argument('--runtime',required=True);activate.add_argument('--admin-key',required=True);activate.add_argument('--bundle',required=True);activate.add_argument('--trace',required=True);activate.add_argument('--cases',required=True)
    activate.add_argument('--reviewer',required=True);activate.add_argument('--reason',required=True);activate.add_argument('--human',action='store_true',required=True)
    grant=sub.add_parser('approve-spend');grant.add_argument('--runtime',required=True);grant.add_argument('--admin-key',required=True);grant.add_argument('--task',required=True);grant.add_argument('--reviewer',required=True);grant.add_argument('--reason',required=True);grant.add_argument('--human',action='store_true',required=True)
    receipts=sub.add_parser('verify-receipts');receipts.add_argument('file');receipts.add_argument('--public-key',required=True)
    a=p.parse_args()
    try:
        if a.command=='init':
            runtime=Path(a.runtime)
            if runtime.exists():raise ValueError('Runtime directory already exists')
            runtime.mkdir(parents=True,mode=0o700)
            store=Store(runtime/'gateway.sqlite');store.initialize()
            key=new_key();write(a.admin_key,{'private_key':private_hex(key)},True)
            write(runtime/'receipt-key.json',{'private_key':private_hex(new_key())},True)
            admin=Administration(store,key);engine=PolicyEngine(ROOT/'policies/v1')
            admin.activate(engine,{'schema_version':'2.0','report_digest':sha({}),'requirements':[]},'sandbox-bootstrap','Explicit sandbox baseline; no human-reviewed hazard claims',baseline=True)
            credentials=admin.provision(a.task,a.demand,a.stock,a.budget)
            # One file per agent; do not give an agent the entire client directory.
            for actor,token in credentials['tokens'].items():
                write(Path(a.clients)/(actor+'.json'),{'actor':actor,'token':token,'task_id':a.task,'context_id':credentials['context_id']},True)
            print('Initialized local sandbox baseline. No hazards or requirements were approved.')
        elif a.command=='serve':
            runtime=Path(a.runtime);store=Store(runtime/'gateway.sqlite')
            gateway=Gateway(store,PolicyEngine(a.bundle),read_private(load(runtime/'receipt-key.json')['private_key']))
            server=make_server(gateway,a.port)
            print(f'Agent execution API: http://127.0.0.1:{server.server_port}/v1/call',flush=True)
            try:server.serve_forever()
            finally:server.server_close()
        elif a.command=='trace':write(a.out,propose(load(a.report)))
        elif a.command=='revise-requirement':write(a.out,revise_requirement(load(a.trace),a.id,a.text))
        elif a.command=='approve-requirement':
            key=read_private(load(a.admin_key)['private_key'])
            write(a.out,approve_requirement(load(a.trace),load(a.report),a.id,a.reviewer,a.reason,key,a.human))
        elif a.command=='simulate-policy':write(a.out,simulate_cases(PolicyEngine(a.bundle),load(a.cases)))
        elif a.command=='activate-policy':
            engine=PolicyEngine(a.bundle);simulation=simulate_cases(engine,load(a.cases))
            if not simulation['passed']:raise ValueError('Policy simulation failed')
            admin=Administration(Store(Path(a.runtime)/'gateway.sqlite'),read_private(load(a.admin_key)['private_key']))
            admin.activate(engine,load(a.trace),a.reviewer,a.reason,a.human,simulation=simulation)
            print('Policy activated; restart gateway with this bundle. The previous worker now fails closed.')
        elif a.command=='approve-spend':
            admin=Administration(Store(Path(a.runtime)/'gateway.sqlite'),read_private(load(a.admin_key)['private_key']))
            admin.approve_spend(a.task,a.reviewer,a.reason,a.human);print('Exact task purchase approved by external administrator')
        elif a.command=='verify-receipts':
            print(verify_receipts(load(a.file),read_public(Path(a.public_key).read_text().strip())))
    except Exception as e:p.exit(2,str(e)+'\n')

def simulate_cases(engine,cases):
    validate('policy-cases',cases)
    results=[]
    for case in cases:
        actual=engine.simulate(case['facts'])
        results.append({'id':case['id'],'expected':case['expected'],'actual':actual,'passed':actual['decision']==case['expected']})
    return validate('policy-simulation',{'policy_digest':engine.digest,'policy_version':engine.version,'cases_digest':sha(cases),
                                        'passed':all(r['passed'] for r in results),'results':results})
if __name__=='__main__':main()
