import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Parse returnUrl early in case we need it for error redirects
  let returnUrl: string | null = null;
  
  try {
    const url = new URL(req.url);
    
    // Nylas Hosted Auth sends grant_id directly (no code exchange needed)
    let grant_id = url.searchParams.get('grant_id');
    let email = url.searchParams.get('email');
    let provider = url.searchParams.get('provider');
    const state = url.searchParams.get('state');
    const success = url.searchParams.get('success');
    const error = url.searchParams.get('error');
    const code = url.searchParams.get('code');

    // Try to extract returnUrl from state for error handling
    if (state) {
      try {
        const stateData = JSON.parse(state);
        returnUrl = stateData.returnUrl || null;
      } catch (e) {
        // Ignore state parse errors here
      }
    }
    
    console.log('Callback received:', {
      hasGrantId: !!grant_id,
      hasCode: !!code,
      hasEmail: !!email,
      hasState: !!state,
      hasError: !!error,
      success,
      url: req.url
    });

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error from provider:', error);
      throw new Error(error);
    }
    
    // CODE EXCHANGE LOGIC
    // If we received a code but no grant_id, we need to exchange it
    if (code && !grant_id) {
       console.log('Received auth code, exchanging for token...');
       
       const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
       const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID') || NYLAS_API_KEY;
       // The redirect URI must match exactly what was sent in the auth request
       // We assume the auth request used this function's URL as redirect_uri
       const redirect_uri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/nylas-callback`;
       
       if (!NYLAS_API_KEY || !NYLAS_CLIENT_ID) {
           throw new Error('Missing Nylas configuration (API Key/Client ID) for code exchange');
       }
       
       const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              client_id: NYLAS_CLIENT_ID,
              client_secret: NYLAS_API_KEY,
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirect_uri, 
          })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
          console.error('Token exchange failed:', tokenData);
          throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
      }
      
      console.log('Token exchange success:', { 
          hasGrantId: !!tokenData.grant_id, 
          email: tokenData.email,
          provider: tokenData.provider 
      });
      
      // Update variables with exchanged data
      grant_id = tokenData.grant_id;
      email = tokenData.email;
      provider = tokenData.provider;
    }

    // Check for required parameters
    if (!grant_id || !state || !email) {
      throw new Error(`Missing required parameters after processing. grant_id: ${!!grant_id}, state: ${!!state}, email: ${!!email}`);
    }

    // Parse state to get user info
    const stateData = JSON.parse(state);
    const { userId, orgId, returnUrl: stateReturnUrl } = stateData;

    // Use returnUrl from state if available
    if (stateReturnUrl) {
      returnUrl = stateReturnUrl;
    }

    console.log('State data:', { userId, orgId, returnUrl });
    
    // Map Nylas provider names to our database values
    const dbProvider = provider === 'google' ? 'gmail' : 
                      provider === 'microsoft' ? 'outlook' : 
                      provider || 'gmail';

    console.log('Saving account:', { dbProvider, email });

    // Create a Supabase client with service role key to insert data
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store the email account in the database
    const { data: account, error: insertError } = await supabaseClient
      .from('email_accounts')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        provider: dbProvider,
        email: email,
        nylas_grant_id: grant_id,
        nylas_access_token: null, // Hosted auth uses grant_id directly
        connected: true,
        last_sync: new Date().toISOString(),
      }, { onConflict: 'user_id, email' }) // Use upsert to update existing accounts
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save email account: ${insertError.message}`);
    }

    // Return success HTML that redirects back to app
    const appUrl = returnUrl || 
                   Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || 
                   req.headers.get('origin') || 
                   'https://your-app-url.com';
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 400px;
            }
            h1 { color: #10b981; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 0.5rem; }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #10b981;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 1.5rem auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Connected Successfully!</h1>
            <p><strong>${account.email}</strong></p>
            <p>Provider: ${account.provider}</p>
            <div class="spinner"></div>
            <p style="font-size: 0.875rem; color: #999;">Closing window...</p>
          </div>
          <script>
            console.log('[Nylas Callback] Success! Account:', {
              id: '${account.id}',
              email: '${account.email}',
              provider: '${account.provider}'
            });
            
            // Send message to opener
            if (window.opener) {
                window.opener.postMessage({ type: 'nylas-oauth-success', account: { email: '${account.email}' } }, '*');
            }

            // Google's COOP policy blocks postMessage communication sometimes
            // Instead, we'll just close the window and let the parent poll for updates
            setTimeout(() => {
              console.log('[Nylas Callback] Closing popup window in 1 second...');
              window.close();
              
              // If window.close() doesn't work (some browsers block it), redirect
              setTimeout(() => {
                console.log('[Nylas Callback] Window still open, redirecting to app...');
                window.location.href = '${appUrl}?calendar_connected=success&email=${encodeURIComponent(account.email)}';
              }, 1000);
            }, 1000);
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Error in nylas-callback:', error);
    
    // Get app URL for redirect
    const appUrl = returnUrl || 
                   Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || 
                   req.headers.get('origin') || 
                   'https://your-app-url.com';
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Connection Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'nylas-oauth-error',
                error: '${error.message || error}'
              }, '*');
              setTimeout(() => window.close(), 2000);
            } else {
              // Redirect back to app with error
              setTimeout(() => {
                window.location.href = '${appUrl}?calendar_connected=error&message=${encodeURIComponent(error.message || error)}';
              }, 2000);
            }
          </script>
          <div style="font-family: system-ui; padding: 2rem; text-align: center;">
            <h1 style="color: #ef4444;">✗ Connection Failed</h1>
            <p>Error: ${error.message || error}</p>
            <p>Redirecting back to app...</p>
          </div>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
