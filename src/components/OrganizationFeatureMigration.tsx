import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

const MIGRATION_SQL = `-- ============================================================================
-- Add Organization Feature Toggle Columns Migration
-- ============================================================================
-- This migration adds module toggle columns to the organizations table.
-- Run this in your Supabase SQL Editor if you already have an organizations table.
-- ============================================================================

-- Add feature toggle columns to organizations table
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS ai_suggestions_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS inventory_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS import_export_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS documents_enabled boolean DEFAULT true;

-- Update existing organizations to have default values
UPDATE public.organizations
SET 
  ai_suggestions_enabled = COALESCE(ai_suggestions_enabled, false),
  marketing_enabled = COALESCE(marketing_enabled, true),
  inventory_enabled = COALESCE(inventory_enabled, true),
  import_export_enabled = COALESCE(import_export_enabled, true),
  documents_enabled = COALESCE(documents_enabled, true);

-- ============================================================================
-- Migration Complete!
-- ============================================================================`;

export function OrganizationFeatureMigration() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(MIGRATION_SQL);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Failed to copy SQL
      }
    } catch (error) {
      // Failed to copy SQL
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Organization Feature Columns Migration
        </CardTitle>
        <CardDescription>
          Add module toggle columns to your organizations table (AI Suggestions, Marketing, Inventory, Import/Export, Documents)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            If you're getting errors about missing columns like "ai_suggestions_enabled", run this migration to add them to your database.
          </AlertDescription>
        </Alert>

        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono whitespace-pre">
            {MIGRATION_SQL}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="gap-2"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy SQL
              </>
            )}
          </Button>

          <Button
            onClick={openSupabase}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Supabase SQL Editor
          </Button>
        </div>

        <Alert>
          <AlertDescription className="space-y-2">
            <p className="font-medium">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Copy SQL" to copy the migration script</li>
              <li>Click "Open Supabase SQL Editor" to open your Supabase dashboard</li>
              <li>Paste the SQL into the editor</li>
              <li>Click "Run" to execute the migration</li>
              <li>Refresh your app - the errors should be gone!</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}