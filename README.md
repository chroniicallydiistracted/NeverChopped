# 🏈 Sleeper Fantasy Football Helper

Advanced analytics and survival mode tracker for Sleeper fantasy football leagues. Built specifically for the "Gods Gift to Girth" team in the Chopped League.

## 🎯 Features

### 📊 Dashboard Tab - Smart Overview
- **Real-time Survival Status** with risk level calculations (CRITICAL/HIGH/MEDIUM/LOW)
- **Roster Health Analysis** - Shows % of active starters vs injured/inactive
- **Position Depth Scoring** - Evaluates if you have enough RBs, WRs, TEs, QBs
- **Dynamic Weekly Strategy** - Changes recommendations based on your current risk level

### 🔄 Waiver Wire Tab - AI-Powered Recommendations
- **Priority-Based System**: CRITICAL > HIGH > MEDIUM > LOW
- **Personalized to YOUR roster needs** (analyzes your position depth gaps)
- **Trending player integration** (pulls top 50 adds/drops from last 24hrs)
- **Availability filtering** (only shows players not already rostered)
- **Action recommendations**: ADD, REPLACE, or WATCH

### 🚨 Lineup Alerts Tab - Injury/Status Intelligence
- Automatic injury detection for all your starters
- Severity levels: CRITICAL (Out/IR) vs WARNING (Questionable/Doubtful)
- Visual status indicators on every starter (Active/Injured/Inactive)
- Immediate action recommendations (e.g., "BENCH IMMEDIATELY")

### ⚡ Survival Mode Tab - Live Elimination Tracker
- Real-time scoreboard showing all teams ranked by current week score
- Your margin from elimination - exact points above the lowest scorer
- Animated alerts when you're in CRITICAL danger (red pulsing border)
- Position tracking - shows you're #X out of Y teams this week
- Emergency action plans when you're at risk

### 🏆 Standings Tab - Enhanced Analytics
- Points Per Game (PPG) calculations for consistency tracking
- Your team highlighted in green
- Full league context with wins/losses/points for/against

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure your league settings**
   
   Edit `src/config.ts` and replace with your values:
   ```typescript
   export const defaultConfig: LeagueConfig = {
     userId: 'YOUR_USER_ID',
     leagueId: 'YOUR_LEAGUE_ID',
     username: 'YOUR_USERNAME',
     teamName: 'YOUR_TEAM_NAME'
   };
   ```

   **How to find your IDs:**
   - Go to your Sleeper league in a browser
   - URL will be: `https://sleeper.com/leagues/LEAGUE_ID/...`
   - Or use Sleeper API: `https://api.sleeper.app/v1/user/YOUR_USERNAME`

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - App will automatically open at `http://localhost:3000`
   - If not, navigate there manually

### Building for Production

```bash
npm run build
```

The optimized production files will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
NeverChopped/
├── src/
│   ├── components/
│   │   └── SleeperFFHelper.tsx    # Main app component
│   ├── config.ts                  # League configuration
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js             # Tailwind CSS config
└── README.md                      # This file
```

## 🔧 Configuration Options

### Local Storage Config
The app can store your league settings in browser localStorage. This allows you to:
- Switch between multiple leagues
- Persist settings across browser sessions
- Override default configuration

To use localStorage config, open browser console and run:
```javascript
localStorage.setItem('sleeperConfig', JSON.stringify({
  userId: 'YOUR_USER_ID',
  leagueId: 'YOUR_LEAGUE_ID',
  username: 'YOUR_USERNAME',
  teamName: 'YOUR_TEAM_NAME'
}));
```

## 🐛 Troubleshooting

### API Rate Limiting
If you see errors about rate limiting:
- The app refreshes all data on load
- Try clicking refresh less frequently
- Consider implementing caching (future enhancement)

### Player Data Not Loading
- Check your internet connection
- Verify league ID is correct
- Make sure the NFL season is active

### Styling Issues
- Clear browser cache
- Run `npm run build` and `npm run preview` to test production build
- Check browser console for errors

## 🎯 Future Enhancements

### High Priority
- [ ] **Data Caching** - Store API responses in localStorage to reduce load times
- [ ] **Error Boundaries** - Better error handling and recovery
- [ ] **Mobile Optimization** - Improve responsive design for phone screens
- [ ] **Settings Panel** - UI to change league config without editing code

### Medium Priority
- [ ] **Historical Tracking** - Compare week-over-week performance trends
- [ ] **Push Notifications** - Alert when players get injured or trending
- [ ] **Multiple League Support** - Track more than one league simultaneously
- [ ] **Export Reports** - Download weekly summaries as PDF/CSV

### Nice to Have
- [ ] **Player Comparison Tools** - Head-to-head player stats
- [ ] **Trade Analyzer** - Evaluate proposed trades with projections
- [ ] **Playoff Probability** - Calculate chances of making playoffs
- [ ] **Schedule Analysis** - Identify easy/hard remaining schedules
- [ ] **Dark/Light Mode Toggle** - Theme switcher

## 📚 API Documentation

This app uses the [Sleeper API](https://docs.sleeper.com/):
- `GET /v1/state/nfl` - Current NFL state (week, season)
- `GET /v1/players/nfl` - All NFL players data
- `GET /v1/players/nfl/trending/add` - Trending adds
- `GET /v1/league/{league_id}` - League details
- `GET /v1/league/{league_id}/rosters` - All rosters
- `GET /v1/league/{league_id}/users` - League users
- `GET /v1/league/{league_id}/matchups/{week}` - Weekly matchups
- `GET /v1/league/{league_id}/transactions/{week}` - Transactions

## 🤝 Contributing

This is a personal project, but feel free to:
- Fork and customize for your own league
- Submit issues for bugs
- Suggest features via GitHub issues

## 📄 License

MIT License - Feel free to use and modify for your own leagues!

## 🙏 Credits

- Built with React, TypeScript, and Tailwind CSS
- Icons by [Lucide](https://lucide.dev/)
- Powered by [Sleeper API](https://sleeper.com/)
- Created for the "Gods Gift to Girth" team 🏆

---

**Last Updated:** October 2025
**Current Version:** 1.0.0

## Field assets and live visualizer notes

- Field images are sourced from Python-scraped GUD outputs. Use:
   - `npm run sync:fields` to copy latest season field images from `py scripts/output_fields/regular-season_*` into `public/fields`.
- The live pass/run paths are metadata-driven and independent of badge placements:
   - X positions: derived from LOS and end-of-play using yard_line and territory or `yards_to_end_zone` fallback.
   - Y positions: mapped into the playable area using per-image vertical padding; pass arcs use a quadratic Bezier with a control point based on depth.
   - This avoids reliance on QB/receiver label positions, which can be unreliable in raw play-by-play data.

## Weekly uniforms sync (GUD)

This project can automatically fetch weekly uniform style letters per team from the Gridiron Uniform Database (GUD) and write JSON records the app can consume.

- Manual sync for a specific week:

   ```bash
   YEAR=2025 WEEK=7 npm run -s uniforms:sync-week
   ```

   Outputs are written to both of these folders:
   - `assets/uniforms/weekly/` (source of truth kept in repo)
   - `public/uniforms/weekly/` (served to the frontend)

   A week summary file is also written as: `YYYY_week_W.json`.

- Discovery is resilient: the sync matches both `game_id=YYYY_AAA-BBB^W` and `title="YYYY_AAA-BBB^W"` patterns on the weekly page. It logs a warning if fewer than 10 games are discovered (to catch future markup changes).

- Build/postbuild behavior: `npm run build` will attempt a weekly sync only if `YEAR` and `WEEK` are provided via npm config flags. If not provided, it skips quietly.

   Optional example:

   ```bash
   npm run build --year=2025 --week=7
   ```

   Internally, the postbuild hook reads `npm_config_year`/`npm_config_week` and passes them as `YEAR`/`WEEK` to the sync script. When not set, the script prints `Skipping weekly sync: no WEEK provided` and exits without error.

- Dev convenience: `npm run predev` (wired to a small auto-sync script) can use `YEAR`/`WEEK` from the environment to fetch the latest week before the dev server starts.
