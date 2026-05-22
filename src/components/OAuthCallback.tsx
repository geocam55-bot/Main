import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * OAuthCallback — receives the redirect from Microsoft / Google after the
 * user consents, extracts `code` + `state` from the URL, and POSTs them
 * to the universal `/oauth-exchange` server endpoint which auto-detects
 * the provider from the stored state.
 */
export function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const errorDesc = params.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDesc || error);
          notify({ type: 'oauth-error', error: errorDesc || error });
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('No authorization code received');
          notify({ type: 'oauth-error', error: 'No authorization code' });
          return;
        }

        setMessage('Exchanging authorization code...');

        // Call the universal exchange endpoint — it looks up the provider from KV
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/oauth-exchange`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ code, state }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Token exchange failed');
        }

        setStatus('success');
        setMessage(`Connected ${data.email || 'account'}!`);

        const provider = data.provider || 'outlook';
        const msgType = provider === 'gmail' ? 'gmail-oauth-success' : 'outlook-oauth-success';
        notify({
          type: msgType,
          account: { id: data.accountId, email: data.email },
          provider,
        });

        setTimeout(() => window.close(), 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Authentication failed');
        notify({ type: 'oauth-error', error: err.message });
      }
    };

    run();
  }, []);

  function notify(msg: any) {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(msg, '*');
      }
    } catch (e) {
      // postMessage failed – non-critical
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-background p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold text-foreground">Authenticating...</h2>
              <p className="text-muted-foreground text-center">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-semibold text-foreground">Success!</h2>
              <p className="text-muted-foreground text-center">{message}</p>
              <p className="text-sm text-muted-foreground">This window will close automatically...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <h2 className="text-xl font-semibold text-foreground">Authentication Failed</h2>
              <p className="text-muted-foreground text-center">{message}</p>
              <button
                onClick={() => window.close()}
                className="mt-4 px-4 py-2 bg-muted hover:bg-gray-300 rounded-md transition-colors"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}