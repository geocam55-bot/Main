-- Migration: Ensure RLS (Row Level Security) on trucks table permits full access
-- Run this in your Supabase SQL Editor if you have RLS enabled on the 'trucks' table.

-- 1. Enable RLS on trucks table
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive or conflicting policies
DROP POLICY IF EXISTS "Allow all read on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow public read on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow anon read on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow authenticated read on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow all insert on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow all update on trucks" ON public.trucks;
DROP POLICY IF EXISTS "Allow all delete on trucks" ON public.trucks;

-- 3. Create permissive policies for public (anon and authenticated users)
CREATE POLICY "Allow all read on trucks" ON public.trucks
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow all insert on trucks" ON public.trucks
    FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "Allow all update on trucks" ON public.trucks
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all delete on trucks" ON public.trucks
    FOR DELETE TO public
    USING (true);

-- 4. Enable RLS and permissive policies on related logistics tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all read on branches" ON public.branches;
CREATE POLICY "Allow all read on branches" ON public.branches FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all read on users" ON public.users;
CREATE POLICY "Allow all read on users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all read on deliveries" ON public.deliveries;
CREATE POLICY "Allow all read on deliveries" ON public.deliveries FOR ALL TO public USING (true) WITH CHECK (true);
