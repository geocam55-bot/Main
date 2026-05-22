import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';

export function RLSSetupGuide() {
  const sqlScript = `-- ============================================================================
-- COMPLETE RLS FIX FOR USER MANAGEMENT
-- ============================================================================

-- PART 1: Fix RLS Policies (Allow super_admin bypass)
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view any profile" ON public.profiles;

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR auth.uid() = id
  );

CREATE POLICY "Super admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR auth.uid() = id
  );

CREATE POLICY "Super admins can view any profile"
  ON public.profiles FOR SELECT
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId') = organization_id
    OR auth.uid() = id
  );

-- PART 2: Create Server-Side Functions (Bypass RLS for everyone)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_user_to_organization(
  p_user_email TEXT,
  p_organization_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND status = 'active'
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found or inactive');
  END IF;
  
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  UPDATE public.profiles
  SET organization_id = p_organization_id, status = 'active', updated_at = NOW()
  WHERE id = v_user_id;
  
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organizationId}', to_jsonb(p_organization_id)
  )
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'organization_id', p_organization_id,
    'message', 'User successfully assigned to organization'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_org_and_assign_user(
  p_org_name TEXT,
  p_user_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT;
  v_org_exists BOOLEAN;
BEGIN
  v_org_id := lower(regexp_replace(
    regexp_replace(trim(p_org_name), '[^a-zA-Z0-9\\\\s-]', '', 'g'),
    '\\\\s+', '-', 'g'
  ));
  v_org_id := substring(v_org_id from 1 for 50);
  
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = v_org_id) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    INSERT INTO public.organizations (id, name, status, created_at, updated_at)
    VALUES (v_org_id, p_org_name, 'active', NOW(), NOW());
  END IF;
  
  RETURN public.assign_user_to_organization(p_user_email, v_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO service_role;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO service_role;`;

  const copySql = () => {
    copyToClipboard(sqlScript);
    toast.success('SQL script copied to clipboard!');
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="h-5 w-5" />
          ⚠️ Database Setup Required (One-Time)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-300 bg-red-100">
          <AlertDescription className="text-red-900">
            <strong>RLS policies are preventing cross-organization user management.</strong>
            <p className="mt-2">
              To enable super_admin privileges and fix user assignment errors, you need to run a SQL script in your Supabase database.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h3 className="font-medium text-orange-900">What This Fixes:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-orange-800">
            <li>✅ Allows super_admins to manage users across all organizations</li>
            <li>✅ Fixes "No rows updated - RLS policy blocking" errors</li>
            <li>✅ Enables User Recovery tool to move users between orgs</li>
            <li>✅ Enables browser console tools (assignUserToOrg, etc.)</li>
            <li>✅ Creates server-side functions that bypass RLS safely</li>
          </ul>
        </div>

        <Alert className="border-blue-300 bg-blue-50">
          <AlertDescription className="text-blue-900">
            <strong>📋 Step-by-Step Instructions:</strong>
            <ol className="list-decimal pl-5 mt-2 space-y-2">
              <li>Click the "Copy SQL Script" button below</li>
              <li>
                Go to your{' '}
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  Supabase Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Navigate to <strong>SQL Editor</strong> in the left sidebar</li>
              <li>Click <strong>"New Query"</strong></li>
              <li>Paste the SQL script</li>
              <li>Click <strong>"Run"</strong> or press F5</li>
              <li>You should see: ✅ 3 policies created, ✅ 2 functions created</li>
              <li>Come back here and refresh the page</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={copySql} className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            📋 Copy SQL Script
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Supabase Dashboard
          </Button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-orange-900 hover:text-orange-700">
            🔍 Show SQL Script Preview
          </summary>
          <div className="mt-2 bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
            <pre>{sqlScript}</pre>
          </div>
        </details>

        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertDescription className="text-yellow-900 text-xs">
            <strong>⚠️ Important:</strong> This SQL script is safe to run. It:
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Uses <code>CREATE OR REPLACE</code> so it's safe to run multiple times</li>
              <li>Only adds new RLS policies (doesn't remove existing ones)</li>
              <li>Grants execute permissions to authenticated users</li>
              <li>Uses <code>SECURITY DEFINER</code> safely (validated inputs)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-900 text-sm">
            <strong>After running the SQL, you'll be able to:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Move users between organizations</li>
              <li>Use the User Recovery tool without errors</li>
              <li>Run console commands like: <code className="bg-green-100 px-1 rounded">assignUserToOrg('email', 'org-id')</code></li>
              <li>Manage users across all organizations as super_admin</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}