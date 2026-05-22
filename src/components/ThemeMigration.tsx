import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { copyToClipboard } from '../utils/clipboard';

export function ThemeMigration() {
  const [running, setRunning] = useState(false);
  const [success, setSuccess] = useState(false);

  const sqlScript = `-- Add theme column to profiles table
-- This allows users to save their theme preference to the database

-- Add theme column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'vibrant';

-- Create index for faster theme lookups
CREATE INDEX IF NOT EXISTS idx_profiles_theme ON profiles(theme);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'theme';`;

  const runMigration = async () => {
    setRunning(true);
    try {
      const supabase = createClient();
      
      // Execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql: sqlScript });
      
      if (error) {
        // Migration error
        toast.error('Migration failed. Please run the SQL manually in Supabase SQL Editor.');
      } else {
        setSuccess(true);
        toast.success('Theme column added successfully!');
      }
    } catch (error) {
      // Migration error
      toast.error('Migration failed. Please run the SQL manually in Supabase SQL Editor.');
    } finally {
      setRunning(false);
    }
  };

  const copySQL = () => {
    copyToClipboard(sqlScript);
    toast.success('SQL copied to clipboard!');
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Copy className="h-5 w-5" />
          Theme Persistence Migration
        </CardTitle>
        <CardContent className="text-purple-700">
          Add theme column to profiles table to save user preferences
        </CardContent>
      </CardHeader>
      <CardContent className="space-y-4">
        {success ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Migration completed successfully!</strong>
              <p className="mt-1 text-sm">
                Users can now save their theme preferences to the database.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                This migration adds a <code className="bg-muted px-1 rounded">theme</code> column to the profiles table,
                allowing users to save their theme preferences across devices and sessions.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
              <pre>{sqlScript}</pre>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copySQL}
                variant="outline"
              >
                📋 Copy SQL
              </Button>
              <Button
                onClick={runMigration}
                disabled={running}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {running ? 'Running...' : 'Run Migration (Manual)'}
              </Button>
            </div>

            <Alert className="border-blue-300 bg-blue-50">
              <AlertDescription className="text-blue-900 text-sm">
                <strong>Instructions:</strong>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Click "📋 Copy SQL" above</li>
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Click "New Query"</li>
                  <li>Paste the SQL and click "Run"</li>
                  <li>You should see "Success. No rows returned"</li>
                  <li>Theme preferences will now be saved to the database!</li>
                </ol>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}