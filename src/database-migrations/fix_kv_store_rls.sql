-- 🔧 FIX SUPABASE RLS ISSUES FOR KEY-VALUE STORE (kv_store_8405be07)

-- Enable Row Level Security on the key-value store table
ALTER TABLE public.kv_store_8405be07 ENABLE ROW LEVEL SECURITY;

-- Clean up any obsolete or restrictive policies
DROP POLICY IF EXISTS "service_role_only" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public read access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public insert access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public update access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public delete access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow access to kv_store_8405be07" ON public.kv_store_8405be07;

-- Create unified RLS policy allowing reading/writing key-value pairs
CREATE POLICY "Allow access to kv_store_8405be07"
ON public.kv_store_8405be07
FOR ALL
USING (true)
WITH CHECK (true);
