import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Check for OAuth errors
    if (error) {
      console.error('Azure OAuth error:', error, errorDescription);
      
      // Redirect to app with error
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('APP_URL') || 'http://localhost:5173'}?oauth_error=${encodeURIComponent(errorDescription || error)}`,
        },
      });
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify state and get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'azure')
      .single();

    if (stateError || !stateData) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Delete used state
    await supabaseAdmin.from('oauth_states').delete().eq('state', state);

    // Exchange code for tokens
    const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
    const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
    const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

    if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_REDIRECT_URI) {
      throw new Error('Azure OAuth credentials not configured');
    }

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: AZURE_CLIENT_ID,
          client_secret: AZURE_CLIENT_SECRET,
          code: code,
          redirect_uri: AZURE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received:', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in 
    });

    // Get user info to find email address
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Microsoft Graph');
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;

    if (!email) {
      throw new Error('Could not determine email address from Microsoft account');
    }

    console.log('User email:', email);

    // Get user's organization_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', stateData.user_id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('Failed to get user profile:', profileError);
      throw new Error('Could not determine organization for user');
    }

    // Store account in Supabase
    const accountData = {
      id: crypto.randomUUID(),
      user_id: stateData.user_id,
      organization_id: profile.organization_id,
      provider: 'outlook',
      email: email,
      connected: true,
      last_sync: null,
      azure_access_token: tokens.access_token,
      azure_refresh_token: tokens.refresh_token,
      azure_token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
    };

    const { error: insertError } = await supabaseAdmin
      .from('email_accounts')
      .insert(accountData);

    if (insertError) {
      console.error('Failed to store account:', insertError);
      throw new Error('Failed to store email account');
    }

    console.log('Account stored successfully:', accountData.id);

    // Redirect back to app with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('APP_URL') || 'http://localhost:5173'}?oauth_success=true&provider=outlook&email=${encodeURIComponent(email)}`,
      },
    });

  } catch (error) {
    console.error('Error in azure-oauth-callback:', error);
    
    // Redirect to app with error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${Deno.env.get('APP_URL') || 'http://localhost:5173'}?oauth_error=${encodeURIComponent(error.message)}`,
      },
    });
  }
});
