# Messaging Module - File Structure Tree

```
src/
├── components/
│   ├── MessagingHub.tsx ⭐ (Main UI Component - ~1,600 lines)
│   │   ├── 3-tab interface (Customer/Internal/Portal users)
│   │   ├── Message threading & replies
│   │   ├── Internal notes (staff-only)
│   │   ├── Status management (open/resolved)
│   │   ├── Polling every 30 seconds
│   │   └── Mobile-responsive UI
│   │
│   └── portal/
│       ├── PortalMessages.tsx (Customer messaging UI)
│       └── PortalMessagesAdmin.tsx (Admin portal view)
│
├── utils/
│   └── portal-client.ts ⭐ (API Client Layer - ~350 lines)
│       ├── Session management
│       ├── Portal auth (login/register)
│       ├── CRM-side messaging APIs
│       ├── Internal chat APIs
│       └── Attachment handling
│
├── supabase/
│   └── functions/
│       └── server/
│           ├── customer-portal-api.ts ⭐ (Backend Handlers - ~1,672 lines)
│           │   ├── POST|GET endpoints
│           │   ├── KV store operations
│           │   ├── Attachment signing
│           │   └── Access control
│           │
│           ├── kv_store.tsx (KV helper)
│           └── auth-helper.ts (Auth utilities)
│
├── MESSAGING_MODULE_ROLLOUT.md (Feature docs)
└── MESSAGING_STRUCTURE.md ⭐ (This architecture guide)
```

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
└─────────────────────────────────────────────────────────────┘

    MessagingHub.tsx (React Component)
    ├─ State: messages[], internalChats[], portalUsers[], staffUsers[]
    ├─ Polling: Every 30 seconds
    │  └─ syncCurrentUserPresence() → profiles.last_login
    │  └─ loadData()                → Multiple API calls parallel
    │
    └─ User Actions:
       ├─ Reply to customer    → handleSendReply()
       ├─ Send team message    → handleSendToPendingTarget()
       ├─ Add internal note    → handleAddInternalNote()
       ├─ Resolve message      → handleToggleResolved()
       └─ Create follow-up     → handleCreateFollowUpTask()

┌─────────────────────────────────────────────────────────────┐
│                    API Wrapper Layer                         │
└─────────────────────────────────────────────────────────────┘

    portal-client.ts (Unified API Interface)
    ├─ getCrmPortalMessages(token)        ← Parallel poll
    ├─ getPortalUsers(token)              ← Parallel poll
    ├─ getInternalChats(token)            ← Parallel poll
    ├─ replyToPortalMessage(...)
    ├─ sendInternalChatMessage(...)
    ├─ addPortalInternalNote(...)
    ├─ updatePortalThreadStatus(...)
    └─ uploadPortalAttachment(...)

┌─────────────────────────────────────────────────────────────┐
│                   Backend API Layer                          │
└─────────────────────────────────────────────────────────────┘

    customer-portal-api.ts (Hono Server)
    ├─ POST   /invite                     (Create portal access)
    ├─ POST   /register                   (Portal signup)
    ├─ POST   /login                      (Portal auth)
    ├─ POST   /logout                     (Session destroy)
    ├─ ─────────────────────────────────
    ├─ GET    /crm-messages               ← CRM polls here
    ├─ GET    /crm-messages               (Staff retrieves customer messages)
    ├─ POST   /reply                      (Reply to customer)
    ├─ POST   /internal-note              (Add staff note)
    ├─ POST   /status                     (Change message status)
    ├─ ─────────────────────────────────
    ├─ GET    /internal-chats             ← CRM polls here
    ├─ POST   /internal-chats             (Create team chat)
    ├─ POST   /internal-chats/:id/message (Send team message)
    ├─ ─────────────────────────────────
    ├─ GET    /portal-users               (List portal users)
    ├─ GET    /messages                   (Portal user messages)
    ├─ POST   /messages                   (Portal user sends)
    ├─ POST   /messages/:id/read          (Mark read)
    ├─ POST   /attachments                (Upload file)
    └─ POST   /quotes/:id/{accept|reject} (Quote actions)

┌─────────────────────────────────────────────────────────────┐
│                  Data Storage Layer                          │
└─────────────────────────────────────────────────────────────┘

    Deno KV Store (Temporary Storage)
    ├─ portal_user:{email_hash}
    ├─ portal_session:{token}
    ├─ portal_invite:{code}
    ├─ portal_message:{org}:{contact}:{id}  ← Message with replies/notes
    ├─ internal_chat:{org}:{id}             ← Team chat with messages
    └─ portal_access_log:{org}:{contact}

    Supabase Postgres
    ├─ profiles (last_login, status)
    ├─ contacts (contact data)
    └─ organizations (org data)

    Supabase Storage
    └─ documents/ (file attachments with signed URLs)
```

## Data Flow: 30-Second Poll Cycle

```
Time: T₀, T₃₀, T₆₀, T₉₀, ...

[MessagingHub.tsx useEffect]
    │
    ├─1. syncCurrentUserPresence()
    │   └─ Supabase: UPDATE profiles SET last_login=NOW()
    │
    └─2. loadData() [Parallel API calls]
        │
        ├─ getCrmPortalMessages(token)
        │  └─ Backend: GET /crm-messages
        │     └─ KV: Retrieve portal_message:*
        │        └─ Returns: { messages: [{id, subject, body, replies[], internalNotes[], status}...] }
        │
        ├─ getPortalUsers(token)
        │  └─ Backend: GET /portal-users
        │     └─ KV: Scan portal_access_log:org:*
        │        └─ Returns: { portalUsers: [{name, email, contactId, lastLogin, online}...] }
        │
        ├─ getInternalChats(token)
        │  └─ Backend: GET /internal-chats
        │     └─ KV: Retrieve internal_chat:org:*
        │        └─ Returns: { chats: [{id, title, messages[], participants[], updatedAt}...] }
        │
        └─ usersAPI.getAll()
           └─ Postgres: SELECT * FROM profiles WHERE organization_id=:orgId
              └─ Returns: { users: [{id, name, email, role, avatar}...] }

[State Updates]
    ├─ setMessages(nextMessages)
    ├─ setPortalUsers(nextUsers)
    ├─ setInternalChats(nextChats)
    └─ setStaffUsers(nextStaff)

[Component Re-render]
    └─ UI reflects latest messages and chats
```

## Message State Transitions

```
┌─────────────┐
│   Created   │ (Customer sends message)
└────────┬────┘
         │ Initially status = 'open'
         ↓
    ┌─────────────┐
    │    Open     │ (Staff can see/reply)
    │  (default)  │
    └────────┬────┘
             │ Staff clicks "Resolve"
             ↓
         ┌──────────────┐
         │  Resolved    │ (Hidden from active list, can reopen)
         └──────────────┘

Notes:
- Status managed in KV: portal_message:{org}:{contact}:{id}.status
- Visible in CRM MessagingHub via getCrmPortalMessages()
- SLA tracking based on timeline of sends/replies
```

## Authentication Flows

```
Portal User (Customer)
    │
    ├─ portalRegister(inviteCode, password)
    │  └─ Backend: POST /register
    │     ├─ Validate invite code
    │     ├─ Hash password
    │     └─ KV: Create portal_user + portal_session
    │        └─ Returns: { token, user }
    │
    └─ portalLogin(email, password)
       └─ Backend: POST /login
          ├─ Verify credentials
          ├─ Generate session token
          └─ KV: Create portal_session:{token}
             └─ Returns: { token, user }


CRM User (Staff)
    │
    └─ Uses Supabase Auth
       └─ Receives JWT access_token
          └─ Passed to all CRM API calls
             └─ Backend validates via supabase.auth.getUser(token)
```

## File Dependencies

```
MessagingHub.tsx
    ├─ imports from portal-client.ts
    │  ├─ getCrmPortalMessages
    │  ├─ getPortalUsers
    │  ├─ getInternalChats
    │  ├─ replyToPortalMessage
    │  ├─ sendInternalChatMessage
    │  ├─ addPortalInternalNote
    │  └─ updatePortalThreadStatus
    │
    ├─ imports from supabase client
    │  └─ Presence sync
    │
    └─ imports from UI components
        └─ Button, Avatar, Dialog, etc.

portal-client.ts
    ├─ imports from server-function-url.ts
    │  └─ buildServerFunctionUrl()
    │
    ├─ imports from server-headers.ts
    │  └─ getServerHeaders()
    │
    └─ calls backend: /portal/* endpoints

customer-portal-api.ts
    ├─ imports Hono framework
    ├─ imports Supabase JS
    ├─ imports kv_store.tsx
    ├─ imports auth-helper.ts
    └─ handles all /portal routes

kv_store.tsx
    └─ Supabase KV operations (set, get, delete, scan)

auth-helper.ts
    └─ extractUserToken() from Authorization header
```

## Endpoint Summary

| Method | Path | Auth | Purpose | Storage |
|--------|------|------|---------|---------|
| POST | /invite | CRM | Create portal access | KV |
| POST | /register | Public | Portal signup | KV |
| POST | /login | Public | Portal auth | KV |
| POST | /logout | Portal | Session destroy | KV |
| GET | /crm-messages | CRM | Fetch portal messages | KV |
| POST | /reply | CRM | Reply to customer | KV |
| POST | /internal-note | CRM | Add staff note | KV |
| POST | /status | CRM | Change status | KV |
| GET | /internal-chats | CRM | Fetch team chats | KV |
| POST | /internal-chats | CRM | Create chat | KV |
| POST | /internal-chats/:id/message | CRM | Send chat message | KV |
| GET | /portal-users | CRM | List portal users | KV |
| GET | /messages | Portal | Fetch my messages | KV |
| POST | /messages | Portal | Send message | KV |
| POST | /attachments | Both | Upload file | Storage |

---

## Key Implementation Notes

1. **No Real-time**: All updates via 30-second polling
2. **KV Storage**: Temporary solution, designed for quick MVP
3. **Optimistic Updates**: UI updates before confirmation
4. **State Preservation**: Keeps locally added items if API temporarily stale
5. **Mobile Responsive**: Split view toggling on small screens
6. **Attachment Signing**: 7-day signed URLs for security
7. **Access Control**: All messages filtered by org_id + contact_id
