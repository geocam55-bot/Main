-- Update email folders to support more folder types
-- This migration adds support for additional folders like 'important', 'spam', 'drafts'

-- Drop the existing constraint
ALTER TABLE emails 
DROP CONSTRAINT IF EXISTS emails_folder_check;

-- Add new constraint with expanded folder options
ALTER TABLE emails 
ADD CONSTRAINT emails_folder_check 
CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archive', 'spam', 'important'));

-- Add index for starred emails (important/saved)
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred) WHERE is_starred = true;

-- Add index for unread emails
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read) WHERE is_read = false;

-- Add composite index for folder + received_at for faster folder queries
CREATE INDEX IF NOT EXISTS idx_emails_folder_received ON emails(folder, received_at DESC);

-- Add has_attachments column for future attachment support
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;

-- Add labels/categories support (for future Gmail-like labels)
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS labels TEXT[];

-- Add index for labels array
CREATE INDEX IF NOT EXISTS idx_emails_labels ON emails USING GIN(labels) WHERE labels IS NOT NULL;

-- Add priority/importance level
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));

-- Add flag/follow-up support
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_emails_is_flagged ON emails(is_flagged) WHERE is_flagged = true;

-- Comments for documentation
COMMENT ON COLUMN emails.folder IS 'Email folder: inbox, sent, drafts, trash, archive, spam, important';
COMMENT ON COLUMN emails.is_starred IS 'Starred/important emails';
COMMENT ON COLUMN emails.is_flagged IS 'Flagged emails for follow-up';
COMMENT ON COLUMN emails.priority IS 'Email priority: low, normal, high';
COMMENT ON COLUMN emails.labels IS 'Array of custom labels/categories';
COMMENT ON COLUMN emails.has_attachments IS 'Whether email has attachments';
