import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://usorqldwroecyxucmtuw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM';

export const SECURE_ENV_DDL = `
CREATE TABLE IF NOT EXISTS public.app_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_env_vars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated or service role to manage app_env_vars" ON public.app_env_vars;
CREATE POLICY "Allow authenticated or service role to manage app_env_vars" ON public.app_env_vars
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.tenant_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT tenant_env_vars_org_key_unique UNIQUE (organization_id, key)
);
ALTER TABLE public.tenant_env_vars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated or service role to manage tenant_env_vars" ON public.tenant_env_vars;
CREATE POLICY "Allow authenticated or service role to manage tenant_env_vars" ON public.tenant_env_vars
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');
`;

const SUPER_ADMIN_EMAILS = new Set([
  'superadmin@prospaces.com',
  'george.campbell@prospaces.com',
  'geocam55@gmail.com',
]);

function cleanEnv(val) {
  return String(val || '')
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, '');
}

export function getSupabaseEnv() {
  const supabaseUrl =
    cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) || FALLBACK_SUPABASE_URL;
  const publicAnonKey =
    cleanEnv(
      process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY
    ) || FALLBACK_SUPABASE_ANON_KEY;
  const serviceRoleKey = cleanEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );
  const hasServiceRole = Boolean(serviceRoleKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey || publicAnonKey, {
    auth: { persistSession: false },
  });

  return {
    supabaseUrl,
    publicAnonKey,
    hasServiceRole,
    adminClient,
  };
}

function getSigningSecret() {
  return cleanEnv(
    process.env.SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY
  );
}

export function signAppSessionToken(claims, ttlSeconds = 12 * 3600) {
  const secret = getSigningSecret();
  if (!secret) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const payloadObj = {
    ...claims,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sigB64 = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `hs1.${payloadB64}.${sigB64}`;
}

export function verifyAppSessionToken(token) {
  const secret = getSigningSecret();
  if (!secret || typeof token !== 'string' || !token.startsWith('hs1.')) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [, payloadB64, sigB64] = parts;
  const expectedB64 = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedB64);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function applySecureEnvCorsAndMethodGuard(req, res, allowedMethods = ['POST', 'OPTIONS']) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const origin = req.headers?.origin;
  if (origin && /^https?:\/\//i.test(String(origin))) {
    res.setHeader('Access-Control-Allow-Origin', String(origin));
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-User-Token, X-App-Session, X-Organization-Id, Accept'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  if (!allowedMethods.includes(req.method)) {
    res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed.`,
    });
    return false;
  }

  return true;
}

export function parseJsonBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? req.body : {};
}

export function normalizeEnvScope(rawScope) {
  const s = String(rawScope || 'system').trim().toLowerCase();
  if (s === 'system' || s === 'tenant') return s;
  return null;
}

export function normalizeEnvKey(rawKey) {
  const cleaned = String(rawKey || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
  if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(cleaned)) {
    return '';
  }
  return cleaned;
}

export function normalizeOrgId(rawOrgId) {
  const cleaned = String(rawOrgId || '').trim();
  if (!cleaned || cleaned.length > 128) return '';
  return cleaned;
}

function isSuperAdminRoleOrEmail(role, email) {
  const r = String(role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const e = String(email || '').toLowerCase().trim();
  if (r === 'super_admin' || r === 'superadmin') return true;
  if (r === 'admin' && (SUPER_ADMIN_EMAILS.has(e) || e.includes('superadmin'))) {
    return true;
  }
  return false;
}

function isAdminRole(role) {
  const r = String(role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  return r === 'super_admin' || r === 'superadmin' || r === 'admin';
}

export async function authenticateSecureEnvCaller(req) {
  const { supabaseUrl, publicAnonKey, hasServiceRole, adminClient } = getSupabaseEnv();

  const rawAppSession = req.headers?.['x-app-session'];
  const appSessionToken = Array.isArray(rawAppSession) ? rawAppSession[0] : rawAppSession;
  if (appSessionToken && String(appSessionToken).startsWith('hs1.')) {
    const claims = verifyAppSessionToken(String(appSessionToken).trim());
    if (claims && claims.sub) {
      const role = String(claims.role || 'standard_user');
      const email = String(claims.email || '').toLowerCase().trim();
      const organizationId = claims.organizationId ? String(claims.organizationId) : null;
      return {
        error: null,
        status: 200,
        userId: String(claims.sub),
        userEmail: email,
        userRole: role,
        isSuperAdmin: isSuperAdminRoleOrEmail(role, email),
        isAdmin: isAdminRole(role) || isSuperAdminRoleOrEmail(role, email),
        organizationId,
        dbClient: adminClient,
        adminClient,
        hasServiceRole,
      };
    }
  }

  const rawUserToken = req.headers?.['x-user-token'];
  const xUserToken = Array.isArray(rawUserToken) ? rawUserToken[0] : rawUserToken;
  const rawAuth = req.headers?.authorization;
  const bearerAuth =
    typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : '';

  const candidateTokens = [
    xUserToken,
    bearerAuth && bearerAuth !== publicAnonKey ? bearerAuth : '',
  ]
    .map((t) => String(t || '').trim())
    .filter((t) => t.split('.').length === 3 && !t.startsWith('admin-fallback-token-') && !t.startsWith('hs1.'));

  for (const token of candidateTokens) {
    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !authData?.user) continue;

    const user = authData.user;
    const userId = user.id;
    const userEmail = String(user.email || '').toLowerCase().trim();

    const userScopedClient = createClient(supabaseUrl, publicAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const dbClient = hasServiceRole ? adminClient : userScopedClient;

    let userRole = String(user.user_metadata?.role || '');
    let organizationId = user.user_metadata?.organization_id
      ? String(user.user_metadata.organization_id)
      : user.user_metadata?.organizationId
        ? String(user.user_metadata.organizationId)
        : null;

    try {
      const { data: profile } = await dbClient
        .from('profiles')
        .select('role, organization_id')
        .eq('id', userId)
        .maybeSingle();
      if (profile) {
        if (profile.role) userRole = String(profile.role);
        if (profile.organization_id) organizationId = String(profile.organization_id);
      }
    } catch {}

    if (!organizationId || !userRole) {
      try {
        const { data: membership } = await dbClient
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (membership) {
          if (!userRole && membership.role) userRole = String(membership.role);
          if (!organizationId && membership.organization_id) {
            organizationId = String(membership.organization_id);
          }
        }
      } catch {}
    }

    if (!organizationId || !userRole) {
      try {
        const { data: kvUser } = await adminClient
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', `user:${userId}`)
          .maybeSingle();
        if (kvUser?.value && typeof kvUser.value === 'object') {
          if (!userRole && kvUser.value.role) userRole = String(kvUser.value.role);
          if (!organizationId && (kvUser.value.organizationId || kvUser.value.organization_id)) {
            organizationId = String(kvUser.value.organizationId || kvUser.value.organization_id);
          }
        }
      } catch {}
    }

    if ((!userRole || userRole === 'standard_user') && SUPER_ADMIN_EMAILS.has(userEmail)) {
      userRole = 'super_admin';
    }

    return {
      error: null,
      status: 200,
      userId,
      userEmail,
      userRole: userRole || 'standard_user',
      isSuperAdmin: isSuperAdminRoleOrEmail(userRole || 'standard_user', userEmail),
      isAdmin: isAdminRole(userRole) || isSuperAdminRoleOrEmail(userRole, userEmail),
      organizationId,
      dbClient,
      adminClient,
      hasServiceRole,
    };
  }

  return {
    error: 'Authentication required. Please sign in again to manage environment variables.',
    status: 401,
  };
}

export function authorizeScopeAccess(ctx, scope, requestedOrgId) {
  if (scope === 'system') {
    if (!ctx.isSuperAdmin) {
      return {
        allowed: false,
        status: 403,
        error: 'Forbidden: Super Admin privileges are required to manage system variables.',
      };
    }
    return { allowed: true, organizationId: null };
  }

  if (!ctx.isAdmin) {
    return {
      allowed: false,
      status: 403,
      error: 'Forbidden: Admin privileges are required to manage tenant variables.',
    };
  }

  const orgId = normalizeOrgId(requestedOrgId || ctx.organizationId);
  if (!orgId) {
    return {
      allowed: false,
      status: 400,
      error: 'organizationId is required for tenant variables.',
    };
  }

  if (!ctx.isSuperAdmin && ctx.organizationId && ctx.organizationId !== orgId) {
    return {
      allowed: false,
      status: 403,
      error: 'Forbidden: Cannot access variables belonging to another organization.',
    };
  }

  return { allowed: true, organizationId: orgId };
}

export function isMissingTableError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    /does not exist|Could not find the table/i.test(msg)
  );
}

export async function tryAutoProvisionTables(client) {
  try {
    const { error } = await client.rpc('exec_sql', { sql: SECURE_ENV_DDL });
    return !error;
  } catch {
    return false;
  }
}

export function syncRuntimeEnvIfNeeded(key, value) {
  if (key.includes('MAPS') || key.includes('GOOGLE_MAPS')) {
    process.env.GOOGLE_MAPS_PLATFORM_KEY = value;
    process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY = value;
    process.env.GOOGLE_MAPS_API_KEY = value;
  }
  if (key === 'GEMINI_API_KEY' || key === 'GOOGLE_GEMINI_API_KEY' || key === 'GOOGLE_API_KEY') {
    process.env.GEMINI_API_KEY = value;
  }
}
