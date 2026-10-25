import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { documents, verify } from './verify-repository-readiness.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test('the proposed repository passes readiness checks', () => {
  assert.deepEqual(verify(root), []);
});
test('negative cases reject broken links, privilege escalation, unpinned actions and metadata drift', () => {
  const base = resolve(root, '.harness/tmp'); mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(resolve(base, 'readiness-test-'));
  const files = [...documents, 'LICENSE', 'package.json', 'package-lock.json', 'apps/aps-demo/package.json', '.github/ISSUE_TEMPLATE/bug.yml', '.github/ISSUE_TEMPLATE/question.yml', '.github/dependabot.yml', '.github/workflows/repository-checks.yml'];
  try {
    for (const p of files) { mkdirSync(dirname(resolve(dir, p)), { recursive: true }); copyFileSync(resolve(root, p), resolve(dir, p)); }
    // Other existing README links are absent in this minimal fixture; test targeted diagnostics.
    const mutate = (p, transform, expected) => {
      const target = resolve(dir, p), original = readFileSync(target, 'utf8');
      writeFileSync(target, transform(original));
      assert.ok(verify(dir).some(e => e.includes(expected)), expected);
      writeFileSync(target, original);
    };
    mutate('CONTRIBUTING.md', s => s + '\n[missing](missing-file.md)\n', 'Broken local link in CONTRIBUTING.md');
    mutate('.github/workflows/repository-checks.yml', s => s.replace('contents: read', 'contents: write'), 'Unsafe CI');
    mutate('.github/workflows/repository-checks.yml', s => s.replace(/checkout@[a-f0-9]{40}/g, 'checkout@main'), 'Unpinned action');
    mutate('package.json', s => s.replace('Apache-2.0', 'MIT'), 'License metadata mismatch');
    mutate('LICENSE', s => s.slice(0, 100), 'Apache license text truncated');
    mutate('.github/ISSUE_TEMPLATE/bug.yml', s => s.replace('description:', 'omitted:'), 'Invalid issue form');
    mutate('.github/workflows/repository-checks.yml', s => s.replace('- run: .venv/bin/pip install -r requirements.lock', '- run: echo skipped'), 'Missing Python gateway prerequisites');
    mutate('.github/workflows/repository-checks.yml', s => s.replace('sha256sum --check', 'echo unchecked'), 'Missing pinned OPA gateway prerequisite');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
