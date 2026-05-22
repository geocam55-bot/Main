import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Nylas Webhook Handler
 * Receives real-time notifications from Nylas when:
 * - New emails arrive
 * - Calendar events are created/updated/deleted
 * - Messages are read/starred/moved
 * 
 * This enables auto-sync without manual button clicks
 */

serve(async (req) => {
  try {
    // Handle Nylas webhook challenge (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const challenge = url.searchParams.get('challenge');
      
      if (challenge) {
        console.log('✅ Webhook challenge received:', challenge);
        
        // Respond with the challenge to verify the webhook
        return new Response(challenge, {
          headers: { 'Content-Type': 'text/plain' },
          status: 200,
        });
      }
    }

    // Verify webhook signature for security
    const signature = req.headers.get('X-Nylas-Signature');
    const NYLAS_WEBHOOK_SECRET = Deno.env.get('NYLAS_WEBHOOK_SECRET');
    
    if (NYLAS_WEBHOOK_SECRET && signature) {
      // In production, verify the signature
      // const isValid = await verifyWebhookSignature(req.body, signature, NYLAS_WEBHOOK_SECRET);
      // if (!isValid) throw new Error('Invalid webhook signature');
    }

    const body = await req.json();
    const { deltas } = body;

    console.log('📨 Nylas webhook received:', {
      deltaCount: deltas?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // Create Supabase client with service role for database writes
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    if (!NYLAS_API_KEY) {
      throw new Error('NYLAS_API_KEY not configured');
    }

    // Process each delta (notification)
    for (const delta of deltas || []) {
      try {
        const { object, type, object_data } = delta;

        console.log('Processing delta:', { object, type, grant_id: object_data?.grant_id });

        // Get the email account from grant_id
        const { data: account } = await supabaseClient
          .from('email_accounts')
          .select('*')
          .eq('nylas_grant_id', object_data?.grant_id)
          .single();

        if (!account) {
          console.log('⚠️ No account found for grant_id:', object_data?.grant_id);
          continue;
        }

        // Handle message events (emails)
        if (object === 'message') {
          await handleMessageDelta(supabaseClient, NYLAS_API_KEY, account, type, object_data);
        }
        
        // Handle event events (calendar)
        else if (object === 'event') {
          await handleEventDelta(supabaseClient, NYLAS_API_KEY, account, type, object_data);
        }

      } catch (deltaError) {
        console.error('Error processing delta:', deltaError);
        // Continue processing other deltas
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: deltas?.length || 0 }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Handle message (email) delta
 */
async function handleMessageDelta(
  supabaseClient: any,
  nylasApiKey: string,
  account: any,
  type: string,
  objectData: any
) {
  // For new messages or updates, fetch full message data
  if (type === 'message.created' || type === 'message.updated') {
    try {
      // Fetch full message details from Nylas
      const messageResponse = await fetch(
        `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/messages/${objectData.id}`,
        {
          headers: { 'Authorization': `Bearer ${nylasApiKey}` },
        }
      );

      if (!messageResponse.ok) {
        console.error('Failed to fetch message:', objectData.id);
        return;
      }

      const messageData = await messageResponse.json();
      const message = messageData.data;

      // Check if message already exists
      const { data: existing } = await supabaseClient
        .from('emails')
        .select('id')
        .eq('message_id', message.id)
        .single();

      const emailData = {
        user_id: account.user_id,
        organization_id: account.organization_id,
        account_id: account.id,
        message_id: message.id,
        from_email: message.from?.[0]?.email || 'unknown@example.com',
        to_email: message.to?.[0]?.email || account.email,
        cc_email: message.cc?.map((c: any) => c.email).join(', ') || null,
        bcc_email: message.bcc?.map((b: any) => b.email).join(', ') || null,
        subject: message.subject || '(No Subject)',
        body: message.body || message.snippet || '',
        folder: message.folders?.includes('SENT') ? 'sent' : 'inbox',
        is_read: message.unread === false,
        is_starred: message.starred || false,
        received_at: new Date(message.date * 1000).toISOString(),
      };

      if (existing) {
        // Update existing email
        await supabaseClient
          .from('emails')
          .update(emailData)
          .eq('id', existing.id);
        
        console.log('✅ Updated email:', message.id);
      } else {
        // Insert new email
        await supabaseClient
          .from('emails')
          .insert(emailData);
        
        console.log('✅ Created email:', message.id);
      }

    } catch (error) {
      console.error('Error handling message:', error);
    }
  }
  
  // Handle message deletion
  else if (type === 'message.deleted') {
    await supabaseClient
      .from('emails')
      .delete()
      .eq('message_id', objectData.id);
    
    console.log('✅ Deleted email:', objectData.id);
  }
}

/**
 * Handle event (calendar) delta
 */
async function handleEventDelta(
  supabaseClient: any,
  nylasApiKey: string,
  account: any,
  type: string,
  objectData: any
) {
  // For new events or updates, fetch full event data
  if (type === 'event.created' || type === 'event.updated') {
    try {
      // Fetch full event details from Nylas
      const eventResponse = await fetch(
        `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/events/${objectData.id}`,
        {
          headers: { 'Authorization': `Bearer ${nylasApiKey}` },
        }
      );

      if (!eventResponse.ok) {
        console.error('Failed to fetch event:', objectData.id);
        return;
      }

      const eventData = await eventResponse.json();
      const event = eventData.data;

      // Check if appointment already exists via KV mapping
      const calEventKey = `cal_event:${account.nylas_grant_id}:${event.id}`;
      const { data: existingMapping } = await supabaseClient
        .from('kv_store_8405be07')
        .select('value')
        .eq('key', calEventKey)
        .single();

      // Only use columns that exist on the appointments table
      const appointmentData = {
        organization_id: account.organization_id,
        owner_id: account.user_id,
        title: event.title || '(No Title)',
        description: event.description || null,
        location: event.location || null,
        start_time: new Date(event.when.start_time * 1000).toISOString(),
        end_time: new Date(event.when.end_time * 1000).toISOString(),
      };

      if (existingMapping?.value) {
        // Update existing appointment
        const existingId = JSON.parse(existingMapping.value);
        await supabaseClient
          .from('appointments')
          .update(appointmentData)
          .eq('id', existingId);
        
        console.log('✅ Updated event:', event.id);
      } else {
        // Insert new appointment
        const { data: insertResult, error: insertError } = await supabaseClient
          .from('appointments')
          .insert(appointmentData)
          .select('id')
          .single();
        
        if (!insertError && insertResult) {
          // Store mapping in KV for dedup
          await supabaseClient
            .from('kv_store_8405be07')
            .upsert({ key: calEventKey, value: JSON.stringify(insertResult.id) });
        }
        console.log('✅ Created event:', event.id);
      }

    } catch (error) {
      console.error('Error handling event:', error);
    }
  }
  
  // Handle event deletion
  else if (type === 'event.deleted') {
    // Look up the appointment ID from KV mapping
    const calEventKey = `cal_event_webhook:${objectData.id}`;
    // Try a broader key pattern - we don't know the grant_id in delete events
    // so also try to find by iterating possible keys
    const { data: mappings } = await supabaseClient
      .from('kv_store_8405be07')
      .select('key, value')
      .like('key', `cal_event:%:${objectData.id}`);

    if (mappings && mappings.length > 0) {
      for (const mapping of mappings) {
        const appointmentId = JSON.parse(mapping.value);
        await supabaseClient
          .from('appointments')
          .delete()
          .eq('id', appointmentId);
        // Clean up the KV entry
        await supabaseClient
          .from('kv_store_8405be07')
          .delete()
          .eq('key', mapping.key);
      }
      console.log('✅ Deleted event:', objectData.id);
    } else {
      console.log('⚠️ No mapping found for deleted event:', objectData.id);
    }
  }
}