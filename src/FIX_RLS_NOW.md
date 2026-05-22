# 🔧 Fix RLS Error - DO THIS NOW

## The Problem
You're getting: **"new row violates row-level security policy for table scheduled_jobs"**

## The Solution (2 Minutes)

### Step 1: Open Supabase SQL Editor
Go to your Supabase Dashboard → SQL Editor

### Step 2: Copy & Paste This (All At Once)

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view jobs from their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can create jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete jobs in their organization" ON scheduled_jobs;

-- Create new policies (using EXISTS instead of IN)
CREATE POLICY "Users can view jobs from their organization" ON scheduled_jobs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));

CREATE POLICY "Users can create jobs in their organization" ON scheduled_jobs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));

CREATE POLICY "Users can update jobs in their organization" ON scheduled_jobs FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));

CREATE POLICY "Users can delete jobs in their organization" ON scheduled_jobs FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));
```

### Step 3: Click "Run"

### Step 4: Test

1. Go back to your app
2. Open browser console (F12)
3. Try "Run in Background" again
4. Look for console messages starting with ✅

## What If It Still Doesn't Work?

### Option A: Run the Diagnostic Test

In Supabase SQL Editor, run the contents of:
**`/database-migrations/test_background_import_setup.sql`**

This will tell you exactly what's wrong.

### Option B: Check Your Profile

Run this in SQL Editor:
```sql
SELECT 
  auth.uid() as my_user_id,
  (SELECT organization_id FROM profiles WHERE id = auth.uid()) as my_org_id;
```

- If `my_org_id` is **NULL** → Your profile is missing an organization!

**Fix it:**
```sql
UPDATE profiles 
SET organization_id = 'ORG001'  -- Replace with your actual org ID
WHERE id = auth.uid();
```

### Option C: Check the Table Exists

```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_jobs');
```

- If returns **false** → Run `/database-migrations/scheduled_jobs_table.sql` first

## Success Looks Like This

In your browser console, you should see:
```
✅ Authenticated user: abc-123-...
✅ Profile verified with org: ORG001
📤 Inserting job data: {...}
✅ Job created: {...}
```

And a toast notification: **"Background import started for X records!"**

## Still Stuck?

Read the detailed troubleshooting guide:
**`/TROUBLESHOOT_RLS_ERROR.md`**

---

**TL;DR:** Copy the SQL from Step 2, paste in Supabase SQL Editor, click Run, try again. ✨
