import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
/* global document, window */

// This supplemental suite has its own screenshots. The publication receipt and
// its pinned checks belong to e2e.mjs. Run after building the static demo.
const dist = resolve('apps/aps-demo/dist');
const captures = resolve('.harness/audience-qa');
const site = 'http://aps.test/agentic-process-safety/';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(process.env.PLAYWRIGHT_BROWSERS_PATH || '.harness/playwright');
await mkdir(captures, { recursive: true });
const { chromium, expect } = await import('@playwright/test');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(8000);
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (!url.startsWith(site) || ['fetch', 'xhr'].includes(route.request().resourceType())) {
      unexpectedRequests.push(url);
      return route.abort();
    }
    const name = decodeURIComponent(new URL(url).pathname.slice(new URL(site).pathname.length));
    const path = resolve(dist, name || 'index.html');
    assert.ok(path.startsWith(dist + sep));
    return route.fulfill({ path });
  });

  const button = name => page.getByRole('button', { name, exact: true });
  const link = name => page.getByRole('link', { name, exact: true });
  const field = name => page.getByLabel(name, { exact: true });
  const tasks = page.getByRole('region', { name: 'Use this comparison', exact: true });
  const chooseAudience = async audience => {
    await page.goto(site + '#/overview');
    const menu = page.getByRole('navigation', { name: 'Choose your purchasing task' });
    const card = menu.getByRole('link', { name: audience });
    const label = card.locator('span');
    assert.ok((await label.boundingBox()).width > 100, 'Audience task title needs room for words');
    if (page.viewportSize().width >= 1000) {
      await menu.screenshot({ path: resolve(captures, 'desktop-task-links.png') });
    }
    await card.click();
  };
  const compare = async () => {
    await button('Run comparison').click();
    await expect(page.getByRole('heading', { name: 'Comparison results' })).toBeFocused();
  };
  const download = async (name, filename) => {
    const pending = page.waitForEvent('download');
    await button(name).click();
    const result = await pending;
    assert.equal(result.suggestedFilename(), filename);
    return readFile(await result.path(), 'utf8');
  };
  const capture = async name => {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), name + ' page overflows');
    await tasks.evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: resolve(captures, name + '.png') });
  };

  await chooseAudience(/Field managers/);
  await compare();
  const inbound = field('Wednesday inbound confirmed');
  const shortage = field('Thursday requirement uncovered');
  await expect(inbound).toBeChecked();
  const radioBox = await inbound.boundingBox();
  assert.ok(radioBox.width <= 32 && radioBox.height <= 32, 'Choice must leave room for its text label');
  await field('Proposed disposition').selectOption('Reconcile inbound and propose closing the requisition');
  await field('Action owner').fill('Inbound receiving lead');
  await field('Due by').fill('Wednesday 14:00');
  await field('Evidence supporting the decision').fill('Purchase order PO-417 covers 24 bearings.');
  await field('Next checkpoint').fill('Verify receipt at the dock');
  await field('Escalate if').fill('ETA slips beyond Thursday');
  await page.setViewportSize({ width: 375, height: 900 });
  await field('Theme').selectOption('light');
  await capture('mobile-field-light');
  await inbound.focus();
  await page.keyboard.press('ArrowDown');
  await expect(shortage).toBeChecked();
  await expect(field('Action owner')).toHaveValue('');
  await field('Proposed disposition').selectOption('Check order history and seek renewed approval');
  await field('Action owner').fill('Purchasing lead');
  await field('Due by').fill('Tuesday 13:00');
  const held = page.getByRole('region', { name: 'Browser comparison', exact: true }).getByRole('article', { name: 'Model C outcome' });
  await expect(held).toContainText('BLOCKED · MODEL');
  const handoff = await download('Download selected handoff', 'aps-comparison-1-shortage-handoff.md');
  assert.match(handoff, /comparison-1/);
  assert.match(handoff, /MP-31/);
  assert.match(handoff, /Purchasing lead/);
  assert.match(handoff, /Tuesday 13:00/);
  assert.doesNotMatch(handoff, /PO-417|Inbound receiving lead/);
  await inbound.check();
  await expect(field('Action owner')).toHaveValue('Inbound receiving lead');
  await expect(field('Due by')).toHaveValue('Wednesday 14:00');
  const inboundFile = await download('Download selected handoff', 'aps-comparison-1-inbound-handoff.md');
  assert.match(inboundFile, /PO-417/);
  assert.doesNotMatch(inboundFile, /Purchasing lead|Tuesday 13:00/);
  await link('Practice a missing order acknowledgment →').click();
  await compare();
  await expect(tasks).toContainText('previous purchase attempt');
  await expect(field('Action owner')).toHaveValue('');

  await chooseAudience(/Executives/);
  await compare();
  await field('Sponsor decision').selectOption('Evaluate in shadow mode');
  await field('Accountable sponsor').fill('Site director');
  await field('Stop condition and who can pause').fill('Procurement lead pauses after a duplicate commitment.');
  await page.getByText('Estimate the cost of a hold', { exact: true }).click();
  await field('Handling minutes per hold').fill('30');
  await field('Labor cost per hour').fill('40');
  await field('Expedite cost per hold').fill('5');
  await expect(tasks).toContainText('25.00 currency units per hold');
  const pilotId = await field('Selected comparison').inputValue();
  const brief = await download('Download sponsor brief', 'aps-' + pilotId + '-pilot.md');
  assert.match(brief, /Site director/);
  assert.match(brief, /25\.00/);
  assert.match(brief, /duplicate commitment/);
  assert.doesNotMatch(brief, /Inbound receiving lead/);
  await page.setViewportSize({ width: 1440, height: 960 });
  await field('Theme').selectOption('dark');
  await capture('desktop-pilot-dark');

  // Start a fresh investigator session to examine exactly six browser rows.
  await page.reload();
  await chooseAudience(/Researchers and professors/);
  await expect(button('Download browser comparison CSV')).toBeDisabled();
  for (const age of [59, 60, 61]) {
    await button(age + ' seconds').click();
    await compare();
  }
  const csv = await download('Download browser comparison CSV', 'aps-browser-expiry.csv');
  const [headers, ...rows] = csv.trim().split(/\r?\n/).map(line => line.slice(1, -1).split('","'));
  const tuples = rows.map(row => ['age_seconds', 'bundle', 'decision', 'orders_after'].map(key => row[headers.indexOf(key)]));
  assert.deepEqual(tuples, [
    ['59', 'B', 'allow', '1'], ['59', 'C', 'allow', '1'],
    ['60', 'B', 'allow', '1'], ['60', 'C', 'deny', '0'],
    ['61', 'B', 'allow', '1'], ['61', 'C', 'deny', '0'],
  ]);
  const recorded = await download('Download recorded pair CSV', 'aps-recorded-expiry.csv');
  assert.equal(recorded.trim().split(/\r?\n/).length, 3);
  assert.match(recorded, /"000-stale_approval"/);
  assert.doesNotMatch(recorded, /"browser"|comparison-1/);
  await page.getByText('Plan a field comparison', { exact: true }).click();
  const protocol = await download('Download field-study worksheet', 'aps-field-study.md');
  assert.match(protocol, /censored/);
  await page.getByText('Teach the case', { exact: true }).click();
  const faculty = await download('Download instructor guide and rubric', 'aps-instructor-guide.md');
  assert.match(faculty, /Answer key/);
  await page.setViewportSize({ width: 375, height: 900 });
  await capture('mobile-research-dark');
  await link('Open learner task').click();
  await expect(page.getByRole('heading', { name: 'Predict the purchase decision' })).toBeVisible();
  await expect(page.getByText('Comparison results', { exact: true })).toHaveCount(0);
  const student = await download('Download blank learner sheet', 'aps-learner-sheet.md');
  assert.doesNotMatch(student, /Answer key|C creates one at 59/);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log('Audience journeys passed with Chromium ' + browser.version() + '. Screenshots: ' + captures);
} finally {
  await browser.close();
}
