import { describe, expect, it } from 'vitest';
import { normalizeCampaignMetrics } from './campaign-metrics';

describe('normalizeCampaignMetrics', () => {
  it('prefers non-zero revenue from metadata when top-level revenue is zero', () => {
    const campaign = normalizeCampaignMetrics({
      id: 'campaign-1',
      revenue: 0,
      metadata: {
        totalRevenue: 18500,
      },
    });

    expect(campaign.revenue_metric).toBe(18500);
  });

  it('reads nested metrics from JSON description payloads', () => {
    const campaign = normalizeCampaignMetrics({
      id: 'campaign-2',
      description: JSON.stringify({
        stats: {
          sentCount: 120,
          convertedCount: 3,
        },
        metrics: {
          totalRevenue: 9250,
        },
      }),
    });

    expect(campaign.sent_metric).toBe(120);
    expect(campaign.converted_metric).toBe(3);
    expect(campaign.revenue_metric).toBe(9250);
  });
});
