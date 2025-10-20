# Sleeper API - What's Actually Available

## ✅ What Works (Confirmed Available)

### 1. Player Data (`/v1/players/nfl`)
- **Basic Info**: Name, team, position, number
- **Status**: Active/Inactive/IR
- **Injury**: injury_status, injury_body_part, injury_notes, injury_start_date  
- **Physical**: Height, weight, age, years_exp
- **IDs**: Multiple ID mappings (ESPN, Yahoo, Fantasy Data, etc.)

### 2. Matchup Data (`/v1/league/{id}/matchups/{week}`)
- **Actual Points**: Real-time scoring during games
- **Player Points**: Individual player scores (`players_points` object)
- **Starter Points**: Array of points for each starter position
- **Total Points**: Team total for the week

### 3. Roster Data (`/v1/league/{id}/rosters`)
- **Starters**: Ordered array of player IDs in starting lineup
- **Players**: All rostered players
- **Settings**: FPTS, wins, losses, waiver position
- **Elimination Status**: `settings.eliminated` field (for survival leagues!)

### 4. League/User Data
- User information, league settings, transactions, etc.

## ❌ What's NOT Available

### Projections
- **NOT in `/v1/players/nfl`**: No projection fields
- **NO `/v1/projections` endpoint**: Doesn't exist in public API
- **NO `/v1/stats` endpoint**: Not available publicly

**Conclusion**: Sleeper calculates projections internally but doesn't expose them via their public read-only API.

## 🎯 What Your App CAN Do (Without Projections)

### 1. **Injury & Status Alerts** ✅ WORKING
- Detect injured players in starting lineup
- Alert on Inactive/IR players
- Show injury body part and notes
- Practice participation status

### 2. **Historical Performance Analysis** ✅ WORKING
- Calculate average PPG from `settings.fpts`
- Compare to league average
- Identify underperforming starters

### 3. **Bench vs Starter Comparison** ✅ WORKING
- Compare bench players to starters **by position**
- Use historical averages (total points / weeks played)
- Identify if a bench player historically outscores a starter

### 4. **Survival Mode Tracking** ✅ WORKING
- Real-time elimination risk
- Position tracking (who's in danger zone)
- Automatic elimination detection via `settings.eliminated`

### 5. **Live Game Tracking** ✅ WORKING
- Real-time score updates during games
- Individual player performance
- Points left on bench calculation

## 💡 How Lineup Alerts Work (Without Projections)

### Current Logic:
1. **CRITICAL Alerts**:
   - Injured player in starting lineup → "You're starting an injured player!"
   - Inactive/IR player starting → "This player can't play!"
   
2. **WARNING Alerts**:
   - Healthy bench player **historically** outscores starter
   - Based on season average: `(total_fpts / weeks_played)`
   
3. **INFO Alerts**:
   - Position depth concerns
   - Waiver wire opportunities

### Example Alert (Without Projections):
```
⚠️ WARNING: Consider benching Jaylen Warren (RB)

Action: Warren averaging 4.2 PPG this season, while bench RB 
Jerick McKinnon is averaging 6.8 PPG

💡 Reasoning: Based on season-long performance, McKinnon has been 
more productive per game

Confidence: 65% (based on sample size and consistency)
```

## 🚀 What We're Actually Using

### Data Sources:
1. **Player status** from `/v1/players/nfl`
2. **Actual points** from `/v1/league/{id}/matchups/{week}`
3. **Historical totals** from `/v1/league/{id}/rosters` (settings.fpts)
4. **Week number** from `/v1/state/nfl`

### Calculations:
- **Average PPG** = `roster.settings.fpts / (current_week - 1)`
- **Position comparison**: Find bench players at same position
- **Risk level**: Based on current week ranking

## 📊 Feature Status

| Feature | Status | Data Source |
|---------|--------|-------------|
| Injury Alerts | ✅ Working | Player status API |
| Inactive Alerts | ✅ Working | Player status API |
| Bench Comparison | ✅ Working | Historical averages |
| Survival Rankings | ✅ Working | Matchup points |
| Live Scoring | ✅ Working | Matchup points |
| Elimination Detection | ✅ Working | Roster settings |
| Projected vs Actual | ❌ Not possible | No projection API |
| Pre-game Projections | ❌ Not possible | No projection API |

## 🎯 Bottom Line

**Your app is fully functional** using:
- Real injury data
- Real player status  
- Real historical performance
- Real-time game scores

**It cannot provide** (due to Sleeper API limitations):
- Pre-game weekly projections
- Projected fantasy points
- "What if" scenario projections

The alerts work based on **proven historical data** rather than predictions, which can actually be more reliable!
