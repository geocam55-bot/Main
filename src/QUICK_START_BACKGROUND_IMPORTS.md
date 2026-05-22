# 🚀 Background Imports - Quick Start

## What You Need to Do

### 1️⃣ Run This SQL in Supabase

Open **Supabase Dashboard → SQL Editor** and run:

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

### 2️⃣ Test It

1. Go to **Import & Export** in your app
2. Upload a CSV file
3. Click **"Run in Background"**
4. You should see: ✅ **"Background import started for X records!"**

---

## What We Fixed

### The Code
✅ Added profile verification before inserting jobs  
✅ Uses authenticated user ID directly from Supabase Auth  
✅ Added detailed console logging for debugging  
✅ Validates organization membership

### The Database
✅ Recreated RLS policies using `EXISTS` instead of `IN`  
✅ Simplified permission checks  
✅ Removed overly strict `created_by` validation

---

## Files Reference

| File | Purpose |
|------|---------|
| `/FIX_RLS_NOW.md` | Quick 2-minute fix (start here!) |
| `/TROUBLESHOOT_RLS_ERROR.md` | Detailed troubleshooting guide |
| `/database-migrations/fix_scheduled_jobs_rls_v2.sql` | Complete RLS fix script |
| `/database-migrations/test_background_import_setup.sql` | Diagnostic test script |
| `/database-migrations/verify_background_imports.sql` | Setup verification |

---

## How Background Imports Work

1. **Upload CSV** → File is parsed in browser
2. **Map Columns** → Match CSV columns to database fields
3. **Click "Run in Background"** → Job is created in `scheduled_jobs` table
4. **Auto-Processing** → BackgroundImportManager checks every 5 seconds
5. **Import Runs** → Records are inserted in batches
6. **Notification** → Browser notification when complete

---

## Features

✨ **Run Large Imports** - Import 1000s of records without waiting  
✨ **Close the Page** - Jobs continue processing in the background  
✨ **Real-Time Progress** - See progress updates in Background Imports view  
✨ **Browser Notifications** - Get notified when imports complete  
✨ **Error Handling** - Failed jobs show detailed error messages  
✨ **Job History** - View all past imports and their status

---

## Console Logs to Look For

### ✅ Success
```
✅ Authenticated user: abc-123-def-456
📋 App user ID: abc-123-def-456
📋 App user org: ORG001
👤 Profile lookup: {id: "...", organization_id: "ORG001", ...}
✅ Profile verified with org: ORG001
📤 Inserting job data: {...}
✅ Job created: {...}
```

### ❌ Errors
```
❌ Auth error: {...}                    → Not logged in
❌ Profile error: {...}                 → Profile doesn't exist
❌ Profile missing organization_id      → No organization assigned
❌ Insert error: {...}                  → RLS policy blocking
```

---

## Next Steps After Setup

1. ✅ Test with small file (100 records)
2. ✅ Test with large file (1000+ records)
3. ✅ Test closing page during import
4. ✅ Enable browser notifications
5. ✅ Check Background Imports view
6. ✅ Test duplicate handling (if enabled)

---

## Need Help?

1. **Quick Fix** → Read `/FIX_RLS_NOW.md`
2. **Detailed Guide** → Read `/TROUBLESHOOT_RLS_ERROR.md`
3. **Test Setup** → Run `/database-migrations/test_background_import_setup.sql`
4. **Check Console** → Press F12 and look for ❌ errors

---

**That's it! Copy the SQL above, run it in Supabase, and you're done.** 🎉
