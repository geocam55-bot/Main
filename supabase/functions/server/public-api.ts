/**
 * Public REST API — authenticated via API keys (Enterprise only).
 *
 * External consumers call these endpoints with:
 *   X-API-Key: ps_live_<hex>
 *
 * Routes: /make-server-8405be07/api/v1/<resource>
 *
 * Middleware flow:
 *   1. Extract X-API-Key header
 *   2. Hash the key and look up via KV reverse-lookup  (api_key_lookup:{hash})
 *   3. Verify the key is active, not expired
 *   4. Verify the org has an active Enterprise subscription
 *   5. Check that the key's scopes include the required scope for the endpoint
 *   6. Update last_used_at timestamp
 *   7. Attach { orgId, keyId, scopes } to c.set() for downstream handlers
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const PREFIX = '/make-server-8405be07';

// ── Types ───────────────────────────────────────────────────────────────

interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  status: 'active' | 'revoked';
  created_by: string;
  created_by_name: string;
}

interface KeyLookup {
  orgId: string;
  keyId: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Middleware: validate API key ────────────────────────────────────────

async function validateApiKey(c: any, requiredScope: string): Promise<{
  error: string | null;
  status: number;
  orgId: string;
  supabase: any;
}> {
  const apiKeyHeader = c.req.header('X-API-Key') || c.req.header('x-api-key');
  if (!apiKeyHeader) {
    return { error: 'Missing X-API-Key header', status: 401, orgId: '', supabase: null };
  }

  // Validate key format
  if (!apiKeyHeader.startsWith('ps_live_')) {
    return { error: 'Invalid API key format', status: 401, orgId: '', supabase: null };
  }

  // Hash and look up
  const hash = await hashKey(apiKeyHeader);
  let lookup: KeyLookup | null = null;
  try {
    lookup = await kv.get(`api_key_lookup:${hash}`) as KeyLookup | null;
  } catch {
    return { error: 'Internal error validating API key', status: 500, orgId: '', supabase: null };
  }

  if (!lookup) {
    return { error: 'Invalid or revoked API key', status: 401, orgId: '', supabase: null };
  }

  const { orgId, keyId } = lookup;

  // Fetch the full key record to check status, expiration, scopes
  let keys: ApiKeyRecord[] = [];
  try {
    keys = (await kv.get(`api_keys:${orgId}`)) as ApiKeyRecord[] || [];
  } catch {
    return { error: 'Internal error loading key metadata', status: 500, orgId, supabase: null };
  }

  const keyRecord = keys.find(k => k.id === keyId);
  if (!keyRecord) {
    return { error: 'API key record not found', status: 401, orgId, supabase: null };
  }

  if (keyRecord.status !== 'active') {
    return { error: 'API key has been revoked', status: 403, orgId, supabase: null };
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { error: 'API key has expired', status: 403, orgId, supabase: null };
  }

  // Verify Enterprise subscription
  try {
    const sub = await kv.get(`subscription:${orgId}`) as any;
    if (!sub || sub.plan_id !== 'enterprise' || !['active', 'trialing'].includes(sub.status)) {
      return { error: 'API access requires an active Enterprise subscription', status: 403, orgId, supabase: null };
    }
  } catch {
    return { error: 'Could not verify subscription status', status: 500, orgId, supabase: null };
  }

  // Check scope
  if (!keyRecord.scopes.includes(requiredScope)) {
    return {
      error: `Insufficient scope: this key does not have '${requiredScope}'. Granted scopes: ${keyRecord.scopes.join(', ')}`,
      status: 403,
      orgId,
      supabase: null,
    };
  }

  // Update last_used_at (fire-and-forget, don't block the response)
  const now = new Date().toISOString();
  if (!keyRecord.last_used_at || (Date.now() - new Date(keyRecord.last_used_at).getTime()) > 60_000) {
    // Only update every ~60s to avoid KV write spam
    keyRecord.last_used_at = now;
    kv.set(`api_keys:${orgId}`, keys).catch(err => {
      console.log(`[public-api] Failed to update last_used_at for key ${keyId}:`, err);
    });
  }

  const supabase = getSupabase();
  return { error: null, status: 200, orgId, supabase };
}

// ── Pagination helper ──────────────────────────────────────────────────

function parsePagination(c: any): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 200);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
  return { limit, offset };
}

// ── Routes ──────────────────────────────────────────────────────────────

export const publicApi = new Hono();

// Health / version
publicApi.get(`${PREFIX}/api/v1/health`, (c) => {
  return c.json({ status: 'ok', api_version: 'v1', timestamp: new Date().toISOString() });
});

// ── CONTACTS ────────────────────────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/contacts`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'contacts:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const { limit, offset } = parsePagination(c);
    const search = c.req.query('search') || '';

    let query = auth.supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return c.json({ error: error.message }, 500);

    return c.json({
      data: data || [],
      meta: { total: count || 0, limit, offset },
    });
  } catch (err: any) {
    console.log('[public-api] GET /contacts error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.get(`${PREFIX}/api/v1/contacts/:id`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'contacts:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const id = c.req.param('id');
    const { data, error } = await auth.supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .single();

    if (error) return c.json({ error: error.code === 'PGRST116' ? 'Contact not found' : error.message }, error.code === 'PGRST116' ? 404 : 500);
    return c.json({ data });
  } catch (err: any) {
    console.log('[public-api] GET /contacts/:id error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.post(`${PREFIX}/api/v1/contacts`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'contacts:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const body = await c.req.json();
    body.organization_id = auth.orgId;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('contacts')
      .insert([body])
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 201);
  } catch (err: any) {
    console.log('[public-api] POST /contacts error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.patch(`${PREFIX}/api/v1/contacts/:id`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'contacts:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const id = c.req.param('id');
    const body = await c.req.json();
    body.updated_at = new Date().toISOString();
    // Prevent org takeover
    delete body.organization_id;
    delete body.id;

    const { data, error } = await auth.supabase
      .from('contacts')
      .update(body)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select('*')
      .single();

    if (error) return c.json({ error: error.code === 'PGRST116' ? 'Contact not found' : error.message }, error.code === 'PGRST116' ? 404 : 500);
    return c.json({ data });
  } catch (err: any) {
    console.log('[public-api] PATCH /contacts/:id error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.delete(`${PREFIX}/api/v1/contacts/:id`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'contacts:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const id = c.req.param('id');
    const { error } = await auth.supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.orgId);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ deleted: true, id });
  } catch (err: any) {
    console.log('[public-api] DELETE /contacts/:id error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── DEALS / BIDS ────────────────────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/deals`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'deals:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const { limit, offset } = parsePagination(c);

    const { data, error, count } = await auth.supabase
      .from('bids')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [], meta: { total: count || 0, limit, offset } });
  } catch (err: any) {
    console.log('[public-api] GET /deals error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.post(`${PREFIX}/api/v1/deals`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'deals:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const body = await c.req.json();
    body.organization_id = auth.orgId;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('bids')
      .insert([body])
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 201);
  } catch (err: any) {
    console.log('[public-api] POST /deals error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── TASKS ───────────────────────────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/tasks`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'tasks:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const { limit, offset } = parsePagination(c);
    const status = c.req.query('status'); // optional filter

    let query = auth.supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [], meta: { total: count || 0, limit, offset } });
  } catch (err: any) {
    console.log('[public-api] GET /tasks error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.post(`${PREFIX}/api/v1/tasks`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'tasks:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const body = await c.req.json();
    body.organization_id = auth.orgId;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('tasks')
      .insert([body])
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 201);
  } catch (err: any) {
    console.log('[public-api] POST /tasks error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.patch(`${PREFIX}/api/v1/tasks/:id`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'tasks:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const id = c.req.param('id');
    const body = await c.req.json();
    body.updated_at = new Date().toISOString();
    delete body.organization_id;
    delete body.id;

    const { data, error } = await auth.supabase
      .from('tasks')
      .update(body)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select('*')
      .single();

    if (error) return c.json({ error: error.code === 'PGRST116' ? 'Task not found' : error.message }, error.code === 'PGRST116' ? 404 : 500);
    return c.json({ data });
  } catch (err: any) {
    console.log('[public-api] PATCH /tasks/:id error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── QUOTES ──────────────────────────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/quotes`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'quotes:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const { limit, offset } = parsePagination(c);

    const { data, error, count } = await auth.supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [], meta: { total: count || 0, limit, offset } });
  } catch (err: any) {
    console.log('[public-api] GET /quotes error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.post(`${PREFIX}/api/v1/quotes`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'quotes:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const body = await c.req.json();
    body.organization_id = auth.orgId;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('quotes')
      .insert([body])
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 201);
  } catch (err: any) {
    console.log('[public-api] POST /quotes error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── INVENTORY ───────────────────────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/inventory`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'inventory:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const { limit, offset } = parsePagination(c);
    const search = c.req.query('search') || '';
    const category = c.req.query('category') || '';

    let query = auth.supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.orgId)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [], meta: { total: count || 0, limit, offset } });
  } catch (err: any) {
    console.log('[public-api] GET /inventory error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

publicApi.patch(`${PREFIX}/api/v1/inventory/:id`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'inventory:write');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const id = c.req.param('id');
    const body = await c.req.json();
    body.updated_at = new Date().toISOString();
    delete body.organization_id;
    delete body.id;

    const { data, error } = await auth.supabase
      .from('inventory')
      .update(body)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select('*')
      .single();

    if (error) return c.json({ error: error.code === 'PGRST116' ? 'Item not found' : error.message }, error.code === 'PGRST116' ? 404 : 500);
    return c.json({ data });
  } catch (err: any) {
    console.log('[public-api] PATCH /inventory/:id error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── USERS (read-only) ──────────────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/users`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'users:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const { data, error } = await auth.supabase
      .from('profiles')
      .select('id, email, name, full_name, role, status, created_at, updated_at, avatar_url')
      .eq('organization_id', auth.orgId)
      .order('name', { ascending: true });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [], meta: { total: data?.length || 0 } });
  } catch (err: any) {
    console.log('[public-api] GET /users error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── REPORTS (read-only summary) ─────────────────────────────────────────

publicApi.get(`${PREFIX}/api/v1/reports/summary`, async (c) => {
  try {
    const auth = await validateApiKey(c, 'reports:read');
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    // Gather counts in parallel
    const [contacts, bids, tasks, quotes, users] = await Promise.all([
      auth.supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', auth.orgId),
      auth.supabase.from('bids').select('id', { count: 'exact', head: true }).eq('organization_id', auth.orgId),
      auth.supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', auth.orgId),
      auth.supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('organization_id', auth.orgId),
      auth.supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', auth.orgId),
    ]);

    return c.json({
      data: {
        contacts: contacts.count ?? 0,
        deals: bids.count ?? 0,
        tasks: tasks.count ?? 0,
        quotes: quotes.count ?? 0,
        users: users.count ?? 0,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.log('[public-api] GET /reports/summary error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});
