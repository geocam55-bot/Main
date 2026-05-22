// Gmail OAuth Callback - Step 2: Exchange code for tokens
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      throw new Error(`OAuth error: ${error}`)
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    // Create Supabase admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify state and get user_id
    const { data: stateData, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .eq('provider', 'gmail')
      .single()

    if (stateError || !stateData) {
      throw new Error('Invalid state parameter')
    }

    // Check if state expired
    if (new Date(stateData.expires_at) < new Date()) {
      throw new Error('State expired')
    }

    // Delete used state
    await supabaseClient.from('oauth_states').delete().eq('state', state)

    // Get OAuth credentials
    const { data: secrets, error: secretsError } = await supabaseClient
      .from('oauth_secrets')
      .select('client_id, client_secret')
      .eq('provider', 'gmail')
      .single()

    if (secretsError || !secrets) {
      throw new Error('Gmail OAuth not configured')
    }

    const { client_id, client_secret } = secrets

    // Exchange code for tokens
    const redirectUri = Deno.env.get('GMAIL_REDIRECT_URI') || 
      `${url.origin}/api/auth/gmail/callback`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${errorData}`)
    }

    const tokens = await tokenResponse.json()

    // Get user's email using access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info')
    }

    const userInfo = await userInfoResponse.json()

    // Get user's organization
    const { data: userOrg } = await supabaseClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', stateData.user_id)
      .single()

    if (!userOrg) {
      throw new Error('User organization not found')
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

    // Store account in database
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .upsert({
        user_id: stateData.user_id,
        organization_id: userOrg.organization_id,
        provider: 'gmail',
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiresAt.toISOString(),
        connected: true,
        last_sync: new Date().toISOString(),
      }, {
        onConflict: 'user_id,email',
      })
      .select()
      .single()

    if (accountError) {
      throw new Error(`Failed to store account: ${accountError.message}`)
    }

    // Return success HTML page that closes the popup
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Connected</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .success {
              color: #10b981;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              font-size: 1.5rem;
              margin: 0 0 0.5rem;
              color: #111827;
            }
            p {
              color: #6b7280;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Gmail Connected Successfully!</h1>
            <p>You can close this window now.</p>
          </div>
          <script>
            // Send message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail-oauth-success',
                account: ${JSON.stringify(account)}
              }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
      </html>
    `

    return new Response(successHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
      status: 200,
    })
  } catch (error) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .error {
              color: #ef4444;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              font-size: 1.5rem;
              margin: 0 0 0.5rem;
              color: #111827;
            }
            p {
              color: #6b7280;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✕</div>
            <h1>Connection Failed</h1>
            <p>${error.message}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail-oauth-error',
                error: '${error.message}'
              }, '*');
            }
          </script>
        </body>
      </html>
    `

    return new Response(errorHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
      status: 400,
    })
  }
})
