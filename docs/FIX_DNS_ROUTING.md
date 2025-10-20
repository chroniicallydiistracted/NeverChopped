# Fix DNS Routing for sleeper.westfam.media

## Problem
Error 1033 when visiting sleeper.westfam.media because the DNS CNAME is pointing to the wrong tunnel.

**Current State:**
- DNS points to: `57c3a5ba-32cf-4534-af39-f2dcf603a43c` (myst-dashboard tunnel)
- Should point to: `73d7c45b-4551-4323-b89d-f8ceaac96871` (sleeper-ff tunnel)

## Solution: Update DNS in Cloudflare Dashboard

### Method 1: Manual DNS Update (Recommended)

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com/
2. **Select westfam.media domain**
3. **Go to DNS → Records**
4. **Find the CNAME record for `sleeper`**
   - It will show: `sleeper` → `57c3a5ba-32cf-4534-af39-f2dcf603a43c.cfargotunnel.com`
5. **Click Edit**
6. **Change the target to**: `73d7c45b-4551-4323-b89d-f8ceaac96871.cfargotunnel.com`
7. **Save**

### Method 2: Delete and Recreate via CLI

```bash
# This requires Cloudflare API token with DNS edit permissions
# If you have the API token configured:

# Delete the incorrect DNS record (you'll need to do this in dashboard)
# Then recreate with correct tunnel:
cloudflared tunnel route dns sleeper-ff sleeper.westfam.media
```

**Note:** The CLI command `cloudflared tunnel route dns` doesn't always work correctly when a CNAME already exists. Manual dashboard edit is more reliable.

### Method 3: Delete in Dashboard, Recreate via CLI

1. **Go to Cloudflare Dashboard** → westfam.media → **DNS**
2. **Delete** the existing `sleeper` CNAME record
3. **Wait 30 seconds**
4. **Run this command:**
   ```bash
   cloudflared tunnel route dns sleeper-ff sleeper.westfam.media
   ```

## Verification Steps

After updating the DNS:

1. **Wait 1-2 minutes** for DNS to propagate
2. **Restart the tunnel:**
   ```bash
   cloudflared tunnel --config /home/andre/.cloudflared/sleeper-ff-config.yml run sleeper-ff
   ```
3. **Check tunnel connections:**
   - You should see "Registered tunnel connection" messages
   - Should have 4 connections active
4. **Test the URL:** https://sleeper.westfam.media
   - Should load immediately with bypass policy
   - No more error 1033

## Current Tunnel Status

```
Tunnels:
- copper-cup (c3e5dfeb): Active (4 connections)
- myst-dashboard (57c3a5ba): No connections
- sleeper-ff (73d7c45b): No connections (waiting for correct DNS)
- westfam-media (3be77521): Active (4 connections)
```

## After DNS Fix

Once DNS is corrected:
1. Dev server will stay running on port 3000
2. Tunnel will connect (4 connections to Cloudflare edge)
3. Zero Trust bypass policy will allow instant access
4. https://sleeper.westfam.media will work from any device

## Quick Checklist

- [ ] Go to Cloudflare Dashboard
- [ ] Navigate to westfam.media → DNS → Records
- [ ] Find `sleeper` CNAME record
- [ ] Verify it shows `57c3a5ba...` (wrong tunnel)
- [ ] Edit and change to `73d7c45b-4551-4323-b89d-f8ceaac96871.cfargotunnel.com`
- [ ] Save changes
- [ ] Wait 1-2 minutes
- [ ] Start tunnel: `cloudflared tunnel --config /home/andre/.cloudflared/sleeper-ff-config.yml run sleeper-ff`
- [ ] Test: https://sleeper.westfam.media
