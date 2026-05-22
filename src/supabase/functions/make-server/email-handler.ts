import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getGoogleAccessToken } from './google-oauth.ts';
import { getMicrosoftAccessToken } from './microsoft-oauth.ts';

const emailRoutes = new Hono();

// Fetch emails from Gmail using Gmail API
async function fetchGmailEmails(accessToken: string, maxResults = 50) {
  // Get list of message IDs
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!listResponse.ok) {
    const error = await listResponse.text();
    throw new Error(`Failed to fetch Gmail messages: ${error}`);
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  // Fetch full message details
  const emails = [];
  for (const msg of messages) {
    const msgResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (msgResponse.ok) {
      const msgData = await msgResponse.json();
      emails.push(parseGmailMessage(msgData));
    }
  }

  return emails;
}

// Parse Gmail message format
function parseGmailMessage(msg: any) {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const to = getHeader('To');
  const date = getHeader('Date');
  const messageId = getHeader('Message-ID');

  // Extract body
  let body = '';
  let htmlBody = '';

  function extractBody(payload: any) {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      body = decodeBase64Url(payload.body.data);
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
      htmlBody = decodeBase64Url(payload.body.data);
    } else if (payload.parts) {
      payload.parts.forEach(extractBody);
    }
  }

  extractBody(msg.payload);

  return {
    id: msg.id,
    thread_id: msg.threadId,
    message_id: messageId,
    subject: subject,
    from: from,
    to: to,
    date: new Date(date).toISOString(),
    body: body || htmlBody,
    html_body: htmlBody,
    snippet: msg.snippet,
    labels: msg.labelIds || [],
    is_read: !msg.labelIds?.includes('UNREAD'),
    is_starred: msg.labelIds?.includes('STARRED'),
  };
}

// Decode base64url (Gmail format)
function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  } catch (e) {
    console.error('Failed to decode base64:', e);
    return '';
  }
}

// Fetch emails from Outlook using Microsoft Graph API
async function fetchOutlookEmails(accessToken: string, maxResults = 50) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Outlook messages: ${error}`);
  }

  const data = await response.json();
  const messages = data.value || [];

  return messages.map((msg: any) => ({
    id: msg.id,
    message_id: msg.internetMessageId,
    subject: msg.subject,
    from: msg.from?.emailAddress?.address || '',
    to: msg.toRecipients?.map((r: any) => r.emailAddress?.address).join(', ') || '',
    date: msg.receivedDateTime,
    body: msg.bodyPreview || msg.body?.content || '',
    html_body: msg.body?.contentType === 'html' ? msg.body?.content : '',
    snippet: msg.bodyPreview,
    is_read: msg.isRead,
    is_starred: msg.flag?.flagStatus === 'flagged',
    folder: msg.parentFolderId,
  }));
}

// Sync emails endpoint
emailRoutes.post('/make-server-8405be07/sync-emails', async (c) => {
  try {
    const { accountId, email, provider, userId, maxResults } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Missing email parameter' }, 400);
    }

    console.log(`[Email Sync] Syncing emails for ${email} (${provider})`);

    let accessToken: string;
    let emails: any[];

    if (provider === 'gmail' || provider === 'google') {
      // Get Google access token (auto-refreshes if needed)
      accessToken = await getGoogleAccessToken(email, userId);
      emails = await fetchGmailEmails(accessToken, maxResults || 50);
    } else if (provider === 'outlook' || provider === 'microsoft') {
      // Get Microsoft access token (auto-refreshes if needed)
      accessToken = await getMicrosoftAccessToken(email, userId);
      emails = await fetchOutlookEmails(accessToken, maxResults || 50);
    } else {
      return c.json({ error: 'Unsupported provider. Use gmail or outlook.' }, 400);
    }

    console.log(`[Email Sync] Fetched ${emails.length} emails`);

    // Store emails in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get account ID if not provided
    let dbAccountId = accountId;
    if (!dbAccountId) {
      const { data: account } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('email', email)
        .single();
      
      dbAccountId = account?.id;
    }

    if (dbAccountId) {
      // Insert emails (upsert to avoid duplicates)
      const emailRecords = emails.map((email) => ({
        account_id: dbAccountId,
        message_id: email.message_id || email.id,
        subject: email.subject,
        from_address: email.from,
        to_address: email.to,
        date: email.date,
        body: email.body,
        html_body: email.html_body,
        snippet: email.snippet,
        is_read: email.is_read,
        is_starred: email.is_starred,
        folder: email.folder || (email.labels?.includes('INBOX') ? 'INBOX' : 'Other'),
      }));

      const { data, error } = await supabase
        .from('emails')
        .upsert(emailRecords, { 
          onConflict: 'account_id,message_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('[Email Sync] Failed to store emails:', error);
      } else {
        console.log('[Email Sync] Successfully stored emails');
      }

      // Update last_sync timestamp
      await supabase
        .from('email_accounts')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', dbAccountId);
    }

    return c.json({
      success: true,
      synced: emails.length,
      provider: provider,
      email: email,
    });

  } catch (error: any) {
    console.error('[Email Sync] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to sync emails' 
    }, 500);
  }
});

// Send email via Gmail API
async function sendGmailEmail(accessToken: string, emailData: any) {
  // Construct RFC 2822 email
  const email = [
    `From: ${emailData.from}`,
    `To: ${emailData.to}`,
    emailData.cc ? `Cc: ${emailData.cc}` : '',
    emailData.bcc ? `Bcc: ${emailData.bcc}` : '',
    `Subject: ${emailData.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    emailData.body,
  ].filter(Boolean).join('\r\n');

  // Encode to base64url
  const encodedEmail = btoa(email)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Gmail: ${error}`);
  }

  return await response.json();
}

// Send email via Microsoft Graph API
async function sendOutlookEmail(accessToken: string, emailData: any) {
  const message = {
    subject: emailData.subject,
    body: {
      contentType: 'HTML',
      content: emailData.body,
    },
    toRecipients: emailData.to.split(',').map((email: string) => ({
      emailAddress: {
        address: email.trim(),
      },
    })),
    ccRecipients: emailData.cc ? emailData.cc.split(',').map((email: string) => ({
      emailAddress: {
        address: email.trim(),
      },
    })) : [],
    bccRecipients: emailData.bcc ? emailData.bcc.split(',').map((email: string) => ({
      emailAddress: {
        address: email.trim(),
      },
    })) : [],
  };

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/sendMail',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Outlook email: ${error}`);
  }

  return { success: true };
}

// Send email endpoint
emailRoutes.post('/make-server-8405be07/send-email', async (c) => {
  try {
    const { email, provider, userId, to, subject, body, cc, bcc } = await c.req.json();

    if (!email || !to || !subject || !body) {
      return c.json({ error: 'Missing required fields: email, to, subject, body' }, 400);
    }

    console.log(`[Email Send] Sending email from ${email} via ${provider}`);

    let accessToken: string;
    let result: any;

    if (provider === 'gmail' || provider === 'google') {
      accessToken = await getGoogleAccessToken(email, userId);
      result = await sendGmailEmail(accessToken, { from: email, to, subject, body, cc, bcc });
    } else if (provider === 'outlook' || provider === 'microsoft') {
      accessToken = await getMicrosoftAccessToken(email, userId);
      result = await sendOutlookEmail(accessToken, { to, subject, body, cc, bcc });
    } else {
      return c.json({ error: 'Unsupported provider. Use gmail or outlook.' }, 400);
    }

    console.log('[Email Send] Email sent successfully');

    return c.json({
      success: true,
      provider: provider,
      messageId: result.id || 'sent',
    });

  } catch (error: any) {
    console.error('[Email Send] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to send email' 
    }, 500);
  }
});

export { emailRoutes };
