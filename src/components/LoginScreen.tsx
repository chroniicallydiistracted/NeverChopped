// Login screen for Sleeper authentication

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { setAccessToken } from '../utils/tokenStorage';

export default function LoginScreen() {
  const { login } = useAuth();
  const [manualToken, setManualToken] = useState('');
  const [cookieInput, setCookieInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autoTriedRef = useRef(false);

  // Precompute bookmarklet href for robust token extraction (localStorage or cookie fallback)
  const appUrl = (typeof window !== 'undefined' && window.location.origin.includes('localhost'))
    ? 'http://localhost:3000'
    : 'https://sleeper.westfam.media';
  const bookmarkletHref = `javascript:(function(){try{function d(s){try{return decodeURIComponent(atob(s.replace(/-/g,'+').replace(/_/g,'/')).split('').map(function(c){return'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)}).join(''))}catch(e){return''}}function et(jwt){try{if(!jwt||jwt.split('.').length!==3)return'';var p=jwt.split('.')[1];var o={};try{o=JSON.parse(d(p))}catch(e){};return o.sleeperToken||o.sleeper_token||o.token||''}catch(e){return''}}function fs(stor){try{for(var i=0;i<stor.length;i++){var k=stor.key(i);var v=stor.getItem(k)||'';if(!v)continue;var parts=v.split('.');if(parts.length===3){var t=et(v);if(t)return t}try{var o=JSON.parse(v);var cand=o.token||o.access_token||o.sleeperToken||o.sleeper_token||'';if(typeof cand==='string'&&cand)return cand;var s=JSON.stringify(o);var m=s.match(/[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/);if(m){var t2=et(m[0]);if(t2)return t2}}catch(e){}}}catch(e){}return''}var t=fs(localStorage)||fs(sessionStorage)||'';if(!t){try{var cs=document.cookie.split('; ');for(var i=0;i<cs.length;i++){var kv=cs[i].split('=');var cv=decodeURIComponent(kv.slice(1).join('=')||'');if(cv.split('.').length===3){var tt=et(cv);if(tt){t=tt;break}}}}catch(e){}}var app='${appUrl}';if(t){window.open(app+'#token='+encodeURIComponent(t),'_blank')}else{if(confirm('Could not find token automatically. This is normal if Sleeper uses an HttpOnly cookie.\n\nClick OK to open the app for the cookie paste helper (DevTools → Application → Cookies → sleeper-web-session).')){window.open(app+'#help=cookie','_blank')}}}catch(e){alert('Failed to run helper: '+(e&&e.message?e.message:e))}})()`;

  // Non-manual token capture: Support URL hash token from bookmarklet redirect
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      if (hash.includes('token=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const t = params.get('token');
        if (t && !manualToken) {
          setManualToken(t);
        }
        // Clean up the URL so the hash doesn't remain
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, document.title, cleanUrl);
        } catch {}
      } else if (hash.includes('help=cookie')) {
        // Nudge focus to cookie helper section shortly after mount
        setTimeout(() => {
          const el = document.getElementById('cookie-helper');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (document.getElementById('cookie-textarea') as HTMLTextAreaElement | null)?.focus?.();
        }, 200);
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, document.title, cleanUrl);
        } catch {}
      }
    } catch {}
  }, []);

  // Auto-login once if token is present via URL hash or bookmarklet
  useEffect(() => {
    if (manualToken && !autoTriedRef.current && !loading) {
      autoTriedRef.current = true;
      // Slight delay to let UI render
      setTimeout(() => {
        handleManualLogin().catch(() => {
          // ignore, user can try manually
        });
      }, 150);
    }
  }, [manualToken]);

  // For now, we'll use manual JWT input until we implement full OAuth
  // This is a temporary solution for testing
  const handleManualLogin = async () => {
    if (!manualToken.trim()) {
      setError('Please enter a JWT token');
      return;
    }

    setLoading(true);
    setError('');

    // Helper to detect and extract inner token from a JWT if present
    const tryExtractInnerFromJWT = (token: string): string | null => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(decoded);
        const inner = payload?.sleeperToken || payload?.sleeper_token || payload?.token;
        return typeof inner === 'string' && inner ? inner : null;
      } catch {
        return null;
      }
    };

    // We'll attempt with the provided token first, then fall back to inner token (if any)
    const candidates: string[] = [];
    candidates.push(manualToken);
    const inner = tryExtractInnerFromJWT(manualToken);
    if (inner && inner !== manualToken) candidates.push(inner);

    try {
      let validatedToken: string | null = null;
      for (const candidate of candidates) {
        const response = await fetch('/api/sleeper/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Sleeper expects a token string in Authorization; some setups require the cookie JWT, others the inner token
            'Authorization': candidate,
          },
          body: JSON.stringify({
            query: `query{my_leagues{league_id name}}`,
          }),
        });

        const result = await response.json();
        if (!response.ok || (result.errors && result.errors.length)) {
          // Try next candidate
          continue;
        }
        if (result.data && result.data.my_leagues) {
          validatedToken = candidate;
          break;
        }
      }

      if (!validatedToken) {
        throw new Error('Invalid token - could not validate against Sleeper GraphQL');
      }

      // Fetch user profile (me)
      let user = {
        user_id: 'temp_user_id',
        username: 'Sleeper User',
        display_name: 'Sleeper User',
        avatar: undefined as string | undefined,
      };

      try {
        const meResponse = await fetch('/api/sleeper/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': validatedToken,
          },
          body: JSON.stringify({
            query: `query{ me { user_id username display_name avatar } }`,
          }),
        });
        const meResult = await meResponse.json();
        if (meResult?.data?.me) {
          user = {
            user_id: String(meResult.data.me.user_id),
            username: meResult.data.me.username || 'user',
            display_name: meResult.data.me.display_name || meResult.data.me.username || 'Sleeper User',
            avatar: meResult.data.me.avatar || undefined,
          };
        }
      } catch {}

      // Token is valid! Now store it and log in
  setAccessToken(validatedToken);
  login(validatedToken, user as any);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Attempt to extract token from a sleeper-web-session cookie value
  const extractTokenFromCookie = (cookieValue: string): string | null => {
    try {
      if (!cookieValue || typeof cookieValue !== 'string') return null;
      // The cookie is a JWT: header.payload.signature
      const parts = cookieValue.split('.');
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = JSON.parse(decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
      const t = (json as any)?.sleeperToken || (json as any)?.sleeper_token || (json as any)?.token;
      return typeof t === 'string' ? t : null;
    } catch {
      return null;
    }
  };

  const handleCookieLogin = async () => {
    const token = extractTokenFromCookie(cookieInput.trim());
    if (!token) {
      setError('Could not extract token from cookie. Please paste the raw sleeper-web-session cookie value.');
      return;
    }
    setManualToken(token);
    await handleManualLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Sleeper Chopped Helper
            </h1>
            <p className="text-gray-300">
              Advanced analytics for your fantasy leagues
              <br />
              <span className="text-sm text-gray-400">OAuth-style login coming soon. For now, use the helper below to capture your token.</span>
            </p>
          </div>

          {/* Manual Token Input */}
          <div className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                Sleeper JWT Token
              </label>
              <textarea
                id="token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste your JWT token here..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={handleManualLogin}
              disabled={loading || !manualToken.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Authenticating...' : 'Login with Token'}
            </button>
          </div>

          {/* Instructions & Bookmarklet */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
            <p className="text-xs text-gray-400 mb-2 font-semibold">How to get your JWT token:</p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Open Sleeper.com in your browser</li>
              <li>Log in to your account</li>
              <li>Open Developer Tools (F12)</li>
              <li>Go to Network tab → Filter by "graphql"</li>
              <li>Refresh the page</li>
              <li>Click on any graphql request</li>
              <li>Find "Authorization" header</li>
              <li>Copy the Bearer token (without "Bearer " prefix)</li>
            </ol>
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">Or use this helper bookmarklet (recommended):</p>
              <p className="text-[11px] text-gray-500 mb-2">Drag this button to your bookmarks bar. While on Sleeper.com (logged in), click it — it will open this app with your token pre-filled and auto-login.</p>
              <a
                className="inline-block text-xs px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white"
                href={bookmarkletHref}
              >Sleeper → Open App with Token</a>
            </div>
          </div>

          {/* Cookie paste fallback */}
          <div id="cookie-helper" className="mt-6 p-4 bg-gray-800/30 rounded-lg">
            <p className="text-xs text-gray-400 mb-2 font-semibold">Alternative: Paste your sleeper-web-session cookie</p>
            <p className="text-[11px] text-gray-500 mb-2">From Sleeper.com DevTools → Application → Cookies → sleeper-web-session. Paste the cookie value below and we'll extract the token for you.</p>
            <textarea
              id="cookie-textarea"
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder="Paste sleeper-web-session cookie value (eyJhbGciOi...)"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={2}
              disabled={loading}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleCookieLogin}
                disabled={loading || !cookieInput.trim()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs disabled:opacity-50"
              >Extract & Login</button>
              <button
                onClick={() => setCookieInput('')}
                disabled={loading}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
              >Clear</button>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center mb-3">What you'll get:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Player Projections</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Survival Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Start/Sit Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Trade Analyzer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Waiver Wire Tips</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Lineup Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
