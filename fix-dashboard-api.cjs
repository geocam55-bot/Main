const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Let's replace the dashboard endpoint implementation
const targetStart = `  // 5. GET /api/competitive-pricing/dashboard
  app.get('/api/competitive-pricing/dashboard', async (req, res) => {`;

const newEndpoint = `  // 5. GET /api/competitive-pricing/dashboard
  app.get('/api/competitive-pricing/dashboard', async (req, res) => {
    try {
      const { category, varianceFilter, confidenceFilter, search, page = '1', limit = '150' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 150;

      // Fetch all inventory products matching search & category for accurate global KPI metrics
      let itemsQuery = supabase
        .from('inventory')
        .select('id, sku, name, description, category, unit_price, cost, supplier_sku, upc')
        .order('name', { ascending: true });

      if (search && typeof search === 'string') {
        const andClause = buildInventoryAndSearchClause(search);
        if (andClause) {
          itemsQuery = itemsQuery.or(andClause);
        } else {
          itemsQuery = itemsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
      if (category && category !== 'all') {
        itemsQuery = itemsQuery.eq('category', category);
      }

      const { data: invRows, error: invErr } = await itemsQuery.range(0, 999);
      if (invErr) {
        console.warn('[Competitive Pricing] Supabase inventory fetch error:', invErr);
        return res.status(500).json({ error: 'Supabase Error', details: invErr });
      }

      const products = (invRows && invRows.length > 0) ? invRows : [];
      const productIds = products.map((p: any) => String(p.id));

      let matchesMap = new Map();
      let pricesMap = new Map();
      let competitorsMap = new Map();

      if (productIds.length > 0) {
        const { data: comps } = await supabase.from('competitors').select('*');
        if (comps) {
          comps.forEach((c) => competitorsMap.set(c.id, c.name));
        }

        const { data: matchesById } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', productIds);

        let matches = matchesById || [];

        // Merge in-memory cached results
        for (const p of products) {
          const pid = String(p.id);
          const pSku = String(p.sku || '');
          const pSuppSku = String(p.supplier_sku || '');
          
          let cached = latestCompetitorResultsByProduct.get(pid) || 
                       latestCompetitorResultsByProduct.get(pSku) || 
                       latestCompetitorResultsByProduct.get(pSuppSku) || [];

          if (cached && cached.length > 0) {
            for (const c of cached) {
              // Avoid duplicate matches for same competitor
              const exists = matches.some(m => String(m.product_id) === pid && m.competitor_products?.competitor_id === c.competitorId);
              if (!exists) {
                matches.push({
                  product_id: pid,
                  competitor_product_id: \`mem_\${pid}_\${c.competitorId}\`,
                  match_confidence: c.matchConfidence || 'HIGH',
                  match_method: c.matchMethod || 'CACHED',
                  competitor_products: {
                    id: \`mem_\${pid}_\${c.competitorId}\`,
                    competitor_id: c.competitorId,
                    product_name: c.productName,
                    product_url: c.productUrl,
                    competitor_prices: [{
                      current_price: c.price,
                      checked_at: c.checkedAt || new Date().toISOString()
                    }]
                  }
                });
              }
            }
          }
        }

        if (matches) {
          for (const m of matches) {
            const prodId = String(m.product_id);
            if (!matchesMap.has(prodId)) {
              matchesMap.set(prodId, []);
            }
            matchesMap.get(prodId).push(m);
          }
        }

        const compProductIds = matches ? matches.map((m) => m.competitor_product_id).filter(Boolean) : [];
        if (compProductIds.length > 0) {
          const { data: cpList } = await supabase
            .from('competitor_prices')
            .select('*')
            .in('competitor_product_id', compProductIds);
          if (cpList) {
            for (const cp of cpList) {
              pricesMap.set(cp.competitor_product_id, cp);
            }
          }
        }
      }

      // Map all products to dashboard items
      let allDashboardItems = products.map((p) => {
        const { title, description } = resolveInventoryTitles(p.name, p.description, p.category);
        const rawUnitPrice = Number(p.unit_price || 0);
        const yourPrice = rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : rawUnitPrice;

        const prodMatches = matchesMap.get(String(p.id)) || matchesMap.get(p.sku) || matchesMap.get(p.supplier_sku) || [];
        let lowestCompPrice = null;
        let compName = undefined;
        let conf = prodMatches.length > 0 ? (prodMatches[0].match_confidence || 'HIGH') : 'NOT_FOUND';
        let lastCheckedAt = null;
        let competitorCount = prodMatches.length;

        for (const m of prodMatches) {
          const cpId = m.competitor_product_id;
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
        const varPct = (diff !== null && lowestCompPrice && lowestCompPrice > 0) ? Number(((diff / lowestCompPrice) * 100).toFixed(1)) : null;
        const isOutdated = lastCheckedAt ? (Date.now() - new Date(lastCheckedAt).getTime() > 1000 * 60 * 60 * 24) : (lowestCompPrice !== null);

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

      // Calculate global KPI metrics across ALL matched inventory items before pagination/table filtering
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

      // Apply table-specific filters (variance & confidence)
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

      res.json({
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
          totalPages: Math.ceil(totalFiltered / limitNum) || 1
        }
      });
    } catch (err: any) {
      console.error('[Competitive Pricing Dashboard] Error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch competitive pricing dashboard' });
    }
  });`;

// We need to replace from the start of the endpoint to its closing catch/braces.
// Let's find where the endpoint ends.
const endpointStartIndex = code.indexOf("app.get('/api/competitive-pricing/dashboard'");
if (endpointStartIndex !== -1) {
  // Let's find the next major endpoint definition like app.post('/api/competitive-pricing/agent/start'
  const nextEndpointIndex = code.indexOf("app.post('/api/competitive-pricing/agent/start'", endpointStartIndex);
  if (nextEndpointIndex !== -1) {
    const oldEndpointCode = code.substring(endpointStartIndex, nextEndpointIndex);
    code = code.replace(oldEndpointCode, newEndpoint + '\\n\\n  ');
    fs.writeFileSync('server.ts', code);
    console.log("Successfully updated dashboard KPI metrics API endpoint!");
  } else {
    console.error("Could not find next endpoint!");
  }
} else {
  console.error("Could not find dashboard endpoint!");
}
