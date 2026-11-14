# Continuity and saved decision briefs

Base: GitHub main 4614d5abeb8bb1094f7110f857d2343575480000.

Scope: repair case-to-review handoffs, HAZOP filter/selection and share links, clarify workflow controls, and consolidate discussion drafts into saved, portable decision briefs. Preserve existing technical inspectors, models, frozen evidence and Python/OPA capabilities.

Acceptance: review links preserve scenario meaning or show an explicit missing mapping; findings stay coherent under filtering and shared navigation; briefs survive route/audience changes and reload, export/import their observation snapshot, and become stale after run changes including identical resets; failed storage/import preserves user work; saved drafts never imply approval or assigned authority. Existing frontend, fixture, production-boundary and repository checks must pass. Independent source review and targeted real-browser checks follow implementation.

## Using the repaired journey

- Select a business question and choose **Prepare example**. The prepared run is paused; pending selector changes are distinguished from the active run. Successful replay import synchronizes the selectors, including when the imported specification matches the existing one.
- **Advance to next decision** applies the existing deterministic step operation until the model stops. It does not refresh authorization or reconcile an order automatically. Technical start, pause, step, reset, inspectors and replay controls remain available.
- **Review operation design** follows the active nominal, expiry, duplicate-race or missing-response case. A related source finding is labeled as related; absent mappings are explicit. Opening a review does not issue a workflow command.
- In the HAZOP Lab, changing filters selects a visible finding when possible. An empty result leaves the prior finding explicitly pinned. Selected finding and filters are shareable in the URL; detail navigation moves focus and provides a return control. Governance and Assurance retain the originating finding without resetting an evaluated policy request.

## Saving and sharing a decision brief

At **What leaders decide**, enter a proposed accountable role, next decision and evidence needed. These notes and the discussion position share one application draft across routes and audience changes.

**Save brief locally** retains one draft in this browser's local storage. Saving is explicit: unsaved edits survive module navigation but are lost on reload. This is local storage for the current browser origin, not an account, shared workspace or multi-brief library. Clearing browser data removes it.

**Download decision brief** exports the working draft as versioned JSON. Import a file or paste JSON under **Export or import a decision brief**, review the preview, and explicitly replace the working draft. Import does not overwrite the saved copy until Save is selected, and does not replay or modify the workflow. Invalid, oversized or unsupported imports preserve both copies. Discard requires confirmation. A changed saved copy from another tab blocks overwriting or deleting it; export the working draft before previewing the saved browser copy.

Each draft retains a copied observation snapshot with its scenario, configuration, metrics, selected event, relevant event/order identifiers, run/observation identities and documented model source baseline. Reset, configuration changes and replay import create a new run identity, including an identical replay. Workflow changes mark the old attachment stale. **Replace attached observations with current run**, or choosing a discussion position, deliberately attaches current observations while retaining notes. Review those notes again after attachment.

Restored and imported observations are unverified and treated as stale. Source identifiers are correlation/provenance labels, not authenticated receipts. A discussion draft never assigns a person or grants approval. The print view includes notes, observation status and source context, while excluding import previews and discard controls.

## Implementation boundaries

Changes are isolated to the static explorer, its regression tests, this documentation and exact browser-runner hash pins in the existing evidence verifiers. The original Python/OPA implementation, browser model semantics, frozen evidence and dependency lockfile are unchanged. The new advance helper delegates to the existing reducer; it does not introduce a second engine.

The implementation uses a managed worktree on `codex/aps-continuity`, based on GitHub `main` at the commit above. The original checkout's existing edits were preserved. No deployment or publication is included.

## Independent review and validation

Independent read-only reviews covered case mappings, navigation, control behavior, persistence, import/export and print behavior. Review found and prompted repairs for a Governance-to-Assurance link that could reset the evaluated request, stale HAZOP headings, cross-tab saved-copy conflicts, and print leakage of pending import contents. Final continuity and saved-brief rechecks found no remaining actionable issue. The saved-brief reviewer independently exercised 28 distinct final test cases, including the original adversarial import reproduction; print behavior was source-reviewed by that reviewer.

An additional adversarial import probe exposed recursion through a deeply nested value hidden by a duplicate JSON key. The importer now bounds original-source nesting before parsing/scanning. Regression cases include 10,000 nested arrays and objects within the byte limit; rejection preserves the working and saved drafts.

Local validation on 2026-11-14:

| Check | Result |
| --- | --- |
| Frontend tests | 453 passed across 26 files; 29 affected workflow tests also passed after the final layout repair |
| Root and frontend TypeScript | Passed |
| Frontend lint, production build, static artifact checks | Passed |
| Frozen fixture integrity | Passed: nine hashes, 96 findings, 16 requirements, 30 trial records, 21 checks, nine stages |
| Production boundary | All 70 protected files match the pinned mapping |
| Repository readiness | Passed |
| Linux evidence verifier regression suites | 119 passed; exact runner hash pins updated without relaxing evidence rules |
| Manual browser verification | Missing-response case reaches matching review; advancement stops before explicit reconciliation; notes save and reload with retained snapshot and stale warning |
| Complete built-site browser suite | 701 checks passed on Chromium 156.0.8078.4 / Playwright revision 1248; zero console/page errors and zero nonstatic requests |
| Root simulator suite | Two passed; five Python-backed tests failed with `ETIMEDOUT` |

The root failures were traced to this host's reverse DNS lookup: `socket.getfqdn` → `socket.gethostbyaddr("127.0.0.1")` blocks while the unchanged Python HTTP server binds. Python imports, OPA and forward localhost lookup completed independently. No resolver configuration, protected runtime or test timeout was changed. The complete backend suite therefore has **not** passed in this environment; frontend and byte-integrity checks do not substitute for backend execution.

The existing pinned Chromium cache failed at screenshot capture with missing ICU/GPU errors, including when accessed through its original absolute path. A fresh copy of the same exact pinned browser was downloaded into an isolated temporary cache, leaving the historical installation untouched. That copy completed all 701 checks. The runner accepts an explicit `PLAYWRIGHT_BROWSERS_PATH` while retaining its prior default, lockfile-selected browser revision and no-fallback behavior.

The browser suite also caught a first-screen layout regression from the additional setup status. Status now sits beside Prepare in a wrapping row, with less excess summary spacing. The original 1280×720 first-screen gate passes without hiding content, reducing button sizes or scrolling the reviewer. Test selectors were synchronized to rendered navigation and accessible textarea roles; acceptance assertions were retained.

Local logs are retained under `artifacts/continuity-validation-20261114/` (ignored execution artifacts). These checks are local implementation verification, not stakeholder usability acceptance, Linux CI acceptance or validation of real purchasing controls.
