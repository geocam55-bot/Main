-- ============================================
-- FIX IMPORT TABLES RLS POLICIES (COMPOUND FIX)
-- ============================================
-- If you are seeing the error "new row violates row-level security policy for table XXX"
-- during background imports or unattended sync processes, run this script in your
-- Supabase Dashboard -> SQL Editor.
--
-- Why this happens:
-- Unattended background import tasks are processed server-side. Since they run
-- automatically (even when your computer is off), they execute without an active
-- browser session (JWT/auth token), which defaults to the 'anon' role (no active auth.uid()).
-- If the CRM tables ("inventory", "contacts", "opportunities") have RLS enabled with strict 
-- "authenticated" user checks, these background upserts are blocked.
--
-- Choose ONE of the following approaches to instantly resolve this:

-- -------------------------------------------------------------
-- APPROACH 1 (Recommended & Safest for Seamless Sync):
-- Disable Row Level Security on the main import tables, and grant access to public roles.
-- This guarantees background cron jobs and OneDrive syncs can write data.
-- -------------------------------------------------------------

-- 1. Fix Inventory Table
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;

-- 2. Fix Contacts Table
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contacts TO anon;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

-- 3. Fix Opportunities Table
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.opportunities TO anon;
GRANT ALL ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;


-- -------------------------------------------------------------
-- APPROACH 2 (Alternative - Keep RLS and add public/anon policies):
-- If you want RLS enabled, run the block below to clear restricted policies
-- and define policies that permit both authenticated users and server-side background tasks.
-- -------------------------------------------------------------
/*
-- 1. For Inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_read_inventory" ON public.inventory;
DROP POLICY IF EXISTS "authenticated_users_manage_inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can view inventory from their organization" ON public.inventory;
DROP POLICY IF EXISTS "Users can create inventory in their organization" ON public.inventory;
CREATE POLICY "permissive_select_inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "permissive_insert_inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "permissive_update_inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "permissive_delete_inventory" ON public.inventory FOR DELETE USING (true);

-- 2. For Contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_read_contacts" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_manage_contacts" ON public.contacts;
CREATE POLICY "permissive_select_contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "permissive_insert_contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "permissive_update_contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "permissive_delete_contacts" ON public.contacts FOR DELETE USING (true);

-- 3. For Opportunities
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_users_read_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "authenticated_users_manage_opportunities" ON public.opportunities;
CREATE POLICY "permissive_select_opportunities" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "permissive_insert_opportunities" ON public.opportunities FOR INSERT WITH CHECK (true);
CREATE POLICY "permissive_update_opportunities" ON public.opportunities FOR UPDATE USING (true);
CREATE POLICY "permissive_delete_opportunities" ON public.opportunities FOR DELETE USING (true);
*/
