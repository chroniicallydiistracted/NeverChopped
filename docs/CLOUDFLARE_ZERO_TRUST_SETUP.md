# Cloudflare Zero Trust Setup for Sleeper FF Helper

## Current Status
✅ **Tunnel Created**: `sleeper-ff` (ID: 73d7c45b-4551-4323-b89d-f8ceaac96871)  
✅ **DNS Configured**: sleeper.westfam.media → sleeper-ff tunnel  
✅ **Config File**: /home/andre/.cloudflared/sleeper-ff-config.yml  
✅ **Tunnel Running**: 4 connections to Cloudflare edge (lax06, lax09, lax11, lax01)

## Zero Trust Configuration (Dashboard Required)

Since Zero Trust applications and access policies cannot be created via CLI, follow these steps in your Cloudflare Dashboard:

### Step 1: Access Zero Trust Dashboard

1. Go to: https://one.dash.cloudflare.com/
2. Select your account
3. Navigate to **Access** → **Applications**

### Step 2: Create Self-Hosted Application

1. Click **Add an application**
2. Select **Self-hosted**
3. Configure the application:

   ```
   Application name: Sleeper FF Helper
   Session Duration: 24 hours (or your preference)
   Application domain: sleeper.westfam.media
   ```

4. Click **Next**

### Step 3: Create Access Policy

Choose one of these policy options:

#### Option A: **Bypass (No Authentication)**
Perfect for personal use on trusted devices.

```
Policy name: Bypass All
Action: Bypass
Include: Everyone
```

This allows anyone with the link to access without login. Good for iPad/mobile access.

#### Option B: **Email Authentication**
Requires login with specific email addresses.

```
Policy name: Email Whitelist
Action: Allow
Include: Emails ending in @your-domain.com
  OR
Include: Email: your-email@gmail.com
```

Enter your personal email address to restrict access to just you.

#### Option C: **One-Time PIN (OTP)**
Sends a PIN code to email for login.

```
Policy name: Email OTP
Action: Allow
Include: Emails: your-email@gmail.com
Login Method: One-time PIN
```

#### Option D: **IP Restriction + Bypass**
Allow from specific IP ranges without login.

```
Policy name: Home Network Bypass
Action: Bypass
Include: IP ranges: YOUR_HOME_IP/32
```

Find your home IP at: https://whatismyipaddress.com/

### Step 4: Additional Settings (Optional)

**Enable these features if desired:**

- **CORS Settings**: Allow if your app makes API calls
  ```
  Access → Applications → sleeper.westfam.media → Settings
  Enable CORS: Yes
  Allowed Origins: *
  ```

- **Session Duration**: Adjust how long users stay logged in
  ```
  24 hours (default)
  7 days (convenient for personal use)
  ```

- **HTTP Request Headers**: Add custom headers
  ```
  Can add user identity headers if needed
  ```

### Recommended Policy for Your Use Case

Since this is a personal fantasy football helper for your iPad:

**Recommended: Bypass Policy**

```yaml
Policy Name: Personal Device Bypass
Action: Bypass
Include: Everyone
```

**Why?**
- ✅ Instant access on iPad Safari (no login prompts)
- ✅ Works great for personal/family use
- ✅ Still protected by obscure subdomain (sleeper.westfam.media)
- ✅ Cloudflare still provides DDoS protection, HTTPS, caching

**If you want more security:**
- Add IP restriction for your home network
- Or use email OTP (requires email code on first access, then remembers device)

### Step 5: Save and Test

1. Click **Add application**
2. Wait 30-60 seconds for policies to propagate
3. Visit: https://sleeper.westfam.media on your iPad
4. Should load immediately (bypass) or prompt for auth (allow policy)

## Current Tunnel Command

The tunnel is currently running with:
```bash
cloudflared tunnel --config /home/andre/.cloudflared/sleeper-ff-config.yml run sleeper-ff
```

## Starting Everything Together

Once Zero Trust is configured, use this workflow:

### Option 1: Manual Start (Two Terminals)

**Terminal 1 - Dev Server:**
```bash
cd /home/andre/NeverChopped
./dev.sh
```

**Terminal 2 - Cloudflare Tunnel:**
```bash
cloudflared tunnel --config /home/andre/.cloudflared/sleeper-ff-config.yml run sleeper-ff
```

### Option 2: Combined Startup Script

I can create a `start-all.sh` script that runs both together if you'd like!

## Troubleshooting

### "Access Denied" Error
- Check that your Zero Trust policy includes your IP/email
- Wait 60 seconds after creating policy
- Clear browser cache and try again

### "502 Bad Gateway"
- Ensure dev server is running on port 3000
- Check tunnel is connected (should see 4 connections)
- Restart both dev server and tunnel

### Tunnel Won't Start
```bash
# Check if tunnel exists
cloudflared tunnel list

# Check tunnel routing
cloudflared tunnel route dns list

# Restart tunnel
pkill -9 cloudflared
cloudflared tunnel --config /home/andre/.cloudflared/sleeper-ff-config.yml run sleeper-ff
```

### Can't Access from iPad
1. Ensure you're using HTTPS: https://sleeper.westfam.media (not http)
2. Wait 2-3 minutes for DNS to propagate globally
3. Try in Safari private/incognito mode
4. Check Zero Trust policy allows your access

## Security Notes

**Current Setup:**
- ✅ HTTPS encryption (Cloudflare SSL)
- ✅ DDoS protection
- ✅ Obscure subdomain (not guessable)
- ⚠️  No authentication yet (pending Zero Trust policy)

**After Zero Trust Bypass Policy:**
- ✅ All of the above
- ⚠️  Still no auth (but that's fine for personal use)

**After Zero Trust Allow Policy:**
- ✅ All of the above
- ✅ Email authentication required
- ✅ Access logs in Cloudflare dashboard

## Next Steps

1. **Create Zero Trust Application** in dashboard (5 minutes)
2. **Choose Bypass or Allow policy** based on your security needs
3. **Test access from iPad Safari**: https://sleeper.westfam.media
4. **Optional**: Create combined startup script for dev server + tunnel

Would you like me to create a startup script that runs both the dev server and tunnel together?
