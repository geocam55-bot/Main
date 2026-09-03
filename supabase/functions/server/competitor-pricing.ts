import { Hono } from 'npm:hono';

const PREFIX = '/make-server-8405be07';
const ACCEPTANCE_THRESHOLD = 80;

type CompetitorKey = 'kent' | 'homeDepot';

type ShoppingItem = {
  id?: string;
  name?: string;
  description?: string;
  sku?: string;
  manufacturer?: string;
  mfgPartNumber?: string;
  unitOfMeasure?: string;
  competitorData?: Record<string, unknown>;
};

const COMPETITORS: Record<CompetitorKey, {
  label: string;
  domain: string;
  storeName: string;
  storeLocation: string;
}> = {
  kent: {
    label: 'KENT Building Supplies',
    domain: 'kent.ca',
    storeName: 'KENT Building Supplies (Bayers Lake)',
    storeLocation: 'Halifax - Bayers Lake',
  },
  homeDepot: {
    label: 'The Home Depot',
    domain: 'homedepot.ca',
    storeName: 'The Home Depot (Bayers Lake)',
    storeLocation: 'Halifax - Bayers Lake',
  },
};

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&times;|x/g, ' x ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparable(value: unknown): string {
  return normalize(value)
    .replace(/\b(?:in|inch|inches|ft|feet|foot|mm|cm)\b/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function tokens(value: unknown): Set<string> {
  const ignored = new Set(['and', 'the', 'for', 'with', 'from', 'standard', 'frame', 'materials', 'building', 'supply', 'supplies']);
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1 && !ignored.has(token)));
}

function similarity(item: ShoppingItem, candidate: { title?: string; description?: string; url?: string }): number {
  const identifier = normalize(item.sku || item.mfgPartNumber);
  const candidateText = normalize(`${candidate.title || ''} ${candidate.description || ''} ${candidate.url || ''}`);
  if (identifier && candidateText.includes(identifier)) return 100;

  const productDescription = comparable(`${item.description || ''} ${item.name || ''}`);
  const candidateDescription = comparable(`${candidate.title || ''} ${candidate.description || ''}`);
  if (productDescription.length >= 12 && candidateDescription.length >= 12
    && (candidateDescription.includes(productDescription) || productDescription.includes(candidateDescription))) {
    return 100;
  }

  const sourceText = `${item.description || ''} ${item.name || ''} ${item.manufacturer || ''} ${item.mfgPartNumber || ''}`;
  const sourceTokens = tokens(sourceText);
  const candidateTokens = tokens(`${candidate.title || ''} ${candidate.description || ''}`);
  if (sourceTokens.size === 0 || candidateTokens.size === 0) return 0;

  let matches = 0;
  let numericMatches = 0;
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) {
      matches++;
      if (/^\d+(?:\.\d+)?$/.test(token)) numericMatches++;
    }
  }
  const overlap = matches / sourceTokens.size;
  const coverage = matches / candidateTokens.size;
  let score = overlap * 85 + coverage * 15;

  // Retail pages commonly spell dimensions as decimals and add unit words.
  // Three meaningful matches plus two shared dimension numbers is a strong
  // product match even when the retailer title is formatted differently.
  if (matches >= 3 && numericMatches >= 2 && overlap >= 0.55) score = Math.max(score, 82);
  return Math.round(Math.min(100, score));
}

function extractPrice(text: string): number | null {
  const matches = text.match(/(?:CA\$|CAD\s*\$?|\$)\s*([0-9]{1,5}(?:[,.][0-9]{2}))/gi) || [];
  const values = matches
    .map((match) => Number(match.replace(/[^0-9.,]/g, '').replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values[0] : null;
}

function extractAvailability(text: string): boolean | null {
  const normalized = normalize(text);
  if (/out of stock|unavailable|sold out/.test(normalized)) return false;
  if (/in stock|available|ready for pickup/.test(normalized)) return true;
  return null;
}

async function firecrawl(path: string, body: Record<string, unknown>) {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not configured');
  const response = await fetch(`https://api.firecrawl.dev/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Firecrawl request failed (${response.status})`);
  return payload;
}

async function searchCompetitor(item: ShoppingItem, competitor: CompetitorKey) {
  const config = COMPETITORS[competitor];
  const productText = `${item.description || ''} ${item.name || ''}`.trim();
  const identifier = item.mfgPartNumber || item.sku || '';
  const query = `site:${config.domain} ${identifier} ${productText} Halifax Nova Scotia`;
  const exactQuery = `site:${config.domain} "${productText}"`;
  const firstSearch = await firecrawl('search', { query, limit: 5 });
  const firstResults = Array.isArray(firstSearch.data) ? firstSearch.data : [];
  const exactSearch = await firecrawl('search', { query: exactQuery, limit: 5 });
  const results = [...firstResults, ...(Array.isArray(exactSearch.data) ? exactSearch.data : [])];
  const candidates = results
    .filter((result: any) => {
      if (typeof result?.url !== 'string') return false;
      const hostname = new URL(result.url).hostname.toLowerCase();
      return hostname === config.domain || hostname.endsWith(`.${config.domain}`);
    })
    .map((result: any) => ({
      title: result.title || result.metadata?.title || '',
      description: result.description || result.markdown || result.metadata?.description || '',
      url: result.url,
    }))
    .map((candidate: any) => ({ ...candidate, score: similarity(item, candidate) }))
    .sort((left: any, right: any) => right.score - left.score);

  const best = candidates[0];
  const base = {
    storeName: config.storeName,
    storeLocation: config.storeLocation,
    productTitle: best?.title || `${item.name || ''} ${item.description || ''}`.trim(),
    matchConfidencePct: best?.score || 0,
    matchConfidence: best && best.score >= ACCEPTANCE_THRESHOLD ? 'accepted' : 'not_found',
    price: 0,
    inStock: false,
    sku: item.sku || item.mfgPartNumber || '',
    unit: item.unitOfMeasure || 'EA',
    url: best?.url || `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    searchQuery: query,
    checkedAt: new Date().toISOString(),
  };

  if (!best || best.score < ACCEPTANCE_THRESHOLD) {
    return { ...base, notes: `Best match confidence (${base.matchConfidencePct}%) is below the 80% threshold.` };
  }

  const scraped = await firecrawl('scrape', {
    url: best.url,
    formats: ['markdown'],
  });
  const pageText = scraped.data?.markdown || scraped.markdown || '';
  const price = extractPrice(pageText);
  const inStock = extractAvailability(pageText);
  return {
    ...base,
    price: price || 0,
    inStock: inStock ?? false,
    notes: price ? 'Price retrieved from the matched retailer page.' : 'Product matched, but no CAD retail price was found on the page.',
  };
}

export function competitorPricing(app: Hono, authenticateUser: (c: any) => Promise<any>) {
  app.post(`${PREFIX}/competitor-pricing/search`, async (c) => {
    try {
      const auth = await authenticateUser(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status);
      const body = await c.req.json();
      const listId = String(body.listId || '');
      const itemId = String(body.itemId || '');
      const requestedCompetitors = Array.isArray(body.competitors) ? body.competitors : ['kent', 'homeDepot'];
      if (!itemId && !body.item) return c.json({ error: 'itemId or item is required' }, 400);

      let list: any = null;
      let items: ShoppingItem[] = [];
      let itemIndex = -1;
      if (listId) {
        const { data, error: listError } = await auth.supabase
          .from('saved_shopping_lists')
          .select('id, organization_id, items')
          .eq('id', listId)
          .eq('organization_id', auth.profile.organization_id)
          .maybeSingle();
        if (listError) return c.json({ error: listError.message }, 500);
        if (!data) return c.json({ error: 'Shopping List not found' }, 404);
        list = data;
        items = Array.isArray(list.items) ? list.items as ShoppingItem[] : [];
        itemIndex = items.findIndex((item) => String(item.id) === itemId);
        if (itemIndex < 0) return c.json({ error: 'Shopping List item not found' }, 404);
      }

      const item = list ? items[itemIndex] : body.item as ShoppingItem;
      if (!item || typeof item !== 'object') return c.json({ error: 'A valid Shopping List item is required' }, 400);
      const competitorData = { ...(item.competitorData || {}) } as Record<string, unknown>;
      const results: Record<string, unknown> = {};
      for (const competitor of requestedCompetitors) {
        if (competitor !== 'kent' && competitor !== 'homeDepot') continue;
        try {
          const result = await searchCompetitor(item, competitor);
          competitorData[competitor] = result;
          results[competitor] = result;
        } catch (error: any) {
          const failure = {
            ...COMPETITORS[competitor],
            matchConfidence: 'error',
            matchConfidencePct: 0,
            price: 0,
            inStock: false,
            error: error.message || 'Competitor search failed',
            checkedAt: new Date().toISOString(),
          };
          competitorData[competitor] = failure;
          results[competitor] = failure;
        }
      }

      if (list) {
        items[itemIndex] = { ...item, competitorData };
        const { error: updateError } = await auth.supabase
          .from('saved_shopping_lists')
          .update({ items })
          .eq('id', listId)
          .eq('organization_id', auth.profile.organization_id);
        if (updateError) return c.json({ error: updateError.message }, 500);
      }
      return c.json({ success: true, listId, itemId, results });
    } catch (error: any) {
      return c.json({ error: error.message || 'Competitor pricing search failed' }, 500);
    }
  });
}
