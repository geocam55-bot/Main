import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

const MIGRATION_SQL = `-- Add manager_id column to profiles table
-- This allows users to be assigned a manager for hierarchical organization structure

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index on manager_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- Add comment
COMMENT ON COLUMN public.profiles.manager_id IS 'References the manager (another profile) for this user';`;

export function ManagerMigrationHelper() {
  const [copied, setCopied] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(MIGRATION_SQL);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (error) {
      // fallback below
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = MIGRATION_SQL;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setShowSQL(true);
      }
    } catch (error) {
      setShowSQL(true);
    }
  };

  const handleRunMigration = async () => {
    setIsRunning(true);
    try {
      // Try to run the migration directly
      const { error } = await supabase.rpc('exec_sql', { 
        sql: MIGRATION_SQL 
      });

      if (error) {
        toast.error('Cannot run migration automatically. Please use the SQL Editor in Supabase dashboard.');
        setShowSQL(true);
      } else {
        toast.success('✅ Migration successful! The manager_id column has been added.');
        // Refresh the page after a short delay
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      toast.error('Cannot run migration automatically. Please use the SQL Editor in Supabase dashboard.');
      setShowSQL(true);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-blue-900">Manager Feature Requires Database Update</CardTitle>
            <CardDescription className="text-blue-700 mt-1">
              To enable the manager assignment feature, we need to add a new column to your database.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Quick Setup:</strong> Follow these steps to enable manager assignments.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Copy the SQL migration</p>
              <p className="text-sm text-muted-foreground mt-1">Click the button below to copy the SQL code</p>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy SQL Migration
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowSQL(!showSQL)}
                  variant="ghost"
                  size="sm"
                >
                  {showSQL ? 'Hide' : 'View'} SQL
                </Button>
              </div>
              {showSQL && (
                <pre className="mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {MIGRATION_SQL}
                </pre>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Open Supabase SQL Editor</p>
              <p className="text-sm text-muted-foreground mt-1">
                Go to your Supabase dashboard → SQL Editor → New Query
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 mt-2"
              >
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Supabase Dashboard
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Run the migration</p>
              <p className="text-sm text-muted-foreground mt-1">
                Paste the SQL code and click <strong>Run</strong> or press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                ✅ After running, refresh this page to use the manager feature
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>💡 What this migration does:</strong>
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside ml-2">
            <li>Adds a <code className="bg-blue-100 px-1 rounded">manager_id</code> column to the profiles table</li>
            <li>Creates a foreign key relationship to allow users to have managers</li>
            <li>Adds an index for efficient manager lookups</li>
            <li>Existing users will have no manager assigned by default (NULL)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}