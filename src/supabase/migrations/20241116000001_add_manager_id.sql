-- Add manager_id column to profiles table
-- This allows users to be assigned a manager for hierarchical organization structure

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index on manager_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- Add comment
COMMENT ON COLUMN public.profiles.manager_id IS 'References the manager (another profile) for this user';
