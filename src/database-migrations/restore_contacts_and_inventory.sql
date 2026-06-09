-- ============================================================================
-- ProSpaces CRM: Database Restoration Script
-- Recreates 'contacts' and 'inventory' tables with all required columns,
-- performance indexes, and permits background cron/unattended jobs to sync.
--
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

BEGIN;

-- ── 1. RECREATE CONTACTS TABLE ──
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  address text,
  city text,
  province text,
  postal_code text,
  notes text,
  status text DEFAULT 'active',
  trade text,
  owner_id uuid,
  organization_id text NOT NULL,
  price_level text DEFAULT 'Retail',
  legacy_number text,
  account_owner_number text,
  ptd_sales numeric(15,2) DEFAULT 0,
  ptd_gp_percent numeric(5,2) DEFAULT 0,
  ytd_sales numeric(15,2) DEFAULT 0,
  ytd_gp_percent numeric(5,2) DEFAULT 0,
  lyr_sales numeric(15,2) DEFAULT 0,
  lyr_gp_percent numeric(5,2) DEFAULT 0,
  tags text[] DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Indexes for Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_number ON public.contacts(legacy_number);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company);

-- Disable Row-Level Security for Unattended Sync
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contacts TO anon;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;


-- ── 2. RECREATE INVENTORY TABLE ──
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text,
  quantity integer DEFAULT 0,
  quantity_on_order integer DEFAULT 0,
  unit_price numeric(12,2) DEFAULT 0,
  cost numeric(12,2) DEFAULT 0,
  category text,
  department_code text,
  image_url text,
  organization_id text NOT NULL,
  unit_of_measure text DEFAULT 'ea',
  price_tier_1 integer DEFAULT 0,
  price_tier_2 integer DEFAULT 0,
  price_tier_3 integer DEFAULT 0,
  price_tier_4 integer DEFAULT 0,
  price_tier_5 integer DEFAULT 0,
  search_keywords text[] DEFAULT '{}'::text[],
  keyword_version text,
  keywords_generated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Indexes for Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_org ON public.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_search_keywords_gin ON public.inventory USING gin (search_keywords);
CREATE INDEX IF NOT EXISTS idx_inventory_keywords_generated_at ON public.inventory (keywords_generated_at);

-- Disable Row-Level Security for Unattended Sync
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;


-- ── 3. OPTIONAL: RESTORE HIGH-LEVEL RPC UTILITIES ──
-- Ensures the administrative SQL executing utility is configured correctly for dynamic components:
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

COMMIT;
