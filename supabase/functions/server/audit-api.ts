import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';

/**
 * Enterprise Audit Log API
 *
 * Writes to the `audit_logs` Supabase table (not KV store).
 * Provides query, filter, pagination, and CSV export capabilities.
 *
 * Table schema:
 *   id              uuid (PK, auto)
 *   user_id         uuid NOT NULL
 *   action          text NOT NULL          — e.g. 'create', 'update', 'delete', 'login', 'export', 'permission_change'
 *   resource_type   text NOT NULL          — e.g. 'contact', 'bid', 'inventory', 'user', 'permission', 'appointment'
 *   resource_id     uuid                   — nullable (e.g. login events have no resource)
 *   details         jsonb                  — structured payload (old/new values, description, ip, user_agent, etc.)
 *   organization_id text NOT NULL
 *   created_at      timestamptz            — auto
 */

const PREFIX = '/make-server-8405be07';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// ── Reusable helper: log an audit event from any server route ────────────
// Call this from other route handlers to record actions automatically.
export async function logAudit(params: {
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  organizationId: string;
  details?: Record<string, any>;
}) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      organization_id: params.organizationId,
      details: {
        user_email: params.userEmail || null,
        user_name: params.userName || null,
        ...params.details,
      },
    });
    if (error) {
      console.error(`[audit] Failed to write audit log: ${error.message}`, params);
    }
  } catch (err: any) {
    // Never let audit logging break the calling route
    console.error(`[audit] Exception writing audit log: ${err.message}`);
  }
}

// ── Auth helper (matches the main index.tsx pattern) ────────────────────
async function authenticateCaller(c: any) {
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

export function auditAPI(app: Hono) {

  // ─── POST /audit-logs — create a new audit log entry ──────────────────
  // Called by the frontend or other server helpers.
  app.post(`${PREFIX}/audit-logs`, async (c) => {
    try {
      const auth = await authenticateCaller(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);

      const body = await c.req.json();
      const {
        action,
        resource_type,
        resource_id,
        details,
      } = body;

      if (!action || !resource_type) {
        return c.json({ error: 'Missing required fields: action, resource_type' }, 400);
      }

      const orgId = auth.profile.organization_id;
      if (!orgId) {
        return c.json({ error: 'No organization found for user' }, 400);
      }

      const entry = {
        user_id: auth.user.id,
        action,
        resource_type,
        resource_id: resource_id || null,
        organization_id: orgId,
        details: {
          user_email: auth.user.email || null,
          user_name: auth.profile.name || auth.user.user_metadata?.name || null,
          ...(details || {}),
        },
      };

      const { data, error } = await auth.supabase
        .from('audit_logs')
        .insert(entry)
        .select('id, created_at')
        .single();

      if (error) {
        console.error(`[audit-api] POST insert error: ${error.message}`);
        return c.json({ error: `Failed to create audit log: ${error.message}` }, 500);
      }

      return c.json({ success: true, id: data.id, created_at: data.created_at }, 201);
    } catch (err: any) {
      console.error(`[audit-api] POST exception: ${err.message}`);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── GET /audit-logs — query with filters, search, and pagination ─────
  app.get(`${PREFIX}/audit-logs`, async (c) => {
    try {
      const auth = await authenticateCaller(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);

      // Only admin / super_admin can view full audit logs
      if (!['admin', 'super_admin'].includes(auth.profile.role)) {
        return c.json({ error: 'Only admin or super_admin can view audit logs' }, 403);
      }

      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

      // Parse query params
      const page = parseInt(c.req.query('page') || '1', 10);
      const pageSize = Math.min(parseInt(c.req.query('page_size') || '50', 10), 200);
      const action = c.req.query('action');         // filter by action type
      const resourceType = c.req.query('resource_type'); // filter by resource
      const userId = c.req.query('user_id');         // filter by user
      const search = c.req.query('search');           // free text search
      const dateFrom = c.req.query('date_from');     // ISO date string
      const dateTo = c.req.query('date_to');         // ISO date string
      const sortOrder = c.req.query('sort') === 'asc' ? true : false; // default desc

      const supabase = getSupabase(); // service role to bypass RLS

      // Build count query
      let countQuery = supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Build data query
      let dataQuery = supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', orgId);

      // Apply filters to both queries
      if (action) {
        countQuery = countQuery.eq('action', action);
        dataQuery = dataQuery.eq('action', action);
      }
      if (resourceType) {
        countQuery = countQuery.eq('resource_type', resourceType);
        dataQuery = dataQuery.eq('resource_type', resourceType);
      }
      if (userId) {
        countQuery = countQuery.eq('user_id', userId);
        dataQuery = dataQuery.eq('user_id', userId);
      }
      if (dateFrom) {
        countQuery = countQuery.gte('created_at', dateFrom);
        dataQuery = dataQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        countQuery = countQuery.lte('created_at', dateTo);
        dataQuery = dataQuery.lte('created_at', dateTo);
      }

      // Free text search on details JSONB (description, user_email, user_name)
      if (search) {
        const searchFilter = `details->>user_email.ilike.%${search}%,details->>user_name.ilike.%${search}%,details->>description.ilike.%${search}%,action.ilike.%${search}%,resource_type.ilike.%${search}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error(`[audit-api] Count error: ${countError.message}`);
      }

      // Apply pagination and ordering
      const offset = (page - 1) * pageSize;
      dataQuery = dataQuery
        .order('created_at', { ascending: sortOrder })
        .range(offset, offset + pageSize - 1);

      const { data, error } = await dataQuery;
      if (error) {
        console.error(`[audit-api] GET query error: ${error.message}`);
        return c.json({ error: `Failed to query audit logs: ${error.message}` }, 500);
      }

      // Get unique actions and resource types for filter dropdowns
      const { data: actionsData } = await supabase
        .from('audit_logs')
        .select('action')
        .eq('organization_id', orgId)
        .limit(1000);

      const { data: resourceTypesData } = await supabase
        .from('audit_logs')
        .select('resource_type')
        .eq('organization_id', orgId)
        .limit(1000);

      const uniqueActions = [...new Set((actionsData || []).map((r: any) => r.action))].sort();
      const uniqueResourceTypes = [...new Set((resourceTypesData || []).map((r: any) => r.resource_type))].sort();

      return c.json({
        logs: data || [],
        pagination: {
          page,
          pageSize,
          totalCount: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        },
        filters: {
          actions: uniqueActions,
          resourceTypes: uniqueResourceTypes,
        },
        source: 'supabase',
      });
    } catch (err: any) {
      console.error(`[audit-api] GET exception: ${err.message}`);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── GET /audit-logs/export — CSV export ──────────────────────────────
  app.get(`${PREFIX}/audit-logs/export`, async (c) => {
    try {
      const auth = await authenticateCaller(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);

      if (!['admin', 'super_admin'].includes(auth.profile.role)) {
        return c.json({ error: 'Only admin or super_admin can export audit logs' }, 403);
      }

      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

      const dateFrom = c.req.query('date_from');
      const dateTo = c.req.query('date_to');
      const action = c.req.query('action');
      const resourceType = c.req.query('resource_type');

      const supabase = getSupabase();
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10000); // safety cap

      if (action) query = query.eq('action', action);
      if (resourceType) query = query.eq('resource_type', resourceType);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      const { data, error } = await query;
      if (error) {
        return c.json({ error: `Export failed: ${error.message}` }, 500);
      }

      // Build CSV
      const rows = (data || []).map((log: any) => ({
        timestamp: log.created_at,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id || '',
        user_email: log.details?.user_email || '',
        user_name: log.details?.user_name || '',
        description: log.details?.description || '',
        details: JSON.stringify(log.details || {}),
      }));

      const headers = ['timestamp', 'action', 'resource_type', 'resource_id', 'user_email', 'user_name', 'description', 'details'];
      const csvLines = [
        headers.join(','),
        ...rows.map((row: any) =>
          headers.map(h => {
            const val = String(row[h] || '').replace(/"/g, '""');
            return `"${val}"`;
          }).join(',')
        ),
      ];

      // Log the export action itself
      await logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email,
        userName: auth.profile.name,
        action: 'export',
        resourceType: 'audit_log',
        organizationId: orgId,
        details: {
          description: `Exported ${rows.length} audit log entries to CSV`,
          row_count: rows.length,
          filters: { dateFrom, dateTo, action, resourceType },
        },
      });

      return new Response(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err: any) {
      console.error(`[audit-api] Export exception: ${err.message}`);
      return c.json({ error: err.message }, 500);
    }
  });

  // ─── GET /audit-logs/stats — summary statistics for dashboard ─────────
  app.get(`${PREFIX}/audit-logs/stats`, async (c) => {
    try {
      const auth = await authenticateCaller(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);

      if (!['admin', 'super_admin'].includes(auth.profile.role)) {
        return c.json({ error: 'Only admin or super_admin can view audit stats' }, 403);
      }

      const orgId = auth.profile.organization_id;
      if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

      const supabase = getSupabase();

      // Total count
      const { count: totalCount } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: last24h } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', yesterday);

      // Last 7 days
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: last7d } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', lastWeek);

      // Recent actions breakdown (last 7 days by action type)
      const { data: recentActions } = await supabase
        .from('audit_logs')
        .select('action')
        .eq('organization_id', orgId)
        .gte('created_at', lastWeek)
        .limit(5000);

      const actionBreakdown: Record<string, number> = {};
      (recentActions || []).forEach((r: any) => {
        actionBreakdown[r.action] = (actionBreakdown[r.action] || 0) + 1;
      });

      return c.json({
        stats: {
          totalCount: totalCount ?? 0,
          last24h: last24h ?? 0,
          last7d: last7d ?? 0,
          actionBreakdown,
        },
      });
    } catch (err: any) {
      console.error(`[audit-api] Stats exception: ${err.message}`);
      return c.json({ error: err.message }, 500);
    }
  });
}
