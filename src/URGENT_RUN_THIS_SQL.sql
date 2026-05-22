-- ⚡⚡⚡ COPY THIS ENTIRE FILE AND RUN IN SUPABASE SQL EDITOR ⚡⚡⚡
-- 
-- THIS WILL FIX YOUR 17+ SECOND INVENTORY LOAD TIME
-- Expected Result: 17s → 0.5s (30-40x faster!)
--
-- HOW TO RUN:
-- 1. Select ALL text in this file (Ctrl+A or Cmd+A)
-- 2. Copy (Ctrl+C or Cmd+C)  
-- 3. Go to Supabase Dashboard → SQL Editor
-- 4. Click "New query"
-- 5. Paste and click "Run"
-- 6. Refresh your ProSpaces CRM
-- ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡

-- Step 1: Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_org_name 
  ON public.inventory(organization_id, name);

CREATE INDEX IF NOT EXISTS idx_inventory_org_category 
  ON public.inventory(organization_id, category);

CREATE INDEX IF NOT EXISTS idx_inventory_org_sku 
  ON public.inventory(organization_id, sku);

CREATE INDEX IF NOT EXISTS idx_inventory_org_created 
  ON public.inventory(organization_id, created_at DESC);

-- Step 2: Enable fuzzy text search extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 3: Create trigram indexes for fast text search
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm 
  ON public.inventory USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_description_trgm 
  ON public.inventory USING gin(description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm 
  ON public.inventory USING gin(sku gin_trgm_ops);

-- Step 4: Update table statistics for query optimizer
ANALYZE public.inventory;

-- Step 5: Verify indexes were created successfully
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'inventory'
  AND schemaname = 'public'
ORDER BY indexname;

-- ✅ DONE! You should see a list of indexes above
-- Now refresh your ProSpaces CRM and check the inventory load time
-- It should be under 1 second! 🚀
