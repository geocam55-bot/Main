-- =====================================================
-- PROJECT WIZARD SAVED DESIGNS TABLES
-- =====================================================

-- Saved Garage Designs
CREATE TABLE IF NOT EXISTS saved_garage_designs (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_org ON saved_garage_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_user ON saved_garage_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_customer ON saved_garage_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_created ON saved_garage_designs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_garage_designs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Garage Designs
CREATE POLICY "Users can view their organization's garage designs"
  ON saved_garage_designs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create garage designs in their organization"
  ON saved_garage_designs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own garage designs"
  ON saved_garage_designs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own garage designs"
  ON saved_garage_designs FOR DELETE
  USING (user_id = auth.uid());

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_saved_garage_designs_updated_at ON saved_garage_designs;
CREATE TRIGGER update_saved_garage_designs_updated_at
  BEFORE UPDATE ON saved_garage_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_garage_designs TO authenticated;