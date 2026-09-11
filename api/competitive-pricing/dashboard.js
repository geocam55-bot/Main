import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

function resolveInventoryTitles(rawName = '', rawDescription = '', category = '') {
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

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();
    const supabase = createClient(url, anonKey);

    const { category, varianceFilter, confidenceFilter, search, page = 1, limit = 150 } = req.query || {};
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 150;

    let itemsQuery = supabase
      .from('inventory')
      .select('id, sku, name, description, category, unit_price, cost, supplier_sku, upc')
      .order('name', { ascending: true });

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      itemsQuery = itemsQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (category && category !== 'all') {
      itemsQuery = itemsQuery.eq('category', category);
    }

    const { data: invRows, error: invErr } = await itemsQuery.range(0, 999);
    const products = invRows && invRows.length > 0 ? invRows : [];
    const productIds = products.map((p) => String(p.id));
    const productSkus = products.map((p) => String(p.sku || '')).filter(Boolean);

    const matchesMap = new Map();
    const pricesMap = new Map();
    const competitorsMap = new Map();
    competitorsMap.set(1, 'KENT Building Supplies');
    competitorsMap.set(2, 'The Home Depot');

    try {
      const { data: comps } = await supabase.from('competitors').select('*');
      if (comps && comps.length > 0) {
        comps.forEach((c) => competitorsMap.set(c.id, c.name));
      }
    } catch (e) {}

    if (productIds.length > 0) {
      try {
        const allQueryIds = Array.from(new Set([...productIds, ...productSkus]));
        const { data: matches } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', allQueryIds.slice(0, 200));

        if (matches && matches.length > 0) {
          for (const m of matches) {
            const prodId = String(m.product_id);
            if (!matchesMap.has(prodId)) {
              matchesMap.set(prodId, []);
            }
            matchesMap.get(prodId).push(m);
          }

          const compProductIds = matches.map((m) => m.competitor_product_id).filter(Boolean);
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
        }
      } catch (e) {}
    }

    const allDashboardItems = products.map((p) => {
      const { title, description } = resolveInventoryTitles(p.name, p.description, p.category);
      const rawUnitPrice = Number(p.unit_price || 0);
      const yourPrice = rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : rawUnitPrice;

      const prodMatches = matchesMap.get(String(p.id)) || matchesMap.get(String(p.sku)) || [];
      let lowestCompPrice = null;
      let compName = undefined;
      let conf = prodMatches.length > 0 ? (prodMatches[0].match_confidence || 'HIGH') : 'UNMATCHED';
      let lastCheckedAt = null;
      let competitorCount = prodMatches.length;

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

    const totalMonitored = allDashboardItems.length;
    const withCompetitivePricing = allDashboardItems.filter((i) => i.lowestCompetitorPrice !== null).length;
    const noMatch = allDashboardItems.filter((i) => i.lowestCompetitorPrice === null).length;
    const ronaHigher = allDashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference > 0).length;
    const ronaLower = allDashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference < 0).length;
    const outdatedPrices = allDashboardItems.filter((i) => i.isOutdated).length;
    const lastSuccessfulUpdate = allDashboardItems.reduce((latest, i) => {
      if (!i.lastCheckedAt) return latest;
      return !latest || new Date(i.lastCheckedAt) > new Date(latest) ? i.lastCheckedAt : latest;
    }, null);

    let dashboardItems = allDashboardItems;
    if (varianceFilter === 'higher') {
      dashboardItems = dashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference > 0);
    } else if (varianceFilter === 'lower') {
      dashboardItems = dashboardItems.filter((i) => i.priceDifference !== null && i.priceDifference < 0);
    } else if (varianceFilter === 'no_match') {
      dashboardItems = dashboardItems.filter((i) => i.lowestCompetitorPrice === null);
    } else if (varianceFilter === 'outdated') {
      dashboardItems = dashboardItems.filter((i) => i.isOutdated);
    }

    if (confidenceFilter && confidenceFilter !== 'all') {
      dashboardItems = dashboardItems.filter((i) => i.matchConfidence === confidenceFilter);
    }

    const totalFiltered = dashboardItems.length;
    const paginatedItems = dashboardItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
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
    });
  } catch (err) {
    console.error('[API dashboard] error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
