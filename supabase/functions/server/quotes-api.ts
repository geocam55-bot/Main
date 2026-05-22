import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';

const QUOTE_ALLOWED_COLUMNS = new Set([
  'quote_number', 'title', 'contact_id', 'contact_name', 'contact_email',
  'opportunity_id', 'price_tier', 'status', 'valid_until', 'line_items',
  'subtotal', 'discount_percent', 'discount_amount', 'tax_percent',
  'tax_percent_2', 'tax_amount', 'tax_amount_2', 'total', 'notes', 'terms',
  'tracking_status', 'organization_id', 'created_by', 'created_at', 'updated_at',
]);

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function sanitizeQuotePayload(data: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  const fieldMappings: Record<string, string> = {
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

  for (const [key, value] of Object.entries(data || {})) {
    if (key === 'owner_id' || key === 'ownerId') {
      continue;
    }

    let targetKey = key;
    if (!QUOTE_ALLOWED_COLUMNS.has(targetKey) && fieldMappings[key]) {
      targetKey = fieldMappings[key];
    } else if (!QUOTE_ALLOWED_COLUMNS.has(targetKey)) {
      targetKey = toSnakeCase(key);
    }

    if (!QUOTE_ALLOWED_COLUMNS.has(targetKey)) {
      continue;
    }

    sanitized[targetKey] = targetKey === 'line_items' && Array.isArray(value)
      ? JSON.stringify(value)
      : value;
  }

  return sanitized;
}

/**
 * Server-side Quotes API — bypasses RLS using the service role key.
 * Applies role-based filtering in code (same pattern as contacts-api.ts).
 */
export function quotesAPI(app: Hono) {

  // ── GET /quotes — list all quotes visible to the authenticated user ──
  app.get('/make-server-8405be07/quotes', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing auth token in quotes API (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in quotes API: ' + (authError?.message || 'No user') }, 401);
      }

      // Get the user's profile for role and organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return c.json({ error: 'Profile not found for user ' + user.id }, 404);
      }

      const userRole = profile.role || 'standard_user';
      const userOrgId = profile.organization_id;

      console.log(`[quotes-api] GET /quotes — user=${profile.email}, role=${userRole}, org=${userOrgId}`);

      // Check for scope parameter: 'personal' = only user's own data, 'team' = role-based org data
      const scope = c.req.query('scope') || 'personal';

      // Build the query with role-based filtering
      let query = supabase
        .from('quotes')
        .select('*');

      if (scope === 'personal') {
        // Personal scope: ALL roles see only their own quotes
        if (userRole === 'super_admin') {
          // super_admin still sees everything
        } else {
          if (userOrgId) {
            query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
          }
          query = query.eq('created_by', user.id);
        }
      } else {
        // Team scope: role-based filtering
        if (userRole === 'super_admin') {
          // super_admin sees everything — no filter
        } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
          // Elevated roles see all quotes in their organization
          if (userOrgId) {
            query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
          }
        } else {
          // standard_user / restricted — see only their own quotes
          if (userOrgId) {
            query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
          }
          query = query.eq('created_by', user.id);
        }
      }

      const { data: quotes, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        console.error('[quotes-api] Query error:', queryError);
        return c.json({ error: 'Quotes query failed: ' + queryError.message }, 500);
      }

      console.log(`[quotes-api] Returning ${quotes?.length || 0} quotes for role=${userRole}`);

      return c.json({
        quotes: quotes || [],
        meta: { count: quotes?.length || 0, role: userRole },
      });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in GET /quotes:', err);
      return c.json({ error: 'Internal server error in quotes API: ' + err.message }, 500);
    }
  });

  // ── GET /bids — list all bids visible to the authenticated user ──
  app.get('/make-server-8405be07/bids', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing auth token in bids API (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in bids API: ' + (authError?.message || 'No user') }, 401);
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return c.json({ error: 'Profile not found for user ' + user.id }, 404);
      }

      const userRole = profile.role || 'standard_user';
      const userOrgId = profile.organization_id;

      console.log(`[quotes-api] GET /bids — user=${profile.email}, role=${userRole}, org=${userOrgId}`);

      // Check for scope parameter
      const bidScope = c.req.query('scope') || 'personal';

      let query = supabase
        .from('bids')
        .select('*');

      if (bidScope === 'personal') {
        // Personal scope: ALL roles see only their own bids
        if (userRole === 'super_admin') {
          // no filter
        } else {
          if (userOrgId) {
            query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
          }
          query = query.eq('created_by', user.id);
        }
      } else {
        // Team scope: role-based filtering
        if (userRole === 'super_admin') {
          // no filter
        } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
          if (userOrgId) {
            query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
          }
        } else {
          if (userOrgId) {
            query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
          }
          query = query.eq('created_by', user.id);
        }
      }

      const { data: bids, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        console.error('[quotes-api] Bids query error:', queryError);
        return c.json({ error: 'Bids query failed: ' + queryError.message }, 500);
      }

      console.log(`[quotes-api] Returning ${bids?.length || 0} bids for role=${userRole}`);

      return c.json({
        bids: bids || [],
        meta: { count: bids?.length || 0, role: userRole },
      });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in GET /bids:', err);
      return c.json({ error: 'Internal server error in bids API: ' + err.message }, 500);
    }
  });

  // ── POST /quotes — create a new quote (bypasses RLS) ──
  app.post('/make-server-8405be07/quotes', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing auth token for quote creation (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      // Get the user's profile (authoritative source for organization_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, email')
        .eq('id', user.id)
        .single();

      const organizationId = profile?.organization_id || user.user_metadata?.organizationId || null;
      const body = await c.req.json();

      const quoteData = {
        ...sanitizeQuotePayload(body),
        organization_id: organizationId,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`[quotes-api] POST /quotes — user=${profile?.email}, org=${organizationId}`);

      const { data: quote, error } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select()
        .single();

      if (error) {
        console.error('[quotes-api] Insert error:', error);
        return c.json({ error: 'Failed to create quote: ' + error.message }, 500);
      }

      console.log(`[quotes-api] Quote created: ${quote.id}`);
      return c.json({ quote });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in POST /quotes:', err);
      return c.json({ error: 'Internal server error: ' + err.message }, 500);
    }
  });

  // ── POST /bids — create a new bid (bypasses RLS) ──
  app.post('/make-server-8405be07/bids', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing auth token for bid creation (send X-User-Token header)' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, email')
        .eq('id', user.id)
        .single();

      const organizationId = profile?.organization_id || user.user_metadata?.organizationId || null;
      const body = await c.req.json();

      // Map camelCase fields from frontend to snake_case for the database.
      // Destructure known camelCase fields so they don't leak into ...rest.
      // NOTE: The bids table does NOT have contact_id, contact_name, or contact_email columns.
      // Contact reference is stored via opportunity_id. Strip these fields entirely.
      const {
        contactId,
        contact_id: _contactIdSnake,
        contactName,
        contact_name: _contactNameSnake,
        contactEmail,
        contact_email: _contactEmailSnake,
        opportunityId,
        validUntil,
        projectManagerId,
        clientName,
        projectName,
        items,
        line_items: _lineItemsSnake, // Strip — column does NOT exist on bids table
        tax,          // Map 'tax' → 'tax_amount' (sent by ScheduledJobs / ImportExport)
        taxPercent,   // camelCase variants
        taxPercent2,
        taxAmount,
        taxAmount2,
        discountPercent,  // Strip — column does NOT exist on bids table
        discountAmount,   // Strip — column does NOT exist on bids table
        submittedDate,
        ...rest
      } = body;

      // Allowlist of columns that actually exist on the bids table.
      // Any field NOT in this list will be silently dropped to prevent PGRST204 errors.
      // NOTE: line_items, discount_percent, and discount_amount do NOT exist on the bids table.
      const ALLOWED_BID_COLUMNS = new Set([
        'title', 'amount', 'status', 'valid_until', 'notes', 'terms', 'description',
        'opportunity_id', 'project_manager_id', 'client_name', 'project_name',
        'subtotal', 'tax_rate', 'tax_percent', 'tax_percent_2',
        'tax_amount', 'tax_amount_2', 'total',
        'submitted_date', 'organization_id', 'created_by', 'created_at', 'updated_at',
      ]);

      // Start with only allowed fields from ...rest (already snake_case fields from caller)
      const bidData: Record<string, any> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (ALLOWED_BID_COLUMNS.has(key)) {
          bidData[key] = value;
        } else {
          console.log(`[quotes-api] POST /bids — Dropping unknown field: ${key}`);
        }
      }

      // Always set these
      bidData.organization_id = organizationId;
      bidData.created_by = user.id;
      bidData.created_at = new Date().toISOString();
      bidData.updated_at = new Date().toISOString();

      // Map camelCase → snake_case (only include if provided)
      if (validUntil !== undefined) bidData.valid_until = validUntil;
      if (projectManagerId !== undefined) bidData.project_manager_id = projectManagerId;
      if (clientName !== undefined) bidData.client_name = clientName;
      if (projectName !== undefined) bidData.project_name = projectName;
      if (taxPercent !== undefined) bidData.tax_percent = taxPercent;
      if (taxPercent2 !== undefined) bidData.tax_percent_2 = taxPercent2;
      if (taxAmount !== undefined) bidData.tax_amount = taxAmount;
      if (taxAmount2 !== undefined) bidData.tax_amount_2 = taxAmount2;
      if (submittedDate !== undefined) bidData.submitted_date = submittedDate;
      // NOTE: discountPercent, discountAmount, line_items, and items are intentionally NOT mapped —
      // these columns do not exist on the bids table.

      // Map 'tax' → 'tax_amount' (ScheduledJobs / ImportExport send 'tax' instead of 'tax_amount')
      if (tax !== undefined && bidData.tax_amount === undefined) bidData.tax_amount = tax;

      // The bids table uses opportunity_id for the customer/contact reference.
      // If caller sent opportunityId, use it. Otherwise fall back to contactId.
      const effectiveOpportunityId = opportunityId || contactId || _contactIdSnake;
      if (effectiveOpportunityId !== undefined) bidData.opportunity_id = effectiveOpportunityId;

      // NOTE: line_items / items are NOT inserted into bids table — that column does not exist.
      // Line items are only stored on the quotes table.

      console.log(`[quotes-api] POST /bids — user=${profile?.email}, org=${organizationId}`);

      const { data: bid, error } = await supabase
        .from('bids')
        .insert([bidData])
        .select()
        .single();

      if (error) {
        console.error('[quotes-api] Bid insert error:', error);
        return c.json({ error: 'Failed to create bid: ' + error.message }, 500);
      }

      console.log(`[quotes-api] Bid created: ${bid.id}`);
      return c.json({ bid });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in POST /bids:', err);
      return c.json({ error: 'Internal server error: ' + err.message }, 500);
    }
  });
}