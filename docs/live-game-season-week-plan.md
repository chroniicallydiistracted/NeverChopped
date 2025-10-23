# Live Game Season & Week Selector Implementation Plan

## Requirements From Stakeholders
- Follow the vendored PyESPN documentation under `docs/pyespn-source-code/` when calling the library and always initialize the client with the NFL league abbreviation (`PYESPN('nfl')`).
- Allow users of the Live Game tab to choose any season and week while ensuring all official NFL data (schedule, game metadata, play-by-play) comes exclusively from PyESPN; derive the season type automatically from PyESPN metadata based on the selected week.
- Eliminate the "TBD" placeholders that currently appear in the Live Game experience by hydrating the full team metadata directly from PyESPN instead of falling back to Sleeper-derived fields.
- Confirm the complete PyESPN end-to-end test suite (unit, integration, UI) continues to pass after implementing the new selection flow and data enrichments.

## Current State Summary
1. **Schedule ingestion script** — `py/espn_schedule.py` loads a week via `PYESPN('nfl')` and emits raw competition team dictionaries returned by `event.to_dict(...)`, which are still `$ref` stubs rather than fully-populated team objects. 【F:py/espn_schedule.py†L1-L209】
2. **Frontend API helper** — `fetchEspnSchedule` exposes a `(seasonType, season, week)` signature but simply forwards whatever the Python script returns, so team names resolve to `'TBD'` when only `$ref` entries are present. 【F:src/lib/api/espn-data.ts†L1-L74】
3. **SleeperFFHelper state** — The Live Game tab derives its schedule solely from `nflSchedule`, which is fetched once for the Sleeper-determined week and cannot be overridden by the user. 【F:src/components/SleeperFFHelper.tsx†L205-L286】【F:src/components/SleeperFFHelper.tsx†L1738-L1765】
4. **PyEspnLiveView component** — Assumes the incoming schedule list already represents the active week and simply defaults to the first game id, offering no controls to change season/week. 【F:src/features/live-view-pyespn/components/PyEspnLiveView.tsx†L1-L84】
5. **Live game payload evidence** — The recorded response at `docs/web-app-call-examples/401772942.json` demonstrates that the backend already returns full game metadata (teams, scoring, drives) once a specific ESPN event id is requested, confirming PyESPN holds the required data even though schedule calls currently surface `$ref` placeholders. 【F:docs/web-app-call-examples/401772942.json†L1-L40】
6. **Existing automated coverage** — `tests/espn-api/pyespnEndToEnd.test.ts` verifies that schedule, event, play-by-play, and player fetches work end-to-end for the current week, while `tests/espn-api/SleeperFFHelperRefresh.test.tsx` asserts only the default-week refresh behavior. 【F:tests/espn-api/pyespnEndToEnd.test.ts†L1-L120】【F:tests/espn-api/SleeperFFHelperRefresh.test.tsx†L1-L110】

## Implementation Roadmap
1. **Enrich the Python schedule payload**
   - Update `py/espn_schedule.py` to pull structured team dictionaries directly from the PyESPN objects (e.g., `event.home_team.to_dict()` or `event_dict['competitions'][0]['competitors'][?]['team']`) so the JSON response contains names, abbreviations, colors, and logos instead of `$ref` links.
   - Preserve existing season/week metadata and status normalization while ensuring every schedule entry includes `game_id`, `season`, `season_type`, `week`, `date`, and populated `home_team` / `away_team` blocks consistent with PyESPN documentation.
   - Add an opt-in cache keyed by `(seasonType, season, week)` on the Python side to minimize repeated upstream calls when the frontend toggles between weeks.

2. **Extend frontend schedule tooling**
   - Expand `fetchEspnSchedule` to accept optional caching hints but continue delegating all official data to the backend; add a lightweight in-memory memoization layer keyed by `(season, week)` to avoid unnecessary network calls inside the UI.
   - Create new helpers (or extend existing ones) that expose the list of valid seasons and weeks, sourced exclusively from PyESPN metadata (e.g., `schedule.current_week`, `schedule.events_today`, or `Season` attributes) so the UI does not guess via Sleeper; use the returned metadata to resolve the correct season type for each week.

3. **Introduce Live Game selector state in `SleeperFFHelper`**
   - Add dedicated React state for `liveSeason`, `liveWeek`, and derived `liveSeasonType`, along with loading/error booleans and a memoized cache of schedules per selection.
   - Default these values from `nflState` when the component mounts, but decouple them from the global `nflSchedule` used by the dashboard so user overrides do not disrupt fantasy views.
   - Build a `loadLiveSchedule` helper that calls `fetchEspnSchedule(resolveSeasonType(liveSeason, liveWeek), liveSeason, liveWeek, { forceRefresh })`, stores the enriched results, and exposes callbacks for manual refreshes.

4. **Add UI controls to the Live Game tab**
   - Render season and week selectors directly above `<PyEspnLiveView>`, populating their options from the PyESPN-derived metadata collected in step 2 and displaying the resolved season type for context.
   - Trigger a schedule refetch whenever the user changes either selector, surface loading spinners or inline errors, and disable the 60-second auto-refresh when viewing historical weeks while keeping manual refresh support.
   - Display the selected context (e.g., "2023 • Postseason • Week 2") so users understand which dataset is active, with the season type calculated from PyESPN data.

5. **Update `PyEspnLiveView` to react to selection changes**
   - Accept new props for `isLoading`, `errorMessage`, and a `onRefresh` handler; show a skeleton or empty state when no schedule is loaded.
   - Reset `selectedGameId`, playback state, and uniform data whenever the schedule array changes; if the previously selected game disappears (e.g., switching weeks), fall back to the first available `game_id`.
   - Ensure the component displays the enriched team metadata, removing any `'TBD'` placeholders now that the schedule payload provides full names and abbreviations.

6. **Testing and validation**
   - Extend `tests/espn-api/pyespnEndToEnd.test.ts` with an additional case that fetches a non-current week (e.g., preseason) to confirm the enriched schedule data and caching behave correctly end-to-end.
   - Update `tests/espn-api/SleeperFFHelperRefresh.test.tsx` to cover user-driven season/week changes, verifying that `fetchEspnSchedule` receives the selected arguments and that cached results are reused without additional network calls.
   - Add component tests (or Vitest DOM tests) for the new selector controls to assert loading states, error presentation, and the ability to switch between weeks while keeping PyESPN as the only data source.
   - Run the full suite (`npm test -- --runInBand`) and lint checks (`npm run lint`) to confirm compatibility after the refactor.

## Data & Modeling Considerations
- Rely on PyESPN schedule metadata (e.g., `schedule.current_week`, `week.events`, `event.home_team`) as described in `docs/pyespn-source-code/docs/classes/schedule.md` and related documentation; avoid inferring limits from Sleeper state.
- Normalize team objects once in the Python script so downstream React components can treat them uniformly, reducing ad-hoc `'TBD'` guards.
- Maintain ESPN `event_id` as the canonical identifier for Live Game polling and play-by-play retrieval.

## Testing & Operational Checklist
- ✅ Unit/integration tests for Python schedule enrichment (new tests under `tests/pyespn` or equivalent).
- ✅ Vitest suite: `npm test -- --runInBand` (ensures PyESPN selectors and Live Game UI changes are covered).
- ✅ Linting: `npm run lint` (confirms TypeScript additions meet project standards).
- ✅ Manual verification: load the Live Game tab, switch between multiple weeks/seasons, confirm team names/logos display correctly, and exercise live refresh behavior for an active game.

## Open Questions & Follow-Ups
- Confirm whether PyESPN exposes a canonical list of valid week numbers per season type (including preseason/postseason variations); if not, consider deriving from the loaded schedule object.
- Determine the desired cache invalidation policy for historical weeks—e.g., should the backend refresh weekly even for past seasons to capture data corrections?
- Identify whether additional PyESPN endpoints (odds, broadcasts) should surface in the Live Game UI once the selector is in place.
