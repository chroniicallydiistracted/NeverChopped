# 🎯 Active Teams Detection System

## Problem
In survival fantasy football leagues, teams get eliminated each week. The Sleeper API doesn't provide an "eliminated" flag, and **all 18 teams appear in matchups** even if only 12 are still active.

## Solution: 3-Tier Smart Detection

### **Tier 1: Manual Configuration** (Most Reliable)
Set `teamsRemaining` in `src/config.ts`:

```typescript
export const defaultConfig: LeagueConfig = {
  userId: 'your_user_id',
  leagueId: 'your_league_id',
  username: 'your_username',
  teamName: 'your_team_name',
  teamsRemaining: 12  // ← SET THIS to current active teams
};
```

**✅ Pros:**
- 100% accurate
- Works perfectly before games start (when all scores are 0)
- Simple to update each week

**Update Weekly:**
After someone gets eliminated, just decrease this number by 1.

---

### **Tier 2: Historical Analysis** (Automated)
If `teamsRemaining` is not set, the app automatically:
1. Fetches the last 3 weeks of matchup data
2. Identifies teams that scored 0 points for 2+ consecutive weeks
3. Counts them as eliminated
4. Calculates active teams = total rosters - eliminated teams

**✅ Pros:**
- Fully automated
- Works before current week starts
- No manual updates needed

**⚠️ Limitations:**
- May be inaccurate in early season (Week 1-2)
- Assumes eliminated teams score 0 (not always true)
- Requires at least 3 weeks of data

---

### **Tier 3: Fallback** (Safety Net)
If both above methods fail, uses `matchups.length` (total teams in current week).

**⚠️ Warning:** This may show 18 teams instead of 12 if Sleeper API returns all teams.

---

## How It Works

### On App Load:
```typescript
// fetchAllData() automatically calls:
const activeCount = await calculateActiveTeams(nflStateData, rostersData);
setActiveTeamsCount(activeCount);
```

### In Survival Analysis:
```typescript
// Uses smart-detected count:
const totalTeams = activeTeamsCount || matchups.length;
const eliminatedCount = rosters.length - totalTeams;
```

---

## Debugging

Open browser console (F12) and look for:

```
✅ Using manual config: 12 teams remaining
```
or
```
🔍 Historical detection: 12 active teams (eliminated: [1, 5, 8, 12, 15, 18])
```
or
```
⚠️ Using fallback: counting all rosters. Set config.teamsRemaining for accuracy.
```

---

## Recommended Setup

### **Option A: Manual (Recommended for Accuracy)**
1. Open `src/config.ts`
2. Set `teamsRemaining: 12` (or whatever your current count is)
3. Update weekly when someone gets chopped

### **Option B: Automated**
1. Leave `teamsRemaining` undefined
2. Let the app auto-detect from history
3. Check console to verify it's working

### **Option C: Hybrid**
1. Use auto-detection most of the time
2. Override with manual config if needed
3. Best of both worlds!

---

## API Response Notes

**Sleeper API Behavior:**
- `GET /league/{league_id}/rosters` → Returns ALL 18 rosters (including eliminated)
- `GET /league/{league_id}/matchups/{week}` → Returns ALL 18 matchups (including eliminated teams with 0 points)
- No `eliminated` or `active` flag exists in the API

**Why This Matters:**
Before games start, **all teams have 0 points**, so we can't filter by score. That's why historical analysis or manual config is necessary.

---

## Example

**Week 7 in your league:**
- Started with 18 teams
- 6 teams eliminated (Weeks 1-6)
- 12 teams still alive

**Without Fix:**
```
📊 You're 9 of 18. 0.00 points above elimination.
```

**With Fix (Manual Config):**
```typescript
teamsRemaining: 12
```

**Result:**
```
📊 You're 9 of 12. 0.00 points above elimination.
✅ 6 teams eliminated
```

---

## Future Enhancements

Potential improvements:
1. **UI Toggle:** Click to edit teams remaining directly in app
2. **Auto-sync:** Check league settings/metadata for elimination data
3. **Week-by-week tracking:** Build internal history of eliminations
4. **Admin mode:** Manually mark teams as eliminated

---

## Questions?

Check console logs for detection method:
- `Manual Config` = Using your set value ✅
- `Historical Analysis` = Auto-detected from past weeks 🔍
- `Fallback (matchups.length)` = Default behavior ⚠️
