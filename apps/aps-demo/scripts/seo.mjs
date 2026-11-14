import assert from 'node:assert/strict';

export const canonical = 'https://safetymp.github.io/Agentic-Process-Safety/';
export const pageCanonicals = Object.freeze({ 'index.html': canonical, 'guide.html': canonical + 'guide.html' });
const titles = Object.freeze({
  'index.html': 'Agentic Process Safety | Investigate AI Agent Workflow Risk',
  'guide.html': 'APS Project Guide | Compare Controls, Trace Causes, Examine Evidence',
});
export const guideSources = Object.freeze([
  'https://github.com/SafetyMP/Agentic-Process-Safety',
  ...['docs/VISION.md', 'docs/USER_GUIDE.md', 'docs/README.md', 'docs/METHODOLOGY.md', 'CONTRIBUTING.md'].map(path => `https://github.com/SafetyMP/Agentic-Process-Safety/blob/main/${path}`),
]);

// Closed page mapping: canonical metadata never loads a remote resource.
// Unknown pages and a correct URL attached to the wrong page are rejected.
export function withoutCanonical(html, page = 'index.html') {
  assert.ok(Object.hasOwn(pageCanonicals, page), 'Unreviewed public document');
  const tag = `<link rel="canonical" href="${pageCanonicals[page]}">`;
  assert.equal((html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) || []).length, 1, 'Expected one canonical link');
  assert.ok(html.slice(0, html.indexOf('</head>')).includes(tag), 'Canonical must match this public document in head');
  return html.replace(tag, '');
}

// Only literal, reviewed source-navigation anchors may leave the project.
// Extra attributes, other tags and unknown URLs remain visible to the strict
// static scanner. This cannot exempt a remote script, style, image or fetch.
export function withoutPublicNavigation(html, page = 'index.html') {
  let text = withoutCanonical(html, page);
  if (page === 'guide.html') {
    for (const url of guideSources) text = text.replaceAll(`<a href="${url}">`, '<a>');
  }
  return text;
}

function verifyPage(html, page) {
  withoutCanonical(html, page);
  const title = titles[page];
  assert.ok(html.includes(`<title>${title}</title>`), 'Missing current project title');
  const description = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(description && description[1].includes('research sandbox'), 'Missing descriptive research scope');
  for (const attribute of ['property="og:description"', 'name="twitter:description"']) {
    assert.ok(html.includes(`<meta ${attribute} content="${description[1]}">`), 'Inconsistent sharing description');
  }
  for (const attribute of ['property="og:title"', 'name="twitter:title"']) {
    assert.ok(html.includes(`<meta ${attribute} content="${title}">`), 'Inconsistent sharing title');
  }
  assert.ok(html.includes(`<meta property="og:url" content="${pageCanonicals[page]}">`), 'Inconsistent Open Graph URL');
  assert.match(html, /<link rel="sitemap" type="application\/xml" href="\.\/sitemap.xml">/);
  assert.match(html, /<link rel="image_src" href="\.\/social-preview.jpg">/);
  for (const attribute of ['property="og:image"', 'name="twitter:image"']) {
    assert.ok(html.includes(`<meta ${attribute} content="${canonical}social-preview.jpg">`), 'Inconsistent local social image');
  }
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  for (const attribute of ['property="og:image:alt"', 'name="twitter:image:alt"']) {
    assert.ok(html.includes(`<meta ${attribute} content="APS comparison: an expired-approval request executes under B and is stopped under C. Illustrative model only.">`), 'Missing truthful image alternative');
  }
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'Missing structured data');
  const data = JSON.parse(json[1]);
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data.description, description[1]);
  assert.equal(data.url, pageCanonicals[page]);
  if (page === 'index.html') {
    assert.equal(data['@type'], 'SoftwareSourceCode');
    assert.equal(data.codeRepository, 'https://github.com/SafetyMP/Agentic-Process-Safety');
    assert.match(html, /<h1>Agentic Process Safety: investigate AI agent workflow risk<\/h1>/);
    assert.match(html, /<a href="\.\/guide.html">/);
  } else {
    assert.equal(data['@type'], 'WebPage');
    assert.equal(data.about?.codeRepository, 'https://github.com/SafetyMP/Agentic-Process-Safety');
    assert.match(html, /<h1>Permission is only the beginning\.<\/h1>/);
    assert.ok(!/<script\b(?![^>]*type="application\/ld\+json")/i.test(html), 'Guide must work without runtime scripts');
    for (const url of guideSources) assert.ok(html.includes(`<a href="${url}">`), 'Missing reviewed source link');
  }
  assert.match(html, /<a href="\.\/llms.txt">/);
  assert.ok(!/<meta\b[^>]*(?:noindex|nofollow)/i.test(html), 'Unexpected indexing restriction');
  assert.ok(!/(?:aggregateRating|reviewRating|"ratingValue")/.test(json[1]), 'Unsubstantiated rating metadata');
}

export function verifySeo(html, sitemap, guide, llms) {
  verifyPage(html, 'index.html');
  verifyPage(guide, 'guide.html');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), Object.values(pageCanonicals), 'Sitemap must contain only reviewed canonical documents, without hash routes');
  assert.ok(!/<lastmod>/.test(sitemap), 'Do not invent content modification dates');
  for (const marker of ['# Agentic Process Safety (APS)', 'reference material', 'does not establish', 'Google Search does not use llms.txt', `${canonical}guide.html`, '/docs/README.md', '/AGENTS.md', 'Historical documents']) {
    assert.ok(llms.includes(marker), `Missing agent-index scope or navigation: ${marker}`);
  }
}
