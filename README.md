# Agentic Process Safety (APS): HAZOP for AI Agent Swarms

Open-source research sandbox for **hazard and operability (HAZOP) analysis of AI agents and multi-agent systems**. APS combines deterministic hazard screening, a simulated procurement swarm, and policy-as-code experiments using **Open Policy Agent (OPA) and Rego**.

Compare the same illustrative request under different control bundles, follow the point where their outcomes diverge, and connect a proposed response to hazards and evidence. The separate research implementation models demand forecasting, inventory, supplier selection, finance approval and purchase execution. All tools are simulated; no real purchase or payment can be made.

**SafetyMP research thesis — managing risk enables sustainable AI operations.** APS examines how delegation, shared context, and approval boundaries can introduce failure modes in multi-agent workflows. It links simulated hazards to proposed controls and repeatable experiments, asking whether risk can be managed without making agent collaboration impractical. These are research hypotheses, not proven production safeguards. See the [portfolio thesis](https://github.com/SafetyMP/SafetyMP).

[![Repository checks](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/repository-checks.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/repository-checks.yml)
[![Static demo workflow](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/deploy-pages.yml)
[![License: Apache-2.0](https://img.shields.io/github/license/SafetyMP/Agentic-Process-Safety)](LICENSE)
[![Node 22.18+](https://img.shields.io/badge/node-%E2%89%A522.18-339933?logo=node.js&logoColor=white)](package.json)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue)](pyproject.toml)

> **Scope:** Research sandbox. Hazards remain unverified, requirements proposed, ratings null and actual human approvals zero. APS provides no safety certification or production protection.

**Jump to:** [Demo](#demo) · [Quick start](#quick-start) · [Architecture](#architecture) · [Verification](#verification) · [Security](#security) · [Documentation](#documentation-map) · [Contributing](CONTRIBUTING.md)

---

## What you can study

- **AI agent risk analysis:** trace tool use, delegation, shared context and approval hazards through the [HAZOP methodology](docs/METHODOLOGY.md).
- **Agent governance and policy enforcement:** inspect the Python gateway and OPA/Rego controls in the [governance architecture](docs/GOVERNANCE_ARCHITECTURE.md), separate from browser-only simulations.
- **Reproducible multi-agent experiments:** compare baseline, conventional access checks and HAZOP-informed checks with [Phase 3 experiments and assurance](docs/PHASE3_OPERATIONS.md). Finite sandbox results do not establish real-world safety.

## Demo

The React/TypeScript explorer runs entirely in the browser, with no account, API key, paid inference, backend or telemetry.

The opening case asks: **the purchase agent has permission, but is its approval still valid?** An illustrative purchase arrives 61 logical seconds after finance approval; the modeled validity rule requires an age below 60. The amount is 300 sandbox units, a teaching input rather than a recovered historical trial amount.

The five views support one connected investigation:

- **Start here:** launch the approval-expiry case, browse all nine illustrative cases, and inspect the declared procurement topology.
- **Case Lab:** compare B (tool permission and spend limit) with C (additional lifecycle checks) against identical inputs; optionally include A (no modeled checks). Inspect decisions, a selectable failure path, and bounded illustrative effects.
- **Hazard study:** examine the selected case's intended behavior, deviations, assumptions and proposed controls, with the full 96-entry screening register, node × deviation matrix and 16 authored references available.
- **Controls:** inspect what a protection checks, where its authority comes from, and its implementation/test mapping. The Case Lab is the single browser request runner.
- **Evidence:** inspect the retained browser comparison separately from recorded experiments, paired B/C calls, replay, charts, source lineage and explicit gaps.

Choose **Run comparison**, then vary approval age using 59/60/61 shortcuts or the age input. At 59 both B and C allow; at 60 and 61 B allows and C denies. Changing inputs creates a draft and does not relabel an earlier result. Retained comparisons preserve their inputs, predictions and reasoning across views. Normal and unauthorized-tool cases also show where B and C reach the same outcome. Six secondary cases retain rule exploration with business effects explicitly unmodeled.

The **Discussion worksheet** attaches a recommendation, rationale, evidence, assumptions, unanswered question and dissent to a particular run. Marking a position ready grants no authority. **Explore a fresh-approval request** creates a hypothetical child from C's no-effect state with a new request identity; it preserves the denied parent and does not continue B's already executed purchase. A fresh approval still does not establish that a quotation, forecast or stock record is correct.

Use **Keep or export this discussion** for explicit browser-local save/load/delete, a readable Markdown brief, session JSON, and a configuration-only link. Notes remain in memory unless explicitly saved; loading a browser copy is an explicit action. Configuration links carry bounded inputs, not notes, outcomes or approvals. See the [redesign plan](docs/APS_EXPERIENCE_REDESIGN_PLAN.md) and [local implementation and verification record](docs/APS_REDESIGN_IMPLEMENTATION.md) for delivered scope and verification limits.

Keyboard entity buttons accompany the topology, the failure path has an ordered text representation, and charts include data tables. System, light and dark themes persist locally. The comparison explains these selected control bundles; it does not establish that HAZOP uniquely discovers the checks or outperforms other analysis methods.

The earlier executive journey, **Prepare example**, **Advance to next decision**, and decision-brief JSON import described in [continuity and saved brief usage](docs/CONTINUITY_IMPLEMENTATION.md) belong to a previous interface. That document is retained as historical implementation evidence, not instructions for this redesign.

**Project URL:** [safetymp.github.io/Agentic-Process-Safety](https://safetymp.github.io/Agentic-Process-Safety/). This README describes the redesign source; publication and source-bound CI acceptance for this revision require separate verification. The [earlier publication handoff](docs/STATIC_DEMO_PUBLICATION_HANDOFF.md) is retained as historical evidence and does not establish deployment of this redesign.

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

- Discussion notes and hypothetical fresh-approval branches affect local illustrative state only; they issue no operational authorization. The browser model omits authentication, real policy execution, atomic persistence, signed receipts and production objective arbitration.
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

### Related projects

- [FidusGate: MCP tool-call policy gateway](https://github.com/SafetyMP/FidusGate) explores policy decisions and signed receipts.
- [Corporate/Site Harness: evidence-gated software delivery](https://github.com/SafetyMP/corporate-site-harness) explores verification gates and human approval in agent-assisted development.

## License

Project-owned material is offered under [Apache 2.0](LICENSE), subject to preserved third-party terms and the pending source-data and rights review in the [readiness audit](docs/open-source-readiness.md). No release rights or industrial suitability are certified.

## Documentation map

| Topic | Start here |
| --- | --- |
| Analysis method and review gates | [Methodology](docs/METHODOLOGY.md) |
| Engine and gateway boundaries | [Phase 1 architecture](docs/ARCHITECTURE.md) · [Governance architecture](docs/GOVERNANCE_ARCHITECTURE.md) |
| Gateway operation and policy workflow | [Phase 2 operations](docs/PHASE2_OPERATIONS.md) |
| Experiments and attested assurance | [Phase 3 operations](docs/PHASE3_OPERATIONS.md) |
| Current browser redesign and local verification | [Redesign plan](docs/APS_EXPERIENCE_REDESIGN_PLAN.md) · [Implementation and verification](docs/APS_REDESIGN_IMPLEMENTATION.md) |
| Earlier browser QA and publication records (historical) | [Browser QA](docs/STATIC_DEMO_BROWSER_QA.md) · [Publication handoff](docs/STATIC_DEMO_PUBLICATION_HANDOFF.md) |
| Full CLI examples, human review syntax and retained evidence notes | [Development reference](docs/DEVELOPMENT_REFERENCE.md) |
| Open-source readiness and owner gates | [Readiness audit](docs/open-source-readiness.md) |
