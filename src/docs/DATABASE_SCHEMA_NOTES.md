# Database Schema Documentation

## ⚠️ CRITICAL: Known Schema Limitations

This document tracks important database schema limitations that have caused production bugs. **DO NOT try to "fix" code without reading this first!**

---

## Contacts Table

### ❌ Columns That DO NOT Exist

The following columns **DO NOT exist** in the contacts table and should **NEVER** be queried:

1. **`account_owner_number`** - Does not exist in the database
2. **`created_by`** - Does not exist in the database

### ✅ Columns That DO Exist

The contacts table has the following columns for access control:
- `id` - Primary key
- `organization_id` - For organization-level filtering
- `created_at` - Timestamp (not `created_by`)

### 🚨 Known Bug History

**Date:** January 2026  
**Bug:** Quotes not appearing in Opportunities module  
**Root Cause:** `/utils/quotes-client.ts` was trying to query `contacts.account_owner_number` and `contacts.created_by`, which don't exist  
**Solution:** Removed contact-level access checks and relied on organization-level filtering instead  
**Files Affected:**
- `/utils/quotes-client.ts` - Function: `getQuotesByOpportunityClient()`

---

## Access Control Strategy

### Current Implementation

**Quotes in Opportunity Context:**
- Access control is handled at the **opportunity level**
- If a user can view an opportunity, they can view all quotes for that opportunity's contact
- Organization-level filtering (`organization_id`) ensures data isolation
- **DO NOT** add contact-level access checks - the columns don't exist!

### Why This Works

1. **Opportunity filtering** already ensures users only see opportunities they have access to
2. **Organization filtering** prevents cross-organization data leaks
3. **No need for contact-level checks** - opportunities are already filtered by contact ownership

---

## Best Practices

### ✅ DO:
- Always verify column existence before querying
- Use organization_id for access control
- Add comprehensive error logging
- Document schema assumptions in code comments

### ❌ DON'T:
- Assume columns exist without checking
- Try to "improve" access control without understanding schema limitations
- Remove warning comments from critical functions
- Query contacts table for access control in quotes context

---

## Emergency Recovery

If quotes stop appearing again:

1. Check console for errors like:
   - "column contacts.X does not exist"
   - "Error code: 42703"

2. Check `/utils/quotes-client.ts`:
   - Look for queries to contacts table
   - Remove any references to non-existent columns
   - Restore organization-level filtering

3. The working implementation is in commit: [Add commit hash after deploying]

---

## Questions?

Before modifying access control logic, ask:
1. Does this column actually exist in the database?
2. Is organization-level filtering sufficient?
3. Will this break quotes in the Opportunities module?

**When in doubt, refer to this document and the warning comments in the code!**
