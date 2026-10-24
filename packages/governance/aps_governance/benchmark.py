"""Local reproducible microbenchmark; no throughput or production-safety claims."""
import argparse
import json
import math
import platform
import statistics
import subprocess
import tempfile
import time
from pathlib import Path
from .contracts import ROOT, sha, validate
from .store import Store
from .policy import PolicyEngine
from .signing import new_key
from .admin import Administration
from .gateway import Gateway
from .demo import request

def summarize(values):
    values=sorted(values)
    return {'samples':len(values),'p50_ms':statistics.median(values),'p95_ms':values[math.ceil(.95*len(values))-1],
            'p99_ms':values[math.ceil(.99*len(values))-1],'min_ms':values[0],'max_ms':values[-1]}

def run(samples=100):
    with tempfile.TemporaryDirectory(prefix='aps-bench-') as d:
        store=Store(Path(d)/'db');store.initialize();admin=Administration(store,new_key());engine=PolicyEngine(ROOT/'policies/v1')
        admin.activate(engine,{'schema_version':'2.0','report_digest':sha({}),'requirements':[]},'benchmark-bootstrap','Synthetic benchmark fixture',baseline=True)
        c=admin.provision('benchmark',lifetime=3600);g=Gateway(store,engine,new_key())
        r=request('orchestrator','benchmark',c['context_id'],'delegate_mock',depth=0,target='demand')
        assert g.call(c['tokens']['orchestrator'],r)['receipt']['decision']=='allow'
        b=request('demand','benchmark',c['context_id'],value=100,key='bench-idem')
        assert g.call(c['tokens']['demand'],b)['receipt']['executed']
        times={'allow_idempotent':[],'deny_policy':[]}
        for group in times:
            for index in range(samples):
                q=dict(b,nonce=f'{group}-{index}',request_id=f'{group}-{index}')
                if group=='deny_policy':q=dict(q,action='finance_mock',idempotency_key=f'deny-{index}')
                start=time.perf_counter_ns();result=g.call(c['tokens']['demand'],q);elapsed=(time.perf_counter_ns()-start)/1e6
                assert result['receipt']['decision']==('allow' if group=='allow_idempotent' else 'deny')
                times[group].append(elapsed)
        return {'clock':'perf_counter_ns','python':platform.python_version(),'platform':platform.platform(),
                'opa':subprocess.check_output([engine.executable,'version'],text=True).splitlines()[0],
                'scope':'in-process Gateway.call including SQLite lock/transaction, real OPA subprocess, validation and Ed25519 signing; excludes HTTP and bootstrap',
                'warmup':'one delegated demand execution; no policy subprocess pool','results':{k:summarize(v) for k,v in times.items()}}

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--samples',type=int,default=100);a=p.parse_args()
    if not 10<=a.samples<=10000:p.error('samples must be 10..10000')
    Path(a.out).write_text(json.dumps(validate('enforcement-latency',run(a.samples)),indent=2)+'\n')
if __name__=='__main__':main()
