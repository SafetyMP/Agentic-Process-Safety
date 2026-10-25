// Synthetic fixtures exercise rejection logic. No test creates genuine CI/review provenance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { BOUNDS, PINS, WORKFLOW, REPOSITORY, CAPTURES, hash, blob, strictJSON, readArchive, verifyPredeploy, crc32 } from './verify-linux-predeploy-evidence.mjs';

const root = new URL('../', import.meta.url);
const content = new Map(await Promise.all(Object.entries(PINS).map(async ([path, expected]) => {
  const bytes = await readFile(new URL(path, root)); assert.equal(hash(bytes), expected, `Production policy pin: ${path}`); return [path, bytes];
})));
// An independent test ZIP producer, with explicit central/local fields for hostile cases.
function zip(entries, options = {}) {
  const local = []; const central = []; let offset = 0;
  for (const [name, bytes] of entries) {
    const filename = Buffer.from(name); const compressed = options.store ? bytes : deflateRawSync(bytes); const method = options.store ? 0 : 8;
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(method, 8); header.writeUInt32LE(crc32(bytes), 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, compressed);
    const row = Buffer.alloc(46); row.writeUInt32LE(0x02014b50); row.writeUInt16LE(0x314, 4); row.writeUInt16LE(20, 6); row.writeUInt16LE(method, 10); row.writeUInt32LE(crc32(bytes), 16); row.writeUInt32LE(compressed.length, 20); row.writeUInt32LE(options.size ?? bytes.length, 24); row.writeUInt16LE(filename.length, 28); row.writeUInt32LE(((options.mode ?? 0x81a4) * 65536) >>> 0, 38); row.writeUInt32LE(offset, 42);
    central.push(row, filename); offset += header.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
const json = value => Buffer.from(JSON.stringify(value));
const sha = letter => letter.repeat(40);
const checkout = sha('a'); const head = sha('b'); const base = sha('c'); const tree = sha('d');
const workflowBlob = blob(content.get(WORKFLOW));
const workflowRef = `SafetyMP/Agentic-Process-Safety/${WORKFLOW}@refs/pull/73/merge`;
const repo = () => ({ id: 1430231911, full_name: 'SafetyMP/Agentic-Process-Safety', fork: false, visibility: 'public' });
function fixture() {
  const source = [...content].map(([path, bytes]) => ({ path, mode: '100644', blob: blob(bytes), sha256: hash(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  const distBytes = Buffer.from('<!doctype html><title>Synthetic build fixture</title>');
  const dist = [{ path: 'apps/aps-demo/dist/index.html', sha256: hash(distBytes) }];
  const sourceDigest = hash(JSON.stringify(source)); const distDigest = hash(JSON.stringify(dist));
  const runId = 123; const runAttempt = 2; const artifactId = 456;
  const runUrl = 'https://github.com/SafetyMP/Agentic-Process-Safety/actions/runs/123/attempts/2';
  const browser = { status: 'passed', platform: 'linux', engine: 'chromium', version: '140.0.7339.0', assertions: 180, errors: [], violations: [], prefix: '/agentic-process-safety/', screenshots: [...CAPTURES] };
  const images = new Map(CAPTURES.map((path, i) => [path, Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(1100, i), Buffer.from([0xff, 0xd9])])]));
  const review = {
    schema: 'aps-linux-predeploy-review-1', repository: REPOSITORY, repositoryId: 1430231911, pullRequest: 73,
    headSha: head, baseSha: base, checkoutSha: checkout, checkoutTree: tree, workflowSha: checkout, workflowBlob, workflowRef,
    runId, runAttempt, artifactId, runUrl, reviewer: 'Synthetic unit reviewer', reviewedAt: '2026-10-25T20:00:00Z', limitations: 'Synthetic unit fixture; no browser or CI run occurred.', assertions: 180,
    nodeVersion: 'v22.23.2', browserVersion: browser.version, sourceDigest, distDigest,
    screenshots: Object.fromEntries([...images].map(([path, image]) => [path, { sha256: hash(image), accepted: true, observations: `Synthetic fixture ${path}; not a real visual review.` }])),
  };
  const observed = {
    schema: 'aps-predeploy-observation-1', phase: 'finalize', repository: REPOSITORY, repositoryId: 1430231911, event: 'pull_request', ref: 'refs/pull/73/merge',
    pullRequest: { number: 73, head: { repository: REPOSITORY, repositoryId: 1430231911, ref: 'release/aps-github-validation-v1', sha: head }, base: { repository: REPOSITORY, repositoryId: 1430231911, ref: 'main', sha: base } },
    runId, runAttempt, apiRunHeadSha: head, checkoutSha: checkout, checkoutTree: tree, parents: [base, head], workflow: { path: WORKFLOW, ref: workflowRef, sha: checkout, blob: workflowBlob, sha256: PINS[WORKFLOW] },
    platform: 'linux', architecture: 'x64', versions: { node: review.nodeVersion, vite: '8.3.5', playwright: '1.64.1', browser: browser.version }, pins: { ...PINS }, source, sourceDigest, dist, distDigest,
    browserObservation: 'browser-result.json exists; independent verification required',
  };
  const qaSource = source.filter(row => row.path.startsWith('apps/aps-demo/') || ['package.json', 'package-lock.json', 'tsconfig.json', '.github/workflows/deploy-pages.yml'].includes(row.path)).map(({ path, sha256 }) => ({ path, sha256 }));
  const identity = { schema: 'aps-source-bound-qa-1', platform: 'linux', architecture: 'x64', node: review.nodeVersion, commit: checkout, repository: REPOSITORY, workflow: 'Repository checks', workflowRef, runId: '123', runAttempt: '2', sourceDigest: hash(JSON.stringify(qaSource)), distDigest, source: qaSource, dist, browserResult: 'See browser-result.json only if assertions completed; absence means no browser pass.' };
  const steps = ['Bind predeployment QA to built source', 'Record actual PR checkout and workflow identities', 'Install pinned Chromium shell for release PR', 'Test predeployment and postdeployment rejection cases', 'Validate built release PR in Chromium', 'Finalize predeployment observations even after failure', 'Retain predeployment evidence including failed runs'].map(name => ({ name, status: 'completed', conclusion: 'success' }));
  const run = { id: runId, run_attempt: runAttempt, event: 'pull_request', path: WORKFLOW, status: 'completed', conclusion: 'success', head_branch: 'release/aps-github-validation-v1', head_sha: head, repository: repo(), head_repository: repo(), pull_requests: [{ number: 73, head: { sha: head }, base: { sha: base } }], html_url: runUrl, updated_at: '2026-10-25T19:00:00Z' };
  const metadata = new Map([
    ['', repo()], ['/pulls/73', { number: 73, state: 'open', merged: false, head: { ref: 'release/aps-github-validation-v1', sha: head, repo: repo() }, base: { ref: 'main', sha: base, repo: repo() } }],
    ['/git/ref/heads/main', { object: { sha: base } }], ['/git/ref/pull/73/merge', { object: { sha: checkout } }],
    [`/git/commits/${checkout}`, { sha: checkout, tree: { sha: tree }, parents: [{ sha: base }, { sha: head }] }],
    ['/actions/runs/123/attempts/2', run], ['/actions/runs/123', { run_attempt: 2 }],
    ['/actions/runs/123/attempts/2/jobs?per_page=100', { total_count: 2, jobs: [{ name: 'Readiness and frontend', run_id: runId, run_attempt: runAttempt, status: 'completed', conclusion: 'success', labels: ['ubuntu-latest'], steps }, { name: 'Python engine', run_id: runId, run_attempt: runAttempt, status: 'completed', conclusion: 'success', labels: ['ubuntu-24.04'], steps: [{ status: 'completed', conclusion: 'success' }] }] }],
    ['/actions/artifacts/456', { id: artifactId, expired: false, name: `aps-predeploy-${checkout}-123-2`, workflow_run: { id: runId, repository_id: 1430231911, head_repository_id: 1430231911, head_sha: head }, digest: '' }],
    [`/contents/${WORKFLOW}?ref=${checkout}`, { type: 'file', encoding: 'base64', sha: workflowBlob, content: content.get(WORKFLOW).toString('base64') }],
    [`/git/trees/${tree}?recursive=1`, { sha: tree, truncated: false, tree: source.map(row => ({ path: row.path, mode: row.mode, type: 'blob', sha: row.blob })) }],
    ...[...content].map(([, bytes]) => [`/git/blobs/${blob(bytes)}`, { sha: blob(bytes), encoding: 'base64', size: bytes.length, content: bytes.toString('base64') }]),
  ]);
  const extra = []; const omit = new Set();
  const build = () => {
    const files = new Map([['.harness/ci-qa/validation.json', json(observed)], ['.harness/ci-qa/identity.json', json(identity)], ['.harness/ci-qa/browser-result.json', json(browser)], ...images, [dist[0].path, distBytes], ...extra]);
    for (const key of omit) files.delete(key);
    const archive = zip([...files]); metadata.get('/actions/artifacts/456').digest = `sha256:${hash(archive)}`;
    return { review, archive, api: async path => { assert.ok(metadata.has(path), `Unexpected API request ${path}`); return metadata.get(path); }, now: Date.parse('2026-10-25T21:00:00Z') };
  };
  return { review, observed, identity, browser, images, metadata, extra, omit, build };
}
test('accepts only a complete synthetic PR evidence chain, disclosing no deployment', async () => {
  assert.match(await verifyPredeploy(fixture().build()), /^Predeployment validation only; no deployment attested\./);
});
test('API run head may be the independently bound merge rather than PR head', async () => {
  const f = fixture(); f.metadata.get('/actions/runs/123/attempts/2').head_sha = checkout; f.observed.apiRunHeadSha = checkout; f.metadata.get('/actions/artifacts/456').workflow_run.head_sha = checkout;
  await verifyPredeploy(f.build());
});
const mutations = {
  'postdeployment schema': f => { f.review.schema = 'aps-linux-ci-review-1'; },
  'unknown review field': f => { f.review.accepted = true; },
  'unknown companion field': f => { f.observed.accepted = true; },
  'wrong repository': f => { f.metadata.get('').id++; },
  'fork PR': f => { f.metadata.get('/pulls/73').head.repo.fork = true; },
  'wrong head ref': f => { f.metadata.get('/pulls/73').head.ref = 'other'; },
  'changed PR head': f => { f.metadata.get('/pulls/73').head.sha = sha('e'); },
  'changed main': f => { f.metadata.get('/git/ref/heads/main').object.sha = sha('e'); },
  'stale merge ref': f => { f.metadata.get('/git/ref/pull/73/merge').object.sha = sha('e'); },
  'wrong merge parents': f => { f.metadata.get(`/git/commits/${checkout}`).parents.reverse(); },
  'wrong workflow': f => { f.metadata.get('/actions/runs/123/attempts/2').path = '.github/workflows/deploy-pages.yml'; },
  'wrong event': f => { f.metadata.get('/actions/runs/123/attempts/2').event = 'push'; },
  'failed run': f => { f.metadata.get('/actions/runs/123/attempts/2').conclusion = 'failure'; },
  'unrelated run head': f => { f.metadata.get('/actions/runs/123/attempts/2').head_sha = sha('e'); },
  'run PR mismatch': f => { f.metadata.get('/actions/runs/123/attempts/2').pull_requests[0].head.sha = sha('e'); },
  'stale attempt': f => { f.metadata.get('/actions/runs/123').run_attempt++; },
  'premature review': f => { f.review.reviewedAt = '2026-10-25T18:00:00Z'; },
  'missing Python job': f => { f.metadata.get('/actions/runs/123/attempts/2/jobs?per_page=100').jobs.pop(); },
  'changed Linux runner': f => { f.metadata.get('/actions/runs/123/attempts/2/jobs?per_page=100').jobs[0].labels = ['self-hosted']; },
  'skipped step': f => { f.metadata.get('/actions/runs/123/attempts/2/jobs?per_page=100').jobs[0].steps[0].conclusion = 'skipped'; },
  'missing browser step': f => { f.metadata.get('/actions/runs/123/attempts/2/jobs?per_page=100').jobs[0].steps.splice(3, 1); },
  'expired artifact': f => { f.metadata.get('/actions/artifacts/456').expired = true; },
  'wrong artifact identity': f => { f.metadata.get('/actions/artifacts/456').workflow_run.head_repository_id++; },
  'prepared-only observation': f => { f.observed.phase = 'prepare'; },
  'unrelated workflow definition': f => { f.observed.workflow.sha = sha('e'); },
  'head-only workflow substitution even when its file bytes match': f => { f.review.workflowSha = f.observed.workflow.sha = head; },
  'changed workflow bytes': f => { f.metadata.get(`/contents/${WORKFLOW}?ref=${checkout}`).content = Buffer.from('changed').toString('base64'); },
  'changed source mode': f => { f.metadata.get(`/git/trees/${tree}?recursive=1`).tree[0].mode = '120000'; },
  'truncated source': f => { f.metadata.get(`/git/trees/${tree}?recursive=1`).truncated = true; },
  'missing source': f => { f.metadata.get(`/git/trees/${tree}?recursive=1`).tree.pop(); },
  'changed lock source': f => { f.metadata.get(`/git/blobs/${blob(content.get('package-lock.json'))}`).content = Buffer.from('changed').toString('base64'); },
  'changed source digest': f => { f.review.sourceDigest = '0'.repeat(64); },
  'changed dist digest': f => { f.review.distDigest = '0'.repeat(64); },
  'wrong Node major': f => { f.review.nodeVersion = 'v24.1.0'; },
  'unknown Vite version': f => { f.observed.versions.vite = 'latest'; },
  'unknown Playwright version': f => { f.observed.versions.playwright = 'latest'; },
  'changed runner pin': f => { f.observed.pins['apps/aps-demo/scripts/e2e.mjs'] = '0'.repeat(64); },
  'partial browser count': f => { f.browser.assertions--; },
  'forged low reviewed count': f => { f.review.assertions = f.browser.assertions = 136; },
  'browser failure': f => { f.browser.status = 'failed'; },
  'wrong browser platform': f => { f.browser.platform = 'darwin'; },
  'network violation': f => { f.browser.violations = ['external request']; },
  'console error': f => { f.browser.errors = ['error']; },
  'root preview instead of Pages path': f => { f.browser.prefix = '/'; },
  'missing browser result': f => { f.omit.add('.harness/ci-qa/browser-result.json'); },
  'missing dist': f => { f.omit.add('apps/aps-demo/dist/index.html'); },
  'extra archive file': f => { f.extra.push(['unexpected.txt', Buffer.from('data')]); },
  'missing screenshot': f => { f.omit.add(CAPTURES[0]); },
  'forged screenshot hash': f => { f.review.screenshots[CAPTURES[0]].sha256 = '0'.repeat(64); },
  'unresolved visual review': f => { f.review.screenshots[CAPTURES[0]].accepted = false; },
  'empty visual observations': f => { f.review.screenshots[CAPTURES[0]].observations = ''; },
  'duplicated images even with matching review hashes': f => { f.images.set(CAPTURES[1], f.images.get(CAPTURES[0])); f.review.screenshots[CAPTURES[1]].sha256 = f.review.screenshots[CAPTURES[0]].sha256; },
};
for (const [name, mutate] of Object.entries(mutations)) test(`rejects ${name}`, async () => { const f = fixture(); mutate(f); await assert.rejects(verifyPredeploy(f.build())); });
test('rejects unauthenticated/unavailable metadata', async () => { const input = fixture().build(); input.api = async () => { throw new Error('Permission missing'); }; await assert.rejects(verifyPredeploy(input), /Permission missing/); });
test('rejects archive differing from authenticated digest', async () => { const input = fixture().build(); input.archive = Buffer.from(input.archive); input.archive[0] ^= 1; await assert.rejects(verifyPredeploy(input), /archive digest/); });
for (const input of ['{"a":1,"a":2}', '{"outer":{"a":1,"a":2}}', '{"__proto__":{}}', '{} trailing', '{"a":NaN}', '['.repeat(22) + ']'.repeat(22)]) test(`rejects malformed/duplicate JSON ${input.slice(0, 30)}`, () => assert.throws(() => strictJSON(Buffer.from(input))));
test('JSON byte cap rejects cap+1 without parsing', () => assert.throws(() => strictJSON(Buffer.alloc(BOUNDS.json + 1, 32)), /byte bound/));
test('JSON exact byte cap is accepted when otherwise valid', () => assert.deepEqual(strictJSON(Buffer.from('{}' + ' '.repeat(BOUNDS.json - 2))), {}));
test('ZIP byte cap rejects cap+1', () => assert.throws(() => readArchive(Buffer.alloc(BOUNDS.archive + 1)), /byte bound/));
for (const name of ['../outside', '/absolute', 'C:/absolute', 'a\\b', 'a//b', 'a/./b', 'a/%2e%2e/b']) test(`rejects hostile ZIP path ${name}`, () => assert.throws(() => readArchive(zip([[name, Buffer.from('x')]]))));
test('rejects duplicate ZIP names', () => assert.throws(() => readArchive(zip([['a', Buffer.from('x')], ['a', Buffer.from('y')]])), /Duplicate/));
test('rejects symlink ZIP mode', () => assert.throws(() => readArchive(zip([['link', Buffer.from('target')]], { mode: 0xa1ff })), /Symlink/));
test('rejects claimed expanded entry above cap before inflate', () => assert.throws(() => readArchive(zip([['a', Buffer.from('x')]], { size: BOUNDS.entry + 1 })), /Expanded/));
test('ZIP entry count cap rejects cap+1', () => assert.throws(() => readArchive(zip(Array.from({ length: BOUNDS.entries + 1 }, (_, i) => [`a${i}`, Buffer.alloc(0)]))), /entry bound/));
test('ZIP exact entry count cap is accepted', () => assert.equal(readArchive(zip(Array.from({ length: BOUNDS.entries }, (_, i) => [`a${i}`, Buffer.alloc(0)]))).size, BOUNDS.entries));
test('stored and deflated entries are read as bytes without extraction', () => { for (const store of [false, true]) assert.deepEqual(readArchive(zip([['a', Buffer.from('fixture')]], { store })).get('a'), Buffer.from('fixture')); });
test('rejects local/central filename mismatch and corrupted CRC', () => {
  const bytes = zip([['a', Buffer.from('fixture')]], { store: true }); const wrongName = Buffer.from(bytes); wrongName[30] = 98; assert.throws(() => readArchive(wrongName));
  const wrongBytes = Buffer.from(bytes); wrongBytes[31] ^= 1; assert.throws(() => readArchive(wrongBytes), /CRC/);
});
