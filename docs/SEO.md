# Search and agent discovery

APS presents one consistent project: an open-source HAZOP research sandbox for investigating AI agent workflow risk through same-request comparisons, concrete causal paths, evidence and human reasoning. The public description distinguishes this from operational authorization, safety certification or an established result about the analysis method.

## Public documents

| Document | Purpose | Canonical target |
| --- | --- | --- |
| Interactive app | Guided comparison and local discussion; useful source introduction before JavaScript loads | `https://safetymp.github.io/Agentic-Process-Safety/` |
| Project and evidence guide | Complete, readable explanation of the case, workflow, evidence layers and source links; no runtime JavaScript | `https://safetymp.github.io/Agentic-Process-Safety/guide.html` |
| Source index | Optional plain-text navigation for readers and tools that explicitly use it | `https://safetymp.github.io/Agentic-Process-Safety/llms.txt` |
| Sitemap | Lists the app and guide as the two canonical HTML documents | `https://safetymp.github.io/Agentic-Process-Safety/sitemap.xml` |

The guide is a real page with content useful to people, not a collection of search-keyword variants. It remains readable without JavaScript and links to the repository's vision, user guide, documentation index, methodology and contributor guide. The app's visible footer and initial HTML link to it and the plain-text source index.

The existing hash-based app routes remain application state. They are not listed as separate sitemap pages. Google documents limitations with fragment-driven page content; introducing a real static guide gives readers and crawlers a stable document without changing the established app routing. A future move to independently indexable app pages would require an explicit routing design and direct-navigation checks. [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## Metadata and sharing

Each HTML document has its own exact canonical URL, descriptive title and description, consistent Open Graph/Twitter metadata, and truthful structured data. The app is described as `SoftwareSourceCode`; the guide is a `WebPage` about that source project. Neither has fabricated ratings, reviews, certifications, modification dates or rich-result guarantees. The shared preview is a screenshot of the deployed comparison, with text alternative identifying its illustrative scope; it is served from this project's own assets.

The sitemap contains only the two reviewed canonical HTML documents, with no invented `lastmod` values. Relative asset paths continue to work under both supported case-sensitive Pages prefixes. These choices follow ordinary [canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), not a promise of indexing.

## Agent navigation is not an SEO shortcut

`llms.txt` is a small curated map to the app, guide and owning repository sources. It separates browser illustrations, frozen records, implementation contracts and human notes, and directs reproducible claims to commit-specific evidence. It does not execute anything or grant authority. Repository-local development instructions belong in [AGENTS.md](../AGENTS.md), not in a web index presented as higher-priority instructions.

Google states that it does not use `llms.txt` or special AI text files to improve search visibility. Helpful content and normal technical SEO remain applicable to its AI search features. APS provides the index for tools that choose to consume it; no crawler adoption, agent compatibility or ranking gain is asserted. [Google guidance for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## Crawl controls and publication boundaries

GitHub Pages serves this project under a path on `safetymp.github.io`. A `robots.txt` inside `/Agentic-Process-Safety/` cannot control the host's crawling policy. Host-level changes belong in the owning site repository at `https://safetymp.github.io/robots.txt` and are not introduced here. No crawler-specific blocking or training preference is inferred from this task. [Google robots.txt scope](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).

Repository content, a successful build, public deployment and search indexing are separate states. After a reviewed merge and deployment:

1. Confirm HTTP success and expected content for the canonical app, guide, source index, sitemap and preview image.
2. Verify the deployed artifact and the exact source-bound browser result through the existing release checks.
3. In an owner-verified Search Console property, inspect the app and guide and submit the project sitemap if desired.
4. Measure discovery using actual search and repository data; do not infer traffic, indexing or comprehension from a passing test.

Search Console verification, sitemap submission, indexing, ranking and agent adoption require separate external observation. No account configuration or search-provider submission is performed by these repository files.

## Validation contract

The static publication check walks every deployed asset from real local links and rejects missing, unreferenced, oversized, private or remote executable assets. Metadata exemptions are closed to the two reviewed canonical documents. The guide may link to a fixed list of ordinary source-navigation anchors; this does not exempt remote scripts, styles, images or runtime network calls. The separate app still runs without telemetry or backend requests.

`apps/aps-demo/scripts/seo.test.mjs` exercises canonical substitution, unknown pages, source URLs disguised as resources, unreviewed external anchors, stale metadata, invented timestamps and unsupported agent-index claims. The usual frontend build, static graph checks, browser checks and source-bound release checks must still pass. Adding discovery files changes source and distribution identities; historical receipts must remain preserved and a new release needs fresh evidence.
