const fs = require('fs');
let code = fs.readFileSync('src/utils/api.ts', 'utf8');

// Let's rewrite competitivePricingAPI cleanly with safeParseJson
const newCompetitiveAPI = `// Competitive Pricing API - REST Interface to ProSpaces Pricing Engine & Workers
export const competitivePricingAPI = {
  getPricing: async (productId: string | number): Promise<ProductCompetitivePricing> => {
    const headers = await getServerHeaders();
    const res = await fetch(\`/api/products/\${encodeURIComponent(String(productId))}/competitive-pricing\`, { headers });
    if (!res.ok) {
      let errorMsg = \`Failed to fetch competitive pricing (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  requestRefresh: async (
    productId: string | number,
    criteria?: {
      upc?: string;
      mfgPartNumber?: string;
      description?: string;
      name?: string;
      searchQuery?: string;
    }
  ): Promise<{ jobId: string; status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' }> => {
    const headers = await getServerHeaders();
    const res = await fetch(\`/api/products/\${encodeURIComponent(String(productId))}/competitive-pricing/refresh\`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria || {}),
    });
    if (!res.ok) {
      let errorMsg = \`Refresh request failed (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  saveCompetitorPrice: async (
    productId: string | number,
    data: {
      competitorId: number;
      price: number;
      productName?: string;
      productUrl?: string;
      notes?: string;
      matchConfidence?: string;
      matchMethod?: string;
    }
  ): Promise<{ success: boolean }> => {
    const headers = await getServerHeaders();
    const res = await fetch(\`/api/products/\${encodeURIComponent(String(productId))}/competitive-pricing\`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errorMsg = \`Failed to save price (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  getJobStatus: async (jobId: string): Promise<PricingJobResponse> => {
    const headers = await getServerHeaders();
    const res = await fetch(\`/api/pricing-jobs/\${jobId}\`, { headers });
    if (!res.ok) {
      let errorMsg = \`Failed to fetch job status (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  getPriceHistory: async (productId: string | number): Promise<PriceHistoryRecord[]> => {
    const headers = await getServerHeaders();
    const res = await fetch(\`/api/products/\${encodeURIComponent(String(productId))}/competitive-pricing/history\`, { headers });
    if (!res.ok) {
      let errorMsg = \`Failed to fetch price history (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  getDashboard: async (filters?: {
    competitorId?: string;
    category?: string;
    varianceFilter?: string;
    confidenceFilter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ metrics: PricingDashboardMetrics; items: PricingDashboardItem[]; pagination: any }> => {
    const headers = await getServerHeaders();
    const query = new URLSearchParams();
    if (filters?.competitorId) query.set('competitorId', filters.competitorId);
    if (filters?.category) query.set('category', filters.category);
    if (filters?.varianceFilter && filters.varianceFilter !== 'all') query.set('varianceFilter', filters.varianceFilter);
    if (filters?.confidenceFilter && filters.confidenceFilter !== 'all') query.set('confidenceFilter', filters.confidenceFilter);
    if (filters?.search) query.set('search', filters.search);
    if (filters?.page) query.set('page', filters.page.toString());
    if (filters?.limit) query.set('limit', filters.limit.toString());
    const qs = query.toString();
    const res = await fetch(\`/api/competitive-pricing/dashboard\${qs ? \`?\${qs}\` : ''}\`, { headers });
    if (!res.ok) {
      let errorMsg = \`Failed to fetch pricing dashboard (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  runPricingAgent: async (): Promise<{ success: boolean; message: string }> => {
    const headers = await getServerHeaders();
    const res = await fetch('/api/competitive-pricing/agent/start', {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      let errorMsg = \`Failed to start pricing agent (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  getPricingAgentLogs: async (): Promise<{ logs: string }> => {
    const headers = await getServerHeaders();
    const res = await fetch('/api/competitive-pricing/agent/logs', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      let errorMsg = \`Failed to fetch logs (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  getCompetitors: async (): Promise<CompetitorConfig[]> => {
    const headers = await getServerHeaders();
    const res = await fetch('/api/competitive-pricing/admin/competitors', { headers });
    if (!res.ok) {
      let errorMsg = \`Failed to fetch competitors (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },
  updateCompetitor: async (id: string | number, data: Partial<CompetitorConfig>): Promise<CompetitorConfig> => {
    const headers = await getServerHeaders();
    const res = await fetch(\`/api/competitive-pricing/admin/competitors/\${id}\`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errorMsg = \`Failed to update competitor (\${res.status})\`;
      try {
        const err = await safeParseJson(res);
        errorMsg = err.error || err.message || errorMsg;
      } catch (e: any) {
        if (e.message && !e.message.includes('Server returned HTML')) errorMsg = e.message;
      }
      throw new Error(errorMsg);
    }
    return safeParseJson(res);
  },`;

const startIdx = code.indexOf('export const competitivePricingAPI = {');
const endIdx = code.indexOf('pollJobUntilComplete: async (', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const oldSection = code.substring(startIdx, endIdx);
  code = code.replace(oldSection, newCompetitiveAPI + '\n  ');
  fs.writeFileSync('src/utils/api.ts', code);
  console.log("Updated competitivePricingAPI with safeParseJson successfully!");
} else {
  console.error("Could not locate competitivePricingAPI range!");
}
