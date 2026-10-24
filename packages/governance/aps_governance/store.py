import json
import sqlite3
from contextlib import contextmanager
from .contracts import sha

DDL = '''
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS identities (actor TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS contexts (id TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS capabilities (task TEXT, actor TEXT, body TEXT NOT NULL, PRIMARY KEY(task,actor));
CREATE TABLE IF NOT EXISTS approvals (task TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS human_grants (task TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nonces (actor TEXT, nonce TEXT, PRIMARY KEY(actor,nonce));
CREATE TABLE IF NOT EXISTS idempotency (task TEXT, actor TEXT, key TEXT, fingerprint TEXT, state TEXT, PRIMARY KEY(task,actor,key));
CREATE TABLE IF NOT EXISTS receipts (sequence INTEGER PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (task TEXT PRIMARY KEY, deadline INTEGER NOT NULL, status TEXT NOT NULL);
'''

class Store:
    def __init__(self, path): self.path = str(path)
    @contextmanager
    def transaction(self):
        db = sqlite3.connect(self.path, timeout=5)
        try:
            db.execute('PRAGMA foreign_keys=ON'); db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except BaseException:
            db.rollback(); raise
        finally: db.close()
    def initialize(self):
        db=sqlite3.connect(self.path)
        try: db.executescript(DDL); db.commit()
        finally: db.close()


def get(db, table, column, value):
    # Table and column identifiers are constants in trusted source, never request values.
    row = db.execute(f'SELECT body FROM {table} WHERE {column}=?', (value,)).fetchone()
    return json.loads(row[0]) if row else None

def meta(db, key):
    row = db.execute('SELECT value FROM meta WHERE key=?', (key,)).fetchone()
    return row[0] if row else None

def put_meta(db, key, value):
    db.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', (key,value))
