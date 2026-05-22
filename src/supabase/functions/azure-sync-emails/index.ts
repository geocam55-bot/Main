import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

// Helper to refresh Azure token if expired
async function refreshAzureToken(refreshToken: string): Promise<any> {
  const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
  const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error('Azure credentials not configured');
  }

  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to refresh Azure token');
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Dual-header auth: prefer X-User-Token, fall back to Authorization
    const userToken = req.headers.get('X-User-Token');
    const authHeader = req.headers.get('Authorization');
    const token = userToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!token) {
      throw new Error('No authorization header or X-User-Token provided');
    }

    // Use service role key to verify user token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[azure-sync-emails] User auth failed:', userError?.message, 'token source:', userToken ? 'X-User-Token' : 'Authorization');
      throw new Error('Invalid user token: ' + (userError?.message || 'No user found'));
    }

    const body = await req.json();
    const { accountId, limit = 50 } = body;

    if (!accountId) {
      throw new Error('Missing accountId');
    }

    // Get account
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Email account not found');
    }

    if (account.provider !== 'outlook') {
      throw new Error('This function only works with Outlook accounts');
    }

    // Check if token is expired
    let accessToken = account.azure_access_token;
    const expiresAt = new Date(account.azure_token_expires_at);
    
    if (expiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const newTokens = await refreshAzureToken(account.azure_refresh_token);
      accessToken = newTokens.access_token;

      // Update tokens in database
      await supabaseClient
        .from('email_accounts')
        .update({
          azure_access_token: newTokens.access_token,
          azure_refresh_token: newTokens.refresh_token || account.azure_refresh_token,
          azure_token_expires_at: new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString(),
        })
        .eq('id', accountId);
    }

    // Fetch emails from Microsoft Graph API
    const graphResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$orderby=receivedDateTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      throw new Error(`Failed to fetch emails from Microsoft Graph: ${errorText}`);
    }

    const graphData = await graphResponse.json();
    const messages = graphData.value || [];

    console.log(`Fetched ${messages.length} emails from Microsoft Graph`);

    // Get user's organization_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error('Could not determine organization for email');
    }

    // Transform and store emails
    let syncedCount = 0;
    for (const message of messages) {
      const emailData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        organization_id: profile.organization_id,
        account_id: accountId,
        message_id: message.id,
        from_email: message.from?.emailAddress?.address || '',
        to_email: message.toRecipients?.[0]?.emailAddress?.address || '',
        cc_email: message.ccRecipients?.map((r: any) => r.emailAddress?.address).join(', ') || null,
        subject: message.subject || '(No Subject)',
        body: message.body?.content || '',
        folder: message.parentFolderId?.includes('SentItems') ? 'sent' : 'inbox',
        is_read: message.isRead || false,
        is_starred: message.flag?.flagStatus === 'flagged',
        received_at: message.receivedDateTime,
      };

      // Check if email already exists
      const { data: existing } = await supabaseClient
        .from('emails')
        .select('id')
        .eq('message_id', message.id)
        .eq('account_id', accountId)
        .single();

      if (!existing) {
        const { error: insertError } = await supabaseClient
          .from('emails')
          .insert(emailData);

        if (insertError) {
          console.error('Failed to insert email:', insertError);
        } else {
          syncedCount++;
        }
      }
    }

    // Update last sync time
    await supabaseClient
      .from('email_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({
        success: true,
        syncedCount,
        message: `Synced ${syncedCount} new emails`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in azure-sync-emails:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});