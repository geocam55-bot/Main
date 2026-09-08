import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const target = `        const skus = products.map((p: any) => p.sku).filter(Boolean);
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

const replacement = `        const skus = products.map((p: any) => p.sku).filter(Boolean);
        const supplierSkus = products.map((p: any) => p.supplier_sku).filter(Boolean);

        const { data: matchesById } = await supabase
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

if (serverCode.includes(target)) {
  serverCode = serverCode.replace(target, replacement);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Patched server.ts to support supplier_sku matching!");
} else {
  console.error("Target not found!");
}
