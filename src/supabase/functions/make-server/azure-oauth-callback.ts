import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const azureOAuthCallback = (app: Hono) => {
  app.get('/azure-oauth-callback', async (c) => {
    try {
      const code = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');
      const errorDescription = c.req.query('error_description');

      if (error) {
        console.error('Azure OAuth error:', error, errorDescription);
        return c.html(getHtmlResponse({ error: errorDescription || error }));
      }

      if (!code || !state) {
        return c.html(getHtmlResponse({ error: 'Missing code or state' }));
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Verify state
      const { data: stateData, error: stateError } = await supabaseClient
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .single();

      if (stateError || !stateData) {
        console.error('Invalid state:', stateError);
        return c.html(getHtmlResponse({ error: 'Invalid or expired state' }));
      }

      // Delete state to prevent reuse
      await supabaseClient.from('oauth_states').delete().eq('id', stateData.id);

      // Exchange code for token
      const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
      const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

      console.log('Azure OAuth Callback Debug:', {
        hasClientId: !!AZURE_CLIENT_ID,
        hasClientSecret: !!AZURE_CLIENT_SECRET,
        hasRedirectUri: !!AZURE_REDIRECT_URI,
        redirectUriValue: AZURE_REDIRECT_URI // Safe to log URI
      });

      if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_REDIRECT_URI) {
        console.error('Missing configuration in callback:', {
            AZURE_CLIENT_ID: !!AZURE_CLIENT_ID,
            AZURE_CLIENT_SECRET: !!AZURE_CLIENT_SECRET,
            AZURE_REDIRECT_URI: !!AZURE_REDIRECT_URI
        });
        return c.html(getHtmlResponse({ error: 'Server configuration error: Missing secrets' }));
      }

      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', AZURE_CLIENT_ID);
      tokenParams.append('client_secret', AZURE_CLIENT_SECRET);
      tokenParams.append('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read');
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
        console.error('Token exchange failed:', tokenData);
        return c.html(getHtmlResponse({ error: tokenData.error_description || 'Failed to exchange token' }));
      }

      // Get user email from Graph API
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        console.error('Failed to get user profile:', userData);
        return c.html(getHtmlResponse({ error: 'Failed to fetch user profile' }));
      }

      // Store account in database
      const accountData = {
        user_id: stateData.user_id,
        provider: 'outlook',
        email: userData.mail || userData.userPrincipalName,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        connected: true,
        updated_at: new Date().toISOString(),
      };

      let resultAccount;

      // Check if account exists
      const { data: existingAccount } = await supabaseClient
        .from('email_accounts')
        .select('*')
        .eq('user_id', stateData.user_id)
        .eq('email', accountData.email)
        .single();

      if (existingAccount) {
        const { data, error } = await supabaseClient
          .from('email_accounts')
          .update(accountData)
          .eq('id', existingAccount.id)
          .select()
          .single();
        if (error) throw error;
        resultAccount = data;
      } else {
        const { data, error } = await supabaseClient
          .from('email_accounts')
          .insert({ ...accountData, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        resultAccount = data;
      }

      return c.html(getHtmlResponse({ 
        success: true, 
        account: {
          id: resultAccount.id,
          email: resultAccount.email,
          last_sync: resultAccount.updated_at
        }
      }));

    } catch (error) {
      console.error('Callback error:', error);
      return c.html(getHtmlResponse({ error: error.message }));
    }
  });
};

function getHtmlResponse(data: any) {
  const jsonData = JSON.stringify(data);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Complete</title>
      </head>
      <body>
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 40px;">
          <h2>${data.success ? 'Authentication Successful' : 'Authentication Failed'}</h2>
          <p>${data.error || 'You can close this window now.'}</p>
        </div>
        <script>
          const data = ${jsonData};
          const message = data.success 
            ? { type: 'azure-oauth-success', account: data.account }
            : { type: 'azure-oauth-error', error: data.error };
            
          if (window.opener) {
            window.opener.postMessage(message, '*');
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
    </html>
  `;
}
