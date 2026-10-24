# Agentic Process Safety — Phases 1, 2 and 3

The static demonstration targets [safetymp.github.io/agentic-process-safety](https://safetymp.github.io/agentic-process-safety/). **Deployment has not been verified.** The isolated React/TypeScript app in `apps/aps-demo` runs entirely in the visitor's browser: no account, API key, paid inference, backend, telemetry or installation is required. The original Python/OPA research implementation remains separate.

## Static demonstration

Explore an interactive procurement topology, the HAZOP Lab's 96 unverified findings and 16 authored scenarios, nine governance stories, a deterministic swarm simulator, and source-linked assurance. The walkthrough follows objective → unsafe operation → HAZOP deviation → a blocked SIMULATED gateway action → that same SIMULATED outcome in assurance. Details link hazards, proposed controls, test selectors and recorded trials. Keyboard entity buttons accompany the topology; charts have data tables. Theme choices are system/light/dark and persist locally.

The exact browser stories are normal authorized transactions, unauthorized tool execution, excessive spending, recursive delegation, missing approval, replay attempts, stale approval, conflicting agent objectives and compromised shared context. Arms A/B/C illustrate baseline, conventional tool/spend access checks and HAZOP-informed checks. Start schedules logical steps; Pause stops advancement; Step advances one logical tick; Reset and configuration switches isolate state. Seeds are bounded integers. Human review has distinct approve/deny outcomes. These decisions do not call OPA or authorize real operations.

```mermaid
flowchart LR
  P1[Phase 1: HAZOP screening] --> H[Unverified hazards and proposed requirements]
  H --> P2[Phase 2: Python gateway + OPA + simulated adapters]
  P2 --> P3[Phase 3: finite experiments and attested evidence]
  H --> F[Sanitized frozen snapshots + hashes]
  P3 --> F
  F --> UI[Static React explorer on Pages]
  M[Pure TypeScript model] --> UI
  UI --> S[Shared illustrative run and assurance]
```

For local frontend work use Node 22.18+ and the single root lockfile:

```sh
npm ci
npm run demo:dev
npm run demo:fixtures:check
npm run demo:fixtures:audit
npm run demo:production:check
npm run demo:lint
npm run demo:typecheck
npm run demo:test
npm run demo:build
npm run demo:static:check
mkdir -p .harness/tmp
PLAYWRIGHT_BROWSERS_PATH=.harness/playwright TMPDIR="$PWD/.harness/tmp" npx playwright install firefox # macOS
# Linux CI installs chromium --only-shell and explicitly sets APS_BROWSER=chromium.
npm run demo:e2e
npm run demo:preview
```

Open the printed local origin at `/agentic-process-safety/`. Vite's fixed base and hash routes support direct links such as `/agentic-process-safety/#/governance`; refresh requests only the static index. Browser acceptance serves built `dist` at the true prefix with no SPA fallback. It checks all sections, nine stories × three modes, review branches, walkthrough, filters, seed/reset/pause, trace links, theme persistence, mobile overflow and forbidden runtime network traffic. Screenshots are written to `docs/screenshots/` only by actual browser execution. **Screenshots and visual inspection remain pending**: the authorized Firefox installation failed after official CDN transfer timeouts and DNS failures; the subsequent runner selected Firefox explicitly but found no executable. Prior Chromium host failures remain unresolved. No browser pass or accessibility conformance is claimed. See [current browser evidence](docs/STATIC_DEMO_BROWSER_QA.md) and [acceptance status](docs/STATIC_DEMO_ACCEPTANCE.md).

### Methodology and authenticity

Three labels remain distinct throughout the app: **Recorded experimental results**, **Replayed test evidence**, and **Illustrative browser simulation**. Frozen trial charts never use live browser outcomes. The selected historical run is `acceptance-T95NAQ0y`: 21 recorded checks, nine stages, 30 trials. Its workload supplies inputs only; execution provenance comes from summary/dashboard/acceptance records. Sanitized allowlisted fixtures retain selectors, source hashes, transformation version, case digests and trial IDs. Clean CI verifies committed snapshot hashes, foreign keys and recorded aggregates without requiring ignored originals. Optional local-source audit reports missing sources explicitly and fails on differing available originals. Hashes do not authenticate identity or independently prove execution.

Recorded unsafe mutations/attack calls are A **10/10**, B **6/9**, C **0/8**; prevented calls are **0/10**, **3/9**, **8/8**; completions are **5/10**, **3/10**, **3/10**. These finite oracle observations and unequal early-termination denominators are not real-world effectiveness estimates. Source-backed planned coverage is nine research fault families plus one benign case per arm, distinct from the nine browser stories. Goal conflict's recorded budget violation does not establish objective arbitration. Four-pair OPA-only ablation timings cannot represent whole-stack overhead. Missing measurements remain unknown, never invented zeroes.

The browser runner explicitly defaults to Firefox on macOS and Chromium on Linux. Set `APS_BROWSER=firefox` or `APS_BROWSER=chromium` to reproduce a chosen engine (install its pinned browser first). Other values fail; engine launch never silently falls back. The runner logs the actual engine and version. Local Firefox results do not establish Chromium compatibility; Linux CI retains its separate Chromium gate.

### Security limitations

All hazards remain unverified, all requirements proposed, ratings null and actual approvals zero. Explicit control gaps remain visible. The browser model omits authentication, real policy execution, atomic persistence, signed receipts and production objective arbitration. Local receipts/keys/ledger heads cannot establish external identity or resist an owner replacing all local evidence. Browser approvals affect only local illustrative state and grant no real tool permissions. Static deployment must contain only reviewed public assets; never publish signing keys, databases or operational logs. This demonstration offers no certification, risk acceptance or production protection.

### Deployment and maintenance

[deploy-pages.yml](.github/workflows/deploy-pages.yml) validates production integrity, snapshots and available sources, lint, types, tests, build, static safety and real built-site browser checks before uploading only `apps/aps-demo/dist`. It runs on `main` pushes or manual dispatch. Build has `contents: read`; deployment alone has `pages: write` and `id-token: write`, requires build and uses the `github-pages` environment. Official Actions are pinned to verified repository tag commits; concurrency prevents simultaneous deployments. Browser failures prevent deployment.

GitHub authentication is unavailable in the current workspace and no remote is configured. To publish safely:

1. Run `gh auth login`, then inspect `gh auth status`, `gh api user` and `gh repo view safetymp/agentic-process-safety --json nameWithOwner,viewerPermission,defaultBranchRef`. Verify intended identity and write permissions.
2. Inspect remote history (`git ls-remote https://github.com/safetymp/agentic-process-safety.git`), configure the verified remote and fetch it. Reconcile existing history on a branch; do not infer an empty target or force-push.
3. Review `git status`, the source diff, lockfile, all immutable checks and file sizes. Selectively stage reviewed public source, fixtures, docs, screenshots, root manifests and `.github/workflows/deploy-pages.yml`. Never use blanket `git add`; exclude local policy evidence, keys, databases, `.harness`, raw logs and caches. Preserve the protected public production source when preparing the initial repository history.
4. Commit the reviewed publication, enable repository **Settings → Pages → GitHub Actions**, and push the safely reconciled `main` (or dispatch the workflow there).
5. Inspect successful build/deploy jobs and their actual Pages URL, then verify the live URL, direct hash refresh and static network behavior before claiming deployment.

For updates, keep exact frontend dependency pins and the root lock consistent, rerun `npm ci` and all checks, and review dependency advisories. Fixture refreshes require explicit source selection, allowlist review, updated hashes and rechecked aggregates; never replace research evidence with browser output. Preserve original backend verification below. Remaining release gaps are real browser execution/screenshots/visual QA, independent accessibility review, and authenticated publication/live verification. The [Linux evidence and publication handoff](docs/STATIC_DEMO_CI_HANDOFF.md) specifies exact authenticated identity/history checks, source/dist/commit/workflow/run-bound retained QA artifacts, screenshot review and an unapproved contract proposal. No local acceptance has been waived and no CI run is claimed.

An auditable, deterministic HAZOP screening engine and sandbox procurement swarm. Five workers model demand forecasting, inventory, supplier selection, finance approval and purchase execution under an orchestrator. All tools are simulated. No real purchase or payment can be made by this implementation.

Phase 2 adds an independent OPA/Rego gateway, scoped identities, policy-gated simulated adapters, atomic transaction controls, signed authorization receipts, and a human-controlled traceability/policy workflow. Start with [governance architecture](docs/GOVERNANCE_ARCHITECTURE.md), [threat model](docs/THREAT_MODEL.md), and [operator commands](docs/PHASE2_OPERATIONS.md). The default demo now runs through this gateway.

Phase 3 adds finite adversarial A/B/C experiments, evidence-bound detection and containment measurements, paired OPA policy enforcement ablation, real OpenTelemetry SDK export, an offline dashboard, technical reports, content-triggered regression and source-bound test execution attestation. Start with [Phase 3 operations](docs/PHASE3_OPERATIONS.md) for complete fresh assurance, evidence inspection and residual limits. Historical checkpoints describe earlier partial states; their missing-adapter lists are not current gaps.

The initially empty repository is now a TypeScript/Python monorepo. See [architecture](docs/ARCHITECTURE.md) for inspection findings and component boundaries, and [methodology](docs/METHODOLOGY.md) for guidewords, review gates, identity rules, risk conventions and limitations.

## Setup and verification

Requires OPA 1.x on `PATH`, Python 3.11+ and Node 22.18+ (tested here with Python 3.14.6 and Node 22.23.2).

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm ci
mkdir -p artifacts/phase2
bash scripts/verify.sh > artifacts/phase2/full-verification.log 2>&1
```

The verification script runs Python and TypeScript tests, static type checking, the swarm demo, schema validation, repeated-output comparison, CSV export and deduplication. For a source checkout, CLI commands use `PYTHONPATH=packages/engine`; optional editable installation is `.venv/bin/pip install -e .`.

```sh
npm run demo
PYTHONPATH=packages/engine .venv/bin/python -m aps.cli analyze examples/procurement.json examples/scenarios.json --out artifacts/report.json
PYTHONPATH=packages/engine .venv/bin/python -m aps.cli validate report artifacts/report.json
PYTHONPATH=packages/engine .venv/bin/python -m aps.cli csv artifacts/report.json --out artifacts/hazards.csv
PYTHONPATH=packages/engine .venv/bin/python -m aps.cli dedup artifacts/report.json --out artifacts/deduplicated.json
```

Outputs include 96 initially unverified findings, cascade paths, 16 curated reference scenarios, and no approved requirements. JSON schemas reside in `schemas/`. The local `artifacts/` directory is intentionally ignored by version control; rerun the script to regenerate outputs.

## Phase 3 verification

After setup, install the pinned SDK offline and run from the repository root:

```sh
.venv/bin/python -m pip install --no-index --find-links dependencies/otel-wheels --require-hashes -r dependencies/otel-wheels/requirements.lock
bash scripts/verify.sh
bash scripts/verify-otel-wheelhouse.sh
bash scripts/verify-phase3.sh
```

`verify-phase3.sh` is the primary complete fresh attested assurance workflow. It prints a new `artifacts/phase3/acceptance-*` directory with logs, acceptance, report, dashboard and the run ledger. See [operations](docs/PHASE3_OPERATIONS.md) for prerequisites, inspection, seed controls and limitations.

## Human review example

Only a human reviewer should execute these commands after examining the finding. Set `HAZARD_ID` to an actual ID from the generated report and supply your own identity and evidence. The ratings below illustrate syntax, not a recommendation or actual review.

```sh
export PYTHONPATH=packages/engine
HAZARD_ID=APS_REPLACE_WITH_ACTUAL_ID
.venv/bin/python -m aps.cli review artifacts/report.json "$HAZARD_ID" accept --actor 'Reviewer name' --human --reason 'Applicability evidence' --out artifacts/accepted.json
.venv/bin/python -m aps.cli review artifacts/accepted.json "$HAZARD_ID" assess --actor 'Reviewer name' --human --severity 4 --likelihood 2 --residual-risk acceptable --reason 'Evidence for ratings and control effectiveness' --out artifacts/assessed.json
.venv/bin/python -m aps.cli review artifacts/assessed.json "$HAZARD_ID" approve_requirement --actor 'Reviewer name' --human --reason 'Residual-risk acceptance and required control rationale' --out artifacts/reviewed.json
```

AI-generated findings remain marked as such even after review. Approval requires acceptance, a human assessment and acceptable residual risk. Local attestations do not authenticate a human or protect against fabricated files. This is a Phase 1/2/3 sandbox prototype; it makes no safety certification claim. Human risk acceptance and production decisions remain mandatory and unapproved.
