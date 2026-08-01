import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';
import type { Database } from '../../src/types/database.types';

let supabaseClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function clearStaleAuthTokens() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }
  } catch (e) {
    // Ignore localStorage access errors
  }
}

export function handleAuthError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error.message || error.error_description || (error.toString ? error.toString() : '');
  if (
    msg.includes('Refresh Token') ||
    msg.includes('refresh_token') ||
    msg.includes('Invalid Refresh Token') ||
    msg.includes('Refresh Token Not Found') ||
    msg.includes('JWTPayload') ||
    msg.includes('jwt expired')
  ) {
    console.warn('[Supabase Auth] Cleared invalid/stale refresh token:', msg);
    clearStaleAuthTokens();
    if (supabaseClient) {
      supabaseClient.auth.signOut().catch(() => {});
    }
    return true;
  }
  return false;
}

export function getSupabaseUrl() {
  let envUrl: string | undefined;
  try {
    // @ts-ignore
    envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  } catch (e) {
    // process is not defined, ignore
  }
  const cleanUrl = envUrl ? envUrl.trim().replace(/^['"\s]+|['"\s]+$/g, '') : '';
  return cleanUrl || `https://${projectId}.supabase.co`;
}

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Use environment variables if available (exposed via vite.config.ts define), otherwise fallback to info.tsx
  let envUrl: string | undefined, envKey: string | undefined;
  try {
    // @ts-ignore
    envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // @ts-ignore
    envKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  } catch (e) {
    // process is not defined, ignore
  }

  const cleanUrl = envUrl ? envUrl.trim().replace(/^['"\s]+|['"\s]+$/g, '') : '';
  const cleanKey = envKey ? envKey.trim().replace(/^['"\s]+|['"\s]+$/g, '') : '';

  const supabaseUrl = cleanUrl || `https://${projectId}.supabase.co`;
  const supabaseKey = cleanKey || publicAnonKey;

  supabaseClient = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseClient;
}