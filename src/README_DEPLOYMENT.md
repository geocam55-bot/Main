# 📦 Nylas OAuth Backend - Complete Deployment Package

Welcome to your fresh Codespace! This package contains everything you need to deploy the Nylas OAuth backend successfully.

---

## 📁 What's in This Package?

### 🚀 Quick Start Files

| File | Purpose | Use When |
|------|---------|----------|
| `START_HERE.md` | **Main entry point** - Read this first | Starting deployment |
| `QUICK_DEPLOY_COMMANDS.md` | Copy-paste commands | You want the fastest path |
| `DEPLOY_NOW.sh` | Automated deployment script | You want interactive guidance |
| `PRE_DEPLOY_CHECK.sh` | Validation script | Before deploying |

### 📚 Documentation Files

| File | Purpose | Use When |
|------|---------|----------|
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist | You want thorough guidance |
| `NYLAS_DEPLOYMENT_GUIDE.md` | Complete documentation | You need deep understanding |
| `ARCHITECTURE.md` | System architecture diagrams | You want to understand how it works |

### 💻 Source Code

| Directory/File | Purpose |
|----------------|---------|
| `/supabase/functions/server/index.ts` | **Entrypoint** - Main server file |
| `/supabase/functions/server/nylas-oauth.ts` | Nylas OAuth routes |
| `/supabase/functions/server/kv_store.tsx` | 🔒 Protected - DO NOT EDIT |
| `/supabase/config.toml` | Function configuration |

---

## 🎯 Recommended Path

### For First-Time Deployers
1. **Read:** `START_HERE.md`
2. **Run:** `./PRE_DEPLOY_CHECK.sh`
3. **Follow:** `DEPLOYMENT_CHECKLIST.md`
4. **Reference:** `NYLAS_DEPLOYMENT_GUIDE.md` if issues arise

### For Experienced Deployers
1. **Run:** `./PRE_DEPLOY_CHECK.sh`
2. **Use:** `QUICK_DEPLOY_COMMANDS.md`
3. **Test:** Health endpoints

### For Automated Deployment
1. **Make executable:** `chmod +x DEPLOY_NOW.sh`
2. **Run:** `./DEPLOY_NOW.sh`
3. **Follow prompts**

---

## ⚡ 60-Second Quick Start

```bash
# 1. Validate
chmod +x PRE_DEPLOY_CHECK.sh
./PRE_DEPLOY_CHECK.sh

# 2. Install CLI
npm install --save-dev supabase

# 3. Login
npx supabase login

# 4. Link project (replace YOUR_PROJECT_REF)
npx supabase link --project-ref YOUR_PROJECT_REF

# 5. Deploy
npx supabase functions deploy server --no-verify-jwt

# 6. Test (replace YOUR_PROJECT_ID)
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

---

## 📋 Pre-Deployment Checklist

Before you start, make sure you have:

- [ ] Supabase project created
- [ ] Project Reference ID (from Supabase Dashboard)
- [ ] Database password (from when you created the project)
- [ ] Nylas account and API keys
- [ ] All secrets set in Supabase Dashboard

### Required Supabase Secrets

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Verify these exist:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NYLAS_API_KEY`
- `NYLAS_CLIENT_ID`

### Required Nylas Configuration

Go to: **https://dashboard.nylas.com → Your App → Settings → Authentication**

Add to **Allowed Callback URIs**:
```
https://[YOUR-PROJECT-ID].supabase.co/functions/v1/nylas-callback
```

---

## 🔍 Validation Before Deploy

Run the pre-deployment check:

```bash
chmod +x PRE_DEPLOY_CHECK.sh
./PRE_DEPLOY_CHECK.sh
```

This will verify:
- ✅ Project structure is correct
- ✅ All required files exist
- ✅ Configuration is valid
- ✅ Dependencies are available

If all checks pass, you're ready to deploy!

---

## 🚢 Deployment Options

### Option 1: Automated Script (Recommended for First-Time)

```bash
chmod +x DEPLOY_NOW.sh
./DEPLOY_NOW.sh
```

**Pros:**
- Interactive prompts
- Built-in validation
- Automatic testing
- Helpful error messages

**Cons:**
- Slower than manual

---

### Option 2: Manual Commands (Fastest)

Follow commands in `QUICK_DEPLOY_COMMANDS.md`:

```bash
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy server --no-verify-jwt
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
```

**Pros:**
- Fastest path
- Full control
- Good for re-deployments

**Cons:**
- No validation
- Easy to miss steps

---

### Option 3: Guided Checklist

Open `DEPLOYMENT_CHECKLIST.md` and follow step-by-step.

**Pros:**
- Thorough guidance
- Check off items as you go
- Good for learning

**Cons:**
- Takes longer
- Requires reading

---

## 🧪 Testing Your Deployment

### Test 1: Health Check

```bash
curl https://[YOUR-PROJECT-ID].supabase.co/functions/v1/server/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2026-02-17T..."}
```

### Test 2: Nylas Health Check

```bash
curl https://[YOUR-PROJECT-ID].supabase.co/functions/v1/server/nylas-health
```

**Expected:**
```json
{"status":"ok","timestamp":"2026-02-17T..."}
```

### Test 3: OAuth Flow

1. Open your app
2. Go to Settings → Email Accounts
3. Click "Connect Email"
4. Select Gmail or Outlook
5. Authorize in popup
6. Popup should close automatically
7. Account should show as "Connected"

---

## 🆘 Troubleshooting

### Deployment Fails

| Error | Solution |
|-------|----------|
| "entrypoint path does not exist" | Run: `./PRE_DEPLOY_CHECK.sh` to verify structure |
| "not logged in" | Run: `npx supabase login` |
| "project not linked" | Run: `npx supabase link --project-ref YOUR_REF` |
| "npm not found" | Install Node.js: https://nodejs.org/ |

### Health Check Fails

| Issue | Solution |
|-------|----------|
| 404 Not Found | Wait 30 seconds, deployment may still be processing |
| Connection refused | Verify project ID is correct |
| Timeout | Check Supabase project is active (not paused) |

### OAuth Fails

| Error | Solution |
|-------|----------|
| "Redirect URI not allowed" | Add callback URL to Nylas Dashboard |
| "401 Unauthorized" | Log out and back in to your app |
| "Popup blocked" | Allow popups for your app domain |
| "Failed to fetch" | Check function deployed: `npx supabase functions list` |

---

## 📊 Deployment Success Indicators

You'll know everything worked when:

1. **CLI shows success:**
   ```
   ✅ Deployed server to: https://[project-id].supabase.co/functions/v1/server
   ```

2. **Health check passes:**
   ```
   ✅ {"status":"ok"}
   ```

3. **OAuth works:**
   - ✅ Popup opens with provider login
   - ✅ After login, popup closes
   - ✅ Email account shows "Connected"
   - ✅ No errors in console

4. **Logs are clean:**
   ```bash
   npx supabase functions logs server
   # Should show successful requests, no errors
   ```

---

## 📖 Learning Resources

### Understanding the Architecture

Read `ARCHITECTURE.md` to understand:
- How the OAuth flow works
- What each component does
- Security features
- Data flow diagrams

### Deep Dive Documentation

Read `NYLAS_DEPLOYMENT_GUIDE.md` for:
- Detailed troubleshooting
- Environment variable setup
- Monitoring and logging
- Performance considerations

### Code Structure

```
/supabase/functions/server/
├── index.ts              ← YOU ARE HERE (entrypoint)
├── nylas-oauth.ts        ← OAuth routes (init, callback, token exchange)
├── azure-oauth-init.ts   ← Azure OAuth
├── azure-oauth-callback.ts
├── background-jobs.ts    ← Scheduled tasks
├── data-migration.ts     ← Data utilities
├── fix-profile-mismatch.ts
├── reset-password.ts
└── kv_store.tsx          ← 🔒 PROTECTED - DO NOT EDIT
```

---

## 🔄 Re-Deployment

If you make changes and need to redeploy:

```bash
# 1. Make your code changes
# 2. Redeploy (don't need to re-link)
npx supabase functions deploy server --no-verify-jwt

# 3. Test
curl https://[PROJECT-ID].supabase.co/functions/v1/server/health

# 4. Check logs
npx supabase functions logs server
```

---

## 🎉 Next Steps After Successful Deployment

1. **Test all OAuth providers:**
   - Gmail
   - Outlook
   - Apple Mail (if configured)

2. **Monitor logs:**
   - Dashboard → Logs → Edge Functions
   - Look for any errors or warnings

3. **Set up email sync:**
   - Your sync functions should work automatically
   - Test by sending/receiving emails

4. **Configure webhooks (optional):**
   - For real-time email notifications
   - See Nylas documentation

5. **Production considerations:**
   - Set up monitoring alerts
   - Review rate limits
   - Plan for scaling

---

## 📞 Getting Help

### 1. Check Logs First

```bash
npx supabase functions logs server --follow
```

### 2. Verify Deployment

```bash
npx supabase functions list
```

### 3. Test Endpoints

```bash
# Health
curl https://[PROJECT-ID].supabase.co/functions/v1/server/health

# Nylas health
curl https://[PROJECT-ID].supabase.co/functions/v1/server/nylas-health
```

### 4. Review Documentation

- `NYLAS_DEPLOYMENT_GUIDE.md` - Complete troubleshooting guide
- `ARCHITECTURE.md` - Understand the system
- Supabase Docs: https://supabase.com/docs
- Nylas Docs: https://developer.nylas.com/docs/

---

## 🔗 Important Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Nylas Dashboard:** https://dashboard.nylas.com
- **Function URL:** `https://[project-id].supabase.co/functions/v1/server`
- **Callback URL:** `https://[project-id].supabase.co/functions/v1/nylas-callback`

---

## 📝 File Quick Reference

```bash
# Pre-deployment validation
./PRE_DEPLOY_CHECK.sh

# Automated deployment
./DEPLOY_NOW.sh

# Quick commands
cat QUICK_DEPLOY_COMMANDS.md

# Detailed checklist
cat DEPLOYMENT_CHECKLIST.md

# Full documentation
cat NYLAS_DEPLOYMENT_GUIDE.md

# Architecture diagrams
cat ARCHITECTURE.md

# This file
cat README_DEPLOYMENT.md
```

---

## ✅ Final Checklist

Before you start:
- [ ] Read `START_HERE.md`
- [ ] Run `./PRE_DEPLOY_CHECK.sh`
- [ ] Have all credentials ready
- [ ] Nylas callback URL configured

During deployment:
- [ ] CLI installed successfully
- [ ] Logged in to Supabase
- [ ] Project linked
- [ ] Function deployed without errors

After deployment:
- [ ] Health check passes
- [ ] Nylas health check passes
- [ ] OAuth flow works end-to-end
- [ ] No errors in logs

---

**Good luck with your deployment! 🚀**

If you get stuck, remember:
1. Check `START_HERE.md` for guidance
2. Run `./PRE_DEPLOY_CHECK.sh` to validate
3. Review `DEPLOYMENT_CHECKLIST.md` for detailed steps
4. Consult `NYLAS_DEPLOYMENT_GUIDE.md` for troubleshooting
