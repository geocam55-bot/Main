import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

export const azureOAuthInit = (app: Hono) => {
  // Initiate Microsoft/Outlook OAuth flow
  app.post('/make-server-8405be07/microsoft-oauth-init', async (c) => {
    try {
      // Use dual-header auth pattern: X-User-Token preferred, Authorization fallback
      const token = extractUserToken(c);
      if (!token) {
        return c.json({ error: 'Authorization required. Send X-User-Token or Authorization header.' }, 401);
      }

      // Verify user is authenticated
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return c.json({ 
          error: 'User authentication failed in server/azure-oauth-init: ' + (userError?.message || 'No user found for token')
        }, 401);
      }

      let AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      let AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

      // Fallback: load synchronized credentials from DB KV store
      if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) {
        try {
          const config = await kv.get('secrets:microsoft');
          if (config) {
            AZURE_CLIENT_ID = AZURE_CLIENT_ID || config.clientId;
            AZURE_REDIRECT_URI = AZURE_REDIRECT_URI || config.redirectUri;
            console.log('[Fallback Engine] Loaded Azure credentials from DB KV successfully:', { AZURE_CLIENT_ID, AZURE_REDIRECT_URI });
          }
        } catch (e: any) {
          console.error('[Fallback Engine] Error loading Azure fallback:', e?.message || e);
        }
      }

      if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) {
        return c.json({ 
          error: 'Azure OAuth not configured. Set AZURE_CLIENT_ID and AZURE_REDIRECT_URI in Supabase secrets.' 
        }, 500);
      }

      // Generate state parameter for security
      const state = crypto.randomUUID();

      // Store state in KV with user ID (matches Google pattern)
      await kv.set(`oauth_state:${state}`, {
        userId: user.id,
        provider: 'microsoft',
        timestamp: new Date().toISOString()
      }); // Note: KV store does not support TTL/expiresIn; clean up stale entries manually

      const scopes = [
        'offline_access',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'User.Read',
        'Calendars.Read',
        'Calendars.ReadWrite',
      ].join(' ');

      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', AZURE_REDIRECT_URI);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('prompt', 'consent');

      return c.json({
        success: true,
        authUrl: authUrl.toString(),
        pollId: state,
      });

    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message,
      }, 500);
    }
  });

  // Health check for Azure OAuth
  app.get('/make-server-8405be07/azure-health', async (c) => {
    let clientId = Deno.env.get('AZURE_CLIENT_ID') || '';
    let clientSecret = Deno.env.get('AZURE_CLIENT_SECRET') || '';
    let redirectUri = Deno.env.get('AZURE_REDIRECT_URI') || '';
    let isFallbackUsed = false;
    
    if (!clientId || !clientSecret || !redirectUri) {
      try {
        const config = await kv.get('secrets:microsoft');
        if (config) {
          clientId = clientId || config.clientId || '';
          clientSecret = clientSecret || config.clientSecret || '';
          redirectUri = redirectUri || config.redirectUri || '';
          isFallbackUsed = true;
        }
      } catch (e) {}
    }
    
    const configured = !!(clientId && clientSecret && redirectUri);
    
    return c.json({
      status: 'ok',
      configured,
      isFallbackUsed,
      diagnostics: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
      },
      timestamp: new Date().toISOString()
    });
  });
};