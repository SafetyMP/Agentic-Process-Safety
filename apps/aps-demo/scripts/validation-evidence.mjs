// Untrusted CI observations, never a review, pass receipt or deployment attestation.
/* global fetch, AbortSignal, Buffer, process, console */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir, lstat, appendFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repository = 'safetymp/agentic-process-safety';
const workflow = '.github/workflows/repository-checks.yml';
const destination = '.harness/ci-qa/validation.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const sha = value => { assert.match(value, /^[a-f0-9]{40}$/); return value; };
const positive = value => { assert.match(value ?? '', /^[1-9][0-9]*$/); return Number(value); };
const normalize = value => { assert.match(value ?? '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/); return value.toLowerCase(); };
const validPath = path => assert.ok(path.length <= 240 && !path.includes('\\') && !path.split('/').some(p => !p || p === '.' || p === '..'));
async function file(path) {
  validPath(path);
  const stat = await lstat(path); assert.ok(stat.isFile() && stat.size <= 16 * 1024 * 1024, `Nonregular/oversized file: ${path}`);
  return readFile(path);
}
async function api(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'aps-validation-observer' },
    signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  assert.ok(response.ok, 'Public GitHub run/workflow metadata unavailable');
  const text = await response.text(); assert.ok(Buffer.byteLength(text) <= 2 * 1024 * 1024, 'Oversized GitHub metadata');
  return JSON.parse(text);
}
async function distInventory(root = 'apps/aps-demo/dist') {
  const rows = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) rows.push(...await distInventory(path));
    else rows.push({ path, sha256: hash(await file(path)) });
  }
  assert.ok(rows.length <= 128, 'Dist file bound');
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
async function collect(phase) {
  assert.ok(['prepare', 'finalize'].includes(phase), 'Use prepare or finalize');
  const env = process.env;
  assert.equal(normalize(env.GITHUB_REPOSITORY), repository); assert.equal(env.GITHUB_REPOSITORY_ID, '1430231911');
  assert.equal(env.GITHUB_EVENT_NAME, 'pull_request'); assert.equal(env.GITHUB_JOB, 'readiness');
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  const pr = event.pull_request; const number = positive(String(event.number));
  assert.equal(pr.number, number); assert.equal(pr.base.ref, 'main'); assert.equal(pr.head.ref, 'release/aps-github-validation-v1');
  for (const part of [pr.base, pr.head]) {
    assert.equal(normalize(part.repo.full_name), repository); assert.equal(part.repo.id, 1430231911); sha(part.sha);
  }
  assert.equal(env.GITHUB_REF, `refs/pull/${number}/merge`);
  const checkoutSha = sha(git(['rev-parse', 'HEAD'])); assert.equal(sha(env.GITHUB_SHA), checkoutSha);
  const checkoutTree = sha(git(['rev-parse', 'HEAD^{tree}']));
  const parents = git(['cat-file', 'commit', 'HEAD']).split('\n\n')[0].split('\n').filter(line => line.startsWith('parent ')).map(line => sha(line.slice(7)));
  assert.deepEqual(parents, [pr.base.sha, pr.head.sha], 'Actual PR merge parents');
  const runId = positive(env.GITHUB_RUN_ID); const runAttempt = positive(env.GITHUB_RUN_ATTEMPT);
  const run = await api(`/actions/runs/${runId}/attempts/${runAttempt}`);
  assert.equal(run.id, runId); assert.equal(run.run_attempt, runAttempt); assert.equal(run.event, 'pull_request');
  assert.equal(run.path, workflow); sha(run.head_sha);
  assert.ok([pr.head.sha, checkoutSha].includes(run.head_sha), 'Run head is neither PR head nor actual merge');
  const workflowSha = sha(env.GITHUB_WORKFLOW_SHA);
  const workflowRef = env.GITHUB_WORKFLOW_REF;
  assert.equal(workflowRef?.toLowerCase().split('/.github/')[0], repository);
  assert.equal(workflowRef.slice(workflowRef.indexOf('/.github/')), `/${workflow}@refs/pull/${number}/merge`);
  const definition = await api(`/contents/${workflow}?ref=${workflowSha}`);
  assert.equal(definition.type, 'file'); assert.equal(definition.encoding, 'base64');
  const definitionBytes = Buffer.from(definition.content, 'base64'); assert.equal(blob(definitionBytes), definition.sha);
  const rows = [];
  for (const record of git(['ls-tree', '-rz', '--full-tree', 'HEAD']).split('\0').filter(Boolean)) {
    const [metadata, path] = record.split('\t'); const [mode, type, object] = metadata.split(' ');
    assert.equal(type, 'blob'); assert.ok(['100644', '100755'].includes(mode), 'No source symlinks/submodules');
    const bytes = await file(path); assert.equal(blob(bytes), object, `Changed working source: ${path}`);
    rows.push({ path, mode, blob: object, sha256: hash(bytes) });
  }
  rows.sort((a, b) => a.path.localeCompare(b.path)); assert.ok(rows.length > 0 && rows.length <= 1000);
  const pins = {};
  for (const path of [workflow, '.github/workflows/deploy-pages.yml', 'apps/aps-demo/scripts/e2e.mjs', 'apps/aps-demo/scripts/qa-evidence.mjs', 'apps/aps-demo/scripts/validation-evidence.mjs', 'package-lock.json']) pins[path] = hash(await file(path));
  const dist = await distInventory(); assert.ok(dist.length > 0);
  const installed = name => JSON.parse(require('node:fs').readFileSync(require.resolve(`${name}/package.json`), 'utf8')).version;
  let browser = null;
  if (phase === 'finalize') {
    try { browser = JSON.parse(await readFile('.harness/ci-qa/browser-result.json', 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const observation = {
    schema: 'aps-predeploy-observation-1', phase,
    repository, repositoryId: 1430231911, event: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF,
    pullRequest: { number, head: { repository, repositoryId: pr.head.repo.id, ref: pr.head.ref, sha: pr.head.sha }, base: { repository, repositoryId: pr.base.repo.id, ref: pr.base.ref, sha: pr.base.sha } },
    runId, runAttempt, apiRunHeadSha: run.head_sha, checkoutSha, checkoutTree, parents,
    workflow: { path: workflow, ref: workflowRef, sha: workflowSha, blob: definition.sha, sha256: hash(definitionBytes) },
    platform: process.platform, architecture: process.arch,
    versions: { node: process.version, vite: installed('vite'), playwright: installed('@playwright/test'), browser: browser?.version ?? null },
    pins, source: rows, sourceDigest: hash(JSON.stringify(rows)), dist, distDigest: hash(JSON.stringify(dist)),
    browserObservation: browser === null ? 'missing; no browser pass observed' : 'browser-result.json exists; independent verification required',
  };
  if (phase === 'prepare') {
    // A fresh job must not carry a success result from an earlier invocation.
    try { await lstat('.harness/ci-qa/browser-result.json'); throw new Error('Stale browser result before execution'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await appendFile(env.GITHUB_OUTPUT, `checkout_sha=${checkoutSha}\n`);
  } else {
    const initial = JSON.parse(await readFile(destination, 'utf8'));
    for (const key of ['checkoutSha', 'checkoutTree', 'sourceDigest', 'distDigest']) assert.equal(observation[key], initial[key], `Changed during browser run: ${key}`);
  }
  await mkdir('.harness/ci-qa', { recursive: true });
  await writeFile(destination, JSON.stringify(observation, null, 2) + '\n');
  console.log(`Predeployment observations recorded (${phase}); independent verification required; no deployment attested.`);
}
await collect(process.argv[2]);
