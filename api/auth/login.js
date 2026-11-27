import {
  SUPER_ADMIN_EMAILS,
  getClaimedSuperAdminRecord,
  getSupabaseEnv,
  parseJsonBody,
  setAppSessionCookie,
  signAppSessionToken,
  verifyPasswordScrypt,
} from '../_lib/secureEnvHelper.js';
import { deserializeFromPhone } from '../_lib/tenantHelper.js';

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
    return res.status(405).json({ success: false, found: false, error: 'Method not allowed' });
  }

  try {
    const body = parseJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        found: false,
        error: 'Email and password are required.',
      });
    }

    const { adminClient, hasServiceRole } = getSupabaseEnv();

    // 1. Primary authentication via Supabase Auth
    try {
      const { data: authData, error: authErr } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });
      if (!authErr && authData?.session?.access_token && authData?.user) {
        let userRole = String(authData.user.user_metadata?.role || '');
        let organizationId =
          authData.user.user_metadata?.organization_id ||
          authData.user.user_metadata?.organizationId ||
          'rona_atlantic';
        let displayName =
          authData.user.user_metadata?.name ||
          authData.user.user_metadata?.full_name ||
          email.split('@')[0];

        try {
          const { data: profile } = await adminClient
            .from('profiles')
            .select('name, role, organization_id')
            .eq('id', authData.user.id)
            .maybeSingle();
          if (profile) {
            if (profile.name) displayName = profile.name;
            if (profile.role) userRole = profile.role;
            if (profile.organization_id) organizationId = profile.organization_id;
          }
        } catch {}

        if ((!userRole || userRole === 'standard_user' || userRole.toLowerCase() === 'admin') && SUPER_ADMIN_EMAILS.has(email)) {
          userRole = 'super_admin';
        }

        const appSessionToken = signAppSessionToken({
          sub: authData.user.id,
          email: authData.user.email || email,
          role: userRole || 'standard_user',
          organizationId,
        });
        if (appSessionToken) {
          setAppSessionCookie(res, appSessionToken, req);
        }

        return res.status(200).json({
          success: true,
          found: true,
          user: {
            id: authData.user.id,
            email: authData.user.email || email,
            name: displayName,
            role: userRole || 'standard_user',
            tenantId: organizationId,
            organization_id: organizationId,
          },
          token: authData.session.access_token,
          appToken: appSessionToken || undefined,
          session: authData.session,
        });
      }
    } catch {}

    // 2. Super Admin env-configured password verification (if configured in environment)
    const configuredSuperPass = String(process.env.SUPERADMIN_PASSWORD || '').trim();
    if (configuredSuperPass && SUPER_ADMIN_EMAILS.has(email)) {
      if (password === configuredSuperPass) {
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
      }
      return res.status(401).json({
        success: false,
        found: true,
        error: 'Invalid email or password.',
      });
    }

    // 3. Claimed Super Admin scrypt-hashed password verification
    const claimedRecord = await getClaimedSuperAdminRecord(adminClient);
    if (claimedRecord && SUPER_ADMIN_EMAILS.has(email)) {
      if (verifyPasswordScrypt(password, claimedRecord.hash)) {
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
      }
      return res.status(401).json({
        success: false,
        found: true,
        error: 'Invalid email or password.',
      });
    }

    // 4. Logistics / Tenant users table verification
    try {
      const { data: rows } = await adminClient
        .from('users')
        .select('*')
        .ilike('email', email)
        .limit(5);

      for (const rawRow of rows || []) {
        const userRow = deserializeFromPhone(rawRow);
        if (!userRow || userRow.status === 'Inactive') continue;
        const storedPass = String(userRow.password || '');
        const passMatches = storedPass.startsWith('scrypt:')
          ? verifyPasswordScrypt(password, storedPass)
          : Boolean(storedPass && storedPass === password);
        if (passMatches) {
          const tenantId = userRow.tenant_id || userRow.tenantId || 'rona_atlantic';
          const role = SUPER_ADMIN_EMAILS.has(email) ? 'super_admin' : (userRow.role || 'User');
          const signedToken = signAppSessionToken({
            sub: String(userRow.id),
            email: String(userRow.email || email).toLowerCase(),
            role,
            organizationId: tenantId,
          });
          if (signedToken) {
            setAppSessionCookie(res, signedToken, req);
          }
          return res.status(200).json({
            success: true,
            found: true,
            user: {
              id: userRow.id,
              tenantId,
              organization_id: tenantId,
              name: userRow.name || email.split('@')[0],
              email: userRow.email || email,
              role,
              roles: userRow.roles,
              associatedStoreId: userRow.associatedStoreId || userRow.associated_store_id || 'DC-WINAMILL',
              phone: userRow.phone || '',
              status: userRow.status || 'Active',
            },
            token: signedToken || undefined,
          });
        }
      }
    } catch {}

    if (SUPER_ADMIN_EMAILS.has(email) && !claimedRecord && !configuredSuperPass) {
      if (hasServiceRole) {
        return res.status(401).json({
          success: false,
          found: false,
          needsClaim: true,
          error: 'Super Admin password has not been set on the server yet. Set your Super Admin password to continue.',
        });
      }
      return res.status(401).json({
        success: false,
        found: false,
        needsClaim: false,
        error: 'Invalid email or password. Sign in with your Supabase Auth password (or use "Forgot password?"), or set SUPERADMIN_PASSWORD and SUPABASE_SERVICE_ROLE_KEY in your deployment settings.',
      });
    }

    return res.status(401).json({
      success: false,
      found: false,
      error: 'Invalid email or password.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      found: false,
      error: err instanceof Error ? err.message : 'Authentication error.',
    });
  }
}
