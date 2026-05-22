import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';
import type { Database } from '../../src/types/database.types';

let supabaseClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function getSupabaseUrl() {
  let envUrl;
  try {
    // @ts-ignore
    envUrl = process.env.SUPABASE_URL;
  } catch (e) {
    // process is not defined, ignore
  }
  return envUrl || `https://${projectId}.supabase.co`;
}

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Use environment variables if available (exposed via vite.config.ts define), otherwise fallback to info.tsx
  // process.env is replaced by Vite at build time
  let envUrl, envKey;
  try {
    // @ts-ignore
    envUrl = process.env.SUPABASE_URL;
    // @ts-ignore
    envKey = process.env.SUPABASE_ANON_KEY;
  } catch (e) {
    // process is not defined, ignore
  }

  const supabaseUrl = envUrl || `https://${projectId}.supabase.co`;
  const supabaseKey = envKey || publicAnonKey;

  if (!envUrl) {
    // default
  } else {
    // env
  }

  supabaseClient = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseClient;
}