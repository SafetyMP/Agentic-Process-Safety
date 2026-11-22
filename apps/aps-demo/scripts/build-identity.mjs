import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildIdentity() {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const app = 'apps/aps-demo/';
  const hash = createHash('sha256');
  function add(file) {
    hash.update(file + '\0').update(readFileSync(resolve(root, file))).update('\0');
  }
  function walk(dir) {
    for (const name of readdirSync(resolve(root, dir), { withFileTypes: true }).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const path = dir + '/' + name.name;
      if (name.isDirectory()) walk(path);
      else if (name.isFile()) add(path);
    }
  }
  walk(app + 'src');
  walk(app + 'public');
  for (const file of ['package-lock.json', app + 'index.html', app + 'vite.config.ts', app + 'scripts/build-identity.mjs']) add(file);
  let revision = 'source';
  try { revision = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim(); }
  catch { /* Source archives retain the content fingerprint. */ }
  return revision + '/' + hash.digest('hex').slice(0,12);
}
