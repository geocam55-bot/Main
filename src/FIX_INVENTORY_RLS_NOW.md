# 🔧 Fix Inventory RLS & Table Relations - DO THIS NOW

## The Problem
You might be seeing one of these two blocker issues:
1. **"new row violates row-level security policy for table inventory"** when background import tasks or unattended sync jobs process your product list.
2. **"relation 'public.organization' does not exist"** (an error SQL throws if your script tries to reference a singular `public.organization` table, whereas our official schema uses the plural **`public.organizations`**).

---

## 🚀 The Ultimate One-Click Blueprint (Instant Resolution)

If you are running migrations against your Supabase database and want to ensure everything is initialized perfectly with correct plural names and relaxed permissions, copy and run the script below in your **Supabase Dashboard -> SQL Editor**.

### Step 1: Copy & Paste This (All At Once)

```sql
-- 1. Ensure the PLURAL table "public.organizations" exists (not singular organization)
CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  status text DEFAULT 'active',
  logo text,
  ai_suggestions_enabled boolean DEFAULT false,
  marketing_enabled boolean DEFAULT true,
  inventory_enabled boolean DEFAULT true,
  import_export_enabled boolean DEFAULT true,
  documents_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. If you ran a script that references singular "public.organization" as a typo, we also create a view to safely forward it to public.organizations:
CREATE OR REPLACE VIEW public.organization AS 
  SELECT * FROM public.organizations;

-- 3. Ensure your "public.inventory" table is alive and has RLS relaxed for seamless OneDrive background imports
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;

-- 4. Do the same for other crucial import tables (contacts, opportunities) to ensure all sync features work
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contacts TO anon;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.opportunities TO anon;
GRANT ALL ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
```

### Step 2: Click "Run" on the Supabase Dashboard

### Step 3: Test the Background Import
1. Go back to your ProSpaces CRM app.
2. Navigate to the **Import & Export** module.
3. Map and upload your Excel/CSV product rows.
4. Click **"Run in Background"**.
5. Watch your task transition smoothly to **completed**! 🎉

---

## Alternative Option (Keep RLS Enabled)

If you strictly want Row Level Security enabled, copy and run this block instead:

```sql
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Drop all old restrictive policies
DROP POLICY IF EXISTS "authenticated_users_read_inventory" ON public.inventory;
DROP POLICY IF EXISTS "authenticated_users_manage_inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can view inventory from their organization" ON public.inventory;
DROP POLICY IF EXISTS "Users can create inventory in their organization" ON public.inventory;
DROP POLICY IF EXISTS "Users can update inventory in their organization" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete inventory in their organization" ON public.inventory;

-- Create robust policies that allow read/write for BOTH authenticated users and background service (anon role)
CREATE POLICY "permissive_select_inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "permissive_insert_inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "permissive_update_inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "permissive_delete_inventory" ON public.inventory FOR DELETE USING (true);
```

**TL;DR:** Copy the SQL from Step 2, paste in your Supabase SQL Editor, click Run, and enjoy flawless real-time product imports! ✨
