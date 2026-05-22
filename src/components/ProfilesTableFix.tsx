import { Alert, AlertDescription } from './ui/alert';
import { Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function ProfilesTableFix() {
  const [copied, setCopied] = useState(false);

  const SQL_FIX = `-- Fix profiles table to allow invited users without auth.users entry
-- Run this in Supabase SQL Editor

-- Step 1: Drop the foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Make id column independent (not dependent on auth.users)
-- The id will still be PRIMARY KEY but won't require auth.users reference

-- Step 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Step 4: Update RLS policies to allow admins to insert invited users
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

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

-- Step 5: Update RLS policies to allow admins to update any profile in their org
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

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

-- Step 6: Allow admins to delete profiles
DROP POLICY IF EXISTS "users_delete_own_profile" ON public.profiles;

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

-- ✅ Done! Now admins can invite users and create profiles with temporary IDs`;

  const handleCopy = () => {
    copyToClipboard(SQL_FIX);
    setCopied(true);
    toast.success('SQL script copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="h-5 w-5" />
          Profiles Table Fix Required
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          The profiles table currently has a foreign key constraint that prevents inviting users 
          who haven't signed up yet. Run the SQL script below to fix this.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-background border-orange-300">
          <Database className="h-4 w-4" />
          <AlertDescription>
            The profiles table currently has a foreign key constraint that prevents inviting users 
            who haven't signed up yet. Run the SQL script below to fix this.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">SQL Migration Script</h3>
            <Button
              onClick={handleCopy}
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
          </div>

          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
            {SQL_FIX}
          </pre>

          <div className="bg-background border border-orange-200 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-foreground">Instructions:</h4>
            <ol className="text-sm text-foreground space-y-1 list-decimal list-inside">
              <li>Click "Copy SQL" button above</li>
              <li>Open Supabase Dashboard → SQL Editor</li>
              <li>Paste and run the script</li>
              <li>Refresh this page and try inviting the user again</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}