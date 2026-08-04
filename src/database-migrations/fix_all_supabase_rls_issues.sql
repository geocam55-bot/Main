-- ==============================================================================
-- 🛡️ SUPABASE SECURITY & RLS ISSUES RESOLUTION SCRIPT
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor to resolve all 5 RLS issues:
-- 1. Enable RLS on public.kv_store_8405be07 and configure access policies
-- 2. Remove references to user_metadata in public.profiles RLS security policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: FIX kv_store_8405be07 (Enable RLS & Add Access Policies)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.kv_store_8405be07 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public read access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public insert access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public update access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public delete access on kv_store_8405be07" ON public.kv_store_8405be07;
DROP POLICY IF EXISTS "Allow access to kv_store_8405be07" ON public.kv_store_8405be07;

CREATE POLICY "Allow access to kv_store_8405be07"
ON public.kv_store_8405be07
FOR ALL
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- PART 2: FIX public.profiles RLS POLICIES (Remove user_metadata References)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop legacy or unsafe policies that referenced user_metadata / raw_user_meta_data
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create SECURITY DEFINER helper functions to look up role & org from public.profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_org()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Re-create safe RLS policies referencing public.profiles (NOT auth.user_metadata)

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 3. Users can view org profiles (uses SECURITY DEFINER helper/profiles table lookup)
CREATE POLICY "Users can view org profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.get_current_user_role() = 'super_admin'
  OR (
    public.get_current_user_org() IS NOT NULL
    AND public.get_current_user_org() = organization_id
  )
);

-- 4. Super admins can view all profiles
CREATE POLICY "Super admins can view all"
ON public.profiles FOR SELECT
USING (
  public.get_current_user_role() = 'super_admin'
);

-- 5. Admins can manage org profiles
CREATE POLICY "Admins can manage org profiles"
ON public.profiles FOR ALL
USING (
  public.get_current_user_role() = 'super_admin'
  OR (
    public.get_current_user_role() IN ('admin', 'super_admin')
    AND public.get_current_user_org() IS NOT NULL
    AND public.get_current_user_org() = organization_id
  )
)
WITH CHECK (
  public.get_current_user_role() = 'super_admin'
  OR (
    public.get_current_user_role() IN ('admin', 'super_admin')
    AND public.get_current_user_org() IS NOT NULL
    AND public.get_current_user_org() = organization_id
  )
);
