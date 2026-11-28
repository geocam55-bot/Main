import { createClient } from './supabase/client';
import { getServerHeaders } from './server-headers';

const supabase = createClient();

export interface AppEnvVar {
  id?: string;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export interface TenantEnvVar {
  id?: string;
  organization_id: string;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export interface SecureEnvActionResult {
  success: boolean;
  error?: string;
  requiresAuth?: boolean;
}

// In-memory cache to prevent excessive database calls during a single session
const appEnvCache = new Map<string, string>();
const tenantEnvCache = new Map<string, Map<string, string>>();
let lastSecureEnvError: string | null = null;

export function getLastSecureEnvError(): string | null {
  return lastSecureEnvError;
}

function normalizeEnvKeyClient(key: string): string {
  return String(key || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

function isMissingTableErr(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  return code === 'PGRST205' || code === '42P01' || /does not exist|Could not find the table/i.test(msg);
}

/**
 * Ensure secure env tables exist in Supabase
 */
export async function ensureSecureEnvTables(): Promise<boolean> {
  try {
    const sql = `
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
    const { error } = await supabase.rpc('exec_sql', { sql });
    return !error;
  } catch (err) {
    console.warn('Could not auto-create secure env tables:', err);
    return false;
  }
}

/**
 * Get App-level Environment Variable (Database first, then process.env fallback)
 */
export async function getAppEnv(key: string, fallback: string = ''): Promise<string> {
  if (appEnvCache.has(key)) {
    return appEnvCache.get(key)!;
  }

  try {
    const { data, error } = await supabase
      .from('app_env_vars')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (!error && data && data.value != null) {
      const val = String(data.value);
      appEnvCache.set(key, val);
      return val;
    }
  } catch {}

  const envVal = (
    process.env[key] ||
    process.env[`VITE_${key}`] ||
    process.env[key.toUpperCase()] ||
    fallback
  );

  return envVal;
}

/**
 * Set App-level Environment Variable with detailed result
 */
export async function setAppEnvResult(
  key: string,
  value: string,
  description?: string
): Promise<SecureEnvActionResult> {
  const cleanKey = normalizeEnvKeyClient(key);
  let serverError = '';
  lastSecureEnvError = null;

  // 1. Prioritize server endpoint (enforces auth + bypasses RLS when service role is configured)
  try {
    const headers = await getServerHeaders();
    const resp = await fetch('/api/secure-env/save', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ scope: 'system', key: cleanKey, value, description }),
    });
    const json = await resp.json().catch(() => ({}));
    if (resp.ok && json.success) {
      appEnvCache.set(cleanKey, value);
      return { success: true };
    }
    serverError = json?.error || `Server returned status ${resp.status}`;
    if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
      lastSecureEnvError = serverError;
      return { success: false, error: serverError, requiresAuth: resp.status === 401 };
    }
  } catch (apiErr: any) {
    serverError = apiErr?.message || 'Server endpoint unreachable';
    console.warn('[SecureEnv] Server save app_env failed, falling back to client:', apiErr);
  }

  // 2. Fallback to direct Supabase client (works when user holds a valid Supabase JWT)
  try {
    const nowIso = new Date().toISOString();
    const row = {
      key: cleanKey,
      value,
      description: description || null,
      updated_at: nowIso,
    };

    let { error } = await supabase
      .from('app_env_vars')
      .upsert(row, { onConflict: 'key' });

    if (error && isMissingTableErr(error)) {
      const created = await ensureSecureEnvTables();
      if (created) {
        ({ error } = await supabase.from('app_env_vars').upsert(row, { onConflict: 'key' }));
      }
      if (error && isMissingTableErr(error)) {
        const { error: sysErr } = await supabase
          .from('system_settings')
          .upsert({ setting_key: cleanKey, setting_value: value, updated_at: nowIso }, { onConflict: 'setting_key' });
        if (!sysErr) {
          appEnvCache.set(cleanKey, value);
          return { success: true };
        }
      }
    }

    if (!error) {
      appEnvCache.set(cleanKey, value);
      return { success: true };
    }

    const combinedErr = serverError
      ? `${serverError} (${error.message})`
      : error.message;
    const isAuthErr = String(error?.code || '') === '42501' || /row-level security|JWT|not authorized|authentication/i.test(String(error?.message || ''));
    lastSecureEnvError = combinedErr;
    console.error('[SecureEnv] Client-side app_env upsert failed:', combinedErr);
    return { success: false, error: combinedErr, requiresAuth: isAuthErr };
  } catch (err: any) {
    const errMsg = err?.message || serverError || 'Failed to save system variable';
    lastSecureEnvError = errMsg;
    console.error('[SecureEnv] Client-side app_env upsert exception:', err);
    return { success: false, error: errMsg };
  }
}

/**
 * Set App-level Environment Variable
 */
export async function setAppEnv(key: string, value: string, description?: string): Promise<boolean> {
  const res = await setAppEnvResult(key, value, description);
  return res.success;
}

/**
 * Get Tenant-level Environment Variable (Organization specific, with app-level or process.env fallback)
 */
export async function getTenantEnv(organizationId: string, key: string, fallback: string = ''): Promise<string> {
  if (!organizationId) {
    return getAppEnv(key, fallback);
  }

  let orgCache = tenantEnvCache.get(organizationId);
  if (orgCache && orgCache.has(key)) {
    return orgCache.get(key)!;
  }

  try {
    const { data, error } = await supabase
      .from('tenant_env_vars')
      .select('value')
      .eq('organization_id', organizationId)
      .eq('key', key)
      .maybeSingle();

    if (!error && data && data.value != null) {
      const val = String(data.value);
      if (!tenantEnvCache.has(organizationId)) {
        tenantEnvCache.set(organizationId, new Map());
      }
      tenantEnvCache.get(organizationId)!.set(key, val);
      return val;
    }
  } catch {}

  return getAppEnv(key, fallback);
}

/**
 * Set Tenant-level Environment Variable with detailed result
 */
export async function setTenantEnvResult(
  organizationId: string,
  key: string,
  value: string,
  description?: string
): Promise<SecureEnvActionResult> {
  const targetOrgId = organizationId || 'default_org';
  const cleanKey = normalizeEnvKeyClient(key);
  let serverError = '';
  lastSecureEnvError = null;

  // 1. Prioritize server endpoint
  try {
    const headers = await getServerHeaders();
    const resp = await fetch('/api/secure-env/save', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ scope: 'tenant', organizationId: targetOrgId, key: cleanKey, value, description }),
    });
    const json = await resp.json().catch(() => ({}));
    if (resp.ok && json.success) {
      if (!tenantEnvCache.has(targetOrgId)) {
        tenantEnvCache.set(targetOrgId, new Map());
      }
      tenantEnvCache.get(targetOrgId)!.set(cleanKey, value);
      return { success: true };
    }
    serverError = json?.error || `Server returned status ${resp.status}`;
    if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
      lastSecureEnvError = serverError;
      return { success: false, error: serverError, requiresAuth: resp.status === 401 };
    }
  } catch (apiErr: any) {
    serverError = apiErr?.message || 'Server endpoint unreachable';
    console.warn('[SecureEnv] Server save tenant_env failed, falling back to client:', apiErr);
  }

  // 2. Direct Supabase client fallback
  try {
    const nowIso = new Date().toISOString();
    const row = {
      organization_id: targetOrgId,
      key: cleanKey,
      value,
      description: description || null,
      updated_at: nowIso,
    };

    let { error } = await supabase
      .from('tenant_env_vars')
      .upsert(row, { onConflict: 'organization_id,key' });

    if (error && isMissingTableErr(error)) {
      const created = await ensureSecureEnvTables();
      if (created) {
        ({ error } = await supabase
          .from('tenant_env_vars')
          .upsert(row, { onConflict: 'organization_id,key' }));
      }
      if (error && isMissingTableErr(error)) {
        const { error: settingsErr } = await supabase
          .from('tenant_settings')
          .upsert(
            { organization_id: targetOrgId, setting_key: cleanKey, setting_value: value, updated_at: nowIso },
            { onConflict: 'organization_id,setting_key' }
          );
        if (!settingsErr) {
          if (!tenantEnvCache.has(targetOrgId)) {
            tenantEnvCache.set(targetOrgId, new Map());
          }
          tenantEnvCache.get(targetOrgId)!.set(cleanKey, value);
          return { success: true };
        }
      }
    }

    if (!error) {
      if (!tenantEnvCache.has(targetOrgId)) {
        tenantEnvCache.set(targetOrgId, new Map());
      }
      tenantEnvCache.get(targetOrgId)!.set(cleanKey, value);
      return { success: true };
    }

    const combinedErr = serverError
      ? `${serverError} (${error.message})`
      : error.message;
    const isAuthErr = String(error?.code || '') === '42501' || /row-level security|JWT|not authorized|authentication/i.test(String(error?.message || ''));
    lastSecureEnvError = combinedErr;
    console.error('[SecureEnv] Client-side tenant_env upsert failed:', combinedErr);
    return { success: false, error: combinedErr, requiresAuth: isAuthErr };
  } catch (err: any) {
    const errMsg = err?.message || serverError || 'Failed to save tenant variable';
    lastSecureEnvError = errMsg;
    console.error('[SecureEnv] Client-side tenant_env upsert exception:', err);
    return { success: false, error: errMsg };
  }
}

/**
 * Set Tenant-level Environment Variable
 */
export async function setTenantEnv(organizationId: string, key: string, value: string, description?: string): Promise<boolean> {
  const res = await setTenantEnvResult(organizationId, key, value, description);
  return res.success;
}

/**
 * Get all App-level environment variables
 */
export async function listAppEnv(): Promise<AppEnvVar[]> {
  lastSecureEnvError = null;
  // 1. Server API (Authoritative, enforces auth and uses service-role when configured)
  try {
    const headers = await getServerHeaders();
    const resp = await fetch('/api/secure-env/list?scope=system', { headers, credentials: 'same-origin' });
    const json = await resp.json().catch(() => ({}));
    if (resp.ok && json.success && Array.isArray(json.vars)) {
      return json.vars.filter((v: any) => !String(v?.key || '').startsWith('__'));
    }
    if (resp.status === 401) {
      lastSecureEnvError = json?.error || 'Authentication required';
    }
  } catch (apiErr) {
    console.warn('[SecureEnv] Server list failed, trying client fallback:', apiErr);
  }

  // 2. Fallback to client-side Supabase app_env_vars and kv_store_8405be07
  try {
    const { data, error } = await supabase
      .from('app_env_vars')
      .select('*')
      .order('key');
    let results: AppEnvVar[] = [];
    if (!error && Array.isArray(data)) {
      results = data.filter((v: any) => !String(v?.key || '').startsWith('__'));
    }

    // Also check kv_store_8405be07 for system_env_var:%
    try {
      const { data: kvData } = await supabase
        .from('kv_store_8405be07')
        .select('key, value')
        .like('key', 'system_env_var:%');
      if (Array.isArray(kvData) && kvData.length > 0) {
        const existingKeys = new Set(results.map((v) => v.key));
        for (const row of kvData) {
          const v = row?.value;
          if (v && typeof v === 'object' && v.key && !existingKeys.has(v.key) && !String(v.key).startsWith('__')) {
            results.push(v);
            existingKeys.add(v.key);
          }
        }
      }
    } catch {}

    if (results.length > 0) {
      return results.sort((a, b) => a.key.localeCompare(b.key));
    }

    if (error && isMissingTableErr(error)) {
      const { data: sysData, error: sysErr } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, updated_at');
      if (!sysErr && Array.isArray(sysData)) {
        return sysData
          .filter((r: any) => r?.setting_key && !String(r.setting_key).startsWith('__'))
          .map((r: any) => ({
            key: r.setting_key,
            value: r.setting_value || '',
            updated_at: r.updated_at || undefined,
          }))
          .sort((a: AppEnvVar, b: AppEnvVar) => a.key.localeCompare(b.key));
      }
    }
  } catch {}

  return [];
}

/**
 * Get all Tenant-level environment variables for an organization
 */
export async function listTenantEnv(organizationId: string): Promise<TenantEnvVar[]> {
  const targetOrgId = organizationId || 'default_org';
  lastSecureEnvError = null;

  // 1. Server API (Authoritative)
  try {
    const headers = await getServerHeaders();
    const resp = await fetch(`/api/secure-env/list?scope=tenant&organizationId=${encodeURIComponent(targetOrgId)}`, {
      headers,
      credentials: 'same-origin',
    });
    const json = await resp.json().catch(() => ({}));
    if (resp.ok && json.success && Array.isArray(json.vars)) {
      return json.vars;
    }
    if (resp.status === 401) {
      lastSecureEnvError = json?.error || 'Authentication required';
    }
  } catch (apiErr) {
    console.warn('[SecureEnv] Server list failed, trying client fallback:', apiErr);
  }

  // 2. Fallback to client-side Supabase
  try {
    const { data, error } = await supabase
      .from('tenant_env_vars')
      .select('*')
      .eq('organization_id', targetOrgId)
      .order('key');
    if (!error && data && data.length > 0) return data;
    if (error && isMissingTableErr(error)) {
      const { data: tData, error: tErr } = await supabase
        .from('tenant_settings')
        .select('organization_id, setting_key, setting_value, updated_at')
        .eq('organization_id', targetOrgId);
      if (!tErr && Array.isArray(tData)) {
        return tData
          .filter((r: any) => r?.setting_key)
          .map((r: any) => ({
            organization_id: r.organization_id,
            key: r.setting_key,
            value: r.setting_value || '',
            updated_at: r.updated_at || undefined,
          }))
          .sort((a: TenantEnvVar, b: TenantEnvVar) => a.key.localeCompare(b.key));
      }
    }
  } catch {}

  return [];
}

/**
 * Delete an App-level environment variable with detailed result
 */
export async function deleteAppEnvResult(key: string): Promise<SecureEnvActionResult> {
  const cleanKey = normalizeEnvKeyClient(key);
  let serverError = '';
  lastSecureEnvError = null;

  // 1. Server API first
  try {
    const headers = await getServerHeaders();
    const resp = await fetch('/api/secure-env/delete', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ scope: 'system', key: cleanKey }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success) {
      appEnvCache.delete(cleanKey);
      return { success: true };
    }
    serverError = data?.error || `Server returned status ${resp.status}`;
    if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
      lastSecureEnvError = serverError;
      return { success: false, error: serverError, requiresAuth: resp.status === 401 };
    }
  } catch (apiErr: any) {
    serverError = apiErr?.message || 'Server endpoint unreachable';
  }

  // 2. Fallback to direct Supabase client
  try {
    const { error } = await supabase
      .from('app_env_vars')
      .delete()
      .eq('key', cleanKey);
    if (!error) {
      appEnvCache.delete(cleanKey);
      return { success: true };
    }
    if (isMissingTableErr(error)) {
      const { error: sysErr } = await supabase
        .from('system_settings')
        .delete()
        .eq('setting_key', cleanKey);
      if (!sysErr) {
        appEnvCache.delete(cleanKey);
        return { success: true };
      }
    }
    const errMsg = serverError ? `${serverError} (${error.message})` : error.message;
    const isAuthErr = String(error?.code || '') === '42501' || /row-level security|JWT|not authorized|authentication/i.test(String(error?.message || ''));
    lastSecureEnvError = errMsg;
    return { success: false, error: errMsg, requiresAuth: isAuthErr };
  } catch (err: any) {
    const errMsg = err?.message || serverError || 'Failed to delete system variable';
    lastSecureEnvError = errMsg;
    return { success: false, error: errMsg };
  }
}

/**
 * Delete an App-level environment variable
 */
export async function deleteAppEnv(key: string): Promise<boolean> {
  const res = await deleteAppEnvResult(key);
  return res.success;
}

/**
 * Delete a Tenant-level environment variable with detailed result
 */
export async function deleteTenantEnvResult(organizationId: string, key: string): Promise<SecureEnvActionResult> {
  if (!organizationId) return { success: false, error: 'Organization ID is required' };
  const cleanKey = normalizeEnvKeyClient(key);
  let serverError = '';
  lastSecureEnvError = null;

  // 1. Server API first
  try {
    const headers = await getServerHeaders();
    const resp = await fetch('/api/secure-env/delete', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ scope: 'tenant', organizationId, key: cleanKey }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success) {
      if (tenantEnvCache.has(organizationId)) {
        tenantEnvCache.get(organizationId)!.delete(cleanKey);
      }
      return { success: true };
    }
    serverError = data?.error || `Server returned status ${resp.status}`;
    if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
      lastSecureEnvError = serverError;
      return { success: false, error: serverError, requiresAuth: resp.status === 401 };
    }
  } catch (apiErr: any) {
    serverError = apiErr?.message || 'Server endpoint unreachable';
  }

  // 2. Fallback to direct Supabase client
  try {
    const { error } = await supabase
      .from('tenant_env_vars')
      .delete()
      .eq('organization_id', organizationId)
      .eq('key', cleanKey);
    if (!error) {
      if (tenantEnvCache.has(organizationId)) {
        tenantEnvCache.get(organizationId)!.delete(cleanKey);
      }
      return { success: true };
    }
    if (isMissingTableErr(error)) {
      const { error: tErr } = await supabase
        .from('tenant_settings')
        .delete()
        .eq('organization_id', organizationId)
        .eq('setting_key', cleanKey);
      if (!tErr) {
        if (tenantEnvCache.has(organizationId)) {
          tenantEnvCache.get(organizationId)!.delete(cleanKey);
        }
        return { success: true };
      }
    }
    const errMsg = serverError ? `${serverError} (${error.message})` : error.message;
    const isAuthErr = String(error?.code || '') === '42501' || /row-level security|JWT|not authorized|authentication/i.test(String(error?.message || ''));
    lastSecureEnvError = errMsg;
    return { success: false, error: errMsg, requiresAuth: isAuthErr };
  } catch (err: any) {
    const errMsg = err?.message || serverError || 'Failed to delete tenant variable';
    lastSecureEnvError = errMsg;
    return { success: false, error: errMsg };
  }
}

/**
 * Delete a Tenant-level environment variable
 */
export async function deleteTenantEnv(organizationId: string, key: string): Promise<boolean> {
  const res = await deleteTenantEnvResult(organizationId, key);
  return res.success;
}
