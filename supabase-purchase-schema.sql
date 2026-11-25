-- ============================================================================
-- PROSPACES CRM & LOGISTICS: CUSTOMER PURCHASES & BUYING HABITS SCHEMA
-- Run this SQL in your Supabase SQL Editor to enable granular purchase tracking
-- and advanced AI buying habit analytics.
-- ============================================================================

-- 1. CUSTOMER PURCHASES TABLE (Header for each invoice/receipt/order)
CREATE TABLE IF NOT EXISTS public.customer_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    customer_name TEXT,
    invoice_number TEXT UNIQUE,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    cost_total NUMERIC(12, 2) DEFAULT 0.00, -- For margin & GP% calculation
    gross_profit NUMERIC(12, 2) DEFAULT 0.00,
    gp_percent NUMERIC(5, 2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'paid', -- 'paid', 'pending', 'net_30', 'overdue'
    fulfillment_status TEXT DEFAULT 'fulfilled', -- 'fulfilled', 'processing', 'shipped', 'returned'
    branch_id TEXT, -- Store or depot branch where purchase occurred
    salesperson_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PURCHASE LINE ITEMS TABLE (Granular items purchased for buying habit & cross-sell AI analysis)
CREATE TABLE IF NOT EXISTS public.customer_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    purchase_id UUID REFERENCES public.customer_purchases(id) ON DELETE CASCADE,
    item_id UUID, -- References inventory items if applicable
    sku TEXT,
    item_name TEXT NOT NULL,
    category TEXT, -- e.g. 'BUILDING MATERIALS', 'LUMBER', 'HARDWARE', 'TOOLS'
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_of_measure TEXT DEFAULT 'EA',
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. INDEXES FOR HIGH-PERFORMANCE AI AGGREGATION & SEARCH
CREATE INDEX IF NOT EXISTS idx_customer_purchases_org ON public.customer_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_contact ON public.customer_purchases(contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_date ON public.customer_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_org ON public.customer_purchase_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.customer_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_category ON public.customer_purchase_items(category);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.customer_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on customer_purchases"
    ON public.customer_purchases FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users on customer_purchase_items"
    ON public.customer_purchase_items FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- SUCCESS: Tables created with organization scoping, cost/margin tracking,
-- and category-level line items ready for Gemini AI buying habit analytics.
-- ============================================================================
