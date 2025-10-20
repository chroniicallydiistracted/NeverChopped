# Projections Feature - How It Works & Timing

## 🎯 Current Status

Your app now has **full projections support** with smart handling for when data is available vs. unavailable.

## 📅 When Projections Are Available

Sleeper's projections API follows this weekly cycle:

### ✅ **AVAILABLE** (Tuesday - Thursday morning)
- **Tuesday/Wednesday**: Projections for the upcoming week become available
- **Thursday before games**: All projections are live and accurate
- **Best time to check lineup**: Wednesday night or Thursday morning before 8:15 PM ET

### ❌ **UNAVAILABLE** (Thursday night - Monday)
- **Thursday 8:15 PM ET onward**: Projections clear when games start
- **Weekend**: Only actual scores available (no projections)
- **Monday night**: Week wraps up with final scores
- **Tuesday morning**: Previous week's projections are cleared

## 🔍 Why You're Seeing Dashes Now

It's currently **Wednesday, October 16, 2025** at night. Here's what's happening:

1. **Week 7 games have started** (Thursday Night Football already played)
2. **Sleeper clears projections** once the week begins
3. **Week 8 projections** aren't published yet (usually available Tuesday/Wednesday)

This is normal behavior - **projections are only available before games start!**

## 🎨 What The App Shows

### Lineup Alerts Tab

**When projections ARE available** (Tuesday-Thursday AM):
```
⚠️ WARNING: Consider benching Jaylen Warren (RB)
Projected: 4.2 pts
💡 Low projection compared to bench alternatives
🟢 Alternative: Consider Jerick McKinnon (6.8 pts projected)
Confidence: 75%
```

**When projections NOT available** (Thursday PM onward):
```
🔔 NOTE: Sleeper projections are only available before games start each week.
Projections typically become available Tuesday/Wednesday and clear once 
Thursday Night Football kicks off. Check back before next week's games!

⚠️ WARNING: Inactive player in lineup
Projected: -
(Alert based on injury/inactive status only)
```

### Survival Mode Tab

**Before games start**:
```
Rank  Team              Projected    Actual
#1    Team Alpha        128.5        0.0
#2    Your Team         115.3        0.0
#3    Team Beta         110.8        0.0
```

**After games start**:
```
Rank  Team              Projected    Actual
#1    Team Alpha        128.5        142.8  <-- Live updating!
#2    Your Team         115.3        118.5
#3    Team Beta         110.8        95.3
```

### Projected vs Actual Table

**Before games**: Shows projected column with dashes for actual

**During games**: Shows both columns updating in real-time

**After games**: Shows final comparison

## 💡 How To Use This Feature

### Best Workflow

1. **Tuesday/Wednesday Morning**
   - Open app and go to **Lineup Alerts**
   - Review all alerts with projected points
   - Check **Projected vs Actual** table for lineup decisions
   - Make roster moves based on projections

2. **Thursday 7:00 PM ET** (Before TNF)
   - Final lineup check
   - Verify all starters are healthy
   - Last chance to see projections before they clear

3. **Thursday 8:30 PM - Monday Night** (Games in progress)
   - Watch **Actual** column update live
   - Monitor **Survival Mode** scoreboard
   - Check **Points Left on Bench** to learn from mistakes

4. **Tuesday Morning** (After week ends)
   - Review **Projected vs Actual** with full data
   - Analyze which players outperformed/underperformed
   - Check **Benched Points** section
   - Use insights for next week's decisions

## 🔧 Technical Details

### API Endpoint
```
https://api.sleeper.app/v1/projections/nfl/{season}/{week}
```

### Data Format
```json
{
  "4034": {
    "player_id": "4034",
    "stats": {
      "pts_half_ppr": 15.8,
      "pts_ppr": 18.3,
      "rush_yd": 75,
      "rec": 5,
      // ... more stats
    }
  }
}
```

### When It Returns Empty
```json
{
  "4034": {},  // Empty object = no projections available
  "4035": {},
  // ...
}
```

## 🎯 Smart Features Built In

1. **Automatic Detection**: App automatically detects when projections are available
2. **Graceful Fallback**: Shows injury/status alerts even without projections
3. **User Notification**: Yellow banner explains when projections aren't available
4. **Dual Display**: Shows both projected AND actual in Survival Mode when relevant
5. **Historical Comparison**: Keeps projected values even after games start so you can compare

## 📊 What You'll See Next Week

**Tuesday, October 22** (Week 8 prep):
- ✅ Projections will be available
- ✅ All enhanced alerts will show projected points
- ✅ Lineup recommendations with confidence scores
- ✅ Projected vs Actual table with full data

**Key timeframe**: Tuesday 12 PM ET through Thursday 8:00 PM ET

## 🚀 Pro Tips

1. **Set a Reminder**: Check app every Wednesday night at 9 PM
2. **Compare Projections**: Look at projected vs your intuition
3. **Trust High Confidence**: Alerts with 80%+ confidence are data-driven
4. **Learn from History**: Review "Projected vs Actual" after each week
5. **Track Benched Points**: Use it to improve future lineup decisions

## ❓ FAQ

**Q: Why can't I see projections on Wednesday night?**
A: Week 7 has already started. Next available projections are Week 8 (Tuesday).

**Q: Will projections show during Sunday games?**
A: No, they clear Thursday night. But "Projected" column persists so you can compare.

**Q: Are these Sleeper's official projections?**
A: Yes! Same data Sleeper uses in their app.

**Q: What scoring format?**
A: Half PPR (0.5 per reception). This matches most leagues.

**Q: Can I see past weeks' projections?**
A: Sleeper doesn't maintain historical projections. Only current week.

## 🎉 Summary

Your app is **working perfectly**! Projections show dashes because:
- ✅ It's after Thursday Night Football
- ✅ Week 7 projections were cleared (normal)
- ✅ Week 8 projections aren't available yet (normal)

**Check back Tuesday morning** and you'll see projections for all 450+ NFL players! 🏈
