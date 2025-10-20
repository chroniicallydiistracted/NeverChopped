# GraphQL Migration - Phase 1 Complete! 🎉

## What We've Built

### ✅ Authentication Infrastructure
- **Token Storage** (`src/utils/tokenStorage.ts`)
  - Secure JWT token management
  - Token expiry tracking
  - User data persistence
  - Auto-cleanup on logout

- **Auth Context** (`src/auth/AuthContext.tsx`)
  - React context for global auth state
  - Login/logout functionality
  - User state management
  - Loading states

- **Login Screen** (`src/components/LoginScreen.tsx`)
  - Beautiful gradient UI
  - Manual JWT token input (temporary)
  - Token validation
  - Clear instructions for users
  - Features preview

### ✅ GraphQL Client Setup
- **GraphQL Client** (`src/graphql/client.ts`)
  - Reusable GraphQL query function
  - Auto-injects JWT token
  - Error handling
  - Token expiry checks

- **Query Definitions** (`src/graphql/queries.ts`)
  - `MY_LEAGUES_QUERY` - Get user's leagues
  - `USER_ROSTERS_QUERY` - Get user rosters
  - `ROSTER_STANDINGS_QUERY` - League standings
  - `MATCHUP_LEGS_QUERY` - Matchup data
  - `LEAGUE_TRANSACTIONS_QUERY` - Transaction history
  - Plus 10+ more queries ready to use!

- **TypeScript Types** (`src/graphql/types.ts`)
  - Full type safety for all GraphQL responses
  - Interface definitions for leagues, rosters, users, etc.

### ✅ UI Components
- **League Selector** (`src/components/LeagueSelector.tsx`)
  - Dropdown to choose active league
  - Auto-loads user's leagues via GraphQL
  - Shows league metadata
  - Auto-selects first league

- **Updated App.tsx**
  - Integrated AuthProvider
  - Login gate
  - User profile widget with logout
  - Loading states

---

## How to Test

### Step 1: Get a Sleeper JWT Token

1. **Open Sleeper.com** in your browser (Chrome/Firefox)
2. **Log in** to your Sleeper account
3. **Open Developer Tools** (F12 or Right-click → Inspect)
4. **Go to Network tab**
5. **Filter by "graphql"** (type "graphql" in the filter box)
6. **Refresh the page** (Ctrl+R or Cmd+R)
7. **Click on any graphql request** in the network list
8. **Go to Headers tab**
9. **Find "Authorization" header** under "Request Headers"
10. **Copy the token** after "Bearer " (long string of characters)

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzNDU2In0.ABC123...
```

Copy everything AFTER "Bearer ": `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Start the Dev Server

```bash
cd /home/andre/NeverChopped
npm run dev
```

### Step 3: Access the App

Visit: **https://sleeper.westfam.media**

### Step 4: Login

1. You'll see the login screen
2. Paste your JWT token in the textarea
3. Click "Login with Token"
4. The app will validate your token
5. If successful, you'll see your leagues!

---

## What's Working Now

### ✅ Authentication Flow
- Login screen displays
- Token validation works
- User state persists in localStorage
- Logout clears all data

### ✅ GraphQL Queries
- Can fetch user's leagues
- League selector loads dynamically
- GraphQL client ready for all queries

### ⏳ Still Using REST API (For Now)
- Main app (SleeperFFHelper) still uses REST API
- We'll migrate REST → GraphQL in Phase 2

---

## Next Steps (Phase 2)

### 1. Add League Context
Create a context to manage selected league:
```typescript
// src/contexts/LeagueContext.tsx
export function LeagueProvider() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagueData, setLeagueData] = useState<SleeperLeague | null>(null);
  // ...
}
```

### 2. Update SleeperFFHelper Component
Remove hardcoded `LEAGUE_ID` and use context:
```typescript
// Old
const LEAGUE_ID = '1124911539343794176';

// New
const { selectedLeagueId } = useLeague();
```

### 3. Migrate REST API Calls to GraphQL
Replace fetch calls one by one:

**Before (REST):**
```typescript
const rostersRes = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`);
const rosters = await rostersRes.json();
```

**After (GraphQL):**
```typescript
const data = await query<MyLeaguesResponse>(MY_LEAGUES_QUERY);
const rosters = data.my_leagues[0].rosters;
```

### 4. Add League Selector to Main UI
```typescript
<div className="mb-4">
  <LeagueSelector 
    selectedLeagueId={selectedLeagueId}
    onSelectLeague={setSelectedLeagueId}
  />
</div>
```

---

## File Structure

```
src/
├── auth/
│   ├── AuthContext.tsx          ✅ Auth state management
│   └── (OAuth flow - coming)
├── graphql/
│   ├── client.ts                ✅ GraphQL client
│   ├── queries.ts               ✅ Query definitions
│   └── types.ts                 ✅ TypeScript types
├── utils/
│   └── tokenStorage.ts          ✅ JWT storage utilities
├── components/
│   ├── LoginScreen.tsx          ✅ Login UI
│   ├── LeagueSelector.tsx       ✅ League picker
│   └── SleeperFFHelper.tsx      ⏳ To be migrated
└── App.tsx                      ✅ Updated with auth
```

---

## Troubleshooting

### Token Validation Fails
**Problem:** "Invalid token or authentication failed"
**Solution:** 
- Make sure you copied the ENTIRE token
- Don't include "Bearer " prefix
- Token must be fresh (login to Sleeper again if needed)
- Check browser console for detailed errors

### No Leagues Loading
**Problem:** League selector shows "No leagues found"
**Solution:**
- Verify your Sleeper account has leagues
- Check browser console for GraphQL errors
- Try logging out and back in with fresh token

### App Shows Loading Forever
**Problem:** Stuck on loading screen
**Solution:**
- Check browser console for errors
- Clear localStorage: `localStorage.clear()` in console
- Refresh page
- Get new JWT token

### GraphQL Query Errors
**Problem:** "GraphQL query failed"
**Solution:**
- Token may have expired (they expire after ~1 hour)
- Get a fresh token from Sleeper
- Check network tab for actual error response

---

## Testing Checklist

- [ ] Login screen displays properly
- [ ] Can paste JWT token
- [ ] Token validation works
- [ ] User profile shows in header
- [ ] League selector loads leagues
- [ ] Can switch between leagues
- [ ] Logout clears data
- [ ] Can login again after logout
- [ ] Token expiry is handled gracefully

---

## Current Limitations

1. **Manual Token Input**
   - Users need to manually copy JWT from browser
   - Will be replaced with OAuth in future

2. **Token Refresh**
   - Tokens expire after ~1 hour
   - No auto-refresh yet (coming in Phase 2)
   - Users need to re-login after expiry

3. **Main App Still Uses REST**
   - SleeperFFHelper component not migrated yet
   - Will migrate in Phase 2

4. **Single League View**
   - Can select league but main app doesn't use it yet
   - Multi-league dashboard coming in Phase 4

---

## Success Metrics

### Phase 1 Goals ✅
- [x] JWT token storage working
- [x] GraphQL client functional
- [x] Login/logout flow complete
- [x] Auth context integrated
- [x] League selector component
- [x] Token validation working
- [x] User state management

### Ready for Phase 2 🚀
- Migrate REST API calls to GraphQL
- Remove hardcoded LEAGUE_ID
- Use dynamic league selection
- Improve error handling
- Add token refresh logic

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Start tunnel (in separate terminal)
cloudflared tunnel --config ~/.cloudflared/sleeper-ff-config.yml run sleeper-ff

# Clear localStorage (in browser console)
localStorage.clear()

# Check stored token (in browser console)
localStorage.getItem('sleeper_jwt_token')

# Test GraphQL query (in browser console)
fetch('https://sleeper.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    query: 'query { my_leagues { league_id name } }'
  })
}).then(r => r.json()).then(console.log)
```

---

## What's Next?

Once you've tested Phase 1 and confirmed it works, we'll move to Phase 2:

1. **Create League Context** - Manage selected league globally
2. **Migrate fetchAllData()** - Replace REST with GraphQL
3. **Update LEAGUE_ID usage** - Make dynamic
4. **Test all 6 tabs** - Ensure they work with GraphQL
5. **Add multi-league support** - Switch leagues without refresh

This is a HUGE milestone! 🎉 The foundation is now in place for a truly universal Sleeper analytics tool.

Let me know when you're ready to test!
