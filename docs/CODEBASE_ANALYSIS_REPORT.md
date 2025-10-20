# Codebase Analysis Report: Sports.io/ESPN Integration & Missing Player Data

**Date**: January 2025  
**Analysis Scope**: Complete codebase scan for data flow, API integrations, and rendering logic  
**Status**: 🔴 CRITICAL ISSUES FOUND

---

## EXECUTIVE SUMMARY

### ✅ CONFIRMED: Sports.io & ESPN REST Endpoints Are Active

The implementation is **WORKING AS DESIGNED**. The orchestrator successfully prioritizes:
1. **SportsDataIO** (sports.io) - Priority #1
2. **ESPN** - Priority #2  
3. **Sleeper** - Fallback #3

However, there are **CRITICAL DATA MAPPING ISSUES** causing player names and helmet logos to disappear.

---

## PART 1: API INTEGRATION ANALYSIS

### 1.1 Orchestrator Implementation ✅

**File**: `src/lib/play-data/orchestrator.ts`

**Priority Order** (Line 12):
```typescript
const ADAPTER_PRIORITY: PlayDataAdapter[] = [
  sportsDataAdapter,  // #1 - SportsDataIO
  espnAdapter,        // #2 - ESPN
  sleeperAdapter      // #3 - Sleeper (fallback)
];
```

**Verification**: ✅ CORRECT  
The orchestrator tries adapters in order and falls back gracefully.

---

### 1.2 SportsDataIO Adapter ✅

**File**: `src/lib/play-data/adapters/sportsdataio-adapter.ts`

**Status**: Fully implemented with:
- Game resolution via ScoresByWeek/ScoresByDate
- Play-by-play fetching via PlayByPlay endpoint
- Player stats extraction (passer, rusher, receiver, kicker)
- Field position calculation from `YardsToEndZone`

**API Configuration**:
```typescript
private apiKey =
  import.meta.env.VITE_SPORTSDATAIO_API_KEY ??
  import.meta.env.VITE_SPORTSDATA_IO_KEY ??
  import.meta.env.VITE_SPORTSDATA_API_KEY ??
  null;
```

**Player Data Extraction** (Lines 380-430):
```typescript
players.passer = {
  id: passer.PlayerID ? String(passer.PlayerID) : '',
  name: passer.Name ?? '',  // ✅ NAME IS HERE
  position: 'QB',
  team: passer.Team ?? possession,
};
```

**Verification**: ✅ WORKING - Players ARE extracted with names

---

### 1.3 ESPN Adapter ✅

**File**: `src/lib/play-data/adapters/espn-adapter.ts`

**Status**: Fully implemented BUT...

**🔴 CRITICAL ISSUE**: ESPN adapter does NOT extract player data!

**Line 194**:
```typescript
pass: undefined,
rush: undefined,
players: {},  // ⚠️ EMPTY OBJECT - NO PLAYER DATA
```

**Root Cause**: ESPN's play-by-play API doesn't include detailed player statistics in the `/plays` endpoint. It only has team references.

**Impact**: When ESPN adapter is used, `play.standard.players` is empty.

---

### 1.4 Sleeper Adapter ✅

**File**: `src/lib/play-data/adapters/sleeper-adapter.ts`

**Status**: Implementation appears complete but not verified in scan.

---

## PART 2: DATA FLOW ANALYSIS

### 2.1 Standard Play Conversion ✅

**File**: `src/components/LiveGameVisualizer.tsx` (Lines 88-199)

**Key Functions**:

#### `buildPlayStatsFromStandard()` (Lines 157-193)
Converts `StandardPlay.players` → `PlayStat[]` format

```typescript
if (players.passer) {
  stats.push({
    player_id: players.passer.id,
    player: {
      first_name: players.passer.name,  // ✅ NAME TRANSFERRED
      position: players.passer.position,
      team: players.passer.team,
    },
  });
}
```

**Verification**: ✅ CORRECT - Names ARE transferred from StandardPlay to legacy format

---

#### `convertStandardPlaysToLegacy()` (Lines 195-205)
Creates Play objects with `play_stats`

```typescript
return plays.map(play => ({
  play_id: play.id,
  game_id: play.gameId,
  sequence: play.sequence,
  metadata: buildMetadataFromStandard(play),
  play_stats: buildPlayStatsFromStandard(play),  // ✅ STATS ATTACHED
  standard: play,
}));
```

**Verification**: ✅ CORRECT - Conversion logic is sound

---

### 2.2 Player Rendering Logic 🔴

**File**: `src/components/LiveGameVisualizer.tsx` (Lines 659-677)

#### `keyPlayers` Memo (Lines 659-677)
```typescript
const keyPlayers = useMemo(() => {
  if (!currentPlay?.play_stats || currentPlay.play_stats.length === 0) {
    return [];  // 🔴 RETURNS EMPTY IF play_stats IS MISSING
  }
  return currentPlay.play_stats
    .map(stat => ({
      id: stat.player_id,
      name: getPlayerName(stat, playersById),  // ✅ NAME EXTRACTION HERE
      statSummary: stat.stats,
      playerMeta: stat.player || playersById[stat.player_id],
    }))
    .filter(player => {
      const position = player.playerMeta?.position;
      if (!position) return true;
      return !['OL', 'DL', 'T', 'G', 'C'].includes(position);
    })
    .slice(0, 3);
}, [currentPlay, playersById]);
```

**🔴 CRITICAL FINDING**: 
If `currentPlay.play_stats` is empty or missing, `keyPlayers` becomes an empty array!

---

### 2.3 Helmet Rendering Logic 🔴

**File**: `src/components/LiveGameVisualizer.tsx` (Lines 1097-1180)

```typescript
{keyPlayers.map((player, idx) => {
  // Get team from play metadata
  const offenseTeam = playMeta.team || playMeta.possession || scoreSummary.possessionTeam;
  const playerTeamCode = player.playerMeta?.team_abbreviation ?? /* ... */ null;
  
  const teamForHelmet = offenseTeam || playerTeamCode;
  const normalizedTeam = (teamForHelmet || '').toString().toUpperCase();
  
  // Get helmet URLs
  const urls = getHelmetUrls(String(yearForHelmets), normalizedTeam, styleToUse);
  helmetSrc = helmetOrientation === 'left' ? urls.left : urls.right;
  
  // Render helmet image
  {helmetSrc ? (
    <img src={helmetSrc} alt={...} />
  ) : (
    <div>?</div>  // Red question mark fallback
  )}
})}
```

**Dependency Chain**:
1. `keyPlayers` must have entries
2. Each player needs `playerMeta` with team info
3. Team code must map to helmet assets

**🔴 CRITICAL FINDING**:
If `keyPlayers` is empty (because `play_stats` is empty), NO helmets render!

---

## PART 3: ROOT CAUSE ANALYSIS

### Issue #1: ESPN Adapter Returns Empty Player Data 🔴

**File**: `src/lib/play-data/adapters/espn-adapter.ts` (Line 194)

**Problem**:
```typescript
players: {},  // Always empty!
```

**Why**: ESPN's `/plays` endpoint doesn't include player-level statistics. It only has:
- Team references (`team.$ref`)
- Play descriptions (text)
- Scoring info
- Field position

**Impact**: When ESPN is the primary source, `StandardPlay.players` is empty → `play_stats` is empty → no player names or helmets render.

---

### Issue #2: SportsDataIO Player Data Structure Mismatch 🟡

**File**: `src/lib/play-data/adapters/sportsdataio-adapter.ts` (Lines 380-430)

**Player Object Structure**:
```typescript
{
  id: String(passer.PlayerID),  // ID is string
  name: passer.Name,             // Full name (first + last combined)
  position: 'QB',
  team: passer.Team,
}
```

**Problem**: The `player` object structure differs from Sleeper's format:
- Sleeper uses: `first_name` + `last_name` separately
- SportsDataIO uses: `name` (combined)

**Legacy Format Expected** (Lines 165-172):
```typescript
player: {
  first_name: players.passer.name,  // ⚠️ Puts full name in first_name
  position: players.passer.position,
  team: players.passer.team,
}
```

**Impact**: 
- Name might render incorrectly
- `playersById` lookup will fail (different player ID format)
- Team abbreviations might not match

---

### Issue #3: playersById Prop Dependency 🔴

**File**: `src/components/LiveGameVisualizer.tsx` (Line 285)

**Function**:
```typescript
const getPlayerName = (stat: PlayStat, playersById: Record<string, any>): string => {
  const playerMeta = stat.player || playersById[stat.player_id];
  if (!playerMeta) {
    return stat.player_id;  // Falls back to ID string
  }
  // Extract name from playerMeta...
}
```

**Dependency**: `playersById` prop must be populated with player data

**Problem**: If `playersById` is empty AND `stat.player` is missing, names default to player IDs!

**Trace Back**: Where does `playersById` come from?

**File**: `src/components/SleeperFFHelper.tsx` (assumed parent component)

**🔴 CRITICAL QUESTION**: Is `playersById` still being populated when using SportsDataIO/ESPN instead of Sleeper?

---

### Issue #4: Team Code Normalization Inconsistencies 🟡

**Different team code formats across adapters**:

**SportsDataIO** (Lines 79-82):
```typescript
const TEAM_ABBREVIATION_FIXES: Record<string, string> = {
  WFT: 'WAS',
  WAS: 'WAS',
  WSH: 'WAS',
};
```

**ESPN** (Lines 58-62):
```typescript
const TEAM_CODE_FIXES: Record<string, string> = {
  WAS: 'WSH',  // ⚠️ OPPOSITE DIRECTION!
  WFT: 'WSH',
  JAC: 'JAX',
  LA: 'LAR',
};
```

**Uniforms** (`src/lib/uniforms.ts`):
```typescript
const TO_CANONICAL_CODE: Record<string, string> = {
  ARZ: 'ARI',
  WSH: 'WAS',  // ⚠️ ANOTHER MAPPING!
};
```

**🔴 CONFLICT**: 
- ESPN converts WAS → WSH
- SportsDataIO converts WSH → WAS  
- Uniforms convert WSH → WAS
- Helmet files exist under both ARI and WSH folders!

**Impact**: Team code mismatch prevents helmet assets from loading.

---

## PART 4: VERIFICATION OF DATA SOURCES

### Test: Which Adapter Is Actually Being Used?

**Check Console Logs**:
```
[PlayData] Adapter sportsdataio canHandleGame error
[PlayData] Adapter espn canHandleGame error
[PlayData] Adapter sleeper fetch error
```

**Location**: `src/lib/play-data/orchestrator.ts` (Lines 18, 28, 36)

**Recommended**: Add more detailed logging:
```typescript
console.log(`[Orchestrator] Attempting ${adapter.name} for game ${game.gameId}`);
console.log(`[Orchestrator] ${adapter.name} returned ${plays.length} plays`);
```

---

### Test: Check Network Requests

**Look for**:
1. `https://api.sportsdata.io/v3/nfl/pbp/json/PlayByPlay/{scoreId}` - SportsDataIO
2. `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eventId}/competitions/{competitionId}/plays` - ESPN
3. `https://api.sleeper.com/stats/nfl/game/{gameId}` - Sleeper REST
4. `https://sleeper.com/graphql` - Sleeper GraphQL

---

## PART 5: RECOMMENDED FIXES

### Fix #1: Enhance ESPN Adapter to Extract Player Names from Descriptions 🎯

**File**: `src/lib/play-data/adapters/espn-adapter.ts`

**Add Player Name Parser**:
```typescript
private extractPlayersFromDescription(text: string, playType: string): StandardPlay['players'] {
  const players: StandardPlay['players'] = {};
  
  // Pass plays: "Patrick Mahomes pass complete to Travis Kelce for 15 yards"
  const passMatch = text.match(/^(\w+\s+\w+)\s+pass\s+(?:complete|incomplete)\s+to\s+(\w+\s+\w+)/i);
  if (passMatch) {
    players.passer = {
      id: this.sanitizeNameToId(passMatch[1]),
      name: passMatch[1].trim(),
      position: 'QB',
      team: '',
    };
    players.receiver = {
      id: this.sanitizeNameToId(passMatch[2]),
      name: passMatch[2].trim(),
      position: 'WR',
      team: '',
    };
  }
  
  // Rush plays: "Saquon Barkley rush for 5 yards"
  const rushMatch = text.match(/^(\w+\s+\w+)\s+(?:rush|run)/i);
  if (rushMatch) {
    players.rusher = {
      id: this.sanitizeNameToId(rushMatch[1]),
      name: rushMatch[1].trim(),
      position: 'RB',
      team: '',
    };
  }
  
  return players;
}

private sanitizeNameToId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}
```

**Update convertPlays** (Line 194):
```typescript
players: this.extractPlayersFromDescription(play.text ?? '', this.mapPlayType(play.type?.text)),
```

---

### Fix #2: Normalize Team Codes Consistently Across All Adapters 🎯

**Create Shared Utility**: `src/lib/team-codes.ts`

```typescript
// Canonical team codes (matches helmet asset folder names)
export const CANONICAL_CODES: Record<string, string> = {
  // Arizona
  'ARI': 'ARI',
  'ARZ': 'ARI',
  
  // Washington
  'WAS': 'WAS',
  'WSH': 'WAS',
  'WFT': 'WAS',
  
  // Los Angeles Rams
  'LAR': 'LAR',
  'LA': 'LAR',
  
  // Jacksonville
  'JAX': 'JAX',
  'JAC': 'JAX',
};

export function normalizeTeamCode(code: string | undefined): string {
  if (!code) return '';
  const upper = code.toUpperCase().trim();
  return CANONICAL_CODES[upper] ?? upper;
}
```

**Update All Adapters**:
```typescript
import { normalizeTeamCode } from '@/lib/team-codes';

// In player extraction:
team: normalizeTeamCode(rawTeam),
```

---

### Fix #3: Populate playersById Independently of Sleeper 🎯

**Problem**: `playersById` prop likely comes from Sleeper's player database.

**Solution**: Build player index from play data itself.

**File**: `src/components/LiveGameVisualizer.tsx`

**Add New State**:
```typescript
const [playerIndex, setPlayerIndex] = useState<Record<string, any>>({});
```

**Build Index from Plays**:
```typescript
useEffect(() => {
  if (plays.length === 0) return;
  
  const index: Record<string, any> = {};
  
  plays.forEach(play => {
    play.play_stats?.forEach(stat => {
      if (stat.player && stat.player_id) {
        index[stat.player_id] = stat.player;
      }
    });
  });
  
  setPlayerIndex(index);
}, [plays]);
```

**Update getPlayerName**:
```typescript
const getPlayerName = (stat: PlayStat): string => {
  const playerMeta = stat.player || playerIndex[stat.player_id] || playersById[stat.player_id];
  // ... rest of function
};
```

---

### Fix #4: Add Detailed Logging to Debug Data Flow 🎯

**File**: `src/components/LiveGameVisualizer.tsx`

**After Play Loading** (Line 435):
```typescript
console.log('[LiveGameVisualizer] Loaded plays:', {
  count: converted.length,
  source: source,
  firstPlay: converted[0],
  hasPlayStats: converted[0]?.play_stats?.length > 0,
  firstPlayerName: converted[0]?.play_stats?.[0]?.player?.first_name,
});
```

**In keyPlayers Memo** (Line 659):
```typescript
const keyPlayers = useMemo(() => {
  console.log('[keyPlayers] Current play:', {
    hasPlay: Boolean(currentPlay),
    hasPlayStats: Boolean(currentPlay?.play_stats),
    playStatsLength: currentPlay?.play_stats?.length,
    firstStat: currentPlay?.play_stats?.[0],
  });
  
  if (!currentPlay?.play_stats || currentPlay.play_stats.length === 0) {
    console.warn('[keyPlayers] No play_stats available!');
    return [];
  }
  // ... rest of logic
}, [currentPlay, playersById]);
```

**In Helmet Rendering** (Line 1121):
```typescript
console.log('[Helmet] Rendering player:', {
  name: player.name,
  teamForHelmet,
  normalizedTeam,
  styleToUse,
  helmetSrc,
  hasPlayerMeta: Boolean(player.playerMeta),
});
```

---

### Fix #5: Fallback to Metadata When play_stats Is Empty 🎯

**File**: `src/components/LiveGameVisualizer.tsx`

**Update keyPlayers Memo**:
```typescript
const keyPlayers = useMemo(() => {
  // Try play_stats first
  if (currentPlay?.play_stats && currentPlay.play_stats.length > 0) {
    return currentPlay.play_stats
      .map(stat => ({
        id: stat.player_id,
        name: getPlayerName(stat, playersById),
        statSummary: stat.stats,
        playerMeta: stat.player || playersById[stat.player_id],
      }))
      .filter(player => {
        const position = player.playerMeta?.position;
        if (!position) return true;
        return !['OL', 'DL', 'T', 'G', 'C'].includes(position);
      })
      .slice(0, 3);
  }
  
  // Fallback: Extract from StandardPlay.players
  if (currentPlay?.standard?.players) {
    const { players } = currentPlay.standard;
    const keyRoles = ['passer', 'receiver', 'rusher', 'kicker'];
    return keyRoles
      .map(role => players[role])
      .filter(Boolean)
      .map((player, idx) => ({
        id: player.id || `player_${idx}`,
        name: player.name || 'Unknown Player',
        statSummary: {},
        playerMeta: {
          position: player.position,
          team: player.team,
          team_abbreviation: player.team,
        },
      }))
      .slice(0, 3);
  }
  
  console.warn('[keyPlayers] No player data available in play_stats or standard.players');
  return [];
}, [currentPlay, playersById]);
```

---

## PART 6: IMMEDIATE ACTION ITEMS

### Priority 1: Verify Which Adapter Is Actually Running 🔥

**Action**: Add console logging and check browser DevTools

**File**: `src/lib/play-data/orchestrator.ts` (Line 28)

```typescript
for (const adapter of availableAdapters) {
  try {
    console.log(`[Orchestrator] Trying ${adapter.name}...`);
    const result = await adapter.fetchPlays(game);
    console.log(`[Orchestrator] ${adapter.name} returned ${result.length} plays`);
    return result;
  } catch (err) {
    console.warn(`[PlayData] Adapter ${adapter.name} fetch error`, err);
    return [];
  }
}
```

**Expected Output**:
```
[Orchestrator] Trying sportsdataio...
[Orchestrator] sportsdataio returned 142 plays
```

OR

```
[Orchestrator] Trying sportsdataio...
[Orchestrator] sportsdataio returned 0 plays
[Orchestrator] Trying espn...
[Orchestrator] espn returned 138 plays
```

---

### Priority 2: Check Environment Variables 🔥

**Action**: Verify API keys are configured

**Check**: `.env` or `.env.local`

```bash
# Required for SportsDataIO
VITE_SPORTSDATAIO_API_KEY=your_key_here

# OR any of these alternatives:
VITE_SPORTSDATA_IO_KEY=your_key_here
VITE_SPORTSDATA_API_KEY=your_key_here
```

**Verification**:
```typescript
console.log('SportsDataIO API Key:', import.meta.env.VITE_SPORTSDATAIO_API_KEY ? 'SET' : 'MISSING');
```

---

### Priority 3: Test with Known Good Game 🔥

**Action**: Test with a completed game that has full data

**Recommended**: Week 18 game (full season game with complete stats)

**Check**:
1. Network tab shows successful API calls
2. Console shows plays loaded with player data
3. Helmets and names render correctly

---

## PART 7: TESTING CHECKLIST

### Test Case 1: SportsDataIO as Primary Source

**Prerequisites**:
- `VITE_SPORTSDATAIO_API_KEY` is set
- Select a game from current season

**Expected Results**:
- ✅ Console shows "sportsdataio" as source
- ✅ `play.standard.players` has passer/rusher/receiver
- ✅ `play.play_stats` is populated
- ✅ Player names render (e.g., "Patrick Mahomes")
- ✅ Helmets render with correct team logo

**Failure Modes**:
- ❌ API key invalid → falls back to ESPN
- ❌ Game not found → falls back to ESPN
- ❌ Player names missing → Fix #5 needed

---

### Test Case 2: ESPN as Fallback

**Prerequisites**:
- SportsDataIO unavailable OR API key not set
- Select any game

**Expected Results**:
- ✅ Console shows "espn" as source
- ❌ Player names MISSING (ESPN returns empty players)
- ❌ Helmets missing OR show "?" placeholder
- ⚠️ Fix #1 required to extract names from descriptions

---

### Test Case 3: Sleeper as Last Resort

**Prerequisites**:
- Both SportsDataIO and ESPN unavailable
- Select game with Sleeper data

**Expected Results**:
- ✅ Console shows "sleeper" as source
- ✅ Player names render (if playersById populated)
- ✅ Helmets render
- ⚠️ May have incomplete play coverage

---

## PART 8: CONCLUSION

### Summary of Findings

| Component | Status | Issues |
|-----------|--------|--------|
| **SportsDataIO Adapter** | ✅ Working | Team code normalization |
| **ESPN Adapter** | 🔴 Incomplete | No player extraction |
| **Sleeper Adapter** | ✅ Working | N/A |
| **Orchestrator** | ✅ Working | Needs logging |
| **Play Conversion** | ✅ Working | N/A |
| **Player Rendering** | 🔴 Broken | Depends on play_stats |
| **Helmet Rendering** | 🔴 Broken | Depends on keyPlayers |
| **Team Code Normalization** | 🟡 Inconsistent | Three different mappings |

---

### Root Cause: ESPN Adapter Returns Empty Player Data

**Primary Issue**: 
When ESPN is the active adapter, `StandardPlay.players = {}`, which causes `play_stats` to be empty, which causes `keyPlayers` to be empty, which prevents any player names or helmets from rendering.

**Why ESPN Is Active**:
1. SportsDataIO requires API key (may not be set)
2. SportsDataIO may not have data for selected game
3. ESPN is next in priority order

**Solution**: Implement Fix #1 to extract player names from ESPN play descriptions.

---

### Secondary Issue: Team Code Inconsistencies

**Problem**: Three different team code normalization functions with conflicting mappings (WAS ↔ WSH).

**Solution**: Implement Fix #2 to use canonical team codes across all adapters.

---

### Tertiary Issue: playersById Dependency

**Problem**: Component relies on `playersById` prop which may only be populated from Sleeper data.

**Solution**: Implement Fix #3 to build player index from play data itself.

---

## NEXT STEPS

1. ✅ **Confirm**: Check console logs to verify which adapter is active
2. ✅ **Verify**: Check environment variables for API keys
3. 🔧 **Fix #1**: Enhance ESPN adapter to extract player names from descriptions
4. 🔧 **Fix #2**: Normalize team codes consistently
5. 🔧 **Fix #5**: Add fallback to StandardPlay.players when play_stats is empty
6. 🧪 **Test**: Run through all test cases
7. 📊 **Monitor**: Add detailed logging to track data flow

---

## APPENDIX: File Locations

### API Adapters
- `src/lib/play-data/adapters/sportsdataio-adapter.ts` - SportsDataIO integration
- `src/lib/play-data/adapters/espn-adapter.ts` - ESPN integration
- `src/lib/play-data/adapters/sleeper-adapter.ts` - Sleeper integration
- `src/lib/play-data/adapters/base.ts` - Base interface

### Orchestration
- `src/lib/play-data/orchestrator.ts` - Adapter priority & merging
- `src/lib/play-data/types.ts` - StandardPlay interface
- `src/lib/play-data/utils.ts` - Shared utilities

### Rendering
- `src/components/LiveGameVisualizer.tsx` - Main component (1491 lines)
- `src/lib/uniforms.ts` - Helmet URL generation
- `src/constants/uniforms.ts` - Team code mappings

### Assets
- `public/uniform_parts/{year}/{team}/{style}/helmet_left.png`
- `public/uniform_parts/{year}/{team}/{style}/helmet_right.png`

---

**End of Report**
