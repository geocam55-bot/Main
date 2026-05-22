# Instant Messaging Module for ProSpaces CRM

## Core Principle: Two Messaging Zones

### 1. Internal Chat (Staff Only)
- Staff-to-staff collaboration only
- Deal strategy, pricing talk, escalations
- Never shown in the customer portal

### 2. Customer Chat (Portal-Based)
- Customer ↔ assigned staff communication
- Logged in CRM and visible in the portal thread
- Professional and auditable

---

## MVP Implemented in This Workspace

### CRM Side
- `src/components/MessagingHub.tsx`
- Separate tabs for:
  - `Customer Conversations`
  - `Internal Chat`
  - `Portal Users`
- Customer thread actions:
  - Reply to customer
  - Add staff-only internal notes
  - Mark resolved / reopen
  - Convert to task

### Customer Portal Side
- `src/components/portal/PortalMessages.tsx`
- “Chat with Your Team” experience
- Threaded follow-up replies inside the same conversation
- Customer-only view of the thread

### Backend Routes
- `src/supabase/functions/server/customer-portal-api.ts`
- Added support for:
  - threaded customer replies
  - internal staff-only notes
  - resolved/open status
  - internal staff chat threads

### Client Helpers
- `src/utils/portal-client.ts`
- Added helpers for internal notes, status updates, and internal chat operations

---

## Recommended Next Phase
1. File attachments for portal + CRM messages
2. Microsoft Teams notifications
3. SLA timers and unread escalations
4. Export / audit reporting
5. AI summaries for long conversations
