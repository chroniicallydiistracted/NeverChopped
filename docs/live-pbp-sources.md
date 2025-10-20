# Live Play-by-Play Data Sources

## ESPN "Hidden" APIs (Primary Live Source)

### 1. Scoreboard / Event Discovery
- **Endpoint**: `http://site.api.espn.com/apis/site/v2/sports/football/nfl/events`
- **Use**: Enumerate all current NFL events. Each event carries `id`, teams, and `fullStatus` with live clock/period.

### 2. Game Summary
- **Endpoint**: `http://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}`
- **Key payloads**:
  - `header.fullStatus` for real-time clock/period updates.
  - `drives.current` / `drives.previous` → each drive contains a `plays` array with rich metadata (start/end yard line, textual description, penalties).
  - `scoringPlays` for quick scoring summaries (with timestamps and yard line).
- **Polling cadence**: Every 5–10 seconds mirrors ESPN’s own refresh.

### 3. Full Play-by-Play Feed
- **Endpoint**: `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eventId}/competitions/{eventId}/plays`
- **Details**:
  - Returns an object with `count`, `pageIndex`, `pageSize`, and `items` (each item is a play).
  - Play object fields include:
    - `id`, `sequenceNumber`
    - `type` (text + ID for play type)
    - `text` / `shortText` / `alternativeText`
    - `period.number`, `clock.displayValue`
    - `start` / `end` subsections: `down`, `distance`, `yardLine`, `yardsToEndzone`, `team`
    - `teamParticipants` (offense/defense)
    - `participants` array referencing players with stats (e.g., passing, rushing)
    - `statYardage`, `penalty` details, `probability` references
    - `modified`, `wallclock` timestamps → useful for detecting new plays
  - **Pagination**: default pageSize = 25; use `pageIndex` to fetch older plays if needed.

### 4. Additional ESPN endpoints
- **Game details (competitors, odds, venue)**: `http://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}` (same summary payload).
- **Team info**: `http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}` (mapping IDs to names, logos).
- **Athlete info**: URLs in `participants[].athlete.$ref` (optional if we need deeper roster data).

### Integration Notes
- These endpoints are public; no auth required. Browser requests generally succeed, but consider proxying to avoid CORS surprises.
- Use scoreboard to detect new events, then summary/plays for detailed PBP.
- The `plays` feed is the canonical list—treat it as the primary data source and merge with our standard play model (`StandardPlay`).
- ESPN provides wallclock timestamps; polling at ~5 seconds is sufficient for near-real-time updates.

## Supplemental / Post-Game Sources

### nflfastR (Post-game, high fidelity)
- **Use**: Enrich historical data (EPA, advanced metrics, tracking if available).
- **Data**: `play_by_play_{season}.csv.gz` via `https://github.com/nflverse/nflverse-data/releases`.
- **Status**: Downloaded and processed via `npm run fetch:nflfastr`; stored under `public/nflfastr/<season>/<game>.json`.
- **Limit**: Not live—official data published post-game only.

### Sleeper API (Existing Live Source)
- **Endpoints**: REST/GraphQL (`https://api.sleeper.app/plays/...`, `PLAYS_BY_GAME_QUERY`).
- **Use**: We maintain compatibility as fallback; useful for live data when ESPN endpoints fail.
- **Limitations**: Missing plays, inconsistent territory fields (documented in `ANIMATION_LOGIC_ISSUES.md`).

## Proposed Data Flow
1. **Live Mode**:
   - Poll ESPN `summary` for status + scoreboard.
   - Poll ESPN `plays` endpoint; merge into `StandardPlay` (primary live feed).
   - If ESPN unavailable, fall back to Sleeper live data.
2. **Post-Game / Historical Mode**:
   - Prefer nflfastR datasets (already merged into orchestrator).
   - Use ESPN for narrative/play text if needed.

## Next Steps
- Build adapter for ESPN `plays` feed → convert to `StandardPlay` (with team/time normalization).
- Update orchestrator to prefer ESPN for live games, nflfastR for completed games, Sleeper as fallback.
- Determine caching strategy to avoid throttling (local in-memory or persistent store).
