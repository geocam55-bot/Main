import {
  SUPER_ADMIN_EMAILS,
  getClaimedSuperAdminRecord,
  getSupabaseEnv,
  parseJsonBody,
  saveClaimedSuperAdminRecord,
  setAppSessionCookie,
  signAppSessionToken,
} from '../_lib/secureEnvHelper.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const origin = req.headers?.origin;
  if (origin && /^https?:\/\//i.test(String(origin))) {
    res.setHeader('Access-Control-Allow-Origin', String(origin));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = parseJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !SUPER_ADMIN_EMAILS.has(email)) {
      return res.status(403).json({
        success: false,
        error: 'Only an authorized Super Admin email can complete first-run setup.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Please choose a password of at least 8 characters.',
      });
    }

    if (String(process.env.SUPERADMIN_PASSWORD || '').trim()) {
      return res.status(409).json({
        success: false,
        error: 'A server Super Admin passcode is already configured via environment settings.',
      });
    }

    const { adminClient, hasServiceRole } = getSupabaseEnv();
    if (!hasServiceRole) {
      return res.status(503).json({
        success: false,
        error: 'Server database role is not configured yet. Set SUPERADMIN_PASSWORD or SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    const existing = await getClaimedSuperAdminRecord(adminClient);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Super Admin access has already been claimed. Please sign in with your password.',
      });
    }

    const saved = await saveClaimedSuperAdminRecord(adminClient, email, password);
    if (!saved.success) {
      return res.status(500).json({
        success: false,
        error: saved.error || 'Failed to save Super Admin credential.',
      });
    }

    const userId = 'USR-SUPER-ADMIN-01';
    const userObj = {
      id: userId,
      email,
      name: email === 'superadmin@prospaces.com' ? 'ProSpaces Super Admin' : 'George Campbell',
      role: 'super_admin',
      tenantId: 'rona_atlantic',
      organization_id: 'rona_atlantic',
    };
    const signedToken = signAppSessionToken({
      sub: userId,
      email,
      role: 'super_admin',
      organizationId: 'rona_atlantic',
    });
    if (signedToken) {
      setAppSessionCookie(res, signedToken, req);
    }

    return res.status(200).json({
      success: true,
      found: true,
      user: userObj,
      token: signedToken || undefined,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to claim Super Admin access.',
    });
  }
}
