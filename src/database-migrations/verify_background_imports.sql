-- ============================================
-- VERIFICATION SCRIPT FOR BACKGROUND IMPORTS
-- ============================================
-- Run this to verify your setup is correct

-- 1. Check if scheduled_jobs table exists
SELECT 
  'Table exists: ' || CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_jobs') 
    THEN '✅ YES' 
    ELSE '❌ NO - Run scheduled_jobs_table.sql first!' 
  END as table_check;

-- 2. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'scheduled_jobs'
ORDER BY ordinal_position;

-- 3. Check RLS is enabled
SELECT 
  'RLS enabled: ' || CASE 
    WHEN relrowsecurity = true THEN '✅ YES' 
    ELSE '❌ NO - Enable RLS!' 
  END as rls_check
FROM pg_class
WHERE relname = 'scheduled_jobs';

-- 4. Check RLS policies
SELECT 
  policyname as policy_name,
  cmd as command,
  permissive,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'scheduled_jobs'
ORDER BY cmd, policyname;

-- 5. Check indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'scheduled_jobs'
ORDER BY indexname;

-- 6. Check constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'scheduled_jobs'::regclass
ORDER BY contype, conname;

-- 7. Test insert permissions (will fail if RLS is blocking)
-- Replace 'your-org-id' and 'your-user-id' with actual values
/*
INSERT INTO scheduled_jobs (
  organization_id,
  created_by,
  job_type,
  data_type,
  scheduled_time,
  status,
  creator_name,
  file_name
) VALUES (
  'your-org-id',  -- Replace with your organization ID
  auth.uid(),      -- Uses current authenticated user
  'import',
  'inventory',
  NOW() + INTERVAL '1 hour',
  'pending',
  'Test User',
  'test_import.csv'
);

-- If successful, clean up the test record
DELETE FROM scheduled_jobs WHERE file_name = 'test_import.csv';
*/

-- 8. Check current jobs
SELECT 
  id,
  job_type,
  data_type,
  status,
  scheduled_time,
  created_at,
  creator_name,
  file_name,
  record_count,
  error_message
FROM scheduled_jobs
ORDER BY created_at DESC
LIMIT 10;

-- 9. Summary
SELECT 
  'SETUP VERIFICATION COMPLETE' as status,
  'Check the results above to ensure everything is configured correctly' as next_step;
