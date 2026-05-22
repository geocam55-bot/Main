-- ============================================
-- SCHEDULED JOBS TABLE FOR IMPORT/EXPORT
-- ============================================
-- This table stores scheduled import/export jobs that will be processed in the background
-- Run this SQL in your Supabase SQL Editor

-- Create scheduled_jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('import', 'export')),
  data_type TEXT NOT NULL CHECK (data_type IN ('contacts', 'inventory', 'bids')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  record_count INTEGER,
  file_name TEXT,
  file_data JSONB, -- Stores the actual data for import jobs
  creator_name TEXT,
  -- Repeat scheduling fields
  repeat_type TEXT CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'custom')) DEFAULT 'none',
  repeat_interval INTEGER, -- For custom intervals (e.g., every X days/weeks/months)
  repeat_end_date TIMESTAMP WITH TIME ZONE, -- When to stop repeating
  repeat_days_of_week TEXT[], -- For weekly (e.g., ['mon','wed'])
  repeat_days_of_month INTEGER[], -- For monthly (e.g., [1,15,30])
  CONSTRAINT valid_scheduled_time CHECK (scheduled_time > created_at)
);

-- Add indexes for performance
CREATE INDEX idx_scheduled_jobs_org ON scheduled_jobs(organization_id);
CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_scheduled_time ON scheduled_jobs(scheduled_time);
CREATE INDEX idx_scheduled_jobs_created_by ON scheduled_jobs(created_by);

-- Add RLS policies
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to see jobs from their organization
CREATE POLICY "Users can view jobs from their organization"
  ON scheduled_jobs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow users to create jobs in their organization
-- Updated policy: No longer requires created_by check to allow service role inserts
CREATE POLICY "Users can create jobs in their organization"
  ON scheduled_jobs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow users to update their own jobs (e.g., cancel)
CREATE POLICY "Users can update their own jobs"
  ON scheduled_jobs
  FOR UPDATE
  USING (created_by = auth.uid());

-- Allow users to delete their own completed/failed jobs
CREATE POLICY "Users can delete their own jobs"
  ON scheduled_jobs
  FOR DELETE
  USING (created_by = auth.uid());

-- Add comment
COMMENT ON TABLE scheduled_jobs IS 'Stores scheduled import/export jobs for background processing';

-- ============================================
-- OPTIONAL: CREATE A FUNCTION TO PROCESS PENDING JOBS
-- ============================================
-- This would be called by a Supabase Edge Function or external cron job
-- For now, this is just documentation - actual processing would require Edge Functions

/*
CREATE OR REPLACE FUNCTION process_pending_jobs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark overdue jobs that are still pending as failed
  UPDATE scheduled_jobs
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = 'Job timed out - scheduled time has passed'
  WHERE 
    status = 'pending'
    AND scheduled_time < NOW() - INTERVAL '1 hour';
    
  -- Log the update
  RAISE NOTICE 'Processed pending jobs at %', NOW();
END;
$$;

-- To run this manually: SELECT process_pending_jobs();
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the table was created correctly

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scheduled_jobs'
ORDER BY ordinal_position;

-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'scheduled_jobs'::regclass;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'scheduled_jobs';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'scheduled_jobs';