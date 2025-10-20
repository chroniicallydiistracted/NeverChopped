# Browser Extension: Sleeper Token Relay

This repository includes a Chrome MV3 extension that helps you sign in quickly without copying a token manually.

- Folder: `extensions/sleeper-token-relay`
- Action: Reads Sleeper `sleeper-web-session` cookie and opens the app with `#token=...`
- Fallback: If it can't read the cookie, it opens `#help=cookie` so you can paste the cookie value

## Install (Chrome)
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the folder `extensions/sleeper-token-relay`
5. Pin the extension for quick access (optional)

## Use
1. Navigate to https://sleeper.com and log in
2. Click the "Sleeper Token Relay" extension icon
3. A new tab opens to the app with your token (auto-login). If not, you'll be guided to paste the cookie.

## Notes
- Cookie name expected: `sleeper-web-session`
- Only permission: `cookies` for `sleeper.com` (plus basic extension permissions)
- The extension doesn’t store or transmit your token anywhere; it just opens your app with the token in the URL hash.
