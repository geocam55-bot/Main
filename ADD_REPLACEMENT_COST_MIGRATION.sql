-- Run this SQL in your Supabase SQL Editor to add the replacement_cost column

ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS replacement_cost numeric(12,2);

-- Optional: Add a comment describing the column
COMMENT ON COLUMN public.inventory.replacement_cost IS 'Estimated replacement cost for restocking in cents (matches "cost" column logic)';

