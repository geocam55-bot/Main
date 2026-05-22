# Troubleshooting RLS Error - Step by Step Guide

## Error: "new row violates row-level security policy for table scheduled_jobs"

Follow these steps **in order**:

---

## Step 1: Run the Updated RLS Fix

Open your **Supabase SQL Editor** and run this entire script:

```sql
-- ============================================
-- FIX SCHEDULED JOBS RLS POLICY (COMPREHENSIVE)
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view jobs from their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can create jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete jobs in their organization" ON scheduled_jobs;

-- Create new, more permissive policies using EXISTS
CREATE POLICY "Users can view jobs from their organization"
  ON scheduled_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = scheduled_jobs.organization_id
    )
  );

CREATE POLICY "Users can create jobs in their organization"
  ON scheduled_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = scheduled_jobs.organization_id
    )
  );

CREATE POLICY "Users can update jobs in their organization"
  ON scheduled_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = scheduled_jobs.organization_id
    )
  );

CREATE POLICY "Users can delete jobs in their organization"
  ON scheduled_jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = scheduled_jobs.organization_id
    )
  );

-- Verify policies were created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'scheduled_jobs';
```

---

## Step 2: Verify Your Setup

Run this diagnostic query in Supabase SQL Editor:

```sql
-- Check your current auth user and profile
SELECT 
  'Your Auth ID:' as label,
  auth.uid() as value
UNION ALL
SELECT 
  'Your Profile ID:',
  (SELECT id::text FROM profiles WHERE id = auth.uid())
UNION ALL
SELECT 
  'Your Organization ID:',
  (SELECT organization_id FROM profiles WHERE id = auth.uid())
UNION ALL
SELECT 
  'Your Email:',
  (SELECT email FROM profiles WHERE id = auth.uid());
```

**Expected Results:**
- ✅ Your Auth ID: Should show a UUID (e.g., `a1b2c3d4-...`)
- ✅ Your Profile ID: Should match your Auth ID
- ✅ Your Organization ID: Should show your org ID (e.g., `ORG001`)
- ✅ Your Email: Should show your email

**Problem Indicators:**
- ❌ If "Your Organization ID" is NULL → **Your profile is missing an organization!**
- ❌ If "Your Profile ID" is NULL → **Your profile doesn't exist!**

---

## Step 3: Fix Profile Issues (if needed)

### If Your Profile is Missing an Organization:

```sql
-- Find your profile
SELECT id, email, organization_id, role FROM profiles WHERE id = auth.uid();

-- If organization_id is NULL, update it:
UPDATE profiles 
SET organization_id = 'ORG001'  -- Replace with your actual org ID
WHERE id = auth.uid();

-- Verify the update
SELECT id, email, organization_id FROM profiles WHERE id = auth.uid();
```

### If Your Profile Doesn't Exist:

```sql
-- Create a profile for your auth user
INSERT INTO profiles (id, email, organization_id, role, full_name)
VALUES (
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'ORG001',  -- Replace with your org ID
  'admin',
  'Your Name'
);
```

---

## Step 4: Test in the App

1. **Open Browser Console** (F12)
2. Go to **Import & Export** module
3. Upload a CSV file
4. Click **"Run in Background"**
5. **Check the console logs**

You should see:
```
✅ Authenticated user: a1b2c3d4-...
📋 App user ID: a1b2c3d4-...
📋 App user org: ORG001
👤 Profile lookup: {id: "...", email: "...", organization_id: "ORG001", role: "admin"}
✅ Profile verified with org: ORG001
📤 Inserting job data: {organization_id: "ORG001", created_by: "...", ...}
✅ Job created: {id: "...", ...}
```

If you see any ❌ errors, read the error message carefully.

---

## Common Issues & Solutions

### Issue: "Profile missing organization_id"

**Solution:** Your profile record doesn't have an organization. Run:

```sql
UPDATE profiles 
SET organization_id = 'ORG001'  -- Use your actual org ID
WHERE id = auth.uid();
```

### Issue: "Could not load your profile"

**Solution:** Your profile doesn't exist. This shouldn't happen if you logged in normally, but you can create it:

```sql
INSERT INTO profiles (id, email, organization_id, role)
VALUES (
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'ORG001',  -- Your org ID
  'admin'
);
```

### Issue: Still getting RLS error after all fixes

**Nuclear Option - Temporarily disable RLS for testing:**

```sql
-- ⚠️ ONLY FOR TESTING - DO NOT USE IN PRODUCTION
ALTER TABLE scheduled_jobs DISABLE ROW LEVEL SECURITY;

-- Try creating a job in the app

-- Re-enable RLS immediately after:
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
```

If the job creates successfully with RLS disabled, the issue is definitely with the RLS policies. Double-check you ran the policies from Step 1.

---

## Step 5: Verify Table Exists

If you get "table does not exist" error:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'scheduled_jobs'
);

-- If false, create the table by running:
-- /database-migrations/scheduled_jobs_table.sql
```

---

## Still Not Working?

1. **Check Browser Console** - Look for the exact error messages
2. **Check Supabase Logs** - Go to Supabase Dashboard → Logs → API Logs
3. **Verify Your Organization** - Make sure your organization exists:
   ```sql
   SELECT * FROM organizations WHERE id = 'ORG001';  -- Use your org ID
   ```

4. **Check RLS is Enabled:**
   ```sql
   SELECT relrowsecurity FROM pg_class WHERE relname = 'scheduled_jobs';
   -- Should return: true
   ```

5. **List All Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'scheduled_jobs';
   ```

---

## Quick Copy-Paste Fix

If you just want to fix it quickly, run this entire block:

```sql
-- Quick fix - Run all at once
DROP POLICY IF EXISTS "Users can view jobs from their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can create jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete jobs in their organization" ON scheduled_jobs;

CREATE POLICY "Users can view jobs from their organization" ON scheduled_jobs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));
CREATE POLICY "Users can create jobs in their organization" ON scheduled_jobs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));
CREATE POLICY "Users can update jobs in their organization" ON scheduled_jobs FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));
CREATE POLICY "Users can delete jobs in their organization" ON scheduled_jobs FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = scheduled_jobs.organization_id));

-- Verify
SELECT policyname FROM pg_policies WHERE tablename = 'scheduled_jobs';
```

---

## Success Indicators

✅ **You'll know it's working when:**
1. The "Run in Background" button works without errors
2. You see a success toast: "Background import started for X records!"
3. The job appears in Background Imports view
4. The job processes automatically after 5 seconds

---

Need more help? Check the browser console logs for detailed error messages.
