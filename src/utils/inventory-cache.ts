import { createClient } from './supabase/client';

import { getServerHeaders } from './server-headers';
import { buildServerFunctionUrl } from './server-function-url';

const supabase = createClient();
const itemCache = new Map<string, any>();
const pendingFetches = new Map<string, Promise<any>>();
const PRIMARY_ORG_ID = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const msg = err?.message || String(err);
      const isRateLimit = msg.includes('Rate exceeded') || msg.includes('429') || msg.includes('over_request_rate_limit');
      if (isRateLimit && attempt <= maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
}

export async function getCachedInventoryItem(id: string): Promise<any | null> {
  if (!id || id === 'none') return null;
  if (itemCache.has(id)) {
    return itemCache.get(id);
  }
  if (pendingFetches.has(id)) {
    return pendingFetches.get(id);
  }

  const promise = (async () => {
    try {
      const data = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, sku, category, description, cost, unit_price, status')
          .eq('id', id)
          .maybeSingle();
        if (error) {
          // Retry with minimal guaranteed columns if optional columns (unit_price/status) are missing
          const fallback = await supabase
            .from('inventory')
            .select('id, name, sku, category, description')
            .eq('id', id)
            .maybeSingle();
          if (fallback.error) throw fallback.error;
          return fallback.data;
        }
        return data;
      });
      if (data) {
        itemCache.set(id, data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch cached inventory item directly:', err);
    }

    // Fallback to service-role server endpoint in case client RLS blocked the direct read
    try {
      const orgId =
        (typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') : null) ||
        PRIMARY_ORG_ID;
      const orgsToTry = Array.from(new Set([orgId, PRIMARY_ORG_ID].filter(Boolean)));
      const headers = await getServerHeaders();
      for (const candidateOrg of orgsToTry) {
        const url = buildServerFunctionUrl(
          `/project-wizard-inventory/${encodeURIComponent(candidateOrg)}?ids=${encodeURIComponent(id)}`
        );
        const res = await fetch(url, { headers });
        if (res.ok) {
          const payload = await res.json();
          const item = Array.isArray(payload?.items) ? payload.items[0] : null;
          if (item) {
            itemCache.set(id, item);
            return item;
          }
        }
      }
    } catch (serverErr) {
      console.warn('Failed to fetch cached inventory item via server:', serverErr);
    } finally {
      pendingFetches.delete(id);
    }
    return null;
  })();

  pendingFetches.set(id, promise);
  return promise;
}
