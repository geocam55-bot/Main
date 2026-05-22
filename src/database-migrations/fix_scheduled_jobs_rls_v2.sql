-- ============================================
-- FIX SCHEDULED JOBS RLS POLICY (VERSION 2)
-- ============================================
-- This is a more robust fix that handles edge cases
-- Run this in your Supabase SQL Editor

-- Step 1: Check current state
SELECT 'Current RLS policies:' as step;
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'scheduled_jobs';

-- Step 2: Drop ALL existing policies on scheduled_jobs
DROP POLICY IF EXISTS "Users can view jobs from their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can create jobs in their organization" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON scheduled_jobs;

-- Step 3: Create new, more permissive policies

-- SELECT policy: Users can view jobs from their organization
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

-- INSERT policy: Users can create jobs if they belong to the organization
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

-- UPDATE policy: Users can update jobs in their organization
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

-- DELETE policy: Users can delete jobs in their organization
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

-- Step 4: Verify the new policies
SELECT 'New RLS policies:' as step;
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'scheduled_jobs'
ORDER BY cmd, policyname;

-- Step 5: Test your setup - Run this to check if you can insert
-- First, check your auth user and profile
SELECT 
  'Your user check:' as check_type,
  auth.uid() as your_auth_id,
  (SELECT organization_id FROM profiles WHERE id = auth.uid()) as your_org_id,
  (SELECT email FROM profiles WHERE id = auth.uid()) as your_email;

-- If the above returns NULL for organization_id, you have a profile issue!
-- Run this to check if your profile exists:
SELECT 
  id, 
  email, 
  organization_id,
  role
FROM profiles
WHERE id = auth.uid();

-- Expected result: You should see your profile with an organization_id
-- If organization_id is NULL, that's the problem!
