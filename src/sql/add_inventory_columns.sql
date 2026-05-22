-- =============================================================================
-- ProSpaces CRM: Add missing columns to the inventory table
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================================
-- All price columns are stored as INTEGER in cents (e.g. $99.99 = 9999)
-- to match the existing unit_price and cost columns.
-- =============================================================================

-- Price tier columns (INTEGER, cents)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_tier_1 INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_tier_2 INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_tier_3 INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_tier_4 INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_tier_5 INTEGER DEFAULT 0;

-- Department code (TEXT)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS department_code TEXT;

-- Unit of measure (TEXT, defaults to 'ea' for "each")
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'ea';

-- Optional: Add comments for documentation
COMMENT ON COLUMN inventory.price_tier_1 IS 'Price Level 1 - Retail (stored in cents)';
COMMENT ON COLUMN inventory.price_tier_2 IS 'Price Level 2 - Wholesale (stored in cents)';
COMMENT ON COLUMN inventory.price_tier_3 IS 'Price Level 3 - Contractor (stored in cents)';
COMMENT ON COLUMN inventory.price_tier_4 IS 'Price Level 4 - Premium (stored in cents)';
COMMENT ON COLUMN inventory.price_tier_5 IS 'Price Level 5 - Standard (stored in cents)';
COMMENT ON COLUMN inventory.department_code IS 'Department code for categorization';
COMMENT ON COLUMN inventory.unit_of_measure IS 'Unit of measure (ea, box, case, lb, ft, etc.)';

-- Verify the new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inventory'
ORDER BY ordinal_position;
