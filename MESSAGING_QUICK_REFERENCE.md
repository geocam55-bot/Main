# Messaging Module - Quick Reference

## Core Files (3 Essential Components)

### 1️⃣ Frontend UI Component
```
src/components/MessagingHub.tsx (1,600 lines)
├─ Main CRM messaging interface
├─ 3-Tab layout: Customer Conversations | Internal Chat | Portal Users
├─ Polls every 30 seconds
└─ Handles: replies, internal notes, status, attachments, presence
```

**Key Functions**:
- `useEffect()` - 30-second polling loop
- `syncCurrentUserPresence()` - Updates last_login
- `loadData()` - Fetches messages/chats/users
- `handleSendReply()` - Send customer reply
- `handleSendToPendingTarget()` - Send DM
- `handleAddInternalNote()` - Staff-only note
- `handleToggleResolved()` - Mark resolved/open
- `handleCreateFollowUpTask()` - Convert to task

---

### 2️⃣ API Client Wrapper
```
src/utils/portal-client.ts (350 lines)
├─ Unified API interface
├─ Base URL: buildServerFunctionUrl('/portal')
└─ Exports 20+ messaging functions
```

**Authentication Functions**:
- `portalLogin(email, password)`
- `portalRegister(inviteCode, password)`
- `portalLogout()`

**CRM-Side Functions** (use Supabase Auth token):
- `getCrmPortalMessages(accessToken)` ⭐ Main polling call
- `getPortalUsers(accessToken)` ⭐ Polling call
- `getInternalChats(accessToken)` ⭐ Polling call
- `replyToPortalMessage(messageId, contactId, reply, token, attachments?)`
- `addPortalInternalNote(messageId, contactId, note, token)`
- `updatePortalThreadStatus(messageId, contactId, status, token)`
- `createInternalChat(payload, token)`
- `sendInternalChatMessage(chatId, message, token)`

**Portal-Side Functions** (use portal token):
- `getPortalMessages()`
- `sendPortalMessage(...)`
- `uploadPortalAttachment(file, opts?, token?)`

---

### 3️⃣ Backend API Handlers
```
src/supabase/functions/server/customer-portal-api.ts (1,672 lines)
├─ Hono Framework (Deno)
├─ Base Path: /make-server-8405be07/portal
└─ Routes: 20+ HTTP endpoints
```

**Key Endpoints**:

**Messaging**:
- `GET /crm-messages` - CRM polls customer messages
- `POST /reply` - CRM replies to customer
- `POST /internal-note` - CRM adds staff note
- `POST /status` - Update message status
- `GET /internal-chats` - CRM polls team chats
- `POST /internal-chats` - Create team chat
- `POST /internal-chats/:id/message` - Send to chat

**Other**:
- `POST|GET /messages*` - Portal user messaging
- `POST /attachments` - File upload
- `POST /invite|register|login|logout` - Auth

**Data Storage**:
- Deno KV Store for all data
- Key format: `type:org:id` or `type:email`

---

## Supporting Files

### Portal UI Components
```
src/components/portal/PortalMessages.tsx (Customer UI)
src/components/portal/PortalMessagesAdmin.tsx (Admin UI)
```

### Backend Helpers
```
src/supabase/functions/server/kv_store.tsx (KV operations)
src/supabase/functions/server/auth-helper.ts (Token validation)
```

### Documentation
```
src/MESSAGING_MODULE_ROLLOUT.md (Feature overview)
MESSAGING_STRUCTURE.md (This guide - full architecture)
MESSAGING_FILE_STRUCTURE.md (Visual diagrams)
```

---

## Quick Search Guide

| Need to find... | Look in... |
|-----------------|-----------|
| **Message UI logic** | `MessagingHub.tsx` lines 1-100 |
| **Polling mechanism** | `MessagingHub.tsx` lines 209-230 |
| **API wrapper** | `portal-client.ts` |
| **Backend routes** | `customer-portal-api.ts` search `app.post\|app.get` |
| **Message structure** | `customer-portal-api.ts` lines 13-15 (comments) or `portal-client.ts` |
| **Attachment handling** | `customer-portal-api.ts` lines 50-115 |
| **KV storage** | `customer-portal-api.ts` lines 7-15 (keys) |
| **Presence tracking** | `MessagingHub.tsx` lines 100-116 |
| **Direct messaging** | `MessagingHub.tsx` lines 584-650 |
| **Internal notes** | `customer-portal-api.ts` search `/internal-note` |

---

## Data Schema (KV Store)

```typescript
// Portal users
portal_user:{email_hash} → {
  email: string
  contactId: string
  orgId: string
  passwordHash: string
  name: string
  createdAt: ISO
  lastLogin: ISO
}

// Messages with threading
portal_message:{org}:{contact}:{id} → {
  id: string
  contactId: string
  orgId: string
  from: 'customer' | 'staff'
  subject: string
  body: string
  status: 'open' | 'resolved'
  createdAt: ISO
  updatedAt?: ISO
  replies: [{id, from, body, senderName, createdAt, attachments}]
  internalNotes: [{id, body, senderName, createdAt}]
  attachments: [{id, name, fileName, filePath, url}]
}

// Team chats
internal_chat:{org}:{id} → {
  id: string
  orgId: string
  title: string
  chatType: 'general' | 'direct' | 'group'
  contextType?: string
  contextLabel?: string  // For routing (critical!)
  messages: [{id, senderId, senderName, body, createdAt}]
  participants: [{id?, name, email?, kind}]
  updatedAt?: ISO
}

// Portal access control
portal_access_log:{org}:{contact} → {
  enabled: boolean
  enabledAt: ISO
  enabledBy: string
  email: string
}
```

---

## Message Send Flow

```
User → MessagingHub.handleSendReply()
  ↓
portal-client.replyToPortalMessage()
  ↓
customer-portal-api.ts POST /reply
  ↓
KV: Update portal_message with new reply array
  ↓
Response success
  ↓
Next poll (≤30s): loadData() fetches updated message
  ↓
MessagingHub renders reply
```

---

## Polling Architecture

```
Start: MessagingHub mounts
  │
  ├─ Immediate: loadData() + syncCurrentUserPresence()
  │
  └─ Then: setInterval(30000) => repeat
     │
     ├─ API 1: getCrmPortalMessages(token)  ← Messages polling
     ├─ API 2: getPortalUsers(token)        ← Users polling
     ├─ API 3: getInternalChats(token)      ← Chats polling
     └─ API 4: usersAPI.getAll()            ← Staff polling
     │
     └─ Update state: setMessages, setInternalChats, setStaffUsers
        │
        └─ Component re-renders

Cleanup: MessagingHub unmounts
  └─ window.clearInterval() stops polling
```

---

## Integration Checklist

- [ ] MessagingHub.tsx renders in CRM main app
- [ ] Portal API backend routes registered
- [ ] KV store initialized with data
- [ ] Attachments bucket configured
- [ ] Portal authentication flow working
- [ ] Polling visible in Network tab (every 30s)
- [ ] Messages display in 30s or less
- [ ] Direct chat routing uses contextLabel (not title)
- [ ] Internal notes hidden from portal users
- [ ] Staff presence updates showing

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Messages not appearing | Check polling interval runs; verify KV store access |
| Old messages showing | Ensure loadData() clears and replaces state |
| Wrong person receives DM | Verify contextLabel used, not chat.title |
| Attachments 404 | Check signed URL expiration (7 days); re-upload |
| Presence not updating | Verify syncCurrentUserPresence() runs; check profiles table RLS |
| Message stuck as "sending" | UI will show once poll completes with new data |

---

## Performance Notes

- **Polling**: 30 seconds = 2 calls/minute per user
- **API Calls**: 4 parallel requests per cycle
- **Typical Response**: <500ms for all 4 endpoints
- **Storage**: KV store (in-memory, fast; not production-grade)
- **Scaling**: Consider Postgres migration for many users

---

**Last Updated**: April 11, 2026
**Status**: Active MVP
