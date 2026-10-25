import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
test('postdeployment pin migration accepts only exact reviewed e2e/Pages bytes', () => {
  const source = readFileSync(new URL('./verify-linux-ci-evidence.mjs', import.meta.url), 'utf8');
  const exact = ['8f7fe9cf9c3cfdb2a4e8bb4c89683011f3c9cc5d4f2ba6ece7595b7d6b12bc2a', '8a0a0126bfeba484e1b086cf8faecf872847c05146224bc237a1a331c4330e27', '859c2a56553c93ad0f6a1e874ced2bfa51dbc1f7a9ec97ba15ba236783f01926'];
  const stale = ['6086f2d7c5f8956d11b1cc04777f3ed527b80a2c96b87b728b3d31728bdaace2', '2725d66974b527c775f377dd2a4409bfc47658b6702cbc14b6ec1b5be9db8215'];
  const literalPins = [...source.matchAll(/: '([a-f0-9]{64})'/g)].map(match => match[1]);
  assert.deepEqual(literalPins.sort(), [...exact].sort());
  for (const old of stale) assert.ok(!literalPins.includes(old));
  assert.ok(source.includes("equal(review.schema, 'aps-linux-ci-review-1'"));
  assert.ok(source.includes("for (const name of ['build', 'deploy'])"));
  assert.ok(source.includes("@refs/heads/main"));
  assert.ok(!source.includes('aps-linux-predeploy-review-1'));
});
