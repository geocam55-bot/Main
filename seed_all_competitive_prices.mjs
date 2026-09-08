import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAll() {
  console.log("Seeding competitive prices for ALL inventory items...");

  const { data: comps } = await supabase.from('competitors').select('*');
  if (!comps || comps.length === 0) {
    console.log("No competitors found.");
    return;
  }

  // Fetch all inventory items (paginated or in chunks)
  let offset = 0;
  const batchSize = 500;

  while (true) {
    const { data: items, error } = await supabase
      .from('inventory')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error || !items || items.length === 0) {
      break;
    }

    console.log(`Processing batch of ${items.length} items (offset ${offset})...`);

    for (const item of items) {
      const basePrice = Number(item.unit_price || 1000) / 100;
      if (basePrice <= 0) continue;

      for (const comp of comps) {
        const varianceFactor = 0.90 + Math.random() * 0.20;
        const compPrice = Number((basePrice * varianceFactor).toFixed(2));

        // Insert competitor product
        const { data: compProd } = await supabase
          .from('competitor_products')
          .insert({
            competitor_id: comp.id,
            product_name: `${item.name} - ${comp.name} Equivalent`,
            product_url: `${comp.website_url}/product/${item.sku}`,
            manufacturer_part_number: item.supplier_sku || item.sku,
            upc: item.upc,
            availability: 'IN_STOCK'
          })
          .select('id')
          .single();

        if (compProd) {
          // Insert match linking inventory p.id (UUID) to competitor product
          await supabase.from('product_matches').upsert({
            product_id: item.id,
            competitor_product_id: compProd.id,
            match_confidence: 'HIGH',
            match_method: 'UPC'
          }, { onConflict: 'product_id, competitor_product_id' });

          // Insert competitor price
          await supabase.from('competitor_prices').insert({
            competitor_product_id: compProd.id,
            current_price: compPrice,
            normalized_unit_price: compPrice,
            availability: 'IN_STOCK',
            checked_at: new Date().toISOString()
          });
        }
      }
    }

    offset += batchSize;
    if (items.length < batchSize) break;
  }

  console.log("All inventory items successfully seeded with competitive pricing!");
}

seedAll();
