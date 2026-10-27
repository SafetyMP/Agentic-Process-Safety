import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace('/src/main.tsx', './app.js');
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const script = fileURLToPath(new URL('../scripts/static.mjs', import.meta.url));
function check(page = html, map = sitemap, code = 'export {};') {
  const base = resolve(process.cwd(), '../../.harness/demo-test-tmp');
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(resolve(base, 'seo-'));
  try {
    writeFileSync(resolve(dir, 'index.html'), page);
    writeFileSync(resolve(dir, 'sitemap.xml'), map);
    writeFileSync(resolve(dir, 'app.js'), code);
    const result = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
    return { status: result.status, output: result.stderr + result.stdout };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('static SEO page passes at both case-sensitive project roots', () => {
  const result = check();
  expect(result.output).toContain('both case-sensitive project roots');
  expect(result.status).toBe(0);
});

test.each([
  ['wrong canonical', html.replace('rel="canonical" href="https://safetymp.github.io/Agentic-Process-Safety/"', 'rel="canonical" href="https://example.com/"')],
  ['duplicate canonical', html.replace('</head>', '<link rel="canonical" href="https://safetymp.github.io/Agentic-Process-Safety/"></head>')],
  ['remote image', html.replace('</body>', '<img src="https://example.com/tracker.png"></body>')],
  ['remote stylesheet', html.replace('</head>', '<link rel="stylesheet" href="https://example.com/style.css"></head>')],
  ['missing description', html.replace(/<meta name="description"[^>]+>/, '')],
  ['invalid structured data', html.replace('"@type": "SoftwareSourceCode"', '"@type": "Product"')],
  ['missing static introduction', html.replace(/<h1>.*?<\/h1>/, '')],
  ['noindex', html.replace('</head>', '<meta name="robots" content="noindex"></head>')],
])('rejects %s', (_, page) => { expect(check(page).status).not.toBe(0); });

test('rejects fragment URLs in the sitemap', () => {
  expect(check(html, sitemap.replace('</loc>', '#/hazop</loc>')).status).not.toBe(0);
});
test('canonical exemption does not allow runtime networking', () => {
  expect(check(html, sitemap, 'fetch("https://example.com/");').status).not.toBe(0);
});
