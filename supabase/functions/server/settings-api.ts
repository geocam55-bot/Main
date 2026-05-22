import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';
import * as kv from './kv_store.tsx';

/**
 * Server-side Settings API — uses service role key to bypass RLS.
 * Handles organization_settings and user_preferences CRUD.
 */
export function settingsAPI(app: Hono) {

  // ─── Helper: authenticate caller and resolve profile ────────────────────
  async function authenticateCaller(c: any) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = extractUserToken(c);
    if (!accessToken) {
      return { error: 'Missing auth token (send X-User-Token header)', status: 401, supabase: null, user: null, profile: null };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return { error: 'Unauthorized: ' + (authError?.message || 'No user'), status: 401, supabase: null, user: null, profile: null };
    }

    // Fetch caller profile for role/org verification
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    const effectiveRole = profile?.role || user.user_metadata?.role || 'standard_user';
    const effectiveOrg = profile?.organization_id || user.user_metadata?.organizationId;

    return {
      error: null,
      status: 200,
      supabase,
      user,
      profile: { ...profile, role: effectiveRole, organization_id: effectiveOrg },
    };
  }

  // ─── GET /settings/organization?organization_id=xxx ──────────────────────
  app.get('/make-server-8405be07/settings/organization', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      const orgId = c.req.query('organization_id') || profile!.organization_id;
      if (!orgId) {
        return c.json({ error: 'Missing organization_id' }, 400);
      }

      console.log(`[settings-api] GET org settings for org=${orgId} by user=${user!.email}`);

      const { data, error: dbError } = await supabase!
        .from('organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single();
        
      const kvData = await kv.get(`org_settings_extra:${orgId}`) || {};

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          return c.json({ settings: kvData, source: 'server-not-found-fallback-to-kv' });
        }
        if (dbError.code === 'PGRST205' || dbError.code === '42P01') {
          return c.json({ settings: kvData, source: 'server-table-missing-fallback-to-kv' });
        }
        console.error('[settings-api] GET org settings error:', dbError);
        return c.json({ error: dbError.message }, 500);
      }

      return c.json({ settings: { ...data, ...kvData }, source: 'server' });
    } catch (err: any) {
      console.error('[settings-api] GET org settings unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── PUT /settings/organization — upsert organization settings ───────────
  app.put('/make-server-8405be07/settings/organization', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      // Only admin / super_admin can upsert org settings
      if (!['admin', 'super_admin'].includes(profile!.role)) {
        console.error(`[settings-api] Permission denied for role=${profile!.role}`);
        return c.json({ error: 'Only admin or super_admin can update organization settings' }, 403);
      }

      const body = await c.req.json();
      const orgId = body.organization_id || profile!.organization_id;

      if (body.export_templates !== undefined && !['admin', 'super_admin'].includes(profile!.role)) {
        return c.json({ error: 'Only admin or super_admin can manage export templates' }, 403);
      }

      // Prevent cross-org updates (except super_admin)
      if (profile!.role !== 'super_admin' && orgId !== profile!.organization_id) {
        return c.json({ error: 'Cannot update settings for a different organization' }, 403);
      }

      console.log(`[settings-api] PUT org settings for org=${orgId} by user=${user!.email}, role=${profile!.role}`);

      // Strip fields that may not exist as DB columns and save to KV instead
      // export_templates is now stored in the DB column; only these legacy fields stay in KV
      const OPTIONAL_NON_DB_FIELDS = ['price_tier_labels', 'audience_segments', 'user_invite_method'];
      const dbSettings: any = { ...body, organization_id: orgId, updated_at: new Date().toISOString() };
      
      // Get existing KV data to preserve fields not being updated
      const existingKvData = await kv.get(`org_settings_extra:${orgId}`) || {};
      const kvSettings: any = { ...existingKvData };
      
      OPTIONAL_NON_DB_FIELDS.forEach(field => {
        if (field in dbSettings) {
          kvSettings[field] = dbSettings[field];
          delete dbSettings[field];
        }
      });
      
      await kv.set(`org_settings_extra:${orgId}`, kvSettings);

      const { data, error: dbError } = await supabase!
        .from('organization_settings')
        .upsert(dbSettings, { onConflict: 'organization_id' })
        .select()
        .single();

      if (dbError) {
        console.error('[settings-api] PUT org settings error:', dbError);
        return c.json({ error: dbError.message, code: dbError.code }, 500);
      }

      console.log('[settings-api] Org settings saved successfully');
      return c.json({ settings: { ...data, ...kvSettings }, source: 'server' });
    } catch (err: any) {
      console.error('[settings-api] PUT org settings unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── GET /settings/user-preferences?user_id=xxx&organization_id=yyy ──────
  app.get('/make-server-8405be07/settings/user-preferences', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      const userId = c.req.query('user_id') || user!.id;
      const orgId = c.req.query('organization_id') || profile!.organization_id;

      console.log(`[settings-api] GET user prefs for user=${userId}, org=${orgId}`);

      const { data, error: dbError } = await supabase!
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          return c.json({ preferences: null, source: 'server-not-found' });
        }
        if (dbError.code === 'PGRST205' || dbError.code === '42P01') {
          return c.json({ preferences: null, source: 'server-table-missing' });
        }
        console.error('[settings-api] GET user prefs error:', dbError);
        return c.json({ error: dbError.message }, 500);
      }

      return c.json({ preferences: data, source: 'server' });
    } catch (err: any) {
      console.error('[settings-api] GET user prefs unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── PUT /settings/user-preferences — upsert user preferences ────────────
  app.put('/make-server-8405be07/settings/user-preferences', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      const body = await c.req.json();
      const userId = body.user_id || user!.id;

      // Users can only update their own preferences (unless super_admin)
      if (profile!.role !== 'super_admin' && userId !== user!.id) {
        return c.json({ error: 'Cannot update preferences for another user' }, 403);
      }

      console.log(`[settings-api] PUT user prefs for user=${userId}`);

      const dbData = { ...body, user_id: userId, updated_at: new Date().toISOString() };

      const { data, error: dbError } = await supabase!
        .from('user_preferences')
        .upsert(dbData, { onConflict: 'user_id,organization_id' })
        .select()
        .single();

      if (dbError) {
        console.error('[settings-api] PUT user prefs error:', dbError);
        return c.json({ error: dbError.message, code: dbError.code }, 500);
      }

      console.log('[settings-api] User prefs saved successfully');
      return c.json({ preferences: data, source: 'server' });
    } catch (err: any) {
      console.error('[settings-api] PUT user prefs unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── PUT /settings/organization-name — update organization name ──────────
  app.put('/make-server-8405be07/settings/organization-name', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      if (!['admin', 'super_admin'].includes(profile!.role)) {
        return c.json({ error: 'Only admin or super_admin can update organization name' }, 403);
      }

      const { organization_id, name } = await c.req.json();
      const orgId = organization_id || profile!.organization_id;

      if (profile!.role !== 'super_admin' && orgId !== profile!.organization_id) {
        return c.json({ error: 'Cannot update a different organization' }, 403);
      }

      console.log(`[settings-api] PUT org name for org=${orgId}: "${name}"`);

      const { error: dbError } = await supabase!
        .from('organizations')
        .update({ name })
        .eq('id', orgId);

      if (dbError) {
        console.error('[settings-api] PUT org name error:', dbError);
        return c.json({ error: dbError.message }, 500);
      }

      return c.json({ success: true, source: 'server' });
    } catch (err: any) {
      console.error('[settings-api] PUT org name unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── PATCH /settings/profile — update user profile ───────────────────────
  app.patch('/make-server-8405be07/settings/profile', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      const { user_id, ...updates } = await c.req.json();
      const targetUserId = user_id || user!.id;

      // Only allow updating own profile (unless super_admin)
      if (profile!.role !== 'super_admin' && targetUserId !== user!.id) {
        return c.json({ error: 'Cannot update another user profile' }, 403);
      }

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if ('avatar_url' in updates) updateData.avatar_url = updates.avatar_url;

      if (Object.keys(updateData).length === 0) {
        return c.json({ success: true, message: 'No updates to apply', source: 'server' });
      }

      console.log(`[settings-api] PATCH profile for user=${targetUserId}`, updateData);

      const { data, error: dbError } = await supabase!
        .from('profiles')
        .update(updateData)
        .eq('id', targetUserId)
        .select()
        .single();

      if (dbError) {
        console.error('[settings-api] PATCH profile error:', dbError);
        return c.json({ error: dbError.message, code: dbError.code }, 500);
      }

      return c.json({ profile: data, source: 'server' });
    } catch (err: any) {
      console.error('[settings-api] PATCH profile unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── GET /settings/theme — load user theme preference from KV store ────
  app.get('/make-server-8405be07/settings/theme', async (c) => {
    try {
      const { error, status, user } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      const theme = await kv.get(`user_theme:${user!.id}`);
      return c.json({ theme: theme || null });
    } catch (err: any) {
      console.error('[settings-api] GET theme error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── PUT /settings/theme — save user theme preference to KV store ──────
  app.put('/make-server-8405be07/settings/theme', async (c) => {
    try {
      const { error, status, user } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      const { theme } = await c.req.json();
      if (!theme) return c.json({ error: 'Missing theme' }, 400);

      await kv.set(`user_theme:${user!.id}`, theme);
      console.log(`[settings-api] Theme saved for user=${user!.id}: ${theme}`);
      return c.json({ success: true });
    } catch (err: any) {
      console.error('[settings-api] PUT theme error:', err);
      return c.json({ error: err.message }, 500);
    }
  });
}