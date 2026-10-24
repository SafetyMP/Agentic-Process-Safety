"""Local append-only evidence, not a safety oracle or an external trust anchor."""
import hashlib
import re
import sqlite3
from contextlib import closing
from pathlib import Path

from .contracts import canonical, sha, strict_loads

ZERO = '0' * 64
RELATIONS = {'hazard', 'requirement', 'policy', 'test', 'trace', 'outcome', 'artifact'}
HEX = re.compile(r'[0-9a-f]{64}')


def artifact_link(root, relative):
    """Bind raw artifact bytes, resolving paths within a caller-selected root."""
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if path == root or not path.is_relative_to(root):
        raise ValueError('Artifact outside evidence root')
    return {'relation': 'artifact', 'target': path.relative_to(root).as_posix(),
            'digest': hashlib.sha256(path.read_bytes()).hexdigest()}


def _validate(event):
    if not isinstance(event, dict) or set(event) != {'run_id', 'kind', 'payload', 'links'}:
        raise ValueError('Invalid event fields')
    for key in ('run_id', 'kind'):
        if not isinstance(event[key], str) or not event[key].strip():
            raise ValueError('Empty event identity')
    if not isinstance(event['payload'], dict) or not isinstance(event['links'], list):
        raise ValueError('Invalid event payload or links')
    for link in event['links']:
        if not isinstance(link, dict) or set(link) != {'relation', 'target', 'digest'}:
            raise ValueError('Invalid evidence link')
        if link['relation'] not in RELATIONS or not isinstance(link['target'], str) or not link['target']:
            raise ValueError('Invalid evidence relation/target')
        if not isinstance(link['digest'], str) or not HEX.fullmatch(link['digest']):
            raise ValueError('Invalid evidence digest')
    canonical(event)  # Reject non-JSON and nonfinite measurements, never normalize them silently.


def verify(records, expected_head=None, artifact_root=None):
    """Verify full ordered records and optionally a separately retained count/head.

    Semantic links hash caller-supplied objects; this primitive does not assert
    that a hazard is covered, a requirement approved, or a trace actually exported.
    Artifact links additionally verify bytes when artifact_root is supplied.
    """
    previous = ZERO
    count = 0
    for count, record in enumerate(records, 1):
        if not isinstance(record, dict) or set(record) != {'sequence', 'previous_hash', 'event', 'hash'}:
            raise ValueError('Invalid evidence envelope')
        _validate(record['event'])
        if type(record['sequence']) is not int or record['sequence'] != count or record['previous_hash'] != previous:
            raise ValueError('Evidence sequence/chain mismatch')
        body = {k: v for k, v in record.items() if k != 'hash'}
        if record['hash'] != sha(body):
            raise ValueError('Evidence hash mismatch')
        if artifact_root is not None:
            for link in record['event']['links']:
                if link['relation'] == 'artifact' and artifact_link(artifact_root, link['target']) != link:
                    raise ValueError('Artifact digest mismatch')
        previous = record['hash']
    head = {'count': count, 'hash': previous}
    if expected_head is not None and head != expected_head:
        raise ValueError('Evidence pinned head mismatch')
    return head


class EvidenceLog:
    """Serialized append API with update/delete rejection on normal SQL paths.

    SQLite transactions provide complete records after process failure. Filesystem
    owners can replace the database or remove triggers; retain a head separately.
    """
    def __init__(self, path):
        self.path = str(path)
        with closing(sqlite3.connect(self.path)) as db, db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS evidence (
                    sequence INTEGER PRIMARY KEY, record TEXT NOT NULL);
                CREATE TRIGGER IF NOT EXISTS evidence_no_update BEFORE UPDATE ON evidence
                    BEGIN SELECT RAISE(ABORT, 'Evidence is append-only'); END;
                CREATE TRIGGER IF NOT EXISTS evidence_no_delete BEFORE DELETE ON evidence
                    BEGIN SELECT RAISE(ABORT, 'Evidence is append-only'); END;
            ''')

    @staticmethod
    def _records(db):
        result = []
        for sequence, raw in db.execute('SELECT sequence,record FROM evidence ORDER BY sequence'):
            record = strict_loads(raw)
            if not isinstance(record, dict) or record.get('sequence') != sequence:
                raise ValueError('Evidence database sequence mismatch')
            result.append(record)
        return result

    def records(self):
        with closing(sqlite3.connect(self.path)) as db, db:
            records = self._records(db)
            verify(records)
            return records

    def append(self, run_id, kind, payload, links=(), expected_head=None):
        # Snapshot before validating to isolate the stored event from caller mutation.
        event = strict_loads(canonical({'run_id': run_id, 'kind': kind,
                                      'payload': payload, 'links': list(links)}))
        _validate(event)
        with closing(sqlite3.connect(self.path, timeout=10)) as db, db:
            db.execute('BEGIN IMMEDIATE')
            head = verify(self._records(db), expected_head)
            body = {'sequence': head['count'] + 1, 'previous_hash': head['hash'], 'event': event}
            record = {**body, 'hash': sha(body)}
            db.execute('INSERT INTO evidence VALUES (?,?)',
                       (record['sequence'], canonical(record).decode()))
        return record
