import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';

export function profilesAPI(app: Hono) {
  // GET /profiles — returns all profiles visible to the authenticated user
  // Uses service role key to bypass RLS, then applies role-based filtering.
  app.get('/make-server-8405be07/profiles', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing auth token in profiles API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in profiles API: ' + (authError?.message || 'No user') }, 401);
      }

      const role = user.user_metadata?.role || 'standard_user';
      let orgId = user.user_metadata?.organizationId;

      // Fetch the caller's own profile to get a reliable organization_id
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (callerProfile?.organization_id) {
        orgId = callerProfile.organization_id;
      }
      const effectiveRole = callerProfile?.role || role;

      console.log(`[profiles-api] User ${user.email}, role=${effectiveRole}, org=${orgId}`);

      // Any authenticated user can view people in their own organization for
      // collaboration features. Cross-org listing remains restricted.
      if (effectiveRole !== 'super_admin' && !orgId) {
        const { data: ownProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        return c.json({
          profiles: ownProfile ? [ownProfile] : [],
          source: 'server-own-only',
        });
      }

      // Build query — service role key bypasses RLS
      let query = supabase.from('profiles').select('*');

      // Scope to organization for non-super_admins
      if (effectiveRole !== 'super_admin' && orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data: profiles, error } = await query;

      if (error) {
        console.error('[profiles-api] Error querying profiles:', error);
        return c.json({ error: 'Failed to query profiles: ' + error.message }, 500);
      }

      console.log(`[profiles-api] Returning ${profiles?.length || 0} profiles`);

      return c.json({
        profiles: profiles || [],
        source: 'server',
      });
    } catch (err: any) {
      console.error('[profiles-api] Unexpected error:', err);
      return c.json({ error: 'Internal server error in profiles API: ' + err.message }, 500);
    }
  });

  // GET /profiles/ensure — ensures the current user has a profile row
  // Creates one from auth metadata if missing.
  app.get('/make-server-8405be07/profiles/ensure', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing auth token' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      // Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existing) {
        return c.json({ profile: existing, created: false });
      }

      // Create profile from auth metadata
      const meta = user.user_metadata || {};
      const profileData = {
        id: user.id,
        email: user.email,
        name: meta.name || meta.full_name || user.email,
        role: meta.role || 'standard_user',
        organization_id: meta.organizationId || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        console.error('[profiles-api] Error creating profile:', insertError);
        return c.json({ error: 'Failed to create profile: ' + insertError.message }, 500);
      }

      console.log(`[profiles-api] Created profile for ${user.email}`);
      return c.json({ profile: newProfile, created: true });
    } catch (err: any) {
      console.error('[profiles-api] Ensure error:', err);
      return c.json({ error: 'Internal server error: ' + err.message }, 500);
    }
  });
}