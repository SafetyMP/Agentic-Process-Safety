# APS redesign release candidate

This candidate replaces the active browser experience with the redesign described in [the plan](APS_EXPERIENCE_REDESIGN_PLAN.md). It starts from GitHub main `b888da6005e052498520b7bb9aa5a2040c708e4f`, retaining repository history, current dependency versions, deployment infrastructure, frozen fixtures and all original protected backend/policy bytes. The original working checkout is preserved separately.

The five-view comparison experience is the intended replacement. Previous executive/technical audience controls and their UI-specific tests belong to the prior implementation retained in Git history. The independent workflow engine and decision-brief format library, including their tests, remain available in source; the replacement interface does not import them. No legacy browser storage is silently migrated or erased.

## Production integrity reconciliation

The original inspection and its 70-file digest remain unchanged. Three prior purchase regression files had been added after that inspection. Their exact bytes match the owning PCB-05/06/07 technical records. `STATIC_DEMO_PRODUCTION_ADDITIONS.json` recognizes only those three path/hash pairs and retains their pending human-approval status.

The checker independently pins that extension, recomputes the original mapping digest, rejects overlapping pins, verifies every original and added file, rejects unexpected protected files and symlink substitution, and retains original script checks. Mutation tests exercise positive and negative cases. No wildcard test exemption, fixture refresh, backend modification or retrospective approval is used.

## Verification boundaries

The app uses paired immutable comparisons, a visible failure path, bounded age choices, retained predictions/history, run-bound reasoning and a hypothetical fresh-approval child. The original implementation record is [here](APS_REDESIGN_IMPLEMENTATION.md); its release-gate failure describes the earlier snapshot and is superseded by this reconciliation.

Local release validation includes a clean install using current main's Vite 8.3.5 lockfile, 256 frontend/library tests, seven root simulator tests, 143 Python tests (including the 35 added purchase cases), lint/types/build/static and frozen-fixture checks. The complete built-site Chromium suite passes 185 checks with no console/page errors or nonstatic requests. These counts describe the replacement's contracts; they are not evidence that different experiences have equivalent test coverage or user value.

A portable explicit `PLAYWRIGHT_BROWSERS_PATH` retains the pinned Playwright revision and no-fallback engine policy. This host's hidden-directory browser cache failed during screenshots; the same pinned Chromium bytes completed the suite from a separate temporary cache. Historical caches and evidence remain untouched.

The release branch is `codex/aps-redesign-release`. Existing predeployment verification is extended to this exact same-repository branch while retaining its previous authorized branch. The workflow has read-only permissions and no deployment job. It validates production additions, creates a clean Linux build, runs the browser suite, and retains actual source/merge/workflow/run identities, built files and seven screenshots. The predeployment verifier retains authenticated archive, source, workflow, run, PR, hosted-runner, image and version checks; its exact reviewed pins are updated for this candidate. Independent review and rejection tests precede remote execution.

Actual Linux results and visual review must be tied to the candidate PR's tested merge and original artifact. No local result or document substitutes for those observations. The existing deployment workflow and postdeployment acceptance gate are unchanged: a predeployment pass does not attest publication, deployment, human usability or real-world safety.
