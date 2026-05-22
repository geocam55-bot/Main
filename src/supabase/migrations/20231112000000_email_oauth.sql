-- Email OAuth Accounts Table
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'apple', 'imap')),
  email TEXT NOT NULL,
  
  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  
  -- IMAP config (for non-OAuth)
  imap_host TEXT,
  imap_port INTEGER,
  imap_username TEXT,
  imap_password TEXT,
  
  -- Metadata
  connected BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one account per email per user
  UNIQUE(user_id, email)
);

-- Email Messages Table
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Email data
  message_id TEXT NOT NULL, -- Provider's message ID
  thread_id TEXT,
  subject TEXT,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  body_text TEXT,
  body_html TEXT,
  
  -- Metadata
  folder TEXT NOT NULL DEFAULT 'inbox', -- inbox, sent, archive, trash, spam
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  
  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(account_id, message_id)
);

-- Email Attachments Table
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT, -- Path in Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_org ON email_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_org ON email_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(received_at DESC);

-- Row Level Security
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- Email Accounts Policies
CREATE POLICY "Users can view their own email accounts"
  ON email_accounts FOR SELECT
  USING (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own email accounts"
  ON email_accounts FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own email accounts"
  ON email_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own email accounts"
  ON email_accounts FOR DELETE
  USING (user_id = auth.uid());

-- Email Messages Policies
CREATE POLICY "Users can view emails from their accounts"
  ON email_messages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    ) AND
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert emails to their accounts"
  ON email_messages FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own emails"
  ON email_messages FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own emails"
  ON email_messages FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

-- Email Attachments Policies
CREATE POLICY "Users can view attachments from their emails"
  ON email_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM email_messages 
      WHERE account_id IN (
        SELECT id FROM email_accounts WHERE user_id = auth.uid()
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_email_account_updated_at();

-- OAuth secrets storage (use Supabase Vault in production)
-- For development, create a secrets table
CREATE TABLE IF NOT EXISTS oauth_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only allow service role to access secrets
ALTER TABLE oauth_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access oauth secrets"
  ON oauth_secrets FOR ALL
  USING (auth.role() = 'service_role');