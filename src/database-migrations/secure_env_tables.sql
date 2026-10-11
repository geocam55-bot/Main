-- ============================================================================
-- PROSPACES CRM: SECURE ENVIRONMENT VARIABLES MIGRATION SCRIPT
-- ============================================================================
-- Run this script in your Supabase SQL Editor to create the secure tables
-- with Row Level Security (RLS) protection enabled.
-- ============================================================================

-- 1. App-level Environment Variables Table (Used by the App globally)
CREATE TABLE IF NOT EXISTS public.app_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_env_vars ENABLE ROW LEVEL SECURITY;

-- RLS Policy for app_env_vars
DROP POLICY IF EXISTS "Allow authenticated or service role to manage app_env_vars" ON public.app_env_vars;
CREATE POLICY "Allow authenticated or service role to manage app_env_vars" ON public.app_env_vars
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');


-- 2. Tenant-level Environment Variables Table (Used by Tenants / Organizations)
CREATE TABLE IF NOT EXISTS public.tenant_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT tenant_env_vars_org_key_unique UNIQUE (organization_id, key)
);

-- Enable Row Level Security
ALTER TABLE public.tenant_env_vars ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tenant_env_vars
DROP POLICY IF EXISTS "Allow authenticated or service role to manage tenant_env_vars" ON public.tenant_env_vars;
CREATE POLICY "Allow authenticated or service role to manage tenant_env_vars" ON public.tenant_env_vars
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================================================
-- End of Migration Script
-- ============================================================================
