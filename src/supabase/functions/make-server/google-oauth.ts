import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const googleRoutes = new Hono();

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || Deno.env.get('APP_URL') + '/oauth-callback';

// OAuth Scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Health check endpoint
googleRoutes.get('/make-server-8405be07/google-health', (c) => {
  const hasCredentials = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  return c.json({ 
    status: hasCredentials ? 'ok' : 'missing_credentials',
    service: 'google-oauth',
    timestamp: new Date().toISOString(),
    configured: hasCredentials
  });
});

// Initialize OAuth flow
googleRoutes.post('/make-server-8405be07/google-oauth-init', async (c) => {
  try {
    const { scopes, includeCalendar, userId } = await c.req.json();

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return c.json({ 
        error: 'Server configuration error: Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' 
      }, 500);
    }

    // Combine Gmail and Calendar scopes if requested
    let requestedScopes = scopes || GMAIL_SCOPES;
    if (includeCalendar) {
      requestedScopes = [...new Set([...requestedScopes, ...CALENDAR_SCOPES])];
    }

    // Create state parameter with user context
    const state = JSON.stringify({
      provider: 'google',
      userId: userId,
      timestamp: Date.now(),
      includeCalendar: includeCalendar || false
    });

    // Encode state for URL
    const encodedState = encodeURIComponent(state);

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', requestedScopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    authUrl.searchParams.set('state', encodedState);

    console.log('[Google OAuth] Initiated flow for user:', userId);

    return c.json({
      success: true,
      authUrl: authUrl.toString(),
      provider: 'google',
      state: encodedState
    });

  } catch (error: any) {
    console.error('[Google OAuth Init] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to initialize Google OAuth' 
    }, 500);
  }
});

// Handle OAuth callback and exchange code for tokens
googleRoutes.post('/make-server-8405be07/google-oauth-exchange', async (c) => {
  try {
    const { code, state } = await c.req.json();

    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return c.json({ error: 'Missing Google OAuth credentials' }, 500);
    }

    // Parse state to get user context
    let stateData: any = {};
    try {
      stateData = JSON.parse(decodeURIComponent(state));
    } catch (e) {
      console.error('[Google OAuth] Failed to parse state:', e);
    }

    console.log('[Google OAuth] Exchanging code for tokens...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Google OAuth] Token exchange failed:', errorData);
      return c.json({ 
        error: 'Failed to exchange authorization code',
        details: errorData 
      }, 400);
    }

    const tokens = await tokenResponse.json();

    console.log('[Google OAuth] Tokens received successfully');

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Google OAuth] Failed to fetch user info');
      return c.json({ error: 'Failed to fetch user information' }, 400);
    }

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.email;

    console.log('[Google OAuth] User email:', userEmail);

    // Calculate token expiration
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    // Store tokens in KV store
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      token_type: tokens.token_type,
      provider: 'google',
      email: userEmail,
      updated_at: new Date().toISOString()
    };

    // Store with userId if available
    const userId = stateData.userId;
    if (userId) {
      await kv.set(`oauth:google:user:${userId}:${userEmail}`, tokenData);
      await kv.set(`oauth:google:email:${userEmail}`, tokenData);
    } else {
      await kv.set(`oauth:google:email:${userEmail}`, tokenData);
    }

    console.log('[Google OAuth] Tokens stored successfully');

    // Store account in Supabase database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get or create user profile
    let profileId = userId;
    if (!profileId && userEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      profileId = profile?.id;
    }

    if (profileId) {
      // Check if account already exists
      const { data: existingAccount } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('email', userEmail)
        .eq('user_id', profileId)
        .single();

      if (existingAccount) {
        // Update existing account
        const { error: updateError } = await supabase
          .from('email_accounts')
          .update({
            provider: 'gmail',
            oauth_connected: true,
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAccount.id);

        if (updateError) {
          console.error('[Google OAuth] Failed to update account:', updateError);
        }
      } else {
        // Create new account
        const { error: insertError } = await supabase
          .from('email_accounts')
          .insert({
            user_id: profileId,
            email: userEmail,
            provider: 'gmail',
            oauth_connected: true,
            last_sync: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[Google OAuth] Failed to insert account:', insertError);
        }
      }
    }

    return c.json({
      success: true,
      account: {
        email: userEmail,
        provider: 'google',
        name: userInfo.name,
        picture: userInfo.picture
      },
      hasRefreshToken: !!tokens.refresh_token
    });

  } catch (error: any) {
    console.error('[Google OAuth Exchange] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to complete OAuth exchange' 
    }, 500);
  }
});

// Refresh access token
googleRoutes.post('/make-server-8405be07/google-refresh-token', async (c) => {
  try {
    const { email, userId } = await c.req.json();

    if (!email && !userId) {
      return c.json({ error: 'Missing email or userId' }, 400);
    }

    // Retrieve stored tokens
    let tokenData: any;
    if (userId && email) {
      tokenData = await kv.get(`oauth:google:user:${userId}:${email}`);
    }
    if (!tokenData && email) {
      tokenData = await kv.get(`oauth:google:email:${email}`);
    }

    if (!tokenData || !tokenData.refresh_token) {
      return c.json({ 
        error: 'No refresh token found. User needs to re-authenticate.' 
      }, 401);
    }

    console.log('[Google OAuth] Refreshing access token for:', email);

    // Request new access token
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text();
      console.error('[Google OAuth] Token refresh failed:', errorData);
      return c.json({ 
        error: 'Failed to refresh access token',
        details: errorData 
      }, 401);
    }

    const newTokens = await refreshResponse.json();

    // Update stored tokens
    const updatedTokenData = {
      ...tokenData,
      access_token: newTokens.access_token,
      expires_at: Date.now() + (newTokens.expires_in * 1000),
      updated_at: new Date().toISOString()
    };

    // Store updated tokens
    if (userId && email) {
      await kv.set(`oauth:google:user:${userId}:${email}`, updatedTokenData);
    }
    if (email) {
      await kv.set(`oauth:google:email:${email}`, updatedTokenData);
    }

    console.log('[Google OAuth] Access token refreshed successfully');

    return c.json({
      success: true,
      access_token: newTokens.access_token,
      expires_at: updatedTokenData.expires_at
    });

  } catch (error: any) {
    console.error('[Google OAuth Refresh] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to refresh token' 
    }, 500);
  }
});

// Get valid access token (refresh if needed)
export async function getGoogleAccessToken(email: string, userId?: string): Promise<string> {
  // Retrieve stored tokens
  let tokenData: any;
  if (userId && email) {
    tokenData = await kv.get(`oauth:google:user:${userId}:${email}`);
  }
  if (!tokenData && email) {
    tokenData = await kv.get(`oauth:google:email:${email}`);
  }

  if (!tokenData) {
    throw new Error('No OAuth tokens found for this account');
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const isExpired = tokenData.expires_at < (now + 5 * 60 * 1000);

  if (isExpired) {
    if (!tokenData.refresh_token) {
      throw new Error('Access token expired and no refresh token available');
    }

    console.log('[Google OAuth] Access token expired, refreshing...');

    // Refresh the token
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Google access token');
    }

    const newTokens = await refreshResponse.json();

    // Update stored tokens
    tokenData.access_token = newTokens.access_token;
    tokenData.expires_at = Date.now() + (newTokens.expires_in * 1000);
    tokenData.updated_at = new Date().toISOString();

    // Save updated tokens
    if (userId && email) {
      await kv.set(`oauth:google:user:${userId}:${email}`, tokenData);
    }
    if (email) {
      await kv.set(`oauth:google:email:${email}`, tokenData);
    }
  }

  return tokenData.access_token;
}

export { googleRoutes };
