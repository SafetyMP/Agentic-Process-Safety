import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[3]

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()

def sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()

VALIDATORS = {}
def validate(name, value):
    if name not in VALIDATORS:
        VALIDATORS[name] = Draft202012Validator(json.loads((ROOT/'schemas'/f'{name}.schema.json').read_text()))
    VALIDATORS[name].validate(value)
    return value

def strict_loads(raw):
    def pairs(items):
        result = {}
        for k, v in items:
            if k in result: raise ValueError('Duplicate JSON key')
            result[k] = v
        return result
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))
