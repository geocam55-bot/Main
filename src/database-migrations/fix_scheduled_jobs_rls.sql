-- ============================================
-- FIX SCHEDULED JOBS RLS POLICY
-- ============================================
-- This script fixes the RLS policy for the scheduled_jobs table
-- Run this in your Supabase SQL Editor

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create jobs in their organization" ON scheduled_jobs;

-- Recreate the INSERT policy without the created_by check
-- This allows users to insert jobs where created_by might be set by the app
CREATE POLICY "Users can create jobs in their organization"
  ON scheduled_jobs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Verify the policy was updated
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'scheduled_jobs' AND cmd = 'INSERT';
