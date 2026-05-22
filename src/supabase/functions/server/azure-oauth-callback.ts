import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const azureOAuthCallback = (app: Hono) => {
  // Handle Microsoft/Outlook OAuth callback
  app.get('/make-server-8405be07/azure-oauth-callback', async (c) => {
    try {
      const code = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');
      const errorDescription = c.req.query('error_description');

      if (error) {
        console.error('[Azure OAuth] Callback error:', error, errorDescription);
        return c.html(getCallbackHtml({ error: errorDescription || error }));
      }

      if (!code || !state) {
        return c.html(getCallbackHtml({ error: 'Missing authorization code or state' }));
      }

      // Verify state from KV
      const stateData = await kv.get(`oauth_state:${state}`) as any;
      if (!stateData) {
        console.error('[Azure OAuth] Invalid or expired state');
        return c.html(getCallbackHtml({ error: 'Invalid or expired state. Please try again.' }));
      }

      // Delete state to prevent reuse (keep state string for poll key)
      await kv.del(`oauth_state:${state}`);

      const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
      const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

      console.log('[Azure OAuth] Callback config check:', {
        hasClientId: !!AZURE_CLIENT_ID,
        hasClientSecret: !!AZURE_CLIENT_SECRET,
        hasRedirectUri: !!AZURE_REDIRECT_URI,
      });

      if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_REDIRECT_URI) {
        console.error('[Azure OAuth] Missing server configuration');
        return c.html(getCallbackHtml({ error: 'Server configuration error: Missing Azure secrets' }));
      }

      // Exchange code for tokens
      console.log('[Azure OAuth] Exchanging code for tokens...');
      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', AZURE_CLIENT_ID);
      tokenParams.append('client_secret', AZURE_CLIENT_SECRET);
      tokenParams.append('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read Calendars.Read Calendars.ReadWrite');
      tokenParams.append('code', code);
      tokenParams.append('redirect_uri', AZURE_REDIRECT_URI);
      tokenParams.append('grant_type', 'authorization_code');

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('[Azure OAuth] Token exchange failed:', tokenData);
        return c.html(getCallbackHtml({ 
          error: tokenData.error_description || 'Failed to exchange authorization code for tokens' 
        }));
      }

      console.log('[Azure OAuth] Token exchange successful');

      // Get user profile from Microsoft Graph API
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        console.error('[Azure OAuth] Failed to get user profile:', userData);
        return c.html(getCallbackHtml({ error: 'Failed to fetch Microsoft user profile' }));
      }

      const userEmail = userData.mail || userData.userPrincipalName;
      console.log('[Azure OAuth] User profile retrieved:', userEmail);

      // Store account in KV (consistent with index.tsx OAuth pattern)
      const kvKey = `outlook_${userEmail.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const existingAccount = await kv.get(`email_account:${stateData.userId}:${kvKey}`);
      const accountId = (existingAccount && existingAccount.id && existingAccount.id.includes('-')) ? existingAccount.id : crypto.randomUUID();
      const purpose = stateData.purpose || 'email';
      const calendarEnabled = purpose === 'calendar' || purpose === 'both';
      const emailEnabled = purpose === 'email' || purpose === 'both';
      const accountData = {
        id: accountId,
        kvKey,
        user_id: stateData.userId,
        userId: stateData.userId,
        provider: 'outlook',
        email: userEmail,
        displayName: userData.displayName || userEmail,
        display_name: userData.displayName || userEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        connected: true,
        status: 'active',
        connectedAt: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        calendar_enabled: calendarEnabled || (existingAccount?.calendar_enabled ?? false),
        email_enabled: emailEnabled || (existingAccount?.email_enabled ?? true),
      };

      await kv.set(`email_account:${stateData.userId}:${kvKey}`, accountData);
      await kv.set(`email_account:by_email:${userEmail}`, accountId);

      // Store result for polling fallback (window.opener breaks on cross-origin redirects)
      const oauthResult = {
        success: true,
        account: {
          id: accountId,
          email: userEmail,
          last_sync: accountData.last_sync
        }
      };
      await kv.set(`oauth_result:${state}`, oauthResult); // Note: KV store does not support TTL

      console.log('[Azure OAuth] Account saved to KV successfully:', accountId);

      // Return success HTML that posts message to opener window
      return c.html(getCallbackHtml(oauthResult));

    } catch (error: any) {
      console.error('[Azure OAuth] Callback error:', error);
      return c.html(getCallbackHtml({ error: error.message }));
    }
  });

  // Token refresh endpoint for Outlook accounts
  app.post('/make-server-8405be07/microsoft-refresh-token', async (c) => {
    try {
      const body = await c.req.json();
      const { accountId, userId } = body;

      if (!accountId || !userId) {
        return c.json({ error: 'accountId and userId are required' }, 400);
      }

      // Get account from KV
      const accountData = await kv.get(`email_account:${userId}:${accountId}`) as any;
      if (!accountData) {
        return c.json({ error: 'Account not found' }, 404);
      }

      if (!accountData.refresh_token) {
        return c.json({ error: 'No refresh token available. Please reconnect the account.' }, 400);
      }

      const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');

      if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
        return c.json({ error: 'Azure OAuth not configured on server' }, 500);
      }

      // Refresh the token
      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', AZURE_CLIENT_ID);
      tokenParams.append('client_secret', AZURE_CLIENT_SECRET);
      tokenParams.append('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read Calendars.Read Calendars.ReadWrite');
      tokenParams.append('refresh_token', accountData.refresh_token);
      tokenParams.append('grant_type', 'refresh_token');

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('[Azure OAuth] Token refresh failed:', tokenData);
        return c.json({ error: tokenData.error_description || 'Token refresh failed' }, 400);
      }

      // Update the stored account with new tokens
      accountData.access_token = tokenData.access_token;
      if (tokenData.refresh_token) {
        accountData.refresh_token = tokenData.refresh_token;
      }
      accountData.token_expires_at = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      await kv.set(`email_account:${userId}:${accountId}`, accountData);

      console.log('[Azure OAuth] Token refreshed successfully for account:', accountId);

      return c.json({
        success: true,
        access_token: tokenData.access_token,
        expires_at: accountData.token_expires_at,
      });

    } catch (error: any) {
      console.error('[Azure OAuth] Token refresh error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Send email via Microsoft Graph API
  app.post('/make-server-8405be07/microsoft-send-email', async (c) => {
    try {
      const body = await c.req.json();
      const { accountId, userId, to, subject, body: emailBody, cc, bcc } = body;

      if (!accountId || !userId) {
        return c.json({ error: 'accountId and userId are required' }, 400);
      }

      // Get account from KV
      const accountData = await kv.get(`email_account:${userId}:${accountId}`) as any;
      if (!accountData) {
        return c.json({ error: 'Account not found' }, 404);
      }

      // Check if token needs refresh
      let accessToken = accountData.access_token;
      if (new Date(accountData.token_expires_at) <= new Date()) {
        console.log('[Azure OAuth] Token expired, refreshing...');
        // Inline refresh
        const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
        const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
        
        if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !accountData.refresh_token) {
          return c.json({ error: 'Cannot refresh token. Please reconnect the account.' }, 400);
        }

        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', AZURE_CLIENT_ID);
        tokenParams.append('client_secret', AZURE_CLIENT_SECRET);
        tokenParams.append('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read');
        tokenParams.append('refresh_token', accountData.refresh_token);
        tokenParams.append('grant_type', 'refresh_token');

        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
          return c.json({ error: 'Token refresh failed. Please reconnect the account.' }, 401);
        }

        accessToken = tokenData.access_token;
        accountData.access_token = accessToken;
        if (tokenData.refresh_token) accountData.refresh_token = tokenData.refresh_token;
        accountData.token_expires_at = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        await kv.set(`email_account:${userId}:${accountId}`, accountData);
      }

      // Build Graph API email message
      const toRecipients = to.split(',').map((email: string) => ({
        emailAddress: { address: email.trim() }
      }));

      const message: any = {
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: emailBody,
          },
          toRecipients,
        },
      };

      if (cc) {
        message.message.ccRecipients = cc.split(',').map((email: string) => ({
          emailAddress: { address: email.trim() }
        }));
      }

      if (bcc) {
        message.message.bccRecipients = bcc.split(',').map((email: string) => ({
          emailAddress: { address: email.trim() }
        }));
      }

      // Send via Microsoft Graph API
      const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json().catch(() => ({}));
        console.error('[Azure OAuth] Send email failed:', errorData);
        return c.json({ 
          error: errorData?.error?.message || 'Failed to send email via Microsoft Graph' 
        }, sendResponse.status);
      }

      console.log('[Azure OAuth] Email sent successfully via Graph API');
      return c.json({ success: true });

    } catch (error: any) {
      console.error('[Azure OAuth] Send email error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Sync emails from Microsoft Graph API
  app.post('/make-server-8405be07/microsoft-sync-emails', async (c) => {
    try {
      const body = await c.req.json();
      const { accountId, userId, limit = 50 } = body;

      if (!accountId || !userId) {
        return c.json({ error: 'accountId and userId are required' }, 400);
      }

      // Get account from KV
      const accountData = await kv.get(`email_account:${userId}:${accountId}`) as any;
      if (!accountData) {
        return c.json({ error: 'Account not found' }, 404);
      }

      // Check if token needs refresh
      let accessToken = accountData.access_token;
      if (new Date(accountData.token_expires_at) <= new Date()) {
        const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
        const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
        
        if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !accountData.refresh_token) {
          return c.json({ error: 'Cannot refresh token. Please reconnect.' }, 400);
        }

        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', AZURE_CLIENT_ID);
        tokenParams.append('client_secret', AZURE_CLIENT_SECRET);
        tokenParams.append('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read');
        tokenParams.append('refresh_token', accountData.refresh_token);
        tokenParams.append('grant_type', 'refresh_token');

        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
          return c.json({ error: 'Token refresh failed. Please reconnect.' }, 401);
        }

        accessToken = tokenData.access_token;
        accountData.access_token = accessToken;
        if (tokenData.refresh_token) accountData.refresh_token = tokenData.refresh_token;
        accountData.token_expires_at = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        await kv.set(`email_account:${userId}:${accountId}`, accountData);
      }

      // Fetch emails from Microsoft Graph
      const messagesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,importance`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!messagesResponse.ok) {
        const errorData = await messagesResponse.json().catch(() => ({}));
        console.error('[Azure OAuth] Sync failed:', errorData);
        return c.json({ error: errorData?.error?.message || 'Failed to fetch emails' }, messagesResponse.status);
      }

      const messagesData = await messagesResponse.json();
      const messages = messagesData.value || [];

      console.log(`[Azure OAuth] Synced ${messages.length} emails`);

      // Transform to our standard email format
      const emails = messages.map((msg: any) => ({
        id: msg.id,
        account_id: accountId,
        message_id: msg.id,
        subject: msg.subject || '(No Subject)',
        from_email: msg.from?.emailAddress?.address || '',
        from_name: msg.from?.emailAddress?.name || '',
        to_emails: (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean),
        cc_emails: (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean),
        body_preview: msg.bodyPreview || '',
        body_html: msg.body?.content || '',
        received_at: msg.receivedDateTime,
        is_read: msg.isRead,
        has_attachments: msg.hasAttachments,
        importance: msg.importance,
        folder: 'inbox',
      }));

      // Update last sync time
      accountData.last_sync = new Date().toISOString();
      await kv.set(`email_account:${userId}:${accountId}`, accountData);

      return c.json({
        success: true,
        emails,
        syncedCount: emails.length,
        lastSync: accountData.last_sync,
      });

    } catch (error: any) {
      console.error('[Azure OAuth] Sync error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Poll for OAuth result (fallback when window.opener is broken by cross-origin redirects)
  app.get('/make-server-8405be07/oauth-poll/:pollId', async (c) => {
    try {
      const pollId = c.req.param('pollId');
      if (!pollId) {
        return c.json({ error: 'pollId is required' }, 400);
      }

      const result = await kv.get(`oauth_result:${pollId}`) as any;
      if (result) {
        // Clean up after successful poll
        await kv.del(`oauth_result:${pollId}`);
        console.log('[Azure OAuth] Poll result found and delivered for:', pollId);
        return c.json(result);
      }

      // Not ready yet
      return c.json({ pending: true });
    } catch (error: any) {
      console.error('[Azure OAuth] Poll error:', error);
      return c.json({ error: error.message }, 500);
    }
  });
};

// HTML response for the OAuth popup callback window
function getCallbackHtml(data: any) {
  const jsonData = JSON.stringify(data);
  const isSuccess = !!data.success;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${isSuccess ? 'Authentication Successful' : 'Authentication Failed'}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; }
          .card { background: white; border-radius: 16px; padding: 40px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { color: #1a1a2e; margin: 0 0 8px 0; }
          p { color: #666; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${isSuccess ? '\u2705' : '\u274c'}</div>
          <h2>${isSuccess ? 'Connected!' : 'Connection Failed'}</h2>
          <p>${data.error || (isSuccess ? 'Your Outlook account has been connected. This window will close.' : 'Something went wrong.')}</p>
        </div>
        <script>
          const data = ${jsonData};
          const message = data.success 
            ? { type: 'outlook-oauth-success', account: data.account }
            : { type: 'outlook-oauth-error', error: data.error };
            
          if (window.opener) {
            window.opener.postMessage(message, '*');
            setTimeout(() => window.close(), 1500);
          }
        </script>
      </body>
    </html>
  `;
}