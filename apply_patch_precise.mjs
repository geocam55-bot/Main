import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target1 = `    // Tailored search queries per competitor
    // Kent excels with clean description or UPC / MFG
    const kentSearchQuery = cleanQuery || effectiveUpc || effectiveMfg || cleanDesc || product.sku;
        
    // Home Depot excels with MFG part number or UPC or standardized description
    const hdSearchQuery = cleanQuery || effectiveMfg || effectiveUpc || cleanDesc || product.sku;

    console.log(\`[Competitive Pricing Search] Tailored search for SKU "\${product.sku}" | Kent query: "\${kentSearchQuery}" | HD query: "\${hdSearchQuery}"\);`;

const replacement1 = `    // DEEP DIVE: Less stringent / relaxed search parameters to ensure competitors match correctly
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

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  console.log("Successfully replaced search setup!");
} else {
  // Fallback replacement using line search
  const idx = code.indexOf('const kentSearchQuery = cleanQuery || effectiveUpc');
  if (idx !== -1) {
    const start = code.lastIndexOf('// Tailored search queries', idx);
    const end = code.indexOf(`HD query: "\${hdSearchQuery}"\`);`, idx) + 60;
    if (start !== -1 && end !== -1) {
      code = code.slice(0, start) + replacement1 + code.slice(end);
      console.log("Successfully replaced search setup via fallback slice!");
    } else {
      console.log("Fallback search slice failed");
    }
  } else {
    console.log("target1 not found at all");
  }
}

const target2 = `        const { data: matchesById } = await supabase
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

const replacement2 = `        // FIXED: Only query by valid inventory UUIDs (productIds) to avoid PostgreSQL UUID type errors
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

if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  console.log("Successfully replaced dashboard matches!");
} else {
  const idx2 = code.indexOf('.in(\'product_id\', skus);');
  if (idx2 !== -1) {
    const start2 = code.lastIndexOf('const { data: matchesById }', idx2);
    const end2 = code.indexOf('const matches = [...(matchesById || []), ...(matchesBySku || []), ...(matchesBySupSku || [])];', idx2) + 105;
    if (start2 !== -1 && end2 !== -1) {
      code = code.slice(0, start2) + replacement2 + code.slice(end2);
      console.log("Successfully replaced dashboard matches via fallback slice!");
    } else {
      console.log("Fallback dashboard slice failed");
    }
  } else {
    console.log("target2 not found at all");
  }
}

fs.writeFileSync('server.ts', code);
console.log("Patch complete!");
