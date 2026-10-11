/**
 * Shared helper for building headers when calling the Supabase Edge Function server.
 *
 * The Supabase gateway requires `Authorization: Bearer <publicAnonKey>` to invoke
 * edge functions.  The user's session JWT is passed in a separate `X-User-Token`
 * header so the server handler can authenticate the caller.
 *
 * We gate all header-building behind an "auth ready" promise so that callers never
 * fire requests before the Supabase auth layer has finished hydrating the session
 * from localStorage on page load.
 */

import { createClient, handleAuthError } from './supabase/client';
import { publicAnonKey } from './supabase/info';

const supabase = createClient();

// ── Auth-ready gate ────────────────────────────────────────────────────
// Resolves once the Supabase auth layer has delivered its first session
// (the INITIAL_SESSION event).  Any code that calls `getServerHeaders()`
// before this fires will wait instead of sending a tokenless request.
let _authReady: (v?: unknown) => void;
const _authReadyPromise = new Promise((resolve) => {
  _authReady = resolve;
});

// ── Proactive token cache via auth state listener ──────────────────────
let _cachedToken: string | null = null;
let _cachedTokenExpiresAtMs: number | null = null;
let _tokenRequestInFlight: Promise<string | null> | null = null;
let _lastRefreshAttemptMs = 0;
const REFRESH_COOLDOWN_MS = 30_000;

// Keep the cache fresh whenever auth state changes (login, logout, refresh).
// The very first event Supabase fires is INITIAL_SESSION — resolve the gate.
const { data: { subscription: _authSub } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    _cachedToken = session?.access_token ?? null;
    _cachedTokenExpiresAtMs = session?.expires_at ? session.expires_at * 1000 : null;
    // Resolve the gate on any first event (INITIAL_SESSION, SIGNED_IN, etc.)
    _authReady();
  },
);

// Safety net: if onAuthStateChange never fires (edge case), unblock after 2s
setTimeout(() => _authReady(), 2000);

/**
 * Get the current user's access token (session JWT).
 * Uses the cached auth state from Supabase's auth listener and refreshes only
 * when the cached token is missing or close to expiry.
 * Returns null if no session is available.
 */
export async function getUserAccessToken(): Promise<string | null> {
  if (_tokenRequestInFlight) {
    return _tokenRequestInFlight;
  }

  _tokenRequestInFlight = (async () => {
    // Wait for the auth layer to have delivered at least one session event.
    await _authReadyPromise;

    // First fallback: read current session directly if cache is empty.
    if (!_cachedToken) {
      try {
        const getSessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1500));
        const raceResult = await Promise.race([getSessionPromise, timeoutPromise]) as any;
        if (raceResult?.error) {
          handleAuthError(raceResult.error);
        }
        const session = raceResult?.data?.session || raceResult?.session;
        if (session?.access_token) {
          _cachedToken = session.access_token;
          _cachedTokenExpiresAtMs = session.expires_at ? session.expires_at * 1000 : null;
        }
      } catch (e) {
        handleAuthError(e);
      }
    }

    const now = Date.now();
    const isExpiredOrStale = _cachedTokenExpiresAtMs !== null
      && _cachedTokenExpiresAtMs <= now + 5 * 60_000;

    if (_cachedToken && !isExpiredOrStale) {
      return _cachedToken;
    }

    if (now - _lastRefreshAttemptMs >= REFRESH_COOLDOWN_MS) {
      _lastRefreshAttemptMs = now;
      try {
        const refreshPromise = supabase.auth.refreshSession();
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2000));
        const raceResult = await Promise.race([refreshPromise, timeoutPromise]) as any;
        const refreshed = raceResult?.data?.session || raceResult?.session;
        const refreshError = raceResult?.error;
        if (refreshError) {
          handleAuthError(refreshError);
          _cachedToken = null;
          _cachedTokenExpiresAtMs = null;
          return null;
        }
        if (refreshed?.access_token) {
          _cachedToken = refreshed.access_token;
          _cachedTokenExpiresAtMs = refreshed.expires_at ? refreshed.expires_at * 1000 : null;
          return refreshed.access_token;
        }
      } catch (e) {
        handleAuthError(e);
        _cachedToken = null;
        _cachedTokenExpiresAtMs = null;
        return null;
      }
    }

    return _cachedToken;
  })();

  try {
    return await _tokenRequestInFlight;
  } finally {
    _tokenRequestInFlight = null;
  }
}

/**
 * Build headers for a server API call.
 * Always includes Authorization with the anon key (for the gateway).
 * Adds X-User-Token when a session is available.
 */
export async function getServerHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const userToken = await getUserAccessToken();
  if (!headers['X-User-Token'] && userToken) {
    headers['X-User-Token'] = userToken;
  }

  return headers;
}