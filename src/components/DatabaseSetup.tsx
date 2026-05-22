import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, AlertCircle, Database, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

const supabase = createClient();

interface DatabaseSetupProps {
  onSuccess: () => void;
  currentUser: User;
}

export function DatabaseSetup({ onSuccess, currentUser }: DatabaseSetupProps) {
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(true); // Show SQL by default to make it easier
  const [isSyncing, setIsSyncing] = useState(false);

  const SQL_SETUP_SCRIPT = `-- ProSpaces CRM - Complete Database Setup with Policy Cleanup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- STEP 1: Drop ALL existing policies to fix infinite recursion
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- STEP 2: Disable RLS temporarily
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 3: Create or recreate the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STEP 4: Re-enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create NEW simplified RLS policies (NO RECURSION)
-- Allow all authenticated users to read all profiles
CREATE POLICY "authenticated_users_select_profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile only
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile only
CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile (optional)
CREATE POLICY "users_delete_own_profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- STEP 6: Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'standard_user'),
    new.raw_user_meta_data->>'organizationId'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 8: Sync existing auth users to profiles table
INSERT INTO public.profiles (id, email, name, role, organization_id, status)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  raw_user_meta_data->>'organizationId',
  'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ✅ Setup complete! All old policies removed and new policies created.`;

  const setupDatabase = async () => {
    try {
      setIsSetupRunning(true);
      setError(null);

      // Use the currentUser prop instead of fetching from Supabase auth
      // We need to get the Supabase auth user ID to match with profiles table
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        // If we can't get the Supabase auth user, show SQL script
        setError('Cannot access Supabase authentication. Please run the SQL setup script manually.');
        setShowSQL(true);
        throw new Error('Please run the SQL setup script manually in Supabase.');
      }

      // Try to create the user's profile using the authenticated Supabase user ID
      const profileData = {
        id: authUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        organization_id: currentUser.organizationId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'id' })
        .select();

      if (insertError) {
        // If table doesn't exist, show SQL script
        if (insertError.code === '42P01') {
          setError('The profiles table does not exist. Please run the SQL setup script below.');
          setShowSQL(true);
          throw new Error('Profiles table does not exist. Please run the SQL setup script.');
        }
        
        // If RLS error, show SQL script
        if (insertError.code === '42501') {
          setError('Permission denied. RLS policies may need to be configured. Please run the SQL setup script below.');
          setShowSQL(true);
          throw new Error('RLS policies need to be configured. Please run the SQL setup script.');
        }
        
        throw new Error(`Database error: ${insertError.message}`);
      }

      toast.success('✅ Database setup complete! Your profile has been created.');
      setSetupComplete(true);
      
      // Reload the page after 1.5 seconds
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      // Don't show error toast if it's expected (table doesn't exist)
      if (!err.message.includes('Please run the SQL setup script')) {
        toast.error(err.message);
      }
    } finally {
      setIsSetupRunning(false);
    }
  };

  const copySQL = () => {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = SQL_SETUP_SCRIPT;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      toast.success('✅ SQL script copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy. Please select and copy the text manually.');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const openSupabaseSQL = () => {
    const supabaseUrl = supabase.supabaseUrl;
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    window.open(sqlEditorUrl, '_blank');
  };

  if (setupComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            Database Setup Complete!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-300 bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Your profile has been successfully created. Refreshing...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500 bg-red-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900 text-xl">
          <AlertCircle className="h-6 w-6 animate-pulse" />
          🚨 URGENT: Infinite Recursion Error - Database Fix Required!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-500 bg-red-100">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong className="text-lg">⛔ ERROR CODE: 42P17 - Infinite Recursion in RLS Policies</strong>
            <br />
            <span className="text-sm mt-2 block">Your database has broken Row Level Security policies that are causing infinite loops. This MUST be fixed by running the SQL script below in Supabase SQL Editor.</span>
            <br />
            <span className="text-sm font-bold">⏱️ This fix takes only 30 seconds and will permanently solve the issue!</span>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Quick Setup Failed:</strong> {error}
              <br />
              <span className="text-sm mt-1 block">👇 Use the SQL Setup below instead.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Main SQL Setup Section - VERY PROMINENT */}
        <div className="space-y-4 border-4 border-green-500 rounded-lg p-6 bg-gradient-to-br from-green-50 to-blue-50 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold animate-pulse">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-900">🔧 Fix Database - 3 Simple Steps</h3>
              <p className="text-sm text-green-800">This removes broken policies and creates fresh ones</p>
            </div>
          </div>
          
          {/* SUPER PROMINENT BUTTONS */}
          <div className="space-y-3">
            <Button
              onClick={copySQL}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              size="lg"
            >
              <Copy className="mr-3 h-6 w-6" />
              <span className="text-lg font-bold">STEP 1: 📋 Copy SQL Script</span>
            </Button>
            
            <Button
              onClick={openSupabaseSQL}
              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              size="lg"
            >
              <ExternalLink className="mr-3 h-6 w-6" />
              <span className="text-lg font-bold">STEP 2: 🚀 Open Supabase SQL Editor</span>
            </Button>

            <div className="bg-yellow-100 border-4 border-yellow-500 rounded-lg p-5 text-center shadow-md">
              <p className="text-yellow-900 font-bold text-lg mb-2">
                ⚡ STEP 3: Paste & Run in Supabase
              </p>
              <p className="text-yellow-800 text-sm">
                1. Paste the script (Ctrl+V or Cmd+V)<br />
                2. Click the green <strong>"RUN"</strong> button<br />
                3. Wait for "Success. No rows returned" message<br />
                4. Come back here and click the Refresh button!
              </p>
            </div>
          </div>

          {/* SQL Script Display - ALWAYS VISIBLE */}
          <div className="relative mt-4">
            <div className="flex items-center justify-between mb-2 bg-gray-800 px-4 py-2 rounded-t-lg">
              <span className="text-green-400 font-mono text-sm">💾 SQL Script (Copy this entire block)</span>
              <Button
                onClick={copySQL}
                variant="outline"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-500"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-b-lg text-xs overflow-x-auto max-h-96 overflow-y-auto border-2 border-green-500 font-mono">
              <pre>{SQL_SETUP_SCRIPT}</pre>
            </div>
          </div>

          {/* Detailed Instructions */}
          <div className="bg-background border-2 border-green-400 rounded-lg p-4 shadow-md">
            <p className="text-base text-green-900 font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">📋</span> Complete Step-by-Step Instructions:
            </p>
            <ol className="text-sm text-foreground space-y-2 ml-6 list-decimal">
              <li><strong>Click the blue "STEP 1" button above</strong> to copy the SQL script to your clipboard</li>
              <li><strong>Click the green "STEP 2" button</strong> to open Supabase SQL Editor in a new tab</li>
              <li><strong>In Supabase:</strong> Paste the script (Ctrl+V or Cmd+V) into the editor</li>
              <li><strong>Click the green "RUN" button</strong> in the bottom-right corner of Supabase</li>
              <li><strong>Wait for success message:</strong> "Success. No rows returned"</li>
              <li><strong>Come back to this tab</strong> and click the "🔄 Refresh" button at the top</li>
              <li><strong>✅ Done!</strong> Your users will load without errors!</li>
            </ol>
          </div>

          {/* What this script does */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <p className="text-sm font-bold text-blue-900 mb-2">🔍 What This Script Does:</p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
              <li>Drops ALL broken RLS policies causing the infinite recursion</li>
              <li>Creates the profiles table if it doesn't exist</li>
              <li>Creates NEW simplified policies that don't cause recursion</li>
              <li>Syncs your existing authenticated users to the profiles table</li>
              <li>Sets up automatic profile creation for new signups</li>
            </ul>
          </div>
        </div>

        {/* Alternative Quick Setup - Collapsed and de-emphasized */}
        <details className="space-y-3 opacity-40 hover:opacity-100 transition-opacity">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
            ⚙️ Advanced: Try Automatic Quick Setup (usually doesn't work with this error)
          </summary>
          <div className="mt-3 space-y-2 p-3 bg-muted rounded border">
            <p className="text-xs text-foreground">
              This attempts to create your profile automatically, but <strong>WILL FAIL</strong> with the infinite recursion error. You must use the SQL script above.
            </p>
            <Button
              onClick={setupDatabase}
              disabled={isSetupRunning}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {isSetupRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Trying Quick Setup...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Try Quick Setup (Won't Fix This Error)
                </>
              )}
            </Button>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}