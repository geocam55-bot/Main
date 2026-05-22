import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create a Supabase client with the Auth context of the user that called the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get the request body
    const body = await req.json();
    const { provider, email, imapConfig, returnUrl } = body;

    console.log("Connect request:", {
      provider,
      email,
      hasImapConfig: !!imapConfig,
      returnUrl,
    });

    // For IMAP connections
    if (provider === "imap" && imapConfig) {
      // Store IMAP configuration in the database
      const { data: account, error: insertError } =
        await supabaseClient
          .from("email_accounts")
          .insert({
            user_id: user.id,
            organization_id:
              user.user_metadata?.organizationId ||
              "default_org",
            provider: "imap",
            email: email,
            imap_host: imapConfig.host,
            imap_port: imapConfig.port,
            imap_username: imapConfig.username,
            imap_password: imapConfig.password, // In production, encrypt this!
            connected: true,
            last_sync: new Date().toISOString(),
          })
          .select()
          .single();

      if (insertError) {
        console.error("Database insert error:", insertError);
        throw new Error(
          `Failed to save IMAP account: ${insertError.message}`,
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          account: {
            id: account.id,
            email: account.email,
            provider: account.provider,
            last_sync: account.last_sync,
          },
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }

    // For OAuth connections (Gmail, Outlook, etc.)
    if (
      provider === "gmail" ||
      provider === "outlook" ||
      provider === "apple"
    ) {
      const NYLAS_API_KEY = Deno.env.get("NYLAS_API_KEY");

      if (!NYLAS_API_KEY) {
        throw new Error("NYLAS_API_KEY not configured");
      }
      
      // For Nylas v3, we might also need the client_id (also called API Key in Nylas UI)
      // In Nylas v3, the "API Key" shown in dashboard is actually the client_id
      const NYLAS_CLIENT_ID = Deno.env.get("NYLAS_CLIENT_ID") || NYLAS_API_KEY;

      // Map provider names to Nylas provider names
      const nylasProviderMap: Record<string, string> = {
        gmail: "google",
        outlook: "microsoft",
        apple: "icloud",
      };
      const nylasProvider =
        nylasProviderMap[provider] || provider;

      // Provider-specific scopes
      // https://developer.nylas.com/docs/api/v3/ecc/#overview-authentication-scopes
      let scopes: string[];
      
      if (nylasProvider === "google") {
        // Google requires actual Gmail API scopes + Calendar scopes
        scopes = [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ];
      } else if (nylasProvider === "microsoft") {
        // Microsoft uses simplified Nylas scopes
        scopes = ["email", "calendar"];
      } else if (nylasProvider === "icloud") {
        // Apple iCloud
        scopes = ["email", "calendar"];
      } else {
        // Default fallback
        scopes = ["email"];
      }

      // Generate OAuth authorization URL using Nylas API
      const requestBody = {
        client_id: NYLAS_CLIENT_ID,
        provider: nylasProvider,
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nylas-callback`,
        state: JSON.stringify({
          userId: user.id,
          orgId:
            user.user_metadata?.organizationId ||
            "default_org",
          returnUrl: returnUrl || req.headers.get('origin') || req.headers.get('referer'),
        }),
        scope: scopes,
      };
      
      console.log("Nylas API request:", {
        endpoint: "https://api.us.nylas.com/v3/connect/auth",
        provider: nylasProvider,
        redirectUri: requestBody.redirect_uri,
        scopes: requestBody.scope,
      });

      const nylasResponse = await fetch(
        "https://api.us.nylas.com/v3/connect/auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NYLAS_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!nylasResponse.ok) {
        const errorText = await nylasResponse.text();
        console.error("Nylas API error:", errorText);
        console.error("Request details:", {
          endpoint: "https://api.us.nylas.com/v3/connect/auth",
          provider: nylasProvider,
          apiKeyPrefix: NYLAS_API_KEY.substring(0, 10) + "...",
          redirectUri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nylas-callback`,
          scopes: scopes,
        });
        
        // Parse Nylas error for better user feedback
        let userMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          console.error("Parsed Nylas error:", errorJson);
          
          // Handle different error response formats
          if (errorJson.error_description) {
            userMessage = errorJson.error_description;
          } else if (errorJson.error && typeof errorJson.error === 'string') {
            userMessage = errorJson.error;
          } else if (errorJson.message) {
            userMessage = errorJson.message;
          } else if (errorJson.error && typeof errorJson.error === 'object') {
            userMessage = JSON.stringify(errorJson.error);
          } else {
            userMessage = JSON.stringify(errorJson);
          }
        } catch (e) {
          // Use text as-is if JSON parsing fails
        }
        
        throw new Error(`Nylas API error (${nylasResponse.status}): ${userMessage}`);
      }

      const nylasData = await nylasResponse.json();
      
      console.log("Nylas auth response:", nylasData);
      
      // Nylas v3 returns the URL in data.url, not auth_url
      const authUrl = nylasData.data?.url || nylasData.auth_url;
      
      if (!authUrl) {
        console.error("Missing auth URL in Nylas response:", nylasData);
        throw new Error(`Nylas didn't return an auth URL. This usually means the ${nylasProvider} provider is not configured in your Nylas Dashboard. Response: ${JSON.stringify(nylasData)}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          authUrl: authUrl,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }

    throw new Error("Invalid provider specified");
  } catch (error) {
    console.error("Error in nylas-connect:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});