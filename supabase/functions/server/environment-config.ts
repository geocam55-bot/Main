import { createClient } from 'jsr:@supabase/supabase-js@2';

export async function getSystemEnvironmentSettings(): Promise<Record<string, string>> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value');

  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    console.warn('[environment-config] system_settings table is missing; falling back to deployment environment settings');
    return {};
  }
  if (error) {
    console.error('[environment-config] Failed to load system settings:', error.message);
    throw new Error(`Failed to load system settings: ${error.message}`);
  }

  return Object.fromEntries((data || []).map((row: { setting_key: string; setting_value: string }) => [
    row.setting_key,
    row.setting_value,
  ]));
}

export function getConfiguredValue(
  settings: Record<string, string>,
  key: string,
  fallback = '',
): string {
  return settings[key] ?? Deno.env.get(key) ?? fallback;
}
