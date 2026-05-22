-- Calendar Sync Migration
-- This migration adds calendar sync functionality with Google Calendar and Outlook Calendar
-- Shares same RLS policies as email_accounts for consistency

-- Calendar Accounts Table
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  email TEXT NOT NULL,
  
  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  
  -- Calendar-specific settings
  calendar_id TEXT, -- External calendar ID (e.g., primary, or specific calendar)
  timezone TEXT DEFAULT 'UTC',
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  connected BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one account per email per user
  UNIQUE(user_id, email)
);

-- Calendar Event Mappings Table
-- Maps CRM appointments to external calendar events for two-way sync
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  calendar_account_id UUID REFERENCES calendar_accounts(id) ON DELETE CASCADE NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- External event data
  external_event_id TEXT NOT NULL, -- Event ID from Google/Outlook
  external_event_etag TEXT, -- For conflict detection
  
  -- Sync metadata
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_direction TEXT CHECK (sync_direction IN ('crm_to_calendar', 'calendar_to_crm', 'bidirectional')),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate mappings
  UNIQUE(appointment_id, calendar_account_id)
);

-- Calendar Sync Log Table (for debugging and audit)
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_account_id UUID REFERENCES calendar_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'auto', 'webhook')),
  sync_direction TEXT CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  
  -- Results
  events_imported INTEGER DEFAULT 0,
  events_exported INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  
  -- Details
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_details JSONB,
  
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_accounts_user ON calendar_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_accounts_org ON calendar_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_accounts_sync ON calendar_accounts(sync_enabled, last_sync);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_appointment ON calendar_event_mappings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_account ON calendar_event_mappings(calendar_account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_external ON calendar_event_mappings(external_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_status ON calendar_event_mappings(sync_status);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_account ON calendar_sync_log(calendar_account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_user ON calendar_sync_log(user_id);

-- Row Level Security
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Calendar Accounts Policies (mirrors email_accounts policies)
CREATE POLICY "Users can view their own calendar accounts"
  ON calendar_accounts FOR SELECT
  USING (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own calendar accounts"
  ON calendar_accounts FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own calendar accounts"
  ON calendar_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar accounts"
  ON calendar_accounts FOR DELETE
  USING (user_id = auth.uid());

-- Calendar Event Mappings Policies
CREATE POLICY "Users can view their calendar event mappings"
  ON calendar_event_mappings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    ) AND
    calendar_account_id IN (
      SELECT id FROM calendar_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calendar event mappings"
  ON calendar_event_mappings FOR INSERT
  WITH CHECK (
    calendar_account_id IN (
      SELECT id FROM calendar_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their calendar event mappings"
  ON calendar_event_mappings FOR UPDATE
  USING (
    calendar_account_id IN (
      SELECT id FROM calendar_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their calendar event mappings"
  ON calendar_event_mappings FOR DELETE
  USING (
    calendar_account_id IN (
      SELECT id FROM calendar_accounts WHERE user_id = auth.uid()
    )
  );

-- Calendar Sync Log Policies
CREATE POLICY "Users can view their own sync logs"
  ON calendar_sync_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync logs"
  ON calendar_sync_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_accounts_updated_at
  BEFORE UPDATE ON calendar_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_account_updated_at();

CREATE TRIGGER update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_account_updated_at();

-- Add calendar sync scope to oauth_secrets if not exists
-- This uses the same oauth_secrets table as email
-- Note: If oauth_secrets table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS oauth_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only allow service role to access secrets
ALTER TABLE oauth_secrets ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists, then create it (to avoid conflicts)
DROP POLICY IF EXISTS "Only service role can access oauth secrets" ON oauth_secrets;

CREATE POLICY "Only service role can access oauth secrets"
  ON oauth_secrets
  USING (false);

-- Insert calendar OAuth credentials
INSERT INTO oauth_secrets (provider, client_id, client_secret)
VALUES 
  ('google_calendar', 'YOUR_GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_SECRET'),
  ('outlook_calendar', 'YOUR_MICROSOFT_CLIENT_ID', 'YOUR_MICROSOFT_CLIENT_SECRET')
ON CONFLICT (provider) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE calendar_accounts IS 'Stores connected calendar accounts (Google Calendar, Outlook Calendar)';
COMMENT ON TABLE calendar_event_mappings IS 'Maps CRM appointments to external calendar events for two-way sync';
COMMENT ON TABLE calendar_sync_log IS 'Audit log for calendar sync operations';
COMMENT ON COLUMN calendar_accounts.calendar_id IS 'External calendar ID - for Google: primary or specific calendar, for Outlook: calendar ID';
COMMENT ON COLUMN calendar_event_mappings.external_event_etag IS 'ETag for conflict detection and optimistic locking';
COMMENT ON COLUMN calendar_event_mappings.sync_direction IS 'Tracks which direction the last sync occurred';