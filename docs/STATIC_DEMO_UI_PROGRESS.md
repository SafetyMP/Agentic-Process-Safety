# Static demo UI work unit — 2026-10-21

This is implementation handoff evidence, not final acceptance, a controller receipt, deployment evidence, or an independent review.

## Implemented

The isolated React/TypeScript/Vite app now has five working hash routes, Tailwind-backed responsive styling, light/dark/system theme persistence, local React Flow topology, local Recharts comparison with an accompanying data table, hazard filters/sort/detail selection, all nine requested control stories, interactive simulation controls and fault selection, simulated review choices, assurance provenance and frozen call replay. A guided walkthrough links objective, authority-escalation hazard, simulated gateway decision and the same browser outcome in assurance. Live illustrative state is shared across routes and stays separate from frozen research counts.

App modules are under `apps/aps-demo/src/{components,routes,domain}`. Vite uses `/agentic-process-safety/`; module-preload fetch polyfill is disabled. All application dependencies are exact pins in the app manifest and the single root lock. Original root scripts and all 70 protected production files remain unchanged.

## Current execution evidence

- `npm run demo:test`: **74 passed** (44 domain and 30 component tests). The component matrix exercises all nine stories × three modes, decisions, provenance, denial of pending review, HAZOP filters, assurance replay, pause/reset/step/seed bounds, fault injection and persisted theme. jsdom has no real layout; a chart initial-size warning remains in component output. It is not browser QA.
- `npm run demo:typecheck`, `npm run demo:lint`, original `npm run typecheck`: passed.
- `npm run demo:build`: passed using Vite 6.4.5. Seven static publish files total **965035 bytes**. Bundler emits the upstream React Flow `use client` directive warning, with no build failure.
- `npm run demo:static:check`: passed; validates base-path assets, publish size, prohibited file types/credential patterns, backend imports and executable runtime network primitives.
- `npm run demo:fixtures:check`: passed; 8 fixture hashes, 96 unverified hazards, 16 proposed requirements, 30 trial records, 21 recorded checks and 9 stages. Raw ignored source audit was explicitly not run.
- `npm run demo:production:check`: passed after implementation; fixed digest `3577671495d2080cef3db985b3d30b3735750e2de894e481a6c0f52e70e24497` and original script values match.
- `npm ls --workspaces --depth=0`: passed with exact manifest dependencies installed.

Current app source is about 336 KiB, dist about 960 KiB, root lock about 188 KiB. Cache, test scratch and registry logs remain under `.harness` or `node_modules`; no historical artifacts were removed. Check snapshot headroom again before screenshots or further large writes.

## Remaining work for following unit

1. Add real Playwright built-dist server/tests and root `demo:e2e`. Serve the actual subpath, clean up the subprocess in `finally`, fail console/page errors and runtime networking, exercise every major control and trace link, route refresh, walkthrough, themes and 375/768/1440 layouts. No browser validation or screenshot inspection has happened in this unit.
2. Capture and visually inspect small compressed screenshots for all five sections and useful mobile/theme examples. Address findings rather than claiming visual or accessibility conformance from component tests.
3. Finish `.github/workflows/deploy-pages.yml`, full README and requested `STATIC_DEMO_ACCEPTANCE.{json,md}` with actual final evidence. Keep independent backend regression gate intact.
4. Recheck GitHub authentication once near the final deployment handoff; no authentication or deployment attempt was made in this unit.
5. Test a clean `npm ci` with the committed-intent lock. No clean install was run in this unit.

## Dependency maintenance finding

Registry metadata confirmed compatible Vite 6.4.5 and Vitest 4.1.11. Vite was updated from 6.4.1 after audit identified a high-severity development-server advisory. Vitest was updated from 3.2.4 to 3.2.7; an attempted further upgrade to 4.1.11 failed twice with npm 10.9.8 Arborist `Cannot read properties of null (reading 'edgesOut')`, including one attempt with `--prefer-dedupe`. Existing installed tree and lock remain usable at 3.2.7. Do not repeat the identical failed command without changing the resolution strategy. Diagnostics are in `.harness/npm-cache/_logs/2026-10-21T20_14_35_938Z-debug-0.log` and `2026-10-21T20_15_32_188Z-debug-0.log`.

The successful installation's audit summary still reports 1 moderate and 2 critical development-dependency advisories in the Vitest/mocker/tinypool chain. These tools are not bundled into the static site. This remains a maintenance issue, not a resolved security claim. No global npm configuration, limits, runtime, model, policies or permissions were changed.
