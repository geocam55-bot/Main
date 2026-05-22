# Direct OAuth Setup Guide (No Nylas Required!)

## Overview

We've eliminated Nylas completely and implemented direct OAuth with Google and Microsoft. This gives you:

✅ **No third-party costs** - Direct integration with Gmail and Outlook  
✅ **Full control** - Tokens stored securely in your Supabase KV store  
✅ **Better privacy** - No intermediaries handling your data  
✅ **Native APIs** - Direct access to Gmail API, Microsoft Graph API, Google Calendar, and Microsoft Calendar  

## Architecture

```
Frontend → Supabase Edge Function → Google/Microsoft OAuth → IMAP/SMTP/Calendar APIs
```

Your Edge Function (`make-server-8405be07`) now handles:
- Google OAuth flow (Gmail + Google Calendar)
- Microsoft OAuth flow (Outlook/365 + Microsoft Calendar)
- Email sync and send via Gmail API / Microsoft Graph API
- Calendar sync and event creation

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Gmail API
   - Google Calendar API
   - People API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add Authorized redirect URI:
   ```
   https://your-app-url.com/oauth-callback
   ```
7. Save your:
   - Client ID
   - Client Secret

### 2. Get Microsoft OAuth Credentials (for Outlook/365)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Name: "Your CRM Email Integration"
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI (Web): 
   ```
   https://your-app-url.com/oauth-callback
   ```
6. After creation, go to **Certificates & secrets** → **New client secret**
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph**:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `Calendars.ReadWrite`
   - `User.Read`
   - `offline_access`
8. Click **Grant admin consent**
9. Save your:
   - Application (client) ID
   - Client secret value
   - Tenant ID (optional, use 'common' for multi-tenant)

### 3. Set Supabase Secrets

```bash
cd /workspaces/Prospaces

# Google credentials
npx supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
npx supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret
npx supabase secrets set GOOGLE_REDIRECT_URI=https://your-app-url.com/oauth-callback

# Microsoft credentials
npx supabase secrets set AZURE_CLIENT_ID=your_azure_client_id
npx supabase secrets set AZURE_CLIENT_SECRET=your_azure_client_secret
npx supabase secrets set AZURE_TENANT_ID=common
npx supabase secrets set AZURE_REDIRECT_URI=https://your-app-url.com/oauth-callback

# App URL (used as fallback for redirect URIs)
npx supabase secrets set APP_URL=https://your-app-url.com
```

### 4. Deploy Edge Function

```bash
cd /workspaces/Prospaces
npx supabase functions deploy make-server --no-verify-jwt
```

**Note:** We use `--no-verify-jwt` because OAuth callbacks don't include JWT tokens.

### 5. Verify Deployment

Check if your endpoints are working:

```bash
# Health check
curl https://your-project-id.supabase.co/functions/v1/make-server-8405be07/health

# Google OAuth health
curl https://your-project-id.supabase.co/functions/v1/make-server-8405be07/google-health

# Microsoft OAuth health
curl https://your-project-id.supabase.co/functions/v1/make-server-8405be07/microsoft-health
```

## How It Works

### OAuth Flow

1. **User clicks "Connect Gmail" or "Connect Outlook"** in your CRM
2. Frontend calls `/google-oauth-init` or `/microsoft-oauth-init`
3. Backend returns OAuth URL with proper scopes
4. User is redirected to Google/Microsoft login
5. After authorization, user is redirected to `/oauth-callback`
6. Frontend exchanges code for tokens via `/google-oauth-exchange` or `/microsoft-oauth-exchange`
7. Backend stores tokens in Supabase KV store
8. Backend creates/updates account in `email_accounts` table

### Email Sync

```typescript
// Frontend calls
POST /make-server-8405be07/sync-emails
{
  "email": "user@gmail.com",
  "provider": "gmail",  // or "outlook"
  "userId": "user-id",
  "maxResults": 50
}
```

Backend:
1. Retrieves OAuth tokens from KV store
2. Auto-refreshes if expired
3. Fetches emails via Gmail API or Microsoft Graph API
4. Parses and stores in Supabase `emails` table

### Send Email

```typescript
POST /make-server-8405be07/send-email
{
  "email": "user@gmail.com",
  "provider": "gmail",
  "to": "recipient@example.com",
  "subject": "Test",
  "body": "<p>Hello!</p>",
  "cc": "cc@example.com",  // optional
  "bcc": "bcc@example.com"  // optional
}
```

### Calendar Sync

```typescript
POST /make-server-8405be07/sync-calendar
{
  "email": "user@gmail.com",
  "provider": "gmail",
  "timeMin": "2026-02-01T00:00:00Z",  // optional
  "timeMax": "2026-03-01T00:00:00Z"   // optional
}
```

### Create Calendar Event

```typescript
POST /make-server-8405be07/create-calendar-event
{
  "email": "user@gmail.com",
  "provider": "gmail",
  "title": "Meeting",
  "description": "Discuss project",
  "start": "2026-02-20T10:00:00Z",
  "end": "2026-02-20T11:00:00Z",
  "location": "Conference Room A",
  "attendees": ["attendee@example.com"],
  "timeZone": "America/New_York"
}
```

## Token Management

- **Storage**: OAuth tokens are stored in Supabase KV store with keys like:
  - `oauth:google:user:{userId}:{email}`
  - `oauth:microsoft:user:{userId}:{email}`

- **Auto-Refresh**: Backend automatically refreshes expired tokens using refresh tokens

- **Security**: 
  - Tokens never exposed to frontend
  - All API calls go through your Edge Function
  - Service role key stays server-side

## Database Schema

The `email_accounts` table should have:

```sql
- id (uuid)
- user_id (uuid) - references profiles
- email (text)
- provider (text) - 'gmail' or 'outlook'
- oauth_connected (boolean)
- last_sync (timestamp)
```

**Note**: You can remove the `nylas_grant_id` column as it's no longer needed.

## Frontend Integration

### EmailAccountSetup Component

Now initiates OAuth flow:

```typescript
const initOAuth = async (provider: 'google' | 'microsoft') => {
  const response = await fetch(`${serverUrl}/${provider}-oauth-init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      userId: user.id,
      includeCalendar: true,
    }),
  });

  const { authUrl } = await response.json();
  
  // Open OAuth popup
  window.open(authUrl, 'OAuth', 'width=600,height=700');
  
  // Listen for completion
  window.addEventListener('message', handleOAuthComplete);
};
```

## Removed Nylas Dependencies

The following have been removed:
- ❌ All `nylas-*` Edge Functions
- ❌ `NylasCallback` component (replaced with `OAuthCallback`)
- ❌ Nylas SDK dependencies
- ❌ `NYLAS_API_KEY` and `NYLAS_CLIENT_ID` secrets (can be deleted)
- ❌ `nylas_grant_id` column references

## Next Steps

1. **Deploy the Edge Function** (see step 4 above)
2. **Set up OAuth credentials** with Google and/or Microsoft
3. **Update frontend components** to use new OAuth flow (already done!)
4. **Test the integration** by connecting an account
5. **Optional**: Remove old Nylas-related files and database columns

## Troubleshooting

### "Missing OAuth credentials" error

Make sure you've set the required Supabase secrets (see step 3).

### "Failed to exchange authorization code"

Check that your redirect URI in Google/Microsoft console matches exactly:
```
https://your-app-url.com/oauth-callback
```

### "Token refresh failed"

User needs to re-authenticate. This happens if:
- Refresh token was revoked
- User changed password
- OAuth consent was revoked

### Emails not syncing

1. Check Edge Function logs: `npx supabase functions logs make-server`
2. Verify OAuth scopes include required permissions
3. Ensure tokens are stored correctly in KV store

## Benefits Recap

| Feature | Nylas | Direct OAuth |
|---------|-------|--------------|
| Cost | $99+/month | $0 |
| Rate Limits | Nylas limits | Provider limits (much higher) |
| Privacy | Third-party access | Direct only |
| Customization | Limited | Full control |
| Latency | 2 hops | 1 hop |
| Setup Complexity | Easy | Moderate |

You now have a production-ready, cost-effective email and calendar integration! 🎉
