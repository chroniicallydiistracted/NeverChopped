# Sleeper Token Relay (Chrome MV3)

A minimal Chrome extension to capture your Sleeper token and open this app automatically.

## What it does
- Reads the `sleeper-web-session` cookie from `sleeper.com` (on click)
- Decodes the JWT payload to pull the inner token
- Opens the app at `https://sleeper.westfam.media#token=...`
- If the cookie cannot be read or decoded (e.g., different cookie format), it opens the cookie helper at `#help=cookie`

## Install (Developer Mode)
1. Go to chrome://extensions
2. Enable Developer mode (top-right)
3. Click "Load unpacked"
4. Select this folder: `extensions/sleeper-token-relay`
5. Pin the extension to your toolbar (optional)

## Use
1. Ensure you're logged in at https://sleeper.com
2. Click the extension icon "Sleeper Token Relay"
3. A new tab should open to the app with your token pre-filled and auto-login triggered

## Privacy
- The extension only requests access to `cookies` for `sleeper.com`
- No analytics or storage; the token is not persisted by the extension

