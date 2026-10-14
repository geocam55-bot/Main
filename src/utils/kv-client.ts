import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Universal Key-Value client for kv_store_8405be07.
 * Supports direct client read/write with seamless server API fallback for RLS compatibility.
 */
export async function getKvValue<T = any>(key: string): Promise<T | null> {
  // 1. Direct Supabase Client
  try {
    const { data, error } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!error && data && data.value !== undefined) {
      return data.value as T;
    }
  } catch (e) {}

  // 2. Server API Fallback (service-role authenticated to bypass RLS)
  try {
    const resp = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`);
    if (resp.ok) {
      const json = await resp.json();
      return json.value as T;
    }
  } catch (e) {}

  return null;
}

export async function setKvValue<T = any>(key: string, value: T): Promise<boolean> {
  // 1. Direct Supabase Client
  try {
    const { error } = await supabase
      .from('kv_store_8405be07')
      .upsert({ key, value });
    if (!error) return true;
  } catch (e) {}

  // 2. Server API Fallback (service-role authenticated to bypass RLS)
  try {
    const resp = await fetch('/api/kv/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    if (resp.ok) {
      const json = await resp.json();
      return !!json.success;
    }
  } catch (e) {}

  return false;
}

export async function deleteKvValue(key: string): Promise<boolean> {
  // 1. Direct Supabase Client
  try {
    const { error } = await supabase
      .from('kv_store_8405be07')
      .delete()
      .eq('key', key);
    if (!error) return true;
  } catch (e) {}

  // 2. Server API Fallback (service-role authenticated to bypass RLS)
  try {
    const resp = await fetch('/api/kv/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    if (resp.ok) {
      const json = await resp.json();
      return !!json.success;
    }
  } catch (e) {}

  return false;
}
