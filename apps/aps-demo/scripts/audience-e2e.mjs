import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { URLSearchParams } from 'node:url';
/* global document, window */

// Exercise the actual publish directory at its Pages prefix. A successful
// result names completed journeys and the captures produced by this run.
const prefix = '/agentic-process-safety/';
const dist = resolve('apps/aps-demo/dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(prefix));
    const file = resolve(dist, pathname.slice(prefix.length) || 'index.html');
    assert.ok(file.startsWith(dist + sep));
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

const engine = process.env.APS_BROWSER || (process.platform === 'darwin' ? 'firefox' : 'chromium');
assert.ok(['chromium', 'firefox'].includes(engine), 'Set APS_BROWSER to chromium or firefox');
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(process.env.PLAYWRIGHT_BROWSERS_PATH || '.harness/playwright');
const { chromium, firefox, expect } = await import('@playwright/test');
const errors = [];
const violations = [];
const checks = [];
const screenshots = [];
let browser;
try {
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  const site = 'http://127.0.0.1:' + server.address().port + prefix;
  browser = await ({ chromium, firefox })[engine].launch({ headless: true });
  console.log('Testing the built purchasing case with ' + engine + ' ' + browser.version());
  await mkdir('docs/screenshots', { recursive: true });

  async function context(options = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce', ...options });
    await ctx.route('**/*', route => {
      const request = route.request();
      if (!request.url().startsWith(site) || ['xhr', 'fetch', 'websocket', 'eventsource'].includes(request.resourceType())) {
        violations.push(request.resourceType() + ' ' + request.url());
        return route.abort();
      }
      return route.continue();
    });
    ctx.on('page', opened => {
      opened.on('pageerror', error => errors.push(error.message));
      opened.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      opened.on('websocket', socket => violations.push(socket.url()));
      opened.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
    });
    return ctx;
  }
  const interactive = await context();
  const page = await interactive.newPage();
  const button = name => page.getByRole('button', { name, exact: true });
  const heading = name => page.getByRole('heading', { name, exact: true });
  const link = name => page.getByRole('link', { name, exact: true });
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  async function check(name, task) {
    await task();
    checks.push(name);
  }
  async function capture(name, target, fullPage = false) {
    if (target) await target.evaluate(element => element.scrollIntoView({ block: 'start' }));
    const path = 'docs/screenshots/' + name + '.jpg';
    await page.screenshot({ path, fullPage, quality: 75 });
    screenshots.push(path);
  }
  async function fitsViewport(view) {
    assert.ok(await view.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Horizontal page overflow at ' + view.url());
  }

  await check('opening-and-scope', async () => {
    await page.goto(site);
    await expect(heading('The bearings are due Thursday.')).toBeVisible();
    await expect(page.locator('.case-order')).toContainText('24 bearings');
    await expect(page.locator('.case-order')).toContainText('300 simulated spend units');
    await expect(page.getByRole('heading', { name: 'What would you do?', exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('heading', { name: /line managers|executives|professors/i })).toHaveCount(0);
    const chapters = page.locator('.case-story > section > h2');
    await expect(chapters).toHaveText([
      'How the bearings reach the line', 'What changes while the request waits?',
      'How HAZOP examines a late release', 'One second changes the order',
      'Would an agent earn its place?', 'What would you do?',
    ]);
    const workflow = page.getByRole('list', { name: 'Buyer-led purchasing workflow' });
    await expect(workflow.getByRole('listitem').locator('strong')).toHaveText([
      'Plan the requirement', 'Agree the terms', 'Place the order', 'Receive the bearings',
    ]);
    const problem = page.getByRole('region', { name: 'What changes while the request waits?' });
    await expect(problem).toContainText('REQ-218');
    const beforeRelease = problem.getByRole('list', { name: 'Before release' });
    await expect(beforeRelease.getByRole('listitem').locator('strong')).toHaveText(['Finance approves', 'The request waits']);
    for (const name of ['If the order goes out', 'If the order waits']) {
      const branch = problem.getByRole('region', { name, exact: true });
      await expect(branch).toBeVisible();
      await expect(branch.getByRole('term')).toHaveText(['Buyer', 'Assembly line']);
    }
    await expect(problem.locator('.bearing-slots > span')).toHaveCount(24);
    await expect(problem.getByText('How often does this happen today?', { exact: true })).toBeVisible();
    await expect(problem).toContainText(/requests still on hold/i);
    await theme.selectOption('light');
    await capture('case-opening', null);
    const stock = problem.getByRole('status');
    const empty = problem.getByRole('button', { name: 'No bearings available', exact: true });
    const full = problem.getByRole('button', { name: '24 bearings available', exact: true });
    await expect(stock).toContainText('Availability unknown');
    await expect(empty).toHaveAttribute('aria-pressed', 'false');
    await expect(full).toHaveAttribute('aria-pressed', 'false');
    for (const [choice, other, key, amount] of [[empty, full, 'Enter', '0 of 24'], [full, empty, 'Space', '24 of 24']]) {
      await choice.focus();
      await page.keyboard.press(key);
      await expect(choice).toBeFocused();
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await expect(other).toHaveAttribute('aria-pressed', 'false');
      await expect(stock).toContainText(amount);
    }
    await page.keyboard.press('Enter');
    await expect(stock).toContainText('Availability unknown');
    await expect(full).toHaveAttribute('aria-pressed', 'false');
    const hazop = page.getByRole('region', { name: 'How HAZOP examines a late release' });
    await expect(hazop).toContainText('REQ-218');
    await expect(hazop).toContainText('Q-82');
    await expect(hazop).toContainText(/Tuesday.{0,10}14:00/);
    await expect(hazop).toContainText('24 bearings');
    await expect(hazop).toContainText(/Thursday.{0,12}08:00/);
    await expect(hazop).toContainText('REF-008');
    await expect(hazop).toContainText('LATE');
    await expect(hazop).toContainText(/quot(e|ation)/i);
    await expect(hazop).toContainText(/finance approval/i);
    await expect(hazop.getByRole('term')).toHaveText(['Intended operation', 'Cause and consequence', 'Proposed action']);
  });

  const lanes = page.locator('.release-lanes dd');
  await check('approval-boundary', async () => {
    const release = page.getByRole('region', { name: 'One second changes the order' });
    await expect(release).toContainText('REQ-218');
    await expect(release).toContainText('Q-82');
    await expect(release).toContainText(/60 (?:logical )?seconds/);
    await expect(release).toContainText(/Thursday.{0,12}08:00/);
    const hazop = page.getByRole('region', { name: 'How HAZOP examines a late release' });
    const beforeCutoff = hazop.getByRole('button', { name: 'Tuesday 13:55' });
    const afterCutoff = hazop.getByRole('button', { name: 'Tuesday 14:05' });
    const buyer = release.getByRole('region', { name: 'Buyer handoff for REQ-218' });
    await expect(buyer).toContainText(/actual receipts and reserved stock/i);
    await expect(beforeCutoff).toHaveAttribute('aria-pressed', 'true');
    await expect(release).toContainText('Q-82 is current');
    await expect(buyer).toContainText('Availability unknown');
    await expect(button('60 seconds')).toHaveAttribute('aria-pressed', 'true');
    await expect(lanes).toHaveText(['Release', 'Hold']);
    const refreshTerms = /updated terms from the supplier/i;
    for (const [releaseTime, otherTime, quote, supplierCheck] of [
      [beforeCutoff, afterCutoff, 'Q-82 is current', { Release: /accepted Q-82 by its cutoff/i, Hold: /how long the supplier will honor Q-82/i }],
      [afterCutoff, beforeCutoff, 'Q-82 has expired', { Release: refreshTerms, Hold: refreshTerms }],
    ]) {
      await releaseTime.focus();
      await page.keyboard.press('Space');
      await expect(releaseTime).toHaveAttribute('aria-pressed', 'true');
      await expect(otherTime).toHaveAttribute('aria-pressed', 'false');
      await expect(hazop.getByRole('status')).toContainText(quote);
      for (const [age, result] of [[59, 'Release'], [60, 'Hold'], [61, 'Hold']]) {
        const control = button(age + ' seconds');
        await control.focus();
        await page.keyboard.press('Enter');
        await expect(control).toHaveAttribute('aria-pressed', 'true');
        await expect(lanes).toHaveText(['Release', result]);
        await expect(release).toContainText(quote);
        await expect(buyer).toContainText(supplierCheck[result]);
        await expect(buyer).toContainText(result === 'Release' ? /supplier’s acknowledgment/i : /fresh authority/i);
        await expect(page.getByRole('list', { name: 'Purchase handoff' })).toContainText(age + ' seconds elapse');
      }
    }
    // A change in receiving evidence reaches the buyer but cannot grant purchasing authority.
    for (const [choice, reading, action] of [
      ['No bearings available', '0 of 24', /another source or assembly slot/i],
      ['24 bearings available', '24 of 24', /confirm the allocation/i],
    ]) {
      await button(choice).click();
      await expect(buyer).toContainText(reading);
      await expect(buyer).toContainText(action);
      await expect(lanes).toHaveText(['Release', 'Hold']);
      await expect(release).toContainText('Q-82 has expired');
    }
    await button('24 bearings available').click();
    await expect(buyer).toContainText('Availability unknown');
    await beforeCutoff.click();
    await expect(release).toContainText('Q-82 is current');
    await expect(lanes).toHaveText(['Release', 'Hold']);
    await button('60 seconds').click();
    await capture('approval-boundary', heading('One second changes the order'));
  });

  await check('investment-sensitivity', async () => {
    const finance = page.getByRole('region', { name: 'Would an agent earn its place?' });
    const orderTime = finance.locator('.order-time');
    const rows = page.locator('.value-row');
    await expect(rows.locator('strong')).toHaveText(['−$2,400', '$0', '+$2,400']);
    for (const [age, outcome, task, equation] of [
      [60, 'REQ-218 · Held', /open orders and incoming stock/i, '12 − 2 − 7 = 3 min'],
      [59, 'REQ-218 · Released', /supplier acknowledgment, price and arrival/i, '12 − 2 − 4 = 6 min'],
    ]) {
      await button(age + ' seconds').click();
      await expect(orderTime).toContainText(outcome);
      await expect(orderTime).toContainText(task);
      await expect(orderTime).toContainText(equation);
      await expect(button('4.5 minutes saved')).toHaveAttribute('aria-pressed', 'true');
    }
    const [loss, zero, gain] = await rows.locator('.value-track').evaluateAll(tracks => tracks.map(track => {
      const axis = track.getBoundingClientRect();
      const mark = track.querySelector('.value-bar');
      const bar = mark.getBoundingClientRect();
      const dot = window.getComputedStyle(mark, '::after');
      const dotWidth = parseFloat(dot.width);
      return {
        midpoint: axis.left + axis.width / 2, left: bar.left, right: bar.right,
        dotCenter: bar.left + parseFloat(dot.left) + dotWidth / 2,
        dotVisible: dot.content !== 'none' && dotWidth > 1 && parseFloat(dot.height) > 1
          && dot.backgroundColor !== 'rgba(0, 0, 0, 0)' && dot.visibility === 'visible',
      };
    }));
    // A subpixel allowance accommodates rounding of percentage-positioned marks.
    const centered = (position, midpoint) => Math.abs(position - midpoint) <= 1;
    assert.ok(loss.left < loss.midpoint - 1 && centered(loss.right, loss.midpoint), 'Loss extends left from zero');
    assert.ok(gain.right > gain.midpoint + 1 && centered(gain.left, gain.midpoint), 'Gain extends right from zero');
    assert.ok(centered(zero.left, zero.midpoint) && zero.right === zero.left, 'Break-even has zero signed length');
    assert.ok(zero.dotVisible && centered(zero.dotCenter, zero.midpoint), 'Visible break-even point is centered on zero');
    for (const [minutes, percentHeld, net, hours] of [[3, 100, '−$2,400', 10], [4.5, 50, '$0', 15], [6, 0, '+$2,400', 20]]) {
      const control = button(minutes + ' minutes saved');
      await control.focus();
      await page.keyboard.press('Space');
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(control).toContainText(percentHeld + '% held');
      await expect(page.locator('.value-reading')).toContainText('With ' + percentHeld + '% held');
      await expect(page.locator('.value-reading')).toContainText(net);
      await expect(page.locator('.value-reading')).toContainText(hours + ' buyer hours per month');
      await expect(orderTime).toContainText('12 − 2 − 4 = 6 min');
    }
    await capture('investment-sensitivity', heading('Would an agent earn its place?'));
  });

  await check('universal-decision', async () => {
    const decision = page.getByRole('region', { name: 'What would you do?' });
    const record = decision.locator('.decision-record');
    await expect(record).toContainText('REQ-218 · Released');
    await expect(record).toContainText('6 minutes freed on this example');
    await expect(record).toContainText('0% held');
    const evidence = decision.getByRole('region', { name: 'What would justify a pilot?' });
    for (const item of [/including open holds/i, /first release attempt/i, /count each request once and track buyer work through resolution/i,
      /buyer time records/i, /receipts to each need date/i, /existing purchasing system/i, /separately priced shadow pilot/i,
      /4\.5 minutes saved per request against today’s buyer-led process/i, /stop the pilot/i]) {
      await expect(evidence).toContainText(item);
    }
    const response = page.locator('.choice-response');
    for (const [option, outcome] of [
      ['Keep buyer-led purchasing', /buyer to check authority/i],
      ['Add the approval check', /route each hold to a named buyer/i],
      ['Run a shadow pilot', /buyers keep authority/i],
    ]) {
      await button(option).click();
      await expect(button(option)).toHaveAttribute('aria-pressed', 'true');
      await expect(response).toContainText(outcome);
    }
    await expect(response).toContainText('+$2,400');
    await expect(response).toContainText(/released orders like REQ-218/i);
    await expect(response).toContainText(/Pause for any recommendation to release on expired authority/i);
    await button('3 minutes saved').click();
    await expect(response).toContainText('−$2,400');
    await button('Tuesday 14:05').click();
    await button('No bearings available').click();
    await button('60 seconds').click();
    await expect(record).toContainText('REQ-218 · Held');
    await expect(record).toContainText('3 minutes freed on this example');
    await expect(record).toContainText('100% held');
    await expect(record).toContainText(/Q-82.{0,20}expired/i);
    await expect(record).toContainText(/0 of 24/);
    await expect(button('3 minutes saved')).toHaveAttribute('aria-pressed', 'true');
    await expect(button('Run a shadow pilot')).toHaveAttribute('aria-pressed', 'true');
    await expect(response).toContainText('−$2,400');
    await expect(response).toContainText(/held orders like REQ-218/i);
    await capture('case-decision', heading('What would you do?'));
  });

  const traceOn = view => view.getByRole('region', { name: 'Trace REQ-218 through APS' });
  const selectedTrace = traceOn(page);
  function workspaceHash(age, quote, stock, trial) {
    return '#/overview?' + new URLSearchParams({ age: String(age), quote, stock: String(stock), trial: String(trial) });
  }
  async function verifySelectedTrace(age, view = page) {
    const trace = traceOn(view);
    const allowed = age < 60;
    await expect(trace).toBeVisible();
    await expect(trace.getByRole('heading', { level: 3 })).toHaveText(['Request', 'Policy check', 'Illustrative receipt']);
    await expect(trace).toContainText('Tuesday 14:05');
    await expect(trace).toContainText(/Q-82.{0,20}expired/i);
    await expect(trace).toContainText('0 of 24');
    const stages = trace.getByRole('list', { name: 'Selected purchase trace' }).getByRole('listitem');
    const request = stages.filter({ has: view.getByRole('heading', { name: 'Request', exact: true }) });
    await expect(request).toContainText('purchase_mock');
    await expect(request).toContainText('REQ-218');
    await expect(request).toContainText('300 simulated spend units');
    await expect(request).toContainText('bearings-' + age);
    const policy = stages.filter({ has: view.getByRole('heading', { name: 'Policy check', exact: true }) });
    await expect(policy.locator('.freshness-result code')).toHaveText(age + ' < 60');
    await expect(policy.locator('.freshness-result strong')).toHaveText(allowed ? 'pass' : 'fail');
    const receiptStage = stages.filter({ has: view.getByRole('heading', { name: 'Illustrative receipt', exact: true }) });
    await expect(receiptStage).toContainText('unsigned excerpt');
    await expect(receiptStage).toContainText('Orders 0 → ' + (allowed ? 1 : 0) + ' · Spend 0 → ' + (allowed ? 300 : 0) + ' units');
    const receipt = JSON.parse(await trace.locator('.selected-receipt').innerText());
    assert.equal(receipt.task_id, 'REQ-218');
    assert.equal(receipt.action, 'purchase_mock');
    assert.equal(receipt.decision, allowed ? 'allow' : 'deny');
    assert.equal(receipt.reason, allowed ? 'policy_allow' : 'approval_invalid');
    assert.equal(receipt.executed, allowed);
    assert.equal(receipt.cached, false);
  }
  async function verifyTrialComparison(sequence, caseAge, view = page) {
    const comparison = view.getByRole('table', { name: 'REQ-218 compared with trial ' + sequence });
    const caseAllowed = caseAge < 60;
    const trialAllowed = sequence === 14;
    for (const [name, caseValue, trialValue] of [
      ['Approval age', caseAge + ' seconds', '61 seconds'],
      ['Decision', caseAllowed ? 'allow' : 'deny', trialAllowed ? 'allow' : 'deny'],
      ['Adapter executed', String(caseAllowed), String(trialAllowed)],
    ]) {
      const row = comparison.getByRole('row').filter({ has: view.getByRole('rowheader', { name, exact: true }) });
      await expect(row.getByRole('cell')).toHaveText([caseValue, trialValue]);
    }
  }

  await check('implementation-workspace', async () => {
    const initialHash = workspaceHash(60, '14:05', 0, 15);
    await expect(link('Technical workspace')).toHaveAttribute('href', initialHash);
    await expect(link('See how to implement the check')).toHaveAttribute('href', initialHash);
    await link('See how to implement the check').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(site + initialHash);
    await expect(page).toHaveTitle('IT implementation | Agentic Process Safety');
    await expect(heading('Implement the purchase check')).toBeVisible();
    await verifySelectedTrace(60);
    await expect(page.locator('.implementation-flow > li')).toHaveCount(4);
    const matrix = page.getByRole('table', { name: 'Expected outcomes for a new purchase attempt' });
    await expect(matrix.getByRole('row', { name: /59 seconds/ })).toContainText(/allow/i);
    await expect(matrix.getByRole('row', { name: /60 or 61 seconds/ })).toContainText(/deny/i);
    await expect(matrix.getByRole('row', { name: /supplier or amount/i })).toContainText(/mismatch/i);
    const evidence = page.getByRole('region', { name: 'Inspect the recorded purchase calls' });
    const recordIds = evidence.getByText('Inspect record identifiers', { exact: true });
    await recordIds.click();
    await expect(button('C · Trial 15')).toHaveAttribute('aria-pressed', 'true');
    const experiment = JSON.parse(await readFile(new URL('../src/fixtures/experiment.json', import.meta.url), 'utf8'));
    for (const sequence of [14, 15]) {
      const trial = experiment.trials.find(item => item.sequence === sequence);
      const call = trial.calls.find(item => item.action === 'purchase_mock');
      const finance = trial.calls.find(item => item.action === 'finance_mock');
      const recordedAge = call.logical_time_seconds - finance.logical_time_seconds;
      const option = button(trial.configuration + ' · Trial ' + sequence);
      await option.focus();
      await page.keyboard.press('Enter');
      await expect(option).toHaveAttribute('aria-pressed', 'true');
      await expect(page).toHaveURL(site + workspaceHash(60, '14:05', 0, sequence));
      await expect(evidence).toContainText('approval was ' + recordedAge + ' seconds old');
      await verifyTrialComparison(sequence, 60);
      await verifySelectedTrace(60);
      const fields = evidence.locator('.trace-fields');
      for (const [name, expected] of [
        ['Decision', call.decision], ['Adapter executed', String(call.executed)],
        ['Cached result', String(call.cached)], ['Oracle violation', call.violations.join(', ')],
        ['Unsafe mutations / attempts', trial.outcome.unsafe_mutations + ' / ' + trial.outcome.attack_attempts],
      ]) {
        const row = fields.locator('div').filter({ has: page.getByText(name, { exact: true }) });
        await expect(row.locator('dd')).toHaveText(expected);
      }
      await expect(evidence.getByText(trial.hash, { exact: true })).toBeVisible();
      await expect(evidence.getByText(trial.case_digest, { exact: true })).toBeVisible();
    }
    const mapping = evidence.locator('details').filter({ has: page.getByText('Trace the HAZOP finding to the control', { exact: true }) });
    await mapping.locator('summary').click();
    for (const id of ['REF-008', 'REQ-5b896505bc8f53415e95', 'CTL-EXPIRY']) {
      await expect(mapping).toContainText(id);
    }
    await page.getByText('Inspect the request and policy contract', { exact: true }).click();
    const contract = selectedTrace.locator('.implementation-contract');
    const envelope = JSON.parse(await contract.locator('pre').first().innerText());
    assert.equal(envelope.request_id, 'bearings-60');
    assert.equal(envelope.task_id, 'REQ-218');
    assert.equal(envelope.action, 'purchase_mock');
    await expect(contract.locator('pre').filter({ hasText: 'approval_invalid' })).toContainText('input.approval_ok');
    await page.getByText('Verify the control in the repository', { exact: true }).click();
    await expect(link('gateway')).toHaveAttribute('href', /\/docs\/GOVERNANCE_ARCHITECTURE\.md#request-to-effect-protocol$/);
    await expect(link('purchase policy')).toHaveAttribute('href', /\/policies\/v1\/procurement\.rego$/);
    await expect(link('expiry tests')).toHaveAttribute('href', /\/tests\/test_purchase_expiry\.py$/);
    await expect(page.locator('.implementation-verification pre')).toContainText('unittest discover');
    await capture('implementation', null, true);
  });

  await check('chapter-return', async () => {
    // Compare both sides of expiry against the same frozen 61-second purchase.
    for (const age of [59, 61]) {
      await selectedTrace.getByRole('link', { name: 'Change the release timing' }).click();
      await expect(heading('One second changes the order')).toBeFocused();
      await button(age + ' seconds').click();
      await link('See how to implement the check').click();
      await expect(page).toHaveURL(site + workspaceHash(age, '14:05', 0, 15));
      await verifySelectedTrace(age);
      await verifyTrialComparison(15, age);
      await expect(page.getByRole('region', { name: 'Inspect the recorded purchase calls' })).toContainText('approval was 61 seconds old');
    }
    await link('Return to case').focus();
    await page.keyboard.press('Enter');
    await expect(heading('One second changes the order')).toBeFocused();
    await expect(heading('One second changes the order')).toBeInViewport();
    await expect(button('3 minutes saved')).toHaveAttribute('aria-pressed', 'true');
    await expect(button('Run a shadow pilot')).toHaveAttribute('aria-pressed', 'true');
    await expect(button('61 seconds')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.decision-record')).toContainText(/Q-82.{0,20}expired/i);

    // A copied link must work after a reload and in a completely new browser session.
    await button('59 seconds').click();
    const workspaceLink = link('Technical workspace');
    await workspaceLink.click();
    await button('B · Trial 14').click();
    await expect(page).toHaveURL(site + workspaceHash(59, '14:05', 0, 14));
    const sharedUrl = page.url();
    await page.reload();
    await verifySelectedTrace(59);
    await verifyTrialComparison(14, 59);
    await expect(button('B · Trial 14')).toHaveAttribute('aria-pressed', 'true');
    const freshSession = await context();
    try {
      const reopened = await freshSession.newPage();
      await reopened.addInitScript(() => Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: async url => { document.documentElement.dataset.copiedUrl = url; } },
      }));
      await reopened.goto(sharedUrl);
      await expect(reopened).toHaveURL(sharedUrl);
      await verifySelectedTrace(59, reopened);
      await verifyTrialComparison(14, 59, reopened);
      await expect(reopened.getByRole('button', { name: 'B · Trial 14' })).toHaveAttribute('aria-pressed', 'true');
      await reopened.getByRole('button', { name: 'Copy comparison link' }).click();
      await expect(reopened.locator('html')).toHaveAttribute('data-copied-url', sharedUrl);
      await reopened.getByRole('link', { name: 'Change the release timing' }).click();
      const returnLink = reopened.getByRole('link', { name: 'See how to implement the check' });
      await expect(returnLink).toHaveAttribute('href', new URL(sharedUrl).hash);
      await reopened.getByRole('button', { name: '61 seconds' }).click();
      await reopened.getByRole('button', { name: 'Tuesday 13:55' }).click();
      await reopened.getByRole('button', { name: '24 bearings available', exact: true }).click();
      const heldHash = workspaceHash(61, '13:55', 24, 14);
      await expect(returnLink).toHaveAttribute('href', heldHash);
      await returnLink.click();
      await reopened.reload();
      await expect(reopened).toHaveURL(site + heldHash);
      await expect(traceOn(reopened)).toContainText(/Q-82.{0,20}current/i);
      await expect(traceOn(reopened)).toContainText('24 of 24');
      await verifyTrialComparison(14, 61, reopened);
      await reopened.goBack();
      await expect(reopened.getByRole('heading', { name: 'One second changes the order' })).toBeVisible();
      await reopened.goForward();
      await expect(reopened).toHaveURL(site + heldHash);
      await verifyTrialComparison(14, 61, reopened);
    } finally {
      await freshSession.close();
    }
  });

  await check('legacy-bookmarks', async () => {
    for (const legacy of ['overview', 'technical-study', 'simulator?story=stale&age=61', 'hazop?hazard=unknown', 'governance', 'assurance?trial=15']) {
      await page.goto(site + '#/' + legacy);
      await page.reload();
      await expect(page).toHaveURL(site + workspaceHash(60, '13:55', 'unknown', 15));
      await expect(heading('Implement the purchase check')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Case Lab', exact: true })).toHaveCount(0);
    }
    await page.goto(site + '#/study?section=case-executive');
    await expect(heading('What would you do?')).toBeFocused();
  });

  await check('responsive-themes', async () => {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['study', 'overview']) {
        await page.goto(site + '#/' + route);
        for (const mode of ['light', 'dark']) {
          await theme.selectOption(mode);
          await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
          if (width === 375 && route === 'study') {
            const mobileChoice = mode === 'light' ? 'No bearings available' : '24 bearings available';
            await button(mobileChoice).click();
            await expect(button(mobileChoice)).toBeInViewport();
            const problem = page.getByRole('region', { name: 'What changes while the request waits?' });
            await expect(problem.getByRole('status')).toContainText(mode === 'light' ? '0 of 24' : '24 of 24');
          }
          if (width === 375 && route === 'overview' && mode === 'dark') {
            await page.getByText('Inspect the request and policy contract', { exact: true }).click();
            await page.getByText('Inspect record identifiers', { exact: true }).click();
          }
          await fitsViewport(page);
          if (width === 375 && route === 'study' && mode === 'dark') await capture('case-mobile-dark', null, true);
          if (width === 375 && route === 'overview' && mode === 'light') await capture('implementation-mobile-light', null, true);
        }
      }
    }
    await page.reload();
    await expect(theme).toHaveValue('dark');
  });

  await check('static-guide', async () => {
    const staticContext = await context({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    const guide = await staticContext.newPage();
    await guide.goto(site + 'guide.html');
    await expect(guide.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(guide.getByRole('heading', { name: 'What would you do?', exact: true })).toBeVisible();
    await expect(guide.getByRole('link', { name: 'Open interactive APS', exact: true })).toHaveAttribute('href', './index.html');
    await expect(guide.locator('main')).toContainText('4.5');
    await fitsViewport(guide);
    await guide.goto(site + 'llms.txt');
    await expect(guide.locator('body')).toContainText('# Agentic Process Safety (APS)');
    await staticContext.close();
  });

  await interactive.close();
  await check('static-network', async () => {
    assert.deepEqual(errors, [], 'Browser errors or failed static requests');
    assert.deepEqual(violations, [], 'Unexpected network or runtime requests');
  });
  await mkdir('.harness/ci-qa', { recursive: true });
  await writeFile('.harness/ci-qa/browser-result.json', JSON.stringify({
    schema: 'aps-interactive-case-browser-1', status: 'passed', platform: process.platform,
    engine, version: browser.version(), prefix, experience: 'APS interactive purchasing case',
    checks, screenshots, errors, violations,
  }, null, 2) + '\n');
  console.log('Passed ' + checks.length + ' browser journeys. Recorded ' + screenshots.length + ' current captures.');
} finally {
  await browser?.close();
  server.close();
}
