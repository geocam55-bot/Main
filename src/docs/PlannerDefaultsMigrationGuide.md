# Planner Defaults Migration Guide

## Overview

ProSpaces CRM now stores user-specific planner defaults in the database instead of browser localStorage. This provides better reliability, cross-device access, and proper data backup.

## What Changed?

### Before Migration
- **Organization Defaults**: Stored in database (managed via Settings → Project Wizard Material Defaults)
- **User-Specific Overrides**: Stored in browser localStorage

### After Migration
- **Organization Defaults**: Still in database (no change)
- **User-Specific Overrides**: Now also stored in database with proper user isolation

## Benefits

1. **Cross-Device Access**: Your customized defaults are now available on any device you use
2. **Data Reliability**: No more data loss from browser cache clearing or using incognito mode
3. **Proper Backup**: Your preferences are backed up with your organization's data
4. **Better Security**: User-specific defaults are properly isolated by user ID and organization ID

## Migration Process

### Automatic Migration

The migration happens automatically when you:
1. Open any planner's Defaults tab
2. The system detects localStorage data
3. Data is automatically migrated to the database
4. localStorage is cleaned up after successful migration

### Manual Migration

You can also manually trigger migration from:
1. Go to **Settings** → **Appearance** tab
2. Scroll to **Planner Defaults Migration Status** card
3. Click **"Migrate to Database"** button if migration is needed

## How It Works

### Database Storage Structure

User defaults are stored with the key pattern:
```
user_planner_defaults:{organizationId}:{userId}
```

Each user's defaults are stored as a JSON object mapping planner configurations to inventory item IDs:
```json
{
  "deck-spruce-Joists": "inventory-item-uuid-1",
  "deck-treated-Posts": "inventory-item-uuid-2",
  "garage-default-Foundation": "inventory-item-uuid-3"
}
```

### API Endpoints

Three new server routes handle user defaults:

1. **GET** `/user-planner-defaults/:organizationId/:userId`
   - Retrieves user-specific defaults
   - Requires authentication
   - Users can only access their own defaults (admins can access any user's)

2. **POST** `/user-planner-defaults/:organizationId/:userId`
   - Saves user-specific defaults
   - Requires authentication
   - Users can only update their own defaults

3. **DELETE** `/user-planner-defaults/:organizationId/:userId`
   - Deletes user-specific defaults (restores to organization defaults)
   - Requires authentication
   - Users can only delete their own defaults

### Security & Permissions

- All routes require valid authentication
- Users can only access/modify their own defaults
- Admins (super_admin, org_admin) can view other users' defaults within their organization
- Data is properly isolated by organization_id and user_id

## User Experience

### In Planner Defaults Tab

1. **Automatic Migration**: When you first open the Defaults tab after the update, any localStorage data is automatically migrated
2. **Visual Indicators**: Items you've customized show a blue "Custom" badge
3. **Organization Defaults**: You can still see what the organization default is for each item
4. **Restore Button**: "Restore Organization Defaults" button completely removes your customizations

### In Settings → Appearance

The **Planner Defaults Migration Status** card shows:
- Browser storage status (localStorage)
- Database storage status
- Item counts for each
- Migration button if needed
- Status indicators (migration available, complete, or no data)

## Troubleshooting

### Migration Failed

If migration fails:
1. Check your internet connection
2. Ensure you're logged in
3. Try clicking "Refresh Status" in the migration status card
4. If problem persists, your localStorage data is preserved and you can try again

### Data Not Syncing

If your defaults aren't showing on another device:
1. Go to Settings → Appearance
2. Check the migration status
3. Ensure "Database" shows "Has Data"
4. Click "Refresh Status" to verify

### Lost Customizations

If you accidentally restore to organization defaults:
- Unfortunately, the restore is permanent as it deletes your customizations
- You'll need to re-customize your defaults
- Consider documenting important customizations

## For Administrators

### Testing the Migration

Admins can test the migration system:
1. Go to **Settings** → **Test Data** tab
2. Find **User Defaults API Test Suite** card
3. Click **"Run All Tests"** button
4. All 8 tests should pass:
   - Get empty defaults
   - Save defaults
   - Get saved defaults
   - Update defaults
   - Verify update
   - Delete defaults
   - Verify deletion
   - localStorage migration

### Monitoring User Defaults

Admins can view user defaults via the Supabase dashboard:
1. Navigate to Database → Tables
2. View `kv_store_8405be07` table
3. Look for keys starting with `user_planner_defaults:`

### Common Admin Tasks

**View a User's Defaults:**
```
GET /user-planner-defaults/{orgId}/{userId}
```

**Help User Restore Defaults:**
```
DELETE /user-planner-defaults/{orgId}/{userId}
```

## Technical Details

### Client-Side Functions

- `getUserDefaults(userId, organizationId)`: Async function to fetch from API
- `saveUserDefaults(userId, organizationId, defaults)`: Async function to save to API
- `deleteUserDefaults(userId, organizationId)`: Async function to delete from API
- `migrateUserDefaultsFromLocalStorage(userId, organizationId)`: One-time migration

### Server-Side Implementation

- Uses existing `kv_store` infrastructure
- Proper authentication with Supabase auth tokens
- Role-based access control
- Comprehensive error logging

### Data Format

The defaults object structure:
```typescript
Record<string, string>

// Example:
{
  "deck-spruce-Joists": "uuid-of-inventory-item",
  "garage-default-Foundation": "uuid-of-inventory-item"
}
```

Key format: `{plannerType}-{materialType}-{category}`
- plannerType: deck, garage, shed, roof, kitchen
- materialType: spruce, treated, composite, cedar, or "default"
- category: specific material category (e.g., "Joists", "Posts")

## Support

If you encounter any issues with the migration:
1. Check the browser console for detailed error logs (F12)
2. All logs are prefixed with `[project-wizard-defaults]` or `[PlannerDefaults]`
3. Contact your system administrator with any error messages
4. Include your user ID and organization ID when reporting issues

## Future Enhancements

Potential future improvements:
- Bulk export/import of user defaults
- Default templates that can be shared
- Version history for defaults
- Inheritance chains (user → team → organization → system)
