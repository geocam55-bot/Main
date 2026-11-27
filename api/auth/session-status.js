import {
  applySecureEnvCorsAndMethodGuard,
  authenticateSecureEnvCaller,
  getClaimedSuperAdminRecord,
  getSupabaseEnv,
} from '../_lib/secureEnvHelper.js';

export default async function handler(req, res) {
  if (!applySecureEnvCorsAndMethodGuard(req, res, ['GET', 'OPTIONS'])) return;

  try {
    const { adminClient, hasServiceRole } = getSupabaseEnv();
    const hasConfiguredPasscode = Boolean(String(process.env.SUPERADMIN_PASSWORD || '').trim());
    const claimedRecord = await getClaimedSuperAdminRecord(adminClient);
    const superAdminClaimed = hasConfiguredPasscode || Boolean(claimedRecord);

    const authCtx = await authenticateSecureEnvCaller(req);
    if (authCtx.error) {
      return res.status(200).json({
        success: true,
        authenticated: false,
        superAdminClaimed,
        hasConfiguredPasscode,
        hasServiceRole,
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      superAdminClaimed,
      hasConfiguredPasscode,
      hasServiceRole,
      user: {
        id: authCtx.userId,
        email: authCtx.userEmail,
        role: authCtx.userRole,
        isSuperAdmin: authCtx.isSuperAdmin,
        isAdmin: authCtx.isAdmin,
        organizationId: authCtx.organizationId,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      authenticated: false,
      error: err instanceof Error ? err.message : 'Session status check failed.',
    });
  }
}
