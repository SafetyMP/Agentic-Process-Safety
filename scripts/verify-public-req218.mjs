import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const site = 'https://safetymp.github.io/Agentic-Process-Safety/';
const examples = [
  { age: 59, time: '14:05', stock: 0, quote: 'expired', outcome: 'Released', decision: 'allow', trial: 'B · Trial 14' },
  { age: 61, time: '13:55', stock: 24, quote: 'current', outcome: 'Held', decision: 'deny', trial: 'C · Trial 15' },
];
const sender = process.argv[2] === 'copy';
const evidenceFile = process.argv[3];
const shared = sender ? [] : JSON.parse(await readFile(evidenceFile, 'utf8'));
const browser = await chromium.launch();
try {
  for (const [index, item] of examples.entries()) {
    const context = await browser.newContext({
      viewport: {width: sender ? 1280 : 390, height: sender ? 900 : 844},
      permissions: sender ? ['clipboard-read', 'clipboard-write'] : [],
    });
    const page = await context.newPage();
    const button = name => page.getByRole('button', {name, exact:true});
    const trialNumber = Number(item.trial.split(' ').at(-1));
    const expected = site + '#/overview?' + new URLSearchParams({age: String(item.age), quote: item.time, stock: String(item.stock), trial: String(trialNumber)});
    if (sender) {
      assert.equal((await page.goto(site)).status(), 200);
      await button('Tuesday ' + item.time).click();
      await button(item.stock ? '24 bearings available' : 'No bearings available').click();
      await button(item.age + ' seconds').click();
      await page.getByRole('link', {name:'See how to implement the check'}).click();
      await button(item.trial).click();
      await button('Copy comparison link').click();
      await expect(page.getByText('Link copied', {exact:true})).toBeVisible();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert.equal(copied, expected);
      shared.push(copied);
    } else {
      assert.equal(shared[index], expected);
      assert.equal((await page.goto(shared[index])).status(), 200);
    }
    for (const step of ['open', 'refresh']) {
      if (step === 'refresh') assert.equal((await page.reload()).status(), 200);
      await expect(page).toHaveURL(expected);
      const trace = page.getByRole('region', {name:'Trace REQ-218 through APS'});
      await expect(trace).toContainText(item.outcome + ' at Tuesday ' + item.time);
      await expect(trace).toContainText('Q-82 is ' + item.quote);
      await expect(trace).toContainText(item.stock + ' of 24 available');
      const executed = item.decision === 'allow';
      assert.deepEqual(JSON.parse(await trace.locator('.selected-receipt').innerText()), {
        task_id:'REQ-218', action:'purchase_mock', decision:item.decision,
        reason:executed ? 'policy_allow' : 'approval_invalid', executed, cached:false,
      });
      await expect(button(item.trial)).toHaveAttribute('aria-pressed', 'true');
      const table = page.getByRole('table', {name:'REQ-218 compared with trial ' + trialNumber});
      for (const [field, modeled, recorded] of [
        ['Approval age', item.age + ' seconds', '61 seconds'],
        ['Decision', item.decision, trialNumber === 14 ? 'allow' : 'deny'],
        ['Adapter executed', String(executed), String(trialNumber === 14)],
      ]) {
        const row = table.getByRole('row').filter({has:page.getByRole('rowheader', {name:field, exact:true})});
        await expect(row.getByRole('cell')).toHaveText([modeled, recorded]);
      }
      console.log([step, item.outcome, item.age + 's', 'Q-82 ' + item.quote, item.stock + '/24', item.trial, page.url()].join(' | '));
    }
    await context.close();
  }
  if (sender) await writeFile(evidenceFile, JSON.stringify(shared, null, 2) + '\n');
} finally {
  await browser.close();
}
