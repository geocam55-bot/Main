-- Backfill historical campaign metrics from nested or camelCase JSON metadata.
-- Safe to run multiple times.

WITH parsed_campaigns AS (
  SELECT
    c.id,
    to_jsonb(c) AS row_meta,
    CASE
      WHEN c.description IS NOT NULL AND btrim(c.description) LIKE '{%'
        THEN NULLIF(c.description, '')::jsonb
      ELSE '{}'::jsonb
    END AS meta
  FROM campaigns AS c
),
resolved_metrics AS (
  SELECT
    parsed.id,
    COALESCE(
      NULLIF(parsed.meta ->> 'audience_count', '')::integer,
      NULLIF(parsed.meta ->> 'audienceCount', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'audience_count', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'audienceCount', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'audience_count', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'audienceCount', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'audience_count', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'audienceCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'audience_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'audienceCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'audience_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'audienceCount', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'audience_count', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'audienceCount', '')::integer,
      0
    ) AS audience_count_new,
    COALESCE(
      NULLIF(parsed.meta ->> 'sent_count', '')::integer,
      NULLIF(parsed.meta ->> 'sentCount', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'sent_count', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'sentCount', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'sent_count', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'sentCount', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'sent_count', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'sentCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'sent_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'sentCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'sent_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'sentCount', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'sent_count', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'sentCount', '')::integer,
      0
    ) AS sent_count_new,
    COALESCE(
      NULLIF(parsed.meta ->> 'opened_count', '')::integer,
      NULLIF(parsed.meta ->> 'openedCount', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'opened_count', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'openedCount', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'opened_count', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'openedCount', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'opened_count', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'openedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'opened_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'openedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'opened_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'openedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'opened_count', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'openedCount', '')::integer,
      0
    ) AS opened_count_new,
    COALESCE(
      NULLIF(parsed.meta ->> 'clicked_count', '')::integer,
      NULLIF(parsed.meta ->> 'clickedCount', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'clicked_count', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'clickedCount', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'clicked_count', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'clickedCount', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'clicked_count', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'clickedCount', '')::integer,
      NULLIF(parsed.meta ->> 'landing_page_clicks', '')::integer,
      NULLIF(parsed.meta ->> 'landingPageClicks', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'clicked_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'clickedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'clicked_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'clickedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'clicked_count', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'clickedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'landing_page_clicks', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'landingPageClicks', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'landing_page_clicks', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'landingPageClicks', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'landing_page_clicks', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'landingPageClicks', '')::integer,
      0
    ) AS clicked_count_new,
    COALESCE(
      NULLIF(parsed.meta ->> 'converted_count', '')::integer,
      NULLIF(parsed.meta ->> 'convertedCount', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'converted_count', '')::integer,
      NULLIF(parsed.meta -> 'metadata' ->> 'convertedCount', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'converted_count', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'convertedCount', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'converted_count', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'convertedCount', '')::integer,
      NULLIF(parsed.meta ->> 'conversions', '')::integer,
      NULLIF(parsed.meta -> 'metrics' ->> 'conversions', '')::integer,
      NULLIF(parsed.meta -> 'stats' ->> 'conversions', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'converted_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'convertedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'converted_count', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'convertedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'converted_count', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'convertedCount', '')::integer,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'conversions', '')::integer,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'conversions', '')::integer,
      NULLIF(parsed.row_meta -> 'stats' ->> 'conversions', '')::integer,
      0
    ) AS converted_count_new,
    COALESCE(
      NULLIF(parsed.meta ->> 'revenue', '')::numeric,
      NULLIF(parsed.meta ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.meta ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.meta -> 'metadata' ->> 'revenue', '')::numeric,
      NULLIF(parsed.meta -> 'metadata' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.meta -> 'metadata' ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.meta -> 'metrics' ->> 'revenue', '')::numeric,
      NULLIF(parsed.meta -> 'metrics' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.meta -> 'metrics' ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.meta -> 'stats' ->> 'revenue', '')::numeric,
      NULLIF(parsed.meta -> 'stats' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.meta -> 'stats' ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'metadata' ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'metrics' ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'stats' ->> 'revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'stats' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'stats' ->> 'total_revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'analytics' ->> 'revenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'analytics' ->> 'totalRevenue', '')::numeric,
      NULLIF(parsed.row_meta -> 'analytics' ->> 'total_revenue', '')::numeric,
      0
    ) AS revenue_new
  FROM parsed_campaigns AS parsed
)
UPDATE campaigns AS c
SET
  audience_count = GREATEST(COALESCE(c.audience_count, 0), resolved.audience_count_new),
  sent_count = GREATEST(COALESCE(c.sent_count, 0), resolved.sent_count_new),
  opened_count = GREATEST(COALESCE(c.opened_count, 0), resolved.opened_count_new),
  clicked_count = GREATEST(COALESCE(c.clicked_count, 0), resolved.clicked_count_new),
  converted_count = GREATEST(COALESCE(c.converted_count, 0), resolved.converted_count_new),
  revenue = GREATEST(COALESCE(c.revenue, 0), resolved.revenue_new)
FROM resolved_metrics AS resolved
WHERE c.id = resolved.id
  AND (
    resolved.audience_count_new > COALESCE(c.audience_count, 0)
    OR resolved.sent_count_new > COALESCE(c.sent_count, 0)
    OR resolved.opened_count_new > COALESCE(c.opened_count, 0)
    OR resolved.clicked_count_new > COALESCE(c.clicked_count, 0)
    OR resolved.converted_count_new > COALESCE(c.converted_count, 0)
    OR resolved.revenue_new > COALESCE(c.revenue, 0)
  );