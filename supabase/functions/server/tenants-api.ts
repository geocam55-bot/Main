import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const PREFIX = '/make-server-8405be07';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

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

async function authenticateSuperAdmin(c: any) {
  const supabase = getSupabase();
  const token = extractUserToken(c);
  if (!token) return { error: 'Missing auth token', status: 401, supabase };

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized: ' + (authError?.message || 'No user'), status: 401, supabase };

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const role = profile?.role || user.user_metadata?.role || 'standard_user';

  if (role !== 'super_admin') {
    return { error: 'Forbidden: super_admin required', status: 403, supabase };
  }

  return { error: null, status: 200, supabase, user, profile: { ...profile, role } };
}

export function tenantsAPI(app: Hono) {

  // ── CREATE ORGANIZATION ───────────────────────────────────────────────
  app.post(`${PREFIX}/tenants`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const data = await c.req.json();

      // Generate org ID from name
      let orgId = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: existingOrg } = await auth.supabase
        .from('organizations').select('id').eq('id', orgId).single();
      if (existingOrg) {
        orgId = `${orgId}-${Date.now()}`;
      }

      const dbData: any = {
        id: orgId,
        name: data.name,
        status: data.status || 'active',
        logo: data.logo || null,
      };

      // Dynamically include all properties ending in _enabled
      Object.keys(data).forEach(key => {
        if (key.endsWith('_enabled')) {
          dbData[key] = data[key];
        }
      });

      const { data: org, error } = await auth.supabase
        .from('organizations')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        return c.json({ error: error.message }, 500);
      }

      // Save extra fields to KV
      try {
        const extraFields = {
          domain: data.domain || '',
          billing_email: data.billingEmail || '',
          phone: data.phone || '',
          address: data.address || '',
          plan: data.plan || 'starter',
          custom_plan_price: data.customPlanPrice || '',
          notes: data.notes || '',
          features: data.features || [],
        };
        await kv.set(`org_details:${orgId}`, extraFields);
      } catch (kvErr: any) {
      }

      // Set default org mode
      try {
        await kv.set(`org_mode:${orgId}`, { user_mode: data.user_mode || 'multi' });
      } catch (modeErr: any) {
      }

      return c.json({ tenant: org }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── UPDATE ORGANIZATION ───────────────────────────────────────────────
  app.put(`${PREFIX}/tenants/:id`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const id = c.req.param('id');
      const data = await c.req.json();

      const dbData: any = {
        name: data.name,
        status: data.status,
        logo: data.logo || null,
      };

      // Dynamically include all properties ending in _enabled
      Object.keys(data).forEach(key => {
        if (key.endsWith('_enabled')) {
          dbData[key] = data[key];
        }
      });

      const { data: org, error } = await auth.supabase
        .from('organizations')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return c.json({ error: error.message, code: error.code }, 500);
      }

      // Save extra fields to KV
      try {
        const extraFields = {
          domain: data.domain || '',
          billing_email: data.billingEmail || '',
          phone: data.phone || '',
          address: data.address || '',
          plan: data.plan || 'starter',
          custom_plan_price: data.customPlanPrice || '',
          notes: data.notes || '',
          features: data.features || [],
        };
        await kv.set(`org_details:${id}`, extraFields);
      } catch (kvErr: any) {
      }

      // Sync plan to subscription KV so Billing page stays in sync
      if (data.plan) {
        try {
          const sub: any = await kv.get(`subscription:${id}`);
          if (sub) {
            sub.plan_id = data.plan;
            sub.updated_at = new Date().toISOString();
            await kv.set(`subscription:${id}`, sub);
          }
        } catch (syncErr: any) {
        }
      }

      return c.json({ tenant: org });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── UPDATE FEATURES (for AI toggle, etc.) ─────────────────────────────
  app.patch(`${PREFIX}/tenants/:id/features`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const id = c.req.param('id');
      const features = await c.req.json();

      let org = null;

      // 1. Try to update DB columns (might fail if columns like project_wizards_enabled don't exist)
      const { data, error } = await auth.supabase
        .from('organizations')
        .update(features)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '42703') {
          // 'undefined_column' - Don't fail, some modules are KV-only!
          const { data: fallbackOrg } = await auth.supabase
            .from('organizations')
            .select()
            .eq('id', id)
            .single();
          org = fallbackOrg;
        } else {
          return c.json({ error: error.message }, 500);
        }
      } else {
        org = data;
      }

      // 2. Also save ALL features into KV so they persist even if not in DB
      try {
        const existingDetails = (await kv.get(`org_details:${id}`)) || {};
        for (const [k, v] of Object.entries(features)) {
          existingDetails[k] = v;
        }
        await kv.set(`org_details:${id}`, existingDetails);
      } catch (kvErr) {
        // Ignore KV errors
      }

      return c.json({ tenant: org });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── DELETE ORGANIZATION ───────────────────────────────────────────────
  app.delete(`${PREFIX}/tenants/:id`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const id = c.req.param('id');

      const tables = [
        'bids', 'opportunities', 'project_managers', 'contacts',
        'appointments', 'notes', 'tasks', 'quotes', 'documents',
        'inventory',
      ];

      for (const table of tables) {
        const { data: deleted, error } = await auth.supabase
          .from(table)
          .delete()
          .eq('organization_id', id)
          .select('id');
      }

      // Delete storage files
      try {
        const { data: files } = await auth.supabase.storage.from('documents').list(id);
        if (files && files.length > 0) {
          const filePaths = files.map((file: any) => `${id}/${file.name}`);
          await auth.supabase.storage.from('documents').remove(filePaths);
        }
      } catch (storageErr: any) {
      }

      // Delete profiles
      const { data: profilesDeleted, error: profilesError } = await auth.supabase
        .from('profiles')
        .delete()
        .eq('organization_id', id)
        .select('id');

      // Delete the organization
      const { data: orgData, error: orgError } = await auth.supabase
        .from('organizations')
        .delete()
        .eq('id', id)
        .select();

      if (orgError) {
        return c.json({ error: orgError.message }, 500);
      }

      // Clean up KV
      try {
        await kv.del(`org_details:${id}`);
        await kv.del(`org_mode:${id}`);
      } catch {}

      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });
}