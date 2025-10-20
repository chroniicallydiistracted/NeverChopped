// Sleeper Token Relay - MV3 Service Worker

// Utility to decode base64url
function decodeBase64Url(input) {
  try {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(b64);
    const percentEncoded = Array.from(decoded)
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch (e) {
    return '';
  }
}

function extractInnerTokenFromJWT(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(decodeBase64Url(parts[1]) || '{}');
    return payload.sleeperToken || payload.sleeper_token || payload.token || '';
  } catch (e) {
    return '';
  }
}

async function getSleeperCookie() {
  // Sleeper uses domain sleeper.com and cookie name 'sleeper-web-session'
  return await chrome.cookies.get({ url: 'https://sleeper.com', name: 'sleeper-web-session' });
}

async function getAppUrl() {
  const stored = await chrome.storage.sync.get({ appUrl: 'https://sleeper.westfam.media' });
  return stored.appUrl || 'https://sleeper.westfam.media';
}

async function openAppWithToken(token) {
  const appUrl = await getAppUrl();
  const target = `${appUrl}#token=${encodeURIComponent(token)}`;
  await chrome.tabs.create({ url: target });
}

async function openAppCookieHelper() {
  const appUrl = await getAppUrl();
  await chrome.tabs.create({ url: `${appUrl}#help=cookie` });
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const cookie = await getSleeperCookie();
    let token = '';
    if (cookie && cookie.value) {
      token = extractInnerTokenFromJWT(cookie.value);
      // Fallback: if inner token is not present, try the cookie JWT itself
      if (!token && cookie.value.split('.').length === 3) {
        token = cookie.value;
      }
    }
    if (token) {
      await openAppWithToken(token);
    } else {
      await openAppCookieHelper();
    }
  } catch (e) {
    await openAppCookieHelper();
  }
});
