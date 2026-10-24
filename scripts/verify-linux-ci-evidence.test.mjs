import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { evidenceEntries, gitBlobSha, verifyBrowserResult, verifyNodeVersion } from './verify-linux-ci-evidence.mjs';

// Synthetic unit fixtures test parsing and rejection, never actual CI provenance.
const result = () => ({
  status: 'passed', platform: 'linux', engine: 'chromium', version: '140.0.7339.0',
  assertions: 137, errors: [], violations: [], prefix: '/agentic-process-safety/',
  screenshots: ['overview', 'hazop', 'governance', 'simulator', 'assurance', 'mobile-light', 'mobile-dark'].map(n => `docs/screenshots/${n}.jpg`),
});
test('accepts a correctly formatted complete browser result', () => verifyBrowserResult(result(), 137));
test('accepts actual Node 22 version format', () => verifyNodeVersion('v22.23.2'));
test('rejects other Node major and literal backslash escape', () => {
  for (const version of ['v20.23.2', 'v220.1.0', 'v22\\.23.2']) assert.throws(() => verifyNodeVersion(version));
});
test('splits real ZIP listing newlines and preserves duplicate evidence entries', () => {
  const paths = ['.harness/ci-qa/identity.json', '.harness/ci-qa/browser-result.json', ...result().screenshots];
  assert.deepEqual(evidenceEntries(Buffer.from(`.harness/\n${paths.join('\n')}\n`)), paths);
  assert.deepEqual(evidenceEntries(Buffer.from(`${paths[0]}\n${paths[0]}\n`)), [paths[0], paths[0]]);
});
test('Git blob header uses byte length and NUL exactly as Git does', () => {
  for (const content of [Buffer.alloc(0), Buffer.from('source\n'), Buffer.from('λ\0bytes\n')]) {
    const expected = execFileSync('git', ['hash-object', '--stdin'], { input: content, encoding: 'utf8' }).trim();
    assert.equal(gitBlobSha(content), expected);
  }
});
for (const [name, patch] of Object.entries({
  failed: { status: 'failed' }, macOS: { platform: 'darwin' }, firefox: { engine: 'firefox' },
  version: { version: '' }, escapedVersion: { version: '140\\.0\\.7339\\.0' },
  malformedVersion: { version: '140x0x7339x0' }, partial: { assertions: 136 }, fractional: { assertions: 137.5 },
  console: { errors: ['console error'] }, network: { violations: ['external request'] },
  basePath: { prefix: '/' }, missingCaptures: { screenshots: [] },
})) test(`rejects ${name} browser evidence`, () => assert.throws(() => verifyBrowserResult({ ...result(), ...patch }, 137)));
test('rejects differing reviewed assertion count', () => assert.throws(() => verifyBrowserResult(result(), 139)));
test('rejects absent result', () => assert.throws(() => verifyBrowserResult(undefined, 137)));
