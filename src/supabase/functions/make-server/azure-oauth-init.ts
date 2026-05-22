import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const azureOAuthInit = (app: Hono) => {
  app.post('/azure-oauth-init', async (c) => {
    try {
      // Use dual-header auth pattern: X-User-Token preferred, Authorization fallback
      const userToken = c.req.header('X-User-Token');
      const authHeader = c.req.header('Authorization');
      
      // Extract the actual user JWT
      const token = userToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
      
      if (!token) {
        console.error('[make-server/azure-oauth-init] No auth token found. Headers present:', {
          hasAuthorization: !!authHeader,
          hasXUserToken: !!userToken,
        });
        return c.json({ error: 'No authorization header or X-User-Token provided' }, 401);
      }

      // Verify user with service role key (not anon key)
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser(token);

      if (userError || !user) {
        console.error('[make-server/azure-oauth-init] User auth failed:', {
          error: userError?.message,
          tokenSource: userToken ? 'X-User-Token' : 'Authorization',
          tokenPrefix: token?.substring(0, 20) + '...',
        });
        return c.json({ error: 'Invalid user token: ' + (userError?.message || 'No user found. Ensure X-User-Token contains a valid session JWT.') }, 401);
      }

      const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

      console.log('Azure OAuth Init Debug:', {
        hasClientId: !!AZURE_CLIENT_ID,
        hasRedirectUri: !!AZURE_REDIRECT_URI,
        redirectUriValue: AZURE_REDIRECT_URI // Safe to log URI, helpful for debugging typos
      });

      if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) {
        console.error('Missing configuration:', {
          AZURE_CLIENT_ID: !!AZURE_CLIENT_ID,
          AZURE_REDIRECT_URI: !!AZURE_REDIRECT_URI
        });
        return c.json({ error: 'Azure OAuth not configured. Set AZURE_CLIENT_ID and AZURE_REDIRECT_URI in Supabase secrets.' }, 500);
      }

      const state = crypto.randomUUID();
      
      // Store state in Supabase for verification on callback
      const { error: stateError } = await supabaseClient.from('oauth_states').insert({
        state: state,
        user_id: user.id,
        provider: 'azure',
        created_at: new Date().toISOString(),
      });

      if (stateError) {
        console.error('Error storing state:', stateError);
      }

      const scopes = [
        'offline_access',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'User.Read',
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
      });

    } catch (error) {
      console.error('Error in azure-oauth-init:', error);
      return c.json({
        success: false,
        error: error.message,
      }, 400);
    }
  });
};