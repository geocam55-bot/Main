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
    console.error('Failed to save app env var:', error);
    return false;
  } catch (err) {
    console.error('Exception saving app env var:', err);
    return false;
  }
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
  if (!organizationId) return false;

  try {
    const { error } = await supabase
      .from('tenant_env_vars')
      .upsert({
        organization_id: organizationId,
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,key' });

    if (!error) {
      if (!tenantEnvCache.has(organizationId)) {
        tenantEnvCache.set(organizationId, new Map());
      }
      tenantEnvCache.get(organizationId)!.set(key, value);
      return true;
    }
    console.error('Failed to save tenant env var:', error);
    return false;
  } catch (err) {
    console.error('Exception saving tenant env var:', err);
    return false;
  }
}

/**
 * Get all App-level environment variables
 */
export async function listAppEnv(): Promise<AppEnvVar[]> {
  try {
    const { data, error } = await supabase
      .from('app_env_vars')
      .select('*')
      .order('key');
    if (!error && data) return data;
  } catch (err) {}
  return [];
}

/**
 * Get all Tenant-level environment variables for an organization
 */
export async function listTenantEnv(organizationId: string): Promise<TenantEnvVar[]> {
  if (!organizationId) return [];
  try {
    const { data, error } = await supabase
      .from('tenant_env_vars')
      .select('*')
      .eq('organization_id', organizationId)
      .order('key');
    if (!error && data) return data;
  } catch (err) {}
  return [];
}
