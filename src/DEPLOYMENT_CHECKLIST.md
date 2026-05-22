# 🚀 Nylas OAuth Backend - Quick Start Checklist

Follow these steps in order. Check off each as you complete it.

---

## Pre-Deployment Checklist

### ☐ 1. Gather Required Information

You'll need these values. Find them now:

- [ ] **Supabase Project Reference ID**  
  Location: Supabase Dashboard → Project Settings → General → Reference ID  
  Example: `abcdefghijklmnop`

- [ ] **Supabase Project ID** (for URL)  
  Location: Same place, or from your project URL  
  Example: If your URL is `https://xyz123.supabase.co`, your ID is `xyz123`

- [ ] **Supabase Database Password**  
  The password you set when creating the project

### ☐ 2. Verify Supabase Secrets

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Confirm these secrets exist (don't need to see values, just confirm they're there):
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NYLAS_API_KEY`
- [ ] `NYLAS_CLIENT_ID`

### ☐ 3. Configure Nylas Callback URL

Go to: **https://dashboard.nylas.com → Your App → Settings → Authentication**

Add this URL to **Allowed Callback URIs**:
```
https://[YOUR-PROJECT-ID].supabase.co/functions/v1/nylas-callback
```

Replace `[YOUR-PROJECT-ID]` with your actual project ID from step 1.

---

## Deployment Steps

### ☐ 4. Open Terminal in Codespace

In VS Code (Codespace), open a new terminal:
- Menu: Terminal → New Terminal
- Or press: `` Ctrl+` ``

### ☐ 5. Navigate to Project Root

```bash
cd /workspaces/[your-repo-name]
```

Verify you're in the right place:
```bash
ls supabase/functions/server/index.ts
```

Should output: `supabase/functions/server/index.ts`

### ☐ 6. Install Supabase CLI

```bash
npm install --save-dev supabase
```

Wait for installation to complete.

### ☐ 7. Login to Supabase

```bash
npx supabase login
```

- A browser window should open
- Log in with your Supabase credentials
- Return to terminal when done

### ☐ 8. Link Your Project

```bash
npx supabase link --project-ref [YOUR-PROJECT-REF]
```

Replace `[YOUR-PROJECT-REF]` with the reference ID from step 1.

When prompted:
- Enter your database password
- Wait for linking to complete

### ☐ 9. Deploy the Function

```bash
npx supabase functions deploy server --no-verify-jwt
```

**Expected output:**
```
Deploying server (project ref: ...)
Bundled server size: XXX KB
Deployed server to: https://[project-id].supabase.co/functions/v1/server
```

---

## Post-Deployment Testing

### ☐ 10. Test Health Endpoint

```bash
curl https://[YOUR-PROJECT-ID].supabase.co/functions/v1/server/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"..."}
```

### ☐ 11. Test Nylas Health Endpoint

```bash
curl https://[YOUR-PROJECT-ID].supabase.co/functions/v1/server/nylas-health
```

**Expected response:**
```json
{"status":"ok","timestamp":"..."}
```

### ☐ 12. Test OAuth Flow in App

1. Open your app in a browser
2. Log in as a user
3. Go to: **Settings → Email Accounts**
4. Click: **Connect Email**
5. Select: **Gmail** or **Outlook**
6. Click: **Connect**
7. **Expected**: OAuth popup opens with Google/Microsoft login

---

## Troubleshooting

### If deployment fails:

**Error: "entrypoint path does not exist"**
```bash
# Verify file exists
ls -la supabase/functions/server/index.ts

# If missing, check you're in project root
pwd
```

**Error: "not logged in"**
```bash
npx supabase login
```

**Error: "project not linked"**
```bash
npx supabase link --project-ref [YOUR-PROJECT-REF]
```

### If health check fails:

**Response: 404 or error**
- Wait 30 seconds and try again (deployment can take a moment)
- Verify your project ID is correct
- Check Supabase dashboard to confirm function deployed

### If OAuth fails:

**Error: "Redirect URI not allowed"**
1. Check the error message for the exact URI being used
2. Add that URI to Nylas Dashboard → Allowed Callback URIs
3. Should be: `https://[project-id].supabase.co/functions/v1/nylas-callback`

**Popup blocked**
- Allow popups for your app domain
- Try again

**401 errors**
- Make sure you're logged in to your app
- Try logging out and back in
- Check browser console for detailed errors

---

## Quick Commands Reference

```bash
# View function logs (if errors occur)
npx supabase functions logs server

# List all deployed functions
npx supabase functions list

# Redeploy (if you make changes)
npx supabase functions deploy server --no-verify-jwt

# View this project's link status
npx supabase projects list
```

---

## Success Criteria

You'll know everything is working when:

✅ Health check returns `{"status":"ok"}`  
✅ OAuth popup opens without errors  
✅ After authorizing, popup closes automatically  
✅ Email account shows as "Connected" in your app  
✅ No errors in browser console  

---

## Support Resources

- **Full Documentation**: See `NYLAS_DEPLOYMENT_GUIDE.md`
- **Supabase Logs**: Dashboard → Logs → Edge Functions
- **Nylas Dashboard**: https://dashboard.nylas.com
- **Supabase Dashboard**: https://supabase.com/dashboard

---

## Automated Option

If you prefer, you can run the automated deployment script:

```bash
chmod +x DEPLOY_NOW.sh
./DEPLOY_NOW.sh
```

This script will walk you through all the steps interactively.
