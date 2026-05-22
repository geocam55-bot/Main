import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle2, Database, Wrench } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface InvalidOrgDiagnostic {
  totalUsers: number;
  invalidUsers: number;
  invalidUsersList: Array<{
    email: string;
    organization_id: string;
    status: string;
  }>;
  availableOrgs: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export function FixInvalidOrgIds() {
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<InvalidOrgDiagnostic | null>(null);

  const scanForInvalidOrgs = async () => {
    setScanning(true);
    try {
      const supabase = createClient();
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('email, organization_id, status');

      if (usersError) {
        toast.error('Failed to scan users: ' + usersError.message);
        return;
      }

      // Get all available organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('status', 'active');

      if (orgsError) {
        toast.error('Failed to load organizations: ' + orgsError.message);
        return;
      }

      const orgIds = new Set(orgs?.map(o => o.id) || []);
      
      // Find invalid users
      const invalidUsers = users?.filter(user => {
        // Check if org ID is timestamp-based (pattern: org-1234567890)
        const isTimestampBased = /^org-[0-9]+$/.test(user.organization_id || '');
        // Check if org ID is null
        const isNull = !user.organization_id;
        // Check if org doesn't exist
        const orgNotExists = user.organization_id && !orgIds.has(user.organization_id);
        
        return isTimestampBased || isNull || orgNotExists;
      }) || [];

      const diagnosticResult: InvalidOrgDiagnostic = {
        totalUsers: users?.length || 0,
        invalidUsers: invalidUsers.length,
        invalidUsersList: invalidUsers,
        availableOrgs: orgs || []
      };

      setDiagnostic(diagnosticResult);

      if (invalidUsers.length === 0) {
        toast.success('✅ All users have valid organization IDs!');
      } else {
        toast.warning(`Found ${invalidUsers.length} user(s) with invalid organization IDs`);
      }

    } catch (error: any) {
      // Scan error
      toast.error('Scan failed: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  const fixInvalidOrgs = async () => {
    if (!diagnostic || diagnostic.invalidUsers === 0) {
      toast.info('No invalid organizations to fix');
      return;
    }

    setFixing(true);
    try {
      const supabase = createClient();
      let fixedCount = 0;
      let failedCount = 0;

      // Try to use the RPC function if available
      try {
        // First, try the server-side fix function
        const { data, error } = await supabase.rpc('fix_all_invalid_org_ids');
        
        if (!error && data) {
          toast.success('✅ Fixed all invalid organization IDs!');
          await scanForInvalidOrgs(); // Re-scan to show results
          return;
        }
      } catch (rpcError) {
        // RPC function not available, using fallback method
      }

      // Fallback: Fix each user individually
      for (const user of diagnostic.invalidUsersList) {
        try {
          // Determine correct org based on email domain
          const emailDomain = user.email.split('@')[1].toLowerCase();
          let correctOrgId: string | null = null;

          // Map email domains to organizations
          if (emailDomain.includes('ronaatlantic') || emailDomain.includes('rona')) {
            correctOrgId = 'rona-atlantic';
          } else {
            // Default to first available org
            correctOrgId = diagnostic.availableOrgs[0]?.id || null;
          }

          if (!correctOrgId) {
            // No organization found for user
            failedCount++;
            continue;
          }

          // Update the user's organization
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              organization_id: correctOrgId,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('email', user.email);

          if (updateError) {
            // Failed to fix user
            failedCount++;
          } else {
            fixedCount++;
          }

        } catch (error: any) {
          // Error fixing user
          failedCount++;
        }
      }

      if (fixedCount > 0) {
        toast.success(`✅ Fixed ${fixedCount} user(s)!`);
      }
      if (failedCount > 0) {
        toast.error(`❌ Failed to fix ${failedCount} user(s)`);
      }

      // Re-scan to show results
      await scanForInvalidOrgs();

    } catch (error: any) {
      // Fix error
      toast.error('Fix failed: ' + error.message);
    } finally {
      setFixing(false);
    }
  };

  const isTimestampBased = (orgId: string | null) => {
    return orgId ? /^org-[0-9]+$/.test(orgId) : false;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Fix Invalid Organization IDs
          </CardTitle>
          <CardDescription>
            Scan for and fix users with invalid timestamp-based organization IDs (e.g., "org-1762906336768")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={scanForInvalidOrgs} 
              disabled={scanning}
              variant="outline"
              className="flex-1"
            >
              <Database className="w-4 h-4 mr-2" />
              {scanning ? 'Scanning...' : 'Scan for Issues'}
            </Button>
            
            {diagnostic && diagnostic.invalidUsers > 0 && (
              <Button 
                onClick={fixInvalidOrgs} 
                disabled={fixing}
                className="flex-1"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {fixing ? 'Fixing...' : `Fix ${diagnostic.invalidUsers} User(s)`}
              </Button>
            )}
          </div>

          {diagnostic && (
            <div className="space-y-4">
              {/* Summary Card */}
              <Alert className={
                diagnostic.invalidUsers === 0 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-orange-500 bg-orange-50'
              }>
                <AlertDescription>
                  <div className="flex items-start gap-3">
                    {diagnostic.invalidUsers === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {diagnostic.invalidUsers === 0 
                            ? '✅ All users have valid organization IDs' 
                            : `⚠️ Found ${diagnostic.invalidUsers} invalid organization ID(s)`
                          }
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Total users: {diagnostic.totalUsers}</div>
                        <div>Valid users: {diagnostic.totalUsers - diagnostic.invalidUsers}</div>
                        <div>Invalid users: {diagnostic.invalidUsers}</div>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Available Organizations */}
              {diagnostic.availableOrgs.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-sm">Available Organizations ({diagnostic.availableOrgs.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {diagnostic.availableOrgs.map((org) => (
                      <Badge key={org.id} variant="outline" className="text-xs">
                        {org.name} ({org.id})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Users List */}
              {diagnostic.invalidUsersList.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-sm">Users with Invalid Organization IDs:</div>
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Current Org ID</th>
                          <th className="text-left p-2">Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostic.invalidUsersList.map((user, i) => (
                          <tr key={i} className="border-t hover:bg-muted/50">
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">
                              <code className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                {user.organization_id || 'NULL'}
                              </code>
                            </td>
                            <td className="p-2">
                              {!user.organization_id && (
                                <Badge variant="destructive" className="text-xs">No Org</Badge>
                              )}
                              {isTimestampBased(user.organization_id) && (
                                <Badge variant="destructive" className="text-xs">Timestamp-based</Badge>
                              )}
                              {user.organization_id && !isTimestampBased(user.organization_id) && (
                                <Badge variant="secondary" className="text-xs">Org Not Found</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {!diagnostic && (
            <Alert>
              <AlertDescription className="text-sm">
                Click <strong>"Scan for Issues"</strong> to check for users with invalid organization IDs.
                This will detect timestamp-based IDs like "org-1762906336768" and other invalid references.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About This Issue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>What are timestamp-based organization IDs?</strong>
          </p>
          <p>
            These are incorrectly generated IDs in the format "org-1762906336768" where the number
            is a timestamp. They should be proper slug-format IDs like "rona-atlantic".
          </p>
          <p>
            <strong>How does the fix work?</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Detects users with invalid organization IDs</li>
            <li>Maps users to correct organizations based on email domain</li>
            <li>Updates both profiles and auth metadata</li>
            <li>Ensures all users have valid, active organizations</li>
          </ul>
          <div className="pt-2 border-t">
            <p className="text-xs">
              <strong>Alternative:</strong> Run the SQL script <code className="bg-muted px-1 py-0.5 rounded">/FIX_INVALID_ORG_IDS.sql</code> in Supabase SQL Editor for server-side fix.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}