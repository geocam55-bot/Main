import { createClient } from './supabase/client';
import { buildInventoryAndSearchClause } from './inventory-keywords';
import type {
  PricingDashboardMetrics,
  PricingDashboardItem,
  ProductCompetitivePricing,
  CompetitorConfig,
  PriceHistoryRecord,
  MatchConfidence,
  CompetitorPriceEntry,
} from '../types/competitive-pricing';

const supabase = createClient();

// Local cache for recently checked items and prices
const localCompetitorOverrides = new Map<string, any[]>();
const localPriceHistory: PriceHistoryRecord[] = [];

// Helper: extract cleaned product title and secondary description mirroring Inventory.tsx logic
export function resolveInventoryTitles(rawName: string = '', rawDescription: string = '', category: string = '') {
  let parsedDescription = rawDescription || '';
  const markerStart = "<!--metadata:";
  const markerEnd = "-->";
  const startIndex = parsedDescription.lastIndexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = parsedDescription.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      parsedDescription = parsedDescription.substring(0, startIndex).trim();
    }
  }

  let finalName = rawName || '';
  let finalDescription = parsedDescription;
  const cleanNameLower = finalName ? finalName.trim().toLowerCase() : '';

  const genericCategoryKeywords = [
    'accessories for', 'pipes, fittings', 'hooks, squares', 'insulating materials',
    'paint types', 'lawn, garden', 'lawn equipment', 'gutters', 'tree, plant',
    'electric heating', 'tools accesso', 'repair parts', 'electric acc.', 'coverings',
    'cables and accesso', 'furniture, bbq', 'electrical appliances', 'wall and floor',
    'portable electric', 'chains, steel', 'motorized lawn', 'building materials',
    'fasteners', 'hand tools', 'power tools', 'plumbing', 'lighting', 'seasonal',
    'hardware', 'outlets,boxes', 'fuses,outlets', 'ventilation', 'heating and cooling',
    'home decor', 'outdoor living', 'building product', 'tools & hardware',
    'electrical & lighting', 'paint & decor'
  ];

  const hasGenericKeyword = genericCategoryKeywords.some(keyword => cleanNameLower.includes(keyword));
  const isGenericOrEmpty = !finalName ||
    finalName.trim() === '' ||
    finalName.trim().toUpperCase() === 'UNDEFINED' ||
    (category && finalName.trim().toLowerCase() === category.trim().toLowerCase()) ||
    hasGenericKeyword;

  if (isGenericOrEmpty && parsedDescription && parsedDescription.trim() !== '') {
    finalName = parsedDescription;
    finalDescription = rawName || '';
  }

  return {
    title: finalName || parsedDescription || rawName || 'Product',
    description: finalDescription || '',
  };
}

export const DEFAULT_COMPETITORS: CompetitorConfig[] = [
  {
    id: 1,
    name: 'KENT Building Supplies',
    websiteUrl: 'https://kent.ca',
    searchUrlTemplate: 'https://kent.ca/catalogsearch/result/?q={query}',
    productUrlPattern: 'kent.ca/',
    active: true,
    scrapingMethod: 'playwright_browser',
    lastSuccessfulCheck: new Date().toISOString(),
    lastError: null,
  },
  {
    id: 2,
    name: 'The Home Depot',
    websiteUrl: 'https://www.homedepot.ca',
    searchUrlTemplate: 'https://www.homedepot.ca/en/home/search.html?q={query}',
    productUrlPattern: 'homedepot.ca/',
    active: true,
    scrapingMethod: 'playwright_browser',
    lastSuccessfulCheck: new Date().toISOString(),
    lastError: null,
  },
];

/**
 * Direct Supabase fallback for Competitive Pricing Dashboard.
 * Works seamlessly in both live deployments and local dev environments
 * without relying on Express server routes.
 */
export async function fetchCompetitivePricingDashboardDirect(filters?: {
  competitorId?: string;
  category?: string;
  varianceFilter?: string;
  confidenceFilter?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ metrics: PricingDashboardMetrics; items: PricingDashboardItem[]; pagination: any }> {
  const pageNum = filters?.page || 1;
  const limitNum = filters?.limit || 150;

  // 1. Fetch inventory items from Supabase
  let itemsQuery = supabase
    .from('inventory')
    .select('id, sku, name, description, category, unit_price, cost, supplier_sku, upc')
    .order('name', { ascending: true });

  if (filters?.search && typeof filters.search === 'string' && filters.search.trim()) {
    const andClause = buildInventoryAndSearchClause(filters.search.trim());
    if (andClause) {
      itemsQuery = itemsQuery.or(andClause);
    }
  }

  if (filters?.category && filters.category !== 'all') {
    itemsQuery = itemsQuery.ilike('category', filters.category);
  }

  const { data: invRows, error: invErr } = await itemsQuery.range(0, 999);
  if (invErr) {
    console.warn('[Direct Pricing Client] Inventory fetch error:', invErr);
    return {
      metrics: {
        totalMonitored: 0,
        withCompetitivePricing: 0,
        noMatch: 0,
        ronaHigher: 0,
        ronaLower: 0,
        outdatedPrices: 0,
        lastSuccessfulUpdate: null,
      },
      items: [],
      pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 1 },
    };
  }

  const products = invRows && invRows.length > 0 ? invRows : [];
  const productIds = products.map((p: any) => String(p.id));
  const productSkus = products.map((p: any) => String(p.sku || '')).filter(Boolean);

  const matchesMap = new Map<string, any[]>();
  const pricesMap = new Map<string, any>();
  const competitorsMap = new Map<number | string, string>();

  // 2. Fetch Competitors
  try {
    const { data: comps } = await supabase.from('competitors').select('*');
    if (comps && comps.length > 0) {
      comps.forEach((c: any) => competitorsMap.set(c.id, c.name));
    } else {
      DEFAULT_COMPETITORS.forEach((c) => competitorsMap.set(c.id, c.name));
    }
  } catch (e) {
    DEFAULT_COMPETITORS.forEach((c) => competitorsMap.set(c.id, c.name));
  }

  // 3. Fetch Matches & Prices
  try {
    const { data: matches } = await supabase
      .from('product_matches')
      .select('*, competitor_products(*)')
      .limit(5000);

    if (matches && matches.length > 0) {
      for (const m of matches) {
        const prodId = String(m.product_id);
        if (!matchesMap.has(prodId)) {
          matchesMap.set(prodId, []);
        }
        matchesMap.get(prodId)!.push(m);
      }

      const compProductIds = Array.from(new Set(matches.map((m: any) => m.competitor_product_id).filter(Boolean)));
      if (compProductIds.length > 0) {
        // Query in chunks of 200 to stay safely under Supabase query limits
        for (let i = 0; i < compProductIds.length; i += 200) {
          const chunk = compProductIds.slice(i, i + 200);
          const { data: cpList } = await supabase
            .from('competitor_prices')
            .select('*')
            .in('competitor_product_id', chunk);

          if (cpList) {
            for (const cp of cpList) {
              const prev = pricesMap.get(String(cp.competitor_product_id));
              // Keep the latest checked price
              if (!prev || new Date(cp.checked_at || 0) > new Date(prev.checked_at || 0)) {
                pricesMap.set(String(cp.competitor_product_id), cp);
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Direct Pricing Client] Product matches lookup warning:', e);
  }

  // 4. Map products to Dashboard items
  const allDashboardItems: PricingDashboardItem[] = products.map((p: any) => {
    const { title, description } = resolveInventoryTitles(p.name, p.description, p.category);
    const rawUnitPrice = Number(p.unit_price || 0);
    const yourPrice = rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : rawUnitPrice;

    const prodMatches = matchesMap.get(String(p.id)) || matchesMap.get(String(p.sku)) || matchesMap.get(String(p.supplier_sku)) || [];
    
    // Check local overrides
    const localOverrides = localCompetitorOverrides.get(String(p.id)) || localCompetitorOverrides.get(String(p.sku)) || [];

    let lowestCompPrice: number | null = null;
    let compName: string | undefined = undefined;
    let conf: MatchConfidence = prodMatches.length > 0 ? (prodMatches[0].match_confidence || 'HIGH') : 'UNMATCHED';
    let lastCheckedAt: string | null = null;
    let competitorCount = prodMatches.length + localOverrides.length;

    for (const m of prodMatches) {
      const cpId = String(m.competitor_product_id);
      const priceRec = pricesMap.get(cpId);
      if (priceRec && priceRec.current_price) {
        const pVal = Number(priceRec.current_price);
        if (lowestCompPrice === null || pVal < lowestCompPrice) {
          lowestCompPrice = pVal;
          const compId = m.competitor_products?.competitor_id;
          compName = competitorsMap.get(compId) || 'Competitor';
          lastCheckedAt = priceRec.checked_at || priceRec.created_at || null;
        }
      }
    }

    for (const override of localOverrides) {
      if (override.price > 0 && (lowestCompPrice === null || override.price < lowestCompPrice)) {
        lowestCompPrice = override.price;
        compName = override.competitorName || competitorsMap.get(override.competitorId) || 'Competitor';
        lastCheckedAt = override.checkedAt || new Date().toISOString();
        conf = override.matchConfidence || 'EXACT';
      }
    }

    const diff = lowestCompPrice !== null ? yourPrice - lowestCompPrice : null;
    const varPct = diff !== null && lowestCompPrice && lowestCompPrice > 0
      ? Number(((diff / lowestCompPrice) * 100).toFixed(1))
      : null;
    const isOutdated = lastCheckedAt
      ? Date.now() - new Date(lastCheckedAt).getTime() > 1000 * 60 * 60 * 24
      : lowestCompPrice !== null;

    return {
      productId: p.id,
      sku: p.sku || String(p.id),
      name: title,
      description: description,
      category: p.category || 'General',
      yourPrice,
      lowestCompetitorPrice: lowestCompPrice,
      lowestCompetitorName: compName,
      priceDifference: diff,
      variancePct: varPct,
      matchConfidence: conf,
      competitorCount,
      lastCheckedAt,
      isOutdated,
    };
  });

  // 5. Calculate Metrics
  const totalMonitored = allDashboardItems.length;
  const withCompetitivePricing = allDashboardItems.filter((i) => i.lowestCompetitorPrice !== null).length;
  const noMatch = allDashboardItems.filter((i) => i.lowestCompetitorPrice === null).length;
  const ronaHigher = allDashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference > 0).length;
  const ronaLower = allDashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference < 0).length;
  const outdatedPrices = allDashboardItems.filter((i) => i.isOutdated).length;
  const lastSuccessfulUpdate = allDashboardItems.reduce((latest, i) => {
    if (!i.lastCheckedAt) return latest;
    return !latest || new Date(i.lastCheckedAt) > new Date(latest) ? i.lastCheckedAt : latest;
  }, null as string | null);

  // 6. Filter & Paginate
  let dashboardItems = allDashboardItems;
  if (filters?.varianceFilter === 'higher') {
    dashboardItems = dashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference > 0);
  } else if (filters?.varianceFilter === 'lower') {
    dashboardItems = dashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference < 0);
  } else if (filters?.varianceFilter === 'no_match') {
    dashboardItems = dashboardItems.filter((i) => i.lowestCompetitorPrice === null);
  } else if (filters?.varianceFilter === 'outdated') {
    dashboardItems = dashboardItems.filter((i) => i.isOutdated);
  }

  if (filters?.confidenceFilter && filters.confidenceFilter !== 'all') {
    dashboardItems = dashboardItems.filter((i) => i.matchConfidence === filters.confidenceFilter);
  }

  const totalFiltered = dashboardItems.length;
  const paginatedItems = dashboardItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    metrics: {
      totalMonitored,
      withCompetitivePricing,
      noMatch,
      ronaHigher,
      ronaLower,
      outdatedPrices,
      lastSuccessfulUpdate,
    },
    items: paginatedItems,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalFiltered,
      totalPages: Math.ceil(totalFiltered / limitNum) || 1,
    },
  };
}

/**
 * Direct Supabase fallback for fetching product competitive pricing details.
 */
export async function fetchProductCompetitivePricingDirect(
  productId: string | number
): Promise<ProductCompetitivePricing> {
  const pidStr = String(productId).trim();

  // Find product in Supabase inventory
  let query = supabase
    .from('inventory')
    .select('*');

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pidStr);
  if (isUUID) {
    query = query.eq('id', pidStr);
  } else {
    query = query.or(`sku.eq.${pidStr},supplier_sku.eq.${pidStr},name.ilike.%${pidStr}%`);
  }

  const { data: invItem } = await query.maybeSingle();

  const titleAndDesc = invItem
    ? resolveInventoryTitles(invItem.name, invItem.description, invItem.category)
    : { title: `Product ${pidStr}`, description: '' };

  const rawPrice = Number(invItem?.unit_price || invItem?.unitPrice || 0);
  const yourPrice = rawPrice > 0 && Number.isInteger(rawPrice) ? rawPrice / 100 : rawPrice;

  // Retrieve competitors map
  const competitorsMap = new Map<number | string, string>();
  try {
    const { data: comps } = await supabase.from('competitors').select('*');
    if (comps) {
      comps.forEach((c: any) => competitorsMap.set(c.id, c.name));
    }
  } catch (e) {
    DEFAULT_COMPETITORS.forEach((c) => competitorsMap.set(c.id, c.name));
  }

  // Retrieve product matches
  const competitorEntries: CompetitorPriceEntry[] = [];
  try {
    const { data: matches } = await supabase
      .from('product_matches')
      .select('*, competitor_products(*)')
      .or(`product_id.eq.${pidStr},product_id.eq.${invItem?.sku || ''}`);

    if (matches && matches.length > 0) {
      const compProductIds = matches.map((m: any) => m.competitor_product_id).filter(Boolean);
      const pricesMap = new Map<string, any>();

      if (compProductIds.length > 0) {
        const { data: cpList } = await supabase
          .from('competitor_prices')
          .select('*')
          .in('competitor_product_id', compProductIds);

        if (cpList) {
          for (const cp of cpList) {
            pricesMap.set(String(cp.competitor_product_id), cp);
          }
        }
      }

      for (const m of matches) {
        const cp = m.competitor_products;
        const priceRec = pricesMap.get(String(m.competitor_product_id));
        const price = Number(priceRec?.current_price || 0);
        const compId = cp?.competitor_id || 1;
        const compName = competitorsMap.get(compId) || (compId === 1 ? 'KENT Building Supplies' : 'The Home Depot');

        competitorEntries.push({
          competitorId: compId,
          competitorName: compName,
          websiteUrl: compId === 1 ? 'https://kent.ca' : 'https://www.homedepot.ca',
          productUrl: cp?.product_url || undefined,
          productName: cp?.product_name || titleAndDesc.title,
          sku: cp?.external_product_id || undefined,
          price,
          currency: 'CAD',
          unitOfMeasure: cp?.unit_of_measure || invItem?.unit_of_measure || 'EA',
          packQuantity: cp?.pack_quantity || 1,
          normalizedUnitPrice: price,
          matchConfidence: (m.match_confidence as MatchConfidence) || 'HIGH',
          matchMethod: m.match_method || 'DESCRIPTION',
          availability: (cp?.availability as any) || (price > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
          checkedAt: priceRec?.checked_at || m.updated_at || new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.warn('[Direct Pricing Client] Fetch product matches error:', e);
  }

  // Include any local overrides
  const overrides = localCompetitorOverrides.get(pidStr) || (invItem?.sku ? localCompetitorOverrides.get(invItem.sku) : []);
  if (overrides) {
    for (const ov of overrides) {
      const idx = competitorEntries.findIndex((e) => Number(e.competitorId) === Number(ov.competitorId));
      const entry: CompetitorPriceEntry = {
        competitorId: ov.competitorId,
        competitorName: ov.competitorName || competitorsMap.get(ov.competitorId) || 'Competitor',
        websiteUrl: ov.competitorId === 1 ? 'https://kent.ca' : 'https://www.homedepot.ca',
        productUrl: ov.productUrl || undefined,
        productName: ov.productName || titleAndDesc.title,
        price: Number(ov.price || 0),
        currency: 'CAD',
        unitOfMeasure: 'EA',
        normalizedUnitPrice: Number(ov.price || 0),
        matchConfidence: ov.matchConfidence || 'EXACT',
        matchMethod: ov.matchMethod || 'MANUAL_OVERRIDE',
        availability: Number(ov.price) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        checkedAt: ov.checkedAt || new Date().toISOString(),
        notes: ov.notes,
      };

      if (idx !== -1) {
        competitorEntries[idx] = entry;
      } else {
        competitorEntries.push(entry);
      }
    }
  }

  return {
    productId: invItem?.id || pidStr,
    sku: invItem?.sku || pidStr,
    productName: titleAndDesc.title,
    description: titleAndDesc.description,
    category: invItem?.category || 'General',
    yourPrice,
    currency: 'CAD',
    unitOfMeasure: invItem?.unit_of_measure || 'EA',
    mfgPartNumber: invItem?.supplier_sku || undefined,
    upc: invItem?.upc || undefined,
    competitors: competitorEntries,
    lastCheckedAt: competitorEntries.length > 0 ? competitorEntries[0].checkedAt : undefined,
  };
}

/**
 * Direct Supabase fallback for Competitors list.
 */
export async function fetchCompetitorsDirect(): Promise<CompetitorConfig[]> {
  try {
    const { data: comps, error } = await supabase.from('competitors').select('*').order('id', { ascending: true });
    if (!error && comps && comps.length > 0) {
      return comps.map((c: any) => ({
        id: c.id,
        name: c.name,
        websiteUrl: c.website_url,
        searchUrlTemplate: c.search_url_template,
        productUrlPattern: c.product_url_pattern,
        active: c.active ?? true,
        scrapingMethod: c.scraping_method,
        lastSuccessfulCheck: c.last_successful_check,
        lastError: c.last_error,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    }
  } catch (e) {
    console.warn('[Direct Pricing Client] Competitors table query warning:', e);
  }
  return DEFAULT_COMPETITORS;
}

/**
 * Direct Supabase fallback for Updating Competitor configuration.
 */
export async function updateCompetitorDirect(
  id: string | number,
  data: Partial<CompetitorConfig>
): Promise<CompetitorConfig> {
  const compId = Number(id);
  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.websiteUrl !== undefined) updatePayload.website_url = data.websiteUrl;
  if (data.active !== undefined) updatePayload.active = data.active;
  if (data.searchUrlTemplate !== undefined) updatePayload.search_url_template = data.searchUrlTemplate;
  updatePayload.updated_at = new Date().toISOString();

  try {
    const { data: updated, error } = await supabase
      .from('competitors')
      .update(updatePayload)
      .eq('id', compId)
      .select()
      .maybeSingle();

    if (!error && updated) {
      return {
        id: updated.id,
        name: updated.name,
        websiteUrl: updated.website_url,
        searchUrlTemplate: updated.search_url_template,
        productUrlPattern: updated.product_url_pattern,
        active: updated.active ?? true,
        scrapingMethod: updated.scraping_method,
        lastSuccessfulCheck: updated.last_successful_check,
        lastError: updated.last_error,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    }
  } catch (e) {
    console.warn('[Direct Pricing Client] Update competitor in Supabase failed:', e);
  }

  const def = DEFAULT_COMPETITORS.find((c) => Number(c.id) === compId) || DEFAULT_COMPETITORS[0];
  return { ...def, ...data, id: compId };
}

/**
 * Direct fallback for saving competitor price override.
 */
export async function saveCompetitorPriceDirect(
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
): Promise<{ success: boolean }> {
  const pidStr = String(productId).trim();
  const numPrice = Number(data.price || 0);

  const override = {
    competitorId: data.competitorId,
    competitorName: data.competitorId === 1 ? 'KENT Building Supplies' : 'The Home Depot',
    price: numPrice,
    productName: data.productName,
    productUrl: data.productUrl,
    notes: data.notes,
    matchConfidence: data.matchConfidence || 'EXACT',
    matchMethod: data.matchMethod || 'MANUAL_OVERRIDE',
    checkedAt: new Date().toISOString(),
  };

  const existing = localCompetitorOverrides.get(pidStr) || [];
  const updated = existing.filter((c) => Number(c.competitorId) !== Number(data.competitorId));
  updated.push(override);
  localCompetitorOverrides.set(pidStr, updated);

  localPriceHistory.unshift({
    id: `hist_${Date.now()}`,
    productId: pidStr,
    competitorId: data.competitorId,
    competitorName: override.competitorName,
    price: numPrice,
    normalizedUnitPrice: numPrice,
    currency: 'CAD',
    checkedAt: override.checkedAt,
    availability: numPrice > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
  });

  return { success: true };
}

/**
 * Direct fallback for fetching price history.
 */
export async function fetchPriceHistoryDirect(productId: string | number): Promise<PriceHistoryRecord[]> {
  const pidStr = String(productId).trim();
  const filtered = localPriceHistory.filter((h) => String(h.productId) === pidStr);
  return filtered;
}
