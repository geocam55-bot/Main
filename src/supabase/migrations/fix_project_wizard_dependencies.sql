-- =====================================================
-- FIX PROJECT WIZARD DEPENDENCIES
-- Add missing price_level column and create missing tables
-- =====================================================

-- Add price_level column to contacts table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'price_level'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN price_level TEXT DEFAULT 'Retail';
  END IF;
END $$;

-- Update any existing contacts that have NULL price_level
UPDATE public.contacts SET price_level = 'Retail' WHERE price_level IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.contacts.price_level IS 'Price tier level (Retail, Wholesale, Contractor, Premium, Standard)';

-- =====================================================
-- CREATE SAVED DECK DESIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_deck_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Design metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Design configuration (JSON)
  config JSONB NOT NULL,
  
  -- Pricing information
  price_tier TEXT, -- t1, t2, t3, t4, custom
  total_materials_cost DECIMAL(10, 2),
  total_labor_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  
  -- Materials list (enriched with pricing)
  materials JSONB,
  
  -- Project information (for future use)
  project_id UUID,
  quote_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE SAVED SHED DESIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_shed_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Design metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Design configuration (JSON)
  config JSONB NOT NULL,
  
  -- Pricing information
  price_tier TEXT, -- t1, t2, t3, t4, custom
  total_materials_cost DECIMAL(10, 2),
  total_labor_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  
  -- Materials list (enriched with pricing)
  materials JSONB,
  
  -- Project information (for future use)
  project_id UUID,
  quote_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR DECK DESIGNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_org ON saved_deck_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_user ON saved_deck_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_customer ON saved_deck_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_created ON saved_deck_designs(created_at DESC);

-- =====================================================
-- CREATE INDEXES FOR SHED DESIGNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_org ON saved_shed_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_user ON saved_shed_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_customer ON saved_shed_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_created ON saved_shed_designs(created_at DESC);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE saved_deck_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_shed_designs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR DECK DESIGNS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organization's deck designs" ON saved_deck_designs;
CREATE POLICY "Users can view their organization's deck designs"
  ON saved_deck_designs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create deck designs in their organization" ON saved_deck_designs;
CREATE POLICY "Users can create deck designs in their organization"
  ON saved_deck_designs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own deck designs" ON saved_deck_designs;
CREATE POLICY "Users can update their own deck designs"
  ON saved_deck_designs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own deck designs" ON saved_deck_designs;
CREATE POLICY "Users can delete their own deck designs"
  ON saved_deck_designs FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR SHED DESIGNS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organization's shed designs" ON saved_shed_designs;
CREATE POLICY "Users can view their organization's shed designs"
  ON saved_shed_designs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create shed designs in their organization" ON saved_shed_designs;
CREATE POLICY "Users can create shed designs in their organization"
  ON saved_shed_designs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own shed designs" ON saved_shed_designs;
CREATE POLICY "Users can update their own shed designs"
  ON saved_shed_designs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own shed designs" ON saved_shed_designs;
CREATE POLICY "Users can delete their own shed designs"
  ON saved_shed_designs FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_saved_deck_designs_updated_at ON saved_deck_designs;
CREATE TRIGGER update_saved_deck_designs_updated_at
  BEFORE UPDATE ON saved_deck_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_shed_designs_updated_at ON saved_shed_designs;
CREATE TRIGGER update_saved_shed_designs_updated_at
  BEFORE UPDATE ON saved_shed_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_deck_designs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_shed_designs TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Project Wizard dependencies fixed successfully!';
  RAISE NOTICE '✅ Added price_level column to contacts table';
  RAISE NOTICE '✅ Created saved_deck_designs table';
  RAISE NOTICE '✅ Created saved_shed_designs table';
  RAISE NOTICE '✅ All indexes, RLS policies, and triggers are in place';
END $$;
