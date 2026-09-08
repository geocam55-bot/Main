import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetQuery = `        const { data: matches } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', productIds);`;

const replacementQuery = `        const skus = products.map((p: any) => p.sku).filter(Boolean);
        // Fetch matches by product UUID or SKU
        const { data: matchesById } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', productIds);

        const { data: matchesBySku } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .in('product_id', skus);

        const matches = [...(matchesById || []), ...(matchesBySku || [])];`;

if (serverCode.includes(targetQuery)) {
  serverCode = serverCode.replace(targetQuery, replacementQuery);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Patched server.ts to support SKU-based and UUID-based product matches!");
} else {
  console.error("Target query not found!");
}
