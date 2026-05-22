import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';
import type { CustomExportTemplate } from './export-engine';

const supabase = createClient();

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

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

// ─── GET user preferences ──────────────────────────────────────────────────

export async function getUserPreferencesClient(userId: string, organizationId: string): Promise<UserPreferences | null> {
  // Fetching user preferences

  if (!userId || !organizationId) {
    // Missing userId or organizationId
    return null;
  }

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    // Skip server call if no user token — it will 401 anyway
    if (!headers['X-User-Token']) {
      // No user token yet, skipping server endpoint for user preferences
      throw new Error('No user token');
    }
    const res = await fetch(
      `${SERVER_BASE}/settings/user-preferences?user_id=${encodeURIComponent(userId)}&organization_id=${encodeURIComponent(organizationId)}`,
      { headers }
    );
    if (res.ok) {
      const json = await res.json();
      // User preferences fetched via server
      return json.preferences || null;
    }
    // Server returned non-ok status, falling back to direct Supabase
  } catch (err) {
    // Server endpoint failed, falling back
  }

  // Fallback: direct Supabase query
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found for user
        return null;
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // user_preferences table does not exist yet
        return null;
      }
      // Error fetching user preferences
      return null;
    }

    // User preferences fetched via direct Supabase
    return data;
  } catch (error) {
    // Unexpected error fetching user preferences
    return null;
  }
}

// ─── UPSERT user preferences ──────────────────────────────────────────────

export async function upsertUserPreferencesClient(preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
  // Upserting user preferences

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/user-preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(preferences),
    });
    if (res.ok) {
      const json = await res.json();
      // User preferences saved via server
      return json.preferences || null;
    }
    const errBody = await res.text();
    // Server upsert user prefs returned non-ok status, falling back
  } catch (err) {
    // Server endpoint failed for user prefs upsert, falling back
  }

  // Fallback: direct Supabase
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        ...preferences,
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
  // Fetching organization settings

  const getLocalSettingsFallback = (): Partial<OrganizationSettings> | null => {
    try {
      const orgId = localStorage.getItem('currentOrgId') || organizationId;
      const stored = localStorage.getItem(`global_settings_${orgId}`);
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

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    // Skip server call if no user token — it will 401 anyway
    if (!headers['X-User-Token']) {
      // No user token yet, skipping server endpoint for org settings
      throw new Error('No user token');
    }
    const res = await fetch(
      `${SERVER_BASE}/settings/organization?organization_id=${encodeURIComponent(organizationId)}`,
      { headers }
    );
    if (res.ok) {
      const json = await res.json();
      // Organization settings fetched via server
      return mergeWithLocalFallback(json.settings || null);
    }
    // Server returned non-ok status, falling back to direct Supabase
  } catch (err) {
    // Server endpoint failed, falling back
  }

  // Fallback: direct Supabase query
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found for organization
        return mergeWithLocalFallback(null);
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // organization_settings table does not exist yet
        return mergeWithLocalFallback(null);
      }
      // Error fetching organization settings
      return mergeWithLocalFallback(null);
    }

    // Organization settings fetched via direct Supabase
    return mergeWithLocalFallback(data);
  } catch (error) {
    // Unexpected error fetching organization settings
    return mergeWithLocalFallback(null);
  }
}

// ─── UPSERT organization settings ──────────────────────────────────────────

export async function upsertOrganizationSettingsClient(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings | null> {
  // Upserting organization settings

  // Try server endpoint first (bypasses RLS) — this is the primary path
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/organization`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      const json = await res.json();
      // Organization settings saved via server
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
    const dbSettings = { ...settings };
    OPTIONAL_NON_DB_FIELDS.forEach(field => {
      if (field in dbSettings) {
        delete dbSettings[field];
      }
    });

    const { data, error } = await supabase
      .from('organization_settings')
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
  // Updating organization name

  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/organization-name`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ organization_id: organizationId, name }),
    });

    if (res.ok) {
      // Organization name updated via server
      return;
    }
    // Server returned non-ok status for org name update, falling back
  } catch (err) {
    // Server endpoint failed for org name update, falling back
  }

  // Fallback: direct Supabase
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', organizationId);

  if (error) {
    // Error updating organization name
    throw error;
  }

  // Organization name updated via direct Supabase
}

// ─── Update user profile ──────────────────────────────────────────────────

export async function updateUserProfileClient(userId: string, updates: { name?: string; avatar_url?: string }): Promise<void> {
  // Updating user profile

  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ user_id: userId, ...updates }),
    });

    if (res.ok) {
      // User profile updated via server
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
      .from('profiles')
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
  // Fetching org user mode

  try {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${SERVER_BASE}/settings/org-mode?organization_id=${encodeURIComponent(organizationId)}`,
      { headers }
    );
    if (res.ok) {
      const json = await res.json();
      // Org mode fetched from server
      return json.orgMode || { user_mode: 'single' };
    }
    // Server returned non-ok status for org-mode GET
  } catch (err) {
    // Server endpoint failed for org-mode GET
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(`org_mode_${organizationId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Org mode loaded from localStorage
      return parsed;
    }
  } catch (_) { /* ignore */ }

  return { user_mode: 'single' };
}

export async function setOrgMode(organizationId: string, userMode: OrgUserMode): Promise<OrgModeSettings> {
  // Setting org user mode

  // Always save to localStorage as backup
  const localData: OrgModeSettings = { user_mode: userMode, organization_id: organizationId, updated_at: new Date().toISOString() };
  try {
    localStorage.setItem(`org_mode_${organizationId}`, JSON.stringify(localData));
  } catch (_) { /* ignore */ }

  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/org-mode`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ organization_id: organizationId, user_mode: userMode }),
    });

    if (res.ok) {
      const json = await res.json();
      // Org mode saved to server
      return json.orgMode;
    }

    const errBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
    // Server returned non-ok status for org-mode PUT

    if (res.status === 403) {
      throw new Error(errBody.error || 'Permission denied');
    }
  } catch (err: any) {
    if (err?.message?.includes('Permission denied') || err?.message?.includes('admin')) {
      throw err;
    }
    // Server endpoint failed for org-mode PUT
  }

  return localData;
}
