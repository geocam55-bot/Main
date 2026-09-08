import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config'; // Make sure to install dotenv or run with --env-file

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function runCompetitivePricing() {
  console.log("Starting Competitive Pricing Agent...");

  // 1. Fetch competitors
  const { data: competitors, error: compErr } = await supabase.from('competitors').select('*').eq('active', true);
  if (compErr || !competitors || competitors.length === 0) {
    console.error("Failed to fetch active competitors", compErr);
    return;
  }
  const competitorListText = competitors.map(c => `- ${c.name} (${c.website_url})`).join("\n");

  // 2. Fetch inventory items
  const { data: inventory, error: invErr } = await supabase.from('inventory').select('*');
  if (invErr || !inventory) {
    console.error("Failed to fetch inventory", invErr);
    return;
  }
  
  console.log(`Found ${inventory.length} inventory items and ${competitors.length} active competitors.`);

  // 3. Process each item
  for (const item of inventory) {
    console.log(`\nAnalyzing ${item.sku} - ${item.name}...`);
    
    const prompt = `You are a competitive pricing agent.

For the following inventory item:
Name: ${item.name || ''}
Description: ${item.description || 'N/A'}
Manufacturer Part Number: ${item.mfg_part_number || item.mfgPartNumber || 'N/A'}
UPC: ${item.upc || item.barcode || 'N/A'}
Brand: ${item.brand || 'N/A'}
Category: ${item.category || 'N/A'}

Competitors:
${competitorListText}

Instructions:
1. Create search queries using:
   - Manufacturer Part Number
   - UPC
   - Brand + Description
   - Description only

2. Search Google for:
   site:{competitor-domain} {MfgPartNo}
   site:{competitor-domain} {UPC}
   site:{competitor-domain} "{Description}"

3. Prioritize exact matches using:
   - UPC match
   - Manufacturer Part Number match
   - Identical dimensions/specifications

4. Ignore search results where product specifications differ.

5. Extract:
   - Competitor Name
   - Product URL
   - Product Title
   - Selling Price (number)
   - Availability (IN_STOCK, OUT_OF_STOCK, LIMITED, UNAVAILABLE)
   - Match Confidence (0-100)

6. Return only matches with confidence >= 80.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of valid competitor matches with >= 80% confidence.",
            items: {
              type: Type.OBJECT,
              properties: {
                competitorName: { type: Type.STRING },
                productUrl: { type: Type.STRING },
                productTitle: { type: Type.STRING },
                sellingPrice: { type: Type.NUMBER },
                availability: { type: Type.STRING, description: "IN_STOCK, OUT_OF_STOCK, LIMITED, or UNAVAILABLE" },
                matchConfidence: { type: Type.NUMBER, description: "Confidence score between 80 and 100" }
              },
              required: ["competitorName", "productUrl", "productTitle", "sellingPrice", "availability", "matchConfidence"]
            }
          }
        }
      });

      const jsonStr = response.text?.trim() || "[]";
      let results = [];
      try {
         results = JSON.parse(jsonStr);
      } catch(e) {
         console.warn(`Could not parse JSON for ${item.sku}:`, jsonStr);
         continue;
      }
      
      console.log(`Found ${results.length} matches for ${item.sku}.`);
      
      // Filter out low confidence matches just in case
      const validMatches = results.filter((r: any) => r.matchConfidence >= 80);
      
      if (validMatches.length > 0) {
        // Save matched competitors and lowest price to database
        for (const match of validMatches) {
          // Find competitor ID
          const comp = competitors.find(c => match.competitorName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]));
          if (!comp) {
            console.warn(`Competitor not recognized: ${match.competitorName}`);
            continue;
          }
          
          // Upsert competitor product
          let compProductId = null;
          const { data: existingCp, error: cpErr } = await supabase
            .from('competitor_products')
            .select('id')
            .eq('competitor_id', comp.id)
            .eq('product_url', match.productUrl)
            .maybeSingle();
            
          if (existingCp) {
            compProductId = existingCp.id;
          } else {
            const { data: newCp, error: newCpErr } = await supabase
              .from('competitor_products')
              .insert({
                competitor_id: comp.id,
                product_url: match.productUrl,
                product_name: match.productTitle,
                availability: match.availability
              })
              .select('id')
              .single();
            if (newCpErr) console.error("Error inserting competitor product:", newCpErr);
            else compProductId = newCp?.id;
          }
          
          if (compProductId) {
             // Upsert product_matches
             await supabase.from('product_matches').upsert({
               product_id: item.id,
               competitor_product_id: compProductId,
               match_confidence: 'HIGH'
             }, { onConflict: 'product_id, competitor_product_id' }).catch(() => {});
             
             // Insert competitor_prices
             await supabase.from('competitor_prices').insert({
               competitor_product_id: compProductId,
               current_price: match.sellingPrice,
               normalized_unit_price: match.sellingPrice,
               availability: match.availability,
             }).catch(() => {});
             
             // Record price history
             await supabase.from('price_history').insert({
               product_id: item.id,
               competitor_id: comp.id,
               competitor_product_id: compProductId,
               price: match.sellingPrice,
               normalized_unit_price: match.sellingPrice,
             }).catch(() => {});
             
             console.log(`Saved price $${match.sellingPrice} from ${comp.name} for ${item.sku}`);
          }
        }
      } else {
        console.log(`No valid matches found for ${item.sku}.`);
      }
      
    } catch (error) {
      console.error(`Error processing ${item.sku}:`, error);
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("Competitive Pricing Agent finished.");
}

runCompetitivePricing();
