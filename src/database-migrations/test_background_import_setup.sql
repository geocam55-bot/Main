-- ============================================
-- TEST BACKGROUND IMPORT SETUP
-- ============================================
-- Run this entire script to test if everything is configured correctly
-- This will create a test job and then delete it

-- PART 1: DIAGNOSTIC CHECKS
-- ============================================

SELECT '====== DIAGNOSTIC CHECKS ======' as section;

-- Check 1: Table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_jobs')
    THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist - Run scheduled_jobs_table.sql first!'
  END as check_1_table;

-- Check 2: RLS is enabled
SELECT 
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'scheduled_jobs')
    THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled'
  END as check_2_rls;

-- Check 3: Policies exist
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'scheduled_jobs') >= 4
    THEN '✅ ' || (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'scheduled_jobs') || ' policies found'
    ELSE '❌ Missing policies - should have at least 4'
  END as check_3_policies;

-- Check 4: Your auth user
SELECT '====== YOUR USER INFO ======' as section;

SELECT 
  'Auth User ID' as field,
  COALESCE(auth.uid()::text, '❌ NOT AUTHENTICATED') as value
UNION ALL
SELECT 
  'Profile Exists',
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    THEN '✅ Yes'
    ELSE '❌ No - Profile missing!'
  END
UNION ALL
SELECT 
  'Organization ID',
  COALESCE((SELECT organization_id FROM profiles WHERE id = auth.uid()), '❌ NULL - No organization!')
UNION ALL
SELECT 
  'Email',
  COALESCE((SELECT email FROM profiles WHERE id = auth.uid()), '❌ NULL')
UNION ALL
SELECT 
  'Role',
  COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), '❌ NULL');

-- Check 5: List current policies
SELECT '====== CURRENT POLICIES ======' as section;

SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅'
    ELSE '⚠️'
  END as permissive
FROM pg_policies
WHERE tablename = 'scheduled_jobs'
ORDER BY cmd, policyname;

-- PART 2: TEST INSERT
-- ============================================

SELECT '====== TESTING INSERT PERMISSION ======' as section;

-- Attempt to insert a test job
DO $$
DECLARE
  v_org_id TEXT;
  v_user_id UUID;
  v_test_id UUID;
BEGIN
  -- Get user info
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ NOT AUTHENTICATED - Cannot test insert';
    RETURN;
  END IF;
  
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ NO ORGANIZATION - Cannot test insert';
    RETURN;
  END IF;
  
  -- Try to insert a test job
  INSERT INTO scheduled_jobs (
    organization_id,
    created_by,
    job_type,
    data_type,
    scheduled_time,
    status,
    creator_name,
    file_name,
    file_data
  ) VALUES (
    v_org_id,
    v_user_id,
    'import',
    'inventory',
    NOW() + INTERVAL '1 hour',
    'pending',
    'Test User',
    'test_background_import.csv',
    '{"records": [], "mapping": {}}'::jsonb
  )
  RETURNING id INTO v_test_id;
  
  RAISE NOTICE '✅ SUCCESS - Test job created with ID: %', v_test_id;
  
  -- Clean up the test job
  DELETE FROM scheduled_jobs WHERE id = v_test_id;
  
  RAISE NOTICE '✅ Test job deleted - cleanup complete';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
    RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- PART 3: SUMMARY
-- ============================================

SELECT '====== SUMMARY ======' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_jobs')
      AND (SELECT relrowsecurity FROM pg_class WHERE relname = 'scheduled_jobs')
      AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'scheduled_jobs') >= 4
      AND auth.uid() IS NOT NULL
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
      AND (SELECT organization_id FROM profiles WHERE id = auth.uid()) IS NOT NULL
    THEN '✅ ALL CHECKS PASSED - Background imports should work!'
    ELSE '❌ SOME CHECKS FAILED - Review the output above'
  END as final_status;

-- Show any current jobs
SELECT '====== CURRENT JOBS (Last 5) ======' as section;

SELECT 
  id,
  job_type,
  data_type,
  status,
  TO_CHAR(scheduled_time, 'YYYY-MM-DD HH24:MI:SS') as scheduled_time,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
  creator_name
FROM scheduled_jobs
ORDER BY created_at DESC
LIMIT 5;

-- Done!
SELECT '====== TEST COMPLETE ======' as section;
SELECT 'Review the output above to see if everything is configured correctly.' as next_step;
