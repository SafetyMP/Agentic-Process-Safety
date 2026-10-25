import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const documents = ['README.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md', 'docs/open-source-readiness.md', '.github/PULL_REQUEST_TEMPLATE.md'];
export function verify(root) {
  const errors = [];
  const read = p => { try { return readFileSync(resolve(root, p), 'utf8'); } catch { errors.push('Missing file: ' + p); return ''; } };
  for (const p of documents) {
    const text = read(p);
    if (text.trim().length < 120) errors.push('Incomplete document: ' + p);
    for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [path, anchor] = target.split('#');
      const local = resolve(root, dirname(p), decodeURIComponent(path || p.split('/').at(-1)));
      if (!existsSync(local)) { errors.push('Broken local link in ' + p + ': ' + target); continue; }
      if (anchor && /\.md$/i.test(local)) {
        const headings = [...readFileSync(local, 'utf8').matchAll(/^#+\s+(.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replaceAll(' ', '-'));
        if (!headings.includes(anchor)) errors.push('Broken anchor in ' + p + ': ' + target);
      }
    }
  }
  const license = read('LICENSE');
  for (const marker of ['Version 2.0, January 2004', '1. Definitions.', '9. Accepting Warranty or Additional Liability.', 'END OF TERMS AND CONDITIONS', 'APPENDIX: How to apply the Apache License']) {
    if (!license.includes(marker)) errors.push('Incomplete Apache license: ' + marker);
  }
  if (license.length < 10000) errors.push('Apache license text truncated');
  const lock = JSON.parse(read('package-lock.json') || '{}');
  for (const p of ['', 'apps/aps-demo']) {
    const pkg = JSON.parse(read(p ? p + '/package.json' : 'package.json') || '{}');
    if (pkg.license !== 'Apache-2.0' || lock.packages?.[p]?.license !== pkg.license) errors.push('License metadata mismatch: ' + p);
    if (pkg.private !== true) errors.push('Unexpected package publication enabled: ' + p);
  }
  for (const p of ['bug', 'question']) {
    const form = read('.github/ISSUE_TEMPLATE/' + p + '.yml');
    for (const pattern of [/^name: .+/m, /^description: .+/m, /^body:/m, /type: textarea/, /required: true/]) if (!pattern.test(form)) errors.push('Invalid issue form: ' + p);
  }
  const workflow = read('.github/workflows/repository-checks.yml');
  const simulatorTest = workflow.indexOf('- run: npm test');
  const pythonInstall = workflow.indexOf('- run: .venv/bin/pip install -r requirements.lock');
  const pythonVenv = workflow.indexOf('- run: python3 -m venv .venv');
  if (pythonVenv < 0 || pythonInstall < pythonVenv || simulatorTest < pythonInstall) errors.push('Missing Python gateway prerequisites before simulator tests');
  const opaInstall = workflow.indexOf('https://github.com/open-policy-agent/opa/releases/download/v1.21.4/opa_linux_amd64_static');
  if (opaInstall < 0 || opaInstall > simulatorTest || !workflow.includes('2ab571f367f293bb19523b76f92f1945bbf245003392c7f392903f95c2b9b630  .harness/ci-bin/opa') || !workflow.includes('sha256sum --check')) errors.push('Missing pinned OPA gateway prerequisite');
  for (const required of ['pull_request:', 'contents: read', 'persist-credentials: false', 'timeout-minutes:', 'node scripts/verify-repository-readiness.mjs', 'npm run demo:production:check', 'npm run demo:test', 'test_engine.py']) if (!workflow.includes(required)) errors.push('Missing CI guard/check: ' + required);
  if (/pull_request_target|workflow_run|secrets\s*[.:]|permissions:\s*write-all|(?:contents|packages|id-token|pages):\s*write|\$\{\{\s*github\.event/.test(workflow)) errors.push('Unsafe CI trust or privilege configuration');
  for (const action of workflow.matchAll(/uses:\s*(\S+)/g)) if (!/@[a-f0-9]{40}$/.test(action[1])) errors.push('Unpinned action: ' + action[1]);
  const dep = read('.github/dependabot.yml');
  for (const ecosystem of ['npm', 'pip', 'github-actions']) if (!dep.includes('package-ecosystem: ' + ecosystem)) errors.push('Missing Dependabot ecosystem: ' + ecosystem);
  if (/insecure-external-code-execution|assignees:|reviewers:/.test(dep)) errors.push('Unexpected Dependabot authority');
  const audit = read('docs/open-source-readiness.md');
  for (const marker of ['https://docs.github.com/', 'https://www.apache.org/licenses/LICENSE-2.0.txt', 'Pending owner checklist', 'Validation']) if (!audit.includes(marker)) errors.push('Missing audit section/source: ' + marker);
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verify(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Repository readiness: documents, local links/anchors, license metadata, templates and bounded automation checks pass. Remote settings and rights are not verified.');
}
