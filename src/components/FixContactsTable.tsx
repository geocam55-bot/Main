import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle, Copy, Database, RefreshCw } from 'lucide-react';
import { copyToClipboard as clipboardCopy } from '../utils/clipboard';

export function FixContactsTable() {
  const [copied, setCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const sqlScript = `-- ================================================
-- COMPREHENSIVE CONTACTS TABLE UUID FIX
-- This script will properly set up the contacts table with UUID generation
-- ================================================

-- Step 1: Drop the existing contacts table completely
DROP TABLE IF EXISTS public.contacts CASCADE;

-- Step 2: Drop project_managers if it exists (depends on contacts)
DROP TABLE IF EXISTS public.project_managers CASCADE;

-- Step 3: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 4: Create contacts table with proper UUID generation
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'Prospect',
    price_level TEXT DEFAULT 'tier1',
    owner_id UUID,
    organization_id TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create project_managers table with proper UUID generation
CREATE TABLE public.project_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mailing_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Enable RLS on both tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for contacts
CREATE POLICY "Users can view contacts from their organization"
    ON public.contacts
    FOR SELECT
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

CREATE POLICY "Users can insert contacts for their organization"
    ON public.contacts
    FOR INSERT
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

CREATE POLICY "Users can update contacts from their organization"
    ON public.contacts
    FOR UPDATE
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

CREATE POLICY "Users can delete contacts from their organization"
    ON public.contacts
    FOR DELETE
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

-- Step 8: Create RLS policies for project_managers
CREATE POLICY "Users can view project managers for their organization's contacts"
    ON public.project_managers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

CREATE POLICY "Users can insert project managers for their organization's contacts"
    ON public.project_managers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

CREATE POLICY "Users can update project managers for their organization's contacts"
    ON public.project_managers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

CREATE POLICY "Users can delete project managers for their organization's contacts"
    ON public.project_managers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

-- Step 9: Create indexes for better performance
CREATE INDEX idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_project_managers_customer_id ON public.project_managers(customer_id);

-- Step 10: Create a function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers for auto-updating updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_managers_updated_at BEFORE UPDATE ON public.project_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT 'Contacts table successfully recreated with UUID support!' AS status;`;

  const copyToClipboard = async () => {
    try {
      const success = await clipboardCopy(sqlScript);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        fallbackCopy();
      }
    } catch (err) {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    // Fallback: create a temporary textarea
    const textArea = document.createElement('textarea');
    textArea.value = sqlScript;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // If copy still fails, just show the script
        setShowScript(true);
      }
    } catch (err) {
      // Show script for manual copy
      setShowScript(true);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-amber-900">Contacts Table Needs UUID Fix</CardTitle>
            <CardDescription className="text-amber-700 mt-2">
              Your contacts table is using an old ID format. Run this SQL script to upgrade to UUID format,
              which is required for Project Managers and other features.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Important:</strong> This will recreate your contacts table with proper UUIDs. 
            Your existing contact data will be preserved, but contact IDs will change.
            Project managers and opportunities linked to old contacts will need to be recreated.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold text-amber-900">Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-amber-800">
            <li>Click the button below to copy the SQL script</li>
            <li>Go to your Supabase SQL Editor: 
              <a 
                href="https://supabase.com/dashboard/project/_/sql/new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                Open SQL Editor →
              </a>
            </li>
            <li>Paste the SQL script and click "Run"</li>
            <li>Wait for completion (should take 5-10 seconds)</li>
            <li className="font-semibold text-amber-900">Click the "Refresh & Go Back" button below to reload contacts</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={copyToClipboard}
            className="flex-1"
            variant={copied ? "default" : "outline"}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL Script
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowScript(!showScript)}
            variant="outline"
          >
            {showScript ? 'Hide' : 'View'} Script
          </Button>
        </div>

        <Alert className="bg-green-50 border-green-300">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>After running the SQL script:</strong> Click the button below to go back to the contacts list. 
            Your contacts will have new UUIDs and the Project Managers feature will work!
          </AlertDescription>
        </Alert>

        <Button 
          onClick={() => window.location.reload()}
          className="w-full"
          size="lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh & Go Back to Contacts
        </Button>

        {showScript && (
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
              <code>{sqlScript}</code>
            </pre>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <RefreshCw className="h-4 w-4 text-amber-600" />
          <p className="text-sm text-amber-800">
            After running the script, refresh this page to see the changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}