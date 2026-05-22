-- Rebuild all indexes on inventory after bulk reimport.
-- Run this after the new inventory data has been loaded.

REINDEX TABLE public.inventory;
ANALYZE public.inventory;