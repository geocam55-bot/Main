-- Add Azure OAuth token fields to email_accounts table
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS azure_access_token TEXT,
ADD COLUMN IF NOT EXISTS azure_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS azure_token_expires_at TIMESTAMPTZ;

-- Create oauth_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS oauth_states_state_idx ON oauth_states(state);

-- Clean up old states (older than 1 hour)
CREATE OR REPLACE FUNCTION clean_old_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON oauth_states TO authenticated;
GRANT ALL ON oauth_states TO service_role;
