// Read-only acceptance gate. A review record alone can never establish CI success.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const repository = 'safetymp/agentic-process-safety';
const workflow = '.github/workflows/deploy-pages.yml';
const pins = {
  'apps/aps-demo/scripts/e2e.mjs': '995502d5984fc3e40debdfcea32d210c12256400593f209348e8da1978fb3101',
  'apps/aps-demo/scripts/qa-evidence.mjs': '859c2a56553c93ad0f6a1e874ced2bfa51dbc1f7a9ec97ba15ba236783f01926',
  [workflow]: '8a0a0126bfeba484e1b086cf8faecf872847c05146224bc237a1a331c4330e27',
};
const captures = ['overview', 'hazop', 'governance', 'simulator', 'assurance', 'mobile-light', 'mobile-dark'].map(n => `docs/screenshots/${n}.jpg`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (a, b, label) => assert.deepEqual(a, b, label);
const nonempty = s => typeof s === 'string' && s.trim().length >= 12;
// Candidate only: fold ASCII owner/repository segments, never workflow paths or refs.
export function githubRepository(value) {
  assert.match(value, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Repository segments');
  return value.toLowerCase();
}
export function githubWorkflowRef(value) {
  assert.equal(typeof value, 'string', 'Workflow ref string');
  const match = /^([^/]+\/[^/]+)(\/.*)$/.exec(value);
  assert.ok(match, 'Workflow ref segments');
  return githubRepository(match[1]) + match[2];
}
export function verifyRepositoryId(value) {
  equal(value, 1430231911, 'Repository ID');
}
export function evidenceEntries(listing) {
  return listing.toString().trim().split('\n').filter(p => !p.endsWith('/'));
}
export function gitBlobSha(content) {
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}
export function verifyNodeVersion(version) {
  assert.match(version, /^v22\./, 'Reviewed Node version');
}
export function verifyBrowserResult(result, reviewedAssertions) {
  equal(result.status, 'passed', 'Browser assertions incomplete'); equal(result.engine, 'chromium', 'Chromium required');
  equal(result.platform, 'linux', 'Linux browser');
  assert.match(result.version, /^\d+\.\d+\.\d+\.\d+$/, 'Actual Chromium version');
  assert.ok(Number.isInteger(result.assertions) && result.assertions >= 137, 'Partial assertion count');
  equal(reviewedAssertions, result.assertions, 'Reviewed assertion count');
  equal(result.errors, [], 'Console/page errors'); equal(result.violations, [], 'Network violations');
  equal(result.prefix, '/agentic-process-safety/', 'Pages base path'); equal(result.screenshots, captures, 'Seven capture calls');
}
function api(path) {
  try {
    return JSON.parse(execFileSync('gh', ['api', `repos/${repository}${path}`], {
      encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch { throw new Error('GitHub metadata unavailable; authenticated repository/run/artifact access is required'); }
}
async function inventory(path) {
  const rows = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'playwright-report', 'test-results'].includes(entry.name)) continue;
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) rows.push(...await inventory(child));
    else { assert.ok(entry.isFile(), `Unexpected source entry: ${child}`); rows.push({ path: child, sha256: hash(await readFile(child)) }); }
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
async function verify() {
  for (const [path, digest] of Object.entries(pins)) equal(hash(await readFile(path)), digest, `Reviewed runner/workflow changed: ${path}`);
  const review = JSON.parse(await readFile('.harness/linux-ci-review.json', 'utf8'));
  equal(review.schema, 'aps-linux-ci-review-1', 'Review schema');
  equal(githubRepository(review.repository), repository, 'Reviewed repository');
  assert.match(review.commit, /^[a-f0-9]{40}$/, 'Reviewed commit');
  for (const key of ['runId', 'runAttempt', 'artifactId']) assert.match(String(review[key]), /^[1-9][0-9]*$/, key);
  equal(githubWorkflowRef(review.workflowRef), `${repository}/${workflow}@refs/heads/main`, 'Reviewed workflow ref');
  assert.ok(nonempty(review.reviewer) && nonempty(review.limitations), 'Actual reviewer and limitations required');
  equal(Object.keys(review.screenshots).sort(), [...captures].sort(), 'All seven visual reviews required');
  const repo = api(''); verifyRepositoryId(repo.id); equal(repo.visibility, 'public', 'Only reviewed public target permitted');
  const run = api(`/actions/runs/${review.runId}/attempts/${review.runAttempt}`);
  equal(run.head_sha, review.commit, 'Run commit'); equal(run.head_branch, 'main', 'Reviewed branch');
  equal(run.path, workflow, 'Run workflow');
  equal(run.repository.full_name.toLowerCase(), repository, 'Run repository');
  equal(run.head_repository.full_name.toLowerCase(), repository, 'No fork substitution');
  equal(run.run_attempt, Number(review.runAttempt), 'Run attempt');
  equal(run.status, 'completed', 'Run must complete'); equal(run.conclusion, 'success', 'Run must succeed');
  equal(api(`/actions/runs/${review.runId}`).run_attempt, Number(review.runAttempt), 'Superseded run attempt');
  equal(review.runUrl, run.html_url, 'Reviewed run URL');
  assert.ok(Date.parse(review.reviewedAt) >= Date.parse(run.updated_at) && Date.parse(review.reviewedAt) <= Date.now(), 'Visual review must follow completed run');
  const jobs = api(`/actions/runs/${review.runId}/attempts/${review.runAttempt}/jobs?per_page=100`);
  equal(jobs.jobs.length, jobs.total_count, 'Partial job listing');
  for (const name of ['build', 'deploy']) {
    const job = jobs.jobs.find(j => j.name === name); assert.ok(job, `Missing ${name} job`);
    equal(job.conclusion, 'success', `${name} must pass`);
    assert.ok(job.labels.includes('ubuntu-latest'), `${name} requires reviewed Linux runner`);
    assert.ok(job.steps.length > 0 && job.steps.every(s => s.status === 'completed' && s.conclusion === 'success'), `Incomplete/skipped/failed ${name} steps`);
  }
  const artifact = api(`/actions/artifacts/${review.artifactId}`);
  equal(artifact.name, `aps-browser-qa-${review.commit}-${review.runAttempt}`, 'Artifact name');
  equal(artifact.workflow_run.id, Number(review.runId), 'Artifact run');
  equal(artifact.workflow_run.head_sha, review.commit, 'Artifact commit'); equal(artifact.expired, false, 'Expired artifact');
  assert.match(artifact.digest ?? '', /^sha256:[a-f0-9]{64}$/, 'GitHub artifact digest required');
  const archive = resolve('.harness/linux-ci-evidence.zip');
  equal(`sha256:${hash(await readFile(archive))}`, artifact.digest, 'Archive must match GitHub authenticated artifact digest');
  const zip = args => execFileSync('unzip', args, { maxBuffer: 32 * 1024 * 1024, timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
  const entries = evidenceEntries(zip(['-Z1', archive]));
  equal(entries.sort(), ['.harness/ci-qa/identity.json', '.harness/ci-qa/browser-result.json', ...captures].sort(), 'Missing, duplicate or unexpected evidence files');
  const bytes = path => zip(['-p', archive, path]);
  const identity = JSON.parse(bytes('.harness/ci-qa/identity.json'));
  const result = JSON.parse(bytes('.harness/ci-qa/browser-result.json'));
  equal(identity.schema, 'aps-source-bound-qa-1', 'Identity schema');
  equal(identity.platform, 'linux', 'Linux identity'); equal(result.platform, 'linux', 'Linux browser');
  equal(identity.commit, review.commit, 'Identity commit'); equal(githubRepository(identity.repository), repository, 'Identity repository');
  equal(githubWorkflowRef(identity.workflowRef), githubWorkflowRef(review.workflowRef), 'Identity workflow ref');
  equal(identity.workflow, 'Validate and deploy static APS demo', 'Workflow name');
  equal(identity.runId, String(review.runId), 'Identity run'); equal(identity.runAttempt, String(review.runAttempt), 'Identity attempt');
  verifyNodeVersion(identity.node);
  const source = await inventory('apps/aps-demo');
  for (const path of ['package.json', 'package-lock.json', 'tsconfig.json', workflow]) source.push({ path, sha256: hash(await readFile(path)) });
  source.sort((a, b) => a.path.localeCompare(b.path));
  const dist = await inventory('apps/aps-demo/dist'); assert.ok(dist.length > 0, 'Built dist required');
  equal(identity.source, source, 'Stale or incomplete source'); equal(identity.dist, dist, 'Stale or incomplete dist');
  for (const [key, rows] of [['sourceDigest', source], ['distDigest', dist]]) {
    equal(identity[key], hash(JSON.stringify(rows)), key); equal(review[key], identity[key], `Reviewed ${key}`);
  }
  // Check source against actual GitHub commit objects, not just manifest claims.
  const tree = api(`/git/trees/${review.commit}?recursive=1`); equal(tree.truncated, false, 'Partial source tree');
  for (const row of source) {
    const entry = tree.tree.find(item => item.path === row.path); const content = await readFile(row.path);
    const blob = gitBlobSha(content);
    assert.ok(entry && entry.type === 'blob' && entry.mode === '100644' && entry.sha === blob, `Source differs from reviewed commit: ${row.path}`);
  }
  // Pinned runner writes success only after all assertions, malformed links and overflow checks.
  verifyBrowserResult(result, review.assertions);
  const imageHashes = new Set();
  for (const path of captures) {
    const content = bytes(path); const digest = hash(content); imageHashes.add(digest);
    assert.ok(content.length > 1000 && content[0] === 0xff && content[1] === 0xd8 && content.at(-2) === 0xff && content.at(-1) === 0xd9, `Invalid JPEG: ${path}`);
    const inspected = review.screenshots[path]; equal(inspected.sha256, digest, `Visual review bytes: ${path}`);
    equal(inspected.accepted, true, `Unresolved visual defects: ${path}`);
    assert.ok(nonempty(inspected.observations), `Actual visual observations required: ${path}`);
  }
  equal(imageHashes.size, 7, 'Duplicated captures');
  console.log(`Linux CI evidence verified: ${run.html_url}; commit ${review.commit}; seven reviewed captures. Limitations: ${review.limitations}`);
}
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try { await verify(); } catch (error) {
    console.error(`Linux CI evidence REJECTED: ${error.code === 'ENOENT' ? `Missing required local evidence: ${error.path}` : error.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}
