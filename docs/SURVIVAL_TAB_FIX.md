# Survival Tab: Crash Fix, Game Status & Hybrid Scoring

## Problem
The Survival tab was causing the app to "blank out" (crash) when clicked.

## Root Cause
The `getSurvivalAnalysis()` function was accessing the `projections` object without proper null/undefined checks. When the tab loaded before projections finished fetching, it would attempt to access properties on `undefined`, causing a crash.

Additionally, there was an undefined variable `projectionsAvailable` being referenced instead of the correct `survivalAnalysis.isUsingProjections`.

## Fixes Applied

### 1. Enhanced Initial Safety Check (Line 628)
**Before:**
```typescript
if (!matchups.length || !myRoster) return null;
```

**After:**
```typescript
// Safety checks: ensure all required data is loaded
if (!matchups.length || !myRoster || !rosters.length) return null;
```

Added `!rosters.length` check to prevent crashes when rosters haven't loaded.

### 2. Added Projections Safety Check (Line 647)
**Before:**
```typescript
if (roster && roster.starters) {
  roster.starters.forEach((playerId: string) => {
    if (playerId && playerId !== '0' && projections[playerId]) {
```

**After:**
```typescript
if (roster && roster.starters && projections) {
  roster.starters.forEach((playerId: string) => {
    if (playerId && playerId !== '0' && projections[playerId]) {
```

Added `&& projections` check before accessing `projections[playerId]`.

### 3. Safe Projections Data Check (Line 686)
**Before:**
```typescript
const projectedScores = Object.keys(projections).length > 0 ? rosters.map(roster => {
```

**After:**
```typescript
const hasProjectionsData = projections && Object.keys(projections).length > 0;
const projectedScores = hasProjectionsData ? rosters.map(roster => {
```

Created explicit boolean flag to check if projections data exists before attempting to map over rosters.

### 4. Fixed Undefined Variable (Line 2238)
**Before:**
```typescript
{projectionsAvailable && (
```

**After:**
```typescript
{survivalAnalysis.isUsingHybrid && (
```

Fixed reference to use the correct variable from `survivalAnalysis` object.

## New Feature: NFL Game Status

### Implementation
Added real-time NFL game status tracking to show which games are complete, in progress, or not yet started.

**New State:**
```typescript
const [nflSchedule, setNflSchedule] = useState<any[]>([]);
```

**API Endpoint (Undocumented):**
```
GET https://api.sleeper.app/schedule/nfl/{season_type}/{season}
```

**Response Format:**
```json
{
  "status": "complete" | "in_progress" | "pre_game",
  "date": "2025-10-19",
  "home": "ARI",
  "away": "GB",
  "week": 7,
  "game_id": "202510701"
}
```

**Helper Function:**
```typescript
const getGameStatus = () => {
  if (!nflSchedule.length || !nflState) return null;
  
  const currentWeekGames = nflSchedule.filter(game => game.week === nflState.week);
  return {
    total: currentWeekGames.length,
    complete: currentWeekGames.filter(g => g.status === 'complete').length,
    inProgress: currentWeekGames.filter(g => g.status === 'in_progress').length,
    notStarted: currentWeekGames.filter(g => g.status === 'pre_game').length,
    games: currentWeekGames // sorted by status
  };
};
```

### UI Display
The Survival Mode tab now shows:
- ✅ **Complete Games** (green) - Games that have finished
- ▶ **Live Games** (yellow) - Games currently in progress
- 📅 **Upcoming Games** (gray) - Games not yet started with date/time

Each game shows:
- Matchup: `AWAY @ HOME`
- Status indicator with color coding
- Date for upcoming games
- "✓ Final" for completed games
- "▶ Live" for in-progress games

## New Feature: Hybrid Scoring System ⚡

### The Problem with Pure Projections
Before: The app would show either all projected scores OR all actual scores. This meant:
- Early in the day: Only projections (not accounting for actual performance)
- After games start: Mix of final and incomplete scores
- **No real-time accuracy as games unfold**

### Hybrid Scoring Solution
Now the app uses **intelligent hybrid scoring** that combines actual and projected points:
- **Players in completed/live games**: Use ACTUAL points from `matchup.players_points`
- **Players in upcoming games**: Use PROJECTED points from projections API
- **Result**: Most accurate real-time positioning throughout game day!

### Implementation

**Player Game Status Helper:**
```typescript
const getPlayerGameStatus = (playerId: string) => {
  const player = players[playerId];
  const playerTeam = player.team;
  
  // Find the game this player's team is in this week
  const game = nflSchedule.find(g => 
    g.week === nflState.week && 
    (g.home === playerTeam || g.away === playerTeam)
  );
  
  if (!game) return 'unknown';
  return game.status; // 'pre_game', 'in_progress', or 'complete'
};
```

**Hybrid Score Calculation:**
```typescript
roster.starters.forEach((playerId: string) => {
  const projection = projections[playerId];
  const projectedPoints = projection?.stats?.pts_half_ppr || 0;
  
  // Check if this player's game has started
  const gameStatus = getPlayerGameStatus(playerId);
  
  if (gameStatus === 'pre_game') {
    // Game hasn't started - use projection
    hybridScore += projectedPoints;
    playersNotStarted++;
  } else {
    // Game started or complete - use actual points
    const actualPlayerPoints = m.players_points?.[playerId] || 0;
    hybridScore += actualPlayerPoints;
    playersStarted++;
  }
});
```

**Score Object:**
```typescript
{
  rosterId: number,
  points: number,           // Hybrid score (actual + projected)
  actualPoints: number,     // Pure actual points
  projected: number,        // Pure projected points
  hybridScore: number,      // Same as points
  playersStarted: number,   // Count of players in live/complete games
  playersNotStarted: number, // Count of players in upcoming games
  teamName: string,
  isHybrid: boolean         // Is using hybrid scoring?
}
```

### UI Updates

**Scoreboard Header:**
```typescript
⚡ Week 7 Scoreboard - CHOP WATCH
[LIVE: X started, Y projected]
```

**Score Display (Enhanced):**
- **BIG NUMBER**: Actual points (what they've scored so far)
- **Small number below**: Projected total (hybrid score for ranking)
- **Player breakdown**: "✓ X playing" and "◷ Y upcoming"
- Rankings based on projected hybrid score
- Display prioritizes actual performance

**Example Display:**
```
Team Name                           Score
----------------------------------------
#1  Team Alpha        ✓ 6 playing     124.50  ← Actual
                      ◷ 3 upcoming    (138.20 projected) ← Hybrid
                                      
#2  Your Team         ✓ 5 playing     98.75
                      ◷ 4 upcoming    (112.40 projected)
```

**Your Score Card:**
```
Your Score
   112.40          ← BIG: Actual points
(138.50 projected) ← Small: Hybrid/projected total
Actual (w/ projections)
```

**Game Status (Enhanced):**

Each game now shows detailed context:

**Upcoming Games:**
```
GB @ ARI                           [UPCOMING]
📅 Sun, Oct 19
🕐 4:05 PM EDT  
Check back for live updates
```

**Live Games:**
```
KC vs LV                           [▶ LIVE]
⚡ Game in progress - scores updating...
Refresh page for latest
```

**Completed Games:**
```
PIT @ CIN                          [✓ FINAL]
✓ Game finished
All player scores final
```

**Indicator:**
- ⚡ Lightning bolt = Hybrid scoring active
- 📊 Bar chart = All actual scores
- Real-time badge shows breakdown

### Benefits

1. **Real-Time Accuracy**: As games start, actual points replace projections automatically
2. **Better Decision Making**: Know exactly where you stand even mid-game day
3. **Strategic Planning**: See which opponents still have players to play
4. **Elimination Risk**: More accurate risk assessment throughout the day
5. **No Manual Refresh Needed**: Scores update as games progress

### Example Scenario

**Sunday 1:00 PM ET (Early games starting):**
```
YOUR SCORE CARD:
   52.4            ← Actual points so far
(87.3 projected)   ← Hybrid total (used for ranking)

BREAKDOWN:
✓ 5 playing  - Early game players scoring actual points
◷ 4 upcoming - Late/SNF/MNF players using projections

LINEUP DETAIL:
- RB1: 12.4 pts (actual - game in progress)
- WR1: 8.7 pts (actual - game in progress)  
- QB: 15.2 pts (actual - game in progress)
- RB2: 21.8 pts (projected - 4pm game)
- WR2: 18.5 pts (projected - SNF)
- TE: 10.7 pts (projected - MNF)

Your Position: #6 of 12 (based on 87.3 hybrid score)
```

**Sunday 4:30 PM ET (Late games starting):**
```
YOUR SCORE CARD:
   76.2            ← Actual points (early games complete)
(94.1 projected)   ← Hybrid total (early actual + late proj)

BREAKDOWN:
✓ 8 playing  - Early + late afternoon games
◷ 1 upcoming - MNF player still projected

Your Position: #4 of 12 (rising! hybrid score improving)
```

**Sunday 8:00 PM ET (Most games complete):**
```
YOUR SCORE CARD:
   112.8           ← Actual points (almost all complete)
(118.5 projected)  ← Only MNF left as projection

BREAKDOWN:
✓ 8 playing
◷ 1 upcoming - MNF TE still at 18.2 projected

Your Position: #3 of 12 (safe zone!)
```

**Tuesday Morning (All games complete):**
```
YOUR SCORE CARD:
   118.5           ← Final actual points
No hybrid needed - all games complete

Your Position: #3 of 12 (FINAL - survived!)
```

This gives you the most accurate survival positioning possible!

## Impact
✅ Survival tab now loads safely even when projections are still fetching
✅ No more blank screen crashes
✅ Graceful degradation: shows actual scores when projections unavailable
✅ Projections display correctly once loaded
✅ Real-time game status helps users understand which scores are final
✅ **Hybrid scoring provides most accurate positioning throughout game day**
✅ Better context for decision-making during game day
✅ Strategic advantage knowing which opponents have players left

## Testing
1. Start dev server: `./dev.sh`
2. Open app at http://localhost:3000
3. Click "Survival Mode" tab
4. Tab should load without crashing
5. Game status box shows complete/in-progress/upcoming games
6. Scoreboard shows hybrid scores with ⚡ indicator
7. Each team shows "X proj" and "Y live" player counts
8. As games start/finish, scores update automatically (with page refresh)

## Files Modified
- `src/components/SleeperFFHelper.tsx`
  - Lines 25: Added `nflSchedule` state
  - Lines 118-127: Added NFL schedule fetch
  - Lines 358-376: Added `getGameStatus()` helper function
  - Lines 377-400: Added `getPlayerGameStatus()` helper function
  - Lines 693-750: Implemented hybrid scoring in `getSurvivalAnalysis()`
  - Lines 780-830: Updated return object with hybrid data
  - Lines 2153-2198: Added game status UI component
  - Lines 2285-2290: Updated scoreboard header with hybrid indicator
  - Lines 2355-2370: Updated score display with player breakdown
  - Lines 628, 647, 693: Added null/undefined safety checks
  - Line 2357: Fixed variable reference to `isUsingHybrid`

## Related Documentation
- See `PROJECTIONS_FIX.md` for projections endpoint implementation
- See `SLEEPER_API_REFERENCE.md` for API documentation
- See `dev.sh` for clean dev server startup script

## Problem
The Survival tab was causing the app to "blank out" (crash) when clicked.

## Root Cause
The `getSurvivalAnalysis()` function was accessing the `projections` object without proper null/undefined checks. When the tab loaded before projections finished fetching, it would attempt to access properties on `undefined`, causing a crash.

Additionally, there was an undefined variable `projectionsAvailable` being referenced instead of the correct `survivalAnalysis.isUsingProjections`.

## Fixes Applied

### 1. Enhanced Initial Safety Check (Line 628)
**Before:**
```typescript
if (!matchups.length || !myRoster) return null;
```

**After:**
```typescript
// Safety checks: ensure all required data is loaded
if (!matchups.length || !myRoster || !rosters.length) return null;
```

Added `!rosters.length` check to prevent crashes when rosters haven't loaded.

### 2. Added Projections Safety Check (Line 647)
**Before:**
```typescript
if (roster && roster.starters) {
  roster.starters.forEach((playerId: string) => {
    if (playerId && playerId !== '0' && projections[playerId]) {
```

**After:**
```typescript
if (roster && roster.starters && projections) {
  roster.starters.forEach((playerId: string) => {
    if (playerId && playerId !== '0' && projections[playerId]) {
```

Added `&& projections` check before accessing `projections[playerId]`.

### 3. Safe Projections Data Check (Line 686)
**Before:**
```typescript
const projectedScores = Object.keys(projections).length > 0 ? rosters.map(roster => {
```

**After:**
```typescript
const hasProjectionsData = projections && Object.keys(projections).length > 0;
const projectedScores = hasProjectionsData ? rosters.map(roster => {
```

Created explicit boolean flag to check if projections data exists before attempting to map over rosters.

### 4. Fixed Undefined Variable (Line 2238)
**Before:**
```typescript
{projectionsAvailable && (
```

**After:**
```typescript
{survivalAnalysis.isUsingProjections && (
```

Fixed reference to use the correct variable from `survivalAnalysis` object.

## New Feature: NFL Game Status

### Implementation
Added real-time NFL game status tracking to show which games are complete, in progress, or not yet started.

**New State:**
```typescript
const [nflSchedule, setNflSchedule] = useState<any[]>([]);
```

**API Endpoint (Undocumented):**
```
GET https://api.sleeper.app/schedule/nfl/{season_type}/{season}
```

**Response Format:**
```json
{
  "status": "complete" | "in_progress" | "pre_game",
  "date": "2025-10-19",
  "home": "ARI",
  "away": "GB",
  "week": 7,
  "game_id": "202510701"
}
```

**Helper Function:**
```typescript
const getGameStatus = () => {
  if (!nflSchedule.length || !nflState) return null;
  
  const currentWeekGames = nflSchedule.filter(game => game.week === nflState.week);
  return {
    total: currentWeekGames.length,
    complete: currentWeekGames.filter(g => g.status === 'complete').length,
    inProgress: currentWeekGames.filter(g => g.status === 'in_progress').length,
    notStarted: currentWeekGames.filter(g => g.status === 'pre_game').length,
    games: currentWeekGames // sorted by status
  };
};
```

### UI Display
The Survival Mode tab now shows:
- ✅ **Complete Games** (green) - Games that have finished
- ▶ **Live Games** (yellow) - Games currently in progress
- 📅 **Upcoming Games** (gray) - Games not yet started with date/time

Each game shows:
- Matchup: `AWAY @ HOME`
- Status indicator with color coding
- Date for upcoming games
- "✓ Final" for completed games
- "▶ Live" for in-progress games

## Impact
✅ Survival tab now loads safely even when projections are still fetching
✅ No more blank screen crashes
✅ Graceful degradation: shows actual scores when projections unavailable
✅ Projections display correctly once loaded
✅ Real-time game status helps users understand which scores are final
✅ Better context for decision-making during game day

## Testing
1. Start dev server: `./dev.sh`
2. Open app at http://localhost:3000
3. Click "Survival Mode" tab
4. Tab should load without crashing
5. If projections available, shows projected scores with 🔮 indicator
6. If no projections yet, shows actual scores from current week
7. Game status box shows complete/in-progress/upcoming games
8. Status updates automatically as games progress

## Files Modified
- `src/components/SleeperFFHelper.tsx`
  - Lines 25: Added `nflSchedule` state
  - Lines 118-127: Added NFL schedule fetch
  - Lines 358-376: Added `getGameStatus()` helper function
  - Lines 2153-2198: Added game status UI component
  - Lines 628, 647, 686-687: Added null/undefined safety checks
  - Line 2238: Fixed `projectionsAvailable` → `survivalAnalysis.isUsingProjections`

## Related Documentation
- See `PROJECTIONS_FIX.md` for projections endpoint implementation
- See `SLEEPER_API_REFERENCE.md` for API documentation
- See `dev.sh` for clean dev server startup script
