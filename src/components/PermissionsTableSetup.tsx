import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Database, CheckCircle, Copy } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

const supabase = createClient();

export function PermissionsTableSetup() {
  const [isCreating, setIsCreating] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const SQL_SCRIPT = `-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  visible BOOLEAN DEFAULT false,
  add BOOLEAN DEFAULT false,
  change BOOLEAN DEFAULT false,
  delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, module)
);

-- Enable Row Level Security
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super Admin full access" ON permissions;
DROP POLICY IF EXISTS "Admin full access" ON permissions;
DROP POLICY IF EXISTS "Users can read own role permissions" ON permissions;

-- Policy: Super Admin can do everything
CREATE POLICY "Super Admin full access" 
ON permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Admin can do everything
CREATE POLICY "Admin full access" 
ON permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: All authenticated users can read permissions for their role
CREATE POLICY "Users can read own role permissions" 
ON permissions FOR SELECT TO authenticated
USING (
  role = (
    SELECT profiles.role FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_role_module ON permissions(role, module);

-- Insert default permissions
INSERT INTO permissions (role, module, visible, add, change, delete) VALUES
-- Super Admin - Full Access
('super_admin', 'dashboard', true, true, true, true),
('super_admin', 'contacts', true, true, true, true),
('super_admin', 'tasks', true, true, true, true),
('super_admin', 'appointments', true, true, true, true),
('super_admin', 'bids', true, true, true, true),
('super_admin', 'notes', true, true, true, true),
('super_admin', 'email', true, true, true, true),
('super_admin', 'marketing', true, true, true, true),
('super_admin', 'inventory', true, true, true, true),
('super_admin', 'users', true, true, true, true),
('super_admin', 'settings', true, true, true, true),
('super_admin', 'tenants', true, true, true, true),
('super_admin', 'security', true, true, true, true),
('super_admin', 'import-export', true, true, true, true),

-- Admin - Full Access except Tenants
('admin', 'dashboard', true, true, true, true),
('admin', 'contacts', true, true, true, true),
('admin', 'tasks', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'bids', true, true, true, true),
('admin', 'notes', true, true, true, true),
('admin', 'email', true, true, true, true),
('admin', 'marketing', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'users', true, true, true, false),
('admin', 'settings', true, true, true, true),
('admin', 'tenants', false, false, false, false),
('admin', 'security', true, true, true, true),
('admin', 'import-export', true, true, true, true),

-- Manager - Limited Access
('manager', 'dashboard', true, true, true, true),
('manager', 'contacts', true, true, true, true),
('manager', 'tasks', true, true, true, true),
('manager', 'appointments', true, true, true, true),
('manager', 'bids', true, true, true, true),
('manager', 'notes', true, true, true, true),
('manager', 'email', true, true, true, true),
('manager', 'marketing', true, true, true, true),
('manager', 'inventory', true, true, true, true),
('manager', 'users', false, false, false, false),
('manager', 'settings', false, false, false, false),
('manager', 'tenants', false, false, false, false),
('manager', 'security', false, false, false, false),
('manager', 'import-export', false, false, false, false),

-- Marketing - Marketing Focused
('marketing', 'dashboard', true, false, false, false),
('marketing', 'contacts', true, true, true, false),
('marketing', 'tasks', true, true, true, false),
('marketing', 'appointments', true, true, true, false),
('marketing', 'bids', false, false, false, false),
('marketing', 'notes', true, true, true, false),
('marketing', 'email', true, true, true, false),
('marketing', 'marketing', true, true, true, true),
('marketing', 'inventory', true, false, false, false),
('marketing', 'users', false, false, false, false),
('marketing', 'settings', false, false, false, false),
('marketing', 'tenants', false, false, false, false),
('marketing', 'security', false, false, false, false),
('marketing', 'import-export', false, false, false, false),

-- Standard User - Everything except Marketing and Inventory
('standard_user', 'dashboard', true, false, false, false),
('standard_user', 'contacts', true, true, true, false),
('standard_user', 'tasks', true, true, true, false),
('standard_user', 'appointments', true, true, true, false),
('standard_user', 'bids', true, true, true, false),
('standard_user', 'notes', true, true, true, false),
('standard_user', 'email', true, true, true, false),
('standard_user', 'marketing', false, false, false, false),
('standard_user', 'inventory', false, false, false, false),
('standard_user', 'users', true, false, false, false),
('standard_user', 'settings', true, true, true, false),
('standard_user', 'tenants', false, false, false, false),
('standard_user', 'security', false, false, false, false),
('standard_user', 'import-export', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;`;

  const copyToClipboard = () => {
    // Fallback method for iframes where Clipboard API is blocked
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
      // If copy fails, just show the script
      setShowScript(true);
      toast.error('Auto-copy failed. Script shown below - please copy manually.');
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Database className="h-5 w-5" />
          Permissions Table Setup Required
        </CardTitle>
        <CardDescription className="text-orange-700">
          The permissions table doesn't exist in your Supabase database yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setupComplete ? (
          <>
            <Alert className="border-orange-300 bg-orange-100">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Setup Required:</strong> You need to create the permissions table in Supabase.
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
          </>
        ) : (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Success!</strong> The permissions table has been created successfully.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}