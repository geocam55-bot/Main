import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

interface ProfilesSyncFixerProps {
  onRefresh: () => void;
}

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

export function ProfilesSyncFixer({ onRefresh }: ProfilesSyncFixerProps) {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [showSQLScript, setShowSQLScript] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);

  // Comprehensive SQL script that fixes all issues
  const comprehensiveSQLFix = `-- ================================================
-- ProSpaces CRM - Complete Profiles Table Fix
-- This script will create/fix the profiles table and sync all users
-- ================================================

-- Step 1: Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id uuid,  -- Changed to UUID for consistency
  status text DEFAULT 'active',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Step 5: Create new, simplified RLS policies

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view profiles in their organization
CREATE POLICY "Users can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id::text = (
      SELECT raw_user_meta_data->>'organizationId' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Allow super admins to view all profiles
CREATE POLICY "Super admins can view all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to manage profiles in their organization
CREATE POLICY "Admins can manage org profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
      AND (
        u.raw_user_meta_data->>'role' = 'super_admin'
        OR (
          organization_id IS NOT NULL
          AND organization_id::text = u.raw_user_meta_data->>'organizationId'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
      AND (
        u.raw_user_meta_data->>'role' = 'super_admin'
        OR (
          organization_id IS NOT NULL
          AND organization_id::text = u.raw_user_meta_data->>'organizationId'
        )
      )
    )
  );

-- Step 6: Create/replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    (NEW.raw_user_meta_data->>'organizationId')::uuid,
    'active',
    NEW.last_sign_in_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
    last_login = EXCLUDED.last_login,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Sync existing users from auth.users to profiles
-- This uses INSERT ... ON CONFLICT to be safe (won't duplicate)
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'standard_user') as role,
  (au.raw_user_meta_data->>'organizationId')::uuid as organization_id,
  'active' as status,
  au.last_sign_in_at as last_login,
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.profiles.name),
  last_login = EXCLUDED.last_login,
  updated_at = now();

-- Step 9: Verify the results
SELECT 
  'Profiles sync complete!' as message,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT organization_id) as total_organizations,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'standard_user' THEN 1 END) as standard_users
FROM public.profiles;`;

  const runComprehensiveDiagnostic = async () => {
    setIsRunning(true);
    setDiagnosticResults([]);
    const results: DiagnosticResult[] = [];

    try {
      // Step 1: Check authentication
      results.push({
        step: 'Authentication',
        status: 'info',
        message: 'Checking authentication...',
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user || authError) {
        results.push({
          step: 'Authentication',
          status: 'error',
          message: 'Not authenticated. Please refresh the page and log in again.',
          details: authError,
        });
        setDiagnosticResults(results);
        setIsRunning(false);
        return;
      }

      results.push({
        step: 'Authentication',
        status: 'success',
        message: `Authenticated as ${user.email}`,
        details: {
          userId: user.id,
          email: user.email,
          role: user.user_metadata?.role,
          organizationId: user.user_metadata?.organizationId,
        },
      });
      setDiagnosticResults([...results]);

      // Step 2: Check if profiles table exists
      results.push({
        step: 'Profiles Table',
        status: 'info',
        message: 'Checking if profiles table exists...',
      });
      setDiagnosticResults([...results]);

      const { error: tableError } = await supabase
        .from('profiles')
        .select('id')
        .limit(0);

      if (tableError) {
        if (tableError.code === '42P01') {
          // Table doesn't exist
          results[results.length - 1] = {
            step: 'Profiles Table',
            status: 'error',
            message: '❌ Profiles table does not exist! You need to run the SQL script.',
            details: tableError,
          };
          setDiagnosticResults([...results]);
          setShowSQLScript(true);
          setIsRunning(false);
          return;
        } else if (tableError.code === '42501') {
          // Permission denied
          results[results.length - 1] = {
            step: 'Profiles Table',
            status: 'warning',
            message: 'Profiles table exists but RLS policies may be blocking access',
            details: tableError,
          };
        } else {
          results[results.length - 1] = {
            step: 'Profiles Table',
            status: 'error',
            message: `Database error: ${tableError.message}`,
            details: tableError,
          };
        }
      } else {
        results[results.length - 1] = {
          step: 'Profiles Table',
          status: 'success',
          message: '✅ Profiles table exists',
        };
      }
      setDiagnosticResults([...results]);

      // Step 3: Count profiles
      results.push({
        step: 'Profile Count',
        status: 'info',
        message: 'Counting profiles...',
      });
      setDiagnosticResults([...results]);

      const { count: profileCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        results[results.length - 1] = {
          step: 'Profile Count',
          status: 'error',
          message: `Error counting profiles: ${countError.message}`,
          details: countError,
        };
      } else {
        results[results.length - 1] = {
          step: 'Profile Count',
          status: profileCount === 0 ? 'warning' : 'success',
          message: profileCount === 0 
            ? '⚠️ No profiles found! The table is empty.' 
            : `Found ${profileCount} profile(s)`,
          details: { count: profileCount },
        };
      }
      setDiagnosticResults([...results]);

      // Step 4: Query visible profiles
      results.push({
        step: 'Visible Profiles',
        status: 'info',
        message: 'Querying profiles visible to you...',
      });
      setDiagnosticResults([...results]);

      const { data: visibleProfiles, error: visibleError } = await supabase
        .from('profiles')
        .select('*');

      if (visibleError) {
        results[results.length - 1] = {
          step: 'Visible Profiles',
          status: 'error',
          message: `Error querying profiles: ${visibleError.message}`,
          details: visibleError,
        };
      } else {
        results[results.length - 1] = {
          step: 'Visible Profiles',
          status: visibleProfiles.length === 0 ? 'warning' : 'success',
          message: visibleProfiles.length === 0
            ? '⚠️ No profiles visible to you. RLS policies may be blocking access.'
            : `✅ ${visibleProfiles.length} profile(s) visible to you`,
          details: {
            count: visibleProfiles.length,
            profiles: visibleProfiles.map(p => ({
              email: p.email,
              role: p.role,
              org: p.organization_id,
            })),
          },
        };
      }
      setDiagnosticResults([...results]);

      // Step 5: Determine next steps
      if (profileCount === 0 || (visibleProfiles && visibleProfiles.length === 0)) {
        results.push({
          step: 'Recommendation',
          status: 'warning',
          message: '🔧 Action Required: Run the SQL script below to sync users from auth.users to profiles table',
        });
        setShowSQLScript(true);
      } else {
        results.push({
          step: 'Recommendation',
          status: 'success',
          message: '✅ Everything looks good! Click "Refresh Users List" to reload.',
        });
      }
      setDiagnosticResults([...results]);

    } catch (error: any) {
      results.push({
        step: 'Error',
        status: 'error',
        message: `Unexpected error: ${error.message}`,
        details: error,
      });
      setDiagnosticResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopySQL = async () => {
    try {
      await copyToClipboard(comprehensiveSQLFix);
      setCopied(true);
      toast.success('SQL script copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = comprehensiveSQLFix;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('SQL script copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <Database className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Database className="h-5 w-5" />
          Profiles Table Sync Tool
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Ensure your profiles table is correctly set up and synced with auth.users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-300 bg-blue-100">
          <AlertDescription className="text-blue-900">
            <p className="font-semibold mb-2">💡 What this tool does:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>Checks if your profiles table is set up correctly</li>
              <li>Diagnoses RLS policy issues</li>
              <li>Provides SQL script to sync all users from auth.users to profiles</li>
              <li>Verifies data visibility</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Run Diagnostic Button */}
        <div className="flex gap-2">
          <Button
            onClick={runComprehensiveDiagnostic}
            disabled={isRunning}
            size="lg"
            className="gap-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Running Diagnostic...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Full Diagnostic
              </>
            )}
          </Button>

          {diagnosticResults.length > 0 && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Users List
            </Button>
          )}
        </div>

        {/* Diagnostic Results */}
        {diagnosticResults.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Diagnostic Results:</p>
            {diagnosticResults.map((result, index) => (
              <Alert key={index} className={getStatusColor(result.status)}>
                <div className="flex items-start gap-2">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{result.step}</p>
                    <p className="text-sm">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs hover:underline">
                          View Details
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-background rounded overflow-auto max-h-32">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* SQL Script Section */}
        {showSQLScript && (
          <div className="space-y-3 p-4 bg-background rounded-lg border-2 border-blue-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">📝 Fix SQL Script</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopySQL}
                  size="sm"
                  variant={copied ? "outline" : "default"}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
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
                  onClick={openSupabaseSQL}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open SQL Editor
                </Button>
              </div>
            </div>

            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                <p className="font-semibold mb-2">📋 Instructions:</p>
                <ol className="text-sm space-y-1 ml-4 list-decimal">
                  <li>Click "Copy SQL" above</li>
                  <li>Click "Open SQL Editor" to open Supabase</li>
                  <li>Paste the SQL script in the editor</li>
                  <li>Click "Run" or press F5</li>
                  <li>Come back here and click "Refresh Users List"</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* SQL Preview */}
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700">
                📄 Preview SQL Script (click to expand)
              </summary>
              <div className="mt-2 p-3 bg-muted rounded border border-border max-h-96 overflow-auto">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                  {comprehensiveSQLFix}
                </pre>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}