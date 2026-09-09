import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetReturn = "    return competitorsData;";

const replacement = `    // Save to in-memory cache
    latestCompetitorResultsByProduct.set(String(product.productId), competitorsData);

    // Sync to Supabase DB tables if available
    try {
      for (const entry of competitorsData) {
        const compId = entry.competitorId;
        const price = entry.price;
        const { data: existingMatch } = await supabase
          .from('product_matches')
          .select('*, competitor_products(*)')
          .eq('product_id', String(product.productId))
          .eq('competitor_products.competitor_id', compId)
          .maybeSingle();

        if (existingMatch) {
          await supabase
            .from('product_matches')
            .update({
              match_confidence: entry.matchConfidence,
              match_method: entry.matchMethod,
            })
            .eq('id', existingMatch.id);

          if (price > 0) {
            await supabase
              .from('competitor_prices')
              .update({
                current_price: price,
                normalized_unit_price: price,
                checked_at: checkTime,
                availability: 'IN_STOCK',
              })
              .eq('competitor_product_id', existingMatch.competitor_product_id);
          }
        } else {
          const { data: newCompProd } = await supabase
            .from('competitor_products')
            .insert({
              competitor_id: compId,
              product_name: entry.productName,
              manufacturer_part_number: product.mfgPartNumber || null,
              upc: product.upc || null,
              description: product.description || null,
              product_url: entry.productUrl,
              external_product_id: entry.sku || null,
              unit_of_measure: product.unitOfMeasure,
              pack_quantity: 1,
              availability: price > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            })
            .select()
            .single();

          if (newCompProd) {
            await supabase.from('product_matches').insert({
              product_id: String(product.productId),
              competitor_product_id: newCompProd.id,
              match_confidence: entry.matchConfidence,
              match_method: entry.matchMethod,
              approved: true,
            });

            if (price > 0) {
              await supabase.from('competitor_prices').insert({
                competitor_product_id: newCompProd.id,
                current_price: price,
                normalized_unit_price: price,
                currency: 'CAD',
                unitOfMeasure: product.unitOfMeasure,
                availability: 'IN_STOCK',
                checked_at: checkTime,
              });
            }
          }
        }
      }
    } catch (dbErr) {
      console.error('[Competitive Pricing Refresh] DB Sync Error:', dbErr);
    }

    return competitorsData;`;

if (serverCode.includes(targetReturn)) {
  serverCode = serverCode.replace(targetReturn, replacement);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Restored DB Sync logic to executeDynamicCompetitorSearch!");
}
