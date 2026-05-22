-- Add billing_plan column to profiles table
-- Stores the user's billing plan (starter, professional, enterprise)
-- NULL means free/no plan

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.billing_plan IS 'Billing plan for this user: starter, professional, enterprise, or NULL for free';
