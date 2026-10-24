# Simulation work unit (partial site implementation)

Added pure browser-domain model and required nine stories in `apps/aps-demo/src/domain`. No website completion or deployment is claimed.

Validation performed:

- All 27 story/mode combinations passed a direct Node/TypeScript smoke check.
- Strict standalone TypeScript check passed for both domain source modules using existing root compiler.
- `npm run demo:production:check` passed: all 70 protected files and original scripts unchanged, pinned digest `3577671495d2080cef3db985b3d30b3735750e2de894e481a6c0f52e70e24497`.
- `npm run demo:fixtures:check` passed frozen integrity, foreign keys and aggregates. Full local-source audit was not run.
- Snapshot measured before writes: 127876923 bytes; 6340805 bytes headroom. This unit adds small text source/tests only.

Vitest 3.2.4 availability and Node compatibility were confirmed through npm registry metadata. A substantive Vitest suite was authored but **not executed**. npm installation stalled during dependency resolution in two bounded attempts, including one without optional peer resolution; both were interrupted and no installation remains running. Cache/logs were kept under `.harness/npm-cache`. The single root lock has not yet been regenerated for the added workspace; resolving installation and updating/checking the lock is required before `npm ci` or claiming the simulation milestone. No global npm configuration was changed.

## Dependency recovery and simulation milestone (2026-10-21)

The next worker successfully resolved dependencies using one bounded, single-socket registry install with workspace-local `.harness/npm-cache`. No escalation, global npm configuration, controller changes or production edits were needed. The root `package-lock.json` now includes the workspace and exact Vitest 3.2.4 dependency. The install's initial workspace warning did not prevent installation; the final lock contains the workspace package and link, and workspace commands resolve Vitest successfully.

Current executed checks:

- Clean `npm ci` from the regenerated lock passed (58 packages), using the same bounded registry settings and local cache.
- `npm run demo:test:simulation`: **44 tests passed**, one test file. Includes all nine stories across three modes, deterministic replay, seed bounds, pause/reset/configuration isolation, fault injection, review approval/denial and proposed-control/gap traceability.
- `npm run demo:typecheck`: passed with installed Vitest types.
- `npm run demo:fixtures:check`: passed eight fixture hashes, foreign keys and recorded aggregates (96 unverified hazards, 16 proposed requirements, 30 trials, 21 checks, nine stages). Raw local-source audit was explicitly not performed.
- `npm run demo:production:check`: all 70 files match the fixed digest and original npm scripts are preserved.

The prior installation blocker is resolved. Next unit: implement the five views and build tooling against the reducer; add substantive view tests and lint, then built-subpath browser checks/screenshots and workflow/docs. These remain incomplete; no complete website, current controller receipt, deployment or fresh production enforcement execution is claimed. Fixture-linked controls remain proposed; conflict arbitration remains a production gap and its browser review path is illustrative.

## Lint milestone work unit (2026-10-21)

Added real `demo:lint` / workspace `lint` commands and an ESLint flat configuration covering TypeScript source, tests and fixture/check scripts. ESLint recommended and typescript-eslint recommended rules run with zero permitted warnings, consistent type imports and an explicit-any prohibition. A stdin negative probe confirmed that an unused explicit-any binding exits 1; no probe source was persisted.

Registry metadata confirmed exact compatible versions ESLint/@eslint/js 9.39.1, typescript-eslint 8.48.1 and TypeScript 5.9.3. npm warns that this ESLint release is no longer supported; upgrading within a reviewed compatible toolchain remains maintenance work. Root TypeScript was pinned to 5.9.3 alongside the app: the previous TypeScript 7 package lacks the compiler API needed by hoisted ts-api-utils and caused a real linter crash. Root `npm run typecheck` still passes; every original npm script string and all protected production bytes remain unchanged. No runtime/global configuration changed.

Executed after clean `npm ci --ignore-scripts` from the regenerated root lock:

- `npm run demo:lint`: passed.
- Negative lint probe: rejected both `no-explicit-any` and `no-unused-vars` with exit 1.
- `npm run demo:typecheck` and original `npm run typecheck`: passed.
- `npm run demo:test:simulation`: 44/44 tests passed.
- `npm run demo:production:check`: 70 protected files match fixed digest `3577671495d2080cef3db985b3d30b3735750e2de894e481a6c0f52e70e24497`; original scripts preserved.
- `npm run demo:fixtures:check`: passed frozen snapshot/hash/foreign-key/aggregate checks; local raw sources explicitly not audited.

Pre-write snapshot estimate excluding .git/.harness/node_modules/.venv/__pycache__: 127950822 bytes, 6266906 bytes headroom under 128 MiB. Added config and lock entries are small text; no historical artifact was removed. Install used the workspace cache, one registry socket, bounded timeout/retries and existing network permission.

This work unit completes lint tooling only. Five views, React/Vite/Tailwind/chart dependencies, build/static checks, view/browser tests, screenshots, deployment workflow and final acceptance/README remain outstanding. No website completion or deployment is claimed.
