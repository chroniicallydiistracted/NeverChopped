# 🎯 Sleeper API Endpoints Reference

## Quick Reference Guide

### ✅ Working Endpoints (Confirmed)

#### **Player Projections** (PPR Scoring)
```
GET https://api.sleeper.app/projections/nfl/scoring_type/ppr?season_type=regular&season=2025&week=7
```
**Response:** `{ "player_id": projected_points }`  
**Example:** `{ "4046": 20.02 }` (Patrick Mahomes)  
**Notes:** 
- Returns 400+ players with projections
- Available 24/7 (not just pre-game)
- Undocumented but stable

#### **Season Stats** (All Players)
```
GET https://api.sleeper.app/v1/stats/nfl/regular/2025
```
**Response:** Complex object with season totals for all players  
**Fields:** rush_yd, pass_yd, rec, td, pts_std, pts_half_ppr, pts_ppr, etc.

#### **Weekly Stats** (All Players)
```
GET https://api.sleeper.app/v1/stats/nfl/regular/2025/7
```
**Response:** Complex object with week 7 stats for all players  
**Same fields as season stats**

#### **Filtered Stats** (By Position)
```
GET https://api.sleeper.app/stats/nfl/2025/7?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF
```
**Response:** Filtered stats by position

#### **Player Database**
```
GET https://api.sleeper.app/v1/players/nfl
```
**Response:** ~5MB JSON with 6,957 players  
**Important IDs:**
- `player_id`: Sleeper's internal ID
- `stats_id`: Swish Analytics ID
- `fantasy_data_id`: FantasyData service ID
- `espn_id`, `yahoo_id`, `rotowire_id`, `sportradar_id`

#### **NFL State** (Current Week/Season)
```
GET https://api.sleeper.app/v1/state/nfl
```
**Response:**
```json
{
  "week": 7,
  "season": "2025",
  "season_type": "regular",
  "leg": 1
}
```

#### **League Info**
```
GET https://api.sleeper.app/v1/league/{league_id}
```

#### **League Rosters**
```
GET https://api.sleeper.app/v1/league/{league_id}/rosters
```
**Important:** Contains `settings.eliminated` field for survival leagues!

#### **Weekly Matchups**
```
GET https://api.sleeper.app/v1/league/{league_id}/matchups/{week}
```
**Response:** Actual scores with `players_points` breakdown

#### **Transactions**
```
GET https://api.sleeper.app/v1/league/{league_id}/transactions/{week}
```

#### **Trending Players**
```
GET https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=50
GET https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=50
```

#### **NFL Schedule** (Undocumented)
```
GET https://api.sleeper.app/schedule/nfl/{season_type}/{season}
```
**Example:** `https://api.sleeper.app/schedule/nfl/regular/2025`

**Response:** Array of game objects
```json
[
  {
    "status": "complete",
    "date": "2025-10-16",
    "home": "CIN",
    "away": "PIT",
    "week": 7,
    "game_id": "202510700"
  },
  {
    "status": "in_progress",
    "date": "2025-10-19",
    "home": "KC",
    "away": "LV",
    "week": 7,
    "game_id": "202510710"
  },
  {
    "status": "pre_game",
    "date": "2025-10-19",
    "home": "ARI",
    "away": "GB",
    "week": 7,
    "game_id": "202510701"
  }
]
```

**Status Values:**
- `complete` - Game has finished
- `in_progress` - Game is currently live
- `pre_game` - Game hasn't started yet

**Use Cases:**
- Show which fantasy scores are final vs still updating
- Display live game status on game day
- Help users know when they need to set lineups
- Track which games have players still playing

---

## 🔍 Data Structures

### Projections Response
```typescript
{
  "4046": 20.02,    // Patrick Mahomes
  "6786": 17.47,    // Josh Allen
  "4984": 15.23,    // Other player
  // ... 431 total players
}
```

### Player Object (from /v1/players/nfl)
```typescript
{
  "player_id": "4046",
  "first_name": "Patrick",
  "last_name": "Mahomes",
  "position": "QB",
  "team": "KC",
  "injury_status": null,
  "stats_id": "839031",           // For stats APIs
  "fantasy_data_id": "18890",     // FantasyData API
  "espn_id": "3139477",           // ESPN API
  "yahoo_id": "30123",            // Yahoo API
  "rotowire_id": "11839",         // Rotowire API
  "sportradar_id": "UUID",        // Sportradar API
  // ... 40+ other fields
}
```

### Matchup Response
```typescript
{
  "roster_id": 1,
  "matchup_id": 1,
  "points": 115.6,
  "players": ["4046", "6786", ...],
  "starters": ["4046", "6786", ...],
  "players_points": {
    "4046": 23.4,
    "6786": 18.2,
    // ...
  },
  "starters_points": [23.4, 18.2, ...]
}
```

### Roster Response
```typescript
{
  "roster_id": 1,
  "owner_id": "user_id",
  "players": ["4046", "6786", ...],
  "starters": ["4046", "6786", ...],
  "settings": {
    "wins": 5,
    "losses": 1,
    "eliminated": 0  // 🎯 KEY FIELD: 0 = active, week# = eliminated
  }
}
```

---

## 📊 Usage Examples

### Get This Week's Projections
```javascript
const week = 7;
const season = 2025;
const response = await fetch(
  `https://api.sleeper.app/projections/nfl/scoring_type/ppr?season_type=regular&season=${season}&week=${week}`
);
const projections = await response.json();
console.log(`Mahomes projection: ${projections['4046']} points`);
```

### Get Player Season Stats
```javascript
const response = await fetch('https://api.sleeper.app/v1/stats/nfl/regular/2025');
const stats = await response.json();
console.log(`Mahomes season stats:`, stats['4046']);
// { pass_yd: 2543, pass_td: 18, pts_ppr: 234.5, ... }
```

### Check If Team Is Eliminated
```javascript
const response = await fetch('https://api.sleeper.app/v1/league/{league_id}/rosters');
const rosters = await response.json();

rosters.forEach(roster => {
  if (roster.settings.eliminated) {
    console.log(`Team ${roster.roster_id} eliminated in week ${roster.settings.eliminated}`);
  } else {
    console.log(`Team ${roster.roster_id} is still active`);
  }
});
```

---

## 🚀 App Integration

### Current Implementation
Our app now uses projections in:

1. **Lineup Alerts** - Shows projected points for injured/questionable players
2. **Start/Sit Recommendations** - Compares bench projections vs starters
3. **Survival Mode Scoreboard** - Shows projected scores before games start
4. **Projected vs Actual Table** - Tracks performance against projections

### Transformation for Consistency
```javascript
// API returns: { "player_id": score }
// We transform to: { "player_id": { pts_half_ppr: score, stats: { pts_half_ppr: score } } }

const transformedProjections = {};
Object.keys(projectionsData).forEach(playerId => {
  const projectedScore = projectionsData[playerId];
  transformedProjections[playerId] = {
    pts_half_ppr: projectedScore,
    stats: { pts_half_ppr: projectedScore }
  };
});
```

---

## 📝 Notes

- **Rate Limiting:** Stay under 1000 calls/minute
- **Player Database:** Only fetch once per day (5MB file)
- **Projections:** Updated weekly, available 24/7
- **Elimination Detection:** `settings.eliminated` is the OFFICIAL method (100% accurate)
- **Undocumented Endpoints:** Projections and filtered stats are not in official docs but stable

---

## 🔗 Resources

- Official Docs: https://docs.sleeper.app/
- SleeperAPIResearch folder: Contains Python wrapper examples and Go library docs
- Community findings: Multiple projection endpoints discovered through research

---

**Last Updated:** October 17, 2025  
**App Version:** 1.0.0  
**Status:** ✅ Projections fully integrated and working
