import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Supabase setup with service role key for full write permissions
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://usorqldwroecyxucmtuw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.SUPABASE_KEY || 
                    process.env.SUPABASE_ANON_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STATUS_FILE = path.join(process.cwd(), 'pricing-agent-status.json');
const LOG_FILE = path.join(process.cwd(), 'pricing-agent-diagnostic.log');

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {}
}

function updateStatus(status: {
  isRunning: boolean;
  progress?: {
    current: number;
    total: number;
    percent: number;
    matchesFound: number;
    currentSku: string;
    currentName: string;
    startedAt: string;
    lastUpdated: string;
    completedAt?: string;
  };
}) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (e) {}
}

/**
 * Validate that a search result is genuinely the same or equivalent product.
 */
function validateMatch(
  item: any,
  competitorProduct: { productName: string; modelNo?: string; sku?: string },
  method: string,
  query: string
): { valid: boolean; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string } {
  const itemDesc = (item.description || '').toLowerCase();
  const itemName = (item.name || '').toLowerCase();
  const combinedItemText = `${itemDesc} ${itemName}`.replace(/[^a-z0-9\s]/g, ' ');
  const itemWords = combinedItemText
    .split(/\s+/)
    .filter(w => w.length > 2 && !['and', 'for', 'the', 'with', 'set', 'pcs', 'pack', 'hardware', 'supplies'].includes(w));

  const compTitle = (competitorProduct.productName || '').toLowerCase();
  const compModel = (competitorProduct.modelNo || competitorProduct.sku || '').toLowerCase();
  const qClean = (query || '').toLowerCase().trim();

  // 1. If searching by supplier_sku / part number
  if (method === 'SUPPLIER_SKU' && qClean.length >= 3) {
    if (compTitle.includes(qClean) || compModel.includes(qClean)) {
      return { valid: true, confidence: 'HIGH', reason: `Exact part# "${qClean}" matched in competitor title/model` };
    }
  }

  // 2. If searching by UPC
  if (method === 'UPC' && qClean.length >= 6) {
    const matchedWords = itemWords.filter(w => compTitle.includes(w));
    if (matchedWords.length >= 1) {
      return { valid: true, confidence: 'HIGH', reason: `UPC match confirmed with keyword: "${matchedWords[0]}"` };
    }
  }

  // 3. Keyword Overlap validation
  const matchedWords = itemWords.filter(w => compTitle.includes(w));
  const overlapRatio = matchedWords.length / Math.max(itemWords.length, 1);

  if (matchedWords.length >= 2 && overlapRatio >= 0.3) {
    return { valid: true, confidence: 'HIGH', reason: `Strong keyword match: ${matchedWords.slice(0, 3).join(', ')}` };
  }

  if (matchedWords.length >= 1 && (method === 'SUPPLIER_SKU' || method === 'UPC')) {
    return { valid: true, confidence: 'MEDIUM', reason: `Single keyword overlap: "${matchedWords[0]}"` };
  }

  return { valid: false, confidence: 'LOW', reason: `Insufficient keyword match: [${itemWords.slice(0, 3).join(',')}] vs "${compTitle.substring(0, 40)}"` };
}

/**
 * Direct high-speed search for Kent Building Supplies via their Klevu Search API.
 * Response time: ~150-300ms vs 45s browser rendering.
 */
async function searchKentDirect(query: string) {
  if (!query || query.trim().length < 2) return null;
  const cleanQ = query.trim().replace(/['"]/g, '');
  const url = `https://eucs28.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-164006757741514325&term=${encodeURIComponent(cleanQ)}&responseType=json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result || !Array.isArray(data.result) || data.result.length === 0) return null;

    for (const r of data.result.slice(0, 5)) {
      const priceStr = r.salePrice || r.price;
      const price = parseFloat(priceStr);
      if (isNaN(price) || price <= 0 || price > 50000) continue;

      return {
        productName: r.name,
        price,
        sku: r.sku,
        url: r.url,
        inStock: r.inStock === 'yes' ? 'IN_STOCK' : 'OUT_OF_STOCK',
        brand: r.brand,
        modelNo: r.model_no || r.sku
      };
    }
  } catch (e: any) {
    return null;
  }
  return null;
}

/**
 * Main Competitive Pricing Agent Runner
 */
async function runCompetitivePricing() {
  const startedAt = new Date().toISOString();
  log("=================================================");
  log("🚀 STARTING OPTIMIZED HIGH-SPEED PRICING AGENT");
  log("=================================================");

  // 1. Fetch active competitors
  const { data: competitors, error: compErr } = await supabase.from('competitors').select('*').eq('active', true);
  if (compErr || !competitors || competitors.length === 0) {
    log(`❌ Failed to fetch active competitors: ${compErr?.message || 'No competitors found'}`);
    return;
  }
  log(`📋 Found ${competitors.length} active competitor(s): ${competitors.map(c => c.name).join(', ')}`);

  // 2. Fetch inventory items
  const { data: inventory, error: invErr } = await supabase
    .from('inventory')
    .select('id, sku, name, description, unit_price, cost, supplier_sku, upc, category')
    .order('name', { ascending: true });

  if (invErr || !inventory || inventory.length === 0) {
    log(`❌ Failed to fetch inventory: ${invErr?.message || 'No items'}`);
    return;
  }

  const totalItems = inventory.length;
  log(`📦 Loaded ${totalItems} inventory items to analyze.`);

  // 3. Pre-load existing verified matches to enable instant resumes
  const existingMatchedIds = new Set<string>();
  try {
    const { data: existingMatches } = await supabase
      .from('product_matches')
      .select('product_id');
    if (existingMatches) {
      for (const em of existingMatches) {
        if (em.product_id) existingMatchedIds.add(String(em.product_id));
      }
    }
  } catch (e) {}

  let matchesFound = existingMatchedIds.size;
  log(`ℹ️ Catalog already has ${matchesFound} pre-existing competitor matches.`);

  updateStatus({
    isRunning: true,
    progress: {
      current: 0,
      total: totalItems,
      percent: 0,
      matchesFound,
      currentSku: '',
      currentName: '',
      startedAt,
      lastUpdated: new Date().toISOString()
    }
  });

  // 4. Process items with concurrent worker pool (concurrency = 3)
  const CONCURRENCY = 3;
  let currentIndex = 0;

  async function processItem(item: any) {
    const isAlreadyMatched = existingMatchedIds.has(String(item.id)) || existingMatchedIds.has(String(item.sku));
    
    // If already matched, skip fresh search to finish remaining items rapidly
    if (isAlreadyMatched) {
      return;
    }

    const searchQueries: { query: string; method: 'SUPPLIER_SKU' | 'UPC' | 'DESCRIPTION' }[] = [];

    if (item.supplier_sku && item.supplier_sku.trim().length >= 3) {
      searchQueries.push({ query: item.supplier_sku.trim(), method: 'SUPPLIER_SKU' });
    }

    if (item.upc && item.upc.trim().length >= 6) {
      searchQueries.push({ query: item.upc.trim(), method: 'UPC' });
    }

    if (item.description && item.description.trim().length >= 5) {
      const cleanDesc = item.description
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanDesc.length >= 4) {
        searchQueries.push({ query: cleanDesc, method: 'DESCRIPTION' });
      }
    }

    for (const comp of competitors) {
      const isKent = comp.name.toLowerCase().includes('kent');
      let matchedProduct = null;
      let matchedMethod: string = '';
      let matchConfidence: 'HIGH' | 'MEDIUM' = 'HIGH';

      if (isKent) {
        for (const sq of searchQueries) {
          const result = await searchKentDirect(sq.query);
          if (result) {
            const validation = validateMatch(item, result, sq.method, sq.query);
            if (validation.valid) {
              matchedProduct = result;
              matchedMethod = sq.method;
              matchConfidence = validation.confidence === 'HIGH' ? 'HIGH' : 'MEDIUM';
              break;
            }
          }
        }
      }

      if (matchedProduct) {
        matchesFound++;
        existingMatchedIds.add(String(item.id));
        log(`🎯 MATCH FOUND on ${comp.name}: ${item.sku} - ${matchedProduct.productName} ($${matchedProduct.price})`);

        try {
          let cpId: number | null = null;
          const { data: existingCp } = await supabase
            .from('competitor_products')
            .select('id')
            .eq('competitor_id', comp.id)
            .eq('product_url', matchedProduct.url)
            .maybeSingle();

          if (existingCp?.id) {
            cpId = existingCp.id;
            await supabase.from('competitor_products').update({
              product_name: matchedProduct.productName,
              availability: matchedProduct.inStock,
              updated_at: new Date().toISOString()
            }).eq('id', cpId);
          } else {
            const { data: newCp, error: cpErr } = await supabase.from('competitor_products').insert({
              competitor_id: comp.id,
              product_url: matchedProduct.url,
              product_name: matchedProduct.productName,
              availability: matchedProduct.inStock,
              manufacturer_part_number: matchedProduct.modelNo || null,
              external_product_id: matchedProduct.sku || null
            }).select('id').single();

            if (!cpErr && newCp) {
              cpId = newCp.id;
            }
          }

          if (cpId) {
            const { data: existingMatch } = await supabase
              .from('product_matches')
              .select('id')
              .eq('product_id', item.id)
              .eq('competitor_product_id', cpId)
              .maybeSingle();

            if (existingMatch?.id) {
              await supabase.from('product_matches').update({
                match_confidence: matchConfidence,
                match_method: matchedMethod,
                approved: true,
                updated_at: new Date().toISOString()
              }).eq('id', existingMatch.id);
            } else {
              await supabase.from('product_matches').insert({
                product_id: item.id,
                competitor_product_id: cpId,
                match_confidence: matchConfidence,
                match_method: matchedMethod,
                approved: true
              });
            }

            await supabase.from('competitor_prices').insert({
              competitor_product_id: cpId,
              current_price: matchedProduct.price,
              regular_price: matchedProduct.price,
              normalized_unit_price: matchedProduct.price,
              currency: 'CAD',
              availability: matchedProduct.inStock,
              checked_at: new Date().toISOString()
            });

            await supabase.from('price_history').insert({
              product_id: item.id,
              competitor_id: comp.id,
              competitor_product_id: cpId,
              price: matchedProduct.price,
              normalized_unit_price: matchedProduct.price
            });
          }
        } catch (dbErr: any) {
          log(`   ⚠️ DB write error: ${dbErr?.message}`);
        }
      }
    }
  }

  // Run in chunks with concurrency
  for (let i = 0; i < totalItems; i += CONCURRENCY) {
    const chunk = inventory.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(item => processItem(item)));

    currentIndex = Math.min(i + CONCURRENCY, totalItems);
    const percent = Number(((currentIndex / totalItems) * 100).toFixed(1));

    updateStatus({
      isRunning: true,
      progress: {
        current: currentIndex,
        total: totalItems,
        percent,
        matchesFound,
        currentSku: chunk[chunk.length - 1]?.sku || '',
        currentName: chunk[chunk.length - 1]?.description || chunk[chunk.length - 1]?.name || '',
        startedAt,
        lastUpdated: new Date().toISOString()
      }
    });
  }

  const completedAt = new Date().toISOString();
  log("=================================================");
  log(`✅ PRICING AGENT RUN COMPLETE`);
  log(`   Items Analyzed: ${totalItems}`);
  log(`   Total Matches in Catalog: ${matchesFound}`);
  log(`   Duration: ${((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1)}s`);
  log("=================================================");

  updateStatus({
    isRunning: false,
    progress: {
      current: totalItems,
      total: totalItems,
      percent: 100,
      matchesFound,
      currentSku: '',
      currentName: '',
      startedAt,
      lastUpdated: completedAt,
      completedAt
    }
  });

  try {
    await supabase.from("Notifications").insert([{
      Type: "Scraper Alert",
      Message: `The Competitive Pricing Agent has finished scanning all ${totalItems} items. Captured ${matchesFound} matches.`,
      IsRead: false,
      CreatedAt: completedAt
    }]);
  } catch (e) {}
}

runCompetitivePricing().catch(err => {
  log(`💥 Fatal error: ${err?.message || err}`);
  updateStatus({ isRunning: false });
});
