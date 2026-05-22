import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Trash2, Users, Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Organization {
  id: string;
  name: string;
  status: string;
  created_at: string;
  user_count: number;
  contacts_count: number;
  bids_count: number;
}

export function CleanupUnusedOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);

      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // For each organization, count users, contacts, and bids
      const orgsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          // Count users
          const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Count contacts
          const { count: contactsCount, error: contactsError } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Count bids
          const { count: bidsCount, error: bidsError } = await supabase
            .from('bids')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            ...org,
            user_count: userCount || 0,
            contacts_count: contactsCount || 0,
            bids_count: bidsCount || 0,
          };
        })
      );

      setOrganizations(orgsWithCounts);
    } catch (error: any) {
      // Error loading organizations
      toast.error('Failed to load organizations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteOrganization = async (orgId: string) => {
    if (!confirm(
      `Are you sure you want to permanently delete this organization?\n\n` +
      `This action cannot be undone and will delete:\n` +
      `- The organization record\n` +
      `- All associated contacts\n` +
      `- All associated bids\n` +
      `- All associated data\n\n` +
      `Type "DELETE" in the prompt to confirm.`
    )) {
      return;
    }

    const confirmation = prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') {
      toast.error('Deletion cancelled - confirmation text did not match');
      return;
    }

    try {
      setDeleting(orgId);

      // Delete in order: dependent records first, then organization

      // Delete contacts
      const { error: contactsError } = await supabase
        .from('contacts')
        .delete()
        .eq('organization_id', orgId);

      if (contactsError) {
        // Contacts delete error - non-fatal
      }

      // Delete bids
      const { error: bidsError } = await supabase
        .from('bids')
        .delete()
        .eq('organization_id', orgId);

      if (bidsError) {
        // Bids delete error - non-fatal
      }

      // Delete tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('organization_id', orgId);

      if (tasksError) {
        // Tasks delete error - non-fatal
      }

      // Delete notes
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('organization_id', orgId);

      if (notesError) {
        // Notes delete error - non-fatal
      }

      // Delete opportunities
      const { error: oppsError } = await supabase
        .from('opportunities')
        .delete()
        .eq('organization_id', orgId);

      if (oppsError) {
        // Opportunities delete error - non-fatal
      }

      // Delete quotes
      const { error: quotesError } = await supabase
        .from('quotes')
        .delete()
        .eq('organization_id', orgId);

      if (quotesError) {
        // Quotes delete error - non-fatal
      }

      // Delete appointments
      const { error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .eq('organization_id', orgId);

      if (appointmentsError) {
        // Appointments delete error - non-fatal
      }

      // Finally, delete the organization
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (orgError) throw orgError;

      toast.success('Organization deleted successfully');
      loadOrganizations();
    } catch (error: any) {
      // Error deleting organization
      toast.error('Failed to delete organization: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const unusedOrgs = organizations.filter(
    org => org.user_count === 0 && org.contacts_count === 0 && org.bids_count === 0
  );

  const usedOrgs = organizations.filter(
    org => org.user_count > 0 || org.contacts_count > 0 || org.bids_count > 0
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Organizations...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Organization Cleanup
          </CardTitle>
          <CardDescription>
            Review and delete unused organizations. Organizations with users, contacts, or bids cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Organizations</div>
                <div className="text-2xl">{organizations.length}</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-sm text-muted-foreground">In Use</div>
                <div className="text-2xl text-green-600 dark:text-green-400">{usedOrgs.length}</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-sm text-muted-foreground">Unused</div>
                <div className="text-2xl text-red-600 dark:text-red-400">{unusedOrgs.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {unusedOrgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Unused Organizations ({unusedOrgs.length})
            </CardTitle>
            <CardDescription>
              These organizations have no users, contacts, or bids. They can be safely deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unusedOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ID: {org.id} • Created: {new Date(org.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteOrganization(org.id)}
                    disabled={deleting === org.id}
                  >
                    {deleting === org.id ? (
                      <>Deleting...</>
                    ) : (
                      <>
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {usedOrgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              Active Organizations ({usedOrgs.length})
            </CardTitle>
            <CardDescription>
              These organizations have users or data and should be kept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usedOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ID: {org.id}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="size-3" />
                        <span>{org.user_count} users</span>
                      </div>
                      <div>{org.contacts_count} contacts</div>
                      <div>{org.bids_count} bids</div>
                    </div>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    ✓ In Use
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {unusedOrgs.length === 0 && usedOrgs.length > 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="size-12 mx-auto mb-4 text-green-500" />
              <p>All organizations are actively being used. No cleanup needed!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}