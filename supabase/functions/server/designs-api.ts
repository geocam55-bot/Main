import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Server-side CRUD for saved planner designs + deal/quote creation.
 *
 * Uses the service-role key to bypass RLS on:
 *   saved_deck_designs, saved_garage_designs, saved_shed_designs,
 *   saved_designs (roof/kitchen via design_type), saved_kitchen_designs,
 *   opportunities, quotes
 *
 * Routes (order matters — fixed routes before wildcards):
 *   POST   /designs/create-deal    — create an opportunity (deal)
 *   POST   /designs/create-quote   — create a quote
 *   GET    /designs/:type          — list designs for org
 *   POST   /designs/:type          — insert a new design
 *   DELETE /designs/:type/:id      — delete a design
 */

const PREFIX = '/make-server-8405be07';

const VALID_TYPES: Record<string, string> = {
  deck: 'saved_deck_designs',
  garage: 'saved_garage_designs',
  shed: 'saved_shed_designs',
  roof: 'saved_designs',
  kitchen: 'saved_kitchen_designs',
};

// Types that use a shared table and need a design_type filter
const SHARED_TABLE_TYPES = new Set(['roof', 'kitchen']);

function extractUserToken(c: any): string | null {
  const userToken = c.req.header('X-User-Token');
  if (userToken) return userToken;
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1] || null;
    if (token && token.length > 300) return token;
  }
  return null;
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function authenticateUser(c: any) {
  const supabase = getSupabase();
  const token = extractUserToken(c);
  if (!token) {
    return { error: 'Missing auth token', status: 401, supabase, user: null as any, profile: null as any };
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Unauthorized: ' + (authError?.message || 'No user'), status: 401, supabase, user: null as any, profile: null as any };
  }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const effectiveOrg = profile?.organization_id || user.user_metadata?.organizationId;
  return { error: null, status: 200, supabase, user, profile: { ...profile, organization_id: effectiveOrg } };
}

export function designsApi(app: Hono) {

  // ═══════════════════════════════════════════════════════════════════════
  // FIXED routes — must be registered BEFORE the :type wildcard routes
  // ═══════════════════════════════════════════════════════════════════════

  // ── POST /designs/create-deal — create an opportunity via service-role ──
  app.post(`${PREFIX}/designs/create-deal`, async (c) => {
    console.log('POST /designs/create-deal');
    try {
      const auth = await authenticateUser(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);
      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'No organization found' }, 400);

      const body = await c.req.json();

      if (!body.customer_id) {
        return c.json({ error: 'customer_id is required to create a deal' }, 400);
      }
      if (!body.title) {
        return c.json({ error: 'title is required' }, 400);
      }

      const now = new Date().toISOString();
      const row: Record<string, any> = {
        organization_id: orgId,
        customer_id: body.customer_id,
        title: body.title,
        description: body.description || null,
        value: body.value ?? 0,
        status: body.status || 'open',
        owner_id: auth.user.id,
        created_at: now,
        updated_at: now,
      };

      console.log(`[designs] Creating deal for customer_id=${body.customer_id} in org=${orgId}`);

      const { data, error } = await auth.supabase
        .from('opportunities')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('[designs] Error creating deal:', error);
        return c.json({ error: error.message, code: error.code }, 500);
      }

      console.log(`[designs] Deal created: id=${data.id}, customer_id=${data.customer_id}`);
      return c.json({ deal: data });
    } catch (err: any) {
      console.error('[designs] Unhandled error creating deal:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── POST /designs/create-quote — create a quote via service-role ──────
  app.post(`${PREFIX}/designs/create-quote`, async (c) => {
    console.log('POST /designs/create-quote');
    try {
      const auth = await authenticateUser(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);
      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'No organization found' }, 400);

      const body = await c.req.json();

      if (!body.contact_id) {
        return c.json({ error: 'contact_id is required to create a quote' }, 400);
      }

      const now = new Date().toISOString();
      const row: Record<string, any> = {
        quote_number: body.quote_number,
        organization_id: orgId,
        contact_id: body.contact_id,
        title: body.title || 'Untitled Quote',
        line_items: body.line_items || [],
        subtotal: body.subtotal ?? 0,
        total: body.total ?? 0,
        status: body.status || 'draft',
        valid_until: body.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: auth.user.id,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await auth.supabase
        .from('quotes')
        .insert([row])
        .select()
        .single();

      if (error) {
        console.error('[designs] Error creating quote:', error);
        return c.json({ error: error.message, code: error.code }, 500);
      }

      console.log(`[designs] Quote created: id=${data.id}, contact_id=${data.contact_id}`);
      return c.json({ quote: data });
    } catch (err: any) {
      console.error('[designs] Unhandled error creating quote:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // WILDCARD routes — :type param matches deck/garage/shed/roof/kitchen
  // ═══════════════════════════════════════════════════════════════════════

  // ── GET /designs/:type — list designs for the user's org ──────────────
  app.get(`${PREFIX}/designs/:type`, async (c) => {
    const type = c.req.param('type');
    const tableName = VALID_TYPES[type];
    if (!tableName) return c.json({ error: `Invalid design type: ${type}` }, 400);

    console.log(`GET /designs/${type}`);
    try {
      const auth = await authenticateUser(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);
      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'No organization found' }, 400);

      let query = auth.supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      // Shared-table types need a design_type filter
      if (SHARED_TABLE_TYPES.has(type)) {
        query = query.eq('design_type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[designs] Error listing ${tableName}:`, error);
        return c.json({ error: error.message, code: error.code }, 500);
      }

      // Enrich with customer name/company
      const enriched = await Promise.all(
        (data || []).map(async (design: any) => {
          let customer_name: string | null = null;
          let customer_company: string | null = null;
          let deal_id: string | null = null;
          let deal_title: string | null = null;

          if (design.customer_id) {
            const { data: contact } = await auth.supabase
              .from('contacts')
              .select('name, company')
              .eq('id', design.customer_id)
              .single();
            if (contact) {
              customer_name = contact.name;
              customer_company = contact.company;
            }
          }

          return { ...design, customer_name, customer_company, deal_id, deal_title };
        })
      );

      return c.json({ designs: enriched });
    } catch (err: any) {
      console.error(`[designs] Unhandled error listing ${type}:`, err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── POST /designs/:type — save a new design ──────────────────────────
  app.post(`${PREFIX}/designs/:type`, async (c) => {
    const type = c.req.param('type');
    const tableName = VALID_TYPES[type];
    if (!tableName) return c.json({ error: `Invalid design type: ${type}` }, 400);

    console.log(`POST /designs/${type}`);
    try {
      const auth = await authenticateUser(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);
      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'No organization found' }, 400);

      const body = await c.req.json();

      const row: Record<string, any> = {
        organization_id: orgId,
        user_id: auth.user.id,
        customer_id: body.customer_id || null,
        name: body.name,
        description: body.description || null,
        config: body.config,
        price_tier: body.price_tier || 't1',
        total_cost: body.total_cost || 0,
        materials: body.materials || [],
      };

      // Some tables have opportunity_id
      if (body.opportunity_id !== undefined) {
        row.opportunity_id = body.opportunity_id;
      }

      // Shared-table types need a design_type column
      if (SHARED_TABLE_TYPES.has(type)) {
        row.design_type = type;
      }

      const { data, error } = await auth.supabase
        .from(tableName)
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error(`[designs] Error inserting into ${tableName}:`, error);
        return c.json({ error: error.message, code: error.code }, 500);
      }

      console.log(`[designs] Saved ${type} design ${data.id}`);
      return c.json({ design: data });
    } catch (err: any) {
      console.error(`[designs] Unhandled error saving ${type}:`, err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── DELETE /designs/:type/:id ────────────────────────────────────────
  app.delete(`${PREFIX}/designs/:type/:id`, async (c) => {
    const type = c.req.param('type');
    const id = c.req.param('id');
    const tableName = VALID_TYPES[type];
    if (!tableName) return c.json({ error: `Invalid design type: ${type}` }, 400);

    console.log(`DELETE /designs/${type}/${id}`);
    try {
      const auth = await authenticateUser(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);
      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'No organization found' }, 400);

      const { error } = await auth.supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        console.error(`[designs] Error deleting from ${tableName}:`, error);
        return c.json({ error: error.message, code: error.code }, 500);
      }

      console.log(`[designs] Deleted ${type} design ${id}`);
      return c.json({ success: true });
    } catch (err: any) {
      console.error(`[designs] Unhandled error deleting ${type}:`, err);
      return c.json({ error: err.message }, 500);
    }
  });
}
