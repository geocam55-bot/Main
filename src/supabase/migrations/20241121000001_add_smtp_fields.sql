-- Add SMTP configuration fields to email_accounts table
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS smtp_host TEXT,
ADD COLUMN IF NOT EXISTS smtp_port INTEGER,
ADD COLUMN IF NOT EXISTS smtp_username TEXT,
ADD COLUMN IF NOT EXISTS smtp_password TEXT; -- Should be encrypted in production

-- Add comment
COMMENT ON TABLE email_accounts IS 'Stores email account configurations including IMAP and SMTP settings';
