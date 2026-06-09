-- ============================================================================
-- ProSpaces CRM: Database Deletion Script
-- Drops both the 'inventory' and 'contacts' (customers) tables along with All
-- of their respective performance indexes.
--
-- WARNING: This is a destructive operation. All data within these tables
-- will be permanently deleted.
--
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

BEGIN;

-- ── 1. DROP INVENTORY INDEXES & TABLE ──
DROP INDEX IF EXISTS public.idx_inventory_org;
DROP INDEX IF EXISTS public.idx_inventory_category;
DROP INDEX IF EXISTS public.idx_inventory_sku;
DROP INDEX IF EXISTS public.idx_inventory_search_keywords_gin;
DROP INDEX IF EXISTS public.idx_inventory_keywords_generated_at;
DROP INDEX IF EXISTS public.idx_inventory_name_trgm;
DROP INDEX IF EXISTS public.idx_inventory_description_trgm;
DROP INDEX IF EXISTS public.idx_inventory_sku_trgm;
DROP INDEX IF EXISTS public.idx_inventory_org_name;
DROP INDEX IF EXISTS public.idx_inventory_org_category;
DROP INDEX IF EXISTS public.idx_inventory_org_sku;
DROP INDEX IF EXISTS public.idx_inventory_org_created;

DROP TABLE IF EXISTS public.inventory CASCADE;


-- ── 2. DROP CONTACTS (CUSTOMERS) INDEXES & TABLE ──
DROP INDEX IF EXISTS public.idx_contacts_organization;
DROP INDEX IF EXISTS public.idx_contacts_owner;
DROP INDEX IF EXISTS public.idx_contacts_status;
DROP INDEX IF EXISTS public.idx_contacts_legacy_number;
DROP INDEX IF EXISTS public.idx_contacts_company;

DROP TABLE IF EXISTS public.contacts CASCADE;

COMMIT;
