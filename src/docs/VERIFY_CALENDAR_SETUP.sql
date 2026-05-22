-- ============================================================================
-- CALENDAR SYNC SETUP VERIFICATION SCRIPT
-- ============================================================================
-- Run this script in your Supabase SQL Editor to verify calendar sync setup
-- ============================================================================

-- 1. Check if calendar tables exist
-- ============================================================================
SELECT 
  '✅ Calendar tables check' as check_name,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS - All 3 tables exist'
    ELSE '❌ FAIL - Missing tables: ' || (3 - COUNT(*))::text
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('calendar_accounts', 'calendar_event_mappings', 'calendar_sync_log');

-- 2. List all calendar-related tables
-- ============================================================================
SELECT 
  '📋 Calendar tables' as info,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'calendar%'
ORDER BY table_name;

-- 3. Check RLS policies
-- ============================================================================
SELECT 
  '🔐 RLS Policies check' as check_name,
  CASE 
    WHEN COUNT(*) >= 12 THEN '✅ PASS - RLS policies configured'
    ELSE '⚠️  WARNING - Only ' || COUNT(*)::text || ' policies found (expected 12+)'
  END as status
FROM pg_policies 
WHERE tablename LIKE 'calendar%';

-- 4. List all RLS policies for calendar tables
-- ============================================================================
SELECT 
  '🔐 RLS Policy details' as info,
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN permissive = 't' THEN 'Permissive' ELSE 'Restrictive' END as type
FROM pg_policies 
WHERE tablename LIKE 'calendar%'
ORDER BY tablename, policyname;

-- 5. Check indexes
-- ============================================================================
SELECT 
  '⚡ Index check' as check_name,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ PASS - Indexes created'
    ELSE '⚠️  WARNING - Only ' || COUNT(*)::text || ' indexes found (expected 7+)'
  END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'calendar%';

-- 6. List all indexes
-- ============================================================================
SELECT 
  '⚡ Index details' as info,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'calendar%'
ORDER BY tablename, indexname;

-- 7. Check OAuth secrets table
-- ============================================================================
SELECT 
  '🔑 OAuth secrets check' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'oauth_secrets'
    ) THEN '✅ PASS - oauth_secrets table exists'
    ELSE '❌ FAIL - oauth_secrets table missing'
  END as status;

-- 8. Check if calendar OAuth providers are configured
-- ============================================================================
SELECT 
  '🔑 Calendar OAuth providers' as info,
  provider,
  CASE 
    WHEN client_id LIKE 'YOUR_%' THEN '⚠️  PLACEHOLDER - Not configured yet'
    ELSE '✅ Configured'
  END as configuration_status,
  created_at
FROM oauth_secrets
WHERE provider IN ('google_calendar', 'outlook_calendar')
ORDER BY provider;

-- 9. Check for existing calendar accounts (users)
-- ============================================================================
SELECT 
  '👤 Connected calendar accounts' as info,
  COUNT(*) as total_accounts,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN provider = 'google' THEN 1 END) as google_accounts,
  COUNT(CASE WHEN provider = 'outlook' THEN 1 END) as outlook_accounts,
  COUNT(CASE WHEN connected = true THEN 1 END) as active_accounts
FROM calendar_accounts;

-- 10. Check calendar event mappings
-- ============================================================================
SELECT 
  '🔗 Calendar event mappings' as info,
  COUNT(*) as total_mappings,
  COUNT(DISTINCT appointment_id) as mapped_appointments,
  COUNT(DISTINCT calendar_account_id) as accounts_with_mappings,
  COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced,
  COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as errors
FROM calendar_event_mappings;

-- 11. Check sync logs
-- ============================================================================
SELECT 
  '📊 Sync log summary' as info,
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  SUM(events_imported) as total_imported,
  SUM(events_exported) as total_exported,
  MAX(created_at) as last_sync
FROM calendar_sync_log;

-- 12. Recent sync activity (last 10)
-- ============================================================================
SELECT 
  '📊 Recent sync operations' as info,
  csl.created_at,
  ca.email,
  ca.provider,
  csl.sync_type,
  csl.sync_direction,
  csl.events_imported as imported,
  csl.events_exported as exported,
  csl.errors,
  csl.status
FROM calendar_sync_log csl
LEFT JOIN calendar_accounts ca ON csl.calendar_account_id = ca.id
ORDER BY csl.created_at DESC
LIMIT 10;

-- 13. Check appointments table compatibility
-- ============================================================================
SELECT 
  '📅 Appointments table check' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'appointments'
    ) THEN '✅ PASS - appointments table exists'
    ELSE '❌ FAIL - appointments table missing'
  END as status;

-- 14. Check required columns in appointments table
-- ============================================================================
SELECT 
  '📅 Appointments columns' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN ('id', 'title', 'description', 'start_time', 'end_time', 'location', 'organization_id')
ORDER BY column_name;

-- 15. Overall health check summary
-- ============================================================================
SELECT 
  '✅ OVERALL SETUP STATUS' as check_summary,
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('calendar_accounts', 'calendar_event_mappings', 'calendar_sync_log')) = 3
      AND (SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE 'calendar%') >= 12
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'appointments') = 1
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'oauth_secrets') = 1
    )
    THEN '✅✅✅ READY TO USE - All systems go!'
    ELSE '⚠️  SETUP INCOMPLETE - Review warnings above'
  END as status;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- If you see any ❌ FAIL messages, run the migration:
--   /supabase/migrations/20231113000000_calendar_sync.sql
--
-- If OAuth providers show PLACEHOLDER status, update them:
--   UPDATE oauth_secrets 
--   SET client_id = 'YOUR_ACTUAL_CLIENT_ID',
--       client_secret = 'YOUR_ACTUAL_SECRET'
--   WHERE provider = 'google_calendar';
--
-- For setup help, see:
--   /docs/CALENDAR_OAUTH_SETUP.md
--   /docs/CALENDAR_SYNC_IMPLEMENTATION_GUIDE.md
-- ============================================================================
