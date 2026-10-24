# Browser work unit — 2026-10-21

2026-10-22 replacement update: source-bound Linux Chromium CI is now user-approved, with unchanged assertions including malformed links. The missing independent verifier has been implemented; it currently rejects absent `.harness/linux-ci-review.json`. Twelve targeted rejection tests pass. No real CI result, new screenshot or visual inspection is claimed. SafetyMP is authenticated, but the intended repository returns 404; restoring access or reviewing a corrected target is the concrete next action. See [current handoff](STATIC_DEMO_CI_HANDOFF.md). Historical host failures below are retained and were not retried.

## Step 15: source regression fixed; Linux handoff prepared

APS-DEMO-REVIEW-010 now validates unknown hazard and node query values before selection. Empty search/filter rows retain a valid inspected finding. A component regression exercises malformed links, empty results, recovery and subsequent selection; all **106 tests** pass. The identical real-browser malformed hash-link refresh assertion is added without removing existing assertions. APS-DEMO-REVIEW-011 now describes nine snapshots, seed 17 as planned workload input, implemented source versus pending browser QA, and unborn history truthfully.

Lint, app/root types, fixtures, 70-file integrity, build and static checks passed (`.harness/*step15.log`). Build is seven files / 970570 bytes. One ordinary `demo:e2e` invocation still fails honestly before page creation: selected macOS Firefox executable is absent (`.harness/demo-e2e-step15.log`). No download or repeated launch diagnosis was performed. No screenshots or visual review exist. Read-only GitHub checks still find no authentication, no remote and unborn main.

The prepared Linux workflow now retains source/dist digests, commit/workflow/run identity, actual successful browser result and seven genuine screenshot paths as a narrowly allowlisted QA artifact. No CI run has occurred. See [concrete handoff and unapproved contract proposal](STATIC_DEMO_CI_HANDOFF.md). Current acceptance is unchanged; CI evidence is a prepared route requiring actual execution and any necessary separate contract review.

## Step 14: explicitly authorized Firefox strategy

Playwright's installed 1.64.1 metadata specifies Firefox revision 1555, browser version 157.0. The authorized official CDN installation uses `.harness/playwright` and workspace-local `.harness/tmp`; existing Chromium evidence is preserved. The browser runner now explicitly selects Firefox on macOS and Chromium elsewhere, validates `APS_BROWSER` overrides against those two names and logs the actual launched version. No fallback or launch-permission bypass is implemented. Linux Pages CI explicitly selects and installs Chromium; local Firefox acceptance cannot establish Chromium validation.

The existing browser assertions and screenshot captures are unchanged. This section records strategy and metadata only, not a passed browser run. Step 14 also moves `configure-pages` into the deployment job with `pages: write`, preserving the read-only build job and required successful build. README now has explicit security limitations. Local lint, immutable 70-file integrity, 105 unit/component tests, app/root TypeScript, fixtures and static checks passed after the changes. Authentication remains unavailable, no remote is configured and local `main` has no commits; no publication was attempted.

**Actual result: installation failed; browser acceptance remains blocked.** One normal `npx playwright install firefox` invocation was allowed to complete its bounded built-in attempts. The first transfer advanced to 20% before a 30-second inactivity timeout; the next reached 40% before the same timeout. Remaining official CDN attempts failed with `getaddrinfo ENOTFOUND` for `cdn.playwright.dev` and `playwright.download.prss.microsoft.com`. Playwright exited 1 with `Failed to download Firefox 157.0 (playwright firefox v1555)`. No healthy transfer was interrupted, no new download loop was started, and no escalation, permissions or global configuration change was used.

The subsequent actual `npm run demo:e2e` selected `firefox (darwin); no fallback` and failed because `.harness/playwright/firefox-1555/firefox/Nightly.app/Contents/MacOS/firefox` does not exist (`.harness/demo-e2e-step14.log`). Thus 157.0 is the pinned intended version, **not an executed browser version**. No browser pages, real screenshots or visual review were produced. The prior Chromium 1248 ICU/GPU and worker MachPort diagnostics remain separate known host gaps; neither engine is claimed validated. Next execution requires working official-CDN access and an authorized host able to launch the installed browser. Linux CI still requires its explicit Chromium run.

## Step 13 clarification and current diagnostics

The independent verifier subsequently launched a process and reported an ICU/GPU crash during screenshot capture. That is distinct from this worker's MachPort failure; the latter does not explain the former. A fresh worker attempt still fails at MachPort registration before page creation (`.harness/demo-e2e-step13.log`). No browser acceptance or screenshot is claimed.

Inspection of the actual pinned revision 1248 arm64 bundle found a readable `icudtl.dat` (10,822,000 bytes) adjacent to the matching arm64 executable; the directory is mode 755 and data mode 644. Both retained partial archives (6,254,411 and 8,428,036 bytes) are invalid ZIPs; they are incomplete prior transfers, not the archive from the completed install. Thus they cannot prove installed corruption or supply trusted replacement data. No concrete missing resource was proved, so no download, repair, binary/data mixing, launch-flag change or policy workaround was attempted. The verifier's ICU failure needs further diagnosis in that same authorized environment. Local file presence does not prove that its subprocess resolves the resource path correctly.

This unit also prepared the official pinned Pages workflow and expanded README/acceptance reports, unified decision and trace evaluation, added review terminal statuses and source-backed finite workload coverage/prevented counts, and corrected absent test selectors. Current test count is 105, not the earlier 103 below. See `STATIC_DEMO_ACCEPTANCE.md` for current results and outstanding release gates.

Worker evidence only; this is not a controller completion receipt or an independent review.

The pinned Playwright 1.64.1 Chromium headless shell v1248 and FFmpeg v1013 are now installed under `.harness/playwright`. Installation used workspace-local `.harness/tmp`. The same installation process was allowed to finish; after one actual 30-second transport inactivity timeout, Playwright's built-in retry completed its 99 MiB headless-shell download. No full Chromium package was installed by this work unit.

`npm run demo:e2e` then reached the installed executable, but macOS sandbox permissions prevented launch before any page opened:

```text
FATAL:base/apple/mach_port_rendezvous_mac.cc:159
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.26126:
Permission denied (1100)
process did exit: exitCode=null, signal=SIGTRAP
```

The bounded preview server was closed by the existing `finally` block. No launch flags, sandbox permissions, account limits or global configuration were changed. Browser QA remains **blocked**, not passed. No screenshots were captured or visually inspected. The controller must arrange execution within an already authorized environment that permits Chromium launch, then run the unchanged browser acceptance command against built `dist`. Installing another browser download cannot fix this observed permission failure.

## Additional verified changes

- Vitest is pinned to `4.1.12`, after querying its actual registry metadata and compatible Node engine range. Added its testing-library DOM peer explicitly. Initial npm peer resolution crashed with `edgesOut`; a one-time local `--legacy-peer-deps` install recovered the tree, followed by normal `npm install` and successful **ordinary `npm ci` without legacy flags**. No persistent npm configuration was added.
- Current npm audit reports **zero vulnerabilities**. Machine-readable output: `.harness/demo-audit-patched.json` (local process evidence, intentionally excluded from publication).
- `npm run demo:test`: **103 tests passed**, including 27 added short-circuit policy-trace checks across nine stories and three modes.
- `npm run demo:lint`, `npm run demo:build`, root `npm run typecheck`, `npm run demo:fixtures:check`, and `npm run demo:static:check` passed. Build contains seven static files totaling 967610 bytes. Build warnings about a library `use client` directive and Vitest's automatic JSX option are not browser QA evidence.
- Browser decisions now expose ordered pass/fail/skipped checks, including explicit objective-review limitations. Assurance derives hazard-to-requirement, control-to-test and control-to-trial coverage from frozen mappings; these counts do not assert hazard closure.
- Transient dist and browser-report paths are ignored by git; production dist is still built, checked and intended for Pages upload. No production files were excluded from integrity checks.
- `npm run demo:production:check` verified all 70 protected files against fixed mapping digest `3577671495d2080cef3db985b3d30b3735750e2de894e481a6c0f52e70e24497`; original root scripts remain intact.
- A final integrity check correctly rejected newly appearing Finder `.DS_Store` files. The three metadata files from `packages/`, `packages/simulator/` and `policies/` were moved intact to `.harness/quarantine-20261021-browser/` with matching relative paths; nothing was deleted or allowlisted. The final production check then passed unchanged.

## Outstanding acceptance work

Real browser interaction results, screenshots and visual QA are still absent. Browser assertions have not been weakened; the added ordered-rule table assertion also awaits execution. Deployment workflow, expanded README and final acceptance JSON/Markdown remain outstanding. No GitHub publishing or authentication attempt was made in this unit, and no live deployment is claimed.
