# ⚡ Quick Deploy Commands

Copy and paste these commands in sequence. Replace placeholders with your actual values.

---

## 1️⃣ Install CLI

```bash
npm install --save-dev supabase
```

---

## 2️⃣ Login

```bash
npx supabase login
```

---

## 3️⃣ Link Project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF_HERE
```

**Find your ref:** Supabase Dashboard → Project Settings → General → Reference ID

---

## 4️⃣ Deploy

```bash
npx supabase functions deploy server --no-verify-jwt
```

---

## 5️⃣ Test

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/server/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

---

## 🔧 If Errors Occur

### View logs:
```bash
npx supabase functions logs server
```

### Verify file exists:
```bash
ls supabase/functions/server/index.ts
```

### Check login status:
```bash
npx supabase projects list
```

### Redeploy:
```bash
npx supabase functions deploy server --no-verify-jwt
```

---

## ✅ Success Checklist

- [ ] CLI installed (no errors from install command)
- [ ] Logged in (browser opened and logged in)
- [ ] Project linked (prompted for password and succeeded)
- [ ] Function deployed (shows "Deployed server to: https://...")
- [ ] Health check passes (returns `{"status":"ok"}`)

---

## 📝 Don't Forget

1. **Add callback URL to Nylas:**
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/nylas-callback
   ```
   Go to: https://dashboard.nylas.com → Your App → Settings → Authentication

2. **Test in your app:**
   - Settings → Email Accounts → Connect Email

---

## 🆘 Still Having Issues?

See full guide: `DEPLOYMENT_CHECKLIST.md`
