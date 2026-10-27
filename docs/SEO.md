# Search visibility

APS targets searches for agentic process safety, HAZOP for AI agents, multi-agent hazard analysis and simulated procurement governance. Descriptions retain the research scope: hazards are unverified, controls proposed and operations simulated.

The browser explorer is one public document at https://safetymp.github.io/Agentic-Process-Safety/. Its source HTML includes a descriptive title, description, canonical URL, Open Graph and summary-card metadata, SoftwareSourceCode structured data and a readable introduction before JavaScript loads. React replaces that introduction with the explorer; the overview retains the same descriptive heading and title. No tracking, external assets or third-party scripts are added.

Vite copies public/sitemap.xml into the published build. It lists only the canonical document; hash-based views are application state, not separately indexable pages. The existing static gate checks metadata and sitemap consistency, both project-prefix asset graphs and the no-network boundary. Only the exact canonical metadata tag is exempt from the remote-asset rule. Frontend tests include positive and negative cases for this exception.

After a reviewed merge and successful deployment, check the canonical URL and sitemap over HTTP, inspect the rendered page with Google Search Console URL Inspection, and submit /Agentic-Process-Safety/sitemap.xml in a verified property. No Search Console verification, submission, indexing, ranking or live publication is claimed by this change. Existing source-bound browser evidence becomes stale after source changes and must be refreshed through the existing process; do not rewrite historical evidence.

GitHub Pages serves robots.txt at the host root, https://safetymp.github.io/robots.txt. A robots file inside this project path cannot control crawling. Host-level robots changes belong in the owning site repository. The sitemap does not invent last-modified dates, ratings or certifications. Structured data describes source code; it does not promise a Google rich result.

Giving every explorer view its own search result would require real static URLs or prerendered pages and verified direct navigation, rather than listing fragment routes in the sitemap. That migration is outside this change.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots.txt scope](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt), and [SoftwareSourceCode](https://schema.org/SoftwareSourceCode).
