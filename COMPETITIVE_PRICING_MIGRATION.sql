-- ═══════════════════════════════════════════════════════════════════════════
-- ProSpaces / RONA Atlantic Competitive Pricing Module Database Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Competitors configuration table
CREATE TABLE IF NOT EXISTS public.competitors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  search_url_template TEXT,
  product_url_pattern TEXT,
  active BOOLEAN DEFAULT true,
  scraping_method TEXT DEFAULT 'playwright_browser',
  last_successful_check TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Competitor products table
CREATE TABLE IF NOT EXISTS public.competitor_products (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES public.competitors(id) ON DELETE CASCADE,
  external_product_id TEXT,
  product_url TEXT,
  product_name TEXT NOT NULL,
  brand TEXT,
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  upc TEXT,
  description TEXT,
  unit_of_measure TEXT DEFAULT 'EA',
  pack_quantity INTEGER DEFAULT 1,
  availability TEXT DEFAULT 'IN_STOCK',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Product matches table
CREATE TABLE IF NOT EXISTS public.product_matches (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  competitor_product_id INTEGER REFERENCES public.competitor_products(id) ON DELETE CASCADE,
  match_confidence TEXT NOT NULL DEFAULT 'HIGH',
  match_method TEXT DEFAULT 'MANUFACTURER_PART_NUMBER',
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Current competitor prices table
CREATE TABLE IF NOT EXISTS public.competitor_prices (
  id SERIAL PRIMARY KEY,
  competitor_product_id INTEGER REFERENCES public.competitor_products(id) ON DELETE CASCADE,
  regular_price NUMERIC(10, 2),
  sale_price NUMERIC(10, 2),
  current_price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  unit_of_measure TEXT DEFAULT 'EA',
  normalized_unit_price NUMERIC(10, 2) NOT NULL,
  availability TEXT DEFAULT 'IN_STOCK',
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Price history table
CREATE TABLE IF NOT EXISTS public.price_history (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  competitor_id INTEGER REFERENCES public.competitors(id) ON DELETE SET NULL,
  competitor_product_id INTEGER,
  price NUMERIC(10, 2) NOT NULL,
  normalized_unit_price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Pricing jobs table
CREATE TABLE IF NOT EXISTS public.pricing_jobs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  competitor_id INTEGER,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Enable RLS and public/tenant access policies
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read on competitors" ON public.competitors FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated on competitors" ON public.competitors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read on competitor_products" ON public.competitor_products FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated on competitor_products" ON public.competitor_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read on product_matches" ON public.product_matches FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated on product_matches" ON public.product_matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read on competitor_prices" ON public.competitor_prices FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated on competitor_prices" ON public.competitor_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read on price_history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated on price_history" ON public.price_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read on pricing_jobs" ON public.pricing_jobs FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated on pricing_jobs" ON public.pricing_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial competitors (KENT Building Supplies & The Home Depot)
INSERT INTO public.competitors (name, website_url, search_url_template, product_url_pattern, active, scraping_method)
VALUES 
  ('KENT Building Supplies', 'https://kent.ca', 'https://kent.ca/catalogsearch/result/?q={query}', 'kent.ca/', true, 'playwright_browser'),
  ('The Home Depot', 'https://www.homedepot.ca', 'https://www.homedepot.ca/en/home/search.html?q={query}', 'homedepot.ca/', true, 'playwright_browser')
ON CONFLICT DO NOTHING;
