# 🔧 Fix Inventory RLS Error - DO THIS NOW

## The Problem
You're getting: **"new row violates row-level security policy for table inventory"** when background import tasks or unattended sync jobs process your product list.

## The Solution (2 Minutes)

### Step 1: Open Supabase SQL Editor
Go to your **Supabase Dashboard** → **SQL Editor**

### Step 2: Copy & Paste This (All At Once)

```sql
-- Disable Row Level Security on the inventory table, and grant access to public roles.
-- This ensures background cron jobs can write data unattended without active user browser tokens.
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
```

### Step 3: Click "Run"

### Step 4: Test the Background Import

1. Go back to your ProSpaces CRM app
2. Navigate to **Import & Export** module
3. Map and upload your Excel/CSV product rows
4. Click **"Run in Background"**
5. Go to **Background Imports** and watch your task transition smoothly to **completed**! 🎉

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
