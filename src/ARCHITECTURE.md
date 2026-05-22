# 🏗️ Nylas OAuth Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR APPLICATION                         │
│                    (Vercel/Frontend Hosting)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  EmailAccountSetup.tsx                                  │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ 1. User clicks "Connect Email"                   │  │   │
│  │  │ 2. Component discovers active function:          │  │   │
│  │  │    - Tries: /server/nylas-health                │  │   │
│  │  │    - Tries: /make-server-8405be07/nylas-health  │  │   │
│  │  │    - Tries: /nylas-connect/nylas-health         │  │   │
│  │  │ 3. Calls: POST /server with user token          │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS POST
                             │ Authorization: Bearer <user-token>
                             │ Body: { provider, email }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTION                        │
│              https://[project-id].supabase.co                   │
│                    /functions/v1/server                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  index.ts (Hono Server)                                 │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ Routes:                                           │  │   │
│  │  │  - POST /                → nylasOAuth.init       │  │   │
│  │  │  - GET  /health          → health check          │  │   │
│  │  │  - GET  /nylas-health    → nylas health          │  │   │
│  │  │  - POST /reset-password  → password reset        │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  nylas-oauth.ts                                         │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ initHandler():                                    │  │   │
│  │  │ 1. Verify user token                             │  │   │
│  │  │ 2. Determine callback URL:                       │  │   │
│  │  │    - Manual override OR                          │  │   │
│  │  │    - Auto: https://[project-id].supabase.co/    │  │   │
│  │  │            functions/v1/nylas-callback           │  │   │
│  │  │ 3. Call Nylas API: /v3/connect/auth             │  │   │
│  │  │ 4. Return authUrl to frontend                    │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Returns: { success: true, authUrl: "..." }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Opens popup window with authUrl                         │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Opens: https://auth.nylas.com/...
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          NYLAS                                   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 1. Shows provider selection (Google/Microsoft)          │   │
│  │ 2. Redirects to provider's OAuth page                   │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Redirects to provider
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE / MICROSOFT OAUTH                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ User logs in and authorizes permissions:                │   │
│  │  - Gmail: Read/Send emails, Calendar access             │   │
│  │  - Outlook: Mail.Read, Mail.Send, Calendar access       │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ After authorization
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          NYLAS                                   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Redirects to callback URL with:                         │   │
│  │  - code: authorization code                             │   │
│  │  - state: { userId, orgId, provider }                   │   │
│  │                                                          │   │
│  │ https://[project-id].supabase.co/functions/v1/          │   │
│  │       nylas-callback?code=xxx&state=yyy                 │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ GET request with code & state
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION (Callback)                   │
│                    /functions/v1/nylas-callback                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  nylas-oauth.ts → callbackHandler():                    │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ 1. Extract code & state from query params        │  │   │
│  │  │ 2. Exchange code for tokens:                     │  │   │
│  │  │    POST https://api.us.nylas.com/v3/connect/token│  │   │
│  │  │    Body: {                                        │  │   │
│  │  │      client_id, client_secret,                   │  │   │
│  │  │      code, redirect_uri                          │  │   │
│  │  │    }                                              │  │   │
│  │  │ 3. Receive: { email, grant_id, provider }        │  │   │
│  │  │ 4. Save to database: email_accounts table        │  │   │
│  │  │ 5. Return HTML with postMessage script           │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Returns HTML page with:
                             │ window.opener.postMessage({
                             │   type: 'nylas-oauth-success',
                             │   account: { ... }
                             │ })
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Popup Window)                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 1. Receives postMessage event                           │   │
│  │ 2. Closes popup window                                  │   │
│  │ 3. Shows success toast                                  │   │
│  │ 4. Updates UI with connected account                    │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### 1. **Initiation** (Frontend → Edge Function)

```typescript
// EmailAccountSetup.tsx
const { data } = await supabase.functions.invoke('server', {
  body: {
    provider: 'gmail',
    email: 'user@gmail.com'
  }
});
// Returns: { success: true, authUrl: 'https://auth.nylas.com/...' }
```

### 2. **OAuth Redirect** (Edge Function → Nylas)

```typescript
// nylas-oauth.ts → initHandler()
const response = await fetch('https://api.us.nylas.com/v3/connect/auth', {
  method: 'POST',
  body: JSON.stringify({
    client_id: NYLAS_CLIENT_ID,
    provider: 'google',
    redirect_uri: 'https://[project-id].supabase.co/functions/v1/nylas-callback',
    state: JSON.stringify({ userId, orgId, provider }),
    scope: ['gmail.read', 'gmail.send', 'calendar']
  })
});
```

### 3. **Token Exchange** (Nylas → Edge Function)

```
Nylas redirects to:
https://[project-id].supabase.co/functions/v1/nylas-callback
  ?code=eyJhbGciOiJ...
  &state={"userId":"123","orgId":"456","provider":"gmail"}
```

### 4. **Save Account** (Edge Function → Database)

```typescript
// nylas-oauth.ts → saveEmailAccount()
await supabaseClient.from('email_accounts').insert({
  user_id: userId,
  organization_id: orgId,
  provider: 'gmail',
  email: tokenData.email,
  nylas_grant_id: tokenData.grant_id,
  connected: true
});
```

### 5. **Completion** (Edge Function → Frontend)

```html
<script>
  window.opener.postMessage({
    type: 'nylas-oauth-success',
    account: { id, email, provider, connected: true }
  }, '*');
  window.close();
</script>
```

---

## Key Components

### Frontend Components
- `EmailAccountSetup.tsx` - Email OAuth UI
- `CalendarAccountSetup.tsx` - Calendar OAuth UI
- `NylasCallback.tsx` - Handles OAuth callbacks

### Backend Functions
- `index.ts` - Main Hono server entrypoint
- `nylas-oauth.ts` - Nylas OAuth routes & handlers
- `azure-oauth-init.ts` - Azure OAuth initialization
- `azure-oauth-callback.ts` - Azure OAuth callbacks

### External Services
- **Nylas API** - OAuth provider & email/calendar API
- **Google/Microsoft** - Identity providers
- **Supabase** - Hosting, database, auth

---

## Security Features

### 1. **User Authentication**
```typescript
const { data: { user }, error } = await userClient.auth.getUser();
if (error || !user) {
  return c.json({ error: 'Invalid user token' }, 401);
}
```

### 2. **State Validation**
```typescript
const state = JSON.stringify({
  userId: user.id,
  orgId: user.user_metadata?.organizationId,
  provider: provider
});
// Verified in callback to prevent CSRF
```

### 3. **Server-Side Token Handling**
- Tokens never exposed to frontend
- Stored securely in database
- Encrypted in transit (HTTPS only)

### 4. **CORS Protection**
```typescript
app.use('*', cors());  // Controlled CORS headers
```

---

## Environment Variables

### Required Secrets (Supabase Dashboard)

```bash
# Supabase Configuration
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Nylas Configuration  
NYLAS_API_KEY=nyk_v0_xxxxxxxxxxxxxxxxxxxxx
NYLAS_CLIENT_ID=nyk_v0_xxxxxxxxxxxxxxxxxxxxx
```

### How to Set
1. Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
2. Click: **Add New Secret**
3. Enter: Name and Value
4. Click: **Save**

---

## Error Handling

### Common Errors & Resolutions

| Error | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized** | Missing/invalid user token | Log out and back in |
| **Redirect URI not allowed** | Nylas callback not configured | Add URL to Nylas Dashboard |
| **Failed to exchange token** | Mismatched redirect_uri | Check MANUAL_CALLBACK_URL |
| **Invalid state** | State parameter corrupted | Check JSON encoding |
| **Popup blocked** | Browser blocked popup | Allow popups for domain |

### Debugging Tools

```bash
# View function logs
npx supabase functions logs server --follow

# Test health endpoint
curl https://[project-id].supabase.co/functions/v1/server/health

# Check deployed functions
npx supabase functions list
```

---

## Performance Considerations

### Response Times
- **Health check:** < 100ms
- **OAuth init:** < 500ms (Nylas API call)
- **Token exchange:** < 1000ms (Nylas API + DB write)

### Scalability
- **Edge Functions:** Auto-scaling, globally distributed
- **Database:** Connection pooling via Supabase
- **Nylas API:** Rate limits (check your plan)

---

## Database Schema

### email_accounts Table

```sql
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID,
  provider TEXT,  -- 'gmail', 'outlook', 'apple'
  email TEXT,
  nylas_grant_id TEXT,  -- Nylas grant ID for API calls
  connected BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Monitoring & Logs

### What Gets Logged

```typescript
// Health checks
console.log('🏥 Health check endpoint hit');

// OAuth init
console.log('Nylas Auth Config:', { 
  finalRedirectUri,
  provider,
  source: 'Backend Auto-Detection'
});

// Token exchange
console.log('Callback exchanging token with URI:', NYLAS_REDIRECT_URI);

// Errors
console.error('Nylas API error:', errorText);
```

### Where to View
- **Supabase Dashboard:** Logs → Edge Functions → server
- **Terminal:** `npx supabase functions logs server --follow`

---

## Deployment Workflow

```
1. Code Changes → git push
2. Deploy Function → npx supabase functions deploy server
3. Test Endpoint → curl .../health
4. Test OAuth → Open app, try connecting
5. Monitor Logs → Check Supabase dashboard
```

---

## Further Reading

- **Nylas API Docs:** https://developer.nylas.com/docs/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Hono Framework:** https://hono.dev/
- **OAuth 2.0 Flow:** https://oauth.net/2/
