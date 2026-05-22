-- Drop inventory table and related indexes so data can be reimported cleanly.
-- Safe to run multiple times due to IF EXISTS.

BEGIN;

-- Explicit index cleanup (some may already be removed if table was dropped earlier).
DROP INDEX IF EXISTS public.idx_inventory_org_name;
DROP INDEX IF EXISTS public.idx_inventory_org_category;
DROP INDEX IF EXISTS public.idx_inventory_org_sku;
DROP INDEX IF EXISTS public.idx_inventory_org_created;
DROP INDEX IF EXISTS public.idx_inventory_name_trgm;
DROP INDEX IF EXISTS public.idx_inventory_description_trgm;
DROP INDEX IF EXISTS public.idx_inventory_sku_trgm;
DROP INDEX IF EXISTS public.idx_inventory_search_keywords_gin;
DROP INDEX IF EXISTS public.idx_inventory_keywords_generated_at;

-- Drop the table last.
DROP TABLE IF EXISTS public.inventory;

COMMIT;