import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { select, sources, version } from './selection.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (p) => readFileSync(resolve(root, p));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(read('apps/aps-demo/src/fixtures/manifest.json'));
const fixtures = {};
assert.equal(manifest.transformation_version, version);
assert.deepEqual(Object.keys(manifest.sources).sort(), Object.keys(sources).sort());
let audited = 0;
for (const [kind, entry] of Object.entries(manifest.sources)) {
  assert.equal(entry.path, sources[kind]);
  assert.equal(entry.selector, `selection.mjs#${kind}`);
  assert.match(entry.raw_sha256, /^[a-f0-9]{64}$/);
  const bytes = read(`apps/aps-demo/src/fixtures/${kind}.json`);
  assert.equal(sha(bytes), entry.snapshot_sha256, `${kind} frozen snapshot changed`);
  fixtures[kind] = JSON.parse(bytes);
  if (process.argv.includes('--audit-local')) {
    if (!existsSync(resolve(root, entry.path))) {
      console.log(`NOT AUDITED (source absent): ${entry.path}`);
      continue;
    }
    const raw = read(entry.path);
    assert.equal(sha(raw), entry.raw_sha256, `${kind} local source differs from frozen revision; explicit reviewed refresh required`);
    const selected = select(kind, kind === 'stages' ? raw.toString() : JSON.parse(raw));
    assert.deepEqual(selected, fixtures[kind], `${kind} selector differs`);
    audited++;
  }
}
const { hazards, scenarios, requirements, topology, experiment, acceptance, stages } = fixtures;
assert.equal(fixtures.workload.status, 'inputs_only_unexecuted');
assert.equal(fixtures.workload.digest, experiment.workload_digest);
assert.equal(fixtures.workload.cases.length, 10);
assert.equal(new Set(fixtures.workload.cases.filter(c => c.fault !== 'benign').map(c => c.fault)).size, 9);
for (const c of fixtures.workload.cases) for (const arm of fixtures.workload.configurations) {
  assert.ok(experiment.trials.some(t => t.case_id === c.id && t.case_digest === c.digest && t.fault === c.fault && t.configuration === arm), 'Missing recorded workload case / arm');
}
const unique = (rows, key) => { const ids = new Set(rows.map((r) => r[key])); assert.equal(ids.size, rows.length); return ids; };
const nodes = unique(topology.nodes, 'id');
assert.equal(nodes.size, 6);
const ids = unique(hazards, 'id');
assert.equal(hazards.length, 96);
for (const h of hazards) {
  assert.ok(nodes.has(h.node));
  assert.equal(h.review_state, 'unverified');
  assert.equal(h.severity, null); assert.equal(h.likelihood, null);
  assert.equal(h.residual_risk, 'undecided'); assert.deepEqual(h.review_history, []);
}
assert.equal(scenarios.length, 16); unique(scenarios, 'id');
for (const s of scenarios) assert.ok(hazards.some((h) => h.node === s.node && h.deviation === s.deviation));
for (const edge of topology.communications) assert.ok(nodes.has(edge.source) && nodes.has(edge.target));
const reqIds = unique(requirements, 'id'); assert.equal(requirements.length, 16);
for (const r of requirements) {
  assert.ok(ids.has(r.hazard_id)); assert.equal(r.state, 'proposed');
  for (const c of r.controls) {
    assert.ok(['implemented', 'gap'].includes(c.status));
    if (c.status === 'gap') assert.equal(c.test, 'none');
    else assert.ok(c.test.startsWith('test_') && c.gap.includes('human review'));
  }
}
assert.ok(requirements.some((r) => r.controls.some((c) => c.id === 'GAP-CONFLICTING_OBJECTIVES' && c.status === 'gap')));
assert.equal(experiment.trials.length, 30); unique(experiment.trials, 'sequence');
for (const t of experiment.trials) {
  assert.ok(['A', 'B', 'C'].includes(t.configuration)); assert.equal(t.status, 'recorded');
  for (const link of t.hazard_links) {
    assert.ok(ids.has(link.id), `Unknown trial hazard ${link.id}`);
    assert.equal(link.review_state, 'unverified');
  }
  for (const link of t.requirement_links) {
    assert.ok(reqIds.has(link.id), `Unknown trial requirement ${link.id}`);
    assert.equal(link.state, 'proposed');
    assert.deepEqual(link.controls, requirements.find((r) => r.id === link.id).controls);
  }
  for (const c of t.calls) assert.ok(nodes.has(c.actor));
}
for (const [arm, expected] of Object.entries({ A: [10, 10, 5], B: [6, 9, 3], C: [0, 8, 3] })) {
  const trials = experiment.trials.filter((t) => t.configuration === arm);
  const m = experiment.configurations[arm];
  const sum = (k) => trials.reduce((n, t) => n + t.outcome[k], 0);
  assert.equal(trials.length, 10); assert.equal(m.recorded_trials, 10); assert.equal(m.missing_trials, 0);
  assert.deepEqual([sum('unsafe_mutations'), sum('attack_attempts'), trials.filter((t) => t.completed).length], expected);
  assert.deepEqual([m.unsafe_mutations, m.attack_attempts, m.completed_trials], expected);
  assert.equal(m.completion_denominator, 10);
  assert.equal(m.prevented_attempts, sum('prevented_attempts'));
  assert.equal(m.unresolved_attempts, sum('unresolved_attempts'));
  assert.equal(m.false_denials, 0); assert.equal(m.false_denial_denominator, 1);
  assert.deepEqual(m.evidence_sequences, trials.map((t) => t.sequence));
}
assert.equal(acceptance.passed, true); assert.equal(acceptance.checks.length, 21);
assert.ok(acceptance.checks.every((c) => c.passed));
assert.deepEqual(acceptance.evidence_head, experiment.evidence_head);
assert.equal(stages.length, 9); assert.ok(stages.every((s) => s.exit === 0));
console.log(`Frozen fixture integrity: ${Object.keys(manifest.sources).length} hashes, 96 unverified hazards, 16 proposed requirements, 30 trial records, 21 recorded checks, 9 recorded stages; foreign keys, workload coverage and A/B/C aggregates pass.`);
console.log(process.argv.includes('--audit-local') ? `Local source audit: ${audited}/8 present and matched; absent sources were NOT verified.` : 'Local raw sources NOT audited (clean-CI snapshot validation only); raw hashes are provenance, not signatures.');
