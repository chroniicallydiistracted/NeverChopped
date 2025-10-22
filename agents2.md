# PyESPN Integration & Agents Guide 2 (Complete)

Last updated: 2025-10-22

Purpose
-------
This document defines the authoritative implementation guidance for using PyESPN (ESPN source) for *official NFL data* inside this project, and for retaining Sleeper API usage exclusively for *fantasy* data. It contains parameter and class usage, safe code patterns, migration steps, test recipes, and a complete audit of code locations that currently consume Sleeper for fantasy purposes.

High level rule
---------------
- Use PyESPN (ESPN) for ALL official NFL data:
  - Player names/official player metadata (in-game display)
  - NFL schedule and canonical game/event IDs
  - Play-by-play (PBP) data and drives/plays
  - Game status and scoreboard (real-time)
  - Team metadata (franchise name, abbreviations, venue)
- Use Sleeper API for ALL fantasy data:
  - Leagues, league settings, rosters, owners
  - Fantasy starters/bench, lineups, roster membership
  - Fantasy projections, fantasy points, scoring rules
  - Transactions, matchups, standings and survival/chopped logic
- Do not swap responsibilities: mixing sources for the same authoritative data causes mismatches.

Section A — PyESPN: correct usage patterns and code examples
------------------------------------------------------------

A.1. Initialize client (Python)
```python
import pyespn

# Safe initialization example
def make_espn(season=None):
    espn = pyespn.PYESPN('nfl')
    # Optionally set or validate internal configs here
    return espn
```

A.2. Load season schedule and extract week games (canonical game/event IDs)

Use PyESPN schedule API exactly as the library exposes. Example safe method:
```python
def fetch_week_schedule(week:int, year:int):
    espn = make_espn(year)
    # load_season_schedule is expected by the bundled pyespn wrapper
    espn.load_season_schedule(season=year)

    schedule = None
    if hasattr(espn, 'league') and getattr(espn.league, 'schedules', None):
        schedule = espn.league.schedules.get(year)

    week_games = []
    if schedule:
        for week_schedule in schedule.weeks:
            if week_schedule.week_number == week:
                for event in getattr(week_schedule, 'events', []):
                    # event.event_id is canonical ESPN event id
                    week_games.append({
                        'event_id': getattr(event, 'event_id', None) or getattr(event, 'id', None),
                        'week': week_schedule.week_number,
                        'date': getattr(event, 'date', None),
                        'home_team': getattr(event, 'home_team', {}).get('name') if getattr(event, 'home_team', None) else None,
                        'away_team': getattr(event, 'away_team', {}).get('name') if getattr(event, 'away_team', None) else None,
                        'status': getattr(event, 'status', None)
                    })
    return week_games
```
- Always use `event.event_id` (or the library-provided attribute). This is the canonical ESPN id used across ESPN endpoints.
- Validate attributes with getattr/hasattr to avoid runtime errors on missing fields.

A.3. Load game and plays (play-by-play)
```python
def fetch_game_plays(event_id: str):
    espn = make_espn()
    # Some pyespn versions provide load_game or similar; check for available API surface
    if hasattr(espn, 'load_game'):
        espn.load_game(event_id)
    # Read from espn.games or espn.game cache depending on the pyespn implementation
    game_obj = None
    if hasattr(espn, 'games'):
        game_obj = espn.games.get(event_id) or espn.games.get(str(event_id))
    elif hasattr(espn, 'get_game'):
        game_obj = espn.get_game(event_id)
    if not game_obj:
        raise RuntimeError(f"Game {event_id} not found in PyESPN instance.")
    plays = getattr(game_obj, 'plays', [])
    # normalize plays into plain JSON serializable dicts
    normalized = []
    for p in plays:
        normalized.append({
            'id': getattr(p, 'id', None),
            'sequence': getattr(p, 'sequence', None),
            'text': getattr(p, 'text', None) or getattr(p, 'shortText', None),
            'clock': getattr(p, 'clock', None),
            'period': getattr(getattr(p, 'period', None), 'number', None),
            'participants': getattr(p, 'participants', []),
            'start': getattr(p, 'start', {}),
            'end': getattr(p, 'end', {}),
            'statYardage': getattr(p, 'statYardage', None),
        })
    return {
        'game': {
            'id': getattr(game_obj, 'event_id', getattr(game_obj, 'id', event_id)),
            'homeTeam': getattr(game_obj, 'home_team', None),
            'awayTeam': getattr(game_obj, 'away_team', None),
            'status': getattr(game_obj, 'status', None),
        },
        'plays': normalized
    }
```
- Normalize into simple JSON-friendly structures before returning to Node backend or frontend.

A.4. Error handling & version detection
- PyESPN wrappers can change. Always check for the presence of expected methods (e.g., `load_season_schedule`, `load_game`) using `hasattr`.
- When a method is absent, log the exact available attributes (for debugging), and fail gracefully.

A.5. Recommended Python script contract (for backend)
- Input params: week/year OR gameId + output path
- Exit codes:
  - 0 — success and wrote JSON to path
  - non-zero — error (exit code 1)
- Output file must be atomic — write to temp then rename to final path
- Print minimal stdout for debugging; put diagnostic messages to stderr.

Section B — Node backend wrapper (best-practices)
-------------------------------------------------
Your existing `espn-api-server.cjs` is the intended wrapper. Use these rules:

B.1. Execute Python scripts robustly
- Use spawn/exec with a timeout and capture exit code.
- Do not consider presence of stderr alone as a fatal signal (some libraries print to stderr but still succeed) — instead check process exit code and whether the expected output file exists and is valid JSON.
- Example improvements (pseudocode):
  - run command
  - if exitCode !== 0 -> log stdout/stderr -> return 500
  - verify temp file exists -> read -> parse JSON -> return

B.2. Prevent stale files / cache poisoning
- Never serve a stale temp file if the script failed to write: check file mtime vs command start time.
- If a stale file is present but the new script failed, return explicit error and do not silently return stale results.

B.3. Logging
- Log the exact command executed, arguments, start/finish timestamps, and final size and checksum of the JSON produced.

Section C — Frontend: expected API surface and normalization
-------------------------------------------------------------
- Frontend will call:
  - `/api/espn/schedule/{week}/{year}` -> returns array of schedule objects with canonical `game_id` or `event_id`.
  - `/api/espn/game/{gameId}` -> returns { game: { id, date, homeTeam, awayTeam, status }, plays: [...] }
- Normalization rules in frontend (TypeScript):
  - Always treat `game.id || game.event_id` as the canonical game identifier.
  - `schedule` array elements must contain: `game_id` (string), `week` (number), `date` (ISO string), `home` and `away` (short names/abbreviations).
  - If frontend code expects `game_id` in a particular format, the backend must transform ESPN event_id to that property: `game.game_id = game.id || game.event_id`.

Section D — ID mapping between ESPN and Sleeper
-----------------------------------------------
- Sleeper player objects include cross-IDs (espn_id, yahoo_id, etc.). The repository already fetches the full player DB from Sleeper (`/v1/players/nfl`).
- Always use the Sleeper player DB to map fantasy roster entries (Sleeper player_id) to ESPN players:
  - For display in Live Game visualizer, map the ESPN participant (athlete id or name) to the Sleeper `player_id` using `espn_id` or by matching canonical name if IDs are absent.
- Provide a mapping utility:
```ts
// pseudo-TS
function buildEspnToSleeperMap(playersBySleeperId: Record<string, any>) {
  const espnToSleeper: Record<string, string> = {};
  Object.entries(playersBySleeperId).forEach(([pid, p]) => {
    if (p.espn_id) espnToSleeper[String(p.espn_id)] = pid;
    // fallback: normalized name mapping (last,first) if absolutely necessary
  });
  return espnToSleeper;
}
```
- Never rely on name-only mapping if espn_id is present.

Section E — Migration plan (step-by-step)
-----------------------------------------
1. **Audit**: Identify all places where Sleeper is used to fetch NFL data.
   - (See list below — "Files relying on Sleeper for fantasy and for NFL-specific data")
2. **Protect fantasy paths**: Ensure all fantasy flows continue to call Sleeper endpoints unchanged.
3. **Implement PyESPN routes** in backend (if missing):
   - `/api/espn/schedule/:week/:year`
   - `/api/espn/game/:gameId`
   - Keep node wrapper (espn-api-server.cjs) but harden it (see B.1 & B.2).
4. **Replace NFL schedule and PBP consumers**:
   - Replace any frontend call that uses Sleeper for schedule/game event IDs with calls to `/api/espn/schedule`.
   - Replace consumers of Sleeper play data (if any) with `usePyEspnGame` hook that calls the new PyESPN endpoints.
5. **Inject mapping layer**:
   - Build and cache `espnId -> sleeperPlayerId` map for cross-references.
6. **Test**:
   - Unit tests for mapper functions.
   - Integration tests for `/api/espn/*` endpoints.
   - Manual UI tests: pick a game, load live view, verify player names, plays, and that fantasy points still come from Sleeper.
7. **Fallback**:
   - If PyESPN fails for a game, show an explicit "ESPN source unavailable" UI. Do not silently fetch equivalent data from Sleeper for official NFL sources.
   - For non-critical display info (e.g., a missing team logo), optionally fall back to local assets.

Section F — Caching and performance
-----------------------------------
- Cache schedules for the week in-memory on server for up to 60–300 seconds during gameday; otherwise longer for future weeks (e.g., 12h).
- Cache espn->sleeper ID map for the app lifecycle; update daily or when player DB changes.
- For PBP, allow short TTL (5–15s) and support force-refresh query param for debugging.

Section G — Tests & validation
------------------------------
G.1 Python script unit tests:
- Test `fetch_week_schedule(7, 2025)` returns a list of events with `event_id`.
- Test `fetch_game_plays(event_id)` returns 'game.id' and non-empty plays array for a known live game.

G.2 Node e2e:
- Start espn-api-server, call `/api/espn/schedule/7/2025` -> verify JSON parse and `game_id` presence.
- Call `/api/espn/game/{known_good_event_id}` -> verify plays exist.

G.3 Frontend:
- Mock backend responses to ensure UI uses `game_id` from schedule as selectedGameId.
- Verify `usePyEspnGame` hook uses ESPN endpoint and maps to UI model.

Section H — Logging & metrics
-----------------------------
- Log adapter used (ESPN or fallback), timestamps, response size and play counts.
- Expose health endpoint for ESPN API server and simple metrics: last successful schedule fetch per week.

Section I — Security & operational notes
----------------------------------------
- Avoid exposing ESPN internal tokens — PyESPN uses public endpoints; ensure no sensitive data is leaked.
- Python environment: ensure `pyespn` version used in dev matches production expectations. Use a pinned version in requirements.txt.
- Ensure Python interpreter path is correct in scripts (`python` vs `python3`) in target deployment.

Section J — Full audit: current code locations relying on Sleeper API for fantasy data
------------------------------------------------------------------------------------
Below is a code-level inventory of files and modules in this repository that currently rely on the Sleeper API for fantasy football features. **These are fantasy usages and must be preserved.** (This list is derived from the repository codebase — if you want, I can open each file and prepare exact change PRs.)

- `src/components/SleeperFFHelper.tsx`
  - Primary orchestrator for league data fetching: uses GraphQL (SPORT_INFO_QUERY, MATCHUP_LEGS_QUERY, etc.) and falls back to Sleeper REST endpoints:
    - `https://api.sleeper.app/v1/state/nfl` (NFL state)
    - `https://api.sleeper.app/v1/players/nfl`
    - `https://api.sleeper.app/v1/players/nfl/trending/...`
    - `https://api.sleeper.app/v1/league/{league_id}/rosters`
    - `https://api.sleeper.app/v1/league/{league_id}/users`
    - `https://api.sleeper.app/v1/league/{league_id}/matchups/{week}`
    - `https://api.sleeper.app/v1/league/{league_id}/transactions/{week}`

- `sleeper_ff_helper.tsx` (legacy / alternative entry)
  - Fetches league `/v1/league/{id}`, `/v1/league/{id}/rosters`, `/v1/league/{id}/users`, and `/v1/league/{id}/matchups/{week}`.
  - Helper functions to map roster -> user, get player names from `players` map fetched from Sleeper players endpoint.

- `src/graphql/queries.ts`
  - GraphQL queries used by app for fantasy endpoints (user, leagues, rosters, matchups, transactions, plays by game) — these are for GraphQL wrapper around Sleeper or app GraphQL service.

- `src/graphql/types.ts`
  - Types for GraphQL responses relating to leagues, rosters, matchups, etc.

- `src/config.ts`
  - Default config and localStorage config for league + survival overrides; used by fantasy logic (teamsRemaining, eliminatedRosterIds).

- `src/components/LoginScreen.tsx`
  - Manual token handling for Sleeper JWT used for GraphQL/REST calls tied to fantasy flows.

- `scripts/auto-sync-uniforms.ts`, `scripts/sync-weekly-uniforms.ts`, `scripts/get-weekly-uniforms.ts`, `scripts/sync-helmets.ts`, etc.
  - These scripts scrape or sync weekly uniform data from GUD — not Sleeper NFL data but part of weekly asset sync pipeline. Leave as-is.

- Documentation files that document Sleeper endpoints and fantasy flows (do not delete):
  - `docs/SLEEPER_API_REFERENCE.md`
  - `docs/ENHANCED_LINEUP_ALERTS.md`
  - `docs/PHASE_1_TESTING_GUIDE.md`
  - `docs/BUGFIX_ACTIVE_TEAMS_V2.md`
  - `README.md`, `docs/*` referencing fantasy logic and endpoints

- Frontend components referencing fantasy projections, lineup alerts, survival logic:
  - `src/components/LiveGameVisualizer.tsx` (reads plays from orchestrator, but fantasy scoring still comes from Sleeper projections when applicable)
  - `src/components/...` (lineup alerts code in `SleeperFFHelper.tsx` uses projections and `players` DB from Sleeper)

Note: The app also contains explicit ESPN adapters and scripts:
- `py scripts/fetch_espn_schedule.py`
- `py scripts/fetch_espn_data.py`
- `espn-api-server.cjs`
- `src/lib/api/espn-data.ts` (frontend wrapper for local `/api/espn/*` endpoints)
These are the parts we will use for official NFL sourcing.

Section K — Checklist: before changing anything
------------------------------------------------
- [ ] Add tests for existing fantasy flows (rosters, projections, matchups) to ensure no regressions.
- [ ] Add tests for espn-api-server endpoints and Python scripts.
- [ ] Add logging as described and a quick manual test plan:
  - Run `./dev.sh` (starts espn-api-server.cjs and frontend).
  - Curl `/api/espn/schedule/7/2025` and verify JSON.
  - Select a game in Live Game tab and verify plays come from ESPN and fantasy points come from Sleeper.

Appendix: Helpful conversion snippets
------------------------------------
1. TypeScript mapping helper (frontend):

```ts
// src/lib/mappers/espnToSleeper.ts
export function buildEspnToSleeper(playersBySleeperId: Record<string, any>) {
  const espnMap: Record<string, string> = {};
  Object.entries(playersBySleeperId).forEach(([sleeperId, p]) => {
    const espnId = p?.espn_id ?? p?.espnId;
    if (espnId) espnMap[String(espnId)] = sleeperId;
  });
  return espnMap;
}
```

2. Node wrapper sanity check (server):
- Validate that the Python invocation produced a JSON file and that JSON parses before returning response. If parse fails return 500.

Concluding notes
----------------
This agents.md is the canonical migration and operational guide for using PyESPN for official NFL datapoints while preserving the Sleeper-backed fantasy functionality. Follow the migration steps in Section E. Use the mapping utilities and tests before you flip the switch.