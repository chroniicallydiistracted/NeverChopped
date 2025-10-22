# PyESPN Transition Implementation Plan

## Requirements From Stakeholders
- Use the PyESPN Python library as the single source for official NFL schedules, game/event metadata, play-by-play, and player information.
- Preserve all Sleeper API usage for fantasy-only workflows (leagues, rosters, projections, waivers, transactions, lineup alerts) and avoid modifying fantasy-facing UI flows.
- Mirror the route and script contracts defined in `agents.md`: expose `/api/espn/schedule/:seasonType/:season/:week`, `/api/espn/game/:eventId`, `/api/espn/game/:eventId/pbp`, and `/api/espn/player/:playerId`, implemented as thin Node wrappers that spawn PyESPN-backed Python scripts which emit JSON without inline comments.
- Implement PyESPN calls exactly as documented in `docs/pyespn-source-code/` without inventing or inferring undocumented behavior; flag any ambiguous gaps before making code changes.
- Maintain ESPN `event_id` as the canonical `game_id` for NFL visualizations and avoid coercing to Sleeper identifiers outside of explicit fantasy overlays.

## Current State Summary (Fact-First)
1. **API server** — `espn-api-server.cjs` now exposes the full PyESPN surface (`/api/espn/schedule/:seasonType/:season/:week`, `/api/espn/game/:eventId`, `/api/espn/game/:eventId/pbp`, and `/api/espn/player/:playerId`) and wraps each call with short-lived caches plus JSON parsing before responding. 【F:espn-api-server.cjs†L1-L126】
2. **Python scripts** — The legacy `py scripts/fetch_espn_*.py` wrappers have been replaced by dedicated entry points in `py/espn_schedule.py`, `py/espn_game.py`, `py/espn_pbp.py`, and `py/espn_player.py`, each instantiating `PYESPN('nfl')` and returning the library's `to_dict` payloads. 【F:py/espn_schedule.py†L1-L104】【F:py/espn_game.py†L1-L20】【F:py/espn_pbp.py†L1-L26】【F:py/espn_player.py†L1-L20】
3. **Frontend data access** — `src/lib/api/espn-data.ts` now ships typed helpers for schedule, game, play-by-play, and player lookups, normalizes ESPN identifiers, and supports optional cache bypass flags. 【F:src/lib/api/espn-data.ts†L1-L330】
4. **Live game experience** — `src/features/live-view-pyespn/components/PyEspnLiveView.tsx` and its data loaders consume the canonical ESPN schedule/game payloads end-to-end, relying on `usePyEspnGame` for refreshed play data and expecting ESPN `game_id` strings. 【F:src/features/live-view-pyespn/components/PyEspnLiveView.tsx†L1-L210】【F:src/features/live-view-pyespn/data/loadPyEspnGame.ts†L1-L320】
5. **Schedule sourcing** — `src/components/SleeperFFHelper.tsx` now preserves the PyESPN-derived schedule returned by `fetchEspnSchedule` instead of overwriting it with Sleeper's public NFL schedule endpoint, keeping the Live Game tab anchored to ESPN event ids. 【F:src/components/SleeperFFHelper.tsx†L187-L332】
6. **PyESPN usage references** — The vendored PyESPN source under `docs/pyespn-source-code/` documents the canonical initialization (`PYESPN('nfl')`), schedule retrieval (`Schedule(...).get_events`), event loading (`espn.get_game_info` + `load_play_by_play()`), and object serialization via `to_dict(...)`. These APIs must guide the migration. 【F:docs/pyespn-source-code/pyespn/core/client.py†L16-L111】【F:docs/pyespn-source-code/pyespn/classes/schedule.py†L1-L132】【F:docs/pyespn-source-code/pyespn/classes/event.py†L1-L135】

## End-to-End Transition Plan
1. **Design updated backend routes and scripts**
   - Create dedicated Python entry points (`py/espn_schedule.py`, `py/espn_game.py`, `py/espn_pbp.py`, `py/espn_player.py`) matching the examples in `agents.md`, each instantiating `PYESPN('nfl')` and returning `to_dict` results shaped by PyESPN internals. Ensure they accept CLI args exactly as described and emit JSON without additional formatting. (Reference: `agents.md` route/script contract; PyESPN classes for serialization.)
   - Update `espn-api-server.cjs` to expose the four documented routes, invoke the corresponding scripts via `spawn` (or `exec`) with sanitized parameters, enforce JSON parsing before responding, and remove the legacy `/api/espn/schedule/:week/:year` signature. 【F:agents.md†L76-L196】【F:espn-api-server.cjs†L1-L75】

2. **Align frontend API utilities with new endpoints**
   - Expand `src/lib/api/espn-data.ts` to include typed helpers for `fetchEspnSchedule(seasonType, season, week)`, `fetchEspnGame(eventId)`, `fetchEspnPlayByPlay(eventId)`, and `fetchEspnPlayer(playerId)`, using the new REST paths and returning validated shapes matching PyESPN `to_dict` outputs. Deprecate the old `week/year` signature.
   - Introduce TypeScript interfaces mirroring the serialized PyESPN objects (leveraging `docs/pyespn-source-code/pyespn/classes/event.py` & `schedule.py` for fields) so downstream consumers know the guaranteed structure.

3. **Remove Sleeper schedule from official NFL context**
   - In `SleeperFFHelper.tsx`, eliminate the REST call to `https://api.sleeper.app/schedule/...` for the Live Game tab, retaining only the PyESPN-derived schedule (`loadNflScheduleFromEspn`). Ensure fantasy features (e.g., matchup context, eliminated team logic) continue using Sleeper endpoints where required.
   - Normalize `loadNflScheduleFromEspn` to expect the new `fetchEspnSchedule` signature and pass canonical ESPN `event_id` values downstream (`game.game_id`). Audit any other uses of `nflSchedule` to confirm they handle the PyESPN schema.

4. **Propagate ESPN IDs through Live Game UI**
   - Confirm `PyEspnLiveView` and related components (`FieldAnimationCanvas`, `PlayList`, `ParticipantStats`, `PlaybackControls`) rely solely on the PyESPN schedule/game payload. Adjust props or derived data if field names change after standardizing JSON output from the new scripts.
   - Ensure `usePyEspnGame` calls the correct endpoint for real-time updates and consider adding error messaging for PyESPN failures.

5. **Add optional player lookup integration**
   - Where the UI displays official player metadata (e.g., participants list in `ParticipantStats`), evaluate whether additional ESPN player data is needed. If so, integrate the `/api/espn/player/:playerId` helper to enrich the view without altering fantasy scoring logic.

6. **Testing & validation strategy**
   - Write smoke tests or scripts that call each new backend route with known ESPN IDs to confirm the PyESPN scripts succeed (leveraging sample IDs from docs/agents).
   - Manually verify the Live Game tab loads schedule entries, fetches plays, and animates them using ESPN event IDs. Confirm fantasy tabs still operate on Sleeper data.
   - Add logging in backend routes for troubleshooting (as recommended in `agents2.md` Section H) while avoiding sensitive data exposure.

7. **Flag potential ambiguities**
   - If PyESPN’s `to_dict` output differs from expectations or lacks fields required by the UI (e.g., uniform team abbreviations), pause implementation and request clarification before reshaping data.
   - If any fantasy feature implicitly depends on Sleeper schedule fields (e.g., elimination logic tied to Sleeper `matchup_id`), document the dependency and confirm scope before modifying.

## Deliverables
- Updated Node backend routes & Python scripts adhering to agent contracts.
- Frontend API helpers and Live Game components consuming ESPN-only data end-to-end.
- Removal of Sleeper schedule usage from official NFL visualizations while preserving all fantasy logic.
- Test notes and logging instrumentation outlined above.

## Next Actions
- Review this plan with stakeholders for approval.
- After sign-off, implement steps sequentially, validating after each phase and halting on any ambiguous PyESPN behavior for confirmation.
