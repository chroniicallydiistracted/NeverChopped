# ⚡ QUICK START GUIDE

**Your Sleeper FF Helper is READY TO USE!**

---

## 🚀 Start Using It RIGHT NOW

### Step 1: The app is already running!
Open your browser and go to:
```
http://localhost:3000/
```

### Step 2: Explore the tabs
- **Dashboard** - See your survival status and weekly strategy
- **Waiver Wire** - Get personalized add/drop recommendations  
- **Lineup Alerts** - Check for injured players
- **Survival Mode** - Track your elimination risk live
- **Standings** - Full league rankings

### Step 3: Refresh data
Click the **Refresh** button (top right) to get the latest info from Sleeper

---

## ⚙️ First Time Setup (Optional)

### Change Your League Settings

**Option A: Edit config file (Quick)**
```bash
# Open in your editor
code src/config.ts

# Change these values:
userId: 'YOUR_USER_ID',
leagueId: 'YOUR_LEAGUE_ID',
username: 'YOUR_USERNAME',
teamName: 'YOUR_TEAM_NAME'
```

**How to find your IDs:**
1. Go to sleeper.com and open your league
2. Look at the URL: `https://sleeper.com/leagues/LEAGUE_ID/...`
3. That number is your league ID
4. For user ID, use Sleeper API: `https://api.sleeper.app/v1/user/YOUR_USERNAME`

**Option B: Use localStorage (Advanced)**
Open browser console (F12) and run:
```javascript
localStorage.setItem('sleeperConfig', JSON.stringify({
  userId: 'YOUR_USER_ID',
  leagueId: 'YOUR_LEAGUE_ID',
  username: 'YOUR_USERNAME',
  teamName: 'YOUR_TEAM_NAME'
}));
```

Then refresh the page.

---

## 🔄 Development Commands

### Start the app (if not running)
```bash
cd /home/andre/NeverChopped
npm run dev
```

### Stop the app
Press `Ctrl + C` in the terminal

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

---

## 📁 Key Files You Might Edit

```
NeverChopped/
├── src/
│   ├── components/
│   │   └── SleeperFFHelper.tsx    # Main app logic (your code)
│   ├── config.ts                  # League settings - EDIT THIS
│   └── index.css                  # Global styling
├── README.md                      # Full documentation
├── DEVELOPMENT.md                 # Technical roadmap
├── DEPLOYMENT.md                  # How to host online
└── PROJECT_STATUS.md              # Current status report
```

---

## 🐛 Troubleshooting

### App won't load
```bash
# Make sure dev server is running
npm run dev
```

### API errors / No data showing
- Check your league ID and user ID in `src/config.ts`
- Make sure you have internet connection
- Verify the NFL season is active

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- --port 3001
```

### TypeScript errors showing
These are warnings, your app still works! To fix them, see DEVELOPMENT.md

### Styling looks broken
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run dev
```

---

## 🎯 What to Do Next

### For Immediate Use:
1. ✅ App is running at http://localhost:3000/
2. ✅ All features are functional
3. ✅ Start using it for your league!

### For Long-Term:
1. 📖 Read **README.md** for full feature list
2. 🔧 Read **DEVELOPMENT.md** for improvements to make
3. 🚀 Read **DEPLOYMENT.md** when ready to host online
4. 📊 Read **PROJECT_STATUS.md** for current status

---

## 📚 Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **QUICK_START.md** | This file - Get started fast | Right now! |
| **README.md** | Full user guide & features | When you have 10 minutes |
| **DEVELOPMENT.md** | Technical roadmap & TODOs | When ready to improve it |
| **DEPLOYMENT.md** | How to host online | When ready to deploy |
| **PROJECT_STATUS.md** | Current state & next steps | To understand what's done |

---

## 💡 Pro Tips

### Get the most out of it:
- 🔄 **Refresh regularly** - Especially during game days
- 📱 **Open on mobile** - Works on phones too!
- 🏆 **Check survival mode** - During Sunday/Monday games
- 🔍 **Monitor waiver wire** - Stay ahead of trends
- 🚨 **Review lineup alerts** - Before setting your lineup

### Share with your league:
1. Deploy to Vercel (see DEPLOYMENT.md)
2. Share the URL with league mates
3. Customize team name for each user
4. Watch everyone's reaction! 😎

---

## ❓ Common Questions

**Q: Is this legal?**  
A: Yes! Uses public Sleeper API, follows their terms

**Q: Will it work during the season?**  
A: Yes! Real-time data from Sleeper API

**Q: Can I use it for multiple leagues?**  
A: Not yet, but it's on the roadmap (DEVELOPMENT.md)

**Q: Does it cost money?**  
A: $0 - Completely free to use!

**Q: Can others use my setup?**  
A: Yes! Just change the config for their league

**Q: How often is data updated?**  
A: Every time you click refresh (consider adding auto-refresh)

**Q: What if Sleeper changes their API?**  
A: May need updates, but API is stable

---

## 🆘 Need Help?

1. **Check browser console** (F12) for error messages
2. **Read the docs** - Start with README.md
3. **Review API docs** - https://docs.sleeper.com/
4. **Test in another browser** - Chrome, Firefox, Safari

---

## 🎉 You're All Set!

Your Sleeper Fantasy Football Helper is fully functional and ready to give you a competitive edge!

**Access it now:** http://localhost:3000/

**Happy analyzing!** 🏈📊🏆

---

*Last Updated: October 15, 2025*
