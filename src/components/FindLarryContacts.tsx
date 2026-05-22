import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

export function FindLarryContacts() {
  const [results, setResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasFixed, setHasFixed] = useState(false);

  const findLarryContacts = async () => {
    setIsSearching(true);
    setResults(null);
    
    try {
      const supabase = createClient();
      
      // Step 1: Find Larry's user account
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%larry.lee@ronaatlantic.ca%');
      
      if (profileError) throw profileError;
      
      if (!profiles || profiles.length === 0) {
        setResults({
          error: 'Larry Lee user not found in profiles table',
        });
        setIsSearching(false);
        return;
      }
      
      const larry = profiles[0];
      // Found Larry
      
      // Step 2: Find ALL contacts that might belong to Larry
      // Check multiple possible scenarios
      const searches = await Promise.all([
        // Contacts created by Larry's user ID
        supabase
          .from('contacts')
          .select('*')
          .eq('created_by', larry.id),
        
        // Contacts owned by Larry's email
        supabase
          .from('contacts')
          .select('*')
          .ilike('account_owner_number', '%larry.lee%'),
        
        // Contacts in Larry's organization
        supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', larry.organization_id),
        
        // ALL contacts with NULL or missing organization_id
        supabase
          .from('contacts')
          .select('*')
          .is('organization_id', null),
      ]);
      
      const results = {
        larry: {
          id: larry.id,
          email: larry.email,
          name: larry.name,
          role: larry.role,
          organization_id: larry.organization_id,
        },
        contactsByCreatedBy: searches[0].data || [],
        contactsByAccountOwner: searches[1].data || [],
        contactsInOrganization: searches[2].data || [],
        contactsWithoutOrg: searches[3].data || [],
      };
      
      // Search results
      setResults(results);
    } catch (error: any) {
      // Error finding Larry contacts
      setResults({
        error: error.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const fixLarryContacts = async () => {
    if (!results || !results.larry) return;
    
    try {
      const supabase = createClient();
      const larry = results.larry;
      
      // Find contacts that should belong to Larry but have wrong/missing organization_id
      const contactsToFix = [
        ...results.contactsByCreatedBy.filter((c: any) => c.organization_id !== larry.organization_id),
        ...results.contactsByAccountOwner.filter((c: any) => c.organization_id !== larry.organization_id),
      ];
      
      // Remove duplicates
      const uniqueContactsToFix = Array.from(
        new Map(contactsToFix.map((c: any) => [c.id, c])).values()
      );
      
      // Fixing contacts
      
      // Update each contact's organization_id
      for (const contact of uniqueContactsToFix) {
        const { error } = await supabase
          .from('contacts')
          .update({
            organization_id: larry.organization_id,
          })
          .eq('id', contact.id);
        
        if (error) {
          // Error updating contact
        }
      }
      
      setHasFixed(true);
      
      // Re-run the search to show updated results
      await findLarryContacts();
    } catch (error: any) {
      // Error fixing contacts
      alert('Error fixing contacts: ' + error.message);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Find Larry's Contacts Diagnostic Tool</CardTitle>
        <CardDescription>
          This tool helps diagnose and fix missing contacts for larry.lee@ronaatlantic.ca
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={findLarryContacts} 
          disabled={isSearching}
          className="w-full"
        >
          <Search className="mr-2 h-4 w-4" />
          {isSearching ? 'Searching...' : 'Search for Larry\'s Contacts'}
        </Button>

        {results && (
          <div className="space-y-4 mt-4">
            {results.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{results.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Larry's Profile Info */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Larry's Profile:</strong>
                    <div className="mt-2 text-sm space-y-1">
                      <div>ID: {results.larry.id}</div>
                      <div>Email: {results.larry.email}</div>
                      <div>Name: {results.larry.name}</div>
                      <div>Role: {results.larry.role}</div>
                      <div>Organization ID: {results.larry.organization_id}</div>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Search Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Search Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <strong>Contacts Created By Larry (created_by = {results.larry.id}):</strong>
                      <div className="ml-4 text-sm">
                        {results.contactsByCreatedBy.length} found
                        {results.contactsByCreatedBy.length > 0 && (
                          <div className="mt-1">
                            {results.contactsByCreatedBy.map((c: any) => (
                              <div key={c.id} className="text-xs text-muted-foreground">
                                • {c.name} ({c.company}) - Org: {c.organization_id || 'NULL'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <strong>Contacts Owned By Larry (account_owner_number contains larry.lee):</strong>
                      <div className="ml-4 text-sm">
                        {results.contactsByAccountOwner.length} found
                        {results.contactsByAccountOwner.length > 0 && (
                          <div className="mt-1">
                            {results.contactsByAccountOwner.map((c: any) => (
                              <div key={c.id} className="text-xs text-muted-foreground">
                                • {c.name} ({c.company}) - Org: {c.organization_id || 'NULL'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <strong>All Contacts in Larry's Organization:</strong>
                      <div className="ml-4 text-sm">
                        {results.contactsInOrganization.length} found
                      </div>
                    </div>

                    <div>
                      <strong>Orphaned Contacts (NULL organization_id):</strong>
                      <div className="ml-4 text-sm">
                        {results.contactsWithoutOrg.length} found
                        {results.contactsWithoutOrg.length > 0 && (
                          <div className="mt-1">
                            {results.contactsWithoutOrg.slice(0, 10).map((c: any) => (
                              <div key={c.id} className="text-xs text-muted-foreground">
                                • {c.name} ({c.company}) - Owner: {c.account_owner_number || 'N/A'}
                              </div>
                            ))}
                            {results.contactsWithoutOrg.length > 10 && (
                              <div className="text-xs text-muted-foreground">
                                ... and {results.contactsWithoutOrg.length - 10} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fix Button */}
                {(results.contactsByCreatedBy.some((c: any) => c.organization_id !== results.larry.organization_id) ||
                  results.contactsByAccountOwner.some((c: any) => c.organization_id !== results.larry.organization_id)) && (
                  <Alert variant="default" className="border-yellow-400 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <strong>Issue Found:</strong> Some contacts created by or owned by Larry have the wrong organization_id.
                      <Button 
                        onClick={fixLarryContacts}
                        className="mt-3 w-full"
                        variant="default"
                      >
                        Fix Larry's Contacts Organization IDs
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {hasFixed && (
                  <Alert className="border-green-400 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Contacts have been updated! Larry should now be able to see his contacts.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}