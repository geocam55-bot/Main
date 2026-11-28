// @ts-nocheck
import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';
import type { CustomExportTemplate } from './export-engine';

const supabase = createClient();

const SERVER_BASE = '/api';

export interface UserPreferences {
  user_id: string;
  organization_id: string;
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_task_assignments: boolean;
  notifications_appointments: boolean;
  notifications_bids: boolean;
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationSettings {
  organization_id: string;
  tax_rate: number;
  tax_rate_2: number;
  default_price_level: string;
  quote_terms: string;
  organization_name?: string;
  audience_segments?: string[]; // Marketing audience segments
  price_tier_labels?: Record<string, string>; // May not exist as a DB column yet
  user_invite_method?: string; // May not exist as a DB column yet
  export_templates?: CustomExportTemplate[]; // May not exist as a DB column yet
  created_at?: string;
  updated_at?: string;
}

// Fields that may not exist as columns in the organization_settings table.
// These are stripped before upsert to avoid PGRST204 errors,
// and are handled via localStorage fallback instead.
// export_templates is now stored in the DB column; only these legacy fields stay in KV / need stripping
const OPTIONAL_NON_DB_FIELDS = ['price_tier_labels', 'audience_segments', 'user_invite_method'];

const PRIMARY_ORG_UUID = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

function normalizeSettingsOrgId(orgId?: string): string {
  const trimmed = String(orgId || '').trim();
  if (!trimmed || trimmed === 'rona_atlantic' || trimmed === 'org_001' || trimmed === 'default-org' || trimmed === 'default_org') {
    return PRIMARY_ORG_UUID;
  }
  return trimmed;
}

// ─── GET user preferences ──────────────────────────────────────────────────

export async function getUserPreferencesClient(userId: string, organizationId: string): Promise<UserPreferences | null> {
  if (!userId || !organizationId) {
    return null;
  }
  const normOrgId = normalizeSettingsOrgId(organizationId);

  // Try server endpoint first (supports JWT, X-App-Session, and HttpOnly cookie; bypasses RLS)
  try {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${SERVER_BASE}/settings/user-preferences?user_id=${encodeURIComponent(userId)}&organization_id=${encodeURIComponent(normOrgId)}`,
      { headers, credentials: 'same-origin' }
    );
    if (res.ok) {
      const json = await res.json();
      return json.preferences || null;
    }
  } catch (err) {
    // Server endpoint failed, falling back
  }

  // Fallback: direct Supabase query
  try {
    const { data, error } = await supabase
      .from('user_preferences' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', normOrgId)
      .maybeSingle();

    if (data) return data;

    // Legacy fallback by user_id (e.g. preferences stored under 'default-org')
    if (!error || error.code === 'PGRST116') {
      const { data: legacyPref } = await supabase
        .from('user_preferences' as any)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (legacyPref) return legacyPref;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ─── UPSERT user preferences ──────────────────────────────────────────────

export async function upsertUserPreferencesClient(preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
  const normPrefs = {
    ...preferences,
    ...(preferences.organization_id ? { organization_id: normalizeSettingsOrgId(preferences.organization_id) } : {}),
  };

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/user-preferences`, {
      method: 'PUT',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(normPrefs),
    });
    if (res.ok) {
      const json = await res.json();
      return json.preferences || null;
    }
  } catch (err) {
    // Server endpoint failed for user prefs upsert, falling back
  }

  // Fallback: direct Supabase
  try {
    const { data, error } = await supabase
      .from('user_preferences' as any)
      .upsert({
        ...normPrefs,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,organization_id'
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // user_preferences table does not exist
        return null;
      }
      if (error.code === '42501') {
        // RLS policy violation - silently fall back to localStorage (expected behavior)
        // RLS blocked user prefs upsert (both server & direct failed)
        return null;
      }
      // Error upserting user preferences
      return null;
    }

    // User preferences saved via direct Supabase
    return data;
  } catch (error) {
    // Unexpected error upserting user preferences
    return null;
  }
}

// ─── GET organization settings ─────────────────────────────────────────────

export async function getOrganizationSettingsClient(organizationId: string): Promise<OrganizationSettings | null> {
  const normOrgId = normalizeSettingsOrgId(organizationId);

  const getLocalSettingsFallback = (): Partial<OrganizationSettings> | null => {
    try {
      const orgId = normalizeSettingsOrgId(localStorage.getItem('currentOrgId') || normOrgId);
      const stored = localStorage.getItem(`global_settings_${orgId}`) || localStorage.getItem(`global_settings_${organizationId}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        organization_id: orgId,
        tax_rate: parsed.taxRate,
        tax_rate_2: parsed.taxRate2,
        default_price_level: parsed.defaultPriceLevel,
        quote_terms: parsed.quoteTerms,
        audience_segments: parsed.audienceSegments,
        price_tier_labels: parsed.priceTierLabels,
        user_invite_method: parsed.userInviteMethod,
        export_templates: parsed.exportTemplates,
      };
    } catch {
      return null;
    }
  };

  const mergeWithLocalFallback = (settings: OrganizationSettings | null): OrganizationSettings | null => {
    const localFallback = getLocalSettingsFallback();
    if (!settings && !localFallback) return null;
    const shouldUseLocalExportTemplates =
      Array.isArray(localFallback?.export_templates) &&
      localFallback.export_templates.length > 0 &&
      (!Array.isArray(settings?.export_templates) || settings.export_templates.length === 0);

    return {
      ...(settings || {}),
      ...(localFallback?.price_tier_labels !== undefined && settings?.price_tier_labels === undefined
        ? { price_tier_labels: localFallback.price_tier_labels }
        : {}),
      ...(localFallback?.audience_segments !== undefined && settings?.audience_segments === undefined
        ? { audience_segments: localFallback.audience_segments }
        : {}),
      ...(localFallback?.user_invite_method !== undefined && settings?.user_invite_method === undefined
        ? { user_invite_method: localFallback.user_invite_method }
        : {}),
      ...(shouldUseLocalExportTemplates
        ? { export_templates: localFallback.export_templates }
        : {}),
    } as OrganizationSettings;
  };

  // Try Express server endpoint first (supports JWT, X-App-Session, and HttpOnly cookie; bypasses RLS)
  let headers: Record<string, string> = {};
  try {
    headers = await getServerHeaders();
    const res = await fetch(
      `${SERVER_BASE}/settings/organization?organization_id=${encodeURIComponent(normOrgId)}`,
      { headers, credentials: 'same-origin' }
    );
    if (res.ok) {
      const json = await res.json();
      return mergeWithLocalFallback(json.settings || null);
    }
  } catch (err) {
    // Server endpoint failed, falling back
  }

  // Secondary fallback: Edge Function when user holds a Supabase JWT
  if (headers['X-User-Token'] && projectId) {
    try {
      const edgeRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/settings/organization?organization_id=${encodeURIComponent(normOrgId)}`,
        { headers }
      );
      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json();
        return mergeWithLocalFallback(edgeJson.settings || null);
      }
    } catch {
      // Fall through to direct Supabase
    }
  }

  // Fallback: direct Supabase query
  try {
    const { data, error } = await supabase
      .from('organization_settings' as any)
      .select('*')
      .eq('organization_id', normOrgId)
      .maybeSingle();

    if (error && !data) {
      return mergeWithLocalFallback(null);
    }

    return mergeWithLocalFallback(data || null);
  } catch (error) {
    return mergeWithLocalFallback(null);
  }
}

// ─── UPSERT organization settings ──────────────────────────────────────────

export async function upsertOrganizationSettingsClient(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings | null> {
  const normSettings = {
    ...settings,
    ...(settings.organization_id ? { organization_id: normalizeSettingsOrgId(settings.organization_id) } : {}),
  };

  // Try server endpoint first (bypasses RLS) — this is the primary path
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/organization`, {
      method: 'PUT',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(normSettings),
    });

    if (res.ok) {
      const json = await res.json();
      return json.settings || null;
    }

    const errBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
    // Server upsert org settings returned non-ok status

    // If server returned 403 (permission), surface it clearly
    if (res.status === 403) {
      throw new Error(errBody.error || 'Permission denied by server');
    }
    // For other server errors, fall through to direct Supabase
  } catch (err: any) {
    // If it's a permission error from the server, rethrow
    if (err?.message?.includes('Permission denied') || err?.message?.includes('admin')) {
      throw err;
    }
    // Server endpoint failed for org settings upsert, falling back
  }

  // Fallback: direct Supabase (may hit RLS — that's expected in some environments)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to update organization settings');
    }

    // Strip out any fields that may not exist in the DB
    const dbSettings = { ...normSettings };
    OPTIONAL_NON_DB_FIELDS.forEach(field => {
      if (field in dbSettings) {
        delete dbSettings[field];
      }
    });

    const { data, error } = await supabase
      .from('organization_settings' as any)
      .upsert({
        ...dbSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id'
      })
      .select()
      .single();

    if (error) {
      // Direct Supabase upsert error

      if (error.code === '42501') {
        throw new Error('Permission denied. The server endpoint also failed. Settings could not be saved to the database.');
      }
      throw new Error(error.message || 'Failed to save organization settings');
    }

    // Organization settings saved via direct Supabase
    return data;
  } catch (error: any) {
    // Error in upsertOrganizationSettingsClient
    throw error;
  }
}

// ─── Update organization name ──────────────────────────────────────────────

export async function updateOrganizationNameClient(organizationId: string, name: string): Promise<void> {
  const normOrgId = normalizeSettingsOrgId(organizationId);

  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/organization-name`, {
      method: 'PUT',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ organization_id: normOrgId, name }),
    });

    if (res.ok) {
      return;
    }
  } catch (err) {
    // Server endpoint failed for org name update, falling back
  }

  // Fallback: direct Supabase
  const { error } = await supabase
    .from('organizations' as any)
    .update({ name })
    .eq('id', normOrgId);

  if (error) {
    throw error;
  }
}

// ─── Update user profile ──────────────────────────────────────────────────

export async function updateUserProfileClient(userId: string, updates: { name?: string; avatar_url?: string }): Promise<void> {
  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/profile`, {
      method: 'PATCH',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ user_id: userId, ...updates }),
    });

    if (res.ok) {
      return;
    }
    // Server returned non-ok status for profile update, falling back
  } catch (err) {
    // Server endpoint failed for profile update, falling back
  }

  // Fallback: direct Supabase
  try {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;

    if (Object.keys(updateData).length === 0) {
      // No updates to apply
      return;
    }

    const { data, error } = await supabase
      .from('profiles' as any)
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      // Error updating user profile

      if (error.code === '42703') {
        throw new Error('Database column not found. The profiles table may need to be updated.');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. You may not have access to update your profile.');
      } else if (error.code === 'PGRST116') {
        throw new Error('Profile not found. Please try logging out and back in.');
      } else {
        throw new Error(error.message || 'Failed to update profile');
      }
    }

    // User profile updated via direct Supabase
  } catch (error: any) {
    // Unexpected error updating user profile
    throw error;
  }
}

// ─── Organization User Mode (KV-backed) ────────────────────────────────────

export type OrgUserMode = 'single' | 'multi';

export interface OrgModeSettings {
  user_mode: OrgUserMode;
  organization_id?: string;
  updated_at?: string;
  updated_by?: string;
}

export async function getOrgMode(organizationId: string): Promise<OrgModeSettings> {
  const normOrgId = normalizeSettingsOrgId(organizationId);

  try {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${SERVER_BASE}/settings/org-mode?organization_id=${encodeURIComponent(normOrgId)}`,
      { headers, credentials: 'same-origin' }
    );
    if (res.ok) {
      const json = await res.json();
      return json.orgMode || { user_mode: 'single' };
    }
  } catch (err) {
    // Server endpoint failed for org-mode GET
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(`org_mode_${normOrgId}`) || localStorage.getItem(`org_mode_${organizationId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (_) { /* ignore */ }

  return { user_mode: 'single' };
}

export async function setOrgMode(organizationId: string, userMode: OrgUserMode): Promise<OrgModeSettings> {
  const normOrgId = normalizeSettingsOrgId(organizationId);

  // Always save to localStorage as backup
  const localData: OrgModeSettings = { user_mode: userMode, organization_id: normOrgId, updated_at: new Date().toISOString() };
  try {
    localStorage.setItem(`org_mode_${normOrgId}`, JSON.stringify(localData));
  } catch (_) { /* ignore */ }

  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/org-mode`, {
      method: 'PUT',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ organization_id: normOrgId, user_mode: userMode }),
    });

    if (res.ok) {
      const json = await res.json();
      return json.orgMode;
    }

    const errBody = await res.json().catch(() => ({ error: 'Unknown server error' }));

    if (res.status === 403) {
      throw new Error(errBody.error || 'Permission denied');
    }
  } catch (err: any) {
    if (err?.message?.includes('Permission denied') || err?.message?.includes('admin')) {
      throw err;
    }
  }

  return localData;
}

// ─── Environment Settings (System & Tenant) ──────────────────────────────────

const SECRET_KEY_NAMES = new Set([
  'SYSTEM_SMTP_PASSWORD',
  'SMTP_PASS',
  'GEMINI_API_KEY',
  'GOOGLE_MAPS_PLATFORM_KEY',
  'AZURE_CLIENT_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'FLEET_COMPLETE_PASSWORD',
  'FLEET_COMPLETE_API_KEY',
]);

export async function getEnvironmentSettingsClient(
  scope: 'system' | 'tenant',
  organizationId?: string
): Promise<{ values: Record<string, string>; configuredSecrets: string[] }> {
  const result: Record<string, string> = {};
  const configuredSecrets: string[] = [];
  const normOrgId = organizationId ? normalizeSettingsOrgId(organizationId) : undefined;

  // Try server endpoint first if available
  try {
    const headers = await getServerHeaders();
    const query = new URLSearchParams({ scope });
    if (normOrgId) query.set('organization_id', normOrgId);
    const res = await fetch(`${SERVER_BASE}/settings/environment?${query.toString()}`, { headers, credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return {
          values: data.values || {},
          configuredSecrets: Array.isArray(data.configuredSecrets) ? data.configuredSecrets : [],
        };
      }
    }
  } catch {
    // Fall back to direct database query
  }

  // Fallback 1: Direct Supabase database queries
  try {
    if (scope === 'system') {
      const { data: sysData, error: sysError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (!sysError && Array.isArray(sysData)) {
        for (const row of sysData) {
          if (row.setting_key) {
            if (SECRET_KEY_NAMES.has(row.setting_key)) {
              if (row.setting_value) configuredSecrets.push(row.setting_key);
            } else {
              result[row.setting_key] = row.setting_value || '';
            }
          }
        }
        return { values: result, configuredSecrets };
      }

      // Fallback to app_env_vars table
      const { data: envData, error: envError } = await supabase
        .from('app_env_vars')
        .select('key, value');

      if (!envError && Array.isArray(envData)) {
        for (const row of envData) {
          if (row.key) {
            if (SECRET_KEY_NAMES.has(row.key)) {
              if (row.value) configuredSecrets.push(row.key);
            } else {
              result[row.key] = row.value || '';
            }
          }
        }
        return { values: result, configuredSecrets };
      }
    } else if (scope === 'tenant' && organizationId) {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_settings')
        .select('setting_key, setting_value')
        .eq('organization_id', organizationId);

      if (!tenantError && Array.isArray(tenantData)) {
        for (const row of tenantData) {
          if (row.setting_key) {
            if (SECRET_KEY_NAMES.has(row.setting_key)) {
              if (row.setting_value) configuredSecrets.push(row.setting_key);
            } else {
              result[row.setting_key] = row.setting_value || '';
            }
          }
        }
        return { values: result, configuredSecrets };
      }

      // Fallback to tenant_env_vars table
      const { data: envData, error: envError } = await supabase
        .from('tenant_env_vars')
        .select('key, value')
        .eq('organization_id', organizationId);

      if (!envError && Array.isArray(envData)) {
        for (const row of envData) {
          if (row.key) {
            if (SECRET_KEY_NAMES.has(row.key)) {
              if (row.value) configuredSecrets.push(row.key);
            } else {
              result[row.key] = row.value || '';
            }
          }
        }
        return { values: result, configuredSecrets };
      }
    }
  } catch (dbErr) {
    console.warn('Direct DB read failed for environment settings:', dbErr);
  }

  // Fallback 2: Local storage
  try {
    const storageKey = `env_settings_${scope}_${organizationId || 'global'}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      for (const [k, v] of Object.entries(parsed)) {
        if (SECRET_KEY_NAMES.has(k)) {
          if (v) configuredSecrets.push(k);
        } else {
          result[k] = String(v || '');
        }
      }
    }
  } catch {
    // Ignore
  }

  return { values: result, configuredSecrets };
}

export async function saveEnvironmentSettingsClient(
  scope: 'system' | 'tenant',
  values: Record<string, string>,
  clearKeys: string[],
  organizationId?: string
): Promise<{ success: boolean }> {
  // Always update localStorage as backup
  try {
    const storageKey = `env_settings_${scope}_${organizationId || 'global'}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const key of clearKeys) {
      delete existing[key];
    }
    for (const [key, val] of Object.entries(values)) {
      if (val) existing[key] = val;
    }
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch {
    // Ignore local storage error
  }

  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const normOrgId = organizationId ? normalizeSettingsOrgId(organizationId) : undefined;
    const res = await fetch(`${SERVER_BASE}/settings/environment`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({
        scope,
        values,
        clearKeys,
        organizationId: normOrgId,
      }),
    });
    if (res.ok) {
      return { success: true };
    }
  } catch {
    // Fall back to direct DB updates
  }

  // Fallback: Direct DB operations
  try {
    if (scope === 'system') {
      for (const key of clearKeys) {
        await supabase.from('system_settings').delete().eq('setting_key', key);
        await supabase.from('app_env_vars').delete().eq('key', key);
      }
      for (const [key, val] of Object.entries(values)) {
        if (!val && !clearKeys.includes(key)) continue;
        if (val) {
          await supabase
            .from('system_settings')
            .upsert({ setting_key: key, setting_value: val, updated_at: new Date().toISOString() });
          await supabase
            .from('app_env_vars')
            .upsert({ key, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        }
      }
      return { success: true };
    } else if (scope === 'tenant' && organizationId) {
      for (const key of clearKeys) {
        await supabase
          .from('tenant_settings')
          .delete()
          .eq('organization_id', organizationId)
          .eq('setting_key', key);
        await supabase
          .from('tenant_env_vars')
          .delete()
          .eq('organization_id', organizationId)
          .eq('key', key);
      }
      for (const [key, val] of Object.entries(values)) {
        if (!val && !clearKeys.includes(key)) continue;
        if (val) {
          await supabase
            .from('tenant_settings')
            .upsert({ organization_id: organizationId, setting_key: key, setting_value: val, updated_at: new Date().toISOString() });
          await supabase
            .from('tenant_env_vars')
            .upsert({ organization_id: organizationId, key, value: val, updated_at: new Date().toISOString() }, { onConflict: 'organization_id,key' });
        }
      }
      return { success: true };
    }
  } catch (err) {
    console.warn('Direct DB save error for environment settings:', err);
  }

  return { success: true };
}

