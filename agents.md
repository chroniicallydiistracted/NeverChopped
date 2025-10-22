# AGENTS.md — Replace Sleeper NFL Data With PyESPN While Preserving Fantasy Features

## Purpose
Use PyESPN for **all official NFL data**: schedules, event/game IDs, teams, players, play-by-play, and game metadata. Keep Sleeper for **fantasy-only** features: leagues, rosters, lineups, projections, matchups, waivers, and transactions.

## Non‑Goals
Do not change any fantasy-facing UI or data that relies on Sleeper. Do not alter authentication or league selection flows.

## High‑Level Plan
1. Standardize the “official NFL data” source to PyESPN.
2. Preserve existing fantasy logic that uses Sleeper.
3. Provide thin server endpoints that wrap PyESPN calls.
4. Swap front-end fetchers to call those endpoints where “official” data is displayed.
5. Keep a strict boundary: ESPN IDs power NFL views; Sleeper IDs power fantasy views.

---

## Inventory: Current Usage To Replace
Replace only these when they are used for official NFL data:
- Sleeper schedule endpoints
- Any use of Sleeper `game_id` for game/event identity in live/scoreboard/PBP views
- Any use of Sleeper player objects to populate official player identity in non‑fantasy UI
- Any use of Sleeper PBP or game metadata for official visualizations

Keep these Sleeper uses intact:
- User leagues, teams, rosters, lineups, matchup projections, player fantasy projections, waiver/transaction feeds

---

## PyESPN: Canonical Calls For NFL

### Client bootstrap
```python
from pyespn import PYESPN
espn = PYESPN(league_abbv="nfl")
```

### Schedule for a season and week
```python
from pyespn.classes.schedule import Schedule
sched = Schedule(espn_instance=espn, season=2025, schedule_type="regular")
week_events = sched.get_events(week_num=7)  # list[Event]
events_json = [e.to_dict(load_play_by_play=False) for e in week_events]
```

### Game info by ESPN event id
```python
event = espn.get_game_info(event_id=401772924)
game_json = event.to_dict(load_play_by_play=False)
```

### Play‑by‑play for a game
```python
event = espn.get_game_info(event_id=401772924)
event.load_play_by_play()
pbp_json = event.to_dict(load_play_by_play=True)
```

### Player info
```python
player = espn.get_player_info(player_id=15847)
player_json = player.to_dict()
```

Notes:
- ESPN event id is the canonical `game_id` for official data.
- Do not coerce to Sleeper ids for NFL views. Maintain separate mappings only when you need to crosslink to fantasy rosters.

---

## Server Integrations (Node + Python)

Create minimal HTTP endpoints that call PyESPN and return JSON shaped for the UI.

### Endpoints
- GET /api/espn/schedule/:seasonType/:season/:week
- GET /api/espn/game/:eventId
- GET /api/espn/game/:eventId/pbp
- GET /api/espn/player/:playerId

### Node (Express) route patterns
```js
import express from "express"
import { spawn } from "child_process"

function runPy(script, args) {
  return new Promise((resolve, reject) => {
    const p = spawn("python", [script, ...args], { stdio: ["ignore", "pipe", "pipe"] })
    let out = ""
    let err = ""
    p.stdout.on("data", d => out += d.toString())
    p.stderr.on("data", d => err += d.toString())
    p.on("close", code => code === 0 ? resolve(out) : reject(new Error(err || String(code))))
  })
}

const router = express.Router()

router.get("/schedule/:seasonType/:season/:week", async (req, res) => {
  const { seasonType, season, week } = req.params
  const out = await runPy("py/espn_schedule.py", [seasonType, season, week])
  res.type("application/json").send(out)
})

router.get("/game/:eventId", async (req, res) => {
  const { eventId } = req.params
  const out = await runPy("py/espn_game.py", [eventId])
  res.type("application/json").send(out)
})

router.get("/game/:eventId/pbp", async (req, res) => {
  const { eventId } = req.params
  const out = await runPy("py/espn_pbp.py", [eventId])
  res.type("application/json").send(out)
})

router.get("/player/:playerId", async (req, res) => {
  const { playerId } = req.params
  const out = await runPy("py/espn_player.py", [playerId])
  res.type("application/json").send(out)
})

export default router
```

### Python scripts
Create `py/` directory. Ensure a virtualenv with PyESPN installed.

`py/espn_schedule.py`
```python
import json, sys
from pyespn import PYESPN
from pyespn.classes.schedule import Schedule

season_type = sys.argv[1]
season = int(sys.argv[2])
week = int(sys.argv[3])

espn = PYESPN(league_abbv="nfl")
sched = Schedule(espn_instance=espn, season=season, schedule_type=season_type)
events = sched.get_events(week_num=week)
out = []
for e in events:
    d = e.to_dict(load_play_by_play=False)
    out.append({
        "game_id": d.get("event_id"),
        "week": week,
        "season": season,
        "season_type": season_type,
        "date": d.get("date"),
        "status": d.get("status", {}).get("type", {}).get("state"),
        "home_team": d.get("home_team", {}).get("id"),
        "away_team": d.get("away_team", {}).get("id")
    })
print(json.dumps(out, ensure_ascii=False))
```

`py/espn_game.py`
```python
import json, sys
from pyespn import PYESPN

event_id = int(sys.argv[1])
espn = PYESPN(league_abbv="nfl")
event = espn.get_game_info(event_id=event_id)
print(json.dumps(event.to_dict(load_play_by_play=False), ensure_ascii=False))
```

`py/espn_pbp.py`
```python
import json, sys
from pyespn import PYESPN

event_id = int(sys.argv[1])
espn = PYESPN(league_abbv="nfl")
event = espn.get_game_info(event_id=event_id)
event.load_play_by_play()
print(json.dumps(event.to_dict(load_play_by_play=True), ensure_ascii=False))
```

`py/espn_player.py`
```python
import json, sys
from pyespn import PYESPN

player_id = int(sys.argv[1])
espn = PYESPN(league_abbv="nfl")
player = espn.get_player_info(player_id=player_id)
print(json.dumps(player.to_dict(), ensure_ascii=False))
```

---

## Front‑End Swaps

### Replace Sleeper schedule with PyESPN schedule in NFL views
- Where schedule is used to render official game slates, call `/api/espn/schedule/:seasonType/:season/:week`.
- Keep Sleeper schedule for fantasy matchup contexts only.

Example fetcher:
```ts
export async function fetchEspnSchedule(seasonType: "pre"|"regular"|"post", season: number, week: number) {
  const r = await fetch(`/api/espn/schedule/${seasonType}/${season}/${week}`)
  if (!r.ok) throw new Error("espn schedule error")
  return r.json()
}
```

### Use ESPN event id as canonical game_id in NFL UI
- Propagate `game_id` from `/api/espn/schedule` to live views and headers.
- Fetch game detail with `/api/espn/game/:eventId`.
- Fetch PBP with `/api/espn/game/:eventId/pbp`.

### Players in official NFL contexts
- For non‑fantasy views that display player identity, fetch via `/api/espn/player/:playerId`.
- For fantasy matchups, keep using Sleeper player objects and projections.

---

## ID Strategy

- Canonical game id: ESPN `event_id`.
- Canonical team id: ESPN team id in NFL views. Map to Sleeper team where needed for fantasy overlays.
- Canonical player id for NFL views: ESPN player id. Maintain a mapping to Sleeper player id to link fantasy rosters.

Optional mapping table persisted in your DB:
```sql
CREATE TABLE id_map_players (
  espn_player_id BIGINT PRIMARY KEY,
  sleeper_player_id TEXT
);

CREATE TABLE id_map_teams (
  espn_team_id BIGINT PRIMARY KEY,
  sleeper_team_id TEXT
);
```

---

## Caching And Fallbacks

- Cache PyESPN responses per route in memory or Redis for the game window.
- Do not fallback to Sleeper for official schedule or PBP in NFL views.
- Allow UI fallback to “unavailable” state with retry when PyESPN errors.

---

## Validation

1. Unit test each server route with known event ids.
2. Verify schedule counts per week versus ESPN site.
3. Cross‑check a sample PBP drive against ESPN’s published sequence.
4. Verify fantasy pages still load using Sleeper endpoints.

---

## Rollout

1. Deploy new PyESPN routes behind feature flag.
2. Switch NFL schedule UI to `/api/espn/schedule`.
3. Switch live game header and field animation to ESPN `game_id`.
4. Switch PBP source to `/api/espn/game/:eventId/pbp`.
5. Monitor error logs and cache hit rate.
6. Remove any accidental Sleeper calls from NFL views after verification.

---

## Quick Checklist For Agents

- Replace any Sleeper call in non‑fantasy UI that returns schedule, event ids, players, or PBP.
- Do not touch fantasy features using Sleeper.
- Ensure ESPN `event_id` flows end‑to‑end in NFL screens.
- Ensure Python scripts return JSON with `game_id` = ESPN `event_id`.
- Keep code free of inline comments in scripts to match project preference.
