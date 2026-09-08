import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetBlock = `      // Map to dashboard items using the exact title & description logic as the Inventory table
      let dashboardItems = products.map((p: any) => {
        const { title, description } = resolveInventoryTitles(p.name, p.description, p.category);
        const rawUnitPrice = Number(p.unit_price || 0);
        const yourPrice = rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : rawUnitPrice;
        const lowestCompPrice = null;
        const compName = null;
        const diff = null;
        const varPct = null;
        const conf = 'NOT_FOUND';
        const isOutdated = true;
        const lastCheckedAt = null;
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
          competitorCount: 0,
          lastCheckedAt,
          isOutdated,
        };
      });`;

const replacementBlock = `      // Fetch product matches and prices for these products
      const productIds = products.map((p: any) => String(p.id));
      let matchesMap = new Map();
      let pricesMap = new Map();
      let competitorsMap = new Map();

      if (productIds.length > 0) {
        const { data: comps } = await supabase.from('competitors').select('*');
        if (comps) {
          comps.forEach((c: any) => competitorsMap.set(c.id, c.name));
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

        const compProductIds = matches ? matches.map((m: any) => m.competitor_product_id).filter(Boolean) : [];
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

      // Map to dashboard items using real matches and prices
      let dashboardItems = products.map((p: any) => {
        const { title, description } = resolveInventoryTitles(p.name, p.description, p.category);
        const rawUnitPrice = Number(p.unit_price || 0);
        const yourPrice = rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : rawUnitPrice;
        
        const prodMatches = matchesMap.get(String(p.id)) || [];
        let lowestCompPrice: number | null = null;
        let compName: string | undefined = undefined;
        let conf = prodMatches.length > 0 ? (prodMatches[0].match_confidence || 'HIGH') : 'NOT_FOUND';
        let lastCheckedAt: string | null = null;
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
      });`;

if (serverCode.includes(targetBlock)) {
  serverCode = serverCode.replace(targetBlock, replacementBlock);
} else {
  console.error("Target block not found!");
}

// Also replace the metrics return block
const metricsTarget = `      res.json({
        metrics: {
          totalMonitored,
          withCompetitivePricing: totalMonitored > 0 ? 0 : 0,
          noMatch: totalMonitored,
          ronaHigher: 0,
          ronaLower: 0,
          outdatedPrices: totalMonitored,
          lastSuccessfulUpdate: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        },`;

const metricsReplacement = `      const lastSuccessfulUpdate = dashboardItems.reduce((latest, i) => {
        if (!i.lastCheckedAt) return latest;
        return !latest || new Date(i.lastCheckedAt) > new Date(latest) ? i.lastCheckedAt : latest;
      }, null as string | null);

      res.json({
        metrics: {
          totalMonitored,
          withCompetitivePricing,
          noMatch,
          ronaHigher,
          ronaLower,
          outdatedPrices,
          lastSuccessfulUpdate,
        },`;

if (serverCode.includes(metricsTarget)) {
  serverCode = serverCode.replace(metricsTarget, metricsReplacement);
} else {
  console.error("Metrics target not found!");
}

fs.writeFileSync('server.ts', serverCode);
console.log("Patched server.ts successfully!");
