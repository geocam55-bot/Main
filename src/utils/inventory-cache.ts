import { createClient } from './supabase/client';

const supabase = createClient();
const itemCache = new Map<string, any>();
const pendingFetches = new Map<string, Promise<any>>();

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
          .select('id, name, sku, category, description, cost, priceTier1, status')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      });
      if (data) {
        itemCache.set(id, data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch cached inventory item after retries:', err);
    } finally {
      pendingFetches.delete(id);
    }
    return null;
  })();

  pendingFetches.set(id, promise);
  return promise;
}
