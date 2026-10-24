"""Agent API: execution only; policy/task administration has no network endpoint."""
import hashlib
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from .contracts import canonical, strict_loads, validate

MAX_BODY=16384

def make_server(gateway, port=0):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_): pass  # Never log bearer credentials or full request bodies.
        def setup(self):
            super().setup(); self.connection.settimeout(2)
        def send_json(self, status, body):
            encoded=canonical(body)
            self.send_response(status); self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(encoded))); self.end_headers(); self.wfile.write(encoded)
        def error(self, code, reason):
            self.send_json(code,validate('governance-error',{'error':reason,'executed':False}))
        def do_GET(self): self.error(404,'invalid_endpoint')
        def do_PUT(self): self.error(404,'invalid_endpoint')
        def do_POST(self):
            if self.path!='/v1/call': self.error(404,'invalid_endpoint'); return
            if (self.headers.get('Content-Type')!='application/json' or self.headers.get('Transfer-Encoding') or
                len(self.headers.get_all('Content-Length',[]))!=1 or len(self.headers.get_all('Authorization',[]))!=1):
                self.error(400,'invalid_transport'); return
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=MAX_BODY: self.error(413,'invalid_transport'); return
                raw=self.rfile.read(length)
                if len(raw)!=length: self.error(400,'invalid_transport'); return
            except (ValueError,OSError): self.error(400,'invalid_transport'); return
            try: body=strict_loads(raw)
            except Exception: body={'invalid_wire_sha256':hashlib.sha256(raw).hexdigest()}
            token=self.headers.get('Authorization','').removeprefix('Bearer ')
            try: response=gateway.call(token,body)
            except Exception:
                # Includes persistence/signing failures. The transaction rolls back before returning.
                self.error(503,'unavailable'); return
            # A delivery failure after commit is an uncertain client outcome, not a failed transaction.
            self.send_json(200,response)
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    server.daemon_threads=True
    return server
