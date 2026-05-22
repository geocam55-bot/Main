# 🎯 START HERE - Nylas OAuth Backend Deployment

**Fresh start in your new Codespace!** Follow these steps to deploy your Nylas OAuth backend.

---

## 📚 Which Document Should I Use?

Choose based on your preference:

### 🚀 **Option 1: Automated Script** (Easiest)
**File:** `DEPLOY_NOW.sh`  
**When:** You want an interactive guided deployment  
**How:**
```bash
chmod +x DEPLOY_NOW.sh
./DEPLOY_NOW.sh
```

### ⚡ **Option 2: Quick Commands** (Fastest)
**File:** `QUICK_DEPLOY_COMMANDS.md`  
**When:** You know what you're doing, just need the commands  
**How:** Copy-paste commands one by one

### ☑️ **Option 3: Detailed Checklist** (Most Thorough)
**File:** `DEPLOYMENT_CHECKLIST.md`  
**When:** You want step-by-step with explanations  
**How:** Follow the checklist, check off items as you go

### 📖 **Option 4: Full Documentation** (Reference)
**File:** `NYLAS_DEPLOYMENT_GUIDE.md`  
**When:** You need troubleshooting or deep understanding  
**How:** Read when you encounter issues

---

## ⚡ Super Quick Start (5 minutes)

If you just want to deploy NOW:

### Step 1: Gather Info
- Supabase Project Reference ID: ___________________
- Supabase Project ID: ___________________
- Database Password: ___________________

### Step 2: Run These Commands

```bash
# Install
npm install --save-dev supabase

# Login
npx supabase login

# Link (replace YOUR_PROJECT_REF)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy
npx supabase functions deploy server --no-verify-jwt

# Test (replace YOUR_PROJECT_ID)
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
```

### Step 3: Configure Nylas

Add this URL to Nylas Dashboard → Authentication → Allowed Callback URIs:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/nylas-callback
```

### Step 4: Test in App

Go to your app → Settings → Email Accounts → Connect Email

---

## 🔍 What's Been Fixed?

Your new setup includes:

✅ **Backend-Centric Architecture**  
   - OAuth flow runs entirely through Supabase Edge Functions  
   - No frontend URL in Nylas configuration  
   - Eliminates 401 "Redirect URI not allowed" errors

✅ **Proper File Structure**  
   - `index.ts` entrypoint for Supabase CLI  
   - All routes properly configured in `nylas-oauth.ts`  
   - Config.toml set with `verify_jwt = false`

✅ **Auto-Discovery**  
   - Frontend automatically finds the correct function endpoint  
   - Tries: `server` → `make-server-8405be07` → `nylas-connect`  
   - Health check endpoints for validation

✅ **Comprehensive Error Handling**  
   - Detailed error messages with actionable fixes  
   - Fallback logic for robust connections  
   - Console logging at every step

---

## 🎯 Current File Structure

```
/supabase/functions/server/
├── index.ts                    ✅ CLI entrypoint (deploy this)
├── index.tsx                   ✅ Same as index.ts (for dev)
├── nylas-oauth.ts             ✅ OAuth routes & handlers
├── azure-oauth-init.ts        ✅ Azure integration
├── azure-oauth-callback.ts    ✅ Azure callbacks
├── background-jobs.ts         ✅ Background processing
├── data-migration.ts          ✅ Data utilities
├── fix-profile-mismatch.ts   ✅ Profile sync
├── reset-password.ts          ✅ Password reset
└── kv_store.tsx               🔒 Protected (DO NOT EDIT)
```

---

## 🧭 Navigation Guide

### Before Deployment
1. Read: `DEPLOYMENT_CHECKLIST.md` (Section: Pre-Deployment)
2. Gather: Project IDs, passwords, API keys
3. Configure: Nylas callback URLs

### During Deployment
1. Use: `QUICK_DEPLOY_COMMANDS.md` or `DEPLOY_NOW.sh`
2. Watch: Terminal output for errors
3. Test: Health endpoints

### After Deployment
1. Test: OAuth flow in your app
2. Verify: Email account connects successfully
3. Monitor: Supabase logs for any issues

### If Issues Occur
1. Check: `DEPLOYMENT_CHECKLIST.md` (Section: Troubleshooting)
2. View: Function logs with `npx supabase functions logs server`
3. Read: `NYLAS_DEPLOYMENT_GUIDE.md` for detailed explanations

---

## 🆘 Common Issues & Quick Fixes

### "entrypoint path does not exist"
```bash
# You're not in the project root
pwd  # Check current directory
cd /workspaces/[your-repo-name]  # Navigate to root
```

### "not logged in"
```bash
npx supabase login
```

### "Redirect URI not allowed"
- The URL you need to add to Nylas is in the error message
- Go to Nylas Dashboard → Authentication
- Add the exact URL shown in the error

### Health check fails (404)
- Wait 30 seconds after deployment
- Verify project ID is correct
- Try: `npx supabase functions list` to confirm deployment

### OAuth popup blocked
- Allow popups for your app domain
- Try again

---

## ✅ Success Indicators

You'll know it worked when:

1. **Deployment succeeds:**
   ```
   Deployed server to: https://[project-id].supabase.co/functions/v1/server
   ```

2. **Health check passes:**
   ```json
   {"status":"ok","timestamp":"..."}
   ```

3. **OAuth flow works:**
   - Popup opens with Google/Microsoft login
   - After login, popup closes automatically
   - Email account shows "Connected" ✅

4. **No errors in:**
   - Terminal during deployment
   - Browser console during OAuth
   - Supabase logs (Dashboard → Logs)

---

## 🎉 Ready to Deploy?

Choose your path:

- **Interactive guide:** `./DEPLOY_NOW.sh`
- **Quick commands:** Open `QUICK_DEPLOY_COMMANDS.md`
- **Detailed walkthrough:** Open `DEPLOYMENT_CHECKLIST.md`

---

## 📞 Still Need Help?

1. **Check logs:**
   ```bash
   npx supabase functions logs server
   ```

2. **View deployed functions:**
   ```bash
   npx supabase functions list
   ```

3. **Read full docs:**
   Open `NYLAS_DEPLOYMENT_GUIDE.md`

---

## 🔗 Important Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Nylas Dashboard:** https://dashboard.nylas.com
- **Your Function URL:** `https://[project-id].supabase.co/functions/v1/server`
- **Callback URL:** `https://[project-id].supabase.co/functions/v1/nylas-callback`

---

**Good luck! 🚀**
