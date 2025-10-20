# Enhanced Lineup Alerts - Feature Documentation

## Overview
The Lineup Alerts tab has been completely enhanced with detailed projections, reasoning, confidence scores, and three new major sections.

## What's New

### 1. ✨ Enhanced Alert Cards

Each lineup alert now includes:

- **Projected Points** 💜 - Shows expected fantasy points for the player
- **Reasoning** 💡 - Explains WHY the alert is being generated
- **Alternative Suggestions** 🟢 - Recommends specific bench players to start instead
- **Confidence Score** 📊 - Visual bar showing 0-100% confidence level
  - Green (80%+): High confidence
  - Yellow (60-79%): Medium confidence
  - Orange (<60%): Lower confidence

### 2. 📊 Projected vs Actual Performance

New table showing real-time comparison for all starters:

| Player | Position | Projected | Actual | Difference |
|--------|----------|-----------|--------|------------|
| Each starter is tracked with color-coded differentials |

**Features:**
- ✅ Green for outperforming projections
- ❌ Red for underperforming projections
- 📈 Total row showing team-wide projection accuracy
- 🎯 Updated live as games progress

### 3. 🪑 Points Left on Bench

New section tracking all bench players' actual performance:

**Shows:**
- Each bench player's actual points scored
- Highlighted if bench player scored 10+ points (orange) or 5+ points (yellow)
- **Total Points Benched** - Sum of all bench player scores
- Helps identify lineup mistakes and learn from them

### 4. 🎯 Alert Types

Four types of alerts with different severity levels:

#### CRITICAL (Red)
- `INJURY_ALERT`: Injured player in starting lineup
- `INACTIVE_ALERT`: Inactive/IR player starting

#### WARNING (Yellow)
- `LOW_PROJECTION`: Starter projected <5 points
- `BETTER_BENCH_OPTION`: Bench player projected 3+ points higher

#### INFO (Blue)
- General recommendations and optimizations

## How It Works

### Projection-Based Analysis
The system now uses Sleeper's official projections API to:
1. Fetch weekly projections for 450+ NFL players
2. Compare starters vs bench players
3. Identify optimal lineup configurations
4. Calculate confidence based on projection differentials

### Automatic Updates
- Before Thursday Night Football: Shows projections only
- After games start: Auto-switches to actual scores
- Projected vs Actual section: Shows both columns for comparison

### Smart Recommendations
The algorithm considers:
- Injury status and game status
- Projected fantasy points
- Position eligibility
- Historical performance
- Matchup difficulty

## Example Alerts

### Before Games Start
```
⚠️ LOW PROJECTION WARNING
Jaylen Warren (RB) is projected for only 4.2 points

Projected: 4.2 pts
💡 Low projection due to committee backfield situation
🟢 Alternative: Consider Jerick McKinnon (6.8 pts projected)
Confidence: 75% ████████████░░░░
```

### During Games
```
🔴 BETTER BENCH OPTION ALERT
Tank Bigsby (RB) is significantly outscoring your starter!

Actual: 18.5 pts (on bench)
💡 Outscoring Jordan Mason by 12.3 points
Confidence: 90% ██████████████░░
```

## Benefits

1. **Data-Driven Decisions**: Uses official Sleeper projections instead of guesswork
2. **Learn from Mistakes**: Benched points section shows what you missed
3. **Confidence Scores**: Know which alerts to prioritize
4. **Actionable Alternatives**: Specific bench players to consider
5. **Real-Time Tracking**: See how your lineup performs vs projections

## Usage Tips

- Check alerts **before lineup lock** (typically Sunday morning)
- Focus on **CRITICAL alerts first** (red)
- Consider **WARNING alerts** if differentials are large (3+ points)
- Review **Projected vs Actual** during games to track performance
- Use **Points Left on Bench** post-game to learn lineup optimization

## Technical Details

- **Projection Source**: Sleeper API `/v1/projections/nfl/{season}/{week}`
- **Scoring Format**: Half PPR (0.5 per reception)
- **Update Frequency**: Real-time via Vite HMR
- **Position Matching**: Smart algorithm considers FLEX positions

## Future Enhancements

Potential additions:
- Weather impact analysis
- Vegas O/U integration
- Historical accuracy tracking
- Machine learning confidence adjustments
- Push notifications for critical alerts
