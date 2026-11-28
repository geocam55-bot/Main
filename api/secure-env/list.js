import {
  applySecureEnvCorsAndMethodGuard,
  authenticateSecureEnvCaller,
  authorizeScopeAccess,
  isMissingTableError,
  tryAutoProvisionTables,
} from '../_lib/secureEnvHelper.js';

export default async function handler(req, res) {
  if (!applySecureEnvCorsAndMethodGuard(req, res, ['GET', 'OPTIONS'])) return;

  try {
    const authCtx = await authenticateSecureEnvCaller(req);
    if (authCtx.error) {
      return res.status(authCtx.status || 401).json({ success: false, error: authCtx.error, vars: [] });
    }

    const rawScope = req.query?.scope ? String(req.query.scope).trim().toLowerCase() : 'system';
    const scope = rawScope === 'tenant' ? 'tenant' : rawScope === 'system' ? 'system' : null;
    if (!scope) {
      return res.status(400).json({ success: false, error: 'Invalid scope.', vars: [] });
    }

    const requestedOrgId = req.query?.organizationId ? String(req.query.organizationId) : '';
    const access = authorizeScopeAccess(authCtx, scope, requestedOrgId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, error: access.error, vars: [] });
    }

    const { dbClient, adminClient } = authCtx;
    const client = dbClient || adminClient;

    if (scope === 'tenant') {
      const orgId = access.organizationId;
      let { data, error } = await client
        .from('tenant_env_vars')
        .select('*')
        .eq('organization_id', orgId)
        .order('key');

      if (error && isMissingTableError(error)) {
        const provisioned = await tryAutoProvisionTables(adminClient);
        if (provisioned) {
          ({ data, error } = await client
            .from('tenant_env_vars')
            .select('*')
            .eq('organization_id', orgId)
            .order('key'));
        }
      }

      if (error && isMissingTableError(error)) {
        const { data: settingsData, error: settingsErr } = await client
          .from('tenant_settings')
          .select('organization_id, setting_key, setting_value, updated_at')
          .eq('organization_id', orgId);
        if (!settingsErr) {
          const mapped = (settingsData || [])
            .filter((row) => row?.setting_key)
            .map((row) => ({
              organization_id: row.organization_id,
              key: row.setting_key,
              value: row.setting_value || '',
              description: null,
              updated_at: row.updated_at || null,
            }))
            .sort((a, b) => a.key.localeCompare(b.key));
          return res.status(200).json({ success: true, vars: mapped, source: 'tenant_settings' });
        }
      }

      if (error) {
        return res.status(500).json({ success: false, error: error.message, vars: [] });
      }
      return res.status(200).json({ success: true, vars: data || [] });
    }

    let { data, error } = await client.from('app_env_vars').select('*').order('key');

    if (error && isMissingTableError(error)) {
      const provisioned = await tryAutoProvisionTables(adminClient);
      if (provisioned) {
        ({ data, error } = await client.from('app_env_vars').select('*').order('key'));
      }
    }

    if (error && isMissingTableError(error)) {
      const { data: sysData, error: sysErr } = await client
        .from('system_settings')
        .select('setting_key, setting_value, updated_at');
      if (!sysErr) {
        const mapped = (sysData || [])
          .filter((row) => row?.setting_key && !String(row.setting_key).startsWith('__'))
          .map((row) => ({
            key: row.setting_key,
            value: row.setting_value || '',
            description: null,
            updated_at: row.updated_at || null,
          }))
          .sort((a, b) => a.key.localeCompare(b.key));
        return res.status(200).json({ success: true, vars: mapped, source: 'system_settings' });
      }
    }

    if (error || !data || data.length === 0) {
      try {
        const { data: kvData } = await client
          .from('kv_store_8405be07')
          .select('key, value')
          .like('key', 'system_env_var:%');
        if (Array.isArray(kvData) && kvData.length > 0) {
          const mappedKv = kvData
            .map((row) => row?.value)
            .filter((v) => v && typeof v === 'object' && v.key && !String(v.key).startsWith('__'))
            .sort((a, b) => String(a.key).localeCompare(String(b.key)));
          if (mappedKv.length > 0) {
            return res.status(200).json({ success: true, vars: mappedKv, source: 'kv_store_8405be07' });
          }
        }
      } catch {}
    }

    if (error) {
      return res.status(500).json({ success: false, error: error.message, vars: [] });
    }
    const visibleVars = (data || []).filter((row) => !String(row?.key || '').startsWith('__'));
    
    // Merge any kv_store items if missing from app_env_vars
    try {
      const { data: kvData } = await client
        .from('kv_store_8405be07')
        .select('key, value')
        .like('key', 'system_env_var:%');
      if (Array.isArray(kvData) && kvData.length > 0) {
        const existingKeys = new Set(visibleVars.map((v) => v.key));
        for (const row of kvData) {
          const v = row?.value;
          if (v && typeof v === 'object' && v.key && !existingKeys.has(v.key) && !String(v.key).startsWith('__')) {
            visibleVars.push(v);
            existingKeys.add(v.key);
          }
        }
        visibleVars.sort((a, b) => String(a.key).localeCompare(String(b.key)));
      }
    } catch {}

    return res.status(200).json({ success: true, vars: visibleVars });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Server error while listing environment variables.',
      vars: [],
    });
  }
}
