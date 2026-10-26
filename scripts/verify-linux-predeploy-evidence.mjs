// Read-only PR acceptance gate. Does not deploy or accept postdeployment evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BOUNDS = Object.freeze({ archive: 64 * 1024 * 1024, expanded: 128 * 1024 * 1024, entry: 16 * 1024 * 1024, entries: 512, json: 2 * 1024 * 1024, source: 1000, dist: 128, depth: 20, nodes: 20000 });
export const REPOSITORY = 'safetymp/agentic-process-safety';
export const WORKFLOW = '.github/workflows/repository-checks.yml';
export const CAPTURES = Object.freeze(['overview', 'hazop', 'governance', 'simulator', 'assurance', 'mobile-light', 'mobile-dark'].map(n => `docs/screenshots/${n}.jpg`));
// These expectations are reviewed source policy, never supplied by an artifact.
export const PINS = Object.freeze({
  [WORKFLOW]: '5ff6795229ce590cac3cc5b647fb6e978f9a0df6a6f934d41a8165deb329b7ee',
  '.github/workflows/deploy-pages.yml': '8a0a0126bfeba484e1b086cf8faecf872847c05146224bc237a1a331c4330e27',
  'apps/aps-demo/scripts/e2e.mjs': 'f8dd3504979c460754538e9e7bd20b4305a6a67e4baf3466b830e25c19cac6c7',
  'apps/aps-demo/scripts/qa-evidence.mjs': '859c2a56553c93ad0f6a1e874ced2bfa51dbc1f7a9ec97ba15ba236783f01926',
  'apps/aps-demo/scripts/validation-evidence.mjs': '9ef9428f9901d9286716a77cb377f418194365e4b8986b7d7fd3fb38f97d7186',
  'package-lock.json': '6350fea042ab97510b73aa1969e2469731753b5f95814caafa7f8d0ecbe7d303',
});
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const equal = (a, b, label) => assert.deepEqual(a, b, label);
const sha = value => assert.match(value, /^[a-f0-9]{40}$/);
const digest = value => assert.match(value, /^[a-f0-9]{64}$/);
const positive = value => assert.ok(Number.isSafeInteger(value) && value > 0);
const text = value => assert.ok(typeof value === 'string' && value.trim().length >= 12 && value.length <= 4096);
const repo = value => { assert.match(value, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/); return value.toLowerCase(); };
const keys = (value, expected, label) => { assert.ok(value && typeof value === 'object' && !Array.isArray(value), label); equal(Object.keys(value).sort(), [...expected].sort(), label); };
export function pathCheck(path, directory = false) {
  assert.ok(typeof path === 'string' && path.length > 0 && path.length <= 240 && /^[\x20-\x7e]+$/.test(path) && !path.includes('\\') && !path.includes(':') && !path.includes('%'), 'Archive/inventory path');
  const parts = (directory && path.endsWith('/') ? path.slice(0, -1) : path).split('/');
  assert.ok(parts.every(p => p && p !== '.' && p !== '..'), 'Absolute/traversing/empty path');
}
// Scan before JSON.parse so duplicate keys cannot silently override reviewed values.
export function strictJSON(bytes) {
  assert.ok(bytes.length <= BOUNDS.json, 'JSON byte bound');
  const input = bytes.toString('utf8'); assert.equal(Buffer.from(input).compare(Buffer.from(bytes)), 0, 'UTF-8 JSON required');
  let i = 0; let nodes = 0;
  const ws = () => { while (/[\t\n\r ]/.test(input[i] ?? 'x')) i++; };
  function string() {
    const start = i++; assert.equal(input[start], '"');
    while (i < input.length) { const c = input[i++]; if (c === '\\') i++; else if (c === '"') return JSON.parse(input.slice(start, i)); }
    throw new Error('Unterminated JSON string');
  }
  function value(depth) {
    assert.ok(depth <= BOUNDS.depth && ++nodes <= BOUNDS.nodes, 'JSON structural bound'); ws();
    if (input[i] === '{') {
      i++; ws(); const seen = new Set();
      if (input[i] === '}') { i++; return; }
      while (i < input.length) {
        const key = string(); assert.ok(!seen.has(key) && !['__proto__', 'prototype', 'constructor'].includes(key), 'Duplicate/unsafe JSON key'); seen.add(key); ws(); assert.equal(input[i++], ':'); value(depth + 1); ws();
        const c = input[i++]; if (c === '}') return; assert.equal(c, ','); ws();
      }
      throw new Error('Unterminated object');
    }
    if (input[i] === '[') {
      i++; ws(); if (input[i] === ']') { i++; return; }
      while (i < input.length) { value(depth + 1); ws(); const c = input[i++]; if (c === ']') return; assert.equal(c, ','); }
      throw new Error('Unterminated array');
    }
    if (input[i] === '"') { string(); return; }
    const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(input.slice(i)); assert.ok(match, 'Invalid JSON value'); i += match[0].length;
  }
  value(0); ws(); assert.equal(i, input.length, 'Trailing JSON data'); return JSON.parse(input);
}
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
// Bounded, nonextracting ZIP reader: no artifact paths reach the filesystem.
export function readArchive(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 22 && bytes.length <= BOUNDS.archive, 'Archive byte bound');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
  assert.ok(end >= 0, 'ZIP end missing');
  equal(bytes.readUInt16LE(end + 4), 0); equal(bytes.readUInt16LE(end + 6), 0);
  const count = bytes.readUInt16LE(end + 10); equal(bytes.readUInt16LE(end + 8), count);
  assert.ok(count > 0 && count <= BOUNDS.entries, 'ZIP entry bound');
  let cursor = bytes.readUInt32LE(end + 16); const centralStart = cursor;
  equal(cursor + bytes.readUInt32LE(end + 12), end, 'ZIP central directory bound');
  const files = new Map(); const directories = []; const seen = new Set(); const intervals = []; let expanded = 0;
  for (let n = 0; n < count; n++) {
    assert.ok(cursor + 46 <= end); equal(bytes.readUInt32LE(cursor), 0x02014b50);
    const flags = bytes.readUInt16LE(cursor + 8); const method = bytes.readUInt16LE(cursor + 10);
    assert.ok((flags & ~0x808) === 0 && [0, 8].includes(method), 'Encrypted/unsupported ZIP');
    const crc = bytes.readUInt32LE(cursor + 16); const compressed = bytes.readUInt32LE(cursor + 20); const size = bytes.readUInt32LE(cursor + 24);
    const length = bytes.readUInt16LE(cursor + 28); const extra = bytes.readUInt16LE(cursor + 30); const comment = bytes.readUInt16LE(cursor + 32);
    equal(bytes.readUInt16LE(cursor + 34), 0); assert.ok(cursor + 46 + length + extra + comment <= end);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + length); const name = nameBytes.toString('utf8'); equal(Buffer.from(name), nameBytes);
    const directory = name.endsWith('/'); pathCheck(name, directory);
    const canonical = directory ? name.slice(0, -1) : name; assert.ok(!seen.has(canonical), 'Duplicate ZIP entry'); seen.add(canonical);
    const mode = bytes.readUInt32LE(cursor + 38) >>> 16; const type = mode & 0xf000;
    assert.ok(type === 0 || type === (directory ? 0x4000 : 0x8000), 'Symlink/nonregular ZIP entry');
    assert.ok(size <= BOUNDS.entry && (expanded += size) <= BOUNDS.expanded, 'Expanded ZIP byte bound');
    const local = bytes.readUInt32LE(cursor + 42); assert.ok(local + 30 <= centralStart); equal(bytes.readUInt32LE(local), 0x04034b50);
    equal(bytes.readUInt16LE(local + 6), flags); equal(bytes.readUInt16LE(local + 8), method);
    const localName = bytes.readUInt16LE(local + 26); const localExtra = bytes.readUInt16LE(local + 28); const start = local + 30 + localName + localExtra;
    equal(bytes.subarray(local + 30, local + 30 + localName), nameBytes, 'Local ZIP path mismatch'); assert.ok(start + compressed <= centralStart);
    if (!(flags & 8)) { equal(bytes.readUInt32LE(local + 14), crc); equal(bytes.readUInt32LE(local + 18), compressed); equal(bytes.readUInt32LE(local + 22), size); }
    intervals.push([local, start + compressed]);
    const content = method === 0 ? bytes.subarray(start, start + compressed) : inflateRawSync(bytes.subarray(start, start + compressed), { maxOutputLength: BOUNDS.entry });
    equal(content.length, size, 'ZIP size'); equal(crc32(content), crc, 'ZIP CRC');
    if (directory) { equal(size, 0); directories.push(name); } else files.set(name, content);
    cursor += 46 + length + extra + comment;
  }
  equal(cursor, end, 'ZIP central entry count'); intervals.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i++) assert.ok(intervals[i][0] >= intervals[i - 1][1], 'Overlapping ZIP entries');
  for (const path of directories) assert.ok([...files.keys()].some(name => name.startsWith(path)), 'Unexpected empty ZIP directory');
  return files;
}
const reviewFields = ['schema', 'repository', 'repositoryId', 'pullRequest', 'headSha', 'baseSha', 'checkoutSha', 'checkoutTree', 'workflowSha', 'workflowBlob', 'workflowRef', 'runId', 'runAttempt', 'artifactId', 'runUrl', 'reviewer', 'reviewedAt', 'limitations', 'assertions', 'nodeVersion', 'browserVersion', 'sourceDigest', 'distDigest', 'screenshots'];
const observationFields = ['schema', 'phase', 'repository', 'repositoryId', 'event', 'ref', 'pullRequest', 'runId', 'runAttempt', 'apiRunHeadSha', 'checkoutSha', 'checkoutTree', 'parents', 'workflow', 'platform', 'architecture', 'versions', 'pins', 'source', 'sourceDigest', 'dist', 'distDigest', 'browserObservation'];
function scope(value) { equal(repo(value.repository), REPOSITORY); equal(value.repositoryId, 1430231911); }
function inventory(rows, source) {
  assert.ok(Array.isArray(rows) && rows.length > 0 && rows.length <= (source ? BOUNDS.source : BOUNDS.dist), 'Inventory count bound');
  const paths = new Set();
  for (const row of rows) {
    keys(row, source ? ['path', 'mode', 'blob', 'sha256'] : ['path', 'sha256'], 'Inventory fields'); pathCheck(row.path); digest(row.sha256);
    assert.ok(!paths.has(row.path), 'Duplicate inventory path'); paths.add(row.path);
    if (source) { assert.ok(['100644', '100755'].includes(row.mode)); sha(row.blob); }
    else assert.ok(row.path.startsWith('apps/aps-demo/dist/'), 'Unexpected dist path');
  }
  equal(rows.map(row => row.path), [...paths].sort((a, b) => a.localeCompare(b)), 'Inventory ordering');
}
function successfulJob(job, runner) {
  equal(job.status, 'completed'); equal(job.conclusion, 'success');
  assert.ok(Array.isArray(job.labels) && job.labels.every(label => typeof label === 'string') && job.labels.includes(runner), 'Changed Linux runner');
  // Matching Ubuntu labels never override explicit self-hosted job metadata.
  const selfHosted = value => typeof value === 'string' && /(?:^|[^a-z0-9])self[-_\s]*hosted(?:$|[^a-z0-9])/i.test(value);
  assert.ok(![...job.labels, job.runner_name, job.runner_group_name].some(selfHosted), 'Self-hosted runner metadata is outside approved hosted-only scope');
  assert.ok(Array.isArray(job.steps) && job.steps.length > 0 && job.steps.every(step => step.status === 'completed' && step.conclusion === 'success'), 'Failed/skipped/incomplete step');
}
// api must supply authenticated GitHub GETs. The CLI below never accepts artifact policy overrides.
export async function verifyPredeploy({ review, archive, api, now = Date.now() }) {
  keys(review, reviewFields, 'Predeployment review fields'); equal(review.schema, 'aps-linux-predeploy-review-1'); scope(review);
  for (const key of ['headSha', 'baseSha', 'checkoutSha', 'checkoutTree', 'workflowSha', 'workflowBlob']) sha(review[key]);
  for (const key of ['runId', 'runAttempt', 'artifactId', 'pullRequest']) positive(review[key]);
  for (const key of ['sourceDigest', 'distDigest']) digest(review[key]);
  for (const key of ['reviewer', 'limitations']) text(review[key]);
  assert.match(review.nodeVersion, /^v22\.[0-9]+\.[0-9]+$/); assert.match(review.browserVersion, /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/);
  assert.ok(Number.isSafeInteger(review.assertions) && review.assertions >= 137);
  const ref = `refs/pull/${review.pullRequest}/merge`;
  equal(review.workflowRef.toLowerCase().split('/.github/')[0], REPOSITORY);
  equal(review.workflowRef.slice(review.workflowRef.indexOf('/.github/')), `/${WORKFLOW}@${ref}`);
  const repository = await api(''); equal(repository.id, 1430231911); equal(repo(repository.full_name), REPOSITORY); equal(repository.visibility, 'public');
  const pr = await api(`/pulls/${review.pullRequest}`); equal(pr.number, review.pullRequest); equal(pr.state, 'open'); equal(pr.merged, false);
  for (const side of [pr.head, pr.base]) { equal(side.repo.id, 1430231911); equal(repo(side.repo.full_name), REPOSITORY); equal(side.repo.fork, false); }
  equal(pr.head.ref, 'release/aps-github-validation-v1'); equal(pr.base.ref, 'main'); equal(pr.head.sha, review.headSha); equal(pr.base.sha, review.baseSha);
  equal((await api('/git/ref/heads/main')).object.sha, review.baseSha, 'Main changed after tested base');
  equal((await api(`/git/ref/pull/${review.pullRequest}/merge`)).object.sha, review.checkoutSha, 'Stale merge ref');
  const commit = await api(`/git/commits/${review.checkoutSha}`); equal(commit.sha, review.checkoutSha); equal(commit.tree.sha, review.checkoutTree);
  equal(commit.parents.map(parent => parent.sha), [review.baseSha, review.headSha], 'PR merge parents');
  const runPath = `/actions/runs/${review.runId}`;
  const run = await api(`${runPath}/attempts/${review.runAttempt}`);
  equal(run.id, review.runId); equal(run.run_attempt, review.runAttempt); equal(run.event, 'pull_request'); equal(run.path, WORKFLOW);
  equal(run.status, 'completed'); equal(run.conclusion, 'success'); equal(run.head_branch, 'release/aps-github-validation-v1');
  for (const part of [run.repository, run.head_repository]) { equal(part.id, 1430231911); equal(repo(part.full_name), REPOSITORY); }
  assert.ok([review.headSha, review.checkoutSha].includes(run.head_sha), 'API run head must bind actual PR head or merge');
  assert.ok(run.pull_requests.some(p => p.number === review.pullRequest && p.head.sha === review.headSha && p.base.sha === review.baseSha), 'Run PR binding');
  equal((await api(runPath)).run_attempt, review.runAttempt, 'Superseded run attempt'); equal(run.html_url, review.runUrl);
  const reviewedAt = Date.parse(review.reviewedAt); const updatedAt = Date.parse(run.updated_at);
  assert.ok(Number.isFinite(reviewedAt) && Number.isFinite(updatedAt) && reviewedAt >= updatedAt && reviewedAt <= now, 'Review must follow completed run');
  const jobs = await api(`${runPath}/attempts/${review.runAttempt}/jobs?per_page=100`);
  equal(jobs.total_count, 2); equal(jobs.jobs.length, 2); equal(jobs.jobs.map(job => job.name).sort(), ['Python engine', 'Readiness and frontend']);
  for (const job of jobs.jobs) { equal(job.run_id, review.runId); equal(job.run_attempt, review.runAttempt); successfulJob(job, job.name === 'Python engine' ? 'ubuntu-24.04' : 'ubuntu-latest'); }
  const ready = jobs.jobs.find(job => job.name === 'Readiness and frontend');
  for (const name of ['Bind predeployment QA to built source', 'Record actual PR checkout and workflow identities', 'Install pinned Chromium shell for release PR', 'Test predeployment and postdeployment rejection cases', 'Validate built release PR in Chromium', 'Finalize predeployment observations even after failure', 'Retain predeployment evidence including failed runs']) equal(ready.steps.filter(step => step.name === name).length, 1, `Missing browser/evidence step: ${name}`);
  const artifact = await api(`/actions/artifacts/${review.artifactId}`); equal(artifact.id, review.artifactId); equal(artifact.expired, false);
  equal(artifact.name, `aps-predeploy-${review.checkoutSha}-${review.runId}-${review.runAttempt}`);
  equal(artifact.workflow_run.id, review.runId); equal(artifact.workflow_run.repository_id, 1430231911); equal(artifact.workflow_run.head_repository_id, 1430231911); equal(artifact.workflow_run.head_sha, run.head_sha);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/); equal(artifact.digest, `sha256:${hash(archive)}`, 'Authenticated archive digest');
  const files = readArchive(archive);
  const json = path => { assert.ok(files.has(path), `Missing evidence: ${path}`); return strictJSON(files.get(path)); };
  const observed = json('.harness/ci-qa/validation.json'); keys(observed, observationFields, 'Companion fields');
  equal(observed.schema, 'aps-predeploy-observation-1'); equal(observed.phase, 'finalize'); scope(observed); equal(observed.event, 'pull_request'); equal(observed.ref, ref);
  for (const key of ['runId', 'runAttempt', 'checkoutSha', 'checkoutTree', 'sourceDigest', 'distDigest']) equal(observed[key], review[key], key);
  equal(observed.apiRunHeadSha, run.head_sha); equal(observed.parents, [review.baseSha, review.headSha]);
  keys(observed.pullRequest, ['number', 'head', 'base']); equal(observed.pullRequest.number, review.pullRequest);
  for (const [name, expectedRef, expectedSha] of [['head', 'release/aps-github-validation-v1', review.headSha], ['base', 'main', review.baseSha]]) {
    const side = observed.pullRequest[name]; keys(side, ['repository', 'repositoryId', 'ref', 'sha']); scope(side); equal(side.ref, expectedRef); equal(side.sha, expectedSha);
  }
  keys(observed.workflow, ['path', 'ref', 'sha', 'blob', 'sha256']);
  equal(observed.workflow, { path: WORKFLOW, ref: review.workflowRef, sha: review.workflowSha, blob: review.workflowBlob, sha256: PINS[WORKFLOW] });
  // This sole supported route uses GitHub's open-PR merge definition. Resolve that
  // merge and both parents above; do not conflate API run.head_sha with it. Any
  // different workflow-definition context needs review, never an artifact override.
  equal(review.workflowSha, commit.sha, 'Workflow definition must bind authenticated PR merge');
  const definitionCommit = await api(`/git/commits/${review.workflowSha}`); equal(definitionCommit.sha, review.workflowSha);
  const definition = await api(`/contents/${WORKFLOW}?ref=${review.workflowSha}`);
  equal(definition.type, 'file'); equal(definition.encoding, 'base64'); equal(definition.sha, review.workflowBlob);
  const definitionBytes = Buffer.from(definition.content, 'base64'); equal(blob(definitionBytes), review.workflowBlob); equal(hash(definitionBytes), PINS[WORKFLOW], 'Unreviewed workflow definition');
  equal(observed.platform, 'linux'); equal(observed.architecture, 'x64'); keys(observed.versions, ['node', 'vite', 'playwright', 'browser']);
  equal(observed.versions, { node: review.nodeVersion, vite: '8.3.5', playwright: '1.64.1', browser: review.browserVersion });
  keys(observed.pins, Object.keys(PINS)); equal(observed.pins, PINS, 'Changed independently pinned code');
  inventory(observed.source, true); inventory(observed.dist, false);
  equal(hash(JSON.stringify(observed.source)), review.sourceDigest); equal(hash(JSON.stringify(observed.dist)), review.distDigest);
  const tree = await api(`/git/trees/${review.checkoutTree}?recursive=1`); equal(tree.sha, review.checkoutTree); equal(tree.truncated, false);
  const entries = tree.tree.filter(entry => entry.type !== 'tree');
  equal(entries.length, observed.source.length, 'Missing/extra source files');
  for (const row of observed.source) {
    const entry = entries.find(entry => entry.path === row.path); assert.ok(entry && entry.type === 'blob', `Unbound source: ${row.path}`); equal(entry.sha, row.blob); equal(entry.mode, row.mode);
    // Fetch actual source bytes, not executable artifacts, to bind SHA256 as well as Git SHA1/mode.
    const source = await api(`/git/blobs/${entry.sha}`); equal(source.encoding, 'base64'); equal(source.sha, entry.sha);
    const bytes = Buffer.from(source.content, 'base64'); equal(bytes.length, source.size); assert.ok(bytes.length <= BOUNDS.entry); equal(blob(bytes), row.blob); equal(hash(bytes), row.sha256);
  }
  for (const [path, expected] of Object.entries(PINS)) equal(observed.source.find(row => row.path === path)?.sha256, expected, `Source pin: ${path}`);
  const expectedFiles = ['.harness/ci-qa/identity.json', '.harness/ci-qa/browser-result.json', '.harness/ci-qa/validation.json', ...CAPTURES, ...observed.dist.map(row => row.path)];
  equal([...files.keys()].sort(), expectedFiles.sort(), 'Unexpected/missing archive files');
  for (const row of observed.dist) equal(hash(files.get(row.path)), row.sha256, `Built bytes: ${row.path}`);
  const identity = json('.harness/ci-qa/identity.json');
  keys(identity, ['schema', 'platform', 'architecture', 'node', 'commit', 'repository', 'workflow', 'workflowRef', 'runId', 'runAttempt', 'sourceDigest', 'distDigest', 'source', 'dist', 'browserResult']);
  equal(identity.schema, 'aps-source-bound-qa-1'); equal(identity.platform, 'linux'); equal(identity.architecture, 'x64'); equal(identity.node, review.nodeVersion); equal(identity.commit, review.checkoutSha); equal(repo(identity.repository), REPOSITORY);
  equal(identity.workflow, 'Repository checks'); equal(identity.workflowRef, review.workflowRef); equal(identity.runId, String(review.runId)); equal(identity.runAttempt, String(review.runAttempt));
  const qaSource = observed.source.filter(row => row.path.startsWith('apps/aps-demo/') || ['package.json', 'package-lock.json', 'tsconfig.json', '.github/workflows/deploy-pages.yml'].includes(row.path)).map(({ path, sha256 }) => ({ path, sha256 }));
  equal(identity.source, qaSource); equal(identity.sourceDigest, hash(JSON.stringify(qaSource))); equal(identity.dist, observed.dist); equal(identity.distDigest, review.distDigest);
  equal(identity.browserResult, 'See browser-result.json only if assertions completed; absence means no browser pass.');
  const result = json('.harness/ci-qa/browser-result.json'); keys(result, ['status', 'engine', 'version', 'platform', 'assertions', 'errors', 'violations', 'prefix', 'screenshots']);
  equal(result.status, 'passed'); equal(result.platform, 'linux'); equal(result.engine, 'chromium'); equal(result.version, review.browserVersion); equal(result.assertions, review.assertions);
  equal(result.errors, []); equal(result.violations, []); equal(result.prefix, '/agentic-process-safety/'); equal(result.screenshots, CAPTURES);
  equal(observed.browserObservation, 'browser-result.json exists; independent verification required');
  keys(review.screenshots, CAPTURES); const imageHashes = new Set();
  for (const path of CAPTURES) {
    const image = files.get(path); const reviewed = review.screenshots[path]; keys(reviewed, ['sha256', 'accepted', 'observations']);
    assert.ok(image.length > 1000 && image[0] === 0xff && image[1] === 0xd8 && image.at(-2) === 0xff && image.at(-1) === 0xd9, 'Invalid JPEG');
    equal(reviewed.sha256, hash(image)); equal(reviewed.accepted, true); text(reviewed.observations); imageHashes.add(hash(image));
  }
  equal(imageHashes.size, 7, 'Duplicated captures');
  return `Predeployment validation only; no deployment attested. ${review.runUrl}; actual tested merge ${review.checkoutSha}; head ${review.headSha}; base ${review.baseSha}. Limitations: ${review.limitations}`;
}
function authenticatedApi(path) {
  assert.ok(path === '' || /^\/[A-Za-z0-9_./?=&-]+$/.test(path), 'API path');
  try {
    const bytes = execFileSync('gh', ['api', `repos/${REPOSITORY}${path}`], { timeout: 30000, maxBuffer: BOUNDS.json, stdio: ['ignore', 'pipe', 'pipe'] });
    return strictJSON(bytes);
  } catch { throw new Error('Authenticated GitHub metadata unavailable; no acceptance or permission bypass'); }
}
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 4, 'Usage: node scripts/verify-linux-predeploy-evidence.mjs REVIEW.json EVIDENCE.zip');
    for (const [path, cap] of [[process.argv[2], BOUNDS.json], [process.argv[3], BOUNDS.archive]]) {
      const stat = await lstat(path); assert.ok(stat.isFile() && stat.size <= cap, 'Nonregular/oversized local evidence input');
    }
    const review = strictJSON(await readFile(process.argv[2])); const archive = await readFile(process.argv[3]);
    console.log(await verifyPredeploy({ review, archive, api: authenticatedApi }));
  } catch (error) { console.error(`Predeployment evidence REJECTED: ${error.message.split('\n')[0]}`); process.exitCode = 1; }
}
