import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { URLSearchParams } from 'node:url';
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
  const executiveHeadings = { overview: 'Delegate work. Keep control of the outcome.', simulator: 'What must stay true before we buy?', governance: 'How does a request boundary change the outcome?', hazop: 'What can depart from intended purchasing?', assurance: 'What should the team take from this case?' };
  // Fresh documents must demonstrate the real default BEFORE legacy setup.
  const assertExecutiveDefault = async route => {
    await expect(page.getByRole('radio', { name: 'Executive', exact: true })).toBeChecked(); assertions++;
    await expect(page.getByRole('heading', { level: 1, name: route.split('?')[0] === 'hazop' && new URLSearchParams(route.split('?')[1] ?? '').get('hazard') === 'APS-f47191931b96a999a61c' ? 'What could go wrong between permission and purchase?' : executiveHeadings[route.split('?')[0]], exact: true })).toBeVisible(); assertions++;
    await expect(page.locator('[data-executive-uncertainty]:visible').first()).toBeVisible(); assertions++;
  };
  const selectTechnical = async () => {
    await page.getByRole('radio', { name: 'Technical', exact: true }).check();
    await expect(page.getByRole('radio', { name: 'Technical', exact: true })).toBeChecked(); assertions++;
  };
  // goto between hash routes can retain the current document and audience.
  // Technical regression navigation must not mistake that for a fresh default.
  const go = async route => { await page.goto(`${origin}${prefix}#/${route}`); await expect(page.locator('h1')).toBeVisible(); assertions++; await selectTechnical(); };
  const freshExecutive = async route => {
    await page.goto(`${origin}${prefix}#/${route}`);
    await page.reload(); // Deliberately create a new App/AudienceProvider lifetime.
    await assertExecutiveDefault(route);
  };
  const stat = (label, scope = page) => scope.locator('.stat').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');
  // Increment only after each added check has actually completed successfully.
  const check = async verify => { await verify(); assertions++; };
  const navigationNames = { overview: /^Overview/, governance: /^Control Plane/, simulator: /^Swarm Simulator/, assurance: /^Assurance/ };
  // Hash changes commit asynchronously, while the old workflow stays mounted.
  // Wait for React's route marker before resolving controls in the new view.
  const clickNavigation = async name => {
    const link = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: typeof name === 'string' });
    await link.click();
    await check(() => expect(link).toHaveAttribute('aria-current', 'page'));
  };
  const navigateWithin = async section => {
    await clickNavigation(navigationNames[section]);
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
  // Supplementary Executive images are OUTSIDE the seven-capture gate artifact.
  const executiveShots = resolve('.harness/executive-review');
  await mkdir(executiveShots, { recursive: true });
  for (const route of ['overview', 'simulator', 'governance', 'hazop', 'assurance']) {
    await freshExecutive(route);
    await page.screenshot({ path: resolve(executiveShots, `${route}.jpg`), quality: 65 });
    const executiveRadio = page.getByRole('radio', { name: 'Executive', exact: true });
    await executiveRadio.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Technical', exact: true })).toBeFocused(); assertions++;
    await expect(page.getByRole('radio', { name: 'Technical', exact: true })).toBeChecked(); assertions++;
    await page.keyboard.press('ArrowLeft'); await expect(executiveRadio).toBeChecked(); assertions++;
    await expect(executiveRadio).toBeFocused(); assertions++;
  }
  await freshExecutive('simulator');
  await page.getByRole('button', { name: 'Step one transition', exact: true }).click();
  await selectTechnical();
  await page.getByRole('button', { name: 'Prepare current replay JSON', exact: true }).click();
  const audienceSnapshot = await page.getByRole('textbox', { name: 'Prepared replay snapshot', exact: true }).inputValue();
  const audienceStatus = await workflowStatus.innerText();
  for (const name of ['Executive', 'Technical']) {
    await page.getByRole('radio', { name, exact: true }).check();
    // The hidden technical textbox remains the SAME prepared snapshot, not a new export.
    await expect(page.getByRole('textbox', { name: 'Prepared replay snapshot', exact: true, includeHidden: true })).toHaveValue(audienceSnapshot); assertions++;
    await expect(workflowStatus).toHaveText(audienceStatus, { useInnerText: true }); assertions++;
  }
  // Persistence on hash navigation is tested WITHOUT the Technical setup helper.
  await clickNavigation(/^Assurance/);
  await expect(page.getByRole('radio', { name: 'Technical', exact: true })).toBeChecked(); assertions++;
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await clickNavigation(/^Why APS matters/);
  await expect(page.getByRole('radio', { name: 'Executive', exact: true })).toBeChecked(); assertions++;
  await page.goBack(); await expect(page.getByRole('radio', { name: 'Executive', exact: true })).toBeChecked(); assertions++;
  await page.goForward(); await expect(page.getByRole('radio', { name: 'Executive', exact: true })).toBeChecked(); assertions++;
  // ADDITIVE viewport and first-screen action acceptance. No original oracle is replaced.
  const graphGeometry = async () => page.getByLabel('Interactive procurement agent topology', { exact: true }).evaluate(graph => {
    const flow = graph.querySelector('.react-flow__renderer'); const rect = flow.getBoundingClientRect();
    const nodes = Array.from(graph.querySelectorAll('.react-flow__node')).map(node => { const r = node.getBoundingClientRect(); return { id: node.getAttribute('data-id'), x: r.x, y: r.y, right: r.right, bottom: r.bottom }; });
    return { flow: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }, nodes, transform: graph.querySelector('.react-flow__viewport').getAttribute('style') };
  });
  const assertGraphCentered = async () => check(async () => {
    await expect.poll(async () => {
      const g = await graphGeometry();
      const union = { left: Math.min(...g.nodes.map(n => n.x)), right: Math.max(...g.nodes.map(n => n.right)), top: Math.min(...g.nodes.map(n => n.y)), bottom: Math.max(...g.nodes.map(n => n.bottom)) };
      return { count: g.nodes.length, inside: g.flow.width > 0 && g.flow.height > 0 && union.left >= g.flow.x + 8 && union.right <= g.flow.right - 8 && union.top >= g.flow.y + 8 && union.bottom <= g.flow.bottom - 8, centered: Math.abs((union.left + union.right - g.flow.x - g.flow.right) / 2) <= 2 && Math.abs((union.top + union.bottom - g.flow.y - g.flow.bottom) / 2) <= 2 };
    }).toEqual({ count: 8, inside: true, centered: true });
  });
  const settleViewportFrames = async () => page.evaluate(() => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
  const assertViewportRetained = async before => check(async () => { await settleViewportFrames(); assert.equal((await graphGeometry()).transform, before); });
  await page.setViewportSize({ width: 1280, height: 720 }); await freshExecutive('overview');
  await selectTechnical(); await assertGraphCentered(); // First reveal; no Fit View correction first.
  const graph = page.getByLabel('Interactive procurement agent topology', { exact: true });
  for (const label of ['Zoom In', 'Zoom Out']) {
    await graph.getByRole('button', { name: label, exact: true }).click(); const zoomed = (await graphGeometry()).transform;
    await page.getByRole('radio', { name: 'Executive', exact: true }).check(); await selectTechnical(); await assertViewportRetained(zoomed);
    await page.setViewportSize({ width: 1200, height: 720 }); await assertViewportRetained(zoomed);
    await page.setViewportSize({ width: 1280, height: 720 }); await assertViewportRetained(zoomed);
    await graph.getByRole('button', { name: 'Fit View', exact: true }).click(); await assertGraphCentered();
  }
  await graph.scrollIntoViewIfNeeded();
  const paneBox = await graph.locator('.react-flow__pane').boundingBox(); assert.ok(paneBox);
  await page.mouse.move(paneBox.x + 20, paneBox.y + 20); const beforePan = (await graphGeometry()).transform;
  await page.mouse.down(); await page.mouse.move(paneBox.x + 50, paneBox.y + 40, { steps: 5 }); await page.mouse.up(); await settleViewportFrames();
  const panned = (await graphGeometry()).transform; await check(() => assert.notEqual(panned, beforePan));
  await page.setViewportSize({ width: 1200, height: 720 }); await assertViewportRetained(panned);
  await page.getByRole('radio', { name: 'Executive', exact: true }).check(); await selectTechnical(); await assertViewportRetained(panned);
  await graph.scrollIntoViewIfNeeded(); const wheelBox = await graph.locator('.react-flow__pane').boundingBox(); assert.ok(wheelBox);
  await page.mouse.move(wheelBox.x + 20, wheelBox.y + 20); await page.mouse.wheel(0, -120); await settleViewportFrames();
  const wheeled = (await graphGeometry()).transform; await check(() => assert.notEqual(wheeled, panned));
  await page.setViewportSize({ width: 1280, height: 720 }); await assertViewportRetained(wheeled);
  await graph.getByRole('button', { name: 'Fit View', exact: true }).click(); await assertGraphCentered();
  await graph.getByRole('button', { name: 'Zoom In', exact: true }).focus(); await page.keyboard.press('Space');
  const keyboardZoomed = (await graphGeometry()).transform;
  await page.setViewportSize({ width: 1200, height: 720 }); await assertViewportRetained(keyboardZoomed);
  await graph.getByRole('button', { name: 'Fit View', exact: true }).click(); await assertGraphCentered();
  await page.setViewportSize({ width: 900, height: 720 }); await assertGraphCentered();
  await page.setViewportSize({ width: 320, height: 720 }); await assertGraphCentered();
  await page.getByRole('radio', { name: 'Executive', exact: true }).check(); await selectTechnical(); await assertGraphCentered();
  await go('simulator'); await go('overview'); await assertGraphCentered(); // Supported navigation/return, no invented audience URL.
  const assertInitialActions = async () => check(async () => {
    const controls = [page.getByLabel('Question to examine', { exact: true }), page.getByRole('button', { name: 'Apply selection and start new run', exact: true }), page.getByRole('button', { name: 'Start workflow', exact: true })];
    for (const control of controls) {
      const box = await control.evaluate(element => { const r = element.getBoundingClientRect(); const chrome = document.querySelector('.audience-bar').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, unobscured: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === element, belowChrome: r.top >= chrome.bottom }; });
      assert.ok(box.top >= 0 && box.bottom <= 720 && box.belowChrome && box.unobscured, 'initial Executive question/Apply/Start must fit and be unobscured without reviewer scrolling');
    }
  });
  await page.setViewportSize({ width: 1280, height: 720 }); await freshExecutive('simulator'); await assertInitialActions();
  await freshExecutive('overview'); await page.getByRole('link', { name: 'Open the purchasing workspace', exact: true }).click(); await assertInitialActions();
  // END ADDITIVE viewport and first-screen action acceptance.
  // ADDITIVE Executive narrative: context-specific default headings and memory-only discussion.
  for (const target of ['hazop', 'hazop?hazard=APS-f47191931b96a999a61c', 'hazop?hazard=APS-758a4efe3266c2f560e4', 'hazop?hazard=not-a-finding']) await freshExecutive(target);
  await freshExecutive('assurance');
  const discussionDraft = page.getByRole('region', { name: 'Non-binding discussion draft', exact: true });
  await check(() => expect(discussionDraft).toContainText('No purchasing decision observed; these positions are hypotheses.'));
  await discussionDraft.getByRole('radio', { name: 'More evidence before a recommendation', exact: true }).check();
  await check(() => expect(discussionDraft).toContainText('not an approval or a validated recommendation'));
  await clickNavigation('How controls work');
  await page.getByRole('button', { name: 'Reset workflow and clear history', exact: true }).click();
  await clickNavigation('What leaders decide');
  await check(() => expect(discussionDraft).toContainText('The run has changed—review this draft again.'));
  await discussionDraft.getByRole('radio', { name: 'More evidence before a recommendation', exact: true }).press('Space');
  await check(() => expect(discussionDraft).not.toContainText('The run has changed—review this draft again.'));
  await page.reload(); await assertExecutiveDefault('assurance');
  await check(() => expect(discussionDraft.getByRole('radio', { name: 'More evidence before a recommendation', exact: true })).not.toBeChecked());
  // END ADDITIVE Executive narrative.
  // ADDITIVE Operations/HAZOP journey. Original Technical/default journeys remain below.
  await freshExecutive('overview');
  const recommendation = page.getByRole('region', { name: 'HAZOP recommendation', exact: true });
  await check(() => expect(recommendation).toContainText('does not execute a stop or prove safety'));
  await check(() => expect(recommendation.getByRole('link', { name: 'Open the purchasing workspace', exact: true })).toBeVisible());
  await check(() => expect(recommendation.getByRole('link', { name: 'Inspect the technical mechanism', exact: true })).toBeVisible());
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const name of ['Executive', 'Technical']) await check(async () => {
    const unobscured = await page.getByRole('radio', { name, exact: true }).evaluate(input => {
      const label = input.closest('label'); const box = label.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('label') === label;
    });
    assert.equal(unobscured, true, `${name} audience label must not be occluded`);
  });
  await recommendation.getByRole('link', { name: 'Open the purchasing workspace', exact: true }).click();
  const operations = page.getByRole('region', { name: 'Purchasing operations', exact: true });
  const records = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await check(() => expect(operations).toBeVisible());
  await check(() => expect(workflowStatus).toContainText('0 transitions'));
  const taskRecordName = await operations.getByRole('button', { name: /^Open task / }).innerText();
  await operations.getByRole('button', { name: taskRecordName, exact: true }).click();
  await check(() => expect(operations.getByRole('region', { name: 'Selected purchasing record', exact: true })).toContainText(taskRecordName.slice('Open task '.length)));
  await selectTechnical(); const operationsInitial = await captureGeneratedWorkflow();
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  for (const name of ['How controls work', 'What leaders decide', 'Why APS matters']) await clickNavigation(name);
  await clickNavigation('How controls work');
  await check(() => expect(operations.getByText('No quote prepared yet.', { exact: true })).toBeVisible());
  await check(() => expect(operations.getByText('No simulated permission issued.', { exact: true })).toBeVisible());
  await check(() => expect(operations.getByText('Related timing finding—different object/coverage', { exact: true })).toBeVisible());
  await records.getByRole('link', { name: 'Why APS matters', exact: true }).focus(); await page.keyboard.press('Tab');
  await check(() => expect(records.getByRole('link', { name: 'How controls work', exact: true })).toBeFocused());
  await page.keyboard.press('Shift+Tab'); await check(() => expect(records.getByRole('link', { name: 'Why APS matters', exact: true })).toBeFocused());
  await selectTechnical(); await assertGeneratedWorkflowUnchanged(operationsInitial);
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await page.getByLabel('Question to examine', { exact: true }).selectOption('approval-delay');
  await selectTechnical(); await assertGeneratedWorkflowUnchanged(operationsInitial);
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await page.getByRole('button', { name: 'Apply selection and start new run', exact: true }).click();
  // Explicit Start/Pause do not constitute a commitment or a new authority.
  await page.getByRole('button', { name: 'Start workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Pause workflow', exact: true }).click();
  await check(() => expect(workflowStatus).toContainText('paused'));
  await page.getByRole('button', { name: 'Reset workflow and clear history', exact: true }).click();
  await check(() => expect(workflowStatus).toContainText('0 transitions'));
  const operationsBoundary = async () => {
    const step = page.getByRole('button', { name: 'Step one transition', exact: true });
    for (let i = 0; i < 100 && await step.isEnabled(); i++) await step.click();
    await check(() => expect(step).toBeDisabled());
  };
  await operationsBoundary();
  await clickNavigation('How controls work');
  await check(() => expect(operations.getByRole('button', { name: /^Open permission / })).toHaveCount(1));
  await operations.getByRole('button', { name: /^Open permission / }).click();
  await clickNavigation('How controls work');
  const blockedEventIdentity = await page.getByRole('region', { name: 'Approval refresh decision', exact: true }).locator('.text-button').innerText();
  await operations.getByRole('button', { name: `Open exception ${blockedEventIdentity}`, exact: true }).click();
  await operations.getByRole('region', { name: 'Selected purchasing record', exact: true }).getByRole('button', { name: 'Review exception design', exact: true }).click();
  const designReview = operations.getByRole('region', { name: 'HAZOP design review', exact: true });
  await check(() => expect(designReview.getByText('Related timing finding—different object/coverage', { exact: true })).toBeVisible());
  await check(() => expect(designReview).toContainText('expired QUOTATION'));
  await check(() => expect(designReview).toContainText('expires an APPROVAL'));
  await selectTechnical(); const blockedOperations = await captureGeneratedWorkflow();
  await check(() => assert.equal(blockedOperations.orders, '0')); await check(() => assert.equal(blockedOperations.spent, '0'));
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await designReview.getByRole('button', { name: 'Next review question', exact: true }).click();
  await selectTechnical(); await assertGeneratedWorkflowUnchanged(blockedOperations);
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await page.getByRole('button', { name: 'Request one approval refresh', exact: true }).click(); await operationsBoundary();
  await selectTechnical(); await check(() => expect(stat('Committed orders')).toHaveText('1')); await check(() => expect(stat('Safe model completion')).toHaveText('Yes'));
  for (const mode of ['A', 'B']) {
    await page.getByLabel('Workflow comparator', { exact: true }).selectOption(mode);
    await page.getByRole('button', { name: 'Apply selection and start new run', exact: true }).click(); await operationsBoundary();
    await check(() => expect(stat('Task confirmed')).toHaveText('Yes')); await check(() => expect(stat('Safe model completion')).toHaveText('No'));
    await check(() => expect(stat('Unsafe committed effects')).toHaveText('1')); await check(() => expect(page.getByRole('button', { name: 'Request one approval refresh', exact: true })).toHaveCount(0));
  }
  await page.getByLabel('Workflow scenario', { exact: true }).selectOption('lost-purchase-response');
  await page.getByLabel('Workflow comparator', { exact: true }).selectOption('C');
  await page.getByRole('button', { name: 'Apply selection and start new run', exact: true }).click(); await operationsBoundary();
  await check(() => expect(stat('Committed orders')).toHaveText('1')); await check(() => expect(stat('Task confirmed')).toHaveText('No'));
  await page.getByRole('radio', { name: 'Executive', exact: true }).check(); await clickNavigation('What leaders decide');
  const existingOrderName = await operations.getByRole('button', { name: /^Open order / }).innerText();
  await operations.getByRole('button', { name: existingOrderName, exact: true }).click();
  await operations.getByRole('region', { name: 'Selected purchasing record', exact: true }).getByRole('button', { name: 'Inspect technical evidence', exact: true }).click();
  await check(() => expect(page.getByRole('region', { name: 'Causal event inspector', exact: true })).toContainText('order committed'));
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await page.getByRole('button', { name: 'Reconcile existing order once', exact: true }).click(); await operationsBoundary();
  await clickNavigation('What leaders decide'); await check(() => expect(operations.getByRole('button', { name: existingOrderName, exact: true })).toHaveCount(1));
  await clickNavigation('How controls work');
  await selectTechnical(); await check(() => expect(stat('Committed orders')).toHaveText('1')); await check(() => expect(stat('Task confirmed')).toHaveText('Yes'));
  await page.getByRole('radio', { name: 'Executive', exact: true }).check();
  await page.screenshot({ path: resolve(executiveShots, 'operations-records.jpg'), quality: 65 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  // END ADDITIVE Operations/HAZOP journey.
  await mkdir(screenshots, { recursive: true });
  for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
    await go(route); await page.reload(); await expect(page.locator('h1')).toBeVisible(); await assertExecutiveDefault(route); await selectTechnical();
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
    await check(() => expect(page.locator('.event')).toHaveText(retainedDecision, { useInnerText: true }));
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
  await assertExecutiveDefault('hazop'); await selectTechnical();
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
  await check(() => expect(legacy.locator(':scope > summary')).toHaveText('Separate single-request policy illustration'));
  await legacy.locator(':scope > summary').click();
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
  // Audience learning journey: computed comparison is isolated from the active run.
  await freshExecutive('overview');
  await page.getByRole('button', { name: 'Control the commitment', exact: true }).click();
  await check(() => expect(page.locator('.learning-story')).toContainText('modeled control can stop an expired approval'));
  await clickNavigation('How controls work');
  await page.getByLabel('Question to examine', { exact: true }).selectOption('approval-delay');
  await page.getByRole('button', { name: 'Apply selection and start new run', exact: true }).click();
  const untouchedStatus = await workflowStatus.innerText();
  await page.getByRole('button', { name: 'Run matched comparison', exact: true }).click();
  const comparison = page.getByRole('region', { name: 'Matched workflow comparison', exact: true });
  await check(() => expect(comparison.getByRole('table').locator('tbody tr')).toHaveCount(3));
  await check(() => expect(comparison.getByRole('table').locator('tbody tr').last()).toContainText('Fresh approval needed'));
  await check(() => expect(workflowStatus).toHaveText(untouchedStatus));
  await clickNavigation('What leaders decide');
  const brief = page.getByRole('region', { name: 'Leadership decision brief', exact: true });
  await brief.getByLabel('Proposed accountable role').fill('Procurement process owner');
  await check(() => expect(brief).toContainText('confirmation not established'));
  await check(() => expect(brief).toContainText('No person is assigned or approval issued'));
  await check(() => expect(brief.getByRole('button', { name: 'Print leadership brief' })).toBeVisible());
  await page.emulateMedia({ media: 'print' });
  await check(() => expect(brief.locator('.brief-print')).toContainText('Procurement process owner'));
  await check(() => expect(brief.getByRole('button', { name: 'Print leadership brief' })).toBeHidden());
  await page.emulateMedia({ media: 'screen' });
  await go('overview');
  await check(() => expect(page.getByRole('region', { name: 'Technical orientation' })).toContainText('Three models. Three different kinds of evidence.'));
  await go('hazop');
  await check(() => expect(page.getByRole('region', { name: 'Worked hazard to control example' })).toContainText('Direct source finding'));
  await go('assurance');
  await check(() => expect(page.getByRole('region', { name: 'Evidence claims and reproduction' })).toContainText('aggregate counts alone'));
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
  await page.reload(); await assertExecutiveDefault('assurance'); await selectTechnical(); await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('dark');
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
