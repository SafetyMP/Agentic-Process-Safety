import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function inventory(root) {
  const rows = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'playwright-report', 'test-results'].includes(entry.name)) continue;
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) rows.push(...await inventory(path));
    else if (entry.isFile()) rows.push({ path, sha256: sha(await readFile(path)) });
    else throw new Error(`Unexpected source entry: ${path}`);
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
const source = await inventory('apps/aps-demo');
for (const path of ['package.json', 'package-lock.json', 'tsconfig.json', '.github/workflows/deploy-pages.yml']) {
  source.push({ path, sha256: sha(await readFile(path)) });
}
source.sort((a, b) => a.path.localeCompare(b.path));
// inventory excludes nested build output; starting at dist includes its files.
const dist = await inventory('apps/aps-demo/dist');
let commit = null;
try { commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* Unborn checkout is disclosed. */ }
await mkdir('.harness/ci-qa', { recursive: true });
await writeFile('.harness/ci-qa/identity.json', JSON.stringify({
  schema: 'aps-source-bound-qa-1', platform: process.platform, architecture: process.arch,
  node: process.version, commit, repository: process.env.GITHUB_REPOSITORY ?? null,
  workflow: process.env.GITHUB_WORKFLOW ?? null, workflowRef: process.env.GITHUB_WORKFLOW_REF ?? null,
  runId: process.env.GITHUB_RUN_ID ?? null, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  sourceDigest: sha(JSON.stringify(source)), distDigest: sha(JSON.stringify(dist)), source, dist,
  browserResult: 'See browser-result.json only if assertions completed; absence means no browser pass.',
}, null, 2) + '\n');
console.log('QA source/dist manifest: .harness/ci-qa/identity.json (not a completion receipt)');
