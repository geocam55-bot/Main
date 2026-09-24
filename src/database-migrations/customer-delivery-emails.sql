-- ============================================================================
-- ProSpaces Logistics - Customer Delivery Portal & Email Dispatch Schema
-- ============================================================================

-- Ensure delivery_emails_log table exists to track sent customer delivery emails
CREATE TABLE IF NOT EXISTS delivery_emails_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'rona_atlantic',
  delivery_id TEXT NOT NULL,
  tracking_number TEXT,
  customer_email TEXT NOT NULL,
  status TEXT DEFAULT 'SENT',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by delivery or tracking number
CREATE INDEX IF NOT EXISTS idx_delivery_emails_log_delivery ON delivery_emails_log(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_emails_log_tracking ON delivery_emails_log(tracking_number);

-- Enable RLS
ALTER TABLE delivery_emails_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access
CREATE POLICY IF NOT EXISTS "Allow all access to delivery_emails_log" ON delivery_emails_log FOR ALL USING (true) WITH CHECK (true);
