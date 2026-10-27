import assert from 'node:assert/strict';

export const canonical = 'https://safetymp.github.io/Agentic-Process-Safety/';
const canonicalTag = `<link rel="canonical" href="${canonical}">`;

// Only this exact metadata tag is exempt from the no-remote-assets contract.
// Canonical metadata does not fetch a resource. Every other href stays checked.
export function withoutCanonical(html) {
  assert.equal((html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) || []).length, 1, 'Expected one canonical link');
  assert.ok(html.slice(0, html.indexOf('</head>')).includes(canonicalTag), 'Canonical must match the public project URL in head');
  return html.replace(canonicalTag, '');
}

export function verifySeo(html, sitemap) {
  withoutCanonical(html);
  assert.match(html, /<title>Agentic Process Safety \| HAZOP for AI Agent Swarms<\/title>/);
  const description = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(description && description[1].includes('research sandbox'), 'Missing descriptive research scope');
  for (const attribute of ['property="og:description"', 'name="twitter:description"']) {
    assert.ok(html.includes(`<meta ${attribute} content="${description[1]}">`), 'Inconsistent sharing description');
  }
  assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`), 'Inconsistent Open Graph URL');
  assert.match(html, /<link rel="sitemap" type="application\/xml" href="\.\/sitemap.xml">/);
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), [canonical], 'Sitemap must contain only the canonical page, without hash routes');
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'Missing structured data');
  const data = JSON.parse(json[1]);
  assert.equal(data['@type'], 'SoftwareSourceCode');
  assert.equal(data.url, canonical);
  assert.equal(data.codeRepository, 'https://github.com/SafetyMP/Agentic-Process-Safety');
  assert.match(html, /<h1>Agentic Process Safety: HAZOP for AI agent swarms<\/h1>/);
  assert.ok(!/<meta\b[^>]*(?:noindex|nofollow)/i.test(html), 'Unexpected indexing restriction');
}
