import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';
import type { Database } from '../../src/types/database.types';

let supabaseClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

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