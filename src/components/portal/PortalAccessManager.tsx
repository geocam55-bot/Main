import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  Globe,
  UserPlus,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Key,
  AlertCircle,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { createPortalInvite, revokePortalAccess, getPortalUsers } from '../../utils/portal-client';
import { createClient } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../../utils/clipboard';

interface PortalAccessManagerProps {
  contactId: string;
  contactName: string;
  contactEmail: string;
}

export function PortalAccessManager({ contactId, contactName, contactEmail }: PortalAccessManagerProps) {
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [appBaseUrl, setAppBaseUrl] = useState<string>('');

  const supabase = createClient();

  const handleCreateInvite = async () => {
    if (!contactEmail) {
      toast.error('This contact has no email address. An email is required for portal access.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to create invites');
        return;
      }

      const result = await createPortalInvite(contactId, session.access_token);
      setInviteCode(result.inviteCode);
      // Use the APP_URL returned by the server; fall back to window.location.origin
      if (result.appUrl) {
        setAppBaseUrl(result.appUrl.replace(/\/$/, '')); // strip trailing slash
      } else {
        setAppBaseUrl(window.location.origin);
      }
      setShowInviteDialog(true);
      toast.success('Portal invite created!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in');
        return;
      }

      await revokePortalAccess(contactId, session.access_token);
      toast.success('Portal access revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke access');
    } finally {
      setRevoking(false);
    }
  };

  const portalUrl = `${appBaseUrl}?view=customer-portal${inviteCode ? `&invite=${inviteCode}` : ''}`;

  const copyInviteLink = () => {
    copyToClipboard(portalUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      copyToClipboard(inviteCode);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            Customer Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Give {contactName || 'this contact'} access to view their quotes, projects, and communicate with your team through the customer portal.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateInvite}
              disabled={loading || !contactEmail}
              className="gap-2"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Generate Invite
            </Button>
            <Button
              variant="outline"
              onClick={handleRevoke}
              disabled={revoking}
              size="sm"
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              {revoking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Revoke
            </Button>
          </div>

          {!contactEmail && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This contact needs an email address before portal access can be granted.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Invite Code Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Portal Invite Created
            </DialogTitle>
            <DialogDescription>
              Share this invite with {contactName || 'your customer'} so they can create their portal account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Invite Code */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Invite Code</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted border rounded-lg px-4 py-3 font-mono text-lg text-center tracking-[0.3em] font-bold text-foreground">
                  {inviteCode}
                </div>
                <Button variant="outline" size="sm" onClick={copyInviteCode} className="shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Portal Link */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Direct Registration Link</label>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-muted border rounded-lg px-3 py-2 text-xs text-muted-foreground truncate"
                  value={portalUrl}
                  readOnly
                />
                <Button variant="outline" size="sm" onClick={copyInviteLink} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Send to your customer:</strong> They'll use the invite code to create their portal account with a password.
                The code expires in 7 days.
              </AlertDescription>
            </Alert>

            <Button onClick={() => setShowInviteDialog(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}