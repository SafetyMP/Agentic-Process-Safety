# Agentic Process Safety (APS)

Deterministic HAZOP screening and a sandbox procurement swarm. Follow an agent objective through an unsafe operation, a proposed control, a simulated gateway decision and its assurance evidence. Five workers model demand forecasting, inventory, supplier selection, finance approval and purchase execution. All tools are simulated; no real purchase or payment can be made.

[![Repository checks](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/repository-checks.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/repository-checks.yml)
[![Static demo workflow](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/deploy-pages.yml)
[![License: Apache-2.0](https://img.shields.io/github/license/SafetyMP/Agentic-Process-Safety)](LICENSE)
[![Node 22.18+](https://img.shields.io/badge/node-%E2%89%A522.18-339933?logo=node.js&logoColor=white)](package.json)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue)](pyproject.toml)

> **Scope:** Research sandbox. Hazards remain unverified, requirements proposed, ratings null and actual human approvals zero. APS provides no safety certification or production protection.

**Jump to:** [Demo](#demo) · [Quick start](#quick-start) · [Architecture](#architecture) · [Verification](#verification) · [Security](#security) · [Documentation](#documentation-map) · [Contributing](CONTRIBUTING.md)

---

## Demo

The React/TypeScript explorer runs entirely in the browser, with no account, API key, paid inference, backend or telemetry.

- **Procurement topology:** inspect the orchestrator, five workers and their trust boundaries.
- **HAZOP Lab:** explore 96 unverified findings and 16 authored reference scenarios.
- **Governance stories:** compare baseline, conventional access checks and HAZOP-informed checks across nine illustrative stories.
- **Swarm simulator:** start, pause, step and reset a deterministic run; inspect local approve/deny outcomes.
- **Assurance:** follow source links, proposed controls, test selectors and recorded trials.

Keyboard entity buttons accompany the topology; charts include data tables. System, light and dark themes persist locally.

**Project URL:** [safetymp.github.io/Agentic-Process-Safety](https://safetymp.github.io/Agentic-Process-Safety/). Deployment remains unverified. The retained publication notes record a case-sensitive asset-path failure and a pending publication of the portable-base fix; historical CI is not proof that the live site works. See the [publication handoff](docs/STATIC_DEMO_PUBLICATION_HANDOFF.md).

## Quick start

For the browser demo, install Node.js **22.18+** and npm. Run from the repository root using the single root lockfile:

```bash
git clone https://github.com/SafetyMP/Agentic-Process-Safety.git
cd Agentic-Process-Safety
npm ci
npm run demo:dev
```

Open the local URL printed by Vite at `/`. For a production build and local preview:

```bash
npm run demo:build
npm run demo:preview
```

The browser demo is separate from the Python/OPA research implementation. It does not call OPA or authorize real operations.

### Setup and verification

The research engine and gateway also require **Python 3.11+** and **OPA 1.x** on `PATH`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm ci
mkdir -p artifacts/phase2
bash scripts/verify.sh > artifacts/phase2/full-verification.log 2>&1
```

Run `npm run demo` for the gateway-backed procurement simulation. Generated reports, CSV exports and verification logs stay in the ignored `artifacts/` directory. See the [development reference](docs/DEVELOPMENT_REFERENCE.md#setup-and-verification) for analysis CLI commands.

## Architecture

| Layer | Location | Responsibility |
| --- | --- | --- |
| HAZOP screening — Phase 1 | `packages/engine/`, `schemas/`, `examples/` | Deterministic findings, cascade paths, schema validation, review workflow and exports |
| Procurement swarm | `packages/simulator/` | TypeScript orchestrator and five simulated workers |
| Independent gateway — Phase 2 | `packages/governance/`, `policies/v1/` | OPA/Rego decisions, scoped identities, atomic transaction controls and signed authorization receipts |
| Experiments and assurance — Phase 3 | `packages/governance/`, `scripts/verify-phase3.sh` | Finite adversarial A/B/C experiments, telemetry, reports and source-bound execution attestation |
| Static explorer | `apps/aps-demo/` | Sanitized frozen snapshots and a separate illustrative TypeScript browser model |

The explorer keeps **Recorded experimental results**, **Replayed test evidence** and **Illustrative browser simulation** distinct. Browser outcomes never replace frozen trial results.

Read the [Phase 1 architecture](docs/ARCHITECTURE.md), [gateway architecture](docs/GOVERNANCE_ARCHITECTURE.md) and [methodology](docs/METHODOLOGY.md) for component and trust boundaries.

## Verification

Run the repository readiness check and frontend checks from the root:

```bash
node scripts/verify-repository-readiness.mjs
node --test scripts/verify-repository-readiness.test.mjs
npm run demo:fixtures:check
npm run demo:fixtures:audit
npm run demo:production:check
npm run demo:lint
npm run demo:typecheck
npm run demo:test
npm run demo:build
npm run demo:static:check
```

The fixture audit reports missing ignored originals explicitly and fails on differing available originals. For root simulator tests and types, complete the Python/OPA setup above, then run `npm test` and `npm run typecheck`.

Real-browser checks require the pinned Playwright browser. The runner defaults to Firefox on macOS and Chromium on Linux; unsupported values fail without fallback. See [browser setup](docs/DEVELOPMENT_REFERENCE.md#static-demonstration) for installation and `npm run demo:e2e`.

Phase 3 requires the pinned offline OpenTelemetry SDK before its complete assurance workflow:

```bash
.venv/bin/python -m pip install --no-index --find-links dependencies/otel-wheels --require-hashes -r dependencies/otel-wheels/requirements.lock
bash scripts/verify.sh
bash scripts/verify-otel-wheelhouse.sh
bash scripts/verify-phase3.sh
```

See [Phase 3 operations](docs/PHASE3_OPERATIONS.md) for fresh acceptance runs and evidence inspection. Historical logs and badges do not establish current browser acceptance, deployment success or human approval.

## Security

- Browser approvals affect local illustrative state only. The browser model omits authentication, real policy execution, atomic persistence, signed receipts and production objective arbitration.
- Local attestations, signing keys and ledger heads cannot independently establish identity or resist an owner replacing all local evidence.
- Finite experiment observations and unequal early-termination denominators are not real-world effectiveness estimates. Missing measurements remain unknown.
- Keep signing keys, databases and operational logs out of static deployments. Publish only reviewed public assets.
- Human review, risk acceptance and production decisions remain pending actual human work.

Read the [threat model](docs/THREAT_MODEL.md), [security reporting policy](SECURITY.md) and [readiness audit](docs/open-source-readiness.md). Detailed experimental counts and evidence limitations remain in the [development reference](docs/DEVELOPMENT_REFERENCE.md#methodology-and-authenticity).

## Community

- [Contributing](CONTRIBUTING.md): setup, focused changes and required checks
- [Code of conduct](CODE_OF_CONDUCT.md): participation and enforcement expectations
- [Support](SUPPORT.md): questions and reproducible issue reports
- [Security](SECURITY.md): vulnerability reporting and supported scope

Part of the [SafetyMP portfolio](https://github.com/SafetyMP).

## License

Project-owned material is offered under [Apache 2.0](LICENSE), subject to preserved third-party terms and the pending source-data and rights review in the [readiness audit](docs/open-source-readiness.md). No release rights or industrial suitability are certified.

## Documentation map

| Topic | Start here |
| --- | --- |
| Analysis method and review gates | [Methodology](docs/METHODOLOGY.md) |
| Engine and gateway boundaries | [Phase 1 architecture](docs/ARCHITECTURE.md) · [Governance architecture](docs/GOVERNANCE_ARCHITECTURE.md) |
| Gateway operation and policy workflow | [Phase 2 operations](docs/PHASE2_OPERATIONS.md) |
| Experiments and attested assurance | [Phase 3 operations](docs/PHASE3_OPERATIONS.md) |
| Browser QA and publication | [Browser QA](docs/STATIC_DEMO_BROWSER_QA.md) · [Publication handoff](docs/STATIC_DEMO_PUBLICATION_HANDOFF.md) |
| Full CLI examples, human review syntax and retained evidence notes | [Development reference](docs/DEVELOPMENT_REFERENCE.md) |
| Open-source readiness and owner gates | [Readiness audit](docs/open-source-readiness.md) |
