# Contributing to APS

APS helps people investigate when an agent's permitted action can still violate a workflow condition. Contributions should make the problem, comparison, causal explanation or human judgment clearer and better supported. Start with the [vision](docs/VISION.md), [user guide](docs/USER_GUIDE.md) and [documentation map](docs/README.md). The browser experience and Python/OPA research implementation have different contracts; identify which one your change affects.

Useful contributions include a confusing step with a reproducible example, a missing evidence relationship, a case-specific explanation, an accessibility improvement, or a test that exposes a real contract violation. Use the repository's bug, question or research/design proposal forms. A proposal should state the user or research question, what the current evidence supports, and what observation would demonstrate an improvement.

## Development setup

For the static app, use Node.js 22.18+ and the single root lockfile:

```sh
npm ci
npm run demo:dev
```

The app needs no Python, OPA, account, API key or backend. For research-engine and gateway changes, use the separate [research setup](docs/DEVELOPMENT_REFERENCE.md#research-commands). Python 3.11+ and OPA on `PATH` are needed for the root simulator tests. Do not confuse the browser's illustrative checks with execution of those research controls.

## Make and verify a focused change

Use a branch and explain the concrete problem and resulting behavior in a pull request. Match checks to the change:

| Change | Validation |
| --- | --- |
| Documentation or community files | `node scripts/verify-repository-readiness.mjs` and `node --test scripts/verify-repository-readiness.test.mjs`; inspect links and commands |
| Browser app | `npm run demo:lint`, `npm run demo:typecheck`, `npm run demo:test`, `npm run demo:build`, `npm run demo:static:check` |
| Browser interaction or presentation | The browser checks above, then `npm run demo:e2e` with the pinned Playwright browser; inspect relevant desktop/mobile screenshots |
| Frozen data or research boundaries | `npm run demo:fixtures:check`, `npm run demo:fixtures:audit`, `npm run demo:production:check`; explain any missing raw originals |
| Research engine, simulator or policy | Research prerequisites, `npm test`, `npm run typecheck`, `bash scripts/verify.sh`; consult [Phase 3 operations](docs/PHASE3_OPERATIONS.md) before `bash scripts/verify-phase3.sh` |
| Release evidence or workflows | Existing predeployment/postdeployment rejection tests and the applicable source-bound verification procedure |

See the [development reference](docs/DEVELOPMENT_REFERENCE.md#current-development-workflow) for browser installation. Report exact commands, failures and missing prerequisites. A passing local test is not a deployment receipt. UI changes should include safe visual evidence and checks of focus, keyboard use, responsive layouts and both themes where affected. Obtain independent review before merging substantial changes.

## Preserve the evidence contract

- Keep browser-model outcomes, frozen recorded trials, authored hazards and human discussion distinct. New free-text reasoning or a ready status must not grant operational authority.
- Preserve immutable comparisons, their request identities and their attached reasoning. Editing inputs must not relabel an earlier result.
- Keep source pins, production-boundary manifests and release checks intact. A changed protected file needs a separately reviewed scope decision; updating a hash to hide a failure is not a fix.
- Retain historical receipts as observations of their original revision. Do not rewrite them to imply fresh acceptance or publish generated private artifacts.
- Preserve pilot blinding and exposure records. A contributor who saw reference answers cannot claim an independent blinded review. Human approvals, ratings and assignments require actual human work.

## Rights and participation

Submit only work you have authority to contribute under [Apache-2.0](LICENSE); identify imported material and preserve third-party terms. No CLA or DCO process is established. Never include secrets, operational/private data or confidential reference answers. Use [SECURITY.md](SECURITY.md) for vulnerabilities and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for conduct concerns. Review and response times are not guaranteed.
