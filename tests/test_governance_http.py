import copy
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from aps_governance.admin import Administration
from aps_governance.contracts import ROOT, sha, validate
from aps_governance.demo import request, post
from aps_governance.gateway import Gateway
from aps_governance.policy import PolicyEngine
from aps_governance.service import make_server
from aps_governance.signing import new_key
from aps_governance.store import Store, get

class HttpTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.store=Store(Path(self.tmp.name)/'db');self.store.initialize()
        admin=Administration(self.store,new_key());engine=PolicyEngine(ROOT/'policies/v1')
        admin.activate(engine,{'schema_version':'2.0','report_digest':sha({}),'requirements':[]},'fixture','Synthetic fixture',baseline=True)
        self.c=admin.provision('http-task');self.gateway=Gateway(self.store,engine,new_key())
        self.server=make_server(self.gateway);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.url=f'http://127.0.0.1:{self.server.server_port}'
        self.addCleanup(self.stop)
    def stop(self):self.server.shutdown();self.server.server_close();self.thread.join(timeout=2)
    def req(self,path,body=b'{}',token='fake',method='POST'):
        r=urllib.request.Request(self.url+path,data=body,method=method,headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
        return urllib.request.urlopen(r,timeout=5)
    def test_no_administration_or_direct_tool_route(self):
        for path in ['/admin','/v1/policy','/v1/approve','/purchase_mock']:
            with self.assertRaises(urllib.error.HTTPError) as ctx:self.req(path)
            self.assertEqual(ctx.exception.code,404);validate('governance-error',json.load(ctx.exception));ctx.exception.close()
    def test_authentication_and_malformed_wire(self):
        b=request('orchestrator','http-task',self.c['context_id'],'delegate_mock',depth=0,target='demand')
        self.assertEqual(post(self.url,'fake',b)['receipt']['decision'],'deny')
        for raw in [b'{bad',b'{"actor":"demand","actor":"finance"}',b'{"x":NaN}']:
            with self.req('/v1/call',raw,self.c['tokens']['demand']) as response:
                r=validate('governance-response',json.load(response));self.assertEqual(r['receipt']['reason'],'invalid_input')
    def test_oversize_and_storage_outage(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:self.req('/v1/call',b'x'*16385)
        self.assertEqual(ctx.exception.code,413);ctx.exception.close()
        # An unavailable state store cannot result in a tool effect or fabricated allow receipt.
        old=self.store.path;self.store.path=str(Path(self.tmp.name)/'missing'/'db')
        with self.assertRaises(urllib.error.HTTPError) as ctx:self.req('/v1/call')
        self.assertEqual(ctx.exception.code,503);validate('governance-error',json.load(ctx.exception));ctx.exception.close();self.store.path=old
        with self.store.transaction() as db:self.assertEqual(get(db,'tasks','id','http-task')['state']['version'],0)
    def test_actual_http_consequential_tools_mediated(self):
        version=0
        for actor in ('demand','inventory','supplier','finance','purchase'):
            delegate=request('orchestrator','http-task',self.c['context_id'],'delegate_mock',version=version,depth=0,target=actor)
            self.assertEqual(post(self.url,self.c['tokens']['orchestrator'],delegate)['receipt']['decision'],'allow')
            r=post(self.url,self.c['tokens'][actor],request(actor,'http-task',self.c['context_id'],version=version,value=100 if actor=='demand' else 0))
            self.assertTrue(r['receipt']['executed']);version=r['state']['version']
        with self.store.transaction() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM receipts').fetchone()[0],10)
            self.assertEqual(len(get(db,'tasks','id','http-task')['state']['orders']),1)

if __name__=='__main__':unittest.main()
