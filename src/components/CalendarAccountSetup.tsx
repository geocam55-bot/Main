import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, CheckCircle, XCircle, Loader2, AlertCircle, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getServerHeaders } from '../utils/server-headers';

interface CalendarAccount {
  id: string;
  provider: 'google' | 'outlook';
  email: string;
  connected: boolean;
  last_sync?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface CalendarAccountSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
  editingAccount?: CalendarAccount | null;
  existingAccounts?: CalendarAccount[];
}

// Function to find the active function name
// We fallback to checking for 'make-server' (old style) or 'server' (new style)
async function findActiveFunctionName(supabaseUrl: string, accessToken?: string): Promise<string> {
  const candidates = [
    'make-server-8405be07',
    'server',
  ];

  for (const candidate of candidates) {
    try {
      const url = `${supabaseUrl}/functions/v1/${candidate}/health`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); 

      const response = await fetch(url, {
        method: 'GET',
        headers: {
           'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok || response.status === 401) {
        return candidate;
      }
    } catch (e) {
      // Continue
    }
  }

  return 'make-server-8405be07';
}

export function CalendarAccountSetup({ isOpen, onClose, onAccountAdded, editingAccount, existingAccounts = [] }: CalendarAccountSetupProps) {
  const [step, setStep] = useState<'list' | 'select' | 'oauth' | 'success'>('list');
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // OAuth popup tracking for MFA reopen support
  const [popupClosed, setPopupClosed] = useState(false);
  const [oauthAuthUrl, setOauthAuthUrl] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const oauthCompleteRef = useRef(false);
  const pollIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setEmail(editingAccount.email);
      setSelectedProvider(editingAccount.provider);
    }
  }, [editingAccount]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('list');
        setSelectedProvider(null);
        setEmail('');
        setError('');
      }, 200);
    } else {
      if (existingAccounts.length > 0) {
        setStep('list');
      } else {
        setStep('select');
      }
    }
  }, [isOpen, existingAccounts.length]);

  const calendarProviders = [
    {
      id: 'google' as const,
      name: 'Google Calendar',
      description: 'Sync with your Google Calendar',
      icon: '📅',
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      status: 'available'
    },
    {
      id: 'outlook' as const,
      name: 'Outlook Calendar',
      description: 'Sync with your Microsoft Outlook Calendar',
      icon: '📆',
      color: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-200',
      status: 'available'
    },
  ];

  const handleProviderSelect = (provider: 'google' | 'outlook') => {
    setSelectedProvider(provider);
    setStep('oauth');
    setError('');
  };

  const handleOAuthConnect = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const supabaseUrl = `https://${projectId}.supabase.co`;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Determine endpoint sub-path based on provider
      const subPath = selectedProvider === 'google'
        ? 'google-oauth-init'
        : selectedProvider === 'outlook'
        ? 'microsoft-oauth-init'
        : null;

      if (!subPath) {
        throw new Error(`${selectedProvider} is not yet supported for calendar`);
      }

      // Use the function name with sub-path so supabase.functions.invoke()
      // hits  /functions/v1/make-server-8405be07/<subPath>
      const functionPath = `make-server-8405be07/${subPath}`;
      // Invoking OAuth function

      const { data, error: invokeError } = await supabase.functions.invoke(functionPath, {
        method: 'POST',
        body: { frontendOrigin: window.location.origin, purpose: 'calendar' },
        headers: {
          'X-User-Token': session.access_token,
        },
      });

      if (invokeError) {
        // Invoke error
        throw new Error(invokeError.message || 'Failed to initialize OAuth.');
      }

      if (!data?.success || !data?.authUrl) {
        // Unexpected response
        throw new Error(data?.error || 'Failed to get authorization URL from server.');
      }

      // Store the auth URL and pollId so we can reopen the popup if closed during MFA
      setOauthAuthUrl(data.authUrl);
      pollIdRef.current = data.pollId;
      setPopupClosed(false);
      oauthCompleteRef.current = false;

      toast.info('Opening authorization window...', {
        description: `Please sign in with ${selectedProvider === 'google' ? 'Google' : 'Microsoft'}. If your account requires 2FA / Authenticator, approve the prompt in the sign-in window.`
      });

      // Sized larger to accommodate MFA / Microsoft Authenticator prompts
      const width = 650;
      const height = 800;
      const left = Math.max(0, window.screen.width / 2 - width / 2);
      const top = Math.max(0, window.screen.height / 2 - height / 2);
      
      const popup = window.open(
        data.authUrl,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=yes,status=yes,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      popupRef.current = popup;

      const pollId = data.pollId;
      // Popup opened, polling for OAuth completion

      const startTime = Date.now();
      const maxWaitTime = 5 * 60 * 1000;
      let pollAttempts = 0;
      
      const handleSuccess = (result: any) => {
        oauthCompleteRef.current = true;
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        toast.success('Calendar connected!', { description: result?.email || '' });
        setIsConnecting(false);
        setStep('success');
        onAccountAdded();
        try { popup.close(); } catch (e) {}
        setTimeout(() => onClose(), 1500);
      };

      const checkOAuthPoll = async (): Promise<boolean> => {
        try {
          const srvHeaders = await getServerHeaders();
          const pollRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/oauth-poll/${pollId}`,
            { headers: srvHeaders }
          );
          if (!pollRes.ok) return false;
          const pollJson = await pollRes.json();
          if (pollJson.status === 'complete' && pollJson.result?.success) {
            return true;
          }
          if (pollJson.status === 'complete' && !pollJson.result?.success) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsConnecting(false);
            setError(pollJson.result?.error || 'OAuth failed on server');
            return false;
          }
        } catch (e) {}
        return false;
      };

      const pollForAccount = async () => {
        pollAttempts++;
        const elapsed = Date.now() - startTime;
        
        if (elapsed > maxWaitTime) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setIsConnecting(false);
          setError('Connection timeout. Please try again.');
          return;
        }

        // Check oauth-poll endpoint (KV-based — works regardless of DB)
        const complete = await checkOAuthPoll();
        if (complete) {
          handleSuccess({ email: email.trim() });
          return;
        }

        // Check if popup was closed without completion
        try {
          if (popup.closed && !oauthCompleteRef.current) {
            // One final check
            const finalCheck = await checkOAuthPoll();
            if (finalCheck) {
              handleSuccess({ email: email.trim() });
              return;
            }
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            // Popup closed without completion — showing reopen option
            setPopupClosed(true);
            setIsConnecting(false);
            return;
          }
        } catch (e) {}
      };

      const pollInterval = setInterval(pollForAccount, 2000);
      pollIntervalRef.current = pollInterval;
      // First poll after a short delay (give the popup time to load)
      setTimeout(pollForAccount, 1000);

    } catch (error: any) {
      // Connection error
      setError(error.message || 'Failed to connect calendar. Please try again.');
      toast.error('Failed to connect calendar', {
        description: error.message
      });
      setIsConnecting(false);
    }
  };

  // Reopen the sign-in popup with the same auth URL (for MFA retry)
  const handleReopenPopup = () => {
    if (!oauthAuthUrl) {
      // No stored URL — restart the full OAuth flow
      handleOAuthConnect();
      return;
    }

    const width = 650;
    const height = 800;
    const left = Math.max(0, window.screen.width / 2 - width / 2);
    const top = Math.max(0, window.screen.height / 2 - height / 2);

    const newPopup = window.open(
      oauthAuthUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=yes,status=yes,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!newPopup) {
      toast.error('Popup was blocked. Please allow popups for this site.');
      return;
    }

    popupRef.current = newPopup;
    setPopupClosed(false);
    setError('');
    setIsConnecting(true);
    oauthCompleteRef.current = false;

    toast.info('Sign-in window reopened', {
      description: 'Complete the sign-in and MFA approval in the new window.'
    });

    // Restart polling using oauth-poll endpoint
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000;
    const currentPollId = pollIdRef.current;

    const checkPollEndpoint = async (): Promise<boolean> => {
      if (!currentPollId) return false;
      try {
        const srvHeaders = await getServerHeaders();
        const pollRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/oauth-poll/${currentPollId}`,
          { headers: srvHeaders }
        );
        if (!pollRes.ok) return false;
        const pollJson = await pollRes.json();
        return pollJson.status === 'complete' && pollJson.result?.success;
      } catch (e) { return false; }
    };

    const handleReopenSuccess = () => {
      oauthCompleteRef.current = true;
      clearInterval(pollIntervalRef.current!);
      pollIntervalRef.current = null;
      toast.success('Calendar connected!');
      setIsConnecting(false);
      setStep('success');
      onAccountAdded();
      try { newPopup.close(); } catch (e) {}
      setTimeout(() => onClose(), 1500);
    };

    const pollForAccount = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > maxWaitTime || oauthCompleteRef.current) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        if (!oauthCompleteRef.current) {
          setIsConnecting(false);
          setError('Connection timeout. Please try again.');
        }
        return;
      }

      const complete = await checkPollEndpoint();
      if (complete) { handleReopenSuccess(); return; }

      try {
        if (newPopup.closed && !oauthCompleteRef.current) {
          const finalCheck = await checkPollEndpoint();
          if (finalCheck) { handleReopenSuccess(); return; }
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setPopupClosed(true);
          setIsConnecting(false);
          return;
        }
      } catch (e) {}
    };

    pollIntervalRef.current = setInterval(pollForAccount, 2000);
    setTimeout(pollForAccount, 1000);
  };

  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to disconnect ${email}? This will stop syncing with this calendar.`)) {
      return;
    }

    setIsDeleting(accountId);
    try {
      const delHeaders = await getServerHeaders();
      const delRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-accounts/${accountId}`,
        { method: 'DELETE', headers: delHeaders }
      );
      if (!delRes.ok) {
        const errBody = await delRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error || `Server returned ${delRes.status}`);
      }

      toast.success('Calendar disconnected', {
        description: `${email} has been removed`
      });

      onAccountAdded();

    } catch (error: any) {
      // Delete error
      toast.error('Failed to disconnect calendar');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReconnect = (account: CalendarAccount) => {
    setEmail(account.email);
    setSelectedProvider(account.provider);
    setStep('oauth');
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never synced';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const renderManageAccounts = () => (
    <div className="space-y-4">
      {existingAccounts.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            Manage your connected calendar accounts
          </p>

          <div className="space-y-3">
            {existingAccounts.map((account) => {
              const provider = calendarProviders.find(p => p.id === account.provider);
              if (!provider) return null;

              return (
                <div
                  key={account.id}
                  className="border border-border rounded-lg p-4 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">{provider.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{account.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last synced: {formatLastSync(account.last_sync)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReconnect(account)}
                        disabled={isDeleting === account.id}
                        title="Reconnect calendar"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id, account.email)}
                        disabled={isDeleting === account.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Disconnect calendar"
                      >
                        {isDeleting === account.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep('select')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Connect Another Calendar
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No calendar accounts connected</p>
          <Button onClick={() => setStep('select')}>
            <Calendar className="h-4 w-4 mr-2" />
            Connect Your First Calendar
          </Button>
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Tip:</strong> Click reconnect to refresh your calendar connection if sync is not working.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderListAccounts = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a calendar provider to sync your appointments
      </p>

      <div className="grid gap-3">
        {calendarProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleProviderSelect(provider.id)}
            className={`${provider.color} transition-colors rounded-lg p-4 text-left w-full`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{provider.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium">{provider.name}</h4>
                <p className="text-sm opacity-80 mt-1">{provider.description}</p>
              </div>
              <Calendar className="h-5 w-5 opacity-50" />
            </div>
          </button>
        ))}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Two-way sync enabled:</strong> Changes in your calendar will sync to CRM appointments, and vice versa.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderOAuthStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${
          selectedProvider === 'google' ? 'bg-blue-100' : 'bg-cyan-100'
        } mb-4`}>
          <Calendar className={`h-8 w-8 ${
            selectedProvider === 'google' ? 'text-blue-600' : 'text-cyan-600'
          }`} />
        </div>
        <h3 className="font-medium text-lg mb-2">
          Connect {selectedProvider === 'google' ? 'Google' : 'Outlook'} Calendar
        </h3>
        <p className="text-sm text-muted-foreground">
          Authorize access to sync your calendar events with ProSpaces CRM
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Calendar Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`Enter your ${selectedProvider === 'google' ? 'Google' : 'Outlook'} email`}
            disabled={isConnecting}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {selectedProvider === 'outlook' && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-xs">
              <strong>2FA / MFA Supported:</strong> If your organization requires
              Microsoft Authenticator or another two-factor method, you will be
              prompted in the sign-in window. Keep it open until approval is complete.
            </AlertDescription>
          </Alert>
        )}

        {selectedProvider === 'google' && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              <strong>2-Step Verification Supported:</strong> If your Google account
              has 2-Step Verification enabled, approve the prompt (authenticator app,
              security key, or phone) in the sign-in window.
            </AlertDescription>
          </Alert>
        )}

        {popupClosed && (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Sign-in window was closed.</strong>
              <span className="block text-xs mt-1">
                If you closed it accidentally or need to complete MFA approval,
                click below to reopen the sign-in window.
              </span>
              <Button
                onClick={handleReopenPopup}
                variant="outline"
                size="sm"
                className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Reopen Sign-in Window
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            You'll be redirected to {selectedProvider === 'google' ? 'Google' : 'Microsoft'} to authorize calendar access. 
            We only request permissions to read and write calendar events.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('list')}
          disabled={isConnecting}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleOAuthConnect}
          disabled={isConnecting || !email.trim()}
          className="flex-1"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for sign-in & MFA...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Connect Calendar
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="font-medium text-lg mb-2">Calendar Connected!</h3>
      <p className="text-sm text-muted-foreground">
        Your {selectedProvider === 'google' ? 'Google' : 'Outlook'} Calendar is now synced with ProSpaces CRM
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>
            {step === 'list' && (existingAccounts.length > 0 ? 'Manage Calendars' : 'Connect Calendar')}
            {step === 'select' && 'Connect Calendar'}
            {step === 'oauth' && 'Authorize Calendar Access'}
            {step === 'success' && 'Success!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'list' && (existingAccounts.length > 0 ? 'View and manage your connected calendar accounts' : 'Sync your appointments with your personal calendar')}
            {step === 'select' && 'Sync your appointments with your personal calendar'}
            {step === 'oauth' && 'Grant ProSpaces permission to sync calendar events'}
            {step === 'success' && 'Your calendar is ready to sync'}
          </DialogDescription>
        </DialogHeader>

        {step === 'list' && (existingAccounts.length > 0 ? renderManageAccounts() : renderListAccounts())}
        {step === 'select' && renderListAccounts()}
        {step === 'oauth' && renderOAuthStep()}
        {step === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  );
}