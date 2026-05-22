import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  status?: string;
  etag?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accountId, direction = 'bidirectional' } = await req.json();

    if (!accountId) {
      throw new Error('Calendar account ID is required');
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Get calendar account
    const { data: account, error: accountError } = await supabaseClient
      .from('calendar_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Calendar account not found');
    }

    const { provider, access_token, organization_id, email } = account;

    if (!access_token) {
      throw new Error('Calendar not authenticated. Please reconnect.');
    }

    // Initialize sync result
    const result = {
      imported: 0,
      exported: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      errorMessages: [] as string[],
    };

    const startedAt = new Date().toISOString();

    // IMPORT: Calendar → CRM
    if (direction === 'import' || direction === 'bidirectional') {
      try {
        console.log(`[Sync] Importing from ${provider} calendar...`);
        
        let calendarEvents: CalendarEvent[] = [];

        if (provider === 'google') {
          // Fetch events from Google Calendar
          const calendarListUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
          const calendarListResponse = await fetch(calendarListUrl, {
            headers: { 'Authorization': `Bearer ${access_token}` }
          });

          if (!calendarListResponse.ok) {
            throw new Error('Failed to fetch Google calendar list');
          }

          const calendarList = await calendarListResponse.json();
          const primaryCalendar = calendarList.items?.find((cal: any) => cal.primary) || calendarList.items?.[0];

          if (!primaryCalendar) {
            throw new Error('No calendar found');
          }

          // Fetch events from primary calendar
          const now = new Date();
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryCalendar.id)}/events?` +
            `timeMin=${encodeURIComponent(oneMonthAgo)}&` +
            `timeMax=${encodeURIComponent(oneMonthAhead)}&` +
            `singleEvents=true&` +
            `orderBy=startTime`;

          const eventsResponse = await fetch(eventsUrl, {
            headers: { 'Authorization': `Bearer ${access_token}` }
          });

          if (!eventsResponse.ok) {
            throw new Error('Failed to fetch Google calendar events');
          }

          const eventsData = await eventsResponse.json();
          
          calendarEvents = (eventsData.items || [])
            .filter((event: any) => event.start?.dateTime) // Only events with specific times
            .map((event: any) => ({
              id: event.id,
              summary: event.summary || 'Untitled Event',
              description: event.description || '',
              start: {
                dateTime: event.start.dateTime,
                timeZone: event.start.timeZone || 'UTC',
              },
              end: {
                dateTime: event.end.dateTime,
                timeZone: event.end.timeZone || 'UTC',
              },
              location: event.location || '',
              status: event.status || 'confirmed',
              etag: event.etag,
            }));

        } else {
          // Fetch events from Outlook Calendar
          const now = new Date();
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const eventsUrl = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?` +
            `startDateTime=${encodeURIComponent(oneMonthAgo)}&` +
            `endDateTime=${encodeURIComponent(oneMonthAhead)}`;

          const eventsResponse = await fetch(eventsUrl, {
            headers: { 
              'Authorization': `Bearer ${access_token}`,
              'Prefer': 'outlook.timezone="UTC"'
            }
          });

          if (!eventsResponse.ok) {
            const errorText = await eventsResponse.text();
            console.error('Outlook API error:', errorText);
            throw new Error('Failed to fetch Outlook calendar events');
          }

          const eventsData = await eventsResponse.json();
          
          calendarEvents = (eventsData.value || []).map((event: any) => ({
            id: event.id,
            summary: event.subject || 'Untitled Event',
            description: event.bodyPreview || '',
            start: {
              dateTime: event.start.dateTime,
              timeZone: event.start.timeZone || 'UTC',
            },
            end: {
              dateTime: event.end.dateTime,
              timeZone: event.end.timeZone || 'UTC',
            },
            location: event.location?.displayName || '',
            status: event.isCancelled ? 'cancelled' : 'confirmed',
            etag: event['@odata.etag'],
          }));
        }

        console.log(`[Sync] Found ${calendarEvents.length} events in ${provider} calendar`);

        // Import events into CRM
        for (const event of calendarEvents) {
          try {
            // Check if mapping exists
            const { data: existingMapping } = await supabaseClient
              .from('calendar_event_mappings')
              .select('appointment_id')
              .eq('external_event_id', event.id)
              .eq('calendar_account_id', accountId)
              .single();

            if (existingMapping) {
              // Update existing appointment
              const { error: updateError } = await supabaseClient
                .from('appointments')
                .update({
                  title: event.summary,
                  description: event.description || '',
                  start_time: event.start.dateTime,
                  end_time: event.end.dateTime,
                  location: event.location || '',
                })
                .eq('id', existingMapping.appointment_id);

              if (updateError) {
                console.error('[Sync] Error updating appointment:', updateError);
                result.errors++;
              } else {
                result.updated++;
              }
            } else {
              // Create new appointment
              const { data: newAppointment, error: createError } = await supabaseClient
                .from('appointments')
                .insert({
                  title: event.summary,
                  description: event.description || '',
                  start_time: event.start.dateTime,
                  end_time: event.end.dateTime,
                  location: event.location || '',
                  owner_id: user.id,
                  organization_id: organization_id,
                })
                .select()
                .single();

              if (createError || !newAppointment) {
                console.error('[Sync] Error creating appointment:', createError);
                result.errors++;
              } else {
                // Create mapping
                await supabaseClient.from('calendar_event_mappings').insert({
                  appointment_id: newAppointment.id,
                  calendar_account_id: accountId,
                  organization_id: organization_id,
                  external_event_id: event.id,
                  external_event_etag: event.etag,
                  sync_status: 'synced',
                  sync_direction: 'calendar_to_crm',
                });

                result.imported++;
              }
            }
          } catch (error: any) {
            console.error('[Sync] Error processing event:', error);
            result.errors++;
            result.errorMessages.push(error.message);
          }
        }

      } catch (error: any) {
        console.error('[Sync] Import error:', error);
        result.errors++;
        result.errorMessages.push(`Import failed: ${error.message}`);
      }
    }

    // EXPORT: CRM → Calendar
    if (direction === 'export' || direction === 'bidirectional') {
      try {
        console.log('[Sync] Exporting appointments to calendar...');

        // Get all appointments that aren't mapped yet
        const { data: appointments, error: apptError } = await supabaseClient
          .from('appointments')
          .select(`
            *,
            calendar_event_mappings!left(
              id,
              appointment_id
            )
          `)
          .eq('organization_id', organization_id)
          .is('calendar_event_mappings.id', null);

        if (apptError) {
          throw new Error(`Failed to fetch appointments: ${apptError.message}`);
        }

        console.log(`[Sync] Found ${appointments?.length || 0} unmapped appointments`);

        for (const appointment of appointments || []) {
          try {
            let externalEventId: string | null = null;

            if (provider === 'google') {
              // Create event in Google Calendar
              const eventBody = {
                summary: appointment.title,
                description: appointment.description || '',
                start: {
                  dateTime: appointment.start_time,
                  timeZone: 'UTC',
                },
                end: {
                  dateTime: appointment.end_time,
                  timeZone: 'UTC',
                },
                location: appointment.location || '',
              };

              const createUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
              const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              });

              if (createResponse.ok) {
                const createdEvent = await createResponse.json();
                externalEventId = createdEvent.id;
              }

            } else {
              // Create event in Outlook Calendar
              const eventBody = {
                subject: appointment.title,
                body: {
                  contentType: 'Text',
                  content: appointment.description || '',
                },
                start: {
                  dateTime: appointment.start_time,
                  timeZone: 'UTC',
                },
                end: {
                  dateTime: appointment.end_time,
                  timeZone: 'UTC',
                },
                location: {
                  displayName: appointment.location || '',
                },
              };

              const createUrl = 'https://graph.microsoft.com/v1.0/me/calendar/events';
              const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              });

              if (createResponse.ok) {
                const createdEvent = await createResponse.json();
                externalEventId = createdEvent.id;
              }
            }

            if (externalEventId) {
              // Create mapping
              await supabaseClient.from('calendar_event_mappings').insert({
                appointment_id: appointment.id,
                calendar_account_id: accountId,
                organization_id: organization_id,
                external_event_id: externalEventId,
                sync_status: 'synced',
                sync_direction: 'crm_to_calendar',
              });

              result.exported++;
            } else {
              result.errors++;
            }

          } catch (error: any) {
            console.error('[Sync] Error exporting appointment:', error);
            result.errors++;
            result.errorMessages.push(error.message);
          }
        }

      } catch (error: any) {
        console.error('[Sync] Export error:', error);
        result.errors++;
        result.errorMessages.push(`Export failed: ${error.message}`);
      }
    }

    // Update last sync time
    await supabaseClient
      .from('calendar_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);

    // Log sync operation
    await supabaseClient.from('calendar_sync_log').insert({
      calendar_account_id: accountId,
      user_id: user.id,
      sync_type: 'manual',
      sync_direction: direction,
      events_imported: result.imported,
      events_exported: result.exported,
      events_updated: result.updated,
      events_deleted: result.deleted,
      errors: result.errors,
      status: result.errors > 0 ? 'partial' : 'success',
      error_details: result.errorMessages.length ? { messages: result.errorMessages } : null,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });

    console.log('[Sync] Completed:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
