-- Backfill historical campaign metrics from description JSON into top-level columns.
-- Safe to run multiple times.

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS audience_count integer DEFAULT 0;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sent_count integer DEFAULT 0;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS opened_count integer DEFAULT 0;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS clicked_count integer DEFAULT 0;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS converted_count integer DEFAULT 0;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS revenue numeric(10, 2) DEFAULT 0;

UPDATE campaigns
SET
  audience_count = GREATEST(
    COALESCE(audience_count, 0),
    COALESCE(NULLIF(description, '')::jsonb ->> 'audience_count', '0')::integer
  ),
  sent_count = GREATEST(
    COALESCE(sent_count, 0),
    COALESCE(NULLIF(description, '')::jsonb ->> 'sent_count', '0')::integer
  ),
  opened_count = GREATEST(
    COALESCE(opened_count, 0),
    COALESCE(NULLIF(description, '')::jsonb ->> 'opened_count', '0')::integer
  ),
  clicked_count = GREATEST(
    COALESCE(clicked_count, 0),
    COALESCE(NULLIF(description, '')::jsonb ->> 'clicked_count', '0')::integer
  ),
  converted_count = GREATEST(
    COALESCE(converted_count, 0),
    COALESCE(NULLIF(description, '')::jsonb ->> 'converted_count', '0')::integer
  ),
  revenue = GREATEST(
    COALESCE(revenue, 0),
    COALESCE(NULLIF(description, '')::jsonb ->> 'revenue', '0')::numeric
  )
WHERE description IS NOT NULL
  AND btrim(description) LIKE '{%';