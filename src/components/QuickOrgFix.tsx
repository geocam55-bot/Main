import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

const supabase = createClient();

interface QuickOrgFixProps {
  currentUser: {
    id: string;
    email: string;
    organizationId: string;
    organizationName?: string;
  };
  onComplete: () => void;
}

export function QuickOrgFix({ currentUser, onComplete }: QuickOrgFixProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [wrongOrgIds, setWrongOrgIds] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkOrganizations = async () => {
    setIsChecking(true);
    try {
      // Get all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('organization_id');

      if (error) {
        toast.error('Failed to check organizations: ' + error.message);
        return;
      }

      // Find unique organization IDs
      const orgIds = Array.from(new Set(profiles?.map(p => p.organization_id) || []));
      
      // Filter out the current user's org
      const wrong = orgIds.filter(id => id !== currentUser.organizationId);
      
      setWrongOrgIds(wrong);
      
      if (wrong.length === 0) {
        toast.success('✅ All users are already in the correct organization!');
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err) {
      toast.error('Failed to check organizations');
    } finally {
      setIsChecking(false);
    }
  };

  const fixOrganizations = async () => {
    setIsFixing(true);
    try {
      // Update ALL profiles to use the current user's organization_id
      const { data, error } = await supabase
        .from('profiles')
        .update({ organization_id: currentUser.organizationId })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Match all rows (impossible ID)
        .select();

      if (error) {
        toast.error('Failed to fix organizations: ' + error.message);
        return;
      }

      toast.success(`✅ Success! Updated ${data?.length || 0} users to ${currentUser.organizationName || 'your organization'}`);
      
      // Wait a moment then complete
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      toast.error('Failed to fix: ' + (err as Error).message);
    } finally {
      setIsFixing(false);
    }
  };

  // Auto-check on mount
  useState(() => {
    checkOrganizations();
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-4 border-red-500">
        <CardHeader className="bg-red-50 border-b-2 border-red-200">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-3" />
            <CardTitle className="text-3xl text-red-900">Organization Mismatch Detected</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <Alert className="border-yellow-400 bg-yellow-50 mb-6">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Problem:</strong> Users in your database are assigned to the wrong organization.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div className="bg-background border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Your Current Organization:</h3>
              <div className="bg-blue-50 p-3 rounded">
                <code className="text-sm font-mono text-blue-900">{currentUser.organizationId}</code>
                <p className="text-sm text-foreground mt-1">({currentUser.organizationName || 'RONA Atlantic'})</p>
              </div>
            </div>

            {wrongOrgIds.length > 0 && (
              <div className="bg-background border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">⚠️ Wrong Organizations Found:</h3>
                <div className="space-y-2">
                  {wrongOrgIds.map((orgId, i) => (
                    <div key={i} className="bg-red-50 p-3 rounded">
                      <code className="text-sm font-mono text-red-900">{orgId}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-3 text-lg">✅ One-Click Fix</h3>
              <p className="text-sm text-green-800 mb-4">
                Click the button below to move ALL users to your organization: <strong>{currentUser.organizationName || 'RONA Atlantic'}</strong>
              </p>
              
              <Button
                onClick={fixOrganizations}
                disabled={isFixing || isChecking}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
                size="lg"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Fixing...
                  </>
                ) : isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Fix Organizations Now
                  </>
                )}
              </Button>

              {wrongOrgIds.length > 0 && (
                <p className="text-xs text-green-700 mt-3 text-center">
                  This will update all users from {wrongOrgIds.join(', ')} to {currentUser.organizationId}
                </p>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>After fixing, you'll be able to see all users in your organization.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}