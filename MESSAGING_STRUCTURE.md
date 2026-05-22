# Messaging Module Architecture

## Overview
ProSpaces CRM messaging system with threaded customer conversations, team chats, and portal messaging. Uses Supabase KV store + polling-based synchronization (no WebSockets).

---

## 📁 File Structure & Locations

### Frontend UI Layer

#### 1. **MessagingHub Component**
- **Location**: `src/components/MessagingHub.tsx`
- **Type**: React Component
- **Lines**: ~1,600
- **Responsibility**: Main CRM messaging interface
- **Features**:
  - 3-tab interface: Customer Conversations, Internal Chat, Portal Users
  - Message threading and replies
  - Internal staff-only notes
  - Message status (open/resolved)
  - File attachments
  - Direct messaging
  - Group chats
  - User presence status
- **Key Functions**:
  - `syncCurrentUserPresence()` - Updates last_login in profiles table
  - `loadData()` - Polls all messages and chats every 30s
  - `handleSendReply()` - Send customer thread reply
  - `handleSendToPendingTarget()` - Send direct message
  - `handleCreateFollowUpTask()` - Convert message to task
  - Mobile-responsive split view

#### 2. **Portal Messages Component**
- **Location**: `src/components/portal/PortalMessages.tsx`
- **Type**: React Component
- **Responsibility**: Customer-facing portal messaging UI
- **Features**:
  - "Chat with Your Team" interface
  - Threaded customer replies
  - Customer-only view of conversations
  - File download support

#### 3. **Portal Messages Admin Component**
- **Location**: `src/components/portal/PortalMessagesAdmin.tsx`
- **Type**: React Component
- **Responsibility**: Admin view for portal messages
- **Features**:
  - Message management interface

---

### Client API Layer

#### 4. **Portal Client** (Main API Wrapper)
- **Location**: `src/utils/portal-client.ts`
- **Type**: TypeScript utility module
- **Lines**: ~350
- **Responsibility**: Unified API wrapper for all messaging endpoints
- **Key Exports**:

**Session Management**:
```
- getPortalToken()
- getPortalUser()
- isPortalLoggedIn()
- clearPortalSession()
```

**Portal Side (Customer)**:
```
- portalLogin(email, password)
- portalRegister(inviteCode, password)
- portalLogout()
- getPortalMessages()
- sendPortalMessage(subject, message, messageId?, context?, attachments?)
- markMessageRead(messageId)
```

**CRM Side (Staff - Uses CRM auth)**:
```
- getCrmPortalMessages(accessToken) ← Main polling endpoint
- getPortalUsers(accessToken)
- createPortalInvite(contactId, accessToken)
- revokePortalAccess(contactId, accessToken)
- replyToPortalMessage(messageId, contactId, reply, accessToken, attachments?)
- addPortalInternalNote(messageId, contactId, note, accessToken)
- updatePortalThreadStatus(messageId, contactId, status, accessToken)
- getInternalChats(accessToken) ← Main polling endpoint
- createInternalChat(payload, accessToken)
- sendInternalChatMessage(chatId, message, accessToken)
- uploadPortalAttachment(file, opts?, accessToken?)
```

---

### Backend API Layer

#### 5. **Customer Portal API** (Server Functions)
- **Location**: `src/supabase/functions/server/customer-portal-api.ts`
- **Type**: Hono server routes (Deno Edge Functions)
- **Lines**: ~1,672
- **Framework**: Hono + Deno
- **Base URL**: `/make-server-8405be07/portal`

**API Endpoints**:

**Authentication**:
- `POST /invite` - Create portal invitation for contact
- `POST /register` - Portal user registration
- `POST /login` - Portal user login
- `POST /logout` - Portal user logout

**Messaging Core**:
- `GET /messages` - Portal user fetches their messages
- `POST /messages` - Portal user sends message
- `POST /messages/:id/read` - Mark message as read
- `GET /crm-messages` - CRM user fetches all portal messages
- `POST /reply` - CRM user replies to customer message
- `POST /internal-note` - CRM user adds staff-only note to message
- `POST /status` - Update message thread status (open/resolved)

**Internal Team Chats**:
- `GET /internal-chats` - Fetch all team chats
- `POST /internal-chats` - Create new team chat
- `POST /internal-chats/:id/message` - Send message to team chat

**Portal Management**:
- `GET /dashboard` - Portal user dashboard
- `GET /quotes` - Portal user quotes
- `GET /projects` - Portal user projects
- `GET /documents` - Portal user documents
- `GET /portal-users` - CRM user fetches portal users
- `POST /attachments` - Upload file attachment
- `PUT /profile` - Update portal user profile
- `POST /quotes/:id/accept` - Accept quote
- `POST /quotes/:id/reject` - Reject quote

**Data Storage**: Supabase KV Store with Keys:
```
portal_user:{email_hash}           → user data
portal_session:{token}             → session data
portal_invite:{code}               → invite data
portal_message:{orgId}:{contactId}:{id} → message with replies & notes
internal_chat:{orgId}:{id}         → team chat data
portal_access_log:{orgId}:{contactId}  → access control
```

---

### Supporting Modules

#### 6. **KV Store Helper**
- **Location**: `src/supabase/functions/server/kv_store.tsx`
- **Type**: TypeScript utility
- **Responsibility**: Abstraction for Deno KV operations

#### 7. **Auth Helper**
- **Location**: `src/supabase/functions/server/auth-helper.ts`
- **Type**: TypeScript utility
- **Responsibility**: Token extraction and validation

#### 8. **Documentation**
- **Location**: `src/MESSAGING_MODULE_ROLLOUT.md`
- **Type**: Feature documentation
- **Contains**: MVP implementation details and feature overview

---

## 🔄 Data Flow

### Polling Mechanism (30-second interval)

```
MessagingHub.tsx
├─ useEffect hook (empty deps)
│  └─ Every 30 seconds:
│     ├─ syncCurrentUserPresence()
│     │  └─ Updates profiles.last_login & status
│     └─ loadData()
│        ├─ getCrmPortalMessages(accessToken)
│        │  └─ Portal API /crm-messages endpoint
│        │     └─ KV store retrieval
│        ├─ getPortalUsers(accessToken)
│        │  └─ Portal API /portal-users endpoint
│        ├─ getInternalChats(accessToken)
│        │  └─ Portal API /internal-chats endpoint
│        └─ usersAPI.getAll()
│           └─ Staff users list
├─ State updates: setMessages, setInternalChats
└─ Re-renders UI with latest data
```

### Message Sending Flow

```
User clicks "Send Reply"
├─ handleSendReply() in MessagingHub
├─ Calls replyToPortalMessage() via portal-client
│  ├─ POST to Portal API /reply
│  └─ Backend creates reply in KV store: portal_message:{orgId}:{contactId}:{id}
├─ Update local state optimistically
└─ Next poll (within 30s) fetches updated message with reply
```

### Direct Message Flow

```
User selects contact for DM
├─ handleStartDirectChat() 
├─ Creates internal_chat in KV store
│  └─ contextType: "direct-${kind}" (e.g., "direct-staff", "direct-portal")
│  └─ contextLabel: stable identifier for matching
├─ handleSendToPendingTarget()
│  ├─ Calls sendInternalChatMessage()
│  └─ POST to Portal API /internal-chats/:id/message
└─ Poll refreshes and displays chat
```

---

## 🎯 Key Features

### Customer Messaging
- Threaded conversations with team
- View internal notes in portal
- Upload/download attachments
- Message status visibility (pending/resolved)

### CRM Team Messaging
- 3-view split interface
- Customer conversations tab
- Internal team chat tab
- Portal users tab (presence/status)
- Reply to customers with threading
- Add staff-only internal notes
- Mark conversations resolved/reopen
- Create follow-up tasks from messages

### Attachments
- Upload during message creation
- Signed URLs with 7-day expiration
- Stored in Supabase documents storage
- Support for all file types

### Presence
- Online status indicators
- Last active timestamps
- Staff-only visibility
- Portal user visibility

---

## ⚙️ Technical Details

### Authentication
- **Portal Side**: Token-based sessions (KV store)
- **CRM Side**: Supabase Auth + JWT access tokens

### Polling Interval
- **Default**: 30 seconds
- **Triggers**: Page load + user presence sync
- **No WebSockets**: All updates via HTTP polling

### Message Storage
- **Provider**: Deno KV Store (temporary)
- **Key Structure**: Hierarchical (org/contact/message-id)
- **Synchronization**: Polling-based (no subscriptions)
- **Attachments**: Supabase Storage (documents bucket)

### Error Handling
- Best-effort presence sync (silent failures)
- Toast notifications for messaging errors
- Graceful degradation if API unavailable
- Optimistic UI updates with fallback

---

## 🔐 Security

### Access Control
- CRM users authenticated via Supabase Auth
- Portal users authenticated via token (KV store)
- Messages filtered by organization_id
- Contact-level access validation
- Staff-only content separation

### Attachment Security
- File validation during upload
- Sanitized filenames
- Signed URLs with expiration
- Storage bucket isolation

---

## 📊 Message Structure

```typescript
interface Message {
  id: string;
  contactId: string;
  orgId: string;
  from: 'customer' | 'staff';
  subject: string;
  body: string;
  status: 'open' | 'resolved';
  createdAt: ISO8601;
  updatedAt?: ISO8601;
  senderName?: string;
  senderEmail?: string;
  
  // Threaded replies
  replies?: Array<{
    id: string;
    from: 'customer' | 'staff';
    body: string;
    senderName?: string;
    createdAt: ISO8601;
    attachments?: Attachment[];
  }>;
  
  // Staff-only notes
  internalNotes?: Array<{
    id: string;
    body: string;
    senderName: string;
    createdAt: ISO8601;
    attachments?: Attachment[];
  }>;
  
  attachments?: Attachment[];
}

interface InternalChat {
  id: string;
  orgId: string;
  title: string;
  chatType: 'general' | 'direct' | 'group';
  contextType?: string; // e.g., "direct-staff", "group"
  contextLabel?: string; // stable routing identifier
  updatedAt?: ISO8601;
  status?: string;
  
  messages? Array<{
    id: string;
    senderId: string;
    senderName: string;
    body: string;
    createdAt: ISO8601;
  }>;
  
  participants?: Array<{
    id?: string;
    name: string;
    email?: string;
    kind: 'staff' | 'portal';
  }>;
}

interface Attachment {
  id?: string;
  name: string;
  fileName?: string;
  filePath: string;
  contentType?: string;
  size?: number;
  url?: string;
  uploadedAt?: string;
}
```

---

## 🚀 Future Improvements

Potential enhancements to consider:
1. **Real-time Updates**: Replace polling with Supabase Realtime subscriptions
2. **WebSockets**: Implement server-sent events or Socket.io for instant delivery
3. **Message Persistence**: Move from KV to Postgres for complex queries
4. **Read Receipts**: Track message read status per user
5. **Typing Indicators**: Show when users are typing
6. **Message Search**: Full-text search across conversations
7. **Message Reactions**: Emoji reactions to messages
8. **Message Pinning**: Pin important messages in chats
9. **Notification Service**: Push notifications for new messages

---

## 📝 Version History

- **Created**: April 11, 2026
- **Last Updated**: April 11, 2026
- **Status**: Active MVP Implementation
