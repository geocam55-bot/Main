# ✅ RLS Fix Checklist

Use this checklist to fix the "new row violates row-level security policy" error.

---

## Pre-Flight Check

- [ ] I can access my Supabase Dashboard
- [ ] I can see the SQL Editor in Supabase
- [ ] I'm currently logged into my ProSpaces CRM app
- [ ] I have the browser console open (F12)

---

## Step 1: Fix RLS Policies

- [ ] Opened Supabase Dashboard
- [ ] Clicked on "SQL Editor"
- [ ] Copied the SQL from `/FIX_RLS_NOW.md` Step 2
- [ ] Pasted it into the SQL Editor
- [ ] Clicked "Run"
- [ ] Saw "Success. No rows returned" or similar success message
- [ ] Did NOT see any red error messages

**SQL to run:**
```sql
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
```

---

## Step 2: Verify Setup (Optional but Recommended)

- [ ] In SQL Editor, pasted contents of `/database-migrations/test_background_import_setup.sql`
- [ ] Clicked "Run"
- [ ] Reviewed the output
- [ ] Saw "✅ ALL CHECKS PASSED" at the bottom

---

## Step 3: Test in App

- [ ] Went to "Import & Export" module in ProSpaces CRM
- [ ] Uploaded a test CSV file (any size)
- [ ] Reviewed the column mapping
- [ ] Clicked "Run in Background" button
- [ ] Checked browser console (F12)

**Expected console logs:**
- [ ] ✅ Authenticated user: [uuid]
- [ ] 📋 App user ID: [uuid]
- [ ] 📋 App user org: [ORG ID]
- [ ] 👤 Profile lookup: {object with organization_id}
- [ ] ✅ Profile verified with org: [ORG ID]
- [ ] 📤 Inserting job data: {object}
- [ ] ✅ Job created: {object}

**Expected UI:**
- [ ] Saw green toast: "Background import started for X records!"
- [ ] Did NOT see red error toast
- [ ] No error in browser console

---

## Step 4: Verify Background Processing

- [ ] Navigated to "Background Imports" view
- [ ] Saw my job listed with status "pending" or "processing"
- [ ] Waited 5-10 seconds
- [ ] Status changed to "processing" → "completed"
- [ ] Saw browser notification (if enabled)

---

## Troubleshooting (If Needed)

### ❌ Still Getting RLS Error

- [ ] Ran diagnostic query:
  ```sql
  SELECT 
    auth.uid() as my_user_id,
    (SELECT organization_id FROM profiles WHERE id = auth.uid()) as my_org_id;
  ```
- [ ] `my_org_id` is NOT NULL (if NULL, see fix below)
- [ ] `my_user_id` matches my expected user ID

**If my_org_id is NULL:**
- [ ] Ran fix:
  ```sql
  UPDATE profiles 
  SET organization_id = 'ORG001'  -- Use your actual org ID
  WHERE id = auth.uid();
  ```

### ❌ Table Doesn't Exist

- [ ] Ran table check:
  ```sql
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_jobs');
  ```
- [ ] If returned `false`, ran `/database-migrations/scheduled_jobs_table.sql`

### ❌ Profile Error in Console

- [ ] Checked profile exists:
  ```sql
  SELECT * FROM profiles WHERE id = auth.uid();
  ```
- [ ] If no rows, created profile (or contacted support)

### ❌ Browser Console Shows Different Error

- [ ] Copied the exact error message
- [ ] Searched for error in `/TROUBLESHOOT_RLS_ERROR.md`
- [ ] Followed the specific troubleshooting steps

---

## Success Criteria

**I know it's working when:**

✅ "Run in Background" button doesn't show any errors  
✅ Green toast appears: "Background import started for X records!"  
✅ Job appears in Background Imports view  
✅ Job status changes from "pending" → "processing" → "completed"  
✅ Records are actually imported into the inventory  
✅ Browser notification appears (if enabled)  

---

## Additional Resources

| Document | Use When |
|----------|----------|
| `/FIX_RLS_NOW.md` | Quick 2-minute fix |
| `/TROUBLESHOOT_RLS_ERROR.md` | Detailed troubleshooting |
| `/QUICK_START_BACKGROUND_IMPORTS.md` | Overview and reference |
| `/database-migrations/test_background_import_setup.sql` | Run diagnostics |
| `/database-migrations/verify_background_imports.sql` | Verify table structure |

---

## Final Notes

- **DO NOT** skip Step 1 - The SQL MUST be run
- **CHECK** browser console for detailed error messages
- **VERIFY** your profile has an organization_id
- **TEST** with a small file first (10-100 records)
- **ENABLE** browser notifications for best experience

---

## Status: _____________

- [ ] ✅ FIXED - Everything working perfectly
- [ ] ⚠️ PARTIAL - Some steps complete, still troubleshooting
- [ ] ❌ BLOCKED - Stuck on a specific step (note which one above)

---

**Last Updated:** After adding profile verification and enhanced logging
**Version:** 2.0 (with EXISTS-based RLS policies)
