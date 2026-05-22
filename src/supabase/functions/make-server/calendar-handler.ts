import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getGoogleAccessToken } from './google-oauth.ts';
import { getMicrosoftAccessToken } from './microsoft-oauth.ts';

const calendarRoutes = new Hono();

// Fetch events from Google Calendar
async function fetchGoogleCalendarEvents(accessToken: string, timeMin?: string, timeMax?: string) {
  const params = new URLSearchParams({
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Google Calendar events: ${error}`);
  }

  const data = await response.json();
  const events = data.items || [];

  return events.map((event: any) => ({
    id: event.id,
    title: event.summary,
    description: event.description || '',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || '',
    attendees: event.attendees?.map((a: any) => a.email) || [],
    status: event.status,
    link: event.htmlLink,
  }));
}

// Fetch events from Microsoft Calendar
async function fetchMicrosoftCalendarEvents(accessToken: string, timeMin?: string, timeMax?: string) {
  const params = new URLSearchParams({
    $filter: `start/dateTime ge '${timeMin || new Date().toISOString()}' and start/dateTime le '${timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}'`,
    $orderby: 'start/dateTime',
    $top: '100',
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Microsoft Calendar events: ${error}`);
  }

  const data = await response.json();
  const events = data.value || [];

  return events.map((event: any) => ({
    id: event.id,
    title: event.subject,
    description: event.bodyPreview || event.body?.content || '',
    start: event.start?.dateTime,
    end: event.end?.dateTime,
    location: event.location?.displayName || '',
    attendees: event.attendees?.map((a: any) => a.emailAddress?.address) || [],
    status: event.isCancelled ? 'cancelled' : 'confirmed',
    link: event.webLink,
  }));
}

// Sync calendar events
calendarRoutes.post('/make-server-8405be07/sync-calendar', async (c) => {
  try {
    const { accountId, email, provider, userId, timeMin, timeMax } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Missing email parameter' }, 400);
    }

    console.log(`[Calendar Sync] Syncing calendar for ${email} (${provider})`);

    let accessToken: string;
    let events: any[];

    if (provider === 'gmail' || provider === 'google') {
      accessToken = await getGoogleAccessToken(email, userId);
      events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
    } else if (provider === 'outlook' || provider === 'microsoft') {
      accessToken = await getMicrosoftAccessToken(email, userId);
      events = await fetchMicrosoftCalendarEvents(accessToken, timeMin, timeMax);
    } else {
      return c.json({ error: 'Unsupported provider. Use gmail or outlook.' }, 400);
    }

    console.log(`[Calendar Sync] Fetched ${events.length} events`);

    // Store events in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get account ID if not provided
    let dbAccountId = accountId;
    if (!dbAccountId) {
      const { data: account } = await supabase
        .from('email_accounts')
        .select('id, user_id')
        .eq('email', email)
        .single();
      
      dbAccountId = account?.id;
    }

    if (dbAccountId) {
      // Get user_id from account
      const { data: account } = await supabase
        .from('email_accounts')
        .select('user_id')
        .eq('id', dbAccountId)
        .single();

      const userIdFromAccount = account?.user_id;

      // Insert events into appointments table
      const eventRecords = events.map((event) => ({
        user_id: userIdFromAccount,
        contact_id: null, // Will need to be linked manually if needed
        title: event.title,
        description: event.description,
        start_time: event.start,
        end_time: event.end,
        location: event.location,
        status: event.status || 'scheduled',
        external_event_id: event.id,
        external_calendar_link: event.link,
      }));

      const { data, error } = await supabase
        .from('appointments')
        .upsert(eventRecords, { 
          onConflict: 'external_event_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('[Calendar Sync] Failed to store events:', error);
      } else {
        console.log('[Calendar Sync] Successfully stored events');
      }
    }

    return c.json({
      success: true,
      synced: events.length,
      provider: provider,
      email: email,
    });

  } catch (error: any) {
    console.error('[Calendar Sync] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to sync calendar' 
    }, 500);
  }
});

// Create event in Google Calendar
async function createGoogleCalendarEvent(accessToken: string, eventData: any) {
  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: {
      dateTime: eventData.start,
      timeZone: eventData.timeZone || 'UTC',
    },
    end: {
      dateTime: eventData.end,
      timeZone: eventData.timeZone || 'UTC',
    },
    attendees: eventData.attendees?.map((email: string) => ({ email })) || [],
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${error}`);
  }

  return await response.json();
}

// Create event in Microsoft Calendar
async function createMicrosoftCalendarEvent(accessToken: string, eventData: any) {
  const event = {
    subject: eventData.title,
    body: {
      contentType: 'HTML',
      content: eventData.description || '',
    },
    start: {
      dateTime: eventData.start,
      timeZone: eventData.timeZone || 'UTC',
    },
    end: {
      dateTime: eventData.end,
      timeZone: eventData.timeZone || 'UTC',
    },
    location: {
      displayName: eventData.location || '',
    },
    attendees: eventData.attendees?.map((email: string) => ({
      emailAddress: {
        address: email,
      },
      type: 'required',
    })) || [],
  };

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendar/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Microsoft Calendar event: ${error}`);
  }

  return await response.json();
}

// Create calendar event
calendarRoutes.post('/make-server-8405be07/create-calendar-event', async (c) => {
  try {
    const { email, provider, userId, title, description, start, end, location, attendees, timeZone } = await c.req.json();

    if (!email || !title || !start || !end) {
      return c.json({ error: 'Missing required fields: email, title, start, end' }, 400);
    }

    console.log(`[Calendar Create] Creating event for ${email} via ${provider}`);

    let accessToken: string;
    let result: any;

    const eventData = { title, description, start, end, location, attendees, timeZone };

    if (provider === 'gmail' || provider === 'google') {
      accessToken = await getGoogleAccessToken(email, userId);
      result = await createGoogleCalendarEvent(accessToken, eventData);
    } else if (provider === 'outlook' || provider === 'microsoft') {
      accessToken = await getMicrosoftAccessToken(email, userId);
      result = await createMicrosoftCalendarEvent(accessToken, eventData);
    } else {
      return c.json({ error: 'Unsupported provider. Use gmail or outlook.' }, 400);
    }

    console.log('[Calendar Create] Event created successfully');

    return c.json({
      success: true,
      provider: provider,
      eventId: result.id,
      link: result.htmlLink || result.webLink,
    });

  } catch (error: any) {
    console.error('[Calendar Create] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to create calendar event' 
    }, 500);
  }
});

export { calendarRoutes };
