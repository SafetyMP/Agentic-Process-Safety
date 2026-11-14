import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve, relative, sep } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const baselineDigest = '3577671495d2080cef3db985b3d30b3735750e2de894e481a6c0f52e70e24497';
const additionsDigest = 'be807d0c0945152dbbd1adeffda79c49c17eab3f8257cab7ced4fdc6052c7fdf';
const trees = ['packages/engine', 'packages/governance', 'packages/simulator', 'policies', 'schemas', 'tests'];
const sha = (v) => createHash('sha256').update(v).digest('hex');
const originalScripts = {
  demo: 'node --experimental-strip-types packages/simulator/src/simulate.ts',
  test: 'node --experimental-strip-types --test packages/simulator/src/simulate.test.ts',
  typecheck: 'tsc --noEmit',
  'governance:demo': 'PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.demo --audit-dir artifacts/phase2',
  'governance:simulate': 'PYTHONPATH=packages/engine:packages/governance .venv/bin/python -m aps_governance.cli simulate-policy --bundle policies/v1 --cases policies/v1/cases.json --out artifacts/phase2/policy-simulation.json',
};

export function verifyProductionBoundary(repositoryRoot = root) {
  const base = resolve(repositoryRoot);
  // Do not permit symlink substitution of a protected file or an ancestor.
  const checkedPath = (path) => {
    assert.equal(typeof path, 'string', 'Protected path must be a string');
    const parts = path.split('/');
    assert.ok(parts.length && parts.every(part => part && part !== '.' && part !== '..' && !part.includes('\\')), `Invalid protected path: ${path}`);
    let current = base;
    for (const [index, part] of parts.entries()) {
      current = resolve(current, part);
      const stat = lstatSync(current);
      assert.ok(!stat.isSymbolicLink(), `Protected symlink: ${path}`);
      if (index < parts.length - 1) assert.ok(stat.isDirectory(), `Protected parent is not a directory: ${path}`);
    }
    return current;
  };
  const read = (path) => {
    const full = checkedPath(path);
    assert.ok(lstatSync(full).isFile(), `Protected path is not a regular file: ${path}`);
    return readFileSync(full);
  };
  const inspection = JSON.parse(read('docs/STATIC_DEMO_INSPECTION.json'));
  assert.equal(inspection.production_digest, baselineDigest, 'Original production digest changed');
  // Validate the mapping itself, not only its self-reported digest field.
  const baseline = inspection.production_files;
  assert.ok(baseline && typeof baseline === 'object' && !Array.isArray(baseline), 'Invalid original production mapping');
  const canonicalBaseline = Object.fromEntries(Object.entries(baseline).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  assert.equal(sha(JSON.stringify(canonicalBaseline)), baselineDigest, 'Original production mapping changed');

  // This separately pinned extension adds exact tests; it cannot override any
  // original pin, authorize future additions, or change pilot approval status.
  const additionsBytes = read('docs/STATIC_DEMO_PRODUCTION_ADDITIONS.json');
  assert.equal(sha(additionsBytes), additionsDigest, 'Production additions manifest changed');
  const additions = JSON.parse(additionsBytes);
  assert.equal(additions.schema_version, 1);
  assert.equal(additions.baseline_production_digest, baselineDigest);
  const expected = { ...baseline };
  for (const [path, entry] of Object.entries(additions.files)) {
    assert.ok(!Object.hasOwn(baseline, path), `Addition overlaps original protected file: ${path}`);
    assert.ok(trees.some(tree => path.startsWith(tree + '/')), `Addition outside protected trees: ${path}`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    expected[path] = entry.sha256;
  }
  for (const [path, digest] of Object.entries(expected)) {
    assert.equal(sha(read(path)), digest, `Protected bytes changed: ${path}`);
  }

  function walk(path) {
    assert.ok(lstatSync(path).isDirectory(), `Protected tree is not a directory: ${path}`);
    for (const item of readdirSync(path, { withFileTypes: true })) {
      const full = resolve(path, item.name);
      const key = relative(base, full).split(sep).join('/');
      assert.ok(!item.isSymbolicLink(), `Protected symlink: ${key}`);
      // Preserve the original generated-directory exceptions, never file or
      // symlink exceptions disguised with those names.
      if (item.isDirectory()) {
        if (item.name === '__pycache__' || item.name.endsWith('.egg-info')) continue;
        walk(full);
      } else {
        assert.ok(item.isFile(), `Protected path is not a regular file: ${key}`);
        assert.ok(Object.hasOwn(expected, key), `Added protected file: ${key}`);
      }
    }
  }
  trees.forEach(path => walk(checkedPath(path)));
  const scripts = JSON.parse(read('package.json')).scripts;
  for (const [key, value] of Object.entries(originalScripts)) assert.equal(scripts[key], value, `Original script changed: ${key}`);
  return { baselineFiles: Object.keys(baseline).length, addedFiles: Object.keys(additions.files).length, baselineDigest, additionsDigest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyProductionBoundary();
  console.log(`Production boundary: ${result.baselineFiles} original files match pinned mapping ${result.baselineDigest}; ${result.addedFiles} exact test additions match pinned extension ${result.additionsDigest}; original scripts preserved.`);
}
