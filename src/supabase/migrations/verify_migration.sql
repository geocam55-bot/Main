-- Verification script for profiles table migration
-- Run this AFTER applying the main migration to verify everything is set up correctly

-- 1. Check if profiles table exists
SELECT 
  'profiles table exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL - Table not found'
  END as status;

-- 2. Count profiles
SELECT 
  'profiles count' as check_name,
  COUNT(*) as total_profiles,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - Profiles found' 
    ELSE '⚠️ WARNING - No profiles found (might be expected)'
  END as status
FROM public.profiles;

-- 3. Check RLS is enabled
SELECT 
  'RLS enabled' as check_name,
  CASE 
    WHEN relrowsecurity THEN '✅ PASS - RLS is enabled'
    ELSE '❌ FAIL - RLS is NOT enabled'
  END as status
FROM pg_class
WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;

-- 4. List all RLS policies
SELECT 
  'RLS policies' as check_name,
  policyname as policy_name,
  cmd as command,
  '✅' as status
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check if triggers exist
SELECT 
  'Triggers' as check_name,
  trigger_name,
  event_manipulation as event,
  '✅' as status
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth'
  AND trigger_name IN ('on_auth_user_created', 'on_auth_user_login');

-- 6. Check for larry.lee@ronaatlantic.ca specifically
SELECT 
  'Larry Lee found' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'larry.lee@ronaatlantic.ca')
    THEN '✅ PASS - Larry found in profiles'
    ELSE '⚠️ WARNING - Larry not found (check if user exists in auth.users)'
  END as status;

-- 7. Show all users grouped by organization
SELECT 
  organization_id,
  COUNT(*) as user_count,
  STRING_AGG(email, ', ') as users
FROM public.profiles
GROUP BY organization_id
ORDER BY organization_id;

-- 8. Test query as super_admin (simulate RLS)
-- This shows what a super_admin would see
SELECT 
  'Super Admin View Test' as test_name,
  COUNT(*) as visible_users
FROM public.profiles;

-- 9. Show all profiles with details
SELECT 
  email,
  name,
  role,
  organization_id,
  status,
  last_login,
  created_at
FROM public.profiles
ORDER BY organization_id, email;

-- 10. Check if any auth users are missing from profiles
SELECT 
  'Missing Profiles' as check_name,
  COUNT(*) as missing_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - All auth users have profiles'
    ELSE '⚠️ WARNING - Some auth users missing from profiles'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- If there are missing profiles, show them:
SELECT 
  'Missing Users' as info,
  au.email,
  au.raw_user_meta_data->>'role' as role,
  au.raw_user_meta_data->>'organizationId' as org_id,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
