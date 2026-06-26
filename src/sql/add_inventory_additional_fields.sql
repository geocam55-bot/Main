-- =============================================================================
-- ProSpaces CRM: Add Additional Columns to Inventory Table
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================================

-- 1. Add reorder_level column (INTEGER, defaults to 0)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;

-- 2. Add location column (TEXT)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Add upc column (TEXT)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS upc TEXT;

-- 4. Add supplier column (TEXT)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS supplier TEXT;

-- 5. Add supplier_sku column (TEXT)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS supplier_sku TEXT;

-- 6. Document columns with comments
COMMENT ON COLUMN public.inventory.reorder_level IS 'The threshold quantity at which stock should be reordered (defaults to 0)';
COMMENT ON COLUMN public.inventory.location IS 'The physical bin or location identifier of the item in the warehouse or store';
COMMENT ON COLUMN public.inventory.upc IS 'Universal Product Code (UPC) or barcode number for item identification';
COMMENT ON COLUMN public.inventory.supplier IS 'The manufacturer, distributor, or supplier of the inventory item';
COMMENT ON COLUMN public.inventory.supplier_sku IS 'The supplier-specific stock keeping unit (SKU) code';

-- 7. Add indexes for rapid queries and scanning search
CREATE INDEX IF NOT EXISTS idx_inventory_upc ON public.inventory(upc);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory(location);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON public.inventory(supplier);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_sku ON public.inventory(supplier_sku);

-- 8. Verify table columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory' AND column_name IN ('reorder_level', 'location', 'upc', 'supplier', 'supplier_sku');
