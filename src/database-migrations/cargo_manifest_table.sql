-- ==============================================================================
-- ProSpaces Logistics: Order Cargo Manifest Table Migration
-- ==============================================================================
-- This table stores itemized Cargo Manifest lines parsed from the "SKU BOX"
-- extraction region on Sales Order Invoices during Live OCR and Document Mapping.
-- Columns map directly to: LINE, ORDERED, SKU, DESCRIPTION, UNITS, PRICE/ PER, EXTENSION.
-- ==============================================================================

-- 1. Create the order_cargo_manifests table
CREATE TABLE IF NOT EXISTS public.order_cargo_manifests (
  id TEXT PRIMARY KEY,                             -- Deterministic ID: {delivery_id}-line-{line_number} or UUID
  tenant_id TEXT NOT NULL DEFAULT 'rona_atlantic', -- Tenant / Organization identifier
  delivery_id TEXT NOT NULL,                       -- Foreign reference to delivery/order (e.g. SO-10293-A, DEL-300908)
  line_number INTEGER NOT NULL DEFAULT 1,          -- LINE: Sequence index (1, 2, 3...)
  ordered_quantity TEXT NOT NULL DEFAULT '1',      -- ORDERED: Quantity requested (e.g. '40', '120', '2')
  sku TEXT NOT NULL,                               -- SKU: Stock keeping unit code (e.g. 'LMB-2612-PT', 'R-709')
  description TEXT NOT NULL,                       -- DESCRIPTION: Item name/specs
  units TEXT NOT NULL DEFAULT 'EA',                -- UNITS: UOM (e.g. 'PC', 'SHT', 'BAG', 'BOX', 'EA', 'LF')
  price_per TEXT NOT NULL DEFAULT '$0.00',         -- PRICE/ PER: Unit price (e.g. '$21.45', '$7.45')
  extension TEXT NOT NULL DEFAULT '$0.00',         -- EXTENSION: Total line extended price (e.g. '$858.00', '$894.00')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_order_cargo_manifests_delivery_id 
  ON public.order_cargo_manifests(delivery_id);

CREATE INDEX IF NOT EXISTS idx_order_cargo_manifests_tenant_id 
  ON public.order_cargo_manifests(tenant_id);

CREATE INDEX IF NOT EXISTS idx_order_cargo_manifests_sku 
  ON public.order_cargo_manifests(sku);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.order_cargo_manifests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Security Policies for Tenant Isolation and Operations
DROP POLICY IF EXISTS "Enable all operations for order_cargo_manifests" ON public.order_cargo_manifests;
CREATE POLICY "Enable all operations for order_cargo_manifests"
  ON public.order_cargo_manifests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Optional verification trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_cargo_manifest_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cargo_manifest_timestamp ON public.order_cargo_manifests;
CREATE TRIGGER trg_update_cargo_manifest_timestamp
  BEFORE UPDATE ON public.order_cargo_manifests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cargo_manifest_timestamp();

-- 6. Insert sample seed rows for initial testing (matches DEFAULT_DELIVERIES DEL-300908)
INSERT INTO public.order_cargo_manifests (id, tenant_id, delivery_id, line_number, ordered_quantity, sku, description, units, price_per, extension)
VALUES
  ('DEL-300908-line-1', 'rona_atlantic', 'DEL-300908', 1, '120', 'R-709', '2x4x8 SPF Premium Lumber', 'PC', '$7.45', '$894.00'),
  ('DEL-300908-line-2', 'rona_atlantic', 'DEL-300908', 2, '30', 'PLY-34-TNG', '3/4" Tongue & Groove Subfloor Plywood', 'SHT', '$42.50', '$1,275.00'),
  ('DEL-300908-line-3', 'rona_atlantic', 'DEL-300908', 3, '4', 'ADH-SUB-28', 'Heavy Duty Subfloor Construction Adhesive 28oz', 'TUBE', '$12.99', '$51.96')
ON CONFLICT (id) DO NOTHING;
