import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';
import { buildServerFunctionUrl } from './server-function-url';

const PG_COLUMNS = [
  'id', 'name', 'description', 'type', 'status', 'start_date', 'end_date', 
  'owner_id', 'organization_id', 'created_at', 'updated_at'
];

function parseMetaSource(source: any) {
  if (!source) return {};

  if (typeof source === 'object') {
    return source;
  }

  if (typeof source === 'string') {
    const text = source.trim();
    if (!text.startsWith('{')) return {};

    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  return {};
}

function mergeMetaObjects(...sources: any[]) {
  const result: Record<string, any> = {};

  for (const source of sources) {
    const parsed = parseMetaSource(source);

    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = mergeMetaObjects(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

function unpackCampaign(c: any) {
  if (!c) return c;
  const meta = mergeMetaObjects(c.description, c.metadata, c.meta, c.metrics, c.stats, c.analytics);

  // Prefer concrete Postgres values, but keep non-zero metadata metrics when
  // top-level fields are null/undefined or stale zeros.
  const merged: Record<string, any> = { ...meta, ...c };

  const toNumberIfNumeric = (value: any): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  for (const [key, metaValue] of Object.entries(meta)) {
    const pgValue = c[key];

    if (pgValue === null || pgValue === undefined) {
      merged[key] = metaValue;
      continue;
    }

    const pgNumeric = toNumberIfNumeric(pgValue);
    const metaNumeric = toNumberIfNumeric(metaValue);

    if (pgNumeric !== null && metaNumeric !== null && pgNumeric === 0 && metaNumeric !== 0) {
      merged[key] = metaValue;
    }
  }

  return merged;
}

function packCampaignData(newData: any, existingData: any = {}) {
  const pgData: any = {};
  const meta: any = mergeMetaObjects(
    existingData.description,
    existingData.metadata,
    existingData.meta,
    existingData.metrics,
    existingData.stats,
    existingData.analytics,
  );
  
  for (const key of Object.keys(newData)) {
    if (PG_COLUMNS.includes(key)) {
      pgData[key] = newData[key];
    } else {
      meta[key] = newData[key];
    }
  }

  if (Object.keys(meta).length > 0) {
    pgData.description = JSON.stringify(meta);
  }
  
  return pgData;
}

export async function getAllCampaignsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated, returning empty campaigns
      return { campaigns: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      return { campaigns: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Applying role-based campaign filtering

    let query = supabase
      .from('campaigns')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all campaigns
    } else if (userRole === 'admin' || userRole === 'marketing') {
      // Admin & Marketing: Can see all campaigns within their organization
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see campaigns within their organization
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'director') {
      // Director: Same as Manager - sees campaigns within their organization
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Can see campaigns within their organization (read-only for most)
      query = query.eq('organization_id', userOrgId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Campaigns filtered data loaded

    const unpackedCampaigns = (data || []).map(unpackCampaign);

    return { campaigns: unpackedCampaigns };
  } catch (error: any) {
    // Error loading campaigns
    return { campaigns: [] };
  }
}

export async function createCampaignClient(campaignData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const profile = await ensureUserProfile(user.id);

    const packedData = packCampaignData(campaignData);

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        ...packedData,
        owner_id: user.id,
        organization_id: profile.organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Campaign created
    return { campaign: unpackCampaign(data) };
  } catch (error: any) {
    // Error creating campaign
    throw error;
  }
}

export async function updateCampaignClient(id: string, campaignData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch existing to preserve description/metadata
    const { data: existing } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (!existing) throw new Error('Campaign not found');

    const packedData = packCampaignData(campaignData, existing);

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...packedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Campaign updated
    return { campaign: unpackCampaign(data) };
  } catch (error: any) {
    // Error updating campaign
    throw error;
  }
}

export async function deleteCampaignClient(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Campaign deleted
    return { success: true };
  } catch (error: any) {
    // Error deleting campaign
    throw error;
  }
}

export async function sendCampaignClient(id: string) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const profile = await ensureUserProfile(session.user.id);
    
    const headers = await getServerHeaders();
    const response = await fetch(buildServerFunctionUrl(`/campaigns/${id}/send`), {
      method: 'POST',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send campaign');
    }

    // Campaign sent
    return result;
  } catch (error: any) {
    // Error sending campaign
    throw error;
  }
}
