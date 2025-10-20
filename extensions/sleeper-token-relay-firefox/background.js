'use strict';

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

function getAppUrl() {
  return new Promise(resolve => {
    (browser.storage || chrome.storage).sync.get({ appUrl: 'https://sleeper.westfam.media' }, (res) => {
      resolve(res.appUrl || 'https://sleeper.westfam.media');
    });
  });
}

function getSleeperCookie() {
  return (browser.cookies || chrome.cookies).get({ url: 'https://sleeper.com', name: 'sleeper-web-session' });
}

async function openAppWithToken(token) {
  const appUrl = await getAppUrl();
  const target = `${appUrl}#token=${encodeURIComponent(token)}`;
  (browser.tabs || chrome.tabs).create({ url: target });
}

async function openAppCookieHelper() {
  const appUrl = await getAppUrl();
  (browser.tabs || chrome.tabs).create({ url: `${appUrl}#help=cookie` });
}

(browser.browserAction || chrome.browserAction).onClicked.addListener(async () => {
  try {
    const cookie = await getSleeperCookie();
    let token = '';
    if (cookie && cookie.value) {
      token = extractInnerTokenFromJWT(cookie.value);
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
