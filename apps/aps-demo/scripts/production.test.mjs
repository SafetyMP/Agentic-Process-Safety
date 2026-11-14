import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, symlinkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyProductionBoundary } from './production.mjs';

const source = fileURLToPath(new URL('../../../', import.meta.url));
const inspectionPath = 'docs/STATIC_DEMO_INSPECTION.json';
const additionsPath = 'docs/STATIC_DEMO_PRODUCTION_ADDITIONS.json';
const inspection = JSON.parse(readFileSync(resolve(source, inspectionPath)));
const additions = JSON.parse(readFileSync(resolve(source, additionsPath)));
const baselineFile = 'packages/governance/aps_governance/gateway.py';
const addedFiles = Object.keys(additions.files);
const sha = value => createHash('sha256').update(value).digest('hex');

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'aps-production-boundary-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [...Object.keys(inspection.production_files), ...addedFiles, inspectionPath, additionsPath, 'package.json']) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    copyFileSync(resolve(source, path), resolve(root, path));
  }
  return root;
}
function editJSON(root, path, change) {
  const full = resolve(root, path);
  const value = JSON.parse(readFileSync(full));
  change(value);
  writeFileSync(full, JSON.stringify(value, null, 2) + '\n');
}

test('accepts the preserved original baseline and exact three test additions', t => {
  const result = verifyProductionBoundary(fixture(t));
  assert.equal(result.baselineFiles, 70);
  assert.equal(result.addedFiles, 3);
});

for (const path of [baselineFile, ...addedFiles]) {
  test(`rejects changed protected bytes: ${path}`, t => {
    const root = fixture(t);
    writeFileSync(resolve(root, path), 'replacement');
    assert.throws(() => verifyProductionBoundary(root), /Protected bytes changed/);
  });
  test(`rejects a missing protected file: ${path}`, t => {
    const root = fixture(t);
    rmSync(resolve(root, path));
    assert.throws(() => verifyProductionBoundary(root), /ENOENT/);
  });
}

test('rejects an unrecognized addition even when it is an extra test', t => {
  const root = fixture(t);
  writeFileSync(resolve(root, 'tests/test_unreviewed.py'), '# additional test');
  assert.throws(() => verifyProductionBoundary(root), /Added protected file: tests\/test_unreviewed.py/);
});

test('rejects editing baseline file and expected hash while retaining its claimed digest', t => {
  const root = fixture(t);
  writeFileSync(resolve(root, baselineFile), 'replacement');
  editJSON(root, inspectionPath, value => { value.production_files[baselineFile] = sha('replacement'); });
  assert.throws(() => verifyProductionBoundary(root), /Original production mapping changed/);
});

test('rejects deleting a baseline mapping entry and its file', t => {
  const root = fixture(t);
  rmSync(resolve(root, baselineFile));
  editJSON(root, inspectionPath, value => { delete value.production_files[baselineFile]; });
  assert.throws(() => verifyProductionBoundary(root), /Original production mapping changed/);
});

test('rejects changing the original reported digest', t => {
  const root = fixture(t);
  editJSON(root, inspectionPath, value => { value.production_digest = '0'.repeat(64); });
  assert.throws(() => verifyProductionBoundary(root), /Original production digest changed/);
});

test('rejects editing an added file and its expected hash together', t => {
  const root = fixture(t);
  writeFileSync(resolve(root, addedFiles[0]), 'replacement');
  editJSON(root, additionsPath, value => { value.files[addedFiles[0]].sha256 = sha('replacement'); });
  assert.throws(() => verifyProductionBoundary(root), /Production additions manifest changed/);
});

test('rejects extending the additions manifest to admit another file', t => {
  const root = fixture(t);
  writeFileSync(resolve(root, 'tests/test_unreviewed.py'), '# extra');
  editJSON(root, additionsPath, value => { value.files['tests/test_unreviewed.py'] = { sha256: sha('# extra') }; });
  assert.throws(() => verifyProductionBoundary(root), /Production additions manifest changed/);
});

test('rejects an additions manifest that overlaps the baseline', t => {
  const root = fixture(t);
  editJSON(root, additionsPath, value => { value.files[baselineFile] = { sha256: inspection.production_files[baselineFile] }; });
  assert.throws(() => verifyProductionBoundary(root), /Production additions manifest changed/);
});

test('rejects even approval metadata changes to the pinned additions manifest', t => {
  const root = fixture(t);
  editJSON(root, additionsPath, value => { value.files[addedFiles[0]].approval_status = 'approved'; });
  assert.throws(() => verifyProductionBoundary(root), /Production additions manifest changed/);
});

test('rejects a missing additions manifest', t => {
  const root = fixture(t);
  rmSync(resolve(root, additionsPath));
  assert.throws(() => verifyProductionBoundary(root), /ENOENT/);
});

for (const path of [baselineFile, addedFiles[0], additionsPath]) {
  test(`rejects symlink substitution with identical bytes: ${path}`, t => {
    const root = fixture(t);
    const full = resolve(root, path);
    renameSync(full, full + '.retained');
    symlinkSync(full + '.retained', full);
    assert.throws(() => verifyProductionBoundary(root), /Protected symlink/);
  });
}

test('rejects a protected tree replaced with a symlink', t => {
  const root = fixture(t);
  renameSync(resolve(root, 'tests'), resolve(root, 'retained-tests'));
  symlinkSync(resolve(root, 'retained-tests'), resolve(root, 'tests'));
  assert.throws(() => verifyProductionBoundary(root), /Protected symlink/);
});

test('rejects an unknown symlink disguised as a generated cache directory', t => {
  const root = fixture(t);
  symlinkSync(resolve(root, 'docs'), resolve(root, 'tests/__pycache__'));
  assert.throws(() => verifyProductionBoundary(root), /Protected symlink/);
});

test('preserves exclusions for ordinary generated Python cache directories', t => {
  const root = fixture(t);
  mkdirSync(resolve(root, 'tests/__pycache__'));
  writeFileSync(resolve(root, 'tests/__pycache__/generated.pyc'), 'generated');
  assert.equal(verifyProductionBoundary(root).baselineFiles, 70);
});

test('rejects changing an original root script', t => {
  const root = fixture(t);
  editJSON(root, 'package.json', value => { value.scripts['governance:demo'] = 'true'; });
  assert.throws(() => verifyProductionBoundary(root), /Original script changed: governance:demo/);
});
