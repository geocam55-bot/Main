-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'standard_user',
  organization_id TEXT,
  status TEXT DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on organization_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions to fetch current user's role and organization safely from public.profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_org()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy: Users can view profiles in their organization (no user_metadata reference)
CREATE POLICY "Users can view org profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.get_current_user_role() = 'super_admin'
  OR (
    public.get_current_user_org() IS NOT NULL
    AND public.get_current_user_org() = organization_id
  )
);

-- Policy: Super admins can view all profiles
CREATE POLICY "Super admins can view all"
ON public.profiles FOR SELECT
USING (
  public.get_current_user_role() = 'super_admin'
);

-- Policy: Admins can manage org profiles
CREATE POLICY "Admins can manage org profiles"
ON public.profiles FOR ALL
USING (
  public.get_current_user_role() = 'super_admin'
  OR (
    public.get_current_user_role() IN ('admin', 'super_admin')
    AND public.get_current_user_org() IS NOT NULL
    AND public.get_current_user_org() = organization_id
  )
)
WITH CHECK (
  public.get_current_user_role() = 'super_admin'
  OR (
    public.get_current_user_role() IN ('admin', 'super_admin')
    AND public.get_current_user_org() IS NOT NULL
    AND public.get_current_user_org() = organization_id
  )
);

-- Function to automatically create/update profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    NEW.raw_user_meta_data->>'organizationId',
    'active',
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
    last_login = EXCLUDED.last_login,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (if any)
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  raw_user_meta_data->>'organizationId',
  'active',
  last_sign_in_at,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.profiles IS 'User profiles with organization membership';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.organization_id IS 'The organization/tenant this user belongs to';
COMMENT ON COLUMN public.profiles.role IS 'User role: super_admin, admin, manager, marketing, standard_user';
COMMENT ON COLUMN public.profiles.status IS 'User status: active, invited, inactive';
