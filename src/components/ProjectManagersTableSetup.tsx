import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Database, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function ProjectManagersTableSetup() {
  const [showScript, setShowScript] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const SQL_SCRIPT = `-- Create project_managers table
CREATE TABLE IF NOT EXISTS project_managers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  mailing_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE project_managers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project managers in their org" ON project_managers;
DROP POLICY IF EXISTS "Users can create project managers in their org" ON project_managers;
DROP POLICY IF EXISTS "Users can update project managers in their org" ON project_managers;
DROP POLICY IF EXISTS "Users can delete project managers in their org" ON project_managers;

-- Policy: Users can view project managers for contacts in their organization
CREATE POLICY "Users can view project managers in their org" 
ON project_managers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = project_managers.customer_id
    AND contacts.organization_id = (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Users can create project managers for contacts in their organization
CREATE POLICY "Users can create project managers in their org" 
ON project_managers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = project_managers.customer_id
    AND contacts.organization_id = (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Users can update project managers for contacts in their organization
CREATE POLICY "Users can update project managers in their org" 
ON project_managers FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = project_managers.customer_id
    AND contacts.organization_id = (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = project_managers.customer_id
    AND contacts.organization_id = (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Users can delete project managers for contacts in their organization
CREATE POLICY "Users can delete project managers in their org" 
ON project_managers FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = project_managers.customer_id
    AND contacts.organization_id = (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_managers_customer_id ON project_managers(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_created_at ON project_managers(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_managers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_managers_updated_at ON project_managers;
CREATE TRIGGER update_project_managers_updated_at
  BEFORE UPDATE ON project_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_project_managers_updated_at();`;

  const copyToClipboard = () => {
    const textArea = document.createElement('textarea');
    textArea.value = SQL_SCRIPT;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      textArea.remove();
      setCopySuccess(true);
      toast.success('SQL script copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      textArea.remove();
      setShowScript(true);
      toast.error('Auto-copy failed. Script shown below - please copy manually.');
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Database className="h-5 w-5" />
          Project Managers Table Setup Required
        </CardTitle>
        <CardDescription className="text-orange-700">
          The project_managers table doesn't exist in your Supabase database yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-300 bg-orange-100">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Setup Required:</strong> You need to create the project_managers table in Supabase to manage project managers for your contacts.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm text-orange-900">
            <strong>Follow these steps:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-orange-800">
            <li>Click the "Copy SQL Script" button below</li>
            <li>Open your <strong>Supabase Dashboard</strong></li>
            <li>Go to <strong>SQL Editor</strong> (in the left sidebar)</li>
            <li>Click <strong>"New Query"</strong></li>
            <li>Paste the SQL script</li>
            <li>Click <strong>"Run"</strong></li>
            <li>Return here and refresh the page</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={copyToClipboard}
            className="flex-1"
            variant="default"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copySuccess ? 'Copied!' : 'Copy SQL Script'}
          </Button>
          <Button 
            onClick={() => setShowScript(!showScript)}
            variant="outline"
          >
            {showScript ? 'Hide Script' : 'Show Script'}
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Refresh
          </Button>
        </div>

        {showScript && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-orange-900">
                <strong>SQL Script:</strong> Select all and copy (Ctrl+A, Ctrl+C)
              </p>
            </div>
            <textarea
              readOnly
              value={SQL_SCRIPT}
              className="w-full h-96 p-3 bg-gray-900 text-green-400 text-xs rounded font-mono overflow-auto resize-y"
              onClick={(e) => e.currentTarget.select()}
            />
            <p className="text-xs text-orange-700 mt-2">
              💡 Tip: Click inside the text area to auto-select all text, then copy with Ctrl+C (Cmd+C on Mac)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}