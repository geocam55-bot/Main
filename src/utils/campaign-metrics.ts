export function toFiniteNumber(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseMetaSource(source: any): Record<string, any> {
  if (!source) return {};

  if (typeof source === 'object') {
    return source;
  }

  if (typeof source === 'string') {
    const text = source.trim();
    if (!text.startsWith('{')) return {};

    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function mergeMetaObjects(...sources: any[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const source of sources) {
    const parsed = parseMetaSource(source);

    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = mergeMetaObjects(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

export function parseCampaignMeta(campaign: any): Record<string, any> {
  return mergeMetaObjects(
    campaign?.description,
    campaign?.metadata,
    campaign?.meta,
    campaign?.metrics,
    campaign?.stats,
    campaign?.analytics,
  );
}

function findMetricValue(source: any, keys: string[]): number | null {
  if (!source || typeof source !== 'object') return null;

  for (const key of keys) {
    const directValue = toFiniteNumber(source?.[key]);
    if (directValue !== null) return directValue;
  }

  for (const value of Object.values(source)) {
    if (!value || typeof value !== 'object') continue;

    const nestedValue = findMetricValue(value, keys);
    if (nestedValue !== null) return nestedValue;
  }

  return null;
}

function findStringValue(source: any, keys: string[]): string | null {
  if (!source || typeof source !== 'object') return null;

  for (const key of keys) {
    const directValue = source?.[key];
    if (typeof directValue === 'string' && directValue.trim()) return directValue.trim();
  }

  for (const value of Object.values(source)) {
    if (!value || typeof value !== 'object') continue;

    const nestedValue = findStringValue(value, keys);
    if (nestedValue) return nestedValue;
  }

  return null;
}

export function getCampaignMetric(campaign: any, keys: string[], defaultValue = 0): number {
  const meta = parseCampaignMeta(campaign);
  const nestedMetaValue = findMetricValue(meta, keys);

  for (const key of keys) {
    const topLevel = toFiniteNumber(campaign?.[key]);
    const metaValue = toFiniteNumber(meta?.[key]);

    if (topLevel !== null) {
      if (topLevel === 0) {
        if (metaValue !== null && metaValue !== 0) return metaValue;
        if (nestedMetaValue !== null && nestedMetaValue !== 0) return nestedMetaValue;
      }
      return topLevel;
    }

    if (metaValue !== null) return metaValue;
  }

  if (nestedMetaValue !== null) return nestedMetaValue;

  return defaultValue;
}

export function normalizeCampaignMetrics<T extends Record<string, any>>(campaign: T): T & {
  meta: Record<string, any>;
  audience_metric: number;
  sent_metric: number;
  opened_metric: number;
  clicked_metric: number;
  converted_metric: number;
  revenue_metric: number;
  avg_time_spent_metric: number;
  landing_page_slug_metric: string | null;
} {
  const meta = parseCampaignMeta(campaign);

  return {
    ...campaign,
    meta,
    audience_metric: getCampaignMetric(campaign, ['audience_count', 'audience', 'audienceCount']),
    sent_metric: getCampaignMetric(campaign, ['sent_count', 'sent', 'sentCount']),
    opened_metric: getCampaignMetric(campaign, ['opened_count', 'opened', 'openedCount']),
    clicked_metric: getCampaignMetric(campaign, ['clicked_count', 'clicked', 'clickedCount', 'landing_page_clicks', 'landingPageClicks']),
    converted_metric: getCampaignMetric(campaign, ['converted_count', 'converted', 'convertedCount', 'conversions', 'conversionCount']),
    revenue_metric: getCampaignMetric(campaign, ['revenue', 'totalRevenue', 'total_revenue', 'revenueAmount', 'revenue_amount', 'attributedRevenue', 'attributed_revenue']),
    avg_time_spent_metric: getCampaignMetric(campaign, ['avg_time_spent', 'avgTimeSpent']),
    landing_page_slug_metric: campaign?.landing_page_slug || findStringValue(meta, ['landingPageSlug', 'landing_page_slug', 'slug']) || null,
  };
}