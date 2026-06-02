# 🔧 Fix Key-Value RLS Error - DO THIS NOW

## The Problem
You are getting: **"Failed to delete task: new row violates row-level security policy for table 'kv_store_8405be07'"** or **"Could not save task to backend"** (violates RLS).

The `kv_store_8405be07` table is a general-purpose Key-Value table used in this template to store scheduled tasks metadata, folders backup catalogs, and more in **Supabase mode**. Because Row Level Security (RLS) is turned ON by default in Supabase but no INSERT/UPDATE/DELETE policies are defined, the browser client gets blocked when trying to write direct updates.

---

## ⚡ The Solution (1 Minute)

### Step 1: Open Supabase SQL Editor
1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** on the left menu (an icon with `SQL` or `>_`)

### Step 2: Copy & Paste This SQL (All At Once)

```sql
-- Disable Row Level Security on the key-value store table so the app can manage tasks
ALTER TABLE kv_store_8405be07 DISABLE ROW LEVEL SECURITY;
```

*(Alternatively, if you want to keep RLS active but grant open access, copy this instead):*
```sql
ALTER TABLE kv_store_8405be07 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on kv_store_8405be07" ON kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public insert access on kv_store_8405be07" ON kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public update access on kv_store_8405be07" ON kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public delete access on kv_store_8405be07" ON kv_store_8405be07;

CREATE POLICY "Allow public read access on kv_store_8405be07" ON kv_store_8405be07 FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on kv_store_8405be07" ON kv_store_8405be07 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on kv_store_8405be07" ON kv_store_8405be07 FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on kv_store_8405be07" ON kv_store_8405be07 FOR DELETE USING (true);
```

### Step 3: Click "Run"
Press the **Run** button (or `Cmd + Enter` / `Ctrl + Enter`). You should see:
`Success. No rows returned`

### Step 4: Test
Go back to your app, try editing or deleting the scheduled task, and it will now save or remove immediately with green toast alerts! ✨
