import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const supabase = createClient();

const QUOTE_ALLOWED_COLUMNS = new Set([
  'quote_number', 'title', 'contact_id', 'contact_name', 'contact_email',
  'opportunity_id', 'price_tier', 'status', 'valid_until', 'line_items',
  'subtotal', 'discount_percent', 'discount_amount', 'tax_percent',
  'tax_percent_2', 'tax_amount', 'tax_amount_2', 'total', 'notes', 'terms',
  'tracking_status', 'organization_id', 'created_by', 'created_at', 'updated_at'
]);

const QUOTE_FIELD_MAPPINGS: Record<string, string> = {
  quoteNumber: 'quote_number',
  contactId: 'contact_id',
  contactName: 'contact_name',
  contactEmail: 'contact_email',
  opportunityId: 'opportunity_id',
  priceTier: 'price_tier',
  validUntil: 'valid_until',
  lineItems: 'line_items',
  discountPercent: 'discount_percent',
  discountAmount: 'discount_amount',
  taxPercent: 'tax_percent',
  taxPercent2: 'tax_percent_2',
  taxAmount: 'tax_amount',
  taxAmount2: 'tax_amount_2',
  trackingStatus: 'tracking_status',
};

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function sanitizeQuotePayload(data: any) {
  const sanitized: Record<string, any> = {};

  Object.keys(data || {}).forEach(key => {
    if (key === 'owner_id' || key === 'ownerId') {
      return;
    }

    let targetKey = key;
    if (!QUOTE_ALLOWED_COLUMNS.has(targetKey) && QUOTE_FIELD_MAPPINGS[key]) {
      targetKey = QUOTE_FIELD_MAPPINGS[key];
    } else if (!QUOTE_ALLOWED_COLUMNS.has(targetKey)) {
      targetKey = toSnakeCase(key);
    }

    if (!QUOTE_ALLOWED_COLUMNS.has(targetKey)) {
      return;
    }

    if (targetKey === 'line_items' && Array.isArray(data[key])) {
      sanitized[targetKey] = JSON.stringify(data[key]);
      return;
    }

    sanitized[targetKey] = data[key];
  });

  return sanitized;
}

export async function getQuoteTrackingStatusClient() {
  try {
    const headers = await getServerHeaders();
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/quotes/tracking-status`, {
      headers,
    });

    if (!response.ok) {
      // Don't log 404s (function not deployed yet) or 503s (booting) as critical errors
      if (response.status !== 404 && response.status !== 503) {
        // Failed to fetch tracking status
      }
      return { trackingStatus: {} };
    }

    return await response.json();
  } catch (error: any) {
    // Only log actual errors, not "Failed to fetch" network glitches
    if (error?.message !== 'Failed to fetch' && error?.message !== 'Load failed') {
      // Failed to get tracking status
    }
    return { trackingStatus: {} };
  }
}

export async function getAllQuotesClient(scope: 'personal' | 'team' = 'personal') {
  // ── Attempt 1: Server-side endpoint (bypasses RLS) ──
  try {
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/quotes?scope=${scope}`,
      { headers }
    );

    if (response.ok) {
      const data = await response.json();
      // Server endpoint returned quotes
      return { quotes: data.quotes || [] };
    }

    // Server endpoint failed, falling back to direct query
  } catch (err: any) {
    // Server endpoint error, falling back to direct query
  }

  // ── Attempt 2: Direct Supabase query (may be blocked by RLS) ──
  try {
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        // Using session user for quotes (getUser failed)
      } else {
        // Silently return empty during initial load
        return { quotes: [] };
      }
    } else {
      authUser = user;
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      // Failed to get user profile
      return { quotes: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Quotes fallback - applying role-based filtering
    
    let query = supabase
      .from('quotes')
      .select('*');
    
    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own quotes
      if (userRole === 'super_admin') {
        // no filter
      } else {
        // Personal View - Loading only own quotes
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
        query = query.eq('created_by', authUser.id);
      }
    } else {
      // Team scope: role-based filtering
      if (['super_admin', 'admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        // Team View - Loading all quotes for organization
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
      } else {
        // Standard User (team scope) - Loading only own quotes
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
        query = query.eq('created_by', authUser.id);
      }
    }
    
    const { data: quotes, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === '42501') {
        // Quotes table not found or access denied, returning empty array
        return { quotes: [] };
      }
      throw error;
    }
    
    // Quotes filtered data loaded
    
    return { quotes: quotes || [] };
  } catch (error: any) {
    // Error loading quotes
    return { quotes: [] };
  }
}

export async function getQuotesByOpportunityClient(opportunityId: string) {
  // ⚠️ CRITICAL: DO NOT ADD CONTACT ACCESS CHECKS HERE!
  // The contacts table does NOT have the following columns:
  // - account_owner_number (does not exist)
  // - created_by (does not exist)
  // 
  // Access control is already handled by:
  // 1. Opportunity-level filtering (if user can see opportunity, they can see quotes)
  // 2. Organization-level filtering (quotes filtered by organization_id)
  // 
  // This function was broken because it tried to query non-existent contact columns.
  // DO NOT try to "improve" access control by querying the contacts table!
  
  if (!opportunityId) {
    // No opportunity ID provided
    return { quotes: [] };
  }
  
  if (typeof opportunityId !== 'string') {
    // Opportunity ID is not a string
    return { quotes: [] };
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Not authenticated
      throw new Error('Not authenticated');
    }

    // Get user's profile to check their role
    const profile = await ensureUserProfile(user.id);

    const userRole = profile.role;
    const userOrgId = profile.organization_id;
    
    // IMPORTANT: When viewing quotes for a specific opportunity, we need to check
    // if the user has access to the opportunity/contact first, THEN show ALL quotes for that opportunity
    
    // First, get the opportunity to check which contact it belongs to
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, customer_id, organization_id')
      .eq('id', opportunityId)
      .maybeSingle();
    
    if (oppError || !opportunity) {
      // Opportunity not found or access denied
      return { quotes: [] };
    }
    
    if (!opportunity.customer_id) {
      // Opportunity has no customer_id
      return { quotes: [] };
    }
    
    // Simplified access check: if user can see the opportunity (which they can since they navigated here),
    // then they can see all quotes for that contact
    // The opportunity filtering already ensures proper access control
    
    // Get ALL quotes for this contact (quotes are linked to contacts, not opportunities)
    // Filter by the opportunity's organization_id to ensure data isolation
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('contact_id', opportunity.customer_id);
    
    // Filter by organization to ensure data isolation
    if (userRole !== 'super_admin' && opportunity.organization_id) {
      query = query.or(`organization_id.eq.${opportunity.organization_id},organization_id.is.null`);
    } else if (userRole !== 'super_admin' && userOrgId) {
      // Fallback to user's org if opportunity doesn't have an org
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    }
    
    const { data: quotes, error } = await query;
    
    if (error) {
      // Error loading quotes for opportunity
      return { quotes: [] };
    }
    
    return { quotes: quotes || [] };
  } catch (error: any) {
    // Error in getQuotesByOpportunityClient
    return { quotes: [] };
  }
}

export async function createQuoteClient(data: any) {
  // ── Attempt 1: Server-side endpoint (bypasses RLS, authoritative org ID) ──
  try {
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/quotes`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    if (response.ok) {
      const result = await response.json();
      // Quote created via server endpoint
      return { quote: result.quote };
    }

    const errBody = await response.text();
    // Server create failed, falling back to direct insert
  } catch (err: any) {
    // Server create error, falling back to direct insert
  }

  // ── Attempt 2: Direct Supabase insert (fallback) ──
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // FIXED: Always get organization_id from profile (authoritative source),
    // NOT from user.user_metadata which can be stale/mismatched
    let organizationId: string | null = null;

    try {
      const profile = await ensureUserProfile(user.id);
      organizationId = profile.organization_id;
      // Retrieved organization_id from profile
    } catch (profileError) {
      // Failed to fetch profile, falling back to metadata
      organizationId = user.user_metadata?.organizationId || null;
    }
    
    // Generate quote number if not provided
    const generateQuoteNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `QT-${year}${month}-${random}`;
    };
    
    // ✅ Keep opportunity_id if provided - quotes CAN be linked to opportunities
    const quoteData = {
      ...sanitizeQuotePayload(data),
      quote_number: data.quote_number || generateQuoteNumber(),
      organization_id: organizationId,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Creating quote (fallback)
    
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert([quoteData])
      .select()
      .single();
    
    if (error) {
      // Error creating quote
      throw error;
    }
    
    return { quote };
  } catch (error: any) {
    // Error creating quote (outer)
    throw error;
  }
}

export async function updateQuoteClient(id: string, data: any) {
  try {
    const updateData: any = {
      ...sanitizeQuotePayload(data),
      updated_at: new Date().toISOString(),
    };
    
    // Updating quote with sanitized data
    
    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) {
      // Error updating quote
      throw error;
    }

    if (!quote) {
      // Quote not found or permission denied
      throw new Error('Quote not found or permission denied');
    }
    
    return { quote };
  } catch (error: any) {
    // Error updating quote
    throw error;
  }
}

export async function deleteQuoteClient(id: string) {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);
    
    if (error) {
      // Error deleting quote
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    // Error deleting quote
    throw error;
  }
}

// Fix organization IDs for quotes that have NULL organization_id
export async function fixQuoteOrganizationIds() {
  try {
    // Calling server to fix NULL organization IDs
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/recover-deals`,
      { method: 'POST', headers }
    );

    if (response.ok) {
      const result = await response.json();
      // Server recovered
      return { count: result.fixedQuotes || 0, quotes: [] };
    }

    // Server recover failed
    throw new Error('Server recover failed');
  } catch (error: any) {
    // Error fixing quote organization IDs
    throw error;
  }
}