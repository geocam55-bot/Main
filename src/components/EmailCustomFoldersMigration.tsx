import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, Copy, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';

const SQL_MIGRATION = `-- Create email_custom_folders table for user-defined email folders
CREATE TABLE IF NOT EXISTS email_custom_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_custom_folders_user ON email_custom_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_email_custom_folders_org ON email_custom_folders(organization_id);

-- Enable RLS
ALTER TABLE email_custom_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make this migration idempotent)
DROP POLICY IF EXISTS "Users can view their own custom folders" ON email_custom_folders;
DROP POLICY IF EXISTS "Users can create their own custom folders" ON email_custom_folders;
DROP POLICY IF EXISTS "Users can update their own custom folders" ON email_custom_folders;
DROP POLICY IF EXISTS "Users can delete their own custom folders" ON email_custom_folders;

-- RLS Policies
CREATE POLICY "Users can view their own custom folders"
  ON email_custom_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom folders"
  ON email_custom_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom folders"
  ON email_custom_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom folders"
  ON email_custom_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Update the emails table to allow custom folder IDs (change folder column type if needed)
-- Note: The folder column should already support text/varchar, but this ensures it
ALTER TABLE emails ALTER COLUMN folder TYPE TEXT;

-- Drop the check constraint that restricts folder values to predefined options
-- This allows custom folder UUIDs to be stored
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_folder_check;

-- Add a comment
COMMENT ON TABLE email_custom_folders IS 'User-defined custom folders for email organization';
`;

export function EmailCustomFoldersMigration() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(SQL_MIGRATION);
    if (success) {
      setCopied(true);
      toast.success('SQL migration copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Email Custom Folders Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <p className="font-medium mb-2">This migration creates the custom email folders feature:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Creates <code className="bg-muted px-1 rounded">email_custom_folders</code> table</li>
              <li>Allows users to create, edit, and delete their own custom folders</li>
              <li>Each folder has a name and color for visual organization</li>
              <li>Full RLS (Row Level Security) policies for data isolation</li>
              <li>Updates emails table to support custom folder IDs</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">SQL Migration Script</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
            {SQL_MIGRATION}
          </pre>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-900 text-sm">
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Click "Copy SQL" above</li>
              <li>Go to your Supabase Dashboard → SQL Editor</li>
              <li>Paste the SQL and click "Run"</li>
              <li>Refresh your ProSpaces CRM browser tab</li>
              <li>Go to Email module and start creating custom folders!</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}