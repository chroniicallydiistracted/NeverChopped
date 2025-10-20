# 🚨 CRITICAL ISSUES FOUND - LiveGameVisualizer

**Date**: October 19, 2025  
**Status**: 🔴 MULTIPLE CRITICAL BUGS IDENTIFIED  
**Impact**: NO PLAYER NAMES, NO HELMETS, BROKEN SCOREBOARD

---

## 🔥 ROOT CAUSE #1: Player Name Data Structure Mismatch

### Location
`src/components/LiveGameVisualizer.tsx` - Lines 148-190 (`buildPlayStatsFromStandard`)

### The Problem

The function `buildPlayStatsFromStandard` incorrectly maps player data:

```typescript
// WRONG - Puts FULL NAME into first_name field
if (players.passer) {
  stats.push({
    player_id: players.passer.id,
    player: {
      first_name: players.passer.name,  // ❌ "Patrick Mahomes" → first_name
      position: players.passer.position,
      team: players.passer.team,
    },
    stats: {
      pass_att: play.playType === 'pass' ? 1 : 0,
    },
  });
}
```

### What Happens

1. **Adapter returns**: `players.passer.name = "Patrick Mahomes"` (full name)
2. **buildPlayStatsFromStandard**: Puts "Patrick Mahomes" into `first_name` field
3. **getPlayerName** (line 282): 
   ```typescript
   const first = playerMeta.first_name || playerMeta.firstName || '';  // "Patrick Mahomes"
   const last = playerMeta.last_name || playerMeta.lastName || '';     // ""
   const combined = `${first} ${last}`.trim();  // "Patrick Mahomes "
   ```
4. **Result**: Works by accident BUT...

### The REAL Problem

When `playersById` prop is used (Sleeper data), it has THIS structure:
```json
{
  "player_id": {
    "first_name": "Patrick",
    "last_name": "Mahomes",
    "position": "QB",
    "team": "KC"
  }
}
```

But `buildPlayStatsFromStandard` creates:
```json
{
  "player_id": "12345",
  "player": {
    "first_name": "Patrick Mahomes",  // FULL NAME in wrong field!
    "position": "QB",
    "team": "KC"
  }
}
```

This OVERWRITES the correct Sleeper data!

### Impact
- ❌ Player names may display incorrectly or not at all
- ❌ Breaks when trying to cross-reference with `playersById`
- ❌ Inconsistent data structure

---

## 🔥 ROOT CAUSE #2: Player Names Not Showing (Keyplayers Empty)

### Location
`src/components/LiveGameVisualizer.tsx` - Lines 668-711 (`keyPlayers` useMemo)

### The Problem

The `keyPlayers` computation has a fallback, but it's not being triggered correctly:

```typescript
const keyPlayers = useMemo(() => {
  // Try play_stats first (from converted legacy format)
  if (currentPlay?.play_stats && currentPlay.play_stats.length > 0) {
    return currentPlay.play_stats
      .map(stat => ({
        id: stat.player_id,
        name: getPlayerName(stat, playersById),  // ❌ May return empty!
        statSummary: stat.stats,
        playerMeta: stat.player || playersById[stat.player_id],
      }))
      // ...
  }
  
  // Fallback: Extract from StandardPlay.players
  if (currentPlay?.standard?.players) {
    // ... THIS CODE MAY NEVER RUN if play_stats exists but is wrong
  }
}, [currentPlay, playersById]);
```

### What Happens

1. `play_stats` array EXISTS (from `buildPlayStatsFromStandard`)
2. Length > 0, so first condition is TRUE
3. `getPlayerName()` is called
4. BUT: If `playersById` is `{}` (empty or not loaded yet), `getPlayerName` returns `stat.player_id`
5. Fallback to `standard.players` NEVER RUNS because play_stats exists!

### Why Players Are Missing

**Scenario A**: `playersById` not loaded
- `play_stats` exists → uses first branch
- `getPlayerName(stat, {})` → returns player_id like "12345"
- Player name shows as "12345" or empty

**Scenario B**: Player data structure mismatch (see Issue #1)
- `play_stats[0].player.first_name = "Patrick Mahomes"`
- `playersById["12345"] = { first_name: "Patrick", last_name: "Mahomes" }`
- `getPlayerName` uses `stat.player` (from build function), NOT playersById
- Returns "Patrick Mahomes " (with space) - may render but incorrect

### Impact
- ❌ NO PLAYER NAMES show on field
- ❌ Fallback logic never triggers
- ❌ Depends on Sleeper `playersById` being loaded

---

## 🔥 ROOT CAUSE #3: Helmets Not Rendering

### Location
`src/components/LiveGameVisualizer.tsx` - Lines 1131-1200 (player rendering loop)

### The Problem Chain

**Problem 3A**: `keyPlayers` array is EMPTY (see Issue #2)
```typescript
{keyPlayers.map((player, idx) => {
  // ❌ If keyPlayers = [], this never runs!
```

**Problem 3B**: Team code mismatch
```typescript
const playerTeamCode = player.playerMeta?.team 
  || player.playerMeta?.team_abbreviation
  || player.playerMeta?.team_abbr
  || player.playerMeta?.teamAbbr;

const offenseTeam = playMeta.team || playMeta.possession || scoreSummary.possessionTeam;
const teamForHelmet = offenseTeam || playerTeamCode;
const normalizedTeam = (teamForHelmet || '').toString().toUpperCase();
```

If all these are undefined → `normalizedTeam = ""` → helmet fails!

**Problem 3C**: Helmet asset path resolution
```typescript
const urls = getHelmetUrls(String(yearForHelmets), normalizedTeam, styleToUse);
helmetSrc = helmetOrientation === 'left' ? urls.left : urls.right;
```

If `normalizedTeam` is empty or invalid team code → returns invalid path → 404 error

### Why Helmets Don't Show

1. **keyPlayers is empty** → loop never runs → no helmets rendered
2. **Team codes missing** → `teamForHelmet` is undefined → path is invalid
3. **Asset doesn't exist** → image fails to load → shows fallback "?"

### Impact
- ❌ NO HELMETS display
- ❌ Only red "?" placeholder shows
- ❌ Entire player visualization broken

---

## 🔥 ROOT CAUSE #4: Scoreboard Data Broken

### Location
`src/components/LiveGameVisualizer.tsx` - Lines 578-647 (`scoreSummary` useMemo)

### The Problem

Scoreboard reads from `cumulativePlays[cumulativePlays.length - 1]`:

```typescript
const scoreSummary = useMemo(() => {
  const summary = {
    homePoints: 0,
    awayPoints: 0,
    // ...
  };

  const lastPlay = cumulativePlays[cumulativePlays.length - 1];
  if (lastPlay) {
    const meta = lastPlay.standard
      ? buildMetadataFromStandard(lastPlay.standard)
      : (lastPlay.metadata || {});

    summary.homePoints = meta.home_points ?? lastPlay.standard?.homeScore ?? 0;
    summary.awayPoints = meta.away_points ?? lastPlay.standard?.awayScore ?? 0;
    // ...
  }
  // ...
}, [cumulativePlays, currentPlay, selectedGame]);
```

### What's Broken

**Scenario A**: No plays loaded
- `cumulativePlays = []`
- `lastPlay = undefined`
- All scores show as 0

**Scenario B**: StandardPlay missing score data
- ESPN adapter may not include `homeScore`/`awayScore`
- `buildMetadataFromStandard` may not extract scores correctly
- Falls back to 0

**Scenario C**: Metadata structure mismatch
- `meta.home_points` doesn't exist
- `lastPlay.standard.homeScore` doesn't exist
- Shows 0 - 0

### Why Scoreboard Shows Wrong Data

1. **Data source missing scores** (ESPN doesn't provide running score in each play)
2. **Adapter doesn't extract scores** from API response
3. **Fallback values are all 0**

### Impact
- ❌ Scoreboard shows 0-0 or wrong scores
- ❌ Quarter/clock may be wrong
- ❌ Possession indicator broken

---

## 📊 COMPREHENSIVE ISSUE SUMMARY

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **Player name field mismatch** | buildPlayStatsFromStandard | 🔴 CRITICAL | Names missing/wrong |
| **keyPlayers always empty** | keyPlayers useMemo | 🔴 CRITICAL | No player badges |
| **Helmets not rendering** | Player rendering loop | 🔴 CRITICAL | No helmets shown |
| **Scoreboard data wrong** | scoreSummary useMemo | 🔴 CRITICAL | Wrong scores |
| **playersById not loaded** | Parent component | 🟠 HIGH | Breaks name lookup |
| **Team code normalization** | Helmet rendering | 🟠 HIGH | Path resolution fails |
| **Adapter score extraction** | All adapters | 🟠 HIGH | No running scores |

---

## 🔍 DETAILED DATA FLOW ANALYSIS

### Current (Broken) Flow

```
1. loadPlaysForGame (orchestrator)
   ↓
2. Adapter returns StandardPlay[] with players: { passer: { name: "Patrick Mahomes" } }
   ↓
3. convertStandardPlaysToLegacy()
   ↓
4. buildPlayStatsFromStandard() ❌ PUTS FULL NAME IN first_name
   ↓
5. play_stats = [{ player: { first_name: "Patrick Mahomes", team: "KC" } }]
   ↓
6. keyPlayers useMemo ❌ USES play_stats (broken structure)
   ↓
7. getPlayerName() ❌ RETURNS player_id if playersById empty
   ↓
8. Player rendering ❌ keyPlayers is empty or has wrong names
   ↓
9. NO HELMETS, NO NAMES
```

### What SHOULD Happen

```
1. loadPlaysForGame (orchestrator)
   ↓
2. Adapter returns StandardPlay[] with players properly populated
   ↓
3. convertStandardPlaysToLegacy() ✅ CORRECTLY parses first/last name
   ↓
4. play_stats has correct structure OR fallback to standard.players
   ↓
5. keyPlayers extracts player names correctly
   ↓
6. Player names display, helmets load
```

---

## 🛠️ REQUIRED FIXES

### Fix #1: Correct Player Name Parsing in buildPlayStatsFromStandard

**File**: `src/components/LiveGameVisualizer.tsx`  
**Lines**: 148-190

**Current Code**:
```typescript
if (players.passer) {
  stats.push({
    player_id: players.passer.id,
    player: {
      first_name: players.passer.name,  // ❌ WRONG
      position: players.passer.position,
      team: players.passer.team,
    },
  });
}
```

**Fixed Code**:
```typescript
if (players.passer) {
  const [firstName = '', lastName = ''] = (players.passer.name || '').split(' ', 2);
  stats.push({
    player_id: players.passer.id,
    player: {
      first_name: firstName,           // ✅ CORRECT
      last_name: lastName,              // ✅ ADDED
      full_name: players.passer.name,  // ✅ PRESERVE FULL NAME
      position: players.passer.position,
      team: players.passer.team,
    },
  });
}
```

---

### Fix #2: Prioritize standard.players Over play_stats

**File**: `src/components/LiveGameVisualizer.tsx`  
**Lines**: 668-711

**Strategy**: Check if `standard.players` has data FIRST, since it's more reliable

**Current Code**:
```typescript
const keyPlayers = useMemo(() => {
  // Try play_stats first
  if (currentPlay?.play_stats && currentPlay.play_stats.length > 0) {
    // ...
  }
  
  // Fallback to standard.players
  if (currentPlay?.standard?.players) {
    // ...
  }
}, [currentPlay, playersById]);
```

**Fixed Code**:
```typescript
const keyPlayers = useMemo(() => {
  // PRIORITIZE standard.players (from adapters)
  if (currentPlay?.standard?.players) {
    const { players } = currentPlay.standard;
    const keyRoles: Array<keyof typeof players> = ['passer', 'receiver', 'rusher', 'kicker'];
    const result = keyRoles
      .map(role => players[role])
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
      .map((player, idx) => ({
        id: player.id || `player_${idx}`,
        name: player.name || 'Unknown Player',  // ✅ FULL NAME directly
        statSummary: {},
        playerMeta: {
          position: player.position,
          team: player.team,
        },
      }))
      .slice(0, 3);
    
    if (result.length > 0) return result;
  }
  
  // Fallback to play_stats (legacy Sleeper data)
  if (currentPlay?.play_stats && currentPlay.play_stats.length > 0) {
    // ...
  }
  
  return [];
}, [currentPlay, playersById]);
```

---

### Fix #3: Add Score Extraction to Adapters

**Files**: 
- `src/lib/play-data/adapters/espn-adapter.ts`
- `src/lib/play-data/adapters/sportsdataio-adapter.ts`

**Problem**: Adapters don't extract running scores from API responses

**Solution**: Add score extraction logic to each adapter

---

### Fix #4: Improve Helmet Rendering Fallbacks

**File**: `src/components/LiveGameVisualizer.tsx`  
**Lines**: 1131-1200

**Add**:
- Better team code extraction
- Fallback to selectedGame.home/away
- Error handling for missing assets
- Console logging for debugging

---

## 🧪 TESTING CHECKLIST

After fixes are applied:

- [ ] Player names display correctly on field
- [ ] Helmets render (not red "?")
- [ ] Scoreboard shows correct scores
- [ ] Quarter/clock display correctly
- [ ] Possession indicator works
- [ ] Multiple play types work (pass, rush, kick)
- [ ] Adapters log which one is active
- [ ] keyPlayers array populated correctly
- [ ] Team codes normalize correctly

---

## 🎯 PRIORITY

1. **IMMEDIATE**: Fix #2 (prioritize standard.players) - Will restore player names
2. **CRITICAL**: Fix #1 (correct name parsing) - Will fix data structure
3. **HIGH**: Fix #4 (helmet fallbacks) - Will show helmets
4. **MEDIUM**: Fix #3 (score extraction) - Will fix scoreboard

---

**All issues are in ONE FILE**: `src/components/LiveGameVisualizer.tsx`  
**Root cause**: Data structure mismatch between adapters and legacy format  
**Solution**: Use StandardPlay directly instead of converting to legacy format

---

End of Critical Issues Report
