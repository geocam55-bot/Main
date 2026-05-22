import { Button } from './ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

const SETUP_SQL = `-- Create the sync function
CREATE OR REPLACE FUNCTION sync_auth_to_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  synced_count INTEGER := 0;
BEGIN
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
  
  GET DIAGNOSTICS synced_count = ROW_COUNT;
  RETURN synced_count;
END;
$$;`;

interface SimpleSyncButtonProps {
  onSuccess: () => void;
}

export function SimpleSyncButton({ onSuccess }: SimpleSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSetup, setShowSetup] = useState(false);

  const copySQL = async () => {
    const success = await copyToClipboard(SETUP_SQL);
    if (success) {
      toast.success('SQL copied to clipboard!');
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  const openSupabaseSQL = () => {
    const projectRef = supabase.supabaseUrl.split('//')[1]?.split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    window.open(sqlEditorUrl, '_blank');
  };

  const syncUsers = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      // Try the suggested function name first if it exists
      let result = await supabase.rpc('sync_auth_to_profiles');
      
      // If that doesn't work, try our function name
      if (result.error) {
        result = await supabase.rpc('sync_auth_users_to_profiles');
      }

      const { data, error } = result;

      if (error) {
        
        
        // If the function doesn't exist, show setup dialog
        if (error.code === 'PGRST202' || error.message?.includes('function') || error.code === '42883') {
          toast.error('Setup required! Please run the SQL script first.', { autoClose: 5000 });
          setShowSetup(true);
          setSyncStatus('error');
        } else {
          toast.error(`Sync failed: ${error.message}`);
          setSyncStatus('error');
        }
        setIsSyncing(false);
        return;
      }

      toast.success(`✅ Successfully synced ${data || 0} users!`);
      setSyncStatus('success');
      
      // Reload users after a short delay
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err: any) {
      
      toast.error(`Sync failed: ${err.message}`);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Button
        onClick={syncUsers}
        disabled={isSyncing}
        className="bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Syncing Users...
          </>
        ) : syncStatus === 'success' ? (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Synced Successfully!
          </>
        ) : syncStatus === 'error' ? (
          <>
            <AlertCircle className="mr-2 h-5 w-5" />
            Setup Required
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-5 w-5" />
            Sync Users from Auth
          </>
        )}
      </Button>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl">One-Time Setup Required</DialogTitle>
            <DialogDescription>
              Run this SQL script once in Supabase to enable automatic user syncing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>⚡ Quick Setup (3 steps):</strong>
              </p>
              <ol className="text-sm text-yellow-800 mt-2 ml-4 space-y-1 list-decimal">
                <li>Click "Copy SQL" button below</li>
                <li>Click "Open Supabase" to open the SQL Editor</li>
                <li>Paste and click "RUN" in Supabase</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copySQL}
                className="flex-1"
                variant="outline"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy SQL
              </Button>
              <Button
                onClick={openSupabaseSQL}
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Supabase SQL Editor
              </Button>
            </div>

            {/* SQL Display */}
            <div className="relative">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono">
                <pre>{SETUP_SQL}</pre>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <strong>What this does:</strong> Creates a function in your Supabase database that copies users from the authentication table to the profiles table. You only need to run this once.
              </p>
            </div>

            <Button
              onClick={() => {
                setShowSetup(false);
                setSyncStatus('idle');
              }}
              className="w-full"
              variant="outline"
            >
              I've run the SQL - Try Sync Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}