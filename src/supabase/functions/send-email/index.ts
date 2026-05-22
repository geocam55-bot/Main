// Send Email via SMTP
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
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

    // Get request body
    const { accountId, to, subject, body, cc, bcc, useSystemSender } = await req.json()

    if (!to || !subject || !body) {
      throw new Error('Missing required fields: to, subject, body')
    }

    const systemSenderEnabled = useSystemSender === true
    let smtpHost = ''
    let smtpPort = 587
    let smtpUsername = ''
    let smtpPassword = ''
    let fromAddress = ''
    let account: any = null

    if (systemSenderEnabled) {
      smtpHost = (Deno.env.get('SYSTEM_SMTP_HOST') || 'smtp.ionos.com').trim()
      smtpPort = Number(Deno.env.get('SYSTEM_SMTP_PORT') || '587')
      smtpUsername = (Deno.env.get('SYSTEM_SMTP_USERNAME') || '').trim()
      smtpPassword = Deno.env.get('SYSTEM_SMTP_PASSWORD') || ''
      fromAddress = (Deno.env.get('SUPPORT_EMAIL_ADDRESS') || 'support@prospacescrm.ca').trim()

      if (!smtpUsername || !smtpPassword) {
        throw new Error('System SMTP credentials are not configured')
      }
    } else {
      if (!accountId) {
        throw new Error('Missing required field: accountId')
      }

      // Get email account configuration
      const { data: fetchedAccount, error: accountError } = await supabaseClient
        .from('email_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (accountError || !fetchedAccount) {
        throw new Error('Email account not found')
      }

      if (!fetchedAccount.imap_host || !fetchedAccount.imap_username || !fetchedAccount.imap_password) {
        throw new Error('Email account not configured for SMTP')
      }

      account = fetchedAccount

      // Determine SMTP port (usually IMAP port + 1 or use common SMTP ports)
      smtpPort = account.imap_port === 993 ? 465 : (account.imap_port === 143 ? 587 : 587)

      // Determine SMTP host (usually same as IMAP host but with smtp prefix)
      smtpHost = account.imap_host
      if (smtpHost.startsWith('imap.')) {
        smtpHost = smtpHost.replace('imap.', 'smtp.')
      }

      smtpUsername = account.imap_username
      smtpPassword = account.imap_password
      fromAddress = account.email
    }

    // Create SMTP client
    const useTls = systemSenderEnabled || smtpPort === 465
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: useTls,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
    })

    // Send email
    await client.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject: subject,
      content: body,
      html: body, // Assuming HTML content
    })

    await client.close()

    if (systemSenderEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'System email sent successfully',
          sender: fromAddress,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get user's organization
    const { data: userOrg } = await supabaseClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!userOrg) {
      throw new Error('User organization not found')
    }

    // Store sent email in database
    const { data: sentEmail, error: emailError } = await supabaseClient
      .from('email_messages')
      .insert({
        account_id: accountId,
        organization_id: userOrg.organization_id,
        message_id: `sent_${Date.now()}_${crypto.randomUUID()}`,
        subject: subject,
        from_address: fromAddress,
        to_addresses: Array.isArray(to) ? to : [to],
        cc_addresses: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        body_html: body,
        body_text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        folder: 'sent',
        is_read: true,
        received_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (emailError) {
      console.error('Error storing sent email:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email: sentEmail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
