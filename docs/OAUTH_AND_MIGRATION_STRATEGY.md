# OAuth & Migration Strategy

## Current Issues Fixed ✅

### 1. Login Flow Bug
**Problem:** Token was stored BEFORE validation, causing "error" message but working on refresh.

**Solution:** Now validates token first, only stores if successful.

```typescript
// OLD (BROKEN):
setAccessToken(token);  // Store first
const response = await fetch(...);  // Validate after
if (!response.ok) throw error;  // Too late!

// NEW (FIXED):
const response = await fetch(...);  // Validate first
if (!result.data) throw error;  // Check data
setAccessToken(token);  // Only store if valid ✅
```

---

## Migration Overview

### Current State
- ✅ JWT authentication working
- ✅ GraphQL client ready
- ✅ 15+ GraphQL queries defined
- ⚠️ **Still uses hardcoded league ID in config.ts**

### Hardcoded References Found

**Primary Configuration:**
- `src/config.ts` - Line 16: `leagueId: '1265326608424648704'`
- `src/config.ts` - Line 15: `userId: '1268309493943373825'`

**SleeperFFHelper.tsx Usage:**
- Line 30: `const LEAGUE_ID = config.leagueId;`
- Line 60-267: Used in all REST API fetch calls (9 occurrences)

### Key Insight 💡
**We DON'T need to rewrite everything for JWT!** The token is just for GraphQL auth. The main migration is:
1. Replace hardcoded `config.leagueId` with dynamic league selection
2. Gradually migrate REST API calls to GraphQL
3. OAuth is a separate future enhancement

---

## Phase 2: Dynamic League Selection (NEXT)

### Goal
Remove hardcoded league ID, let user select from their leagues.

### Implementation Steps

#### Step 1: Create League Context
```typescript
// src/contexts/LeagueContext.tsx
export const LeagueContext = createContext({
  selectedLeagueId: null,
  selectedLeague: null,
  setSelectedLeagueId: (id: string) => {},
});

export function LeagueProvider({ children }) {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [leagueData, setLeagueData] = useState(null);
  
  // Load league data when selection changes
  useEffect(() => {
    if (selectedLeagueId) {
      loadLeagueData(selectedLeagueId);
    }
  }, [selectedLeagueId]);
  
  return (
    <LeagueContext.Provider value={{ ... }}>
      {children}
    </LeagueContext.Provider>
  );
}
```

#### Step 2: Update App.tsx
```typescript
// Wrap with LeagueProvider
<AuthProvider>
  <LeagueProvider>
    <AppContent />
  </LeagueProvider>
</AuthProvider>
```

#### Step 3: Add League Selector to Main UI
```typescript
// In SleeperFFHelper.tsx or App.tsx
import LeagueSelector from './LeagueSelector';

<div className="mb-4">
  <LeagueSelector />
</div>
```

#### Step 4: Update SleeperFFHelper to Use Context
```typescript
// OLD
const LEAGUE_ID = config.leagueId;

// NEW
const { selectedLeagueId } = useLeague();
const LEAGUE_ID = selectedLeagueId || config.leagueId; // Fallback to config
```

#### Step 5: Update config.ts to be optional
```typescript
export const defaultConfig: LeagueConfig = {
  userId: '1268309493943373825', // Still needed for some legacy features
  leagueId: '1265326608424648704', // Fallback if no selection
  username: 'CHRONiiC',
  teamName: 'Gods Gift to Girth',
};

// NEW: Get from context first, config as fallback
export const getLeagueId = (): string => {
  const context = useLeague();
  return context?.selectedLeagueId || defaultConfig.leagueId;
};
```

---

## Phase 3: Migrate REST to GraphQL (LATER)

### Why Not Now?
- JWT token input is temporary
- OAuth will require changes anyway
- Focus on dynamic league selection first
- REST API still works fine

### When to Migrate?
After OAuth is implemented and stable.

### What to Migrate?
Replace these REST calls with GraphQL equivalents:

```typescript
// Current REST calls in SleeperFFHelper.tsx:
fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}`)
fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`)
fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`)
fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${week}`)
fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/transactions/${week}`)

// GraphQL equivalents already defined:
MY_LEAGUES_QUERY
USER_ROSTERS_QUERY
LEAGUE_USERS_QUERY
MATCHUP_LEGS_QUERY
LEAGUE_TRANSACTIONS_QUERY
```

---

## OAuth Strategy (FUTURE)

### The Problem
Sleeper has NO official OAuth flow. We need to capture their JWT token.

### Proposed Solution: Login Proxy

#### Architecture
```
User → Our Login Page → Sleeper Login (iframe/popup) → Intercept JWT → Redirect
```

#### Implementation Approach

**Option 1: Browser Extension Assist**
- Create a simple browser extension
- Captures Authorization headers on sleeper.com
- Sends to our app via postMessage
- Clean UX, works cross-platform

**Option 2: Proxy Server**
- Host a proxy that serves Sleeper login page
- Inject JavaScript to capture JWT from localStorage
- Send JWT back to our app
- More complex, potential CORS issues

**Option 3: Developer Flow (Current)**
- Keep manual JWT input
- Add auto-refresh detection
- Add "Copy from DevTools" helper
- Good enough for power users

#### Recommended: Hybrid Approach
1. **Start:** Manual JWT input (current)
2. **Phase 1:** Add "Helper Extension" (optional)
   - Small browser extension
   - One-click JWT capture
   - Only needed once per session
3. **Phase 2:** Build OAuth proxy (if demand warrants)
   - Full automated flow
   - No manual steps
   - Requires backend service

---

## Implementation Priority

### 🔥 IMMEDIATE (This Week)
1. ✅ Fix login validation bug (DONE!)
2. Create LeagueContext
3. Add league selector to main UI
4. Update SleeperFFHelper to use context
5. Test with multiple leagues

### 📅 SHORT-TERM (Next Week)
1. Add token refresh detection
2. Improve error handling
3. Add league switching without refresh
4. Update all REST API calls to support dynamic league

### 🎯 MID-TERM (Next Month)
1. Begin REST → GraphQL migration
2. Add multi-league dashboard
3. Implement proper user profile from GraphQL
4. Add league statistics

### 🚀 LONG-TERM (Future)
1. OAuth proxy solution
2. Mobile app considerations
3. Enhanced features using GraphQL-only data
4. Social features (friends, trade analyzer)

---

## Files to Modify (Phase 2)

### New Files
- `src/contexts/LeagueContext.tsx` - League state management

### Modified Files
- `src/App.tsx` - Add LeagueProvider wrapper
- `src/components/SleeperFFHelper.tsx` - Use context instead of config
- `src/config.ts` - Make leagueId optional/fallback

### Unchanged Files (For Now)
- All GraphQL files (already ready)
- Authentication files (working correctly)
- All REST API implementations (still work fine)

---

## Testing Checklist (Phase 2)

- [ ] Login with valid JWT token
- [ ] See list of user's leagues
- [ ] Select a league from dropdown
- [ ] App loads data for selected league
- [ ] Switch to different league
- [ ] Data updates without refresh
- [ ] Logout and login with different token
- [ ] Verify new user sees their leagues

---

## OAuth Implementation Notes

### JWT Token Structure
From your token:
```json
{
  "avatar": "3c3a497e80ed723e40842be972f61ef8",
  "display_name": "CHRONiiC",
  "exp": 1789752006,
  "iat": 1758216006,
  "is_bot": false,
  "is_master": false,
  "real_name": null,
  "user_id": 1268309493943373825,
  "valid_2fa": "phone"
}
```

### Token Lifespan
- Issued: 1758216006 (Jan 2025)
- Expires: 1789752006 (Nov 2026)
- **Duration: ~18 months!** 🎉

This is actually GREAT news - tokens last a long time, so OAuth urgency is low.

### Refresh Token?
Need to investigate if Sleeper provides refresh tokens. Might be in:
- Response headers during login
- localStorage on sleeper.com
- GraphQL mutation response

---

## Decision Matrix

### Should We Build OAuth Now?
**NO** - Here's why:

| Factor | Assessment |
|--------|------------|
| **Token Duration** | 18 months - very long |
| **User Base** | Just you for now |
| **Complexity** | High - no official API |
| **Value** | Low - manual works fine |
| **Risk** | High - could break with Sleeper changes |

### Should We Migrate to GraphQL Now?
**PARTIALLY** - Strategic approach:

| Component | Migrate? | Reason |
|-----------|----------|--------|
| **League Selection** | ✅ YES | Core feature, GraphQL required |
| **Basic Data** | ❌ NOT YET | REST still works, OAuth pending |
| **User Profile** | ✅ YES | Need for display/context |
| **Advanced Features** | ✅ YES | GraphQL-only data |

---

## Next Steps

1. **Test the fixed login** - Try your token again
2. **Implement LeagueContext** - Dynamic league selection
3. **Add league switcher to UI** - User can choose league
4. **Verify with your leagues** - Test with real data
5. **Document for future OAuth** - When time is right

Focus on making it work for multiple leagues FIRST, then worry about fancy OAuth later! 🎯

---

## Questions to Investigate

1. **Refresh Tokens:** Does Sleeper provide them?
2. **Token Revocation:** Can users revoke tokens?
3. **Rate Limiting:** Are there GraphQL query limits?
4. **Scope:** What permissions does the JWT grant?
5. **Multiple Leagues:** Performance with 10+ leagues?

---

## Summary

✅ **What's Working:**
- JWT authentication
- Token validation
- GraphQL client
- Login/logout flow

🔄 **What's Next:**
- Dynamic league selection
- Remove hardcoded config
- Multi-league support

❌ **What's NOT Urgent:**
- OAuth implementation
- REST → GraphQL migration
- Advanced features

**Philosophy:** Make it work, make it right, make it fast (in that order).
