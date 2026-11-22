// Reviewed contract for the public interactive purchasing case.
import assert from 'node:assert/strict';

export const interactiveRunnerPins = Object.freeze({
  'apps/aps-demo/scripts/audience-e2e.mjs': 'c87d0f6b474634ccb67d7de6f6002a07760c0432f87c1934ea02b3d6ee09c255',
  'package.json': '820323b063928ea1b07b9dd883b2a6763dd84f3fd7fbea59860531071fc8ddb5',
});

export const interactiveChecks = Object.freeze([
  'opening-and-scope', 'approval-boundary', 'investment-sensitivity', 'universal-decision',
  'implementation-workspace', 'chapter-return', 'legacy-bookmarks', 'responsive-themes',
  'static-guide', 'static-network',
]);
export const interactiveCaptures = Object.freeze([
  'case-opening', 'approval-boundary', 'investment-sensitivity', 'case-decision',
  'implementation', 'case-mobile-dark', 'implementation-mobile-light',
].map(name => `docs/screenshots/${name}.jpg`));

export function verifyInteractiveResult(result, reviewedChecks) {
  assert.deepEqual(reviewedChecks, interactiveChecks, 'Review all interactive case scenarios');
  assert.match(result.version, /^\d+\.\d+\.\d+\.\d+$/, 'Actual Chromium version');
  assert.deepEqual(result, {
    schema: 'aps-interactive-case-browser-1',
    status: 'passed', platform: 'linux', engine: 'chromium', version: result.version,
    prefix: '/agentic-process-safety/', experience: 'APS interactive purchasing case',
    checks: interactiveChecks, screenshots: interactiveCaptures, errors: [], violations: [],
  }, 'Complete interactive case browser result');
}
