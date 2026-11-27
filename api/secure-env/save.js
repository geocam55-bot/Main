import {
  applySecureEnvCorsAndMethodGuard,
  authenticateSecureEnvCaller,
  authorizeScopeAccess,
  isMissingTableError,
  normalizeEnvKey,
  normalizeEnvScope,
  parseJsonBody,
  syncRuntimeEnvIfNeeded,
  tryAutoProvisionTables,
} from '../_lib/secureEnvHelper.js';

export default async function handler(req, res) {
  if (!applySecureEnvCorsAndMethodGuard(req, res, ['POST', 'OPTIONS'])) return;

  try {
    const authCtx = await authenticateSecureEnvCaller(req);
    if (authCtx.error) {
      return res.status(authCtx.status || 401).json({ success: false, error: authCtx.error });
    }

    const body = parseJsonBody(req);
    const scope = normalizeEnvScope(body.scope);
    if (!scope) {
      return res.status(400).json({ success: false, error: 'Invalid scope. Must be "system" or "tenant".' });
    }

    const access = authorizeScopeAccess(authCtx, scope, body.organizationId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, error: access.error });
    }

    const cleanKey = normalizeEnvKey(body.key);
    if (!cleanKey) {
      return res.status(400).json({
        success: false,
        error: 'A valid environment variable key is required (letters, numbers, and underscores).',
      });
    }

    if (body.value === undefined || body.value === null || String(body.value).trim() === '') {
      return res.status(400).json({ success: false, error: 'Value is required.' });
    }

    const cleanVal = String(body.value).trim();
    const cleanDesc =
      body.description !== undefined && body.description !== null
        ? String(body.description).trim().slice(0, 500) || null
        : null;
    const nowIso = new Date().toISOString();

    const { dbClient, adminClient } = authCtx;
    const client = dbClient || adminClient;

    if (scope === 'tenant') {
      const orgId = access.organizationId;
      const upsertRow = {
        organization_id: orgId,
        key: cleanKey,
        value: cleanVal,
        description: cleanDesc,
        updated_at: nowIso,
      };

      let { error } = await client
        .from('tenant_env_vars')
        .upsert(upsertRow, { onConflict: 'organization_id,key' });

      if (error && isMissingTableError(error)) {
        const provisioned = await tryAutoProvisionTables(adminClient);
        if (provisioned) {
          ({ error } = await client
            .from('tenant_env_vars')
            .upsert(upsertRow, { onConflict: 'organization_id,key' }));
        }
      }

      if (error && isMissingTableError(error)) {
        const { error: settingsErr } = await client
          .from('tenant_settings')
          .upsert(
            {
              organization_id: orgId,
              setting_key: cleanKey,
              setting_value: cleanVal,
              updated_at: nowIso,
            },
            { onConflict: 'organization_id,setting_key' }
          );
        if (!settingsErr) {
          syncRuntimeEnvIfNeeded(cleanKey, cleanVal);
          return res.status(200).json({
            success: true,
            source: 'tenant_settings',
            message: `Saved ${cleanKey} to tenant_settings`,
          });
        }
      }

      if (error) {
        const isRls = String(error.code || '') === '42501' || /row-level security/i.test(String(error.message || ''));
        if (isRls && !authCtx.hasServiceRole) {
          return res.status(403).json({
            success: false,
            error: 'Server database role (SUPABASE_SERVICE_ROLE_KEY) is not configured for password sessions. Sign in with your Supabase Auth password or add SUPABASE_SERVICE_ROLE_KEY to your deployment environment variables.',
          });
        }
        return res.status(500).json({ success: false, error: error.message || 'Failed to save tenant variable.' });
      }

      syncRuntimeEnvIfNeeded(cleanKey, cleanVal);
      return res.status(200).json({
        success: true,
        source: 'tenant_env_vars',
        message: `Saved ${cleanKey} to tenant_env_vars`,
      });
    }

    const upsertRow = {
      key: cleanKey,
      value: cleanVal,
      description: cleanDesc,
      updated_at: nowIso,
    };

    let { error } = await client
      .from('app_env_vars')
      .upsert(upsertRow, { onConflict: 'key' });

    if (error && isMissingTableError(error)) {
      const provisioned = await tryAutoProvisionTables(adminClient);
      if (provisioned) {
        ({ error } = await client
          .from('app_env_vars')
          .upsert(upsertRow, { onConflict: 'key' }));
      }
    }

    if (error && isMissingTableError(error)) {
      const { error: settingsErr } = await client
        .from('system_settings')
        .upsert(
          {
            setting_key: cleanKey,
            setting_value: cleanVal,
            updated_at: nowIso,
          },
          { onConflict: 'setting_key' }
        );
      if (!settingsErr) {
        syncRuntimeEnvIfNeeded(cleanKey, cleanVal);
        return res.status(200).json({
          success: true,
          source: 'system_settings',
          message: `Saved ${cleanKey} to system_settings`,
        });
      }
    }

    if (error) {
      const isRls = String(error.code || '') === '42501' || /row-level security/i.test(String(error.message || ''));
      if (isRls && !authCtx.hasServiceRole) {
        return res.status(403).json({
          success: false,
          error: 'Server database role (SUPABASE_SERVICE_ROLE_KEY) is not configured for password sessions. Sign in with your Supabase Auth password or add SUPABASE_SERVICE_ROLE_KEY to your deployment environment variables.',
        });
      }
      return res.status(500).json({ success: false, error: error.message || 'Failed to save system variable.' });
    }

    syncRuntimeEnvIfNeeded(cleanKey, cleanVal);
    return res.status(200).json({
      success: true,
      source: 'app_env_vars',
      message: `Saved ${cleanKey} to app_env_vars`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Server error while saving environment variable.',
    });
  }
}
