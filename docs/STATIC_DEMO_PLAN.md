# Static APS demo: inspected implementation plan

Inspection date: 2026-10-21. This work unit creates planning artifacts only. No frontend, installation, git mutation, publication or deployment is performed. The companion JSON pins the current production bytes and inventories reusable evidence. Controller job `77372a3458124ace9de0ace075092267` is a historical baseline reported as verified by the coordinator; it is not current website completion evidence.

## Actual repository and immutable boundary

Use a separate `apps/aps-demo` React/TypeScript/Vite workspace. Root package.json already has demo, test, typecheck, governance:demo and governance:simulate scripts and a committed-intent package-lock.json (currently untracked). Preserve every existing script value exactly. Add workspace configuration and namespaced `demo:dev`, `demo:lint`, `demo:typecheck`, `demo:test`, `demo:build`, `demo:preview`, `demo:e2e`, `demo:fixtures:check`, `demo:production:check` scripts; do not replace root test or typecheck. Commit a regenerated root lock with the eventual authorized site commit. Scope frontend tsconfig independently of root simulator checking.

`packages/engine/aps/core.py` generates deterministic findings and enforces review transitions; strict hazard/report schemas preserve provenance and human review history. Current report has 96 unverified findings (six nodes × sixteen deviations), null ratings, no actual approvals. Sixteen reference scenarios are authored examples, not incidents. Phase 2 traceability contains sixteen proposed requirements, including explicit gaps. Never change their status or invent assessments. Stable IDs, original schema contracts and all production files/tests remain unchanged.

`packages/simulator/src/simulate.ts` is a Node adapter that spawns Python `aps_governance.demo`; it is not browser-compatible. Gateway Python/SQLite/OPA enforces authenticated scope, input contracts, policy integrity, context/resource binding, approval expiry, workflow/state versions, idempotency, review timeouts and signed receipts. `policies/v1/config.json` defines max depth 3, spend cap 1000, human threshold 500, approval TTL 60 seconds and review timeout 120 seconds. A browser model illustrates these rules; it does not execute or replace enforcement, authenticate users or sign authoritative receipts.

Keep `scripts/verify.sh` byte-identical and functional. Do not run it merely to create this plan: it regenerates local artifacts and needs loopback permissions. The next controller must execute its trusted baseline checks and compare the entire companion production mapping before/after implementation.

## Evidence selection and authenticity

Select `artifacts/phase3/acceptance-T95NAQ0y` as the latest local recorded acceptance by checks.tsv modification order. All nine stage exits are zero; acceptance.json passed=true, 30 planned/30 recorded/0 missing, head count 36 and hash `17f5e90567dbfd57a33edf5b939afb1d06205d1401bdddde31105066b44d8127`. These files were inspected, not freshly re-executed or cryptographically revalidated in this work unit. Earlier acceptance-Si2NdFhU and acceptance-t82mY6ia failed with missing adapters/telemetry and loopback restrictions; old Phase 3 narrative checkpoints are not current outcome summaries.

Freeze minimal sanitized JSON under `apps/aps-demo/src/fixtures`, because artifacts/ is ignored. Extract topology/scenarios, hazards/cascades, traceability/control gaps, policy cases and selected T95NAQ0y dashboard trials/metrics/acceptance provenance. A build-time exporter must use an explicit field allowlist and deterministic output. Include a committed fixture manifest with source path, raw source SHA256, JSON pointer or extraction selector, transformation version and output SHA256. Validate foreign keys across hazard → proposed requirement → control → test → trial/evidence. Preserve trial sequence, source hashes, arm, seed and missingness; pseudonymize operational identifiers consistently if needed. Do not ship SQLite databases, signing material, bearer tokens, environment, local filesystem paths, raw logs or arbitrary embedded HTML. Render text with React escaping, never dangerous HTML. Source-bound fixtures require an explicit refresh/review, never silently substitute generated metrics.

Display three persistent evidence labels: Recorded experiment (frozen repository outcomes); Replayed evidence (animated ordering of those same records); Illustrative simulation (new deterministic browser state). Workload.json says inputs_only_unexecuted: execution claims come from ledger-derived dashboard/acceptance, never workload existence alone. Receipt chains establish consistency under a supplied key, not safety or external identity. Local owner can replace ledger, keys and pinned heads. No certification, production protection, human approval or general safety claim.

Charts show per-arm numerator AND denominator: A unsafe 10/10 attack calls, B 6/9, C 0/8; completions 5/10, 3/10, 3/10; false denials 0/1 per arm. These are mutations/calls, not necessarily unique incidents. Missing samples remain null/unknown; finite injected oracle coverage and early termination explain unequal denominators. Dispatch timings are not causal A/B/C overhead; any overhead chart retains OPA-ablation scope, four matched pairs and methodology. Logical expiry time is not elapsed runtime. Link every aggregate to trial records and surface residual gaps.

## Experience and requirement-to-check mapping

Use locally bundled React Flow for topology and Recharts for accessible chart presentation (tables accompany charts). Bundle icons/fonts/assets; no CDN, external AI, backend, telemetry, payment or procurement calls. Five top-level hash routes with Vite base `/agentic-process-safety/` support direct subpath refresh.

| Requirement | Concrete UI and acceptance check |
| --- | --- |
| Overview | Interactive five workers demand/inventory/supplier/finance/purchase plus orchestrator. Gateway and assurance are clearly added architecture overlays, not extra source topology agents. Select nodes/edges for intent, tools, boundary and linked hazards; keyboard-accessible list equivalent. Verify six source identities and edge bindings. |
| HAZOP Lab | Filter/search/sort 96 findings by node, deviation, review state and reference scenario. Stable IDs, causes, consequences, safeguards, proposed controls and cascade details. Reference findings link to all sixteen authored scenarios. Assert zero approved states and preserved null risk ratings. |
| Governance Control Plane | Nine selectable source-mapped stories: scoped authority, recursive delegation, context contamination, conflicting objectives/budget, stale approval, duplicate action, race/state divergence, gateway outage, cascading prerequisite failure. Each shows request, decision, state effect, policy/control/test/evidence and scope limits. Benign path is an additional reset/default, not a tenth attack story. Pin exact source fault IDs from workload fixtures. |
| Swarm Simulator | Pure TypeScript reducer with seeded SHA-256-counter-compatible generation or explicitly documented deterministic equivalent, logical ticks and ordered event queue. A baseline, B actor/tool+budget, C HAZOP-informed model; same seed/task/fault input across arms. Functional start, step, pause, reset, speed, fault injection and seed input. No wall-clock randomness; pause stops advancement; reset restores seed/state; switching arms clears prior run. Label synthetic outputs illustrative and keep recorded charts separate. |
| Continuous Assurance | Source hashes, recorded stage outcomes, tests, evidence sequence/details, control gaps and methodology. Distinguish historical failures from selected latest evidence. Download only sanitized fixture JSON. No browser-generated verification badge or fabricated receipt. |
| Guided walkthrough | Five steps: inspect procurement boundary → choose authority-escalation hazard → inspect scope control and test → replay matching C trial → inspect assurance limits. Deep links preserve hazard/control/evidence IDs across routes; Back/Next and restart work. Assert every link resolves. |
| Enterprise polish | Responsive sidebar/header, restrained type/spacing, coherent status colors, dark/light with system preference and persisted choice, readable tables and empty states. Keyboard focus, semantic controls, accessible labels, reduced motion, contrast, chart table equivalents and non-color status cues. Check at 375, 768 and 1440px, both themes, no horizontal page overflow. |

Use modules for routes/components, domain types, reducer/PRNG/scenarios, selectors, fixtures/provenance and theme tokens. Keep domain model independent of chart/animation scheduling. No global runtime/config changes. README must cover architecture, setup/build/subpath commands, methodology, authenticity labels, security/trust boundaries, nine scenario scope, screenshots, fixture refresh, checks, deployment and maintenance.

## Tests and next controller commands

Next implementation unit should add source-bound fixtures and their checker first, then pure simulation/tests, five views and walkthrough, then screenshots and CI. All commands below are planned after files exist, not executed in this inspection. Choose exact dependency versions using the registry during implementation, save them to manifests and commit the single root lock; CI uses npm ci.

```sh
npm install --workspace apps/aps-demo --save-exact react react-dom @xyflow/react recharts
npm install --workspace apps/aps-demo --save-dev --save-exact vite @vitejs/plugin-react typescript @types/react @types/react-dom eslint typescript-eslint vitest @testing-library/react @testing-library/user-event jsdom @playwright/test
npm ci
npm run demo:fixtures:check
npm run demo:production:check
npm run demo:lint
npm run demo:typecheck
npm run demo:test
npm run demo:build
npm run demo:e2e
bash scripts/verify.sh
python3 scripts/verify_phase2_artifacts.py
npm run demo:production:check
```

Create workspace package.json before install; preserve root script snapshots and check equality automatically. Proposed scripts invoke `npm run <command> --workspace apps/aps-demo`; fixture and production checks are explicit new local scripts. Production check recomputes companion map and canonical digest, rejects new/deleted files in protected trees, and checks pinned verify.sh. Unit tests cover each nine faults × three arms, benign completion, reproducible seeds/event ordering, pause/start/reset, invalid bounds, idempotency, stale approval/state, failure containment and arm isolation. Compare source rule expectations to browser model fixtures while labeling unsupported semantics. Provenance tests reject changed source/output hashes, broken pointers, fabricated IDs, approval states and altered recorded counts/denominators.

Playwright serves built dist at the actual subpath; tests direct hash refresh, navigation, filters/sort/details, walkthrough, all controls, themes and mobile. Capture named screenshots for all five sections and dark/light desktop/mobile under docs/screenshots. Network assertions deny fetch/XHR/WebSocket/EventSource and unexpected origin requests; only same-origin static assets load. Inspect dist for secrets, external asset URLs, Node/Python imports and source data not allowlisted. Build capacity checker applies 16MiB/file, 128MiB aggregate, 10000 files to actual publish dist; snapshot workspace capacity separately and never upload repository wholesale.

## Deployment handoff and current gaps

Target is `safetymp/agentic-process-safety`, expected URL `https://safetymp.github.io/agentic-process-safety/`. Current branch main has zero tracked files and no remotes; do not assume an existing upstream or perform blanket git add (scratch and policy temp directories exist). gh is installed but `gh auth status` fails. Therefore viewer permissions, default branch, target existence and Pages settings are unknown. No target query requiring authentication was attempted; do not persist auth diagnostics or credentials. Next authorized deployment unit must read-only run `gh repo view safetymp/agentic-process-safety --json nameWithOwner,defaultBranchRef,viewerPermission` and `gh api repos/safetymp/agentic-process-safety/pages` once auth is available. Reconcile target identity and branch before setting a remote or pushing; inspect any remote history before an initial commit/push, never force push. Report concrete permission/auth gaps if unresolved.

Plan `.github/workflows/pages.yml` on push main and workflow_dispatch. Use official checkout/setup-node/configure-pages/upload-pages-artifact/deploy-pages actions with reviewed current versions or immutable pins. Build job permissions contents:read; deploy job pages:write and id-token:write only, github-pages environment and deployment URL from action output. Concurrency group pages with cancel-in-progress false. npm ci → fixture/production checks → lint → typecheck → tests → build → static/e2e validation must all succeed before artifact upload; deploy needs successful build. Upload only apps/aps-demo/dist. Avoid pull_request_target, stored tokens and custom publishing credentials. Existing Python/OPA regression remains an independently required trusted controller gate; a frontend build cannot establish it.

Publishing is authorized in a later work unit if credentials/permissions exist; this inspection performs none. After future deployment, verify the actual URL, static assets, hash deep links and screenshot/network checks against the live subpath. Require current controller acceptance and completion receipt for site completion. A passing historical baseline, successful local build or this plan cannot establish a live website.
