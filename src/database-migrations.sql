-- Add tags column to contacts table for customer segmentation
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS tags text[];

-- Add audience_segment column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS audience_segment text;

-- Add landing_page_id column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS landing_page_id uuid;

-- Add landing_page_clicks column to campaigns table for analytics
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS landing_page_clicks integer DEFAULT 0;

-- Add avg_time_spent column to campaigns table for analytics (in seconds)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS avg_time_spent integer DEFAULT 0;

-- Add subject_line column to campaigns table for email campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS subject_line text;

-- Add preview_text column to campaigns table for email campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS preview_text text;

-- Add audience_segments column to organization_settings table (JSONB array)
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS audience_segments text[] DEFAULT ARRAY['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'];

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_campaigns_audience_segment ON campaigns (audience_segment);
CREATE INDEX IF NOT EXISTS idx_campaigns_landing_page_id ON campaigns (landing_page_id);

-- Add comments to document the columns
COMMENT ON COLUMN contacts.tags IS 'Customer segmentation tags (VIP, New Lead, Inactive, etc.)';
COMMENT ON COLUMN campaigns.audience_segment IS 'Target audience segment for the campaign';
COMMENT ON COLUMN campaigns.landing_page_id IS 'Associated landing page for the campaign';
COMMENT ON COLUMN campaigns.landing_page_clicks IS 'Number of clicks to the landing page';
COMMENT ON COLUMN campaigns.avg_time_spent IS 'Average time spent on landing page in seconds';
COMMENT ON COLUMN campaigns.subject_line IS 'Email subject line for email campaigns';
COMMENT ON COLUMN campaigns.preview_text IS 'Preview text that appears after subject line in inbox';
COMMENT ON COLUMN organization_settings.audience_segments IS 'Predefined audience segments for marketing campaigns and customer tagging';

-- Add export_templates column to organization_settings table (JSONB array)
-- This moves export templates from ephemeral KV store to persistent DB so all
-- roles (not just super_admin/admin) can read them when fetching org settings.
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS export_templates JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN organization_settings.export_templates IS 'Custom export templates for Quotes and Planners, created by super_admin';