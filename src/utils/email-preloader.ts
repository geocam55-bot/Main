/**
 * Email Preloader
 * 
 * Eagerly loads email accounts and triggers a background sync as soon as the
 * user logs in, so the Email tab is ready instantly instead of waiting for the
 * component to mount.
 * 
 * Usage:
 *   - Call `preloadEmailAccounts()` right after successful auth / loadUserData.
 *   - Email.tsx calls `getPreloadedAccounts()` on mount to skip the initial fetch.
 *   - After consuming, the cache is cleared so subsequent mounts do a fresh fetch.
 */

import { getServerHeaders } from './server-headers';
import { projectId } from './supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export interface PreloadedAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'apple' | 'imap';
  email: string;
  connected: boolean;
  last_sync?: string;
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;

}

// Module-level cache
let _cachedAccounts: PreloadedAccount[] | null = null;
let _preloadPromise: Promise<void> | null = null;
let _syncTriggered = false;

/**
 * Kick off account loading + background sync.  Safe to call multiple times —
 * only the first call in a session actually fires network requests.
 */
export function preloadEmailAccounts(): void {
  if (_preloadPromise) return; // already running / completed
  _preloadPromise = _doPreload();
}

async function _doPreload(): Promise<void> {
  try {
    const headers = await getServerHeaders();
    if (!headers['X-User-Token']) {
      return;
    }

    const res = await fetch(`${SERVER}/email-accounts`, { headers });
    if (!res.ok) {
      return;
    }

    const json = await res.json();
    const accounts: PreloadedAccount[] = json.accounts || [];
    _cachedAccounts = accounts;

    // If there's at least one connected account, trigger a background sync
    const active = accounts.find(a => a.connected);
    if (active && !_syncTriggered) {
      _syncTriggered = true;
      _backgroundSync(active.id, headers);
    }
  } catch (err: any) {
    // Non-fatal exception ignored
  }
}

/** Fire-and-forget sync for the active account */
async function _backgroundSync(accountId: string, headers: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(`${SERVER}/email-sync`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, limit: 50 }),
    });
    const data = await res.json();
    if (data.success) {
      // Sync completed
    } else {
      // Non-fatal: account may not have tokens stored yet (e.g. DB-only account without OAuth grant)
    }
  } catch (err: any) {
    // Sync exception ignored
  }
}

/**
 * Consume the cached accounts (if available).  Returns null if preloading
 * hasn't finished yet or was never started.  Clears the cache after returning
 * so the Email component can manage its own state going forward.
 */
export function getPreloadedAccounts(): PreloadedAccount[] | null {
  const data = _cachedAccounts;
  // Don't clear yet — let Email.tsx read it; it will clear when consumed
  return data;
}

/** Clear the cache — called by Email.tsx after it consumes the preloaded data */
export function clearPreloadedAccounts(): void {
  _cachedAccounts = null;
}

/** Reset all preloader state (call on logout) */
export function resetEmailPreloader(): void {
  _cachedAccounts = null;
  _preloadPromise = null;
  _syncTriggered = false;
}