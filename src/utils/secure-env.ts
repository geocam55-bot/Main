import { createClient } from './supabase/client';

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

// In-memory cache to prevent excessive database calls during a single session
const appEnvCache = new Map<string, string>();
const tenantEnvCache = new Map<string, Map<string, string>>();

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
  } catch (err) {
    // Database table might not be created yet or network error
  }

  // Fallback to process.env equivalents
  const envVal = (
    process.env[key] ||
    process.env[`VITE_${key}`] ||
    process.env[key.toUpperCase()] ||
    fallback
  );

  return envVal;
}

/**
 * Set App-level Environment Variable
 */
export async function setAppEnv(key: string, value: string, description?: string): Promise<boolean> {
  // 1. Prioritize server endpoint (bypasses RLS issues via service role key)
  try {
    const resp = await fetch('/api/secure-env/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'system', key, value, description })
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json.success) {
        appEnvCache.set(key, value);
        return true;
      }
    }
  } catch (apiErr) {
    console.warn('[SecureEnv] Server save app_env failed, falling back to client:', apiErr);
  }

  // 2. Fallback to direct Supabase client
  try {
    const { error } = await supabase
      .from('app_env_vars')
      .upsert({
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (!error) {
      appEnvCache.set(key, value);
      return true;
    }
    console.error('[SecureEnv] Client-side app_env upsert failed:', error.message);
  } catch (err) {
    console.error('[SecureEnv] Client-side app_env upsert exception:', err);
  }

  return false;
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
  } catch (err) {
    // Table might not exist yet
  }

  // Fallback to app-level / process.env
  return getAppEnv(key, fallback);
}

/**
 * Set Tenant-level Environment Variable
 */
export async function setTenantEnv(organizationId: string, key: string, value: string, description?: string): Promise<boolean> {
  const targetOrgId = organizationId || 'default_org';

  // 1. Prioritize server endpoint (bypasses RLS via service role)
  try {
    const resp = await fetch('/api/secure-env/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'tenant', organizationId: targetOrgId, key, value, description })
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json.success) {
        if (!tenantEnvCache.has(targetOrgId)) {
          tenantEnvCache.set(targetOrgId, new Map());
        }
        tenantEnvCache.get(targetOrgId)!.set(key, value);
        return true;
      }
    }
  } catch (apiErr) {
    console.warn('[SecureEnv] Server save tenant_env failed, falling back to client:', apiErr);
  }

  // 2. Direct Supabase client fallback
  try {
    const { error } = await supabase
      .from('tenant_env_vars')
      .upsert({
        organization_id: targetOrgId,
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,key' });

    if (!error) {
      if (!tenantEnvCache.has(targetOrgId)) {
        tenantEnvCache.set(targetOrgId, new Map());
      }
      tenantEnvCache.get(targetOrgId)!.set(key, value);
      return true;
    }
    console.error('[SecureEnv] Client-side tenant_env upsert failed:', error.message);
  } catch (err) {
    console.error('[SecureEnv] Client-side tenant_env upsert exception:', err);
  }

  return false;
}

/**
 * Get all App-level environment variables
 */
export async function listAppEnv(): Promise<AppEnvVar[]> {
  // 1. Server API (Authoritative, uses service-role to bypass RLS)
  try {
    const resp = await fetch('/api/secure-env/list?scope=system');
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.vars)) {
        return json.vars;
      }
    }
  } catch (apiErr) {
    console.warn('[SecureEnv] Server list failed, trying client fallback:', apiErr);
  }

  // 2. Fallback to client-side Supabase
  try {
    const { data, error } = await supabase
      .from('app_env_vars')
      .select('*')
      .order('key');
    if (!error && data && data.length > 0) return data;
  } catch (err) {}

  return [];
}

/**
 * Get all Tenant-level environment variables for an organization
 */
export async function listTenantEnv(organizationId: string): Promise<TenantEnvVar[]> {
  const targetOrgId = organizationId || 'default_org';

  // 1. Server API (Authoritative, uses service-role to bypass RLS)
  try {
    const resp = await fetch(`/api/secure-env/list?scope=tenant&organizationId=${encodeURIComponent(targetOrgId)}`);
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.vars)) {
        return json.vars;
      }
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
  } catch (err) {}

  return [];
}

/**
 * Delete an App-level environment variable
 */
export async function deleteAppEnv(key: string): Promise<boolean> {
  // 1. Try direct Supabase client
  try {
    const { error } = await supabase
      .from('app_env_vars')
      .delete()
      .eq('key', key);
    if (!error) {
      appEnvCache.delete(key);
      return true;
    }
    console.warn('[SecureEnv] Client-side app_env delete failed, trying server API:', error.message);
  } catch (err) {
    console.warn('[SecureEnv] Client-side app_env delete error, trying server API:', err);
  }

  // 2. Fallback to server endpoint
  try {
    const resp = await fetch('/api/secure-env/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'system', key })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        appEnvCache.delete(key);
        return true;
      }
    }
  } catch (apiErr) {
    console.error('[SecureEnv] Server delete failed:', apiErr);
  }

  return false;
}

/**
 * Delete a Tenant-level environment variable
 */
export async function deleteTenantEnv(organizationId: string, key: string): Promise<boolean> {
  if (!organizationId) return false;

  // 1. Try direct Supabase client
  try {
    const { error } = await supabase
      .from('tenant_env_vars')
      .delete()
      .eq('organization_id', organizationId)
      .eq('key', key);
    if (!error) {
      if (tenantEnvCache.has(organizationId)) {
        tenantEnvCache.get(organizationId)!.delete(key);
      }
      return true;
    }
    console.warn('[SecureEnv] Client-side tenant_env delete failed, trying server API:', error.message);
  } catch (err) {
    console.warn('[SecureEnv] Client-side tenant_env delete error, trying server API:', err);
  }

  // 2. Fallback to server endpoint
  try {
    const resp = await fetch('/api/secure-env/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'tenant', organizationId, key })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        if (tenantEnvCache.has(organizationId)) {
          tenantEnvCache.get(organizationId)!.delete(key);
        }
        return true;
      }
    }
  } catch (apiErr) {
    console.error('[SecureEnv] Server delete failed:', apiErr);
  }

  return false;
}

