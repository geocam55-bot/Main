import { createClient } from "@supabase/supabase-js";

export async function getSystemSettings(settingKeys) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return {};

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from("system_settings")
    .select("setting_value")
    .in("setting_key", settingKeys);

  if (error?.code === "PGRST205" || error?.code === "42P01") {
    console.warn("[system-settings] system_settings table is missing; using deployment environment settings");
    return {};
  }
  if (error) {
    console.error("[system-settings] Failed to load settings:", error.message);
    throw new Error(`Failed to load system settings: ${error.message}`);
  }
  return Object.fromEntries((data || []).map(({ setting_key, setting_value }) => [setting_key, setting_value]));
}

export async function getSystemSetting(settingKey) {
  const settings = await getSystemSettings([settingKey]);
  return settings[settingKey] || undefined;
}
