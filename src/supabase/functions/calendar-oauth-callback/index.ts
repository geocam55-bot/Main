import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Parse URL parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://pro-spaces.vercel.app/appointments?error=${encodeURIComponent(error)}`,
        },
      });
    }

    if (!code || !state) {
      throw new Error('Missing authorization code or state');
    }

    // Decode state to get user info
    const stateData = JSON.parse(atob(state));
    const { userId, email } = stateData;

    if (!userId || !email) {
      throw new Error('Invalid state parameter');
    }

    // Determine provider from URL or state
    const provider = url.searchParams.get('provider') || 
                     (email.includes('@gmail.com') || email.includes('@googlemail.com') ? 'google' : 'outlook');

    // Get OAuth credentials
    const clientId = provider === 'google'
      ? Deno.env.get('GOOGLE_CLIENT_ID')
      : Deno.env.get('MICROSOFT_CLIENT_ID');

    const clientSecret = provider === 'google'
      ? Deno.env.get('GOOGLE_CLIENT_SECRET')
      : Deno.env.get('MICROSOFT_CLIENT_SECRET');

    const redirectUri = Deno.env.get('CALENDAR_REDIRECT_URI') || 'https://pro-spaces.vercel.app/auth/callback';

    if (!clientId || !clientSecret) {
      throw new Error(`${provider} OAuth credentials not configured`);
    }

    // Exchange authorization code for access token
    let tokenResponse: any;

    if (provider === 'google') {
      // Google token exchange
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const tokenBody = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Google token exchange failed:', errorData);
        throw new Error('Failed to exchange authorization code for tokens');
      }

      tokenResponse = await response.json();

    } else {
      // Microsoft token exchange
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const tokenBody = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Microsoft token exchange failed:', errorData);
        throw new Error('Failed to exchange authorization code for tokens');
      }

      tokenResponse = await response.json();
    }

    const { access_token, refresh_token, expires_in } = tokenResponse;

    if (!access_token) {
      throw new Error('No access token received');
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Store tokens in oauth_secrets table
    const { data: oauthSecret, error: oauthError } = await supabaseAdmin
      .from('oauth_secrets')
      .insert({
        user_id: userId,
        organization_id: profile.organization_id,
        provider: provider,
        email: email,
        access_token: access_token,
        refresh_token: refresh_token || null,
        token_expiry: tokenExpiry,
        scope: provider === 'google' 
          ? 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
          : 'Calendars.ReadWrite offline_access User.Read',
      })
      .select()
      .single();

    if (oauthError) {
      console.error('Failed to store OAuth tokens:', oauthError);
      throw new Error('Failed to store calendar credentials');
    }

    // Create calendar account record
    const { data: calendarAccount, error: accountError } = await supabaseAdmin
      .from('calendar_accounts')
      .insert({
        user_id: userId,
        organization_id: profile.organization_id,
        provider: provider,
        email: email,
        access_token: access_token,
        refresh_token: refresh_token || null,
        token_expiry: tokenExpiry,
        sync_enabled: true,
        connected: true,
        timezone: 'UTC', // Can be updated later based on calendar settings
      })
      .select()
      .single();

    if (accountError) {
      console.error('Failed to create calendar account:', accountError);
      // Don't throw - we have the tokens stored in oauth_secrets
    }

    console.log('[Calendar OAuth] Successfully connected:', {
      provider,
      email,
      accountId: calendarAccount?.id,
    });

    // Redirect back to app with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://pro-spaces.vercel.app/appointments?calendar_connected=true&provider=${provider}`,
      },
    });

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    
    // Redirect back to app with error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://pro-spaces.vercel.app/appointments?error=${encodeURIComponent(error.message)}`,
      },
    });
  }
});
