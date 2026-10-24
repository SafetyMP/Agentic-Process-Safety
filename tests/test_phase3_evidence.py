import copy
import sqlite3
import tempfile
import unittest
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from aps.core import analyze
from aps_governance.contracts import ROOT, sha
from aps_governance.evidence import EvidenceLog, ZERO, artifact_link, verify
from aps_governance.traceability import propose
import json


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.log = EvidenceLog(self.root / 'evidence.sqlite')

    def append(self, **kwargs):
        return self.log.append('seed-17-C', 'outcome', {'executed': False}, **kwargs)

    def test_authentic_proposals_remain_unapproved(self):
        report = analyze(json.loads((ROOT/'examples/procurement.json').read_text()),
                         json.loads((ROOT/'examples/scenarios.json').read_text()))
        trace = propose(report)
        self.assertEqual(len(report['hazards']), 96)
        self.assertEqual(len(trace['requirements']), 16)
        self.assertEqual(report['requirements'], [])
        for requirement in trace['requirements']:
            self.assertEqual(requirement['state'], 'proposed')
            hazard = next(h for h in report['hazards'] if h['id'] == requirement['hazard_id'])
            self.log.append('inspection', 'proposed_mapping', {'review_state': 'proposed'}, [
                {'relation': 'hazard', 'target': hazard['id'], 'digest': sha(hazard)},
                {'relation': 'requirement', 'target': requirement['id'], 'digest': sha(requirement)}])
        self.assertEqual(verify(self.log.records())['count'], 16)

    def test_empty_restart_and_payload_isolation(self):
        self.assertEqual(verify([]), {'count': 0, 'hash': ZERO})
        payload = {'missing': None}
        record = self.log.append('run', 'measurement', payload)
        payload['missing'] = 42
        restarted = EvidenceLog(self.root/'evidence.sqlite')
        self.assertIsNone(restarted.records()[0]['event']['payload']['missing'])
        self.assertEqual(verify(restarted.records()), {'count': 1, 'hash': record['hash']})

    def test_tamper_reorder_delete_and_truncate(self):
        for _ in range(3): self.append()
        rows = self.log.records()
        pinned = verify(rows)
        tampered = copy.deepcopy(rows)
        tampered[0]['event']['payload']['executed'] = True
        for altered in (tampered, list(reversed(rows)), rows[1:], [rows[0], rows[2]]):
            with self.assertRaises(ValueError): verify(altered)
        # A valid prefix alone is undetectable: a separate pinned count/head is needed.
        self.assertEqual(verify(rows[:-1])['count'], 2)
        with self.assertRaises(ValueError): verify(rows[:-1], pinned)
        with self.assertRaises(ValueError): verify([], pinned)

    def test_sql_update_delete_blocked_and_corrupt_append_refused(self):
        self.append()
        with closing(sqlite3.connect(self.log.path)) as db, db:
            for sql in ('DELETE FROM evidence', "UPDATE evidence SET record='{}'"):
                with self.assertRaises(sqlite3.IntegrityError): db.execute(sql)
            # Model an owner who can remove safeguards. Append must detect corruption.
            db.execute('DROP TRIGGER evidence_no_update')
            db.execute("UPDATE evidence SET record='{}'")
        with self.assertRaises(ValueError): self.append()

    def test_concurrent_writers_and_stale_head(self):
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda _: self.append(), range(20)))
        self.assertEqual(verify(self.log.records())['count'], 20)
        with self.assertRaises(ValueError):
            self.append(expected_head={'count': 0, 'hash': ZERO})
        self.assertEqual(len(self.log.records()), 20)

    def test_artifact_bytes_and_path_escape(self):
        artifact = self.root/'trace.json'
        artifact.write_bytes(b'{"spans":[]}\n')
        link = artifact_link(self.root, 'trace.json')
        self.append(links=[link])
        verify(self.log.records(), artifact_root=self.root)
        artifact.write_bytes(b'changed')
        with self.assertRaises(ValueError): verify(self.log.records(), artifact_root=self.root)
        for path in ('../outside', '/etc/passwd'):
            with self.assertRaises(ValueError): artifact_link(self.root, path)
        (self.root/'escape').symlink_to('/etc/passwd')
        with self.assertRaises(ValueError): artifact_link(self.root, 'escape')

    def test_invalid_input_leaves_no_partial_record(self):
        for payload in ({'latency': float('nan')}, {'latency': float('inf')}):
            with self.assertRaises(ValueError): self.log.append('run', 'metric', payload)
        with self.assertRaises(ValueError): self.append(links=[{'relation': 'artifact', 'target': 'x', 'digest': 'fake'}])
        with self.assertRaises(ValueError): self.log.append('', 'metric', {})
        self.assertEqual(self.log.records(), [])


if __name__ == '__main__':
    unittest.main()
