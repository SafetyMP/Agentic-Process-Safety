import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
/* global document, window */

// Serve only the built artifact at its actual Pages prefix. No SPA server fallback.
const prefix = '/agentic-process-safety/';
const dist = resolve('apps/aps-demo/dist');
const screenshots = resolve('docs/screenshots');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(prefix));
    const path = resolve(dist, pathname.slice(prefix.length) || 'index.html');
    assert.ok(path.startsWith(dist + '/'));
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
let browser;
const errors = [];
const violations = [];
let assertions = 0;
try {
  process.env.TMPDIR = resolve('.harness/demo-browser-tmp');
  process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.harness/playwright');
  await mkdir(process.env.TMPDIR, { recursive: true });
  const { chromium, firefox, expect } = await import('@playwright/test');
  const engine = process.env.APS_BROWSER || (process.platform === 'darwin' ? 'firefox' : 'chromium');
  assert.ok(['firefox', 'chromium'].includes(engine), 'APS_BROWSER must be firefox or chromium');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`Browser engine requested: ${engine} (${process.platform}); no fallback`);
  browser = await ({ chromium, firefox })[engine].launch({ headless: true });
  console.log(`Browser engine running: ${engine} ${browser.version()}`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const request = route.request();
    if (!request.url().startsWith(origin + prefix) || ['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) {
      violations.push(`${request.resourceType()} ${request.url()}`);
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('websocket', ws => violations.push(ws.url()));
  const go = async route => { await page.goto(`${origin}${prefix}#/${route}`); await expect(page.locator('h1')).toBeVisible(); assertions++; };
  const stat = label => page.locator('.stat').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');
  await mkdir(screenshots, { recursive: true });
  for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
    await go(route); await page.reload(); await expect(page.locator('h1')).toBeVisible();
    await page.screenshot({ path: resolve(screenshots, `${route}.jpg`), quality: 65 }); assertions++;
  }
  await go('overview');
  for (const label of ['demand', 'inventory', 'supplier', 'finance', 'purchase', 'orchestrator', 'Policy gateway', 'Assurance']) {
    const button = page.locator('.node-buttons').getByRole('button', { name: label, exact: true });
    await button.click(); await expect(button).toHaveAttribute('aria-pressed', 'true'); assertions++;
  }
  await page.getByRole('button', { name: 'Begin guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await expect(guide).toContainText('1 OF 5');
  for (let i = 2; i <= 4; i++) { await guide.getByRole('button', { name: 'Next', exact: true }).click(); await expect(guide).toContainText(`${i} OF 5`); }
  await page.getByRole('button', { name: 'Evaluate simulated request', exact: true }).click();
  await expect(page.locator('.event')).toContainText('DENY');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.live-outcome')).toContainText('1 unsafe attempts · 0 unsafe executed · 1 blocked');
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.event')).toContainText('DENY');
  await guide.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Shared simulated run' })).toContainText('0 blocked');
  await guide.getByRole('button', { name: 'Close walkthrough' }).click(); assertions += 8;

  await go('hazop?hazard=unknown&node=invalid');
  await page.reload();
  await expect(page.getByLabel('Agent node', { exact: true })).toHaveValue('all');
  await expect(page.locator('.register tbody tr')).toHaveCount(96);
  assertions += 2;
  await page.getByLabel('Search findings').fill('no-such-finding');
  await expect(page.getByText('No findings match.', { exact: false })).toBeVisible();
  await page.getByLabel('Search findings').fill('');
  await page.getByLabel('Agent node', { exact: true }).selectOption('supplier');
  await expect(page.locator('.register tbody tr')).toHaveCount(16);
  await page.getByLabel('Guideword / deviation').selectOption('AUTHORITY_ESCALATION');
  await expect(page.locator('.register tbody tr')).toHaveCount(1);
  await page.getByLabel('Sort findings').selectOption('deviation');
  await page.locator('.register button').click(); assertions += 4;

  await go('governance');
  const stories = ['normal', 'unauthorized', 'spending', 'delegation', 'approval', 'replay', 'stale', 'conflict', 'context'];
  for (const mode of ['A', 'B', 'C']) for (const story of stories) {
    await page.getByLabel('Scenario', { exact: true }).selectOption(story);
    await page.getByLabel('Governance mode').selectOption(mode);
    await page.getByRole('button', { name: 'Reset decision' }).click();
    await page.getByRole('button', { name: 'Evaluate simulated request', exact: true }).click();
    const decision = mode === 'A' || story === 'normal' || (mode === 'B' && !['unauthorized', 'spending'].includes(story)) ? 'ALLOW' : story === 'conflict' ? 'REVIEW' : 'DENY';
    await expect(page.locator('.event').first()).toContainText(decision);
    if (decision === 'REVIEW') {
      await page.getByRole('button', { name: 'Deny simulated request', exact: true }).click();
      await expect(page.locator('.event').last()).toContainText('DENY');
      await page.getByRole('button', { name: 'Reset decision' }).click();
      await page.getByRole('button', { name: 'Evaluate simulated request', exact: true }).click();
      await page.getByRole('button', { name: 'Approve simulated request', exact: true }).click();
      await expect(page.locator('.event').last()).toContainText('ALLOW');
    }
    assertions++;
  }
  // Resolve every internal contextual link from the control plane.
  await page.getByLabel('Scenario', { exact: true }).selectOption('unauthorized');
  await page.getByRole('button', { name: 'Evaluate simulated request', exact: true }).click();
  await page.getByText('Inspect ordered browser policy checks', { exact: true }).click();
  const policyRows = page.getByRole('table', { name: 'Rules for this simulated gateway attempt' }).locator('tbody tr');
  await expect(policyRows).toHaveCount(9);
  await expect(policyRows.first()).toContainText('fail');
  await expect(policyRows.last()).toContainText('skipped');
  assertions += 3;
  const links = await page.locator('main a[href^="#/"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
  for (const link of new Set(links)) { await go(link.slice(2)); assertions++; }

  await go('simulator');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await page.getByRole('status').textContent();
  await page.waitForTimeout(850);
  assert.equal(await page.getByRole('status').textContent(), paused);
  await page.getByLabel('Predefined fault').selectOption('context');
  await page.getByRole('button', { name: 'Inject selected fault' }).click();
  await expect(page.getByText('Queued: Compromised shared context')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(stat('Blocked decisions')).toHaveText('1');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(stat('Blocked decisions')).toHaveText('0');
  await page.getByLabel('Deterministic seed').fill('-10');
  await expect(page.getByLabel('Deterministic seed')).toHaveValue('0');
  await page.getByLabel('Governance mode').selectOption('A');
  await expect(page.getByRole('status')).toContainText('tick 0'); assertions += 7;
  await go('assurance');
  await page.getByLabel('Filter recorded arm').selectOption('C');
  await expect(page.locator('.register tbody tr')).toHaveCount(10);
  await page.getByLabel('Sort recorded trials').selectOption('fault');
  await page.locator('.register button').first().click();
  await page.getByRole('button', { name: 'Replay next recorded call' }).click();
  await expect(page.locator('.replay-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Restart replay' }).click();
  await expect(page.locator('.replay-list li')).toHaveCount(0); assertions += 3;
  for (const width of [375, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 950 });
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
      await go(route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} ${width} ${theme}: horizontal overflow`);
      assertions++;
    }
    if (width === 375) await page.screenshot({ path: resolve(screenshots, `mobile-${theme}.jpg`), quality: 65 });
  }
  await page.reload(); await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('dark');
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  assert.deepEqual(errors, [], 'Browser errors'); assert.deepEqual(violations, [], 'Runtime network contract');
  await mkdir('.harness/ci-qa', { recursive: true });
  await writeFile('.harness/ci-qa/browser-result.json', JSON.stringify({
    status: 'passed', engine, version: browser.version(), platform: process.platform,
    assertions, errors, violations, prefix,
    screenshots: ['overview', 'hazop', 'governance', 'simulator', 'assurance', 'mobile-light', 'mobile-dark'].map(name => `docs/screenshots/${name}.jpg`),
  }, null, 2) + '\n');
  console.log(`Built-site browser QA passed: ${assertions} checks; nine stories × three modes; direct hash refresh, walkthrough, controls, responsive themes; no console/page errors or nonstatic requests. Screenshots: docs/screenshots/*.jpg`);
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
}
