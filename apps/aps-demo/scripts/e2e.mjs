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
  const stat = (label, scope = page) => scope.locator('.stat').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');
  // Increment only after each added check has actually completed successfully.
  const check = async verify => { await verify(); assertions++; };
  const navigationNames = { overview: /^Overview/, governance: /^Control Plane/, simulator: /^Swarm Simulator/, assurance: /^Assurance/ };
  const navigateWithin = async section => {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: navigationNames[section] }).click();
    await check(() => expect(page.locator('h1')).toBeVisible());
  };
  const workflowStatus = page.getByRole('status', { name: 'Workflow status', exact: true });
  const captureGeneratedWorkflow = async () => {
    await check(() => expect(workflowStatus).toHaveCount(1));
    await check(() => expect(workflowStatus).toContainText('paused'));
    await page.getByRole('button', { name: 'Prepare current replay JSON', exact: true }).click();
    const replayText = await page.getByRole('textbox', { name: 'Prepared replay snapshot', exact: true }).inputValue();
    const replay = JSON.parse(replayText);
    await check(() => assert.equal(replay.simulationOnly, true));
    return { replayText, status: await workflowStatus.innerText(), orders: await stat('Committed orders').innerText(), spent: await stat('Simulated spend').innerText(), confirmed: await stat('Task confirmed').innerText(), safe: await stat('Safe model completion').innerText() };
  };
  const populatePausedWorkflow = async () => {
    await check(() => expect(stat('Committed orders')).toHaveText('0'));
    for (let transition = 0; transition < 100 && (await stat('Committed orders').innerText()).trim() !== '1'; transition++) {
      const step = page.getByRole('button', { name: 'Step one transition', exact: true });
      await check(() => expect(step).toBeEnabled());
      await step.click();
    }
    await check(() => expect(stat('Committed orders')).toHaveText('1'));
    await check(() => expect(stat('Simulated spend')).toHaveText('400'));
    await check(() => expect(stat('Task confirmed')).toHaveText('No'));
    await check(() => expect(stat('Safe model completion')).toHaveText('No'));
    const snapshot = await captureGeneratedWorkflow();
    const replay = JSON.parse(snapshot.replayText);
    await check(() => assert.equal(replay.spec.scenario, 'nominal'));
    await check(() => assert.equal(replay.spec.mode, 'C'));
    await check(() => assert.ok(replay.transitionCount > 0 && replay.transitionCount <= 100));
    await check(() => assert.ok(replay.events.some(event => event.type === 'order-committed')));
    return snapshot;
  };
  const assertGeneratedWorkflowUnchanged = async baseline => {
    const current = await captureGeneratedWorkflow();
    // Exact replay equality retains specification, effects digest, journal and causal history.
    await check(() => assert.deepEqual(current, baseline));
  };
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
  // Populate a separate generated workflow, stopping after commit but before confirmation.
  await navigateWithin('simulator');
  const guideWorkflow = await populatePausedWorkflow();
  await navigateWithin('overview');
  await page.getByRole('button', { name: 'Begin guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  const resetChoice = page.getByRole('region', { name: 'Walkthrough reset consequence', exact: true });
  await check(() => expect(guide).toContainText('1 OF 5'));
  await check(() => expect(resetChoice).not.toBeVisible());
  for (let i = 2; i <= 4; i++) {
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await check(() => expect(guide).toContainText(`${i} OF 5`));
  }
  // Visiting the outcome step without evaluation must not invent an outcome.
  await check(() => expect(page.locator('.event')).toHaveCount(0));
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await check(() => expect(guide).toContainText('5 OF 5'));
  await check(() => expect(guide).toContainText('No SIMULATED outcome yet'));
  await check(() => expect(guide).toContainText('You advanced without evaluating'));
  await check(() => expect(page.locator('.live-outcome')).toContainText('0 unsafe attempts · 0 unsafe executed · 0 blocked'));
  await check(() => expect(page.locator('.live-outcome .event')).toHaveCount(0));
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await check(() => expect(guide).toContainText('4 OF 5'));
  await page.getByRole('button', { name: 'Evaluate simulated request', exact: true }).click();
  await check(() => expect(page.locator('.event')).toContainText('DENY'));
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await check(() => expect(page.locator('.live-outcome')).toContainText('1 unsafe attempts · 0 unsafe executed · 1 blocked'));
  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await check(() => expect(page.locator('.event')).toContainText('DENY'));
  const retainedUrl = page.url();
  const retainedDecision = await page.locator('.event').innerText();
  const assertPolicyDecisionRetained = async () => {
    await check(() => expect(page).toHaveURL(retainedUrl));
    await check(() => expect(page.locator('.event')).toHaveCount(1));
    await check(() => expect(page.locator('.event')).toHaveText(retainedDecision));
    await check(() => expect(page.locator('.event')).toContainText('Operation not executed'));
  };
  const assertPolicyCountsRetained = async () => {
    await navigateWithin('assurance');
    await check(() => expect(page.locator('.live-outcome')).toContainText('1 unsafe attempts · 0 unsafe executed · 1 blocked'));
    await navigateWithin('governance');
    await assertPolicyDecisionRetained();
  };
  await guide.getByRole('button', { name: 'Restart', exact: true }).click();
  await check(() => expect(resetChoice).toBeVisible());
  await check(() => expect(resetChoice).toContainText('clears the current single-request policy illustration'));
  await assertPolicyDecisionRetained();
  await assertPolicyCountsRetained();
  await check(() => expect(resetChoice).toBeVisible());
  await resetChoice.getByRole('button', { name: 'Keep current policy run', exact: true }).click();
  await check(() => expect(resetChoice).not.toBeVisible());
  await assertPolicyDecisionRetained();
  await assertPolicyCountsRetained();
  await navigateWithin('simulator');
  await assertGeneratedWorkflowUnchanged(guideWorkflow);
  await navigateWithin('governance');
  await assertPolicyDecisionRetained();
  await guide.getByRole('button', { name: 'Restart', exact: true }).click();
  await check(() => expect(resetChoice).toBeVisible());
  await resetChoice.getByRole('button', { name: 'Start walkthrough and clear policy run', exact: true }).click();
  await check(() => expect(resetChoice).not.toBeVisible());
  await check(() => expect(guide).toContainText('1 OF 5'));
  await check(() => expect(page).toHaveURL(/#\/overview$/));
  const shared = page.getByRole('region', { name: 'Shared simulated run', exact: true });
  await check(() => expect(shared).toContainText('mode C · seed 42 · logical tick 0'));
  await check(() => expect(shared).toContainText('Unauthorized tool execution'));
  await check(() => expect(shared).toContainText('0 unsafe attempts · 0 unsafe executed · 0 blocked'));
  await navigateWithin('simulator');
  await assertGeneratedWorkflowUnchanged(guideWorkflow);
  // In-app navigation must expose an empty policy history without reloading the app.
  await navigateWithin('governance');
  await check(() => expect(page.getByLabel('Scenario', { exact: true })).toHaveValue('unauthorized'));
  await check(() => expect(page.getByLabel('Governance mode', { exact: true })).toHaveValue('C'));
  await check(() => expect(page.getByLabel('Deterministic seed', { exact: true })).toHaveValue('42'));
  await check(() => expect(page.locator('.event')).toHaveCount(0));
  await check(() => expect(page.getByText('No decision yet. Three logical steps reach the gateway.', { exact: true })).toBeVisible());
  await guide.getByRole('button', { name: 'Close walkthrough', exact: true }).click();
  await check(() => expect(guide).not.toBeVisible());

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
  const policyWorkflow = await populatePausedWorkflow();
  const legacy = page.locator('details.legacy-policy');
  await check(() => expect(legacy.locator('summary')).toHaveText('Separate single-request policy illustration'));
  await legacy.locator('summary').click();
  await check(() => expect(legacy).toHaveAttribute('open', ''));
  const policyStatus = legacy.getByRole('status', { name: 'Policy illustration status', exact: true });
  await check(() => expect(policyStatus).toHaveCount(1));
  await legacy.getByRole('button', { name: 'Reset', exact: true }).click();
  await legacy.getByRole('button', { name: 'Start', exact: true }).click();
  await legacy.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await policyStatus.textContent();
  await page.waitForTimeout(850);
  await check(async () => assert.equal(await policyStatus.textContent(), paused));
  await check(() => expect(policyStatus).toContainText('Paused'));
  await assertGeneratedWorkflowUnchanged(policyWorkflow);
  await legacy.getByLabel('Predefined fault').selectOption('context');
  await legacy.getByRole('button', { name: 'Inject selected fault', exact: true }).click();
  await check(() => expect(legacy.getByText('Queued override: Compromised shared context', { exact: true })).toBeVisible());
  await check(() => expect(legacy.getByText('Evaluated override: Compromised shared context', { exact: true })).toHaveCount(0));
  for (let i = 0; i < 3; i++) await legacy.getByRole('button', { name: 'Step', exact: true }).click();
  await check(() => expect(legacy.getByText('Evaluated override: Compromised shared context', { exact: true })).toBeVisible());
  await check(() => expect(legacy.getByText('Queued override: Compromised shared context', { exact: true })).toHaveCount(0));
  await check(() => expect(legacy.locator('.event')).toHaveCount(1));
  await check(() => expect(legacy.locator('.event')).toContainText('DENY'));
  await check(() => expect(legacy.locator('.event')).toContainText('Operation not executed'));
  await check(() => expect(stat('Blocked decisions', legacy)).toHaveText('1'));
  await check(() => expect(stat('Unsafe attempts', legacy)).toHaveText('1'));
  await check(() => expect(stat('Unsafe executed', legacy)).toHaveText('0'));
  await assertGeneratedWorkflowUnchanged(policyWorkflow);
  await legacy.getByRole('button', { name: 'Reset', exact: true }).click();
  await check(() => expect(stat('Blocked decisions', legacy)).toHaveText('0'));
  await check(() => expect(legacy.locator('.event')).toHaveCount(0));
  await check(() => expect(legacy.getByText('No fault override queued', { exact: true })).toBeVisible());
  await check(() => expect(policyStatus).toContainText('tick 0'));
  await legacy.getByLabel('Deterministic seed').fill('-10');
  await check(() => expect(legacy.getByLabel('Deterministic seed')).toHaveValue('0'));
  await legacy.getByLabel('Governance mode').selectOption('A');
  await check(() => expect(legacy.getByLabel('Governance mode')).toHaveValue('A'));
  await check(() => expect(policyStatus).toContainText('tick 0'));
  await assertGeneratedWorkflowUnchanged(policyWorkflow);

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
  console.log(`Built-site browser QA passed: ${assertions} checks; nine stories × three modes; direct hash refresh, explicit restart consent, legacy/workflow isolation, controls, responsive themes; no console/page errors or nonstatic requests. Screenshots: docs/screenshots/*.jpg`);
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
}
