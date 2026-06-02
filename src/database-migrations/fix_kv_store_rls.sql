-- 🔧 FIX SUPABASE RLS ERROR FOR KEY-VALUE STORE (kv_store_8405be07)
-- Copy and run this script in your Supabase Dashboard -> SQL Editor to resolve RLS violations when editing, saving, or deleting scheduled tasks.

-- APPROACH 1 (Recommended & Simplest for Development):
-- Disable Row Level Security on the key-value store table so that client-side updates (tasks configuration, logs, backups catalog) can be saved or deleted without restrictions.
ALTER TABLE kv_store_8405be07 DISABLE ROW LEVEL SECURITY;

-- APPROACH 2 (Alternative if you strictly want RLS enabled):
-- Enable RLS and create all-permissive policies so any authenticated or anonymous client can query, save, and delete their task configurations.
/*
ALTER TABLE kv_store_8405be07 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on kv_store_8405be07" ON kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public insert access on kv_store_8405be07" ON kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public update access on kv_store_8405be07" ON kv_store_8405be07;
DROP POLICY IF EXISTS "Allow public delete access on kv_store_8405be07" ON kv_store_8405be07;

CREATE POLICY "Allow public read access on kv_store_8405be07" ON kv_store_8405be07 FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on kv_store_8405be07" ON kv_store_8405be07 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on kv_store_8405be07" ON kv_store_8405be07 FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on kv_store_8405be07" ON kv_store_8405be07 FOR DELETE USING (true);
*/
