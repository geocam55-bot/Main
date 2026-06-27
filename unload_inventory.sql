-- SQL to unload (empty) the inventory table
-- This script prepares the inventory table for a clean re-import.

-- Option A: TRUNCATE (Recommended)
-- This is extremely fast, bypasses triggers/rules, and resets any identity sequences.
-- CASCADE will ensure any dependent rows in other tables (if any are added in the future) are handled.
TRUNCATE TABLE public.inventory RESTART IDENTITY CASCADE;

-- Option B: DELETE (Alternative)
-- If TRUNCATE is restricted by your permissions or environment, you can use DELETE instead.
-- Note: DELETE is slower on large tables because it logs each row deletion.
-- DELETE FROM public.inventory;
