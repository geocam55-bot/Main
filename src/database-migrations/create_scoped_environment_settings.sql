-- Server-managed configuration values for system-wide and tenant-specific settings.
-- Access is restricted to the Supabase service role through the authenticated edge API.
CREATE TABLE IF NOT EXISTS public.system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_settings (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, setting_key)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.system_settings FROM anon, authenticated;
REVOKE ALL ON public.tenant_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_settings TO service_role;
