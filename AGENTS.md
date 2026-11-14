# Working in APS

APS is a research sandbox for investigating agent workflow failures through same-request comparisons, concrete causal paths, source-linked evidence and human reasoning. Read [README.md](README.md), [the vision](docs/VISION.md) and [the documentation map](docs/README.md) before substantial changes. The [user guide](docs/USER_GUIDE.md) describes the current app. Historical plans and receipts describe their own revisions; they are not current acceptance evidence.

## Find the owning source

| Concern | Source |
| --- | --- |
| App routes and shared investigation state | `apps/aps-demo/src/App.tsx`, `routes/`, `components/SessionContext.tsx` |
| Cases, immutable comparisons, saved reasoning and causal wording | `apps/aps-demo/src/domain/cases.ts`, `comparison.ts`, `session.ts`, `presentation.ts` |
| Fixed illustrative checks and retained legacy simulation | `apps/aps-demo/src/domain/simulation.ts` |
| Recorded public snapshots and source mapping | `apps/aps-demo/src/fixtures/`, `apps/aps-demo/src/data.ts` |
| HAZOP screening, gateway and procurement research | `packages/engine/`, `packages/governance/`, `packages/simulator/`, `policies/`, `schemas/`, `tests/` |
| Build/publication and evidence checks | `apps/aps-demo/scripts/`, `scripts/verify-linux-predeploy-evidence.mjs`, `scripts/verify-linux-ci-evidence.mjs`, `.github/workflows/` |

Inspect the implementation and its focused tests before changing a contract. The React/TypeScript app uses Vite and one root npm lockfile. The separate Python/OPA research runtime is not a browser backend. Preserve these stacks unless the task explicitly changes them.

## Invariants

- Evaluate comparison lanes from the same immutable request and baseline. Input edits create a draft; they must not relabel retained results. Reasoning belongs to its selected run.
- Keep modeled outcomes, recorded trials, proposed hazards and human discussion separate. A recommendation or ready status grants no authority. A hypothetical recovery must retain the denied parent and name its starting state.
- Derive causal descriptions from the actual case and retained inputs. Passing approval freshness does not establish quotation validity, inventory truth or purchase necessity. An objective-conflict review is not objective arbitration.
- Preserve frozen fixture bytes, source provenance and historical receipts. The production gate protects the original research trees and exact approved additions. Do not alter a manifest, pin, assertion count or allowlist merely to make a failing check pass.
- Keep the published app static: no credentials, operational data, backend calls, telemetry or unreviewed external assets. Discussion exports can contain free text; do not publish them as test evidence without inspection.
- Preserve existing user work and generated evidence. Do not turn historical approvals, exposed reference material or previous successful runs into current authorization or independent validation.

## Checks and delivery

Run commands from the repository root. See [Contributing](CONTRIBUTING.md) for the change-to-check mapping and [development reference](docs/DEVELOPMENT_REFERENCE.md) for runtime prerequisites.

```sh
npm ci
node scripts/verify-repository-readiness.mjs
node --test scripts/verify-repository-readiness.test.mjs
npm run demo:fixtures:check
npm run demo:production:check
npm run demo:lint
npm run demo:typecheck
npm run demo:test
npm run demo:build
npm run demo:static:check
```

Use `npm run demo:e2e` with the pinned Playwright browser for affected user journeys. Inspect the relevant desktop/mobile views, themes and keyboard focus; a screenshot does not prove interaction behavior. The root `npm test` invokes the Python gateway and requires the research setup, including OPA. Do not substitute a mock or skip an established gate to hide a missing prerequisite.

For substantial changes, state scope and meaningful acceptance checks, obtain independent review, and report implemented, locally checked, CI-verified and deployed states separately. Match tests to changed behavior; preserve failure evidence. Refresh source-bound evidence after relevant changes rather than reusing an earlier receipt. Merging, deployment and external changes must stay within the user's authorized scope.
