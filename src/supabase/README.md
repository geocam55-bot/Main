# Supabase Setup Instructions

This directory contains SQL migrations to set up your Supabase database schema.

## Quick Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase project** at https://supabase.com/dashboard
2. **Navigate to SQL Editor** (left sidebar)
3. **Click "New Query"**
4. **Copy and paste** the contents of `/supabase/migrations/001_create_profiles_table.sql`
5. **Click "Run"** or press `Ctrl+Enter`
6. **Verify** the profiles table was created in the Table Editor

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## What Does This Migration Do?

The `001_create_profiles_table.sql` migration creates:

### 📋 **Profiles Table**
Stores user information linked to auth.users:
- `id` - User ID (references auth.users)
- `email` - User email
- `name` - Display name
- `role` - User role (super_admin, admin, manager, marketing, standard_user)
- `organization_id` - Which tenant/organization the user belongs to
- `status` - active, invited, or inactive
- `last_login` - Timestamp of last login
- `created_at` / `updated_at` - Audit timestamps

### 🔐 **Row Level Security (RLS) Policies**
- Users can view/update their own profile
- Admins can view/update users in their organization
- Super admins can view/update ALL users across ALL organizations
- Super admins can delete profiles

### ⚡ **Automatic Profile Creation**
- Trigger function that automatically creates/updates profiles when users sign up
- Backfills existing users from auth.users into profiles table

### 📊 **Indexes**
- Index on `organization_id` for fast organization queries
- Index on `email` for fast user lookups

## Verification

After running the migration, verify it worked:

1. **Check the profiles table exists:**
   ```sql
   SELECT * FROM public.profiles LIMIT 10;
   ```

2. **Verify RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

3. **Test as super_admin:**
   - Log in to your CRM app as a super_admin user
   - Navigate to the Users tab
   - You should see all users across all organizations

## Troubleshooting

### "Permission denied for table profiles"
- Make sure RLS policies are created correctly
- Verify your user has the correct role in auth.users metadata

### "Trigger function does not exist"
- Run the entire migration script again
- Make sure all SQL statements executed successfully

### "No users showing up"
- Each user needs to log in once to create their profile
- Or manually backfill with:
  ```sql
  INSERT INTO public.profiles (id, email, name, role, organization_id, status)
  SELECT id, email, raw_user_meta_data->>'name', 
         COALESCE(raw_user_meta_data->>'role', 'standard_user'),
         raw_user_meta_data->>'organizationId', 'active'
  FROM auth.users
  ON CONFLICT (id) DO NOTHING;
  ```

## Need Help?

- Check Supabase logs in the Dashboard under "Database" → "Logs"
- Test queries in the SQL Editor
- Verify table structure in the Table Editor
