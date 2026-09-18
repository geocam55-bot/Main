-- ==============================================================================
-- SQL MIGRATION: Add Product Catalog Enrichment Fields to Inventory Table
-- ==============================================================================
-- This SQL script adds columns for AI Catalog Enrichment (Short Description, Brand,
-- Attributes, Keywords) while leaving Item Name untouched and updating Description
-- with the new Extended Description.
-- ==============================================================================

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS attributes JSONB;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS search_keywords TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS enrichment_updated_at TIMESTAMPTZ;

-- Create indexes for fast filtering and searching
CREATE INDEX IF NOT EXISTS idx_inventory_brand ON public.inventory(brand);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);

-- Ensure RLS enabled and secure policies created
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable write access for authenticated users on inventory" ON public.inventory;

CREATE POLICY "Enable read access for all users on inventory" ON public.inventory
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable write access for authenticated users on inventory" ON public.inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO authenticated;
