import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Replace the stubbed dashboardItems mapping
const startIdx = serverCode.indexOf('let dashboardItems = products.map((p: any) => {');
const endIdx = serverCode.indexOf('// Filter by category');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `      // Fetch product matches and prices for these products
      const productIds = products.map((p: any) => String(p.id));
      let matchesMap = new Map();
      let pricesMap = new Map();
      let competitorsMap = new Map();

      if (productIds.length > 0) {
        const { data: comps } = await supabase.from('competitors').select('*');
        if (comps) {
          comps.forEach((c) => competitorsMap.set(c.id, c.name));
        }

        const { data: matches } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', productIds);

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

      let dashboardItems = products.map((p) => {
        const { title, description } = resolveInventoryTitles(p.name, p.description, p.category);
        const rawUnitPrice = Number(p.unit_price || 0);
        const yourPrice = rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : rawUnitPrice;
        
        const prodMatches = matchesMap.get(String(p.id)) || [];
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
      
      `;
  serverCode = serverCode.substring(0, startIdx) + replacement + serverCode.substring(endIdx);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Successfully replaced dashboardItems logic!");
} else {
  console.error("Could not find start/end indices for replacement.");
}
