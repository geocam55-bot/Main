-- =============================================================================
-- ProSpaces CRM: Add ReorderLevel, Location, and UPC columns to inventory table
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================================

-- 1. Add reorder_level column (INTEGER, defaults to 0)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;

-- 2. Add location column (TEXT)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Add upc column (TEXT)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS upc TEXT;

-- 4. Document columns with comments
COMMENT ON COLUMN public.inventory.reorder_level IS 'The threshold quantity at which stock should be reordered (defaults to 0)';
COMMENT ON COLUMN public.inventory.location IS 'The physical bin or location identifier of the item in the warehouse or store';
COMMENT ON COLUMN public.inventory.upc IS 'Universal Product Code (UPC) or barcode number for item identification';

-- 5. Add index on upc and location for rapid queries and scanning search
CREATE INDEX IF NOT EXISTS idx_inventory_upc ON public.inventory(upc);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory(location);

-- 6. Verify table columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory' AND column_name IN ('reorder_level', 'location', 'upc');
