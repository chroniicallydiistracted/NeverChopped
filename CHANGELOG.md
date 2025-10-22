# Changelog

# 2025-11-06
- Centralized the Python dependency manifest at the repository root, adding the
  Pillow and NumPy requirements alongside the existing PyESPN and tooling
  packages so every script used by the stack resolves in a single
  `pip install -r requirements.txt`. 【F:requirements.txt†L1-L9】
- Updated `dev.sh` to install or refresh Python dependencies whenever the
  requirements file changes, caching the checksum to avoid redundant installs
  while still guaranteeing PyESPN is available for the ESPN API server. 【F:dev.sh†L166-L207】
- Audited the Node manifests to confirm the Express, CORS, React, and related
  runtime dependencies remain pinned for the app and API server, with the lock
  file mirroring those entries. 【F:package.json†L26-L50】【F:package-lock.json†L12-L14】
- Outstanding follow-ups: failure-handling coverage for the SleeperFFHelper
  auto-refresh loop is still pending. 【F:OUTSTANDING_TASKS.md†L11-L14】

# 2025-11-05
- Audited the PyESPN migration to confirm the Python entrypoints, Express server, frontend API helpers, and live view UI all
  source official NFL data from PyESPN with ESPN event identifiers, backed by the end-to-end Vitest suites.
  【F:py/espn_schedule.py†L1-L120】【F:espn-api-server.cjs†L1-L126】【F:src/lib/api/espn-data.ts†L1-L504】【F:src/components/SleeperFFHelper.tsx†L180-L256】【F:tests/espn-api/pyespnEndToEnd.test.ts†L1-L260】
- Added explicit logging for PyESPN game and player fetch failures so the live view surfaces backend issues instead of silently
  returning null data. 【F:src/features/live-view-pyespn/data/loadPyEspnGame.ts†L296-L323】【F:src/features/live-view-pyespn/data/usePyEspnGame.ts†L43-L63】【F:src/features/live-view-pyespn/data/useEspnPlayers.ts†L74-L118】
- Streamed the ESPN API server output through `./dev.sh` by teeing the foreground process to `espn-api.log` and echoing PyESPN
  Python stderr with script context so API call failures surface immediately in the active terminal. 【F:dev.sh†L171-L188】【F:espn-api-server.cjs†L33-L61】
- Outstanding follow-ups: failure-handling coverage for the SleeperFFHelper auto-refresh loop remains the lone transition gap;
  no redundant files required removal after the audit. 【F:OUTSTANDING_TASKS.md†L11-L13】

# 2025-11-04
- Standardized every PyESPN entrypoint to instantiate `PYESPN('nfl')`, keeping
  the scripts aligned with the vendored documentation and preventing accidental
  divergence from the NFL context. 【F:py/espn_pbp.py†L1-L25】【F:py/espn_schedule.py†L1-L104】【F:py/espn_game.py†L1-L18】【F:py/espn_player.py†L1-L17】
- Re-ran the focused PyESPN script and end-to-end Vitest suites to verify the
  corrected Python adapters continue to pass under the stubbed integration
  environment. 【94bd8c†L1-L4】【b82591†L1-L7】
- Outstanding follow-ups: add failure-handling coverage for the SleeperFFHelper
  auto-refresh loop. 【F:OUTSTANDING_TASKS.md†L12-L13】

# 2025-11-03
- Isolated the PyESPN fake state per Vitest suite by teaching the stub and helper
  utilities to honor `PYESPN_FAKE_STATE_PATH`, preventing cross-test interference
  and making the Python entrypoint, server, and end-to-end specs deterministic.
- Hardened the end-to-end refresh test by reapplying mocked play updates until
  the refreshed payload reflects the change, covering force-refresh cache
  bypasses and scoreboard updates.
- Ignored generated `_state-*.json` fixtures so repeated Vitest runs do not
  leave behind per-suite state copies in the working tree.

# 2025-11-02
- Automated the PyESPN NFL schedule refresh loop inside `SleeperFFHelper` so live game statuses update every minute without user
  interaction while retaining ESPN `event_id` flow.
- Added jsdom integration coverage for the manual Refresh action and the background auto-refresh interval, asserting that
  `fetchEspnSchedule` issues `forceRefresh` requests through the UI.
- Extended the Python entrypoint test suite to compile all PyESPN scripts via `py_compile`, guaranteeing production-safe syntax
  across the ESPN adapters.
- Outstanding follow-ups: none — repository review found no redundant files requiring removal.

# 2025-11-01
- Added a persistent PyESPN fake state fixture and test utilities so integration specs can mutate event data, assert cache/refresh behaviour, and keep the stub aligned with the documented `to_dict` contract. 【F:tests/espn-api/fakes/pyespn/__init__.py†L1-L170】【F:tests/espn-api/fakes/pyespn/_state.json†L1-L94】【F:tests/espn-api/stateUtils.ts†L1-L68】
- Expanded the end-to-end Vitest suite to cover force-refresh flows, refreshed play merges, and manual hook refreshes while broadening the Python script coverage for season-type aliases and argument validation. 【F:tests/espn-api/pyespnEndToEnd.test.ts†L1-L215】【F:tests/espn-api/espnApiServer.test.ts†L1-L121】【F:tests/espn-api/pyespnScripts.test.ts†L1-L118】
- Updated the Python PyESPN entrypoints to call `to_dict` with explicit play-by-play flags so outputs match the library’s documented formatting. 【F:py/espn_game.py†L1-L20】【F:py/espn_pbp.py†L1-L26】
- Outstanding follow-ups: implement the automatic PyESPN schedule refresh in `SleeperFFHelper` and add the UI-level refresh integration test. 【F:OUTSTANDING_TASKS.md†L7-L8】

# 2025-10-31
- Added a jsdom-backed end-to-end regression suite that boots the PyESPN Express server, exercises the Python scripts, TypeScript API helpers, loader, and hook through real HTTP calls using the stubbed PyESPN package, and serialized the run under Vitest to guarantee deterministic coverage. 【F:tests/espn-api/pyespnEndToEnd.test.ts†L1-L178】【F:tests/espn-api/fakes/pyespn/__init__.py†L1-L214】
- Introduced a minimal Vitest configuration that disables worker threading so the ESPN API server integration specs share a single process, preventing port collisions during the new full-stack runs. 【F:vitest.config.ts†L1-L6】
- Outstanding follow-ups: add the automated PyESPN schedule refresh inside `SleeperFFHelper` and ship the UI integration test for the manual Refresh flow. 【F:OUTSTANDING_TASKS.md†L6-L8】

# 2025-10-30
- Enabled force-refresh handling for PyESPN schedule fetches so manual retries bypass cached data, and covered the new path with focused tests. 【F:src/components/SleeperFFHelper.tsx†L203-L276】【F:src/lib/api/__tests__/espn-data.test.ts†L241-L258】
- Rebuilt `dev.sh` around the PyESPN workflow with foreground/background controls, dependency checks, and a dedicated stop command. 【F:dev.sh†L1-L237】
- Removed tracked build/debug artifacts and extended `.gitignore` to keep generated logs, PIDs, and dist bundles out of version control. 【F:.gitignore†L33-L39】

# 2025-10-29
- Expanded the ESPN schedule status normalization to recognize halftime, resumption, rescheduled, and cancellation variants while keeping labels aligned with live PyESPN responses, and added exhaustive unit coverage for the new mappings. 【F:src/lib/api/espn-data.ts†L61-L154】【F:src/lib/api/__tests__/espn-data.test.ts†L1-L118】

# 2025-10-28
- Normalized ESPN schedule statuses and labels across the API helper, survival dashboard, and live PyESPN view, exposing postponed/delayed/canceled states with unit coverage for the normalization logic. 【F:src/lib/api/espn-data.ts†L1-L360】【F:src/components/SleeperFFHelper.tsx†L1-L2700】【F:src/features/live-view-pyespn/components/PyEspnLiveView.tsx†L1-L220】【F:src/lib/api/__tests__/espn-data.test.ts†L1-L68】

# 2025-10-27
- Added a deterministic PyESPN stub plus Vitest coverage for the Python entrypoints and `/api/espn` Express routes so contract regressions are caught without hitting live ESPN services. 【F:tests/espn-api/fakes/pyespn/__init__.py†L1-L142】【F:tests/espn-api/pyespnScripts.test.ts†L1-L53】【F:tests/espn-api/espnApiServer.test.ts†L1-L83】

# 2025-10-26
- Wired the live PyESPN participant panel to the `/api/espn/player/:playerId` endpoint via a new `useEspnPlayers` hook so play-by-play entries render official ESPN names, positions, team abbreviations, and jersey numbers with graceful loading/error messaging. 【F:src/features/live-view-pyespn/components/ParticipantStats.tsx†L1-L78】【F:src/features/live-view-pyespn/data/useEspnPlayers.ts†L1-L138】

# 2025-10-25
- Removed the deprecated `py scripts/fetch_espn_*.py` wrappers now that the ESPN API server calls the dedicated `py/espn_*.py` entry points for schedule, game, play-by-play, and player data. 【F:py/espn_schedule.py†L1-L104】【F:py/espn_game.py†L1-L20】【F:py/espn_pbp.py†L1-L26】【F:py/espn_player.py†L1-L20】
- Added a global `.gitignore` rule for Python `__pycache__` directories to prevent interpreter artifacts from reappearing after the cleanup. 【F:.gitignore†L33-L35】
- Updated the PyESPN transition plan to document the new backend/frontend surface so the migration status reflects the current codebase. 【F:docs/pyespn-transition-plan.md†L10-L41】

## 2025-10-24
- Hardened the PyESPN frontend API helpers to return validated ESPN game, play-by-play, and player payloads while exposing a `forceRefresh` option that maps to the backend cache bypass query. 【F:src/lib/api/espn-data.ts†L1-L228】
- Updated the live view loader to merge canonical game metadata from `/api/espn/game/:eventId` with play-by-play data from `/api/espn/game/:eventId/pbp`, ensuring the UI exercises the dedicated game endpoint and continues to normalize plays from the PyESPN feed. 【F:src/features/live-view-pyespn/data/loadPyEspnGame.ts†L1-L247】

## 2025-10-23
- Updated `py/espn_schedule.py` to emit the canonical PyESPN season type in every schedule item, keeping downstream NFL views aligned with the documented `pre`/`regular`/`post`/`playin` values.
- Added per-route caching with optional force-refresh controls inside `espn-api-server.cjs` so repeated NFL schedule, game, play-by-play, and player lookups reuse recent PyESPN responses without hitting the upstream service unnecessarily.

## 2025-10-22
- Normalized PyESPN season-type handling across the Python schedule script, front-end API helpers, and Sleeper helper so NFL requests always use the documented `pre`/`regular`/`post`/`playin` keys.
- Simplified the PyESPN CLI scripts to accept validated arguments and return canonical JSON directly from the official library.
- Replaced the legacy temporary-file workflow in `scripts/fetch-espn-data.ts` with direct calls to the new PyESPN entrypoints for play-by-play and schedule data.
- Added command-line affordances to the developer script for fetching schedules via the new endpoints.
