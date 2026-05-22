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
      console.error('[azure-send-email] User auth failed:', userError?.message, 'token source:', userToken ? 'X-User-Token' : 'Authorization');
      throw new Error('Invalid user token: ' + (userError?.message || 'No user found'));
    }

    const body = await req.json();
    const { accountId, to, subject, body: emailBody, cc, bcc } = body;

    if (!accountId || !to || !subject || !emailBody) {
      throw new Error('Missing required fields: accountId, to, subject, body');
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

    // Prepare email message for Microsoft Graph
    const message = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: emailBody,
      },
      toRecipients: Array.isArray(to) 
        ? to.map((email: string) => ({ emailAddress: { address: email } }))
        : [{ emailAddress: { address: to } }],
    };

    // Add optional CC recipients
    if (cc) {
      message.ccRecipients = Array.isArray(cc)
        ? cc.map((email: string) => ({ emailAddress: { address: email } }))
        : [{ emailAddress: { address: cc } }];
    }

    // Add optional BCC recipients
    if (bcc) {
      message.bccRecipients = Array.isArray(bcc)
        ? bcc.map((email: string) => ({ emailAddress: { address: email } }))
        : [{ emailAddress: { address: bcc } }];
    }

    console.log('Sending email via Microsoft Graph:', { to, subject });

    // Send email using Microsoft Graph API
    const graphResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API send error:', errorText);
      throw new Error(`Failed to send email via Microsoft Graph: ${errorText}`);
    }

    console.log('Email sent successfully via Microsoft Graph');

    // Get organization_id from the user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.organization_id) {
      console.error('Failed to get user profile for organization_id:', profileError);
      throw new Error('Could not determine organization for email');
    }

    // Store the sent email in the database
    const { error: insertError } = await supabaseClient.from('emails').insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      account_id: accountId,
      message_id: crypto.randomUUID(), // Graph doesn't return message ID for sent emails
      from_email: account.email,
      to_email: Array.isArray(to) ? to[0] : to,
      cc_email: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null,
      bcc_email: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : null,
      subject: subject,
      body: emailBody,
      folder: 'sent',
      is_read: true,
      is_starred: false,
      received_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to store sent email:', insertError);
      // Don't fail the whole request if storage fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in azure-send-email:', error);
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