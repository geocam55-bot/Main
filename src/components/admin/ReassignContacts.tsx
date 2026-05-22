import { useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ensureUserProfile } from '../../utils/ensure-profile';

export function ReassignContacts() {
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleReassign = async () => {
    try {
      setLoading(true);
      setResult(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setResult({ success: false, message: 'Not authenticated' });
        return;
      }

      // Get the user's session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setResult({ success: false, message: 'No valid session found' });
        return;
      }

      // Read organization_id from the profiles table (more reliable than JWT metadata)
      let organizationId = user.user_metadata?.organizationId;
      try {
        const profile = await ensureUserProfile(user.id);
        if (profile?.organization_id) {
          organizationId = profile.organization_id;
        }
      } catch (e) {
        // Could not read profile, falling back to JWT metadata
      }

      if (!organizationId) {
        setResult({ success: false, message: 'Organization ID not found' });
        return;
      }

      // Reassigning contacts

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts/reassign-by-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromEmail,
            toEmail,
            organizationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reassign contacts');
      }

      // Reassignment success
      setResult({ 
        success: true, 
        message: data.message || `Successfully reassigned ${data.count} contacts` 
      });
    } catch (error: any) {
      // Error reassigning contacts
      setResult({ 
        success: false, 
        message: error.message || 'Failed to reassign contacts' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-sm p-6 max-w-2xl">
      <h2 className="mb-6">Reassign Contacts</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="fromEmail" className="block text-sm text-foreground mb-2">
            From User (Current Owner)
          </label>
          <input
            id="fromEmail"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="george.campbell@ronaatlantic.ca"
          />
        </div>

        <div>
          <label htmlFor="toEmail" className="block text-sm text-foreground mb-2">
            To User (New Owner)
          </label>
          <input
            id="toEmail"
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="larry.lee@ronaatlantic.ca"
          />
        </div>

        <button
          onClick={handleReassign}
          disabled={loading || !fromEmail || !toEmail}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Reassigning...' : 'Reassign All Contacts'}
        </button>

        {result && (
          <div
            className={`p-4 rounded-lg ${
              result.success
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm">{result.message}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This will reassign ALL contacts currently owned by the "From User" 
            to the "To User" within your organization. This action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}