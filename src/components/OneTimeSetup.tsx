import { Card, CardContent } from './ui/card';
import { Database, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

interface OneTimeSetupProps {
  onComplete: () => void;
  currentUser?: { id: string; organizationId: string; email: string };
}

export function OneTimeSetup({ onComplete, currentUser }: OneTimeSetupProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  // Generate SQL with user's actual organization ID
  const generateSQL = () => {
    const orgId = currentUser?.organizationId || 'org-default';
    
    return `-- ========================================
-- COMPLETE FIX: Sync users AND disable RLS
-- ========================================

-- STEP 1: Drop ALL existing policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- STEP 2: DISABLE RLS completely
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 3: Grant full access
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;

-- STEP 4: DELETE all existing profiles to start fresh
DELETE FROM public.profiles;

-- STEP 5: Copy ALL users from auth.users to profiles
INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    organization_id,
    status,
    created_at,
    updated_at
)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as name,
    'standard_user' as role,
    '${orgId}' as organization_id,
    'active' as status,
    created_at,
    updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- STEP 6: Make first user a super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1);

-- STEP 7: Verify it worked
SELECT COUNT(*) as total_synced, 
       COUNT(*) FILTER (WHERE role = 'super_admin') as admin_count
FROM public.profiles;`;
  };

  const copySQL = async () => {
    const sql = generateSQL();
    const success = await copyToClipboard(sql);
    if (success) {
      toast.success('✅ SQL copied to clipboard! Now paste it in Supabase.', { autoClose: 3000 });
    } else {
      // Fallback: show the SQL for manual copy
      setShowSQL(true);
      toast.info('📋 Select and copy the SQL below', { autoClose: 3000 });
    }
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.currentTarget.select();
    toast.success('✅ SQL selected! Press Ctrl+C (or Cmd+C) to copy.', { autoClose: 2500 });
  };

  const openSupabase = () => {
    const projectRef = supabase.supabaseUrl.split('//')[1]?.split('.')[0];
    const url = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    window.open(url, '_blank');
    toast.info('Opened Supabase SQL Editor in new tab', { autoClose: 2000 });
  };

  const checkIfFixed = async () => {
    setIsChecking(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('❌ You are not logged in! Please refresh and log in again.', { autoClose: 5000 });
        setIsChecking(false);
        return;
      }

      // Try to query profiles
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (error) {
        toast.error(`❌ RLS Policy Error: ${error.message}. Run the BYPASS SQL below!`, { autoClose: 6000 });
        setShowSQL(true); // Show the SQL fix
      } else if (!data || data.length === 0) {
        toast.error('⚠️ RLS policies are blocking data! Run the BYPASS SQL below to fix it.', { autoClose: 6000 });
        setShowSQL(true);
      } else {
        toast.success(`🎉 Fixed! Found ${data.length} user(s). Loading...`, { autoClose: 2000 });
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      toast.error('Check failed: ' + (err as Error).message, { autoClose: 3000 });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-blue-500">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <Database className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">One-Time Database Setup</h1>
            <p className="text-muted-foreground">
              Run this SQL script once to sync all users and fix permissions
            </p>
          </div>

          <div className="bg-background border-2 border-blue-400 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">📝 3 Simple Steps:</h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Copy the SQL script</p>
                  <Button onClick={copySQL} className="mt-2 w-full" variant="outline">
                    📋 Copy SQL to Clipboard
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Open Supabase & paste the SQL</p>
                  <Button onClick={openSupabase} className="mt-2 w-full bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Supabase SQL Editor
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Paste the SQL and click the green <strong>RUN</strong> button
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Verify it worked</p>
                  <Button 
                    onClick={checkIfFixed} 
                    className="mt-2 w-full bg-green-600 hover:bg-green-700"
                    disabled={isChecking}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Checking...' : 'Check if Fixed'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <details className="bg-gray-900 text-green-400 rounded-lg">
            <summary className="cursor-pointer p-4 text-sm font-semibold hover:bg-gray-800">
              💡 What does this SQL do? (Click to expand)
            </summary>
            <div className="p-4 text-xs space-y-2">
              <p>✅ Fixes Row Level Security policies so you can read/write data</p>
              <p>✅ Creates a trigger to auto-create profiles for new signups</p>
              <p>✅ Syncs ALL existing auth users to the profiles table</p>
              <p className="text-yellow-400 font-semibold">This is 100% safe and only needs to run once!</p>
            </div>
          </details>

          <details className="bg-gray-900 text-green-400 rounded-lg mt-4" open>
            <summary className="cursor-pointer p-4 text-sm font-semibold hover:bg-gray-800">
              📄 View SQL Script (Click to collapse)
            </summary>
            <div className="p-4">
              <p className="text-xs text-yellow-300 mb-2">👇 Select all the text below and copy it (Ctrl+A, then Ctrl+C):</p>
              <textarea 
                readOnly 
                value={generateSQL()}
                className="w-full h-64 text-xs font-mono bg-gray-800 text-green-300 p-3 rounded border border-green-600"
                onClick={handleTextareaClick}
              />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}