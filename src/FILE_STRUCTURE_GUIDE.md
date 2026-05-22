# 📂 Complete File Structure Guide

## Deployment Documentation Files

```
/
├── START_HERE.md                    ⭐ READ THIS FIRST
├── README_DEPLOYMENT.md             📖 Complete overview
├── QUICK_DEPLOY_COMMANDS.md         ⚡ Fast command reference
├── DEPLOYMENT_CHECKLIST.md          ☑️  Step-by-step guide
├── NYLAS_DEPLOYMENT_GUIDE.md        📚 Full documentation
├── ARCHITECTURE.md                  🏗️  System architecture
├── COMMAND_REFERENCE.md             🎯 Command quick reference
├── FILE_STRUCTURE_GUIDE.md          📂 This file
├── DEPLOY_NOW.sh                    🤖 Automated deployment script
└── PRE_DEPLOY_CHECK.sh              🔍 Validation script
```

---

## Supabase Edge Function Files

### Main Server Function

```
/supabase/functions/server/
├── index.ts                         🎯 ENTRYPOINT (CLI requires this)
├── index.tsx                        📝 Same as index.ts (for dev)
├── nylas-oauth.ts                   🔐 Nylas OAuth implementation
├── azure-oauth-init.ts              ☁️  Azure OAuth init
├── azure-oauth-callback.ts          ☁️  Azure OAuth callback
├── background-jobs.ts               ⏰ Background job handlers
├── data-migration.ts                🔄 Data migration utilities
├── fix-profile-mismatch.ts         🔧 Profile sync fixes
├── reset-password.ts                🔑 Password reset handler
└── kv_store.tsx                     🔒 PROTECTED - DO NOT EDIT
```

### Other Edge Functions

```
/supabase/functions/
├── azure-oauth-callback/
│   └── index.ts                     ☁️  Standalone Azure callback
├── azure-send-email/
│   └── index.ts                     📧 Azure email sender
├── azure-sync-emails/
│   └── index.ts                     🔄 Azure email sync
├── calendar-oauth-callback/
│   └── index.ts                     📅 Calendar OAuth callback
├── calendar-oauth-init/
│   └── index.ts                     📅 Calendar OAuth init
├── calendar-sync/
│   └── index.ts                     🔄 Calendar sync
├── nylas-callback/
│   └── index.ts                     🎯 Nylas OAuth callback (LEGACY)
├── nylas-connect/
│   └── index.ts                     🔌 Nylas connect (LEGACY)
├── nylas-sync-emails/
│   └── index.ts                     📬 Email sync handler
└── ... (other functions)
```

**Note:** The `/server` function is the NEW backend-centric architecture. Legacy functions (`nylas-connect`, `nylas-callback`) are kept for backward compatibility.

---

## Configuration Files

```
/supabase/
├── config.toml                      ⚙️  Supabase configuration
│   ├── [functions.server]
│   │   └── verify_jwt = false       ← Important!
│   ├── [functions.nylas-callback]
│   └── [functions.nylas-connect]
└── README.md                        📖 Supabase setup guide
```

---

## Frontend Components (Email/Calendar)

```
/components/
├── EmailAccountSetup.tsx            📧 Email OAuth UI
│   ├── findActiveFunctionName()     🔍 Auto-discovery
│   ├── handleOAuthProvider()        🔐 OAuth init
│   └── postMessage handler          💬 Callback handling
│
├── CalendarAccountSetup.tsx         📅 Calendar OAuth UI
├── EmailDebug.tsx                   🐛 Email debugging tools
├── EmailTester.tsx                  🧪 Email testing interface
├── NylasCallback.tsx                🔄 OAuth callback handler
└── Email.tsx                        📬 Email management UI
```

---

## File Purpose & Importance

### ⭐ Critical Files (DO NOT DELETE)

| File | Purpose | Why Critical |
|------|---------|--------------|
| `index.ts` | Function entrypoint | Required by Supabase CLI |
| `nylas-oauth.ts` | OAuth implementation | Handles entire auth flow |
| `kv_store.tsx` | Key-value storage | Protected system file |
| `config.toml` | Function config | Defines function settings |

### 📝 Important Files (Should Not Modify)

| File | Purpose | Notes |
|------|---------|-------|
| `index.tsx` | Dev version of index.ts | Keep in sync with index.ts |
| `ImageWithFallback.tsx` | Image component | Protected system file |
| `supabase/info.tsx` | Supabase config | Auto-generated |

### ✏️ Editable Files (Safe to Modify)

| File | Purpose | When to Edit |
|------|---------|--------------|
| `nylas-oauth.ts` | OAuth routes | Add features, fix bugs |
| `azure-oauth-init.ts` | Azure OAuth | Customize Azure flow |
| `background-jobs.ts` | Background tasks | Add new jobs |
| `EmailAccountSetup.tsx` | Email UI | Improve user experience |

---

## File Relationships

### Deployment Flow

```
PRE_DEPLOY_CHECK.sh
    │
    ├─ Validates: index.ts exists
    ├─ Validates: config.toml correct
    └─ Validates: All route files present
    │
    ▼
DEPLOY_NOW.sh
    │
    ├─ Installs: Supabase CLI
    ├─ Runs: supabase login
    ├─ Runs: supabase link
    └─ Runs: supabase functions deploy server
    │
    ▼
index.ts (deployed)
    │
    ├─ Imports: nylas-oauth.ts
    ├─ Imports: azure-oauth-init.ts
    ├─ Imports: background-jobs.ts
    └─ Starts: Deno.serve(app.fetch)
```

### OAuth Flow

```
EmailAccountSetup.tsx
    │
    ├─ Calls: findActiveFunctionName()
    │   └─ Tests: /server/nylas-health
    │
    ├─ Calls: POST /server
    │   └─ index.ts → nylas-oauth.ts → initHandler()
    │
    ├─ Opens: popup with authUrl
    │
    ▼
Nylas OAuth
    │
    ├─ User authorizes
    │
    ├─ Redirects: /nylas-callback?code=xxx
    │   └─ index.ts → nylas-oauth.ts → callbackHandler()
    │
    └─ Returns: HTML with postMessage
    │
    ▼
EmailAccountSetup.tsx
    │
    └─ Receives: postMessage event
        └─ Updates UI
```

---

## File Size Reference

### Typical Sizes

```
index.ts                    ~1 KB     (33 lines)
nylas-oauth.ts             ~15 KB     (420 lines)
EmailAccountSetup.tsx      ~25 KB     (600+ lines)
DEPLOYMENT_CHECKLIST.md    ~8 KB      (documentation)
NYLAS_DEPLOYMENT_GUIDE.md  ~35 KB     (comprehensive guide)
```

### Bundle Sizes (Deployed)

```
server function bundle      ~50-100 KB (minified)
```

---

## Where to Find Things

### Need to...

**Deploy the function?**
- Use: `DEPLOY_NOW.sh` or `QUICK_DEPLOY_COMMANDS.md`

**Understand the architecture?**
- Read: `ARCHITECTURE.md`

**Troubleshoot deployment issues?**
- Check: `DEPLOYMENT_CHECKLIST.md` (Troubleshooting section)
- Check: `NYLAS_DEPLOYMENT_GUIDE.md` (Troubleshooting section)

**Modify OAuth flow?**
- Edit: `supabase/functions/server/nylas-oauth.ts`
- Edit: `components/EmailAccountSetup.tsx`

**Change callback URL?**
- Edit: `nylas-oauth.ts` line 9 (MANUAL_CALLBACK_URL)
- Or configure in Nylas Dashboard

**Add new routes?**
- Edit: `supabase/functions/server/index.ts`
- Create new route file (e.g., `my-route.ts`)
- Import in `index.ts`

**View logs?**
- Run: `npx supabase functions logs server`
- Or: Supabase Dashboard → Logs → Edge Functions

**Test deployment?**
- Run: `curl https://[project-id].supabase.co/functions/v1/server/health`

---

## File Dependencies

### index.ts Dependencies

```typescript
index.ts
├── npm:hono                       (Hono framework)
├── npm:hono/cors                  (CORS middleware)
├── npm:hono/logger                (Logging middleware)
├── ./azure-oauth-init.ts          (Azure OAuth)
├── ./azure-oauth-callback.ts      (Azure callback)
├── ./nylas-oauth.ts               (Nylas OAuth)
├── ./data-migration.ts            (Data utils)
├── ./fix-profile-mismatch.ts      (Profile fixes)
├── ./reset-password.ts            (Password reset)
└── ./background-jobs.ts           (Background tasks)
```

### nylas-oauth.ts Dependencies

```typescript
nylas-oauth.ts
├── npm:hono                       (Hono framework)
└── jsr:@supabase/supabase-js@2    (Supabase client)
```

### Frontend Dependencies

```typescript
EmailAccountSetup.tsx
├── react                          (UI framework)
├── ./utils/supabase/client        (Supabase client)
├── ./utils/supabase/info          (Project config)
└── sonner                         (Toast notifications)
```

---

## Protected Files (DO NOT EDIT)

These files are managed by the system and should not be modified:

```
❌ /components/figma/ImageWithFallback.tsx
❌ /supabase/functions/server/kv_store.tsx
❌ /utils/supabase/info.tsx
```

**Why?** These are part of the Figma Make infrastructure and editing them may break the system.

---

## Backup & Version Control

### What to Commit to Git

```
✅ All deployment docs (*.md files)
✅ Scripts (*.sh files)
✅ Source code (supabase/functions/**)
✅ Configuration (config.toml)
✅ Frontend components (components/**)
```

### What NOT to Commit

```
❌ node_modules/
❌ .env files with secrets
❌ .supabase/ directory (local only)
❌ dist/ or build/ directories
```

### Git Ignore Template

```gitignore
# Dependencies
node_modules/

# Local Supabase
.supabase/

# Environment variables
.env
.env.local

# Build outputs
dist/
build/
.next/

# OS files
.DS_Store
Thumbs.db
```

---

## File Checklist Before Deployment

### Required Files Must Exist

- [ ] `/supabase/functions/server/index.ts`
- [ ] `/supabase/functions/server/nylas-oauth.ts`
- [ ] `/supabase/config.toml`

### Configuration Must Be Correct

- [ ] `config.toml` has `[functions.server]`
- [ ] `config.toml` has `verify_jwt = false`
- [ ] `index.ts` has `Deno.serve(app.fetch)`
- [ ] `index.ts` imports all route files

### Optional But Recommended

- [ ] `DEPLOY_NOW.sh` is executable (`chmod +x`)
- [ ] `PRE_DEPLOY_CHECK.sh` is executable
- [ ] All documentation files present

---

## Quick File Access Commands

```bash
# View entrypoint
cat supabase/functions/server/index.ts

# View OAuth implementation
cat supabase/functions/server/nylas-oauth.ts | less

# View configuration
cat supabase/config.toml

# List all server files
ls -la supabase/functions/server/

# Count lines in each file
wc -l supabase/functions/server/*.ts

# Find specific function
grep -r "initHandler" supabase/functions/server/

# Check for TODO comments
grep -r "TODO" supabase/functions/server/
```

---

## File Validation

### Verify Structure

```bash
# Should all return success
test -f supabase/functions/server/index.ts && echo "✅ index.ts exists"
test -f supabase/functions/server/nylas-oauth.ts && echo "✅ nylas-oauth.ts exists"
test -f supabase/config.toml && echo "✅ config.toml exists"
```

### Verify Content

```bash
# Should all find matches
grep -q "Deno.serve" supabase/functions/server/index.ts && echo "✅ Has Deno.serve"
grep -q "nylasOAuth" supabase/functions/server/index.ts && echo "✅ Imports nylasOAuth"
grep -q "\[functions.server\]" supabase/config.toml && echo "✅ Config has server"
```

---

## Summary

**Total Documentation Files:** 10  
**Total Server Function Files:** 10  
**Total Edge Functions:** 15+  
**Total Frontend Components:** 100+

**Key Insight:** The `/server` function is your main deployment target. It consolidates all backend logic into one Edge Function for better performance and maintainability.

**Remember:** Always start with `START_HERE.md` and run `PRE_DEPLOY_CHECK.sh` before deploying!
