# 🎯 Command Reference Card

## Essential Commands

### Installation
```bash
npm install --save-dev supabase
```

### Authentication
```bash
# Login
npx supabase login

# Check login status
npx supabase projects list
```

### Project Management
```bash
# Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Check current link
npx supabase status
```

### Deployment
```bash
# Deploy server function
npx supabase functions deploy server --no-verify-jwt

# Deploy with custom import map
npx supabase functions deploy server --no-verify-jwt --import-map supabase/functions/import_map.json

# List all functions
npx supabase functions list

# Delete a function
npx supabase functions delete server
```

### Monitoring
```bash
# View logs (real-time)
npx supabase functions logs server --follow

# View last 100 log lines
npx supabase functions logs server --limit 100

# View logs from specific time
npx supabase functions logs server --since 1h
```

### Testing
```bash
# Health check
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health

# Nylas health check
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/nylas-health

# Test with auth token
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","email":"test@gmail.com"}'
```

### Validation
```bash
# Pre-deployment check
chmod +x PRE_DEPLOY_CHECK.sh
./PRE_DEPLOY_CHECK.sh

# Verify file structure
ls -la supabase/functions/server/
```

### Automated Scripts
```bash
# Make scripts executable
chmod +x DEPLOY_NOW.sh PRE_DEPLOY_CHECK.sh

# Run automated deployment
./DEPLOY_NOW.sh

# Run validation
./PRE_DEPLOY_CHECK.sh
```

---

## Common Workflows

### First-Time Deployment
```bash
# 1. Validate
./PRE_DEPLOY_CHECK.sh

# 2. Install
npm install --save-dev supabase

# 3. Login
npx supabase login

# 4. Link
npx supabase link --project-ref YOUR_PROJECT_REF

# 5. Deploy
npx supabase functions deploy server --no-verify-jwt

# 6. Test
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
```

### Re-Deployment (After Code Changes)
```bash
# 1. Deploy
npx supabase functions deploy server --no-verify-jwt

# 2. Test
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health

# 3. Monitor
npx supabase functions logs server --follow
```

### Debugging
```bash
# 1. Check deployment status
npx supabase functions list

# 2. View recent logs
npx supabase functions logs server --limit 50

# 3. Test endpoints
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/nylas-health

# 4. Check file structure
ls -la supabase/functions/server/

# 5. Verify login
npx supabase projects list
```

---

## Environment Setup

### Project URLs
```bash
# Function URL
https://YOUR_PROJECT_ID.supabase.co/functions/v1/server

# Callback URL (for Nylas)
https://YOUR_PROJECT_ID.supabase.co/functions/v1/nylas-callback

# Health endpoint
https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health

# Nylas health endpoint
https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/nylas-health
```

### Finding Your IDs
```bash
# Project Reference ID
# Location: Supabase Dashboard → Project Settings → General → Reference ID

# Project ID (for URLs)
# Location: Your project URL - https://[THIS-PART].supabase.co
```

---

## Error Resolution

### "entrypoint path does not exist"
```bash
# Check file exists
ls -la supabase/functions/server/index.ts

# Verify you're in project root
pwd

# Should output something like: /workspaces/your-repo-name
```

### "not logged in"
```bash
npx supabase login
```

### "project not linked"
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Function not responding (404)
```bash
# Wait 30 seconds after deployment
sleep 30

# Try again
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health

# Check it deployed
npx supabase functions list
```

### "Failed to deploy"
```bash
# Check logs for errors
npx supabase functions logs server

# Verify file syntax
cat supabase/functions/server/index.ts | grep "Deno.serve"

# Try redeploying
npx supabase functions deploy server --no-verify-jwt
```

---

## Quick Tests

### Test 1: CLI Installation
```bash
npx supabase --version
# Expected: v1.x.x
```

### Test 2: Login Status
```bash
npx supabase projects list
# Expected: List of your projects
```

### Test 3: File Structure
```bash
ls supabase/functions/server/index.ts
# Expected: supabase/functions/server/index.ts
```

### Test 4: Health Check
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Test 5: Nylas Health
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/nylas-health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Useful Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Supabase aliases
alias supa='npx supabase'
alias supa-deploy='npx supabase functions deploy server --no-verify-jwt'
alias supa-logs='npx supabase functions logs server --follow'
alias supa-list='npx supabase functions list'

# Project-specific (replace YOUR_PROJECT_ID)
alias health-check='curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health'
alias nylas-health='curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/nylas-health'
```

Then reload: `source ~/.bashrc`

Usage:
```bash
supa-deploy    # Deploy
supa-logs      # View logs
health-check   # Test health
```

---

## Tips & Tricks

### Faster Deployments
```bash
# Skip JWT verification (faster, but less secure for dev)
npx supabase functions deploy server --no-verify-jwt

# Deploy multiple functions at once
npx supabase functions deploy server azure-oauth-callback
```

### Better Log Viewing
```bash
# Follow logs (like tail -f)
npx supabase functions logs server --follow

# Show only errors
npx supabase functions logs server | grep ERROR

# Show last 200 lines
npx supabase functions logs server --limit 200
```

### Quick Health Checks
```bash
# One-liner to test all endpoints
curl -s https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health && \
curl -s https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/nylas-health
```

### Watch Deployment
```bash
# Deploy and immediately start watching logs
npx supabase functions deploy server --no-verify-jwt && \
npx supabase functions logs server --follow
```

---

## Copy-Paste Templates

### Complete First Deployment
```bash
# Copy this entire block and replace YOUR_PROJECT_REF and YOUR_PROJECT_ID

npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy server --no-verify-jwt
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
```

### Debug Flow
```bash
# Copy this when something's not working

echo "=== Checking deployment ==="
npx supabase functions list

echo -e "\n=== Testing health endpoint ==="
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health

echo -e "\n=== Viewing recent logs ==="
npx supabase functions logs server --limit 20

echo -e "\n=== Verifying file structure ==="
ls -la supabase/functions/server/
```

---

## Documentation Quick Links

```bash
# View deployment guide
cat NYLAS_DEPLOYMENT_GUIDE.md | less

# View quick commands
cat QUICK_DEPLOY_COMMANDS.md

# View checklist
cat DEPLOYMENT_CHECKLIST.md

# View architecture
cat ARCHITECTURE.md
```

---

## Getting Help

### Check These First
1. `npx supabase functions logs server`
2. `npx supabase functions list`
3. `./PRE_DEPLOY_CHECK.sh`

### Then Consult
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step guide
- `NYLAS_DEPLOYMENT_GUIDE.md` - Full documentation
- Supabase Dashboard → Logs → Edge Functions

### External Resources
- Supabase Docs: https://supabase.com/docs/guides/functions
- Nylas Docs: https://developer.nylas.com/docs/
- Deno Docs: https://deno.land/manual
