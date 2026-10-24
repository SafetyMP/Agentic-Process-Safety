import base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives import serialization
from .contracts import canonical, sha

def new_key(): return Ed25519PrivateKey.generate()
def public_hex(key):
    key = key.public_key() if hasattr(key, 'public_key') else key
    return key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()
def private_hex(key):
    return key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption()).hex()
def read_private(value): return Ed25519PrivateKey.from_private_bytes(bytes.fromhex(value))
def read_public(value): return Ed25519PublicKey.from_public_bytes(bytes.fromhex(value))
def sign(key, value): return {**value, 'signature':base64.b64encode(key.sign(canonical(value))).decode()}
def verify(key, value):
    raw = dict(value); signature = raw.pop('signature')
    key.verify(base64.b64decode(signature, validate=True), canonical(raw))
    return raw
