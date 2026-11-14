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
  process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(process.env.PLAYWRIGHT_BROWSERS_PATH || '.harness/playwright');
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
  const check = async (assertion) => { await assertion(); assertions++; };
  const currentComparison = () => page.getByRole('region', { name: 'Browser comparison', exact: true });
  const lane = mode => currentComparison().getByRole('article', { name: 'Model ' + mode + ' outcome', exact: true });
  const evaluate = async () => { await page.getByRole('button', { name: 'Run comparison', exact: true }).click(); await expect(currentComparison()).toBeVisible(); };
  const routeWithinApp = async route => { const link = page.locator('nav[aria-label="Main navigation"] a[href="#/' + route + '"]'); await link.click(); await expect(link).toHaveAttribute('aria-current', 'page'); await expect(page.locator('h1')).toBeVisible(); };
  const openTools = async () => { const details = page.locator('.discussion-session-tools'); if ((await details.getAttribute('open')) === null) await details.locator('summary').click(); };
  await mkdir(screenshots, { recursive: true });
  // Every original hash route still supports a direct built-site refresh.
  for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
    await go(route); await page.reload();
    await check(() => expect(page.locator('h1')).toBeVisible());
    if (route === 'simulator') await evaluate();
    await page.screenshot({ path: resolve(screenshots, route + '.jpg'), quality: 65 });
  }

  await go('overview');
  await page.getByText('Explore the declared procurement system', { exact: true }).click();
  for (const label of ['demand', 'inventory', 'supplier', 'finance', 'purchase', 'orchestrator', 'Policy gateway', 'Assurance']) {
    const button = page.locator('.node-buttons').getByRole('button', { name: label, exact: true });
    await button.click(); await check(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  }
  await page.getByRole('link', { name: 'Explore the approval case →', exact: true }).click();
  await check(() => expect(page.getByLabel('Approval age (logical seconds)', { exact: true })).toHaveValue('61'));
  await page.getByText('Predict the outcome · optional', { exact: true }).click();
  await page.getByLabel('Prediction', { exact: true }).selectOption('B');
  await page.getByLabel('Why do you expect that?', { exact: true }).fill('The request is permitted, but the approval is expired.');
  await evaluate();
  await check(() => expect(lane('B').locator('.lane-result')).toHaveText('EXECUTED · MODEL'));
  await check(() => expect(lane('C').locator('.lane-result')).toHaveText('BLOCKED · MODEL'));
  await check(() => expect(lane('B')).toContainText('0 → 300'));
  await check(() => expect(lane('C')).toContainText('0 → 0'));
  await page.getByText('Compare every modeled check', { exact: true }).click();
  const checks = page.getByRole('table', { name: 'Ordered checks against the same input snapshot' });
  const freshness = checks.getByRole('row').filter({ hasText: 'Approval freshness' });
  await check(() => expect(freshness).toContainText('Not included'));
  await check(() => expect(freshness).toContainText('Fails'));
  await check(() => expect(checks.getByRole('row').filter({ hasText: 'Human threshold' })).toContainText('Not evaluated'));
  await page.getByRole('button', { name: /Decision boundary/ }).click();
  await check(() => expect(page.locator('.path-detail')).toContainText('freshness'));

  await page.getByLabel('Reason for this recommendation', { exact: true }).fill('Hold the purchase and seek new exact authorization.');
  await page.getByLabel('Dissent or another interpretation', { exact: true }).fill('Quotation truth remains unknown.');
  await page.getByRole('button', { name: 'Mark ready for discussion', exact: true }).click();
  await check(() => expect(page.getByText('Ready for discussion · not approval', { exact: true })).toBeVisible());
  const originalId = await page.getByLabel('Selected comparison', { exact: true }).inputValue();
  await check(() => expect(lane('C').locator('.lane-result')).toHaveText('BLOCKED · MODEL'));

  for (const route of ['hazop', 'governance', 'assurance', 'overview']) await routeWithinApp(route);
  await routeWithinApp('simulator');
  await check(() => expect(page.getByLabel('Selected comparison', { exact: true })).toHaveValue(originalId));
  await check(() => expect(page.getByLabel('Reason for this recommendation', { exact: true })).toHaveValue('Hold the purchase and seek new exact authorization.'));

  await page.getByRole('button', { name: '59 seconds', exact: true }).click();
  await check(() => expect(page.locator('.draft-notice')).toContainText('Inputs changed — run again'));
  await check(() => expect(lane('C').locator('.lane-result')).toHaveText('BLOCKED · MODEL'));
  await evaluate();
  await check(() => expect(lane('C').locator('.lane-result')).toHaveText('EXECUTED · MODEL'));
  await page.getByRole('button', { name: '60 seconds', exact: true }).click(); await evaluate();
  await check(() => expect(lane('C').locator('.lane-result')).toHaveText('BLOCKED · MODEL'));
  await page.getByRole('button', { name: 'Return to original comparison', exact: true }).click();
  await check(() => expect(page.getByLabel('Reason for this recommendation', { exact: true })).toHaveValue('Hold the purchase and seek new exact authorization.'));
  await page.getByRole('button', { name: 'Explore a fresh-approval request', exact: true }).click();
  await check(() => expect(currentComparison()).toContainText('Hypothetical recovery from ' + originalId));
  await check(() => expect(lane('B')).toContainText('0 → 300'));
  await check(() => expect(lane('C')).toContainText('0 → 300'));
  await check(() => expect(page.getByLabel('Approval age (logical seconds)', { exact: true })).toHaveValue('0'));

  await openTools();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download session JSON', exact: true }).click();
  const download = await downloadPromise;
  const savedExport = JSON.parse(await readFile(await download.path(), 'utf8'));
  const original = savedExport.session.runs.find(run => run.id === originalId);
  const child = savedExport.session.runs.find(run => run.parent?.runId === originalId);
  assert.equal(original.request.approvalAge, 61);
  assert.equal(original.prediction.choice, 'B');
  assert.equal(child.parent.lane, 'C');
  assert.deepEqual(child.baseline, { orders: 0, spend: 0 });
  assert.notEqual(child.requestIdentity, original.requestIdentity);
  assert.equal(savedExport.session.discussions[originalId].dissent, 'Quotation truth remains unknown.');
  assertions += 6;
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click();
  const countBeforeClear = savedExport.session.runs.length;
  await page.getByRole('button', { name: 'Clear current session', exact: true }).click();
  await page.getByRole('button', { name: 'Clear comparisons and notes', exact: true }).click();
  await check(() => expect(page.getByRole('region', { name: 'Browser comparison', exact: true })).toHaveCount(0));
  await page.getByRole('button', { name: 'Load saved session', exact: true }).click();
  await page.getByRole('button', { name: 'Replace with saved session', exact: true }).click();
  await check(() => expect(page.getByLabel('Selected comparison', { exact: true }).locator('option')).toHaveCount(countBeforeClear));
  const configLink = await page.getByRole('link', { name: 'Open configuration-only link →', exact: true }).getAttribute('href');
  assert.ok(!configLink.includes('Quotation') && !configLink.includes('rationale')); assertions++;
  await page.getByRole('button', { name: 'Delete browser copy', exact: true }).click();
  await page.getByRole('button', { name: 'Delete saved copy', exact: true }).click();
  await check(() => expect(currentComparison()).toBeVisible());

  // Preserve all nine stories, with A available explicitly and no invented effects.
  const expected = {
    normal: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'EXECUTED · MODEL'],
    unauthorized: ['EXECUTED · MODEL', 'BLOCKED · MODEL', 'BLOCKED · MODEL'],
    spending: ['EXECUTED · MODEL', 'BLOCKED · MODEL', 'BLOCKED · MODEL'],
    delegation: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'BLOCKED · MODEL'],
    approval: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'BLOCKED · MODEL'],
    replay: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'BLOCKED · MODEL'],
    stale: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'BLOCKED · MODEL'],
    conflict: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'REVIEW PENDING'],
    context: ['EXECUTED · MODEL', 'EXECUTED · MODEL', 'BLOCKED · MODEL'],
  };
  await page.getByLabel('Include A · no modeled checks').check();
  for (const [story, decisions] of Object.entries(expected)) {
    await page.getByLabel('Choose a case', { exact: true }).selectOption(story);
    await page.getByRole('button', { name: 'Reset inputs', exact: true }).click();
    await evaluate();
    for (const [index, mode] of ['A', 'B', 'C'].entries()) await check(() => expect(lane(mode).locator('.lane-result')).toHaveText(decisions[index]));
    if (!['normal', 'unauthorized', 'stale'].includes(story)) await check(() => expect(lane('C')).toContainText('Effect projection is not modeled'));
  }
  await page.getByLabel('Choose a case', { exact: true }).selectOption('stale');
  await page.getByLabel('Approval age (logical seconds)', { exact: true }).fill('-1');
  await check(() => expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeDisabled());
  await page.getByRole('button', { name: 'Reset inputs', exact: true }).click(); await evaluate();

  await go('hazop?hazard=unknown&node=invalid'); await page.reload();
  await check(() => expect(page.getByLabel('Agent node', { exact: true })).toHaveValue('all'));
  await check(() => expect(page.locator('.register tbody tr')).toHaveCount(96));
  await page.getByLabel('Search findings', { exact: true }).fill('no-such-finding');
  await check(() => expect(page.getByText(/No findings match/)).toBeVisible());
  await page.getByLabel('Search findings', { exact: true }).fill('');
  await page.getByLabel('Agent node', { exact: true }).selectOption('supplier');
  await check(() => expect(page.locator('.register tbody tr')).toHaveCount(16));
  await page.getByLabel('Guideword / deviation', { exact: true }).selectOption('AUTHORITY_ESCALATION');
  await check(() => expect(page.locator('.register tbody tr')).toHaveCount(1));
  await page.getByLabel('Sort findings', { exact: true }).selectOption('deviation');
  await page.locator('.register button').click();
  await check(() => expect(page.locator('#finding-detail a[href*="story=unauthorized"]')).toHaveCount(1));
  await go('hazop?hazard=APS-00be5560043a77ba3ede');
  await check(() => expect(page.getByText(/No interactive case for this finding\./)).toBeVisible());

  await go('governance?control=CTL-EXPIRY');
  await check(() => expect(page.getByLabel('Inspect control', { exact: true })).toHaveValue('CTL-EXPIRY'));
  await check(() => expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toHaveCount(0));
  const links = await page.locator('main a[href^="#/"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
  for (const link of new Set(links)) await go(link.slice(2));

  await go('assurance?trial=15');
  const pair = page.locator('.recorded-pair-table');
  await check(() => expect(pair.locator('tbody tr')).toHaveCount(10));
  await check(() => expect(pair.locator('tbody tr').last()).toContainText('expired_finance_approval'));
  await check(() => expect(pair.locator('tbody tr').last().locator('td').nth(0)).toContainText('ALLOW · executed'));
  await check(() => expect(pair.locator('tbody tr').last().locator('td').nth(1)).toContainText('DENY · not executed'));
  await page.getByRole('button', { name: 'Replay next recorded call', exact: true }).click();
  await check(() => expect(page.locator('.replay-list li')).toHaveCount(1));
  await page.getByRole('button', { name: 'Show all recorded calls', exact: true }).click();
  await check(() => expect(page.locator('.replay-list li')).toHaveCount(10));
  await page.getByRole('button', { name: 'Restart replay', exact: true }).click();
  await check(() => expect(page.locator('.replay-list li')).toHaveCount(0));
  await page.getByLabel('Filter recorded arm', { exact: true }).selectOption('C');
  await check(() => expect(page.locator('.register tbody tr')).toHaveCount(10));
  await page.getByLabel('Sort recorded trials', { exact: true }).selectOption('fault');
  await check(() => expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible());
  assert.ok(await page.locator('.recharts-bar-rectangle path').evaluateAll(paths => paths.some(path => path.getBoundingClientRect().height > 0)), 'Charts must draw visible bars, not just populated data tables'); assertions++;
  await go('assurance?trial=17');
  await check(() => expect(page.getByText(/differs from the active browser case/)).toBeVisible());
  await check(() => expect(page.getByRole('heading', { name: /Recorded trial #17/ })).toBeVisible());
  await go('assurance?trial=unknown');
  await check(() => expect(page.getByText(/No recorded trial matches/)).toBeVisible());
  await check(() => expect(page.getByRole('button', { name: 'Replay next recorded call', exact: true })).toHaveCount(0));

  // Viewport/theme matrix covers all screens, including a completed comparison.
  for (const width of [375, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 950 });
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
      await go(route);
      if (route === 'simulator') { await page.getByRole('button', { name: 'Reset inputs', exact: true }).click(); await evaluate(); }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route + ' ' + width + ' ' + theme + ': horizontal overflow'); assertions++;
    }
    if (width === 375) await page.screenshot({ path: resolve(screenshots, 'mobile-' + theme + '.jpg'), quality: 65 });
  }
  await page.reload(); await check(() => expect(page.getByLabel('Theme', { exact: true })).toHaveValue('dark'));
  await go('simulator?story=stale');
  const age = page.getByLabel('Approval age (logical seconds)', { exact: true });
  await age.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('59');
  await check(() => expect(age).toHaveValue('59'));
  await page.getByRole('button', { name: 'Run comparison', exact: true }).focus(); await page.keyboard.press('Enter');
  await check(() => expect(page.getByRole('heading', { name: 'Comparison results', exact: true })).toBeFocused());
  assert.deepEqual(errors, [], 'Browser errors'); assert.deepEqual(violations, [], 'Runtime network contract');
  await mkdir('.harness/ci-qa', { recursive: true });
  await writeFile('.harness/ci-qa/browser-result.json', JSON.stringify({
    status: 'passed', engine, version: browser.version(), platform: process.platform,
    assertions, errors, violations, prefix, experience: 'APS redesign increments 1–4',
    screenshots: ['overview', 'hazop', 'governance', 'simulator', 'assurance', 'mobile-light', 'mobile-dark'].map(name => 'docs/screenshots/' + name + '.jpg'),
  }, null, 2) + '\n');
  console.log('Built-site browser QA passed: ' + assertions + ' checks; paired nine-case comparisons, age boundaries, retained history, reasoning/recovery/export, deep links, frozen evidence, responsive themes and keyboard operation; no console/page errors or nonstatic requests.');
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
}
