# Changelog

# 2025-10-25
- Removed the deprecated `py scripts/fetch_espn_*.py` wrappers now that the ESPN API server calls the dedicated `py/espn_*.py` entry points for schedule, game, play-by-play, and player data. 【F:py/espn_schedule.py†L1-L104】【F:py/espn_game.py†L1-L20】【F:py/espn_pbp.py†L1-L26】【F:py/espn_player.py†L1-L20】
- Added a global `.gitignore` rule for Python `__pycache__` directories to prevent interpreter artifacts from reappearing after the cleanup. 【F:.gitignore†L33-L35】
- Updated the PyESPN transition plan to document the new backend/frontend surface so the migration status reflects the current codebase. 【F:docs/pyespn-transition-plan.md†L10-L41】

## 2025-10-22
- Normalized PyESPN season-type handling across the Python schedule script, front-end API helpers, and Sleeper helper so NFL requests always use the documented `pre`/`regular`/`post`/`playin` keys.
- Simplified the PyESPN CLI scripts to accept validated arguments and return canonical JSON directly from the official library.
- Replaced the legacy temporary-file workflow in `scripts/fetch-espn-data.ts` with direct calls to the new PyESPN entrypoints for play-by-play and schedule data.
- Added command-line affordances to the developer script for fetching schedules via the new endpoints.

## 2025-10-24
- Hardened the PyESPN frontend API helpers to return validated ESPN game, play-by-play, and player payloads while exposing a `forceRefresh` option that maps to the backend cache bypass query. 【F:src/lib/api/espn-data.ts†L1-L228】
- Updated the live view loader to merge canonical game metadata from `/api/espn/game/:eventId` with play-by-play data from `/api/espn/game/:eventId/pbp`, ensuring the UI exercises the dedicated game endpoint and continues to normalize plays from the PyESPN feed. 【F:src/features/live-view-pyespn/data/loadPyEspnGame.ts†L1-L247】

## 2025-10-23
- Updated `py/espn_schedule.py` to emit the canonical PyESPN season type in every schedule item, keeping downstream NFL views aligned with the documented `pre`/`regular`/`post`/`playin` values.
- Added per-route caching with optional force-refresh controls inside `espn-api-server.cjs` so repeated NFL schedule, game, play-by-play, and player lookups reuse recent PyESPN responses without hitting the upstream service unnecessarily.
