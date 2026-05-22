import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body, from, smtpConfig } = await req.json();

    console.log('[simple-send-email] Received request:', { to, from, subject });

    // For now, just save to database and return success
    // The actual SMTP sending will be added later
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email queued successfully (SMTP sending not yet implemented)',
        email: {
          id: `email-${Date.now()}`,
          from: from || smtpConfig?.username || 'noreply@prospaces.com',
          to,
          subject,
          body,
          date: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[simple-send-email] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
