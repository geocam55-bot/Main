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
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a Supabase client with the Auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get the request body
    const body = await req.json();
    const { accountId } = body;

    console.log('Sync email request for account:', accountId);

    // Get the email account
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Email account not found');
    }

    console.log('Retrieved account:', {
      id: account.id,
      email: account.email,
      provider: account.provider,
      hasNylasGrantId: !!account.nylas_grant_id,
      nylasGrantId: account.nylas_grant_id,
      hasNylasAccessToken: !!account.nylas_access_token,
    });

    let syncedCount = 0;

    // Sync via IMAP
    if (account.provider === 'imap') {
      // In a real implementation, you would:
      // 1. Connect to the IMAP server using the stored credentials
      // 2. Fetch emails from the inbox
      // 3. Store them in the database
      
      // For now, we'll return success with no emails synced
      // You would need to implement actual IMAP connection here
      
      syncedCount = 0;
      console.log('IMAP sync would happen here for', account.email);
    } 
    // Sync via Nylas OAuth (Hosted Auth uses grant_id only, no access_token needed)
    else if (account.nylas_grant_id) {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      
      if (!NYLAS_API_KEY) {
        throw new Error('NYLAS_API_KEY not configured');
      }

      console.log('Syncing via Nylas for account:', account.email, 'grant_id:', account.nylas_grant_id);

      // Fetch emails using Nylas API
      const nylasResponse = await fetch(
        `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/messages?limit=50`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${NYLAS_API_KEY}`,
          },
        }
      );

      if (!nylasResponse.ok) {
        const errorText = await nylasResponse.text();
        console.error('Nylas sync error:', errorText);
        throw new Error(`Failed to sync emails: ${errorText}`);
      }

      const nylasData = await nylasResponse.json();
      const messages = nylasData.data || [];

      // Get organization_id from the user's profile (fetch once, use for all emails)
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile?.organization_id) {
        console.error('Failed to get user profile for organization_id:', profileError);
        throw new Error('Could not determine organization for email sync');
      }

      console.log('Syncing emails for user:', user.id, 'organization:', profile.organization_id);

      // Store emails in the database
      for (const message of messages) {
        try {
          // Check if email already exists
          const { data: existing } = await supabaseClient
            .from('emails')
            .select('id')
            .eq('message_id', message.id)
            .single();

          if (!existing) {
            await supabaseClient.from('emails').insert({
              user_id: user.id,
              organization_id: profile.organization_id,
              account_id: accountId,
              message_id: message.id,
              from_email: message.from?.[0]?.email || 'unknown@example.com',
              to_email: message.to?.[0]?.email || account.email,
              cc_email: message.cc?.map(c => c.email).join(', ') || null,
              bcc_email: message.bcc?.map(b => b.email).join(', ') || null,
              subject: message.subject || '(No Subject)',
              body: message.body || message.snippet || '',
              folder: message.folders?.includes('SENT') ? 'sent' : 'inbox',
              is_read: message.unread === false,
              is_starred: message.starred || false,
              received_at: new Date(message.date * 1000).toISOString(),
            });

            syncedCount++;
          }
        } catch (error) {
          console.error('Failed to store email:', message.id, error);
        }
      }
    } else {
      throw new Error('Email account not properly configured');
    }

    // Update last sync time
    await supabaseClient
      .from('email_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({
        success: true,
        syncedCount: syncedCount,
        lastSync: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in nylas-sync-emails:', error);
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