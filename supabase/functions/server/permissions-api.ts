import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

/**
 * Server-side Permissions API — persists permissions matrix to KV store.
 * Key format: permissions:<orgId>  → full permissions array
 * Key format: audit_logs:<orgId>   → audit log entries array
 */
export function permissionsAPI(app: Hono) {

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

  // ─── GET /permissions?organization_id=xxx — load permissions from KV store ──
  app.get('/make-server-8405be07/permissions', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      // Prefer profile's org, fall back to query param, then generic fallback
      const orgId = profile!.organization_id || c.req.query('organization_id');
      if (!orgId) {
        return c.json({ error: 'Missing organization_id' }, 400);
      }

      console.log(`[permissions-api] GET permissions for org=${orgId} by user=${user!.email}`);

      const kvKey = `permissions:${orgId}`;
      const data = await kv.get(kvKey);

      if (data) {
        console.log(`[permissions-api] Found ${Array.isArray(data) ? data.length : 0} permissions in KV store`);
        return c.json({ permissions: data, source: 'server' });
      } else {
        console.log(`[permissions-api] No permissions found in KV store for org=${orgId}`);
        return c.json({ permissions: null, source: 'server-not-found' });
      }
    } catch (err: any) {
      console.error('[permissions-api] GET permissions unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── PUT /permissions — save permissions to KV store ─────────────────────
  app.put('/make-server-8405be07/permissions', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      // Only admin / super_admin can save permissions
      if (!['admin', 'super_admin'].includes(profile!.role)) {
        console.error(`[permissions-api] Permission denied for role=${profile!.role}`);
        return c.json({ error: 'Only admin or super_admin can update permissions' }, 403);
      }

      const body = await c.req.json();
      const { permissions, organization_id, audit_entry } = body;

      // Use the profile's organization_id as the canonical org (prevents mismatch
      // when the frontend sends a fallback like 'org_001' that doesn't match the DB).
      // Only fall back to the body's organization_id when the profile has none.
      const orgId = profile!.organization_id || organization_id;
      if (!orgId) {
        return c.json({ error: 'Missing organization_id' }, 400);
      }

      if (!permissions || !Array.isArray(permissions)) {
        return c.json({ error: 'Missing or invalid permissions array' }, 400);
      }

      // Prevent cross-org updates: only reject when the caller explicitly
      // requested a different org AND the profile has a real org on record.
      if (
        profile!.role !== 'super_admin' &&
        profile!.organization_id &&
        organization_id &&
        organization_id !== profile!.organization_id
      ) {
        console.warn(
          `[permissions-api] Cross-org attempt blocked: body=${organization_id}, profile=${profile!.organization_id}`
        );
        return c.json({ error: 'Cannot update permissions for a different organization' }, 403);
      }

      console.log(`[permissions-api] PUT ${permissions.length} permissions for org=${orgId} by user=${user!.email}, role=${profile!.role}`);

      // Save permissions to KV store
      const kvKey = `permissions:${orgId}`;
      await kv.set(kvKey, permissions);
      console.log(`[permissions-api] Permissions saved to KV store key=${kvKey}`);

      // Save audit log entry if provided
      if (audit_entry) {
        const auditKey = `audit_logs:${orgId}`;
        let existingLogs: any[] = [];
        try {
          const storedLogs = await kv.get(auditKey);
          if (Array.isArray(storedLogs)) {
            existingLogs = storedLogs;
          }
        } catch (e) {
          // No existing logs, start fresh
        }

        existingLogs.unshift(audit_entry);
        // Keep last 100 audit log entries
        existingLogs = existingLogs.slice(0, 100);

        await kv.set(auditKey, existingLogs);
        console.log(`[permissions-api] Audit log saved, total entries: ${existingLogs.length}`);
      }

      return c.json({ success: true, count: permissions.length, source: 'server' });
    } catch (err: any) {
      console.error('[permissions-api] PUT permissions unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── GET /permissions/audit-logs?organization_id=xxx — load audit logs ────
  app.get('/make-server-8405be07/permissions/audit-logs', async (c) => {
    try {
      const { error, status, supabase, user, profile } = await authenticateCaller(c);
      if (error) return c.json({ error }, status);

      // Only admin / super_admin can view audit logs
      if (!['admin', 'super_admin'].includes(profile!.role)) {
        return c.json({ error: 'Only admin or super_admin can view audit logs' }, 403);
      }

      const orgId = profile!.organization_id || c.req.query('organization_id');
      if (!orgId) {
        return c.json({ error: 'Missing organization_id' }, 400);
      }

      console.log(`[permissions-api] GET audit logs for org=${orgId}`);

      const auditKey = `audit_logs:${orgId}`;
      const data = await kv.get(auditKey);

      if (data && Array.isArray(data)) {
        console.log(`[permissions-api] Found ${data.length} audit log entries`);
        return c.json({ logs: data, source: 'server' });
      } else {
        return c.json({ logs: [], source: 'server-empty' });
      }
    } catch (err: any) {
      console.error('[permissions-api] GET audit logs unexpected error:', err);
      return c.json({ error: err.message }, 500);
    }
  });
}