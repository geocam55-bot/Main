# Messaging Module - File Locations Map

## 🎯 3 Core Files (Essential)

```
1. src/components/MessagingHub.tsx
   └─ Main React component, 1,600 lines
   └─ Polling every 30 seconds
   └─ UI for customer conversations, internal chat, portal users

2. src/utils/portal-client.ts
   └─ API wrapper module, 350 lines
   └─ 20+ exported functions for messaging operations
   └─ Handles request/response to backend

3. src/supabase/functions/server/customer-portal-api.ts
   └─ Hono backend routes, 1,672 lines
   └─ 20+ HTTP endpoints (POST/GET)
   └─ KV store operations
```

---

## 📂 Complete File Listing

### Frontend Components
```
src/components/
├── MessagingHub.tsx ⭐ PRIMARY
│   - Main CRM messaging interface
│   - 3-tab UI: Customer | Internal | Portal Users
│   - Handles replies, notes, status, attachments
│   - useEffect polling every 30 seconds
│   - Mobile responsive split view
│
└── portal/
    ├── PortalMessages.tsx
    │   - Customer-facing messaging UI
    │   - Shows conversations with team
    │   - Can view internal notes (visible to portal)
    │
    └── PortalMessagesAdmin.tsx
        - Admin interface for portal messages
```

### Client/Utilities
```
src/utils/
├── portal-client.ts ⭐ PRIMARY
│   - Unified API wrapper
│   - Exports functions for all messaging operations
│   - Session management (portal & CRM)
│   - File attachment handling
│
├── server-function-url.ts (indirect dependency)
│   - Helper to build backend endpoint URLs
│
└── server-headers.ts (indirect dependency)
    - Helper to create auth headers
```

### Backend Services
```
src/supabase/functions/server/
├── customer-portal-api.ts ⭐ PRIMARY
│   - Hono web framework routes
│   - All /portal/* endpoints
│   - KV store integration
│   - Attachment signing
│   - Authentication logic
│   - 1,672 lines of route handlers
│
├── kv_store.tsx
│   - KV store helper functions
│   - Abstracts Deno KV operations
│   - Used by customer-portal-api.ts
│
└── auth-helper.ts
    - extractUserToken() function
    - Validates Bearer tokens
    - Used by all protected endpoints
```

### Documentation Files
```
src/
├── MESSAGING_MODULE_ROLLOUT.md
│   - Feature overview document
│   - MVP implementation details
│   - CRM & Portal features listed
│
├── MESSAGING_STRUCTURE.md (created)
│   - Complete architecture guide
│   - Data structures & flows
│   - Security & error handling
│   - Future improvements
│
├── MESSAGING_FILE_STRUCTURE.md (created)
│   - Visual diagrams
│   - Component interaction map
│   - Data flow visualization
│   - Endpoint summary table
│
└── MESSAGING_QUICK_REFERENCE.md (created)
    - Quick lookup guide
    - Common issues & solutions
    - Integration checklist
    - Performance notes
```

---

## 🔍 Find It Fast

### By Feature

**Want to modify messaging UI?**
→ `src/components/MessagingHub.tsx`

**Need to add a new messaging endpoint?**
→ `src/supabase/functions/server/customer-portal-api.ts`

**Need to call a messaging API?**
→ Use functions exported from `src/utils/portal-client.ts`

**Portal user messaging UI?**
→ `src/components/portal/PortalMessages.tsx`

**Understand the data structure?**
→ `MESSAGING_STRUCTURE.md` (Data Storage section)

**Visual architecture?**
→ `MESSAGING_FILE_STRUCTURE.md` (Diagrams section)

**Quick lookup?**
→ `MESSAGING_QUICK_REFERENCE.md`

---

## 📊 File Relationships

```
MessagingHub.tsx
    ↓ imports functions from
portal-client.ts
    ↓ makes HTTP requests to
customer-portal-api.ts
    ↓ uses helper modules
kv_store.tsx  +  auth-helper.ts
    ↓
Deno KV Store + Supabase Storage
```

---

## 🔑 Key Implementation Details by File

### MessagingHub.tsx
- **Line 1-45**: Imports and types
- **Line 45-75**: Interface and initial state
- **Line 100-116**: Presence sync function
- **Line 118-210**: Load data function (main polling logic)
- **Line 212-230**: useEffect for 30-second polling
- **Line 242-400**: Helper functions and event handlers
- **Line 400-800**: Send functions (reply, DM, notes)
- **Line 800-900**: Render sidebar
- **Line 900-1300**: Render chat area
- **Line 1300-1500**: Render message bubbles
- **Line 1500-1620**: Dialog for new chat

### portal-client.ts
- **Line 1-50**: Imports and constants
- **Line 22-45**: Portal session management (local storage)
- **Line 50-75**: Shared fetch helper with auth
- **Line 78-115**: Portal auth functions (login/register)
- **Line 119-201**: Data fetching functions
- **Line 155-180**: Attachment upload
- **Line 203-350**: CRM-side functions (reply, notes, chats, status)

### customer-portal-api.ts
- **Line 1-115**: Helper functions (hash, token, attachments)
- **Line 117-120**: Main export function and PREFIX
- **Line 121-270**: POST /invite endpoint
- **Line 274-345**: POST /register endpoint
- **Line 349-440**: POST /login endpoint
- **Line 442-550**: POST /logout endpoint
- **Line 551-630**: POST /attachments endpoint
- **Line 806-840**: GET /messages endpoint
- **Line 842-920**: POST /messages endpoint
- **Line 1122-1207**: GET /portal-users endpoint
- **Line 1209-1275**: GET /crm-messages endpoint ⭐ MAIN POLLING
- **Line 1276-1340**: POST /reply endpoint
- **Line 1339-1392**: POST /internal-note endpoint
- **Line 1393-1442**: POST /status endpoint
- **Line 1442-1575**: GET|POST /internal-chats endpoints

---

## 🚀 Quick Start Locations

**To add a new feature:**
1. Add UI in → `MessagingHub.tsx`
2. Add API call in → `portal-client.ts`
3. Add backend route in → `customer-portal-api.ts`

**To debug polling:**
→ Check `MessagingHub.tsx` line 212-230 and Network tab (every 30s)

**To modify message structure:**
→ Update KV schema in `customer-portal-api.ts` line 7-15 comments

**To change attachment handling:**
→ See `customer-portal-api.ts` lines 50-115 (helper functions)

---

## 📈 File Size Reference

| File | Lines | Type |
|------|-------|------|
| MessagingHub.tsx | ~1,600 | React Component |
| customer-portal-api.ts | ~1,672 | Hono Routes |
| portal-client.ts | ~350 | API Wrapper |
| PortalMessages.tsx | ~500 | React Component |
| kv_store.tsx | ~100 | Helper Module |
| auth-helper.ts | ~50 | Helper Module |

**Total Messaging Code**: ~4,272 lines

---

## 🔐 Access & Permissions

| File | Edit Permission | Used By |
|------|-----------------|---------|
| MessagingHub.tsx | Frontend devs | CRM app |
| portal-client.ts | Frontend devs | MessagingHub & portal |
| customer-portal-api.ts | Backend devs | All clients |
| kv_store.tsx | Backend devs | Backend only |
| auth-helper.ts | Backend devs | Backend only |
| PortalMessages.tsx | Frontend devs | Portal pages |

---

## 📝 Documentation Index

| Document | Purpose | Read When |
|----------|---------|-----------|
| MESSAGING_MODULE_ROLLOUT.md | Feature overview | New to system |
| MESSAGING_STRUCTURE.md | Full architecture | Deep dive needed |
| MESSAGING_FILE_STRUCTURE.md | Visual diagrams | Need architecture view |
| MESSAGING_QUICK_REFERENCE.md | Quick lookup | Need specific info |
| **This file** | File locations | Need to find something |

---

## ✅ File Checklist

- [x] `MessagingHub.tsx` - Main component
- [x] `portal-client.ts` - API wrapper
- [x] `customer-portal-api.ts` - Backend
- [x] `PortalMessages.tsx` - Portal UI
- [x] `kv_store.tsx` - Helper
- [x] `auth-helper.ts` - Helper
- [x] `MESSAGING_MODULE_ROLLOUT.md` - Docs
- [x] `MESSAGING_STRUCTURE.md` - Architecture
- [x] `MESSAGING_FILE_STRUCTURE.md` - Diagrams
- [x] `MESSAGING_QUICK_REFERENCE.md` - Reference

**All key files documented and located ✓**

---

**Last Updated**: April 11, 2026
**Created For**: Codebase Navigation
**Status**: Complete
