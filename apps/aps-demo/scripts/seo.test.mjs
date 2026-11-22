import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonical, guideSources, navigationAssets, verifySeo, withoutCanonical, withoutPublicNavigation } from './seo.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const index = read('../index.html');
const guide = read('../public/guide.html');
const sitemap = read('../public/sitemap.xml');
const llms = read('../public/llms.txt');
const canonicalTag = `<link rel="canonical" href="${canonical}">`;

function passesStaticRemoteMarkupCheck(html) {
  return !/(?:src|href)=["']https?:\/\/|@import\s+["']https?:\/\/|url\(["']?https?:\/\//i.test(html);
}

describe('public discovery contract', () => {
  it('verifies the document behind a local app link and preserves asset suffixes on other tags', () => {
    const href = './index.html#/simulator?story=stale&amp;age=61&amp;task=field';
    expect(navigationAssets('<a href="' + href + '">')).toBe('<a href="./index.html">');
    for (const tag of ['script', 'link', 'img']) {
      const markup = '<' + tag + ' href="' + href + '">';
      expect(navigationAssets(markup)).toBe(markup);
    }
  });
  it('validates useful HTML documents and the optional source index', () => {
    expect(() => verifySeo(index, sitemap, guide, llms)).not.toThrow();
    expect(passesStaticRemoteMarkupCheck(withoutPublicNavigation(index))).toBe(true);
    expect(passesStaticRemoteMarkupCheck(withoutPublicNavigation(guide, 'guide.html'))).toBe(true);
  });
  it('publishes the same case-opening image used in the repository README', () => {
    const filename = 'req-218-case.jpg';
    expect(read('../../../README.md')).toContain('](docs/assets/' + filename + ')');
    const publicImage = readFileSync(new URL('../public/social-preview.jpg', import.meta.url));
    const readmeImage = readFileSync(new URL('../../../docs/assets/' + filename, import.meta.url));
    expect(publicImage.equals(readmeImage)).toBe(true);
  });
  it('rejects unknown and cross-page canonical metadata', () => {
    expect(() => withoutCanonical(index, 'unknown.html')).toThrow('Unreviewed public document');
    expect(() => withoutCanonical(index, 'guide.html')).toThrow('Canonical must match');
    expect(() => withoutCanonical(guide)).toThrow('Canonical must match');
  });
  it('rejects duplicated, moved or substituted canonical links', () => {
    expect(() => withoutCanonical(index.replace(canonicalTag, canonicalTag + canonicalTag))).toThrow('Expected one');
    expect(() => withoutCanonical(index.replace(canonicalTag, '').replace('</body>', canonicalTag + '</body>'))).toThrow('in head');
    expect(() => withoutCanonical(index.replace(canonicalTag, canonicalTag.replace(canonical, canonical + '?fake=1')))).toThrow('Canonical must match');
  });
  it('does not exempt a source URL used as a remote resource', () => {
    for (const markup of [`<script src="${guideSources[0]}"></script>`, `<link rel="stylesheet" href="${guideSources[0]}">`, `<img src="${guideSources[0]}">`, `<style>@import "${guideSources[0]}";</style>`]) {
      expect(passesStaticRemoteMarkupCheck(withoutPublicNavigation(guide.replace('</body>', markup + '</body>'), 'guide.html'))).toBe(false);
    }
  });
  it('leaves unknown, altered and attribute-bearing external navigation for rejection', () => {
    for (const markup of [`<a href="https://example.invalid">Unknown</a>`, `<a href="${guideSources[0]}?redirect=1">Changed</a>`, `<a class="remote" href="${guideSources[0]}">Extra</a>`, `<a href="${guideSources[0]}" onclick="bad()">Extra</a>`, `<a href='${guideSources[0]}'>Unreviewed syntax</a>`]) {
      expect(passesStaticRemoteMarkupCheck(withoutPublicNavigation(guide.replace('</body>', markup + '</body>'), 'guide.html'))).toBe(false);
    }
  });
  it('does not grant the guide navigation exception to the app document', () => {
    const injected = index.replace('</body>', `<a href="${guideSources[0]}">Source</a></body>`);
    expect(passesStaticRemoteMarkupCheck(withoutPublicNavigation(injected))).toBe(false);
  });
  it('rejects hash views, missing pages and invented timestamps in the sitemap', () => {
    for (const altered of [sitemap.replace('guide.html', '#/assurance'), sitemap.replace(/\s*<url><loc>[^<]*guide.html<\/loc><\/url>/, ''), sitemap.replace('</urlset>', '<lastmod>2099-01-01</lastmod></urlset>')]) {
      expect(() => verifySeo(index, altered, guide, llms)).toThrow();
    }
  });
  it('rejects stale metadata, indexing restrictions and unsubstantiated ratings', () => {
    for (const altered of [index.replace('property="og:description"', 'property="og:old-description"'), index.replace('summary_large_image', 'summary'), index.replace('rel="image_src"', 'rel="old_image"'), index.replace('</head>', '<meta name="robots" content="noindex"></head>'), index.replace('"@type": "SoftwareSourceCode"', '"aggregateRating": {"ratingValue": 5}, "@type": "SoftwareSourceCode"')]) {
      expect(() => verifySeo(altered, sitemap, guide, llms)).toThrow();
    }
  });
  it('rejects guide runtime scripts and missing human-readable source links', () => {
    expect(() => verifySeo(index, sitemap, guide.replace('</body>', '<script>doSomething()</script></body>'), llms)).toThrow('without runtime scripts');
    expect(() => verifySeo(index, sitemap, guide.replace(`<a href="${guideSources[0]}">`, '<a>'), llms)).toThrow('Missing reviewed source');
  });
  it('requires the agent index to disclose its role and source boundaries', () => {
    expect(() => verifySeo(index, sitemap, guide, llms.replace('reference material', 'an instruction hierarchy'))).toThrow('agent-index scope');
    expect(() => verifySeo(index, sitemap, guide, llms.replace('Google Search does not use llms.txt', 'This file guarantees discovery'))).toThrow('agent-index scope');
  });
});
