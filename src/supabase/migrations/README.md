# Supabase Migrations

This directory contains SQL migrations to set up the database schema for ProSpaces CRM.

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Apply migrations**:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Open the migration file: `/supabase/migrations/001_create_profiles_table.sql`
5. Copy the entire SQL content
6. Paste it into the SQL Editor
7. Click **Run** to execute

### Option 3: Using Supabase API

You can also run the migration using the Supabase REST API or through the SQL Editor in your project.

## What This Migration Does

### `001_create_profiles_table.sql`

This migration creates a `profiles` table that syncs with Supabase Auth users:

#### Features:
- ✅ **Automatic Profile Creation**: When a user signs up, a profile is automatically created
- ✅ **Sync with Auth**: Profiles stay in sync with auth.users table
- ✅ **Row Level Security**: Only admins can see users in their organization
- ✅ **Last Login Tracking**: Automatically updates when users log in
- ✅ **Multi-tenant Support**: Filters users by organization_id
- ✅ **Role-based Access**: Super admins see all users, admins see their org only

#### Tables Created:
- `public.profiles` - User profile information

#### Columns:
- `id` (UUID, Primary Key) - References auth.users(id)
- `email` (TEXT) - User's email address
- `name` (TEXT) - User's display name
- `role` (TEXT) - User role: standard_user, marketing, manager, admin, super_admin
- `organization_id` (TEXT) - Organization/tenant ID
- `status` (TEXT) - Account status: active, invited, inactive
- `last_login` (TIMESTAMP) - Last login time
- `created_at` (TIMESTAMP) - Profile creation time
- `updated_at` (TIMESTAMP) - Last update time

#### Triggers:
- `on_auth_user_created` - Creates profile when user signs up
- `on_auth_user_login` - Updates last_login when user logs in

#### RLS Policies:
- Super admins can view all profiles
- Admins can view profiles in their organization
- Users can view their own profile
- Admins can update profiles in their organization

## After Migration

After running this migration:

1. **All existing users** will be synced to the profiles table
2. **New users** will automatically get a profile when they sign up
3. **The Users page** will now show all real users from your organization
4. **User larry.lee@ronaatlantic.ca** will be visible (if they belong to your organization)

## Troubleshooting

### "User not showing up"
- Check that the user exists in Supabase Auth
- Verify the user's `organizationId` in user_metadata matches yours
- Refresh the Users page after applying the migration

### "Permission denied"
- Make sure RLS policies are correctly applied
- Check that your user has admin or super_admin role
- Verify the organizationId in your profile matches

### "Migration failed"
- Check for syntax errors in the SQL
- Ensure you have proper permissions
- Try running each section separately

## Need Help?

If you encounter issues:
1. Check the Supabase Dashboard → Database → Logs
2. Verify your user's metadata in Authentication → Users
3. Test the RLS policies in SQL Editor with `SELECT * FROM profiles;`
