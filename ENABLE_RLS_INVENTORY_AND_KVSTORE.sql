-- ==============================================================================
-- SQL MIGRATION: Enable Row Level Security (RLS) on Inventory and KV Store Tables
-- ==============================================================================

-- 1. Enable RLS on public.inventory
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;

-- Clean up and create secure policies for public.inventory
DROP POLICY IF EXISTS "Allow read on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow all for authenticated on inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_select_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_insert_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_update_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_delete_inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable read access for all users on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable write access for authenticated users on inventory" ON public.inventory;

CREATE POLICY "Enable read access for all users on inventory" ON public.inventory
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable write access for authenticated users on inventory" ON public.inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. Enable RLS on public.kv_store_8405be07
ALTER TABLE IF EXISTS public.kv_store_8405be07 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow access to kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Enable read/write access for all users on kv_store_8405be07" ON public.kv_store_8405be07;

CREATE POLICY "Enable read/write access for all users on kv_store_8405be07" ON public.kv_store_8405be07
  FOR ALL TO public USING (true) WITH CHECK (true);


-- 3. Verify RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('inventory', 'kv_store_8405be07');
