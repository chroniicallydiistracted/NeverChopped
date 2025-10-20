# Sleeper Token Relay (Firefox)

Legacy-style WebExtension for Firefox (Manifest v2) that reads the Sleeper `sleeper-web-session` cookie and opens the app with a token.

## Install as temporary add-on
1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `extensions/sleeper-token-relay-firefox/manifest.json`
4. The toolbar icon "Sleeper Token Relay (Firefox)" should appear

## Use
1. Log in to https://sleeper.com
2. Click the toolbar icon
3. The app opens to `#token=...` and auto-login should start

## Optional: point to localhost
- Open the background page console (from about:debugging, click Inspect)
- Run:
```js
(browser.storage || chrome.storage).sync.set({ appUrl: 'http://localhost:3000' })
```
- Click the toolbar icon again

## Notes
- Cookie name: `sleeper-web-session`
- Permissions: `cookies`, `tabs`, `storage`, and host permissions for sleeper.com
- This temporary add-on will be removed on browser restart (normal for dev)
