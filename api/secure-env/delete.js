import {
  applySecureEnvCorsAndMethodGuard,
  authenticateSecureEnvCaller,
  authorizeScopeAccess,
  isMissingTableError,
  normalizeEnvKey,
  normalizeEnvScope,
  parseJsonBody,
} from '../_lib/secureEnvHelper.js';

export default async function handler(req, res) {
  if (!applySecureEnvCorsAndMethodGuard(req, res, ['POST', 'DELETE', 'OPTIONS'])) return;

  try {
    const authCtx = await authenticateSecureEnvCaller(req);
    if (authCtx.error) {
      return res.status(authCtx.status || 401).json({ success: false, error: authCtx.error });
    }

    const body = parseJsonBody(req);
    const scope = normalizeEnvScope(body.scope || req.query?.scope);
    if (!scope) {
      return res.status(400).json({ success: false, error: 'Invalid scope. Must be "system" or "tenant".' });
    }

    const access = authorizeScopeAccess(authCtx, scope, body.organizationId || req.query?.organizationId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, error: access.error });
    }

    const cleanKey = normalizeEnvKey(body.key || req.query?.key);
    if (!cleanKey) {
      return res.status(400).json({ success: false, error: 'A valid environment variable key is required.' });
    }

    const { dbClient, adminClient } = authCtx;
    const client = dbClient || adminClient;

    if (scope === 'tenant') {
      const orgId = access.organizationId;
      const { error } = await client
        .from('tenant_env_vars')
        .delete()
        .eq('organization_id', orgId)
        .eq('key', cleanKey);

      if (error && isMissingTableError(error)) {
        const { error: settingsErr } = await client
          .from('tenant_settings')
          .delete()
          .eq('organization_id', orgId)
          .eq('setting_key', cleanKey);
        if (!settingsErr) {
          return res.status(200).json({
            success: true,
            message: `Deleted ${cleanKey} from tenant_settings`,
          });
        }
      }

      if (error) {
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete tenant variable.' });
      }
      return res.status(200).json({
        success: true,
        message: `Deleted ${cleanKey} from tenant_env_vars`,
      });
    }

    const { error } = await client.from('app_env_vars').delete().eq('key', cleanKey);

    if (error && isMissingTableError(error)) {
      const { error: settingsErr } = await client
        .from('system_settings')
        .delete()
        .eq('setting_key', cleanKey);
      if (!settingsErr) {
        return res.status(200).json({
          success: true,
          message: `Deleted ${cleanKey} from system_settings`,
        });
      }
    }

    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete system variable.' });
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${cleanKey} from app_env_vars`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Server error while deleting environment variable.',
    });
  }
}
