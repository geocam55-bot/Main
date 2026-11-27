import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const FALLBACK_SUPABASE_URL = 'https://usorqldwroecyxucmtuw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM';

export const AI_MODEL = 'gemini-4-hydrogen';
export const AI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
export const AI_SECONDARY_FALLBACK_MODEL = 'gemini-2.5-flash';

export { Type, ThinkingLevel };

export class AIConfigError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = 'AIConfigError';
    this.statusCode = statusCode;
  }
}

export function getSupabaseConfig() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    FALLBACK_SUPABASE_URL
  )
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, '');

  const publicAnonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_ANON_KEY
  )
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, '');

  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    publicAnonKey
  )
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, '');

  const hasServiceRole = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );

  return {
    supabaseUrl,
    publicAnonKey,
    serviceKey,
    hasServiceRole,
    supabase: createClient(supabaseUrl, serviceKey),
  };
}

export function applyAICorsAndMethodGuard(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-User-Token, X-User-Email, X-Organization-Id, X-Logistics-User-Id, X-Logistics-User-Email, X-Logistics-Tenant-Id, Accept'
  );
  res.setHeader('X-AI-Handler', 'vercel-serverless');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: `Method ${req.method} not allowed. Expected POST.`,
      debug: {
        handler: 'vercel-serverless',
        method: req.method,
        url: req.url,
      },
    });
    return false;
  }

  return true;
}

export function parseRequestBody(req) {
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

export function clampText(value, maxLen) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function canViewSensitiveCost(role) {
  return ['admin', 'super_admin', 'director', 'manager'].includes(normalizeRole(role));
}

export function isTeamWideRole(role) {
  return ['admin', 'super_admin', 'director', 'manager', 'marketing'].includes(normalizeRole(role));
}

function isValidApiKeyCandidate(value) {
  const key = String(value || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'undefined' || key === 'null') {
    return '';
  }
  return key;
}

export async function requireGeminiClient(sbClients = [], organizationId = null) {
  let key = isValidApiKeyCandidate(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  );

  if (!key) {
    const targetKeys = ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY', 'GOOGLE_API_KEY'];
    const seen = new Set();

    for (const client of sbClients) {
      if (!client || seen.has(client)) continue;
      seen.add(client);

      try {
        const { data: appVars } = await client
          .from('app_env_vars')
          .select('key, value')
          .in('key', targetKeys);
        const foundApp = (appVars || []).find((row) => isValidApiKeyCandidate(row?.value));
        if (foundApp) {
          key = isValidApiKeyCandidate(foundApp.value);
          break;
        }
      } catch {}

      try {
        const { data: sysVars } = await client
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', targetKeys);
        const foundSys = (sysVars || []).find((row) => isValidApiKeyCandidate(row?.setting_value));
        if (foundSys) {
          key = isValidApiKeyCandidate(foundSys.setting_value);
          break;
        }
      } catch {}

      if (organizationId && organizationId !== 'default-org') {
        try {
          const { data: tenantVars } = await client
            .from('tenant_env_vars')
            .select('key, value')
            .eq('organization_id', organizationId)
            .in('key', targetKeys);
          const foundTenant = (tenantVars || []).find((row) => isValidApiKeyCandidate(row?.value));
          if (foundTenant) {
            key = isValidApiKeyCandidate(foundTenant.value);
            break;
          }
        } catch {}

        try {
          const { data: tenantSettings } = await client
            .from('tenant_settings')
            .select('setting_key, setting_value')
            .eq('organization_id', organizationId)
            .in('setting_key', targetKeys);
          const foundTenantSetting = (tenantSettings || []).find((row) =>
            isValidApiKeyCandidate(row?.setting_value)
          );
          if (foundTenantSetting) {
            key = isValidApiKeyCandidate(foundTenantSetting.setting_value);
            break;
          }
        } catch {}
      }
    }
  }

  if (!key) {
    throw new AIConfigError(
      'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Super Admin > Settings > System Variables or Vercel Environment Variables.',
      503
    );
  }

  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractReadableErrorMessage(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      const inner = parsed?.error?.message || parsed?.message;
      if (typeof inner === 'string' && inner.trim()) {
        return extractReadableErrorMessage(inner);
      }
    } catch {}
  }
  return text;
}

function isTransientCapacityError(err) {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /\b(503|502|504|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|try again/i.test(msg);
}

function isModelUnavailableError(err) {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /\b404\b|not found|not supported|unknown model|invalid model/i.test(msg);
}

function parseModelJsonObject(rawText) {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!cleaned) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini returned an unexpected response format. Please try again.');
  }
  return parsed;
}

export async function generateGeminiJSONWithRetry(client, contents, config, requiredNonEmptyField) {
  const attempts = [
    { model: AI_MODEL, delayMs: 0 },
    { model: AI_MODEL, delayMs: 650 },
    { model: AI_FALLBACK_MODEL, delayMs: 400 },
    { model: AI_SECONDARY_FALLBACK_MODEL, delayMs: 250, dropThinking: true },
  ];

  let lastErr;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    const effectiveConfig = { ...config };
    if (attempt.dropThinking) {
      delete effectiveConfig.thinkingConfig;
    }
    try {
      const response = await client.models.generateContent({
        model: attempt.model,
        contents,
        config: effectiveConfig,
      });
      const parsed = parseModelJsonObject(response.text);
      if (requiredNonEmptyField && !String(parsed[requiredNonEmptyField] || '').trim()) {
        throw new Error(`Gemini response was missing ${requiredNonEmptyField}.`);
      }
      return parsed;
    } catch (err) {
      lastErr = err;
      if (
        !isTransientCapacityError(err) &&
        !isModelUnavailableError(err) &&
        !(err instanceof Error && /empty response|missing /i.test(err.message))
      ) {
        throw err;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'AI request failed.'));
}

export function handleGeminiRouteError(res, err, fallbackMessage, routeName = 'unknown') {
  res.setHeader('X-AI-Handler', 'vercel-serverless');
  const debug = {
    handler: 'vercel-serverless',
    route: routeName,
    timestamp: new Date().toISOString(),
  };

  if (err instanceof AIConfigError) {
    return res.status(err.statusCode).json({ error: err.message, debug });
  }
  const rawMsg = err instanceof Error ? err.message : String(err || fallbackMessage);
  const msg = extractReadableErrorMessage(rawMsg) || fallbackMessage;
  const statusMatch = rawMsg.match(/\b(400|401|403|404|429|500|502|503)\b/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : 500;
  if (statusCode === 400 || statusCode === 403 || /api key/i.test(msg)) {
    return res.status(statusCode === 400 || statusCode === 403 ? statusCode : 400).json({
      error: `Gemini API key error: ${msg}. Please verify GEMINI_API_KEY in Super Admin > Settings > System Variables or Vercel Environment Variables.`,
      debug,
    });
  }
  if (statusCode === 429) {
    return res.status(429).json({
      error: 'Gemini API rate limit reached. Please wait a moment and try again.',
      debug,
    });
  }
  if (statusCode === 503 || /high demand|UNAVAILABLE/i.test(msg)) {
    return res.status(503).json({
      error: 'Gemini AI is temporarily busy due to high demand. Please click Ask AI again in a few seconds.',
      debug,
    });
  }
  return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    error: msg || fallbackMessage,
    debug,
  });
}

export async function resolveCRMAuthContext(req, bodyData = {}) {
  const { supabase, supabaseUrl, publicAnonKey, hasServiceRole } = getSupabaseConfig();

  const rawUserToken = req.headers?.['x-user-token'];
  const rawAuth = req.headers?.authorization;
  const xUserToken = Array.isArray(rawUserToken) ? rawUserToken[0] : rawUserToken;
  const bearerAuth =
    typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')
      ? rawAuth.slice(7).trim()
      : '';

  const candidateTokens = [xUserToken, bearerAuth && bearerAuth !== publicAnonKey ? bearerAuth : '']
    .map((t) => String(t || '').trim())
    .filter((t) => t.split('.').length === 3 && !t.startsWith('admin-fallback-token-'));

  for (const token of candidateTokens) {
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) continue;

    const userId = authData.user.id;
    const userEmail = authData.user.email || '';
    const clientSb = hasServiceRole
      ? supabase
      : createClient(supabaseUrl, publicAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

    let userRole = String(authData.user.user_metadata?.role || '');
    let organizationId = authData.user.user_metadata?.organization_id
      ? String(authData.user.user_metadata.organization_id)
      : null;

    try {
      const { data: profile } = await clientSb
        .from('profiles')
        .select('id, email, organization_id, role')
        .eq('id', userId)
        .maybeSingle();
      if (profile) {
        userRole = profile.role || userRole;
        organizationId = profile.organization_id || organizationId;
      }
    } catch {}

    if (!organizationId) {
      try {
        const { data: membership } = await clientSb
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (membership) {
          userRole = membership.role || userRole;
          organizationId = membership.organization_id || organizationId;
        }
      } catch {}
    }

    if (!organizationId || !userRole) {
      try {
        const { data: kvUser } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', `user:${userId}`)
          .maybeSingle();
        if (kvUser?.value && typeof kvUser.value === 'object') {
          const val = kvUser.value;
          userRole = userRole || String(val.role || '');
          organizationId = organizationId || val.organizationId || val.organization_id || null;
        }
      } catch {}
    }

    if (!organizationId && userEmail) {
      try {
        const { data: kvEmail } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', `user:email:${userEmail.toLowerCase().trim()}`)
          .maybeSingle();
        if (kvEmail?.value) {
          const { data: kvUser } = await supabase
            .from('kv_store_8405be07')
            .select('value')
            .eq('key', `user:${kvEmail.value}`)
            .maybeSingle();
          if (kvUser?.value && typeof kvUser.value === 'object') {
            const val = kvUser.value;
            userRole = userRole || String(val.role || '');
            organizationId = val.organizationId || val.organization_id || organizationId;
          }
        }
      } catch {}
    }

    const bodyOrg = clampText(
      bodyData?.organizationId || bodyData?.organization_id || req.headers?.['x-organization-id'],
      120
    );
    if (!organizationId && bodyOrg && bodyOrg !== 'default-org') {
      organizationId = bodyOrg;
    }

    return {
      supabase,
      clientSb,
      userId,
      userEmail,
      userRole: userRole || 'standard_user',
      organizationId,
      authMode: 'supabase-jwt',
    };
  }

  const fallbackEmail = String(
    bodyData?.email || req.headers?.['x-user-email'] || 'geocam55@gmail.com'
  )
    .trim()
    .toLowerCase();
  let fallbackUserId = 'admin-fallback-user';
  let fallbackRole = 'admin';
  let fallbackOrgId = String(
    bodyData?.organizationId || bodyData?.organization_id || req.headers?.['x-organization-id'] || ''
  ).trim();

  if (!fallbackOrgId || fallbackOrgId === 'default-org') {
    try {
      const { data: kvEmail } = await supabase
        .from('kv_store_8405be07')
        .select('value')
        .eq('key', `user:email:${fallbackEmail}`)
        .maybeSingle();
      if (kvEmail?.value) {
        fallbackUserId = String(kvEmail.value);
        const { data: kvUser } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', `user:${kvEmail.value}`)
          .maybeSingle();
        if (kvUser?.value && typeof kvUser.value === 'object') {
          const val = kvUser.value;
          fallbackOrgId = String(val.organizationId || val.organization_id || fallbackOrgId || '');
          fallbackRole = String(val.role || fallbackRole);
        }
      }
    } catch {}
  }

  return {
    supabase,
    clientSb: supabase,
    userId: fallbackUserId,
    userEmail: fallbackEmail,
    userRole: fallbackRole,
    organizationId: fallbackOrgId || 'default-org',
    authMode: 'logistics-session',
  };
}

export async function resolveLogisticsAuthContext(req, bodyData = {}) {
  const jwtCtx = await resolveCRMAuthContext(req, bodyData);
  const { supabase } = getSupabaseConfig();

  const logisticsUserId = clampText(req.headers?.['x-logistics-user-id'], 120);
  const logisticsTenantId = clampText(req.headers?.['x-logistics-tenant-id'], 120);
  const logisticsUserEmail = clampText(req.headers?.['x-logistics-user-email'], 160).toLowerCase();

  if (logisticsUserId || logisticsUserEmail) {
    try {
      let query = supabase.from('logistics_users').select('id, name, email, role, tenant_id, phone').limit(5);
      if (logisticsUserId) {
        query = query.eq('id', logisticsUserId);
      } else {
        query = query.ilike('email', logisticsUserEmail);
      }
      const { data: users } = await query;
      if (users && users.length > 0) {
        const matched =
          users.find((u) => !logisticsTenantId || !u.tenant_id || u.tenant_id === logisticsTenantId) ||
          users[0];
        if (matched && !String(matched.phone || '').includes('||status:Inactive')) {
          return {
            supabase,
            clientSb: supabase,
            userId: String(matched.id),
            userEmail: String(matched.email || ''),
            userRole: String(matched.role || 'dispatcher'),
            organizationId: matched.tenant_id || logisticsTenantId || null,
            authMode: 'logistics-session',
          };
        }
      }
    } catch {}

    if (logisticsTenantId) {
      try {
        const { data: stateRow } = await supabase
          .from('logistics_tenant_state')
          .select('users')
          .eq('tenant_id', logisticsTenantId)
          .maybeSingle();
        const tenantUsers = Array.isArray(stateRow?.users) ? stateRow.users : [];
        const matched = tenantUsers.find(
          (u) =>
            u &&
            ((logisticsUserId && String(u.id) === logisticsUserId) ||
              (logisticsUserEmail && String(u.email || '').toLowerCase() === logisticsUserEmail))
        );
        if (matched && matched.status !== 'Inactive') {
          return {
            supabase,
            clientSb: supabase,
            userId: String(matched.id || logisticsUserId),
            userEmail: String(matched.email || logisticsUserEmail),
            userRole: String(matched.role || 'dispatcher'),
            organizationId: logisticsTenantId,
            authMode: 'logistics-session',
          };
        }
      } catch {}
    }
  }

  return jwtCtx;
}
