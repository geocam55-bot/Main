-- Add persistent keyword metadata for inventory search enrichment.
-- Run in Supabase SQL editor.

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS search_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS keyword_version text,
  ADD COLUMN IF NOT EXISTS keywords_generated_at timestamptz;

-- Fast lookup for array keyword matches.
CREATE INDEX IF NOT EXISTS idx_inventory_search_keywords_gin
  ON inventory USING gin (search_keywords);

-- Useful for recency checks/backfills.
CREATE INDEX IF NOT EXISTS idx_inventory_keywords_generated_at
  ON inventory (keywords_generated_at);

-- Lightweight baseline backfill (deterministic) so existing rows have starter keywords.
-- App logic will continue to refine keywords on create/update/manual regenerate.
UPDATE inventory
SET
  search_keywords = ARRAY(
    SELECT DISTINCT lower(token)
    FROM unnest(
      regexp_split_to_array(
        concat_ws(' ', coalesce(name, ''), coalesce(description, ''), coalesce(category, ''), coalesce(sku, '')),
        '\\s+'
      )
    ) AS token
    WHERE length(token) >= 2
  ),
  keyword_version = COALESCE(keyword_version, 'kw_v1'),
  keywords_generated_at = COALESCE(keywords_generated_at, now())
WHERE (search_keywords IS NULL OR cardinality(search_keywords) = 0)
  AND (coalesce(name, '') <> '' OR coalesce(description, '') <> '' OR coalesce(category, '') <> '' OR coalesce(sku, '') <> '');
