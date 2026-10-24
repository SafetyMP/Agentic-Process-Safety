import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (p) => readFileSync(resolve(root, p));
const inspection = JSON.parse(read('docs/STATIC_DEMO_INSPECTION.json'));
const digest = '3577671495d2080cef3db985b3d30b3735750e2de894e481a6c0f52e70e24497';
assert.equal(inspection.production_digest, digest);
const sha = (v) => createHash('sha256').update(v).digest('hex');
for (const [path, expected] of Object.entries(inspection.production_files)) {
  assert.equal(sha(read(path)), expected, `Protected bytes changed: ${path}`);
}
const trees = ['packages/engine', 'packages/governance', 'packages/simulator', 'policies', 'schemas', 'tests'];
function walk(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    if (item.name === '__pycache__' || item.name.endsWith('.egg-info')) continue;
    const p = resolve(path, item.name);
    if (item.isDirectory()) walk(p);
    else assert.ok(Object.hasOwn(inspection.production_files, relative(root, p)), `Added protected file: ${relative(root, p)}`);
  }
}
trees.forEach((p) => walk(resolve(root, p)));
const scripts = JSON.parse(read('package.json')).scripts;
const original = {
  demo: 'node --experimental-strip-types packages/simulator/src/simulate.ts',
  test: 'node --experimental-strip-types --test packages/simulator/src/simulate.test.ts',
  typecheck: 'tsc --noEmit',
  'governance:demo': 'PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.demo --audit-dir artifacts/phase2',
  'governance:simulate': 'PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.cli simulate-policy --bundle policies/v1 --cases policies/v1/cases.json --out artifacts/phase2/policy-simulation.json',
};
for (const [k, v] of Object.entries(original)) assert.equal(scripts[k], v, `Original script changed: ${k}`);
console.log(`Production boundary: ${Object.keys(inspection.production_files).length} files match pinned mapping ${digest}; original scripts preserved.`);
