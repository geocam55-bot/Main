import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Database, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

interface DatabaseInitProps {
  onComplete: () => void;
  currentUser?: { id: string; organizationId: string; email: string };
}

export function DatabaseInit({ onComplete, currentUser }: DatabaseInitProps) {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const generateInventorySQL = () => {
    const orgId = currentUser?.organizationId || 'org-default';
    
    return `-- ========================================
-- CREATE INVENTORY TABLE
-- ========================================

-- Create inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    quantity INTEGER DEFAULT 0,
    quantity_on_order INTEGER DEFAULT 0,
    unit_price NUMERIC(12,2) DEFAULT 0,
    cost NUMERIC(12,2) DEFAULT 0,
    category TEXT,
    department_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS completely for inventory table
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;

-- Grant full access to all roles
GRANT ALL ON public.inventory TO anon;
GRANT ALL ON public.inventory TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_organization ON public.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);

-- Verify table was created
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled ⚠️' 
        ELSE 'RLS Disabled ✅' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'inventory';`;
  };

  const copySQL = async () => {
    const sql = generateInventorySQL();
    const success = await copyToClipboard(sql);
    if (success) {
      setCopied(true);
      toast.success('✅ SQL copied! Paste it in Supabase SQL Editor.', { autoClose: 3000 });
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error('Failed to copy. Please copy manually from the box below.');
    }
  };

  const openSupabase = () => {
    const projectRef = supabase.supabaseUrl.split('//')[1]?.split('.')[0];
    const url = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    window.open(url, '_blank');
    toast.info('Opened Supabase SQL Editor', { autoClose: 2000 });
  };

  const checkIfFixed = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST205') {
          toast.error('❌ Table not created yet. Run the SQL script!', { autoClose: 4000 });
        } else {
          toast.error(`❌ Error: ${error.message}`, { autoClose: 4000 });
        }
      } else {
        toast.success('🎉 Inventory table is ready!', { autoClose: 2000 });
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      toast.error('Check failed: ' + (err as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-yellow-400 bg-yellow-50">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <AlertDescription className="text-yellow-900">
          <strong>Missing Database Table:</strong> The inventory table doesn't exist in your Supabase database yet.
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-blue-500">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Database className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Create Inventory Table</h2>
            <p className="text-muted-foreground">
              Run this SQL script once to create the inventory table
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-2">Copy the SQL script</p>
                  <Button 
                    onClick={copySQL} 
                    className="w-full" 
                    variant={copied ? "default" : "outline"}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy SQL to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-2">Open Supabase & run the SQL</p>
                  <Button 
                    onClick={openSupabase} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Open Supabase SQL Editor
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Paste the SQL and click <strong>RUN</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-2">Verify it worked</p>
                  <Button 
                    onClick={checkIfFixed} 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isChecking}
                  >
                    {isChecking ? 'Checking...' : 'Check if Fixed ✓'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SQL Preview */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground font-semibold">
              📋 View SQL Script
            </summary>
            <textarea
              readOnly
              value={generateInventorySQL()}
              onClick={(e) => e.currentTarget.select()}
              className="w-full mt-3 p-3 bg-gray-900 text-green-400 font-mono text-xs rounded border border-gray-700 h-64"
            />
          </details>
        </CardContent>
      </Card>
    </div>
  );
}