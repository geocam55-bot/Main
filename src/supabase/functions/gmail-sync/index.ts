// Gmail Sync - Fetch emails from Gmail API
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { accountId, maxResults = 50 } = await req.json()

    if (!accountId) {
      throw new Error('Account ID required')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get email account
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      throw new Error('Email account not found')
    }

    // Check if token is expired and refresh if needed
    let accessToken = account.access_token
    if (new Date(account.token_expiry) < new Date()) {
      accessToken = await refreshToken(supabaseClient, account)
    }

    // Fetch messages from Gmail API
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox OR in:sent`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!messagesResponse.ok) {
      throw new Error('Failed to fetch messages from Gmail')
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.messages || []

    // Fetch details for each message
    const emailsToStore = []
    for (const message of messages.slice(0, 20)) { // Limit to 20 for this example
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (detailResponse.ok) {
        const detail = await detailResponse.json()
        const email = parseGmailMessage(detail, account)
        emailsToStore.push(email)
      }
    }

    // Store emails in database
    if (emailsToStore.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('email_messages')
        .upsert(emailsToStore, {
          onConflict: 'account_id,message_id',
          ignoreDuplicates: true,
        })

      if (insertError) {
        console.error('Error storing emails:', insertError)
      }
    }

    // Update last sync time
    await supabaseClient
      .from('email_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId)

    return new Response(
      JSON.stringify({
        success: true,
        synced: emailsToStore.length,
        total: messages.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function refreshToken(supabaseClient: any, account: any) {
  const { data: secrets } = await supabaseClient
    .from('oauth_secrets')
    .select('client_id, client_secret')
    .eq('provider', 'gmail')
    .single()

  if (!secrets) {
    throw new Error('OAuth secrets not found')
  }

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: secrets.client_id,
      client_secret: secrets.client_secret,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!refreshResponse.ok) {
    throw new Error('Failed to refresh token')
  }

  const tokens = await refreshResponse.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  // Update tokens in database
  await supabaseClient
    .from('email_accounts')
    .update({
      access_token: tokens.access_token,
      token_expiry: expiresAt.toISOString(),
    })
    .eq('id', account.id)

  return tokens.access_token
}

function parseGmailMessage(gmailMessage: any, account: any) {
  const headers = gmailMessage.payload.headers
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  // Determine folder based on labels
  let folder = 'inbox'
  if (gmailMessage.labelIds?.includes('SENT')) {
    folder = 'sent'
  } else if (gmailMessage.labelIds?.includes('TRASH')) {
    folder = 'trash'
  } else if (gmailMessage.labelIds?.includes('SPAM')) {
    folder = 'spam'
  }

  // Parse email addresses
  const parseAddresses = (addressString: string) => {
    if (!addressString) return []
    return addressString.split(',').map(a => a.trim())
  }

  // Get email body
  let bodyText = ''
  let bodyHtml = ''
  
  const getBody = (part: any): void => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    } else if (part.parts) {
      part.parts.forEach(getBody)
    }
  }
  
  if (gmailMessage.payload.parts) {
    gmailMessage.payload.parts.forEach(getBody)
  } else if (gmailMessage.payload.body?.data) {
    bodyText = atob(gmailMessage.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
  }

  return {
    account_id: account.id,
    organization_id: account.organization_id,
    message_id: gmailMessage.id,
    thread_id: gmailMessage.threadId,
    subject: getHeader('Subject') || '(No Subject)',
    from_address: getHeader('From'),
    to_addresses: parseAddresses(getHeader('To')),
    cc_addresses: parseAddresses(getHeader('Cc')),
    bcc_addresses: parseAddresses(getHeader('Bcc')),
    body_text: bodyText,
    body_html: bodyHtml,
    folder,
    is_read: !gmailMessage.labelIds?.includes('UNREAD'),
    is_starred: gmailMessage.labelIds?.includes('STARRED'),
    has_attachments: gmailMessage.payload.parts?.some((p: any) => p.filename) || false,
    received_at: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
  }
}
