import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

export const googleOAuth = (app: Hono) => {
  
  // Initiate Google OAuth flow
  app.post('/make-server-8405be07/google-oauth-init', async (c) => {
    try {
      console.log('[Google OAuth] Initiating OAuth flow');
      
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Authorization header required' }, 401);
      }

      const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
      const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'https://www.prospacescrm.com/oauth-callback';
      
      if (!GOOGLE_CLIENT_ID) {
        return c.json({ error: 'GOOGLE_CLIENT_ID not configured' }, 500);
      }

      // Verify user is authenticated
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Generate state parameter for security
      const state = crypto.randomUUID();
      
      // Store state in KV with user ID
      await kv.set(`oauth_state:${state}`, {
        userId: user.id,
        provider: 'google',
        timestamp: new Date().toISOString()
      }); // Note: KV store does not support TTL

      // Build Google OAuth URL
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      console.log('[Google OAuth] Generated auth URL:', authUrl.toString());

      return c.json({
        success: true,
        authUrl: authUrl.toString()
      });

    } catch (error: any) {
      console.error('[Google OAuth] Init error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Handle Google OAuth callback
  app.get('/oauth-callback', async (c) => {
    try {
      console.log('[Google OAuth] Callback received');
      
      const code = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');

      if (error) {
        console.error('[Google OAuth] User denied access:', error);
        return c.html(`
          <html>
            <body>
              <script>
                window.opener.postMessage({ type: 'gmail-oauth-error', error: 'Access denied' }, '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      if (!code || !state) {
        return c.json({ error: 'Missing code or state' }, 400);
      }

      // Verify state
      const stateData = await kv.get(`oauth_state:${state}`);
      if (!stateData) {
        return c.json({ error: 'Invalid or expired state' }, 400);
      }

      await kv.del(`oauth_state:${state}`);

      const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
      const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'https://www.prospacescrm.com/oauth-callback';

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return c.json({ error: 'Google OAuth not configured' }, 500);
      }

      // Exchange code for tokens
      console.log('[Google OAuth] Exchanging code for tokens');
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[Google OAuth] Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log('[Google OAuth] Tokens received');

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google');
      }

      const userInfo = await userInfoResponse.json();
      console.log('[Google OAuth] User info retrieved:', userInfo.email);

      // Store account data in KV (consistent with index.tsx OAuth pattern)
      const kvKey = `gmail_${(userInfo.email || 'x').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
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
        provider: 'gmail',
        email: userInfo.email,
        displayName: userInfo.name || userInfo.email,
        display_name: userInfo.name || userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        connected: true,
        status: 'active',
        connectedAt: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        calendar_enabled: calendarEnabled || (existingAccount?.calendar_enabled ?? false),
        email_enabled: emailEnabled || (existingAccount?.email_enabled ?? true),
      };

      await kv.set(`email_account:${stateData.userId}:${kvKey}`, accountData);
      await kv.set(`email_account:by_email:${userInfo.email}`, accountId);

      console.log('[Google OAuth] Account saved successfully');

      // Return success to popup
      return c.html(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'gmail-oauth-success',
                account: {
                  id: '${accountId}',
                  email: '${userInfo.email}',
                  last_sync: '${accountData.last_sync}'
                }
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);

    } catch (error: any) {
      console.error('[Google OAuth] Callback error:', error);
      return c.html(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'gmail-oauth-error', 
                error: '${error.message}' 
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  });

  // Health check endpoint
  app.get('/make-server-8405be07/google-health', (c) => {
    const configured = !!(Deno.env.get('GOOGLE_CLIENT_ID') && Deno.env.get('GOOGLE_CLIENT_SECRET'));
    return c.json({ 
      status: 'ok', 
      configured,
      timestamp: new Date().toISOString() 
    });
  });
};