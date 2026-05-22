import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create a calendar event via Nylas
 * Two-way sync: Creates in Nylas (which syncs to Gmail/Outlook) AND stores in Supabase
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
    const { accountId, title, description, location, startTime, endTime, attendees } = body;

    console.log('📅 Create event request:', { accountId, title, startTime });

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

    if (!account.nylas_grant_id || !account.nylas_access_token) {
      throw new Error('Account not connected via Nylas');
    }

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    if (!NYLAS_API_KEY) {
      throw new Error('NYLAS_API_KEY not configured');
    }

    // Get the primary calendar
    const calendarsResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/calendars`,
      {
        headers: { 'Authorization': `Bearer ${NYLAS_API_KEY}` },
      }
    );

    if (!calendarsResponse.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const calendarsData = await calendarsResponse.json();
    const primaryCalendar = calendarsData.data?.find((cal: any) => cal.is_primary);

    if (!primaryCalendar) {
      throw new Error('No primary calendar found');
    }

    // Create event in Nylas
    const eventPayload: any = {
      title: title,
      description: description || undefined,
      location: location || undefined,
      when: {
        start_time: Math.floor(new Date(startTime).getTime() / 1000),
        end_time: Math.floor(new Date(endTime).getTime() / 1000),
      },
    };

    // Add participants if provided
    if (attendees && attendees.length > 0) {
      eventPayload.participants = attendees.map((email: string) => ({
        email: email.trim(),
      }));
    }

    const createResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/events?calendar_id=${primaryCalendar.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Nylas create event error:', errorText);
      throw new Error(`Failed to create event: ${errorText}`);
    }

    const createData = await createResponse.json();
    const event = createData.data;

    console.log('✅ Event created in Nylas:', event.id);

    // Store in Supabase database (only use columns that exist on the table)
    const { data: appointment, error: insertError } = await supabaseClient
      .from('appointments')
      .insert({
        organization_id: user.user_metadata?.organizationId || account.organization_id,
        owner_id: user.id,
        title: title,
        description: description || null,
        location: location || null,
        start_time: startTime,
        end_time: endTime,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store appointment:', insertError);
      throw new Error(`Failed to store appointment: ${insertError.message}`);
    }

    // Store calendar event mapping in KV for dedup/deletion
    const calEventKey = `cal_event:${account.nylas_grant_id}:${event.id}`;
    await supabaseClient
      .from('kv_store_8405be07')
      .upsert({ key: calEventKey, value: JSON.stringify(appointment.id) });

    console.log('✅ Appointment stored in database:', appointment.id);

    return new Response(
      JSON.stringify({
        success: true,
        appointment: appointment,
        eventId: event.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in nylas-create-event:', error);
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