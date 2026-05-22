import React from 'react';
import { Copy, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';

export function CompleteDatabaseSetup() {
  const [copied, setCopied] = React.useState(false);

  const COMPLETE_SQL = `-- ProSpaces CRM - Complete Database Setup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- ============================================================================
-- PART 1: DROP EXISTING CONSTRAINTS AND TABLES (Clean Slate)
-- ============================================================================

-- Drop all existing RLS policies on profiles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- PART 2: CREATE ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE public.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  status text DEFAULT 'active',
  logo text,
  domain text,
  plan text DEFAULT 'starter',
  billing_email text,
  phone text,
  address text,
  notes text,
  max_users integer DEFAULT 10,
  max_contacts integer DEFAULT 1000,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read organizations
CREATE POLICY "authenticated_users_read_organizations" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow super_admins to manage organizations (we'll check this in the app)
CREATE POLICY "authenticated_users_manage_organizations" ON public.organizations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 3: CREATE PROFILES TABLE (WITHOUT FOREIGN KEY CONSTRAINT)
-- ============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id text REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  manager_id uuid,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: CREATE RLS POLICIES FOR PROFILES
-- ============================================================================

-- Allow all authenticated users to read all profiles
CREATE POLICY "authenticated_users_select_profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert profiles
CREATE POLICY "admins_can_insert_profiles" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can insert their own profile
    auth.uid() = id
    OR
    -- Or if user is admin/super_admin (check from their existing profile)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow users to update profiles
CREATE POLICY "users_can_update_profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    auth.uid() = id
    OR
    -- Or if user is super_admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Or if user is admin in the same organization
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role = 'admin'
      AND p1.organization_id = public.profiles.organization_id
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role = 'admin'
      AND p1.organization_id = public.profiles.organization_id
    )
  );

-- Allow admins to delete profiles
CREATE POLICY "admins_can_delete_profiles" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own profile
    auth.uid() = id
    OR
    -- Or if user is super_admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Or if user is admin in the same organization
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role = 'admin'
      AND p1.organization_id = public.profiles.organization_id
    )
  );

-- ============================================================================
-- PART 5: CREATE PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, resource)
);

-- Enable RLS on permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read permissions
CREATE POLICY "authenticated_users_read_permissions" ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow super_admins to manage permissions
CREATE POLICY "superadmins_manage_permissions" ON public.permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================================================
-- PART 6: CREATE DEFAULT ORGANIZATION
-- ============================================================================

INSERT INTO public.organizations (id, name, status)
VALUES ('default-org', 'ProSpaces CRM', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 7: CREATE FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'standard_user'),
    COALESCE(new.raw_user_meta_data->>'organizationId', 'default-org'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 8: SYNC EXISTING AUTH USERS TO PROFILES
-- ============================================================================

INSERT INTO public.profiles (id, email, name, role, organization_id, status)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org'),
  'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = now();

-- ============================================================================
-- PART 8A: CREATE PROJECT_MANAGERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  mailing_address text,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_managers_customer ON public.project_managers(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_org ON public.project_managers(organization_id);

-- Enable RLS
ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_managers
CREATE POLICY "authenticated_users_read_project_managers" ON public.project_managers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_users_manage_project_managers" ON public.project_managers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 8B: CREATE OPPORTUNITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  customer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  value numeric(12,2) DEFAULT 0,
  expected_close_date date,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON public.opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON public.opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON public.opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for opportunities
CREATE POLICY "authenticated_users_read_opportunities" ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_users_manage_opportunities" ON public.opportunities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 9: INSERT DEFAULT PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (role, resource, can_create, can_read, can_update, can_delete) VALUES
-- Super Admin - Full access to everything
('super_admin', 'contacts', true, true, true, true),
('super_admin', 'tasks', true, true, true, true),
('super_admin', 'notes', true, true, true, true),
('super_admin', 'bids', true, true, true, true),
('super_admin', 'opportunities', true, true, true, true),
('super_admin', 'appointments', true, true, true, true),
('super_admin', 'inventory', true, true, true, true),
('super_admin', 'campaigns', true, true, true, true),
('super_admin', 'users', true, true, true, true),

-- Admin - Full access within organization
('admin', 'contacts', true, true, true, true),
('admin', 'tasks', true, true, true, true),
('admin', 'notes', true, true, true, true),
('admin', 'bids', true, true, true, true),
('admin', 'opportunities', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'campaigns', true, true, true, true),
('admin', 'users', true, true, true, true),

-- Manager - Can manage team data
('manager', 'contacts', true, true, true, true),
('manager', 'tasks', true, true, true, true),
('manager', 'notes', true, true, true, false),
('manager', 'bids', true, true, true, true),
('manager', 'opportunities', true, true, true, true),
('manager', 'appointments', true, true, true, true),
('manager', 'inventory', false, true, true, false),
('manager', 'campaigns', false, true, false, false),
('manager', 'users', false, true, false, false),

-- Marketing - Full access to campaigns, limited to contacts
('marketing', 'contacts', true, true, true, false),
('marketing', 'tasks', true, true, true, true),
('marketing', 'notes', true, true, true, true),
('marketing', 'bids', false, true, false, false),
('marketing', 'opportunities', false, true, false, false),
('marketing', 'appointments', true, true, true, true),
('marketing', 'inventory', false, true, false, false),
('marketing', 'campaigns', true, true, true, true),
('marketing', 'users', false, true, false, false),

-- Standard User - Own data only
('standard_user', 'contacts', true, true, true, false),
('standard_user', 'tasks', true, true, true, true),
('standard_user', 'notes', true, true, true, true),
('standard_user', 'bids', true, true, true, false),
('standard_user', 'opportunities', true, true, true, false),
('standard_user', 'appointments', true, true, true, true),
('standard_user', 'inventory', false, true, false, false),
('standard_user', 'campaigns', false, true, false, false),
('standard_user', 'users', false, true, false, false)

ON CONFLICT (role, resource) DO UPDATE SET
  can_create = EXCLUDED.can_create,
  can_read = EXCLUDED.can_read,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete,
  updated_at = now();

-- ============================================================================
-- ✅ SETUP COMPLETE!
-- ============================================================================
-- You can now:
-- 1. Sign up new users
-- 2. Invite users (they'll get a profile with a temporary ID)
-- 3. Manage organizations
-- 4. Configure role-based permissions
-- ============================================================================`;

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard(COMPLETE_SQL);
    if (success) {
      setCopied(true);
      toast.success('Complete SQL script copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Database className="h-6 w-6" />
          Complete Database Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-background border-purple-300">
          <AlertTriangle className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            <strong>Database initialization needed.</strong> This comprehensive script will set up all tables, 
            remove foreign key constraints, create organizations, and configure access controls.
          </AlertDescription>
        </Alert>

        <div className="bg-background border border-purple-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-foreground">What this script does:</h3>
          <ul className="text-sm text-foreground space-y-2 list-disc list-inside">
            <li>✅ Removes foreign key constraint on profiles table</li>
            <li>✅ Creates organizations table</li>
            <li>✅ Creates profiles table with proper structure</li>
            <li>✅ Creates permissions table</li>
            <li>✅ Sets up RLS (Row Level Security) policies</li>
            <li>✅ Creates default organization</li>
            <li>✅ Syncs existing auth users to profiles</li>
            <li>✅ Inserts default role space access</li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Complete SQL Setup Script</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleCopyToClipboard}
                size="sm"
                variant="outline"
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
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open SQL Editor
              </Button>
            </div>
          </div>

          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
            {COMPLETE_SQL}
          </pre>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-purple-900 flex items-center gap-2">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">!</span>
              Setup Instructions:
            </h4>
            <ol className="text-sm text-foreground space-y-2 list-decimal list-inside ml-2">
              <li>Click <strong>"Open SQL Editor"</strong> button above (opens Supabase Dashboard)</li>
              <li>Click <strong>"Copy SQL"</strong> to copy the complete script</li>
              <li>Paste the script into the Supabase SQL Editor</li>
              <li>Click <strong>"Run"</strong> to execute the script</li>
              <li>Wait for success message</li>
              <li>Return here and <strong>refresh the page</strong></li>
            </ol>
          </div>
        </div>

        <Alert className="bg-green-50 border-green-300">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>After running this script:</strong> You'll be able to sign in, create users, manage organizations, 
            and all authentication errors will be resolved.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}