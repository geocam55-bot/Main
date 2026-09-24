-- ============================================================================
-- Migration: Customer Delivery Tracking Portal & Customer Email Enforcement
-- Date: 2026-09-24
-- Purpose:
--   1. Add customer_email, tracking_number, and tracking_token columns to deliveries
--   2. Add performance indexes for rapid customer tracking lookups
--   3. Configure Row Level Security (RLS) to permit public customer tracking lookups
--   4. Create an audit table for email milestone notifications sent to customers
-- ============================================================================

-- 1. Add tracking and customer contact columns to 'deliveries' table
ALTER TABLE public.deliveries 
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- 2. Populate default tracking numbers for existing deliveries missing one
UPDATE public.deliveries
SET tracking_number = 'PSL-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE tracking_number IS NULL OR tracking_number = '';

-- 3. Populate default tracking token
UPDATE public.deliveries
SET tracking_token = MD5(id || COALESCE(tenantId, 'rona_atlantic') || RANDOM()::TEXT)
WHERE tracking_token IS NULL OR tracking_token = '';

-- 4. Create indexes for instant O(1) lookups by tracking number, email, and order
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number 
  ON public.deliveries (tracking_number);

CREATE INDEX IF NOT EXISTS idx_deliveries_customer_email 
  ON public.deliveries (customer_email);

CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_token 
  ON public.deliveries (tracking_token);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_lookup 
  ON public.deliveries (orderNumber);

-- 5. Customer Notification Logs table to track emails sent at crucial milestones
CREATE TABLE IF NOT EXISTS public.customer_delivery_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId VARCHAR(100) NOT NULL DEFAULT 'rona_atlantic',
  delivery_id VARCHAR(100) NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  milestone VARCHAR(50) NOT NULL, -- 'REGISTERED', 'LOADED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'
  subject TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SENT', -- 'QUEUED', 'SENT', 'FAILED'
  tracking_link TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_delivery 
  ON public.customer_delivery_notifications (delivery_id);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_email 
  ON public.customer_delivery_notifications (customer_email);

-- 6. Row Level Security (RLS) setup for public Customer Tracking Portal
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read of deliveries so customers can track by tracking number or ticket ID
DROP POLICY IF EXISTS "Allow public tracking read on deliveries" ON public.deliveries;
CREATE POLICY "Allow public tracking read on deliveries" 
  ON public.deliveries 
  FOR SELECT 
  TO public 
  USING (true);

-- Allow public read of customer notification logs for customer portal verification
DROP POLICY IF EXISTS "Allow public read on delivery notifications" ON public.customer_delivery_notifications;
CREATE POLICY "Allow public read on delivery notifications" 
  ON public.customer_delivery_notifications 
  FOR SELECT 
  TO public 
  USING (true);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.deliveries TO anon, authenticated;
GRANT SELECT ON public.customer_delivery_notifications TO anon, authenticated;
