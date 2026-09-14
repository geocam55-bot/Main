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

    try {
      const res = await fetch('http://127.0.0.1:3000/api/competitive-pricing/scrape-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: item.id,
          sku: item.sku,
          name: item.name,
          productName: item.name,
          description: item.description,
          category: item.category,
          yourPrice: item.unit_price,
          unitPrice: item.unit_price,
          upc: item.upc,
          mfgPartNumber: item.supplier_sku,
          searchQuery: item.description || item.name
        })
      });

      if (!res.ok) {
        log(`   ⚠️ HTTP error fetching live pricing for ${item.sku}: ${res.statusText}`);
        return;
      }

      const result = await res.json();
      if (result && result.competitors && result.competitors.length > 0) {
        let hasMatch = false;
        for (const comp of result.competitors) {
          if (comp.price > 0) {
            log(`🎯 MATCH FOUND on ${comp.competitorName}: ${item.sku} - ${comp.productName} ($${comp.price})`);
            hasMatch = true;
          }
        }
        if (hasMatch) {
          matchesFound++;
          existingMatchedIds.add(String(item.id));
        }
      }
    } catch (err: any) {
      log(`   ⚠️ Failed to scrape live price for ${item.sku}: ${err?.message}`);
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
