# Nylas OAuth Backend Deployment Guide

## Overview
This guide walks through deploying the Nylas OAuth backend using Supabase Edge Functions in a GitHub Codespace environment.

## Prerequisites

### 1. Supabase Project Setup
- Active Supabase project
- Project Reference ID (found in project settings)
- Project URL: `https://[project-id].supabase.co`

### 2. Required Secrets
Ensure these secrets are set in your Supabase project (Dashboard → Project Settings → Edge Functions → Secrets):

```bash
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
NYLAS_API_KEY=[your-nylas-api-key]
NYLAS_CLIENT_ID=[your-nylas-client-id]
```

### 3. Nylas Dashboard Configuration
Before deploying, you must configure the callback URL in Nylas:

1. Go to https://dashboard.nylas.com
2. Navigate to **App Settings** → **Authentication**
3. Add this to **Allowed Callback URIs**:
   ```
   https://[your-project-id].supabase.co/functions/v1/nylas-callback
   ```
4. Save changes

---

## Deployment Steps

### Step 1: Install Supabase CLI Locally (Codespace)

Since global installs fail in GitHub Codespaces, we'll install the CLI as a local dev dependency:

```bash
# Navigate to your project root
cd /workspaces/[your-repo-name]

# Install Supabase CLI locally
npm install --save-dev supabase

# Verify installation
npx supabase --version
```

### Step 2: Login to Supabase

```bash
# This will open a browser window for authentication
npx supabase login
```

If the browser doesn't open automatically, copy the URL from the terminal and open it manually.

### Step 3: Link Your Project

```bash
# Replace [your-project-ref] with your actual project reference ID
# Found in: Supabase Dashboard → Project Settings → General → Reference ID
npx supabase link --project-ref [your-project-ref]
```

You'll be prompted to enter your database password. This is the password you set when creating the Supabase project.

### Step 4: Verify Function Structure

The deployment expects this structure:

```
/supabase/functions/server/
├── index.ts          ← ENTRYPOINT (required for CLI)
├── index.tsx         ← Your main server code (kept for development)
├── nylas-oauth.ts    ← Nylas OAuth routes
├── azure-oauth-init.ts
├── azure-oauth-callback.ts
├── background-jobs.ts
├── data-migration.ts
├── fix-profile-mismatch.ts
├── reset-password.ts
└── kv_store.tsx      ← Protected, do not modify
```

**Important**: Both `index.ts` and `index.tsx` should have identical content. The CLI requires `.ts` but you can keep `.tsx` for development.

### Step 5: Deploy the Function

```bash
# Deploy the server function with JWT verification disabled
npx supabase functions deploy server --no-verify-jwt
```

**Expected Output:**
```
Deploying server (project ref: [your-ref])
Bundled server size: XXX KB
Deployed server (version: vX) to: https://[project-id].supabase.co/functions/v1/server
```

### Step 6: Test the Deployment

#### Test 1: Health Check
```bash
curl https://[your-project-id].supabase.co/functions/v1/server/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T..."
}
```

#### Test 2: Nylas Health Check
```bash
curl https://[your-project-id].supabase.co/functions/v1/server/nylas-health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T..."
}
```

---

## Troubleshooting

### Error: "entrypoint path does not exist"

**Cause**: The CLI cannot find `index.ts` in the correct location.

**Solution**:
```bash
# Verify the file exists
ls -la /workspaces/[your-repo]/supabase/functions/server/index.ts

# If it doesn't exist, it should - check your working directory
pwd

# Make sure you're in the project root
cd /workspaces/[your-repo]
```

### Error: "Function already exists"

**Cause**: The function was previously deployed.

**Solution**: This is actually fine! Just redeploy:
```bash
npx supabase functions deploy server --no-verify-jwt
```

### Error: "401 Unauthorized" when testing

**Cause**: The function requires authentication for certain routes.

**Solution**: 
- The `/health` and `/nylas-health` routes should NOT require auth
- OAuth init routes require a valid user access token
- Check your config.toml has `verify_jwt = false` for the server function

### Error: "Redirect URI not allowed" from Nylas

**Cause**: The callback URL in Nylas doesn't match what your function is using.

**Solution**:
1. Check the error message - it will show what URI was sent
2. Add that exact URI to Nylas Dashboard → Allowed Callback URIs
3. The backend auto-generates: `https://[project-id].supabase.co/functions/v1/nylas-callback`

### Error: "Failed to fetch" in frontend

**Cause**: The function name discovery is failing.

**Solution**: The frontend has fallback logic to try:
1. `server` (recommended)
2. `make-server-8405be07` (legacy)
3. `nylas-connect` (legacy)

Make sure you deployed as `server`:
```bash
npx supabase functions deploy server --no-verify-jwt
```

---

## Post-Deployment Configuration

### Update Frontend (if needed)

The frontend should automatically discover the `server` function. If it doesn't:

1. Open `/components/EmailAccountSetup.tsx`
2. Verify line 45 has `'server'` as the first candidate
3. The discovery function will test `/nylas-health` endpoint on each candidate

### Set Manual Callback URL (Optional)

If auto-detection fails, you can set a manual override:

1. Open `/supabase/functions/server/nylas-oauth.ts`
2. Find line 9: `const MANUAL_CALLBACK_URL = "";`
3. Set it to: `const MANUAL_CALLBACK_URL = "https://[project-id].supabase.co/functions/v1/nylas-callback";`
4. Redeploy

---

## Verifying the OAuth Flow

### End-to-End Test

1. **Open your app** (e.g., https://[your-app].vercel.app)
2. **Log in** as a user
3. **Navigate to Settings** → **Email Accounts** → **Connect Email**
4. **Select Gmail or Outlook**
5. **Click Connect**

**Expected Behavior**:
- OAuth popup opens
- Redirects to Google/Microsoft login
- After login, redirects to `nylas-callback` function
- Success message appears
- Popup closes automatically
- Email account shows as connected

### Debug Mode

Check browser console for detailed logs:
- Function name discovery
- OAuth init request
- Callback handling
- Token exchange

---

## Architecture Overview

### Backend-Centric Flow

```
Frontend (Vercel)
    ↓ POST /server with auth token
Edge Function (server)
    ↓ Calls Nylas API with backend URL
Nylas OAuth
    ↓ User authorizes
Nylas Callback → Edge Function (nylas-callback)
    ↓ Token exchange
    ↓ Save to database
Frontend ← Success message (via postMessage)
```

### Key Benefits
- ✅ No frontend URL in Nylas config
- ✅ Secure token handling (server-side only)
- ✅ Consistent callback URL (not dependent on Vercel deployments)
- ✅ Easier to debug (all logs in Supabase)

---

## Next Steps

After successful deployment:

1. **Test all providers**: Gmail, Outlook, Apple Mail
2. **Monitor Supabase logs**: Dashboard → Logs → Edge Functions
3. **Set up email sync**: The sync functions should work automatically
4. **Configure webhooks**: For real-time email notifications

---

## Quick Reference

### Useful Commands

```bash
# Deploy function
npx supabase functions deploy server --no-verify-jwt

# View function logs
npx supabase functions logs server

# List all deployed functions
npx supabase functions list

# Delete a function (if needed)
npx supabase functions delete server
```

### Important URLs

- **Function URL**: `https://[project-id].supabase.co/functions/v1/server`
- **Callback URL**: `https://[project-id].supabase.co/functions/v1/nylas-callback`
- **Nylas Dashboard**: https://dashboard.nylas.com
- **Supabase Dashboard**: https://supabase.com/dashboard/project/[project-id]

---

## Support

If you encounter issues:

1. **Check Supabase Logs**: Most errors are logged here
2. **Check Browser Console**: Frontend errors appear here
3. **Test Health Endpoint**: Confirms function is deployed
4. **Verify Secrets**: All environment variables must be set
5. **Check Nylas Config**: Callback URL must match exactly
