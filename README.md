# Agentic Process Safety (APS)

Agentic Process Safety is a research sandbox for studying what can go wrong when software agents hand work to one another. Its central question is **what must still be true when an agent acts?** A purchasing agent, for example, can have permission to place an order even after the approval for that particular order has expired.

[Explore the interactive case](https://safetymp.github.io/Agentic-Process-Safety/#/study) · [Read the research questions](docs/VISION.md) · [Browse the documentation](docs/README.md)

## How APS investigates a workflow

1. **Identify what could go wrong.** The screening engine applies hazard and operability study (HAZOP) guide words such as *LATE* to each step in a workflow. It traces how a deviation at one step could affect other agents. A reviewer decides whether a proposed hazard applies, assesses the risk and can approve a control as a requirement. [Screening method](docs/METHODOLOGY.md) · [Example workflow](examples/procurement.json)
2. **Test a control at the point of action.** In the procurement simulator, agents delegate tasks, check inventory, obtain supplier terms and request finance approval. A Python gateway uses Open Policy Agent (OPA) to evaluate tool requests before a simulated purchase can take effect. Its receipts record the decision and whether the action ran. [Gateway architecture](docs/GOVERNANCE_ARCHITECTURE.md)
3. **Examine what happened.** The experiments compare sets of controls on synthetic workloads. Readers can inspect individual trials to ask both whether a control blocked an invalid action and whether the workflow could still finish. The published records describe those runs. How well the controls work at an operating site remains a research question. [Experiment guide](docs/PHASE3_OPERATIONS.md) · [Recorded data and provenance](apps/aps-demo/src/fixtures/README.md)

## Try the bearings case

REQ-218 calls for **24 bearings for Thursday’s assembly**. In the browser, try releasing the same order 59 seconds after finance approval, then at 60 seconds. A rule that checks permission and spending limits releases it both times. Adding an approval-age check puts the second attempt on hold. Now try the order before and after the supplier quote expires, or change the stock available on Thursday. Which facts does the finance check establish, and what does the buyer still need to verify? [Open the case](https://safetymp.github.io/Agentic-Process-Safety/#/study)

[![Opening of the REQ-218 case showing the bearings order for Thursday’s assembly.](docs/assets/req-218-case.jpg)](https://safetymp.github.io/Agentic-Process-Safety/#/study)

- **Inspect the evidence.** The technical workspace puts the browser’s modeled decision beside a recorded synthetic trial from the separate research runtime. Open a [release at 59 seconds](https://safetymp.github.io/Agentic-Process-Safety/#/overview?age=59&quote=14%3A05&stock=0&trial=14) or a [hold at 61 seconds](https://safetymp.github.io/Agentic-Process-Safety/#/overview?age=61&quote=13%3A55&stock=24&trial=15) to trace the request, policy decision and effect.
- **Weigh the business decision.** Would the site keep buyer-led purchasing, add an approval rule to its existing system or fund a shadow pilot? The worksheet estimates how much buyer time an agent would have to save to cover its first-year costs. The site would also need receiving and allocation records to judge whether the bearings reach the line on time. [Business-case worksheet](docs/BUSINESS_CASE.md) · [Discussion prompts](docs/AUDIENCE_WALKTHROUGHS.md)

## Run locally

For the browser app, use **Node.js 22.18+** and npm from the repository root. There is one root lockfile.

```sh
git clone https://github.com/SafetyMP/Agentic-Process-Safety.git
cd Agentic-Process-Safety
npm ci
npm run demo:dev
```

Open the local URL printed by Vite to follow the case. The [user guide](docs/USER_GUIDE.md) explains the timing controls and how to share a comparison. To preview a production build, run

```sh
npm run demo:build
npm run demo:preview
```

To run the procurement simulator, also install **Python 3.11+** and put **OPA 1.x** on `PATH`. From the repository root, run

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm ci
npm run demo
```

The browser app runs its own TypeScript model. The local simulator calls the Python/OPA gateway. See [Phase 2 operations](docs/PHASE2_OPERATIONS.md) for setup and policy workflows.

## Repository map

| Location | Responsibility |
| --- | --- |
| [`apps/aps-demo/`](apps/aps-demo/) | React/TypeScript case and IT guide; [browser model](apps/aps-demo/src/domain/README.md) and [fixture provenance](apps/aps-demo/src/fixtures/README.md) |
| [`packages/engine/`](packages/engine/) · [`schemas/`](schemas/) · [`examples/`](examples/) | Deterministic HAZOP screening, review contracts and authored examples |
| [`packages/simulator/`](packages/simulator/) | Procurement orchestrator and simulated workers |
| [`packages/governance/`](packages/governance/) · [`policies/v1/`](policies/v1/) | Research gateway, OPA/Rego controls, experiments and assurance tooling |
| [`tests/`](tests/) · [`scripts/`](scripts/) | Regression tests, integrity checks and evidence verification |
| [`docs/`](docs/README.md) | Current guides, technical references and clearly classified historical records |

## Verify a change

[![Repository checks](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/repository-checks.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/repository-checks.yml)
[![Pages deployment](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Agentic-Process-Safety/actions/workflows/deploy-pages.yml)
[![License: Apache-2.0](https://img.shields.io/github/license/SafetyMP/Agentic-Process-Safety)](LICENSE)

```sh
node scripts/verify-repository-readiness.mjs
npm run demo:production:check
npm run demo:fixtures:check
npm run demo:lint
npm run demo:typecheck
npm run demo:test
npm run demo:build
npm run demo:static:check
```

Real-browser verification uses `npm run demo:e2e` with the pinned Playwright browser. Follow the browser setup in [Contributing](CONTRIBUTING.md) and the [development reference](docs/DEVELOPMENT_REFERENCE.md). Root `npm test` invokes the research gateway and needs the Python/OPA setup. Fresh acceptance must bind the exact source, workflow, artifact and reviewed screenshots; historical receipts cannot qualify new source.

## Contribute and discuss

Start with [Contributing](CONTRIBUTING.md), [Support](SUPPORT.md), the [Code of conduct](CODE_OF_CONDUCT.md), and [Security reporting](SECURITY.md). Useful contributions improve causal explanations, evidence mappings, reproducibility, accessibility and the quality of open questions. The [vision](docs/VISION.md) distinguishes current capability from research still needed.

Coding agents should start with [AGENTS.md](AGENTS.md) for repository navigation and contribution constraints. Cite a specific revision using the [citation metadata](CITATION.cff); research results and interface revisions have different evidence boundaries.

Part of the [SafetyMP portfolio](https://github.com/SafetyMP). Project-owned material is offered under [Apache-2.0](LICENSE), with third-party terms preserved. The [open-source readiness record](docs/open-source-readiness.md) documents remaining ownership and governance questions; a license is not certification of industrial suitability.
