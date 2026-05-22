import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Search, UserX, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { getServerHeaders } from '../utils/server-headers';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface DiagnosticResult {
  found: boolean;
  inProfiles: boolean;
  hasOrganization: boolean;
  isActive: boolean;
  details?: any;
  issues: string[];
  fixes: string[];
  orgUsers?: any[];
}

export function FindMissingUser() {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleSearch = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setSearching(true);
    setResult(null);

    try {
      const supabase = createClient();
      const diagnostic: DiagnosticResult = {
        found: false,
        inProfiles: false,
        hasOrganization: false,
        isActive: false,
        issues: [],
        fixes: []
      };

      // Check profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profile) {
        diagnostic.found = true;
        diagnostic.inProfiles = true;
        diagnostic.hasOrganization = !!profile.organization_id;
        diagnostic.isActive = profile.status === 'active';
        diagnostic.details = profile;

        if (!profile.organization_id) {
          diagnostic.issues.push('User has no organization assigned');
          diagnostic.fixes.push('Click "Recover User" to assign to Rona Atlantic');
        }

        if (profile.status !== 'active') {
          diagnostic.issues.push(`User status is '${profile.status}' instead of 'active'`);
          diagnostic.fixes.push('Click "Recover User" to activate');
        }
      } else {
        diagnostic.issues.push('User not found in profiles table');
        diagnostic.fixes.push('User may need to be recreated or may exist only in auth.users');
      }

      // Get organization users
      const orgId = 'rona-atlantic';
      const { data: orgUsers } = await supabase
        .from('profiles')
        .select('email, role, status')
        .eq('organization_id', orgId)
        .order('email');

      diagnostic.orgUsers = orgUsers || [];

      setResult(diagnostic);
      
      if (diagnostic.found && diagnostic.hasOrganization && diagnostic.isActive) {
        toast.success('User found and active!');
      } else if (diagnostic.found) {
        toast.warning('User found but has issues');
      } else {
        toast.error('User not found');
      }

    } catch (error: any) {
      // Search error
      toast.error('Search failed: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleRecover = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setRecovering(true);

    try {
      const supabase = createClient();
      const orgId = 'rona-atlantic';

      // Try using the RPC function first
      const { data, error } = await supabase.rpc('assign_user_to_organization', {
        p_user_email: email,
        p_organization_id: orgId
      });

      if (error) {
        // RPC error
        
        // Fallback: Try direct update if user exists
        if (result?.details?.user_id) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              organization_id: orgId,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', result.details.user_id);

          if (updateError) {
            toast.error('Recovery failed: ' + updateError.message);
            return;
          }

          toast.success('User recovered using fallback method!');
          // Re-search to show updated status
          setTimeout(() => handleSearch(), 500);
          return;
        }

        // RPC error
        toast.error('RPC call failed: ' + error.message);
        return;
      }

      toast.success('User recovered successfully!');
      // Re-search to show updated status
      setTimeout(() => handleSearch(), 500);

    } catch (error: any) {
      // Recovery error
      toast.error('Recovery failed: ' + error.message);
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Find Missing User
          </CardTitle>
          <CardDescription>
            Search for and recover missing users in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                <Search className="w-4 h-4 mr-2" />
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {result && (
            <>
              <Alert className={
                result.found && result.hasOrganization && result.isActive
                  ? 'border-green-500'
                  : result.found
                  ? 'border-yellow-500'
                  : 'border-red-500'
              }>
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      {result.found && result.hasOrganization && result.isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : result.found ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Status:</span>
                          <Badge variant={result.found ? 'default' : 'destructive'}>
                            {result.found ? 'Found' : 'Not Found'}
                          </Badge>
                          {result.found && (
                            <>
                              <Badge variant={result.hasOrganization ? 'default' : 'destructive'}>
                                {result.hasOrganization ? 'Has Org' : 'No Org'}
                              </Badge>
                              <Badge variant={result.isActive ? 'default' : 'secondary'}>
                                {result.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </>
                          )}
                        </div>

                        {result.details && (
                          <div className="text-sm space-y-1 mb-3">
                            <div><strong>User ID:</strong> {result.details.user_id}</div>
                            <div><strong>Email:</strong> {result.details.email}</div>
                            <div><strong>Organization:</strong> {result.details.organization_id || '❌ None'}</div>
                            <div><strong>Role:</strong> {result.details.role || 'standard_user'}</div>
                            <div><strong>Status:</strong> {result.details.status}</div>
                          </div>
                        )}

                        {result.issues.length > 0 && (
                          <div className="space-y-1">
                            <div className="font-medium text-sm">Issues:</div>
                            <ul className="text-sm space-y-1">
                              {result.issues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-red-500">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.fixes.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <div className="font-medium text-sm">Suggested Fixes:</div>
                            <ul className="text-sm space-y-1">
                              {result.fixes.map((fix, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-blue-500">→</span>
                                  <span>{fix}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.found && result.issues.length > 0 && (
                          <div className="mt-3">
                            <Button onClick={handleRecover} disabled={recovering} size="sm">
                              <RefreshCw className="w-4 h-4 mr-2" />
                              {recovering ? 'Recovering...' : 'Recover User'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {result.orgUsers && result.orgUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-sm">Users in Rona Atlantic ({result.orgUsers.length}):</div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.orgUsers.map((user, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">{user.role}</td>
                            <td className="p-2">
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common recovery operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>Note:</strong> If a user is completely missing from the database, 
            they will need to sign up again or be re-invited by an administrator.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}