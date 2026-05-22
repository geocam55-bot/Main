import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync calendar events from Nylas to Supabase
 * This is mainly for initial sync or manual refresh
 * Webhooks handle real-time updates automatically
 */

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

    console.log('📅 Calendar sync request for account:', accountId);

    // Get the email account (which also stores calendar access)
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    console.log('📅 Account query result:', { 
      account: account?.email, 
      accountError,
      requestedAccountId: accountId,
      userId: user.id 
    });

    if (accountError || !account) {
      console.error('❌ Email account not found:', { accountError, accountId, userId: user.id });
      throw new Error(`Email account not found. Account ID: ${accountId}, Error: ${accountError?.message || 'unknown'}`);
    }

    // Nylas Hosted Auth only needs grant_id, not access_token
    if (!account.nylas_grant_id) {
      throw new Error('Account not connected via Nylas');
    }

    console.log('📅 Syncing calendar for:', account.email, 'grant_id:', account.nylas_grant_id);

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    if (!NYLAS_API_KEY) {
      throw new Error('NYLAS_API_KEY not configured');
    }

    // Get user's organization_id from profiles table
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ User profile or organization not found:', profileError);
      throw new Error('User organization not found. Please ensure user has an organization.');
    }

    console.log('🏢 User organization ID:', userProfile.organization_id);

    // Fetch calendars first
    const calendarsResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/calendars`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
        },
      }
    );

    if (!calendarsResponse.ok) {
      const errorText = await calendarsResponse.text();
      console.error('Nylas calendars fetch error:', errorText);
      throw new Error(`Failed to fetch calendars: ${errorText}`);
    }

    const calendarsData = await calendarsResponse.json();
    const calendars = calendarsData.data || [];

    console.log(`📋 Found ${calendars.length} calendars`);

    // Fetch events from all calendars (last 30 days + next 90 days)
    const startTime = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // 30 days ago
    const endTime = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days from now

    let syncedCount = 0;

    for (const calendar of calendars) {
      // Skip read-only or non-primary calendars if desired
      // For now, sync from primary calendar only
      if (!calendar.is_primary) continue;

      try {
        const eventsResponse = await fetch(
          `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/events?calendar_id=${calendar.id}&start=${startTime}&end=${endTime}&limit=100`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${NYLAS_API_KEY}`,
            },
          }
        );

        if (!eventsResponse.ok) {
          console.error(`Failed to fetch events for calendar ${calendar.id}`);
          continue;
        }

        const eventsData = await eventsResponse.json();
        const events = eventsData.data || [];

        console.log(`📅 Calendar ${calendar.name}: ${events.length} events`);

        // Store events in the database
        for (const event of events) {
          try {
            // Check if this calendar event was already synced by looking up KV mapping
            const calEventKey = `cal_event:${account.nylas_grant_id}:${event.id}`;
            const { data: existingMapping } = await supabaseClient
              .from('kv_store_8405be07')
              .select('value')
              .eq('key', calEventKey)
              .single();

            // Handle all-day events vs timed events
            let startTime, endTime;
            if (event.when.object === 'date') {
              // All-day event
              startTime = new Date(event.when.date).toISOString();
              endTime = new Date(event.when.date).toISOString();
            } else {
              // Timed event
              startTime = new Date(event.when.start_time * 1000).toISOString();
              endTime = new Date(event.when.end_time * 1000).toISOString();
            }

            // Only use columns that exist on the appointments table
            const appointmentData = {
              organization_id: userProfile.organization_id,
              owner_id: user.id,
              title: event.title || '(No Title)',
              description: event.description || null,
              location: event.location || null,
              start_time: startTime,
              end_time: endTime,
            };

            if (existingMapping?.value) {
              // Update existing appointment
              const existingId = JSON.parse(existingMapping.value);
              const { error: updateError } = await supabaseClient
                .from('appointments')
                .update(appointmentData)
                .eq('id', existingId);
              
              if (updateError) {
                console.error('❌ Failed to update appointment:', event.id, updateError);
              }
            } else {
              // Insert new appointment
              const { data: insertResult, error: insertError } = await supabaseClient
                .from('appointments')
                .insert(appointmentData)
                .select('id')
                .single();
              
              if (insertError) {
                console.error('❌ Failed to insert appointment:', {
                  eventId: event.id,
                  title: event.title,
                  error: insertError,
                  appointmentData
                });
              } else {
                // Store mapping in KV so we can dedupe on next sync
                await supabaseClient
                  .from('kv_store_8405be07')
                  .upsert({
                    key: calEventKey,
                    value: JSON.stringify(insertResult.id),
                  });
                console.log('✅ Successfully inserted appointment:', event.title);
                syncedCount++;
              }
            }

          } catch (error) {
            console.error('❌ Exception storing event:', event.id, error);
          }
        }

      } catch (error) {
        console.error(`Error syncing calendar ${calendar.id}:`, error);
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
        syncedCount: syncedCount,
        calendarsCount: calendars.length,
        lastSync: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in nylas-sync-calendar:', error);
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