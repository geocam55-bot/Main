import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

// 1. Update executeDynamicCompetitorSearch search parameters to be less stringent and add deep dive debugging
const targetSearchSetup = `    // Tailored search queries per competitor
    // Kent excels with clean description or UPC / MFG
    const kentSearchQuery = cleanQuery || effectiveUpc || effectiveMfg || cleanDesc || product.sku;
        
    // Home Depot excels with MFG part number or UPC or standardized description
    const hdSearchQuery = cleanQuery || effectiveMfg || effectiveUpc || cleanDesc || product.sku;

    console.log(\`[Competitive Pricing Search] Tailored search for SKU "\${product.sku}" | Kent query: "\${kentSearchQuery}" | HD query: "\${hdSearchQuery}"\);`;

const replacementSearchSetup = `    // DEEP DIVE: Less stringent / relaxed search parameters to ensure competitors match correctly
    const rawText = \`\${effectiveName} \${effectiveDesc}\`.toLowerCase();
    const cleanWords = rawText
      .replace(/[*#&'()\\/]/g, ' ')
      .replace(/\\b(red|blue|green|standard|ply|t&g|ea|pcs|item|material|materials)\\b/gi, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
    const broadSearchQuery = cleanWords.split(' ').slice(0, 4).join(' ') || product.sku;

    const kentSearchQuery = customQuery || effectiveUpc || effectiveMfg || broadSearchQuery || cleanDesc || product.sku;
    const hdSearchQuery = customQuery || effectiveMfg || effectiveUpc || broadSearchQuery || cleanDesc || product.sku;

    console.log(\`[Competitive Pricing DEEP DIVE SEARCH] SKU: "\${product.sku}" | Name: "\${effectiveName}" | Desc: "\${effectiveDesc}" | UPC: "\${effectiveUpc}" | MFG: "\${effectiveMfg}" | Broad Query: "\${broadSearchQuery}" | Kent Q: "\${kentSearchQuery}" | HD Q: "\${hdSearchQuery}"\);`;

if (code.includes(targetSearchSetup)) {
  code = code.replace(targetSearchSetup, replacementSearchSetup);
  console.log("Patched executeDynamicCompetitorSearch search parameters!");
} else {
  console.log("Warning: targetSearchSetup not found exactly");
}

// 2. Fix dashboard product matches lookup and merge in-memory cache
const targetDashboardMatches = `        const { data: matchesById } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', productIds);
        const { data: matchesBySku } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', skus);
        const { data: matchesBySupSku } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', supplierSkus);
        const matches = [...(matchesById || []), ...(matchesBySku || []), ...(matchesBySupSku || [])];`;

const replacementDashboardMatches = `        // FIXED: Only query by valid inventory UUIDs (productIds) to avoid PostgreSQL UUID type errors
        const { data: matchesById, error: matchErr } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', productIds);
        
        console.log(\`[Competitive Pricing Dashboard DB] Fetched \${matchesById?.length || 0} product matches for \${productIds.length} products. Error: \`, matchErr);

        let matches = matchesById || [];

        // Also ensure products with in-memory cached search results are represented in dashboard
        for (const pid of productIds) {
          if (!matches.some(m => String(m.product_id) === pid) && latestCompetitorResultsByProduct.has(pid)) {
            const cached = latestCompetitorResultsByProduct.get(pid) || [];
            for (const c of cached) {
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
        }`;

if (code.includes(targetDashboardMatches)) {
  code = code.replace(targetDashboardMatches, replacementDashboardMatches);
  console.log("Patched dashboard product matches lookup!");
} else {
  console.log("Warning: targetDashboardMatches not found exactly");
}

fs.writeFileSync('server.ts', code);
console.log("Successfully updated server.ts!");
