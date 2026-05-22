import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { getPriceTierLabel, getActivePriceLevels } from '../lib/global-settings';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

// ── Cached column detection ────────────────────────────────────────────
// Probes the contacts table once per session to discover which columns exist.
// Prevents 42703 errors when referencing columns that haven't been migrated yet.
let _existingColumns: Set<string> | null = null;
let _columnCacheTime = 0;
const COLUMN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Cached owner profile resolution ────────────────────────────────────
// During bulk imports many contacts share the same account_owner_number (email).
// Cache the email→profileId lookup to avoid repeated queries.
const _ownerProfileCache: Map<string, string | null> = new Map();
let _ownerCacheTime = 0;
const OWNER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Resolve account_owner_number (email) to a profile user ID within the org.
 * Returns the owner's profile ID, or null if not found.
 */
async function resolveOwnerByAccountOwnerNumber(
  supabase: any,
  accountOwnerEmail: string,
  organizationId: string,
): Promise<string | null> {
  const normalizedEmail = accountOwnerEmail.trim().toLowerCase();
  if (!normalizedEmail) return null;

  // Bust the cache if it's stale
  if (Date.now() - _ownerCacheTime > OWNER_CACHE_TTL) {
    _ownerProfileCache.clear();
    _ownerCacheTime = Date.now();
  }

  const cacheKey = `${organizationId}::${normalizedEmail}`;
  if (_ownerProfileCache.has(cacheKey)) {
    return _ownerProfileCache.get(cacheKey) ?? null;
  }

  // Look up the profile by email in the same organization
  const { data: matchedProfile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    _ownerProfileCache.set(cacheKey, null);
    return null;
  }

  const resolvedId = matchedProfile?.id ?? null;
  _ownerProfileCache.set(cacheKey, resolvedId);

  return resolvedId;
}

/** Clear the owner cache (called externally if needed, e.g. after bulk import) */
export function clearOwnerProfileCache() {
  _ownerProfileCache.clear();
  _ownerCacheTime = 0;
}

async function getExistingContactColumns(supabase: any): Promise<Set<string>> {
  if (_existingColumns && Date.now() - _columnCacheTime < COLUMN_CACHE_TTL) {
    return _existingColumns;
  }

  const baseColumns = [
    'id', 'name', 'email', 'phone', 'company', 'status',
    'owner_id', 'organization_id', 'created_at', 'updated_at',
  ];

  // Fast path: if rows already exist, read one to discover all columns
  const { data: sample } = await supabase
    .from('contacts')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    _existingColumns = new Set(Object.keys(sample[0]));
    _columnCacheTime = Date.now();
    return _existingColumns;
  }

  // No rows yet — probe groups of advanced columns with .limit(0)
  _existingColumns = new Set(baseColumns);

  const advancedGroups: string[][] = [
    ['legacy_number', 'account_owner_number'],
    ['address', 'notes'],
    ['trade'],
    ['tags'],
    ['price_level'],
    ['ptd_sales', 'ptd_gp_percent', 'ytd_sales', 'ytd_gp_percent', 'lyr_sales', 'lyr_gp_percent'],
    ['city', 'province', 'postal_code'],
    ['created_by'],
  ];

  for (const group of advancedGroups) {
    const { error } = await supabase
      .from('contacts')
      .select(group.join(', '))
      .limit(0);
    if (!error) {
      group.forEach((col) => _existingColumns!.add(col));
    }
  }

  _columnCacheTime = Date.now();
  return _existingColumns;
}

/** Remove any keys from `data` that are not actual DB columns */
function filterToExistingColumns(data: any, existingCols: Set<string>): any {
  const cleaned: any = {};
  for (const key of Object.keys(data)) {
    if (existingCols.has(key)) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

// Helper function to transform between camelCase and snake_case
function transformToDbFormat(contactData: any) {
  const transformed: any = { ...contactData };
  
  // Transform standard fields from camelCase to snake_case
  if ('ownerId' in transformed) {
    transformed.owner_id = transformed.ownerId;
    delete transformed.ownerId;
  }
  if ('createdAt' in transformed) {
    transformed.created_at = transformed.createdAt;
    delete transformed.createdAt;
  }
  if ('updatedAt' in transformed) {
    transformed.updated_at = transformed.updatedAt;
    delete transformed.updatedAt;
  }
  // Transform priceLevel from camelCase to snake_case for database
  if ('priceLevel' in transformed) {
    const pl = transformed.priceLevel;
    if (pl === undefined || pl === null || pl === '') {
      transformed.price_level = pl === '' ? null : pl;
    } else {
      transformed.price_level = pl;
    }
    delete transformed.priceLevel;
  }
  if ('createdBy' in transformed) {
    transformed.created_by = transformed.createdBy;
    delete transformed.createdBy;
  }
  
  // Transform new fields from camelCase to snake_case
  // Only include if they have actual values (not empty strings or undefined)
  if ('legacyNumber' in transformed) {
    if (transformed.legacyNumber !== undefined && transformed.legacyNumber !== null) {
      transformed.legacy_number = transformed.legacyNumber;
    }
    delete transformed.legacyNumber;
  }
  if ('accountOwnerNumber' in transformed) {
    if (transformed.accountOwnerNumber !== undefined && transformed.accountOwnerNumber !== null) {
      transformed.account_owner_number = transformed.accountOwnerNumber;
    }
    delete transformed.accountOwnerNumber;
  }
  if ('tags' in transformed) {
    // Tags field for segmentation
    transformed.tags = transformed.tags;
  }
  
  // Transform sales/GP fields
  if ('ptdSales' in transformed) {
    if (transformed.ptdSales !== undefined && transformed.ptdSales !== '') {
      transformed.ptd_sales = transformed.ptdSales;
    }
    delete transformed.ptdSales;
  }
  if ('ptdGpPercent' in transformed) {
    if (transformed.ptdGpPercent !== undefined && transformed.ptdGpPercent !== '') {
      transformed.ptd_gp_percent = transformed.ptdGpPercent;
    }
    delete transformed.ptdGpPercent;
  }
  if ('ytdSales' in transformed) {
    if (transformed.ytdSales !== undefined && transformed.ytdSales !== '') {
      transformed.ytd_sales = transformed.ytdSales;
    }
    delete transformed.ytdSales;
  }
  if ('ytdGpPercent' in transformed) {
    if (transformed.ytdGpPercent !== undefined && transformed.ytdGpPercent !== '') {
      transformed.ytd_gp_percent = transformed.ytdGpPercent;
    }
    delete transformed.ytdGpPercent;
  }
  if ('lyrSales' in transformed) {
    if (transformed.lyrSales !== undefined && transformed.lyrSales !== '') {
      transformed.lyr_sales = transformed.lyrSales;
    }
    delete transformed.lyrSales;
  }
  if ('lyrGpPercent' in transformed) {
    if (transformed.lyrGpPercent !== undefined && transformed.lyrGpPercent !== '') {
      transformed.lyr_gp_percent = transformed.lyrGpPercent;
    }
    delete transformed.lyrGpPercent;
  }
  
  // Transform location fields
  // city and province are already snake_case — no rename needed
  if ('postalCode' in transformed) {
    if (transformed.postalCode) {
      transformed.postal_code = transformed.postalCode;
    }
    delete transformed.postalCode;
  }

  // Note: address and notes are already in snake_case in the database
  // so no transformation needed for these fields
  
  return transformed;
}

// Helper function to transform snake_case from database to camelCase
function transformFromDbFormat(contactData: any) {
  if (!contactData) return contactData;
  
  const transformed: any = { ...contactData };
  
  // Transform standard fields from snake_case to camelCase
  if ('created_at' in transformed) {
    transformed.createdAt = transformed.created_at;
    delete transformed.created_at;
  }
  if ('updated_at' in transformed) {
    transformed.updatedAt = transformed.updated_at;
    delete transformed.updated_at;
  }
  if ('owner_id' in transformed) {
    transformed.ownerId = transformed.owner_id;
    delete transformed.owner_id;
  }
  
  if ('status' in transformed) {
    const s = transformed.status;
    if (typeof s === 'string') {
      const lower = s.toLowerCase();
      if (lower === 'active') transformed.status = 'Active';
      else if (lower === 'prospect') transformed.status = 'Prospect';
      else if (lower === 'inactive') transformed.status = 'Inactive';
    }
  }

  // Handle price_level with migration logic BEFORE deleting it
  if ('price_level' in transformed) {
    let oldValue = transformed.price_level;
    
    // Guard: unwrap double-serialized JSON strings (e.g., '"VIP A"' → 'VIP A')
    if (typeof oldValue === 'string' && oldValue.startsWith('"') && oldValue.endsWith('"')) {
      try { oldValue = JSON.parse(oldValue); } catch { /* use as-is */ }
    }
    // Guard: if it's an object (e.g., {value: "VIP A"}), extract the value
    if (oldValue && typeof oldValue === 'object' && 'value' in oldValue) {
      oldValue = oldValue.value;
    }
    
    // Normalize string for looser matching (e.g. handle em-dash vs en-dash)
    const activeLabels = getActivePriceLevels();
    let matched = false;
    
    if (typeof oldValue === 'string') {
      const normalizedOld = oldValue.replace(/[-\u2013\u2014]/g, '').replace(/\s+/g, '').toLowerCase();
      const matchedLabel = activeLabels.find(l => l.replace(/[-\u2013\u2014]/g, '').replace(/\s+/g, '').toLowerCase() === normalizedOld);
      
      if (matchedLabel) {
        transformed.priceLevel = matchedLabel;
        matched = true;
      }
    }
    
    if (!matched) {
      if (activeLabels.includes(oldValue)) {
        transformed.priceLevel = oldValue;
      }
      // Handle legacy names from old system
      else if (['Wholesale', 'Contractor', 'Premium', 'Standard', 'VIP', 'VIP A', 'VIP B'].includes(oldValue)) {
        const legacyMapping: Record<string, string> = {
          'VIP': getPriceTierLabel(2),
          'VIP A': 'VIPA',
          'VIP B': 'VIPB',
          'Wholesale': getPriceTierLabel(3),
          'Contractor': getPriceTierLabel(4),
          'Premium': getPriceTierLabel(4),
          'Standard': getPriceTierLabel(4),
        };
        transformed.priceLevel = legacyMapping[oldValue] || getPriceTierLabel(1);
      }
      // If it's an old tier format (tier1, tier2, etc.), convert it
      else if (typeof oldValue === 'string' && oldValue.startsWith('tier')) {
        const tierNumber = parseInt(oldValue.replace('tier', ''));
        transformed.priceLevel = getPriceTierLabel(tierNumber) || getPriceTierLabel(1);
      }
      // If it's a number, convert it
      else if (typeof oldValue === 'number') {
        transformed.priceLevel = getPriceTierLabel(oldValue) || getPriceTierLabel(1);
      }
      // If it's a non-empty string that didn't match anything, preserve it as-is
      else if (typeof oldValue === 'string' && oldValue.trim() !== '') {
        transformed.priceLevel = oldValue;
      }
      // Default fallback
      else {
        transformed.priceLevel = getPriceTierLabel(1);
      }
    }
    delete transformed.price_level;
  } else {
    // If no price_level field at all, default to tier 1 label
    transformed.priceLevel = getPriceTierLabel(1);
  }
  
  if ('created_by' in transformed) {
    transformed.createdBy = transformed.created_by;
    delete transformed.created_by;
  }
  if ('organization_id' in transformed) {
    transformed.organizationId = transformed.organization_id;
    delete transformed.organization_id;
  }
  
  // Transform new fields from snake_case to camelCase
  if ('legacy_number' in transformed) {
    transformed.legacyNumber = transformed.legacy_number;
    delete transformed.legacy_number;
  }
  if ('account_owner_number' in transformed) {
    transformed.accountOwnerNumber = transformed.account_owner_number;
    delete transformed.account_owner_number;
  }
  
  // Transform sales/GP fields
  if ('ptd_sales' in transformed) {
    transformed.ptdSales = transformed.ptd_sales;
    delete transformed.ptd_sales;
  }
  if ('ptd_gp_percent' in transformed) {
    transformed.ptdGpPercent = transformed.ptd_gp_percent;
    delete transformed.ptd_gp_percent;
  }
  if ('ytd_sales' in transformed) {
    transformed.ytdSales = transformed.ytd_sales;
    delete transformed.ytd_sales;
  }
  if ('ytd_gp_percent' in transformed) {
    transformed.ytdGpPercent = transformed.ytd_gp_percent;
    delete transformed.ytd_gp_percent;
  }
  if ('lyr_sales' in transformed) {
    transformed.lyrSales = transformed.lyr_sales;
    delete transformed.lyr_sales;
  }
  if ('lyr_gp_percent' in transformed) {
    transformed.lyrGpPercent = transformed.lyr_gp_percent;
    delete transformed.lyr_gp_percent;
  }

  // Transform location fields
  if ('postal_code' in transformed) {
    transformed.postalCode = transformed.postal_code;
    delete transformed.postal_code;
  }
  // city and province are already the same in both formats
  
  return transformed;
}

export async function getAllContactsClient(filterByAccountOwner?: string, scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    
    const headers = await getServerHeaders();

    // Skip server call if no user token — it will 401 anyway
    if (!headers['X-User-Token']) {
      return await getAllContactsClientDirect(scope);
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts?scope=${scope}`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      
      // On 401, try refreshing the session and retry once before falling back
      if (response.status === 401) {
        // Got 401 unauthorized, attempting session refresh
        try {
          const { createClient: createSupabaseClient } = await import('./supabase/client');
          const sb = createSupabaseClient();
          const { data: { session: refreshed }, error: refreshError } = await sb.auth.refreshSession();
          if (!refreshError && refreshed?.access_token) {
            // Session refreshed, retrying request
            const retryHeaders = await getServerHeaders();
            const retryResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts?scope=${scope}`,
              { method: 'GET', headers: retryHeaders, cache: 'no-store' }
            );
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              // Retry succeeded
              const transformedData = (retryResult.contacts || []).map(transformFromDbFormat);
              return { contacts: transformedData };
            }
            // Retry failed
          } else {
            // Session refresh failed, falling back to direct query
          }
        } catch (retryErr: any) {
          // Refresh exception, falling back to direct query
        }
        
        // Fallback to direct Supabase query (this is expected for 401s)
        // Using direct Supabase query as fallback
        return await getAllContactsClientDirect(scope);
      }
      
      // For non-401 errors, fall back
      // Server error encountered, falling back to direct query
      return await getAllContactsClientDirect(scope);
    }

    const result = await response.json();
    
    // Transform from DB snake_case to app camelCase
    const transformedData = (result.contacts || []).map(transformFromDbFormat);
    
    return { contacts: transformedData };
  } catch (error: any) {
    // Error fetching via server, falling back to direct query
    return await getAllContactsClientDirect(scope);
  }
}

/**
 * Direct Supabase query fallback (subject to RLS).
 * Used only when the server endpoint is unavailable.
 */
async function getAllContactsClientDirect(scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    
    // First, get the current user and their profile (includes role)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { contacts: [] };
    }

    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      return { contacts: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;
    const userEmail = profile.email;

    // Direct query with role-based filtering

    const existingCols = await getExistingContactColumns(supabase);
    const hasAccountOwnerCol = existingCols.has('account_owner_number');

    let query = supabase
      .from('contacts')
      .select('*');

    // Scope-based filtering (matches server-side logic)
    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own contacts
      if (userRole === 'super_admin') {
        // no filter
      } else {
        if (hasAccountOwnerCol && userEmail) {
          query = query.eq('organization_id', userOrgId)
            .or(`owner_id.eq.${user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
        }
      }
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        // no filter
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        query = query.eq('organization_id', userOrgId);
      } else {
        if (hasAccountOwnerCol && userEmail) {
          query = query.eq('organization_id', userOrgId)
            .or(`owner_id.eq.${user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
        }
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Query error
      if (error.code === '42703' && hasAccountOwnerCol) {
        _existingColumns = null;
        const retryQuery = supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', userOrgId)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        
        const { data: retryData, error: retryError } = await retryQuery;
        if (retryError) throw retryError;
        return { contacts: (retryData || []).map(transformFromDbFormat) };
      }
      throw error;
    }

    const transformedData = (data || []).map(transformFromDbFormat);
    return { contacts: transformedData };
  } catch (error: any) {
    // Error in getAllContactsClientDirect
    return { contacts: [] };
  }
}

export async function createContactClient(contactData: any) {
  try {
    const supabase = createClient();
    
    // Transform data before sending to database
    const dbData = transformToDbFormat(contactData);

    // Try server endpoint first (bypasses RLS, uses profile org_id)
    try {
      const headers = await getServerHeaders();
      // Creating contact via server endpoint
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(dbData),
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        // Server create successful
        const transformedContact = transformFromDbFormat(result.contact);
        return { contact: transformedContact };
      } else {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        // Server create error
        // Fall through to direct Supabase insert
      }
    } catch (serverError: any) {
      // Server create failed, falling back to direct
    }

    // Fallback: direct Supabase insert (subject to RLS)
    // Falling back to direct Supabase insert

    // Get current user's profile for correct organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Use profile's organization_id (authoritative), NOT user_metadata (stale JWT)
      try {
        const profile = await ensureUserProfile(user.id);
        dbData.organization_id = profile.organization_id;
      } catch (profileError) {
        // Last-resort fallback to JWT metadata
        // Could not get profile, falling back to JWT metadata
        dbData.organization_id = user.user_metadata?.organizationId;
      }
      dbData.owner_id = user.id;
    }

    // Filter to only columns that exist in the database
    const existingCols = await getExistingContactColumns(supabase);
    const filteredData = filterToExistingColumns(dbData, existingCols);

    const { data, error } = await supabase
      .from('contacts')
      .insert([filteredData])
      .select()
      .single();

    if (error) throw error;

    // Transform back to application format and wrap in { contact: ... }
    return { contact: transformFromDbFormat(data) };
  } catch (error: any) {
    // Error creating contact
    throw error;
  }
}

export async function upsertContactByLegacyNumberClient(contactData: any, preloadedAuth?: { userId: string; profile: any }) {
  try {
    const supabase = createClient();
    
    let userId: string;
    let profile: any;
    
    if (preloadedAuth) {
      // Use pre-fetched auth data (bulk import optimization)
      userId = preloadedAuth.userId;
      profile = preloadedAuth.profile;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
      profile = await ensureUserProfile(user.id);
    }

    // Detect which columns actually exist in the contacts table (cached)
    const existingCols = await getExistingContactColumns(supabase);

    // Transform data from camelCase to snake_case
    const transformedData = transformToDbFormat(contactData);

    // ── Capture financial + location + price data BEFORE filtering strips it ────
    const financialExtras: Record<string, any> = {};
    const finFields = ['ptd_sales', 'ptd_gp_percent', 'ytd_sales', 'ytd_gp_percent', 'lyr_sales', 'lyr_gp_percent'];
    for (const f of finFields) {
      if (transformedData[f] !== undefined && transformedData[f] !== null && transformedData[f] !== '') {
        financialExtras[f] = Number(transformedData[f]);
      }
    }
    // Location fields — stored as strings, not numbers
    const locationFields = ['city', 'province', 'postal_code', 'price_level', 'legacy_number', 'company', 'status', 'trade'];
    for (const f of locationFields) {
      if (transformedData[f] !== undefined && transformedData[f] !== null) {
        financialExtras[f] = String(transformedData[f]).trim();
      }
    }
    const hasFinancialExtras = Object.keys(financialExtras).length > 0;
    if (hasFinancialExtras) {
      // Captured extras before filtering
    }

    // ── Helper: persist financial extras to KV directly ────────
    // Called after each DB write to ensure financial data survives
    // even when DB columns don't exist (filterToExistingColumns strips them).
    const persistFinancialExtras = async (contactId: string) => {
      if (!hasFinancialExtras || !contactId) return;
      try {
        // Fetch existing overlay to merge
        const { data: existingData } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', `contact_extras:${contactId}`)
          .maybeSingle();
          
        const existing = existingData?.value && typeof existingData.value === 'object' 
          ? existingData.value 
          : {};
          
        const merged = { ...existing, ...financialExtras };

        const { error: kvError } = await supabase
          .from('kv_store_8405be07')
          .upsert({ key: `contact_extras:${contactId}`, value: merged });

        if (kvError) {
          // Failed to persist financial extras to KV (non-fatal)
        } else {
          // Financial extras persisted to KV
        }
      } catch (e: any) {
        // Financial extras persistence error (non-fatal)
      }
    };

    // ── Resolve owner from account_owner_number ─────────────────────────
    // If the CSV provides an account_owner_number (email), look up the
    // matching profile in the same org and use that user as the owner.
    let resolvedOwnerId: string = userId; // default to importing user
    const accountOwnerEmail = contactData.accountOwnerNumber
      ? String(contactData.accountOwnerNumber).trim()
      : '';

    if (accountOwnerEmail && existingCols.has('account_owner_number')) {
      const ownerProfileId = await resolveOwnerByAccountOwnerNumber(
        supabase,
        accountOwnerEmail,
        profile.organization_id,
      );
      if (ownerProfileId) {
        resolvedOwnerId = ownerProfileId;
      } else {
        // account_owner_number not found in profiles — using importer as owner
      }
    }
    
    // Helper: build an update payload that also reassigns owner_id when
    // the CSV provides account_owner_number
    const buildUpdatePayload = () => {
      const base: any = {
        ...transformedData,
        updated_at: new Date().toISOString(),
      };
      // Always set owner_id to the resolved owner on update so re-imports
      // correctly reassign contacts whose account_owner_number changed
      if (accountOwnerEmail) {
        base.owner_id = resolvedOwnerId;
      }
      return filterToExistingColumns(base, existingCols);
    };

    // Only attempt legacy number lookup if the column exists AND legacyNumber is provided
    const hasLegacyNumber = existingCols.has('legacy_number')
      && contactData.legacyNumber
      && String(contactData.legacyNumber).trim() !== '';
    
    if (hasLegacyNumber) {
      // Query to find existing contact by legacy_number
      const { data: existingContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('legacy_number', contactData.legacyNumber)
        .limit(1);

      if (fetchError) {
        // Error looking up contact by legacy number
        throw fetchError;
      }

      const existingContact = existingContacts && existingContacts.length > 0 ? existingContacts[0] : null;

      if (existingContact) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingContact.id)
          .select()
          .single();

        if (error) throw error;

        // Contact updated (by legacy number)
        await persistFinancialExtras(data.id);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }
    
    // Also check by email if no legacy number match was found and email is provided
    const contactEmail = contactData.email && String(contactData.email).trim() !== '' ? String(contactData.email).trim() : null;
    
    if (contactEmail) {
      const { data: existingByEmail, error: emailFetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('email', contactEmail)
        .limit(1);
      
      if (!emailFetchError && existingByEmail && existingByEmail.length > 0) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingByEmail[0].id)
          .select()
          .single();

        if (error) throw error;

        // Contact updated (by email)
        await persistFinancialExtras(data.id);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }

    // Try matching by account_owner_number + name (same owner, same contact name)
    const hasAccountOwnerCol = existingCols.has('account_owner_number');
    const contactName = contactData.name ? String(contactData.name).trim() : '';

    if (hasAccountOwnerCol && accountOwnerEmail && contactName) {
      const { data: existingByOwnerName, error: ownerNameError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .ilike('account_owner_number', accountOwnerEmail)
        .eq('name', contactName)
        .limit(1);

      if (!ownerNameError && existingByOwnerName && existingByOwnerName.length > 0) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingByOwnerName[0].id)
          .select()
          .single();

        if (error) throw error;

        // Contact updated (by account_owner_number + name)
        await persistFinancialExtras(data.id);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }
    
    // Also try matching by name + company as a last resort for dedup
    const contactCompany = contactData.company ? String(contactData.company).trim() : '';
    
    if (contactName && contactCompany) {
      const { data: existingByName, error: nameFetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('name', contactName)
        .eq('company', contactCompany)
        .limit(1);
      
      if (!nameFetchError && existingByName && existingByName.length > 0) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingByName[0].id)
          .select()
          .single();

        if (error) throw error;

        // Contact updated (by name+company)
        await persistFinancialExtras(data.id);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }
    
    // Insert new contact — use resolvedOwnerId from account_owner_number lookup
    const insertData = filterToExistingColumns({
      ...transformedData,
      owner_id: resolvedOwnerId,
      organization_id: profile.organization_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, existingCols);
    
    if (!insertData.status) {
      insertData.status = 'Prospect';
    }
    
    if (!insertData.email || String(insertData.email).trim() === '') {
      const nameSlug = (contactData.name || 'contact').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30);
      insertData.email = `${nameSlug}-${Date.now()}@import.placeholder`;
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    // Contact created (via import)
    
    // Default price_level for new contacts if not provided
    if (!financialExtras.price_level) {
      financialExtras.price_level = getPriceTierLabel(1);
    }
    
    // Re-evaluate hasFinancialExtras since we might have added price_level
    const shouldPersistExtras = Object.keys(financialExtras).length > 0;
    
    if (shouldPersistExtras) {
      await persistFinancialExtras(data.id);
    }
    
    return { contact: transformFromDbFormat(data), action: 'created' as const };
  } catch (error: any) {
    // Error upserting contact
    throw error;
  }
}

export async function updateContactClient(id: string, contactData: any) {
  try {
    const headers = await getServerHeaders();
    const dbData = transformToDbFormat(contactData);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts/${id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(dbData),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      // Update error
      throw new Error(errorBody.error || `Failed to update contact (${response.status})`);
    }

    const result = await response.json();
    return { contact: transformFromDbFormat(result.contact) };
  } catch (error: any) {
    // Error updating contact
    throw error;
  }
}

export async function deleteContactClient(id: string) {
  try {
    const headers = await getServerHeaders();

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts/${id}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      // Delete error
      throw new Error(errorBody.error || `Failed to delete contact (${response.status})`);
    }

    return { success: true };
  } catch (error: any) {
    // Error deleting contact
    throw error;
  }
}

export async function claimUnassignedContactsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const profile = await ensureUserProfile(user.id);
    const userOrgId = profile.organization_id;

    // Find contacts in this org with no owner_id and claim them for the current user
    const { data, error } = await supabase
      .from('contacts')
      .update({ owner_id: user.id, updated_at: new Date().toISOString() })
      .eq('organization_id', userOrgId)
      .is('owner_id', null)
      .select();

    if (error) throw error;

    // Claimed unassigned contacts
    return { claimed: (data || []).map(transformFromDbFormat) };
  } catch (error: any) {
    // Error claiming unassigned contacts
    throw error;
  }
}

export async function getSegmentsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const profile = await ensureUserProfile(user.id);
    const userOrgId = profile.organization_id;

    // Fetch all distinct tags/segments from contacts in the user's org
    const existingCols = await getExistingContactColumns(supabase);
    const hasTags = existingCols.has('tags');

    if (!hasTags) {
      return { segments: [] };
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('tags')
      .eq('organization_id', userOrgId)
      .not('tags', 'is', null);

    if (error) throw error;

    // Collect all unique tags across contacts
    const tagSet = new Set<string>();
    for (const row of data || []) {
      if (Array.isArray(row.tags)) {
        row.tags.forEach((t: string) => tagSet.add(t));
      } else if (typeof row.tags === 'string' && row.tags.trim()) {
        row.tags.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagSet.add(t));
      }
    }

    return { segments: [...tagSet].sort() };
  } catch (error: any) {
    // Error fetching segments
    throw error;
  }
}