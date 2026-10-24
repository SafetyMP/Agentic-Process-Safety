import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

// Scope all transient test data to this workspace, including Vitest's SSR cache.
// This changes only the child process environment, never global runtime settings.
const app = fileURLToPath(new URL('../', import.meta.url));
const temp = resolve(app, '../../.harness/demo-test-tmp');
mkdirSync(temp, { recursive: true });
const require = createRequire(import.meta.url);
const vitest = resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const child = spawnSync(process.execPath, [vitest, 'run', ...process.argv.slice(2)], {
  cwd: app,
  env: { ...process.env, TMPDIR: temp, TMP: temp, TEMP: temp },
  stdio: 'inherit',
});
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
