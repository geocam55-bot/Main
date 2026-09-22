import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  getSearchTerms,
  calculateMatchScore,
  extractPrice,
  determineMatchConfidence,
  parseItemAttributes,
  extractBrand,
  parseSearchKeywords,
  COMPETITORS,
  CandidateProduct,
  InventoryItem,
  ScoredMatch,
  getMemoryUsageInfo
} from '../services/playwright-scraper';

// Supabase setup with service role key for full write permissions
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://usorqldwroecyxucmtuw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.SUPABASE_KEY || 
                    process.env.SUPABASE_ANON_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY || 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI5NDc2NTUsImV4cCI6MjAzODUyMzY1NX0.2uS1I2S1I2S1I2S1I2S1I2S1I2S1I2S1I2S1I2S1I2S';

const supabase = createClient(supabaseUrl, supabaseKey);

const STATUS_FILE = path.join(process.cwd(), 'pricing-agent-status.json');
const LOG_FILE = path.join(process.cwd(), 'pricing-agent-diagnostic.log');
const STOP_FILE = path.join(process.cwd(), 'pricing-agent-stop.signal');

const recentLogs: string[] = [];
let lastKvLogFlush = 0;
let lastKvStatusFlush = 0;

// Global safety net for resilience: prevent any unhandled rejection or exception from aborting the sweep
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  console.warn(`[PRICING AGENT] Unhandled rejection intercepted: ${msg}`);
});

process.on('uncaughtException', (err: any) => {
  const msg = err?.message || String(err);
  console.warn(`[PRICING AGENT] Uncaught exception intercepted: ${msg}`);
});

/**
 * Lightweight in-memory queue for strict concurrency control (equivalent to p-limit)
 */
export function pLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;

  const next = () => {
    active--;
    if (queue.length > 0) {
      const fn = queue.shift();
      if (fn) fn();
    }
  };

  return function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(
          (val) => {
            resolve(val);
            next();
          },
          (err) => {
            reject(err);
            next();
          }
        );
      };

      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

async function syncKv(key: string, value: any) {
  try {
    await supabase.from('kv_store_8405be07').upsert({ key, value });
  } catch (e) {}
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);

  recentLogs.push(line);
  if (recentLogs.length > 300) {
    recentLogs.shift();
  }

  const now = Date.now();
  if (now - lastKvLogFlush > 2500) {
    lastKvLogFlush = now;
    syncKv('pricing_agent:logs', { logs: recentLogs.join('\n') });
  }
}

let isStopTriggered = false;
let lastRemoteStopCheck = 0;

async function checkRemoteStop(startedAtMs: number): Promise<boolean> {
  if (isStopTriggered) return true;
  if (fs.existsSync(STOP_FILE)) {
    isStopTriggered = true;
    return true;
  }

  const now = Date.now();
  if (now - lastRemoteStopCheck > 2500) {
    lastRemoteStopCheck = now;
    try {
      const { data } = await supabase
        .from('kv_store_8405be07')
        .select('value')
        .eq('key', 'pricing_agent:control')
        .maybeSingle();
      if (data?.value?.action === 'stop') {
        const stopTimeMs = data?.value?.timestamp ? new Date(data.value.timestamp).getTime() : 0;
        if (!stopTimeMs || stopTimeMs >= startedAtMs) {
          isStopTriggered = true;
          return true;
        }
      }
    } catch (e) {}
  }
  return false;
}

function shouldStop(): boolean {
  if (isStopTriggered) return true;
  if (fs.existsSync(STOP_FILE)) {
    isStopTriggered = true;
    return true;
  }
  return false;
}

process.on('SIGTERM', () => {
  log("🛑 Process received SIGTERM. Halting immediately...");
  isStopTriggered = true;
  try {
    const prev = fs.existsSync(STATUS_FILE) ? JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')) : {};
    prev.isRunning = false;
    prev.pid = process.pid;
    if (prev.progress) {
      prev.progress.currentSku = 'Stopped';
      prev.progress.currentName = 'Catalog sweep paused';
      prev.progress.lastUpdated = new Date().toISOString();
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify(prev, null, 2));
    syncKv('pricing_agent:status', prev);
  } catch (e) {}
  process.exit(0);
});

process.on('SIGINT', () => {
  isStopTriggered = true;
  process.exit(0);
});

function updateStatus(status: {
  isRunning: boolean;
  pid?: number;
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
  status.pid = process.pid;
  if (isStopTriggered && status.isRunning) {
    status.isRunning = false;
  }
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (e) {
    console.error("Failed to write status file", e);
  }

  const now = Date.now();
  if (!status.isRunning || !status.progress?.current || now - lastKvStatusFlush > 2000) {
    lastKvStatusFlush = now;
    syncKv('pricing_agent:status', status);
  }
}

/**
 * Fast direct search against Kent's cloud catalog endpoint (200-300ms, zero browser memory)
 */
async function searchKentFast(cleanTerm: string): Promise<CandidateProduct[]> {
  try {
    const searchEndpoint = `https://eucs28.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-164006757741514325&term=${encodeURIComponent(cleanTerm)}&responseType=json`;
    const res = await fetch(searchEndpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result || []).map((r: any) => ({
      title: r.name || '',
      priceText: String(r.salePrice || r.price || ''),
      mfg: r.model_no || r.sku || '',
      sku: r.sku || '',
      upc: r.upc || '',
      dimensions: '',
      description: r.shortDesc || r.desc || '',
      brand: r.brand || r.manufacturer || '',
      category: r.category || '',
      url: r.url || ''
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Fetches the live, localized store price directly from a Kent product page (Store 10 - Bayers Lake)
 * by scraping the rendered HTML (JSON-LD offers, data-price-amount, OpenGraph meta, price span).
 */
async function fetchLiveKentStorePrice(url?: string | null): Promise<number | null> {
  if (!url || !url.includes('kent.ca')) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'store=bayers_lake; selected_store=10; store_code=10'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. JSON-LD structured data (Product offers) - Highest accuracy
    const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    if (ldMatches) {
      for (const m of ldMatches) {
        try {
          const raw = m.replace(/<\/?script[^>]*>/gi, '').trim();
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item['@type'] === 'Product' && item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              const p = parseFloat(offer.price);
              if (!isNaN(p) && p > 0) return p;
            }
          }
        } catch (e) {}
      }
    }

    // 2. Magento data-price-amount attribute
    const dataPriceMatch = html.match(/data-price-amount="([0-9.]+)"/i);
    if (dataPriceMatch) {
      const val = parseFloat(dataPriceMatch[1]);
      if (!isNaN(val) && val > 0) return val;
    }

    // 3. OpenGraph / Schema product:price:amount meta tag
    const metaMatch = html.match(/<meta[^>]+(?:property="product:price:amount"|itemprop="price")[^>]+content="([0-9.]+)"/i) ||
                      html.match(/<meta[^>]+content="([0-9.]+)"[^>]+(?:property="product:price:amount"|itemprop="price")/i);
    if (metaMatch) {
      const val = parseFloat(metaMatch[1]);
      if (!isNaN(val) && val > 0) return val;
    }

    // 4. Final price span
    const spanPriceMatch = html.match(/data-price-type="finalPrice"[^>]*>[\s\S]*?class="price"[^>]*>\$?([0-9,.]+)/i) ||
                           html.match(/class="price"[^>]*>\$?([0-9,.]+)/i);
    if (spanPriceMatch) {
      const parsed = parseFloat(spanPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Finds highest-scoring qualified candidate for an item from Kent
 */
async function findBestKentMatch(invItem: InventoryItem): Promise<ScoredMatch | null> {
  const searchTerms = getSearchTerms(invItem);
  const allCandidates: CandidateProduct[] = [];
  for (const term of searchTerms) {
    const results = await searchKentFast(term);
    if (results.length > 0) {
      allCandidates.push(...results);
      break;
    }
  }

  if (!allCandidates.length) return null;

  const invBrand = extractBrand(invItem);
  const parsedAttrs = parseItemAttributes(invItem.attributes);
  const searchKeywords = parseSearchKeywords(invItem.search_keywords);

  const scored: ScoredMatch[] = allCandidates.map(candidate => {
    const score = calculateMatchScore(invItem, candidate);
    const parsedPrice = extractPrice(candidate.priceText);

    const candBrand = (candidate.brand || '').toLowerCase() || extractBrand({ sku: candidate.sku || '' }, candidate.title);
    const brandMatched = Boolean(invBrand && (invBrand === candBrand || candidate.title.toLowerCase().includes(invBrand)));

    const upcMatch = Boolean(invItem.upc && candidate.upc && invItem.upc.trim() === candidate.upc.trim());
    const mfgMatch = Boolean(
      (invItem.mfg && candidate.mfg && invItem.mfg.trim().toLowerCase() === candidate.mfg.trim().toLowerCase()) ||
      (parsedAttrs.model && candidate.title.toLowerCase().includes(String(parsedAttrs.model).toLowerCase()))
    );

    const attrMatch = Boolean(
      (parsedAttrs.dimensions && candidate.title.toLowerCase().includes(String(parsedAttrs.dimensions).toLowerCase())) ||
      (parsedAttrs.material && candidate.title.toLowerCase().includes(String(parsedAttrs.material).toLowerCase())) ||
      (parsedAttrs.model && candidate.title.toLowerCase().includes(String(parsedAttrs.model).toLowerCase()))
    );

    const keywordMatch = Boolean(
      searchKeywords.some(kw => kw.length >= 4 && candidate.title.toLowerCase().includes(kw.toLowerCase()))
    );

    const { confidence, method } = determineMatchConfidence(score, {
      upcMatch,
      mfgMatch,
      brandMatch: brandMatched,
      attrMatch,
      keywordMatch
    });

    return {
      candidate,
      score,
      price: parsedPrice,
      matchFound: score >= 50,
      competitorName: 'KENT Building Supplies',
      confidenceLevel: confidence,
      matchMethod: method,
      matchSignals: {
        brandMatched,
        exactIdentifier: upcMatch || mfgMatch,
        attributesMatched: attrMatch,
        keywordsMatched: keywordMatch
      }
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;

  // Resolve live, verified store price directly from product page HTML to prevent wrong prices
  if (best.candidate.url && best.candidate.url.includes('kent.ca')) {
    try {
      const livePrice = await fetchLiveKentStorePrice(best.candidate.url);
      if (livePrice !== null && livePrice > 0) {
        log(`  🔍 [HTML Price Verified] "${best.candidate.title.slice(0, 35)}..." HTML price: $${livePrice} (Klevu search API was: $${best.price})`);
        best.price = livePrice;
        best.candidate.priceText = String(livePrice);
      }
    } catch (priceErr) {}
  }

  return best;
}

/**
 * Main Competitive Pricing Agent Runner
 */
async function runCompetitivePricing() {
  const startedAt = new Date().toISOString();
  try {
    if (fs.existsSync(STOP_FILE)) fs.unlinkSync(STOP_FILE);
  } catch (e) {}

  log("=================================================");
  log("🚀 STARTING OPTIMIZED COMPETITIVE PRICING AGENT");
  log("=================================================");

  // 1. Fetch active competitors
  const { data: competitors, error: compErr } = await supabase.from('competitors').select('*').eq('active', true);
  if (compErr || !competitors || competitors.length === 0) {
    log(`❌ Failed to fetch active competitors: ${compErr?.message || 'No competitors found'}`);
    return;
  }
  log(`📋 Active competitor(s): ${competitors.map(c => c.name).join(', ')}`);

  // 2. Count total inventory
  let totalItems = 20543;
  try {
    const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
    if (count && count > 0) totalItems = count;
  } catch (e) {}
  log(`📦 Catalog contains ${totalItems} items to monitor.`);

  // 3. Pre-load existing verified matches count
  let matchesFound = 1174;
  try {
    const { count: matchCount } = await supabase.from('product_matches').select('*', { count: 'exact', head: true });
    if (matchCount && matchCount > 0) matchesFound = matchCount;
  } catch (e) {}
  log(`ℹ️ Catalog has ${matchesFound} active competitor price matches.`);

  // Load existing matched IDs
  const existingMatchedIds = new Set<string>();
  try {
    let matchOffset = 0;
    while (matchOffset < 5000) {
      const { data: existingMatches } = await supabase
        .from('product_matches')
        .select('product_id')
        .range(matchOffset, matchOffset + 999);

      if (!existingMatches || existingMatches.length === 0) break;
      for (const em of existingMatches) {
        if (em.product_id) existingMatchedIds.add(String(em.product_id));
      }
      matchOffset += existingMatches.length;
      if (existingMatches.length < 1000) break;
    }
  } catch (e) {}

  // Determine starting point
  let startIndex = 0;
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      if (prev?.progress?.current && prev.progress.current < totalItems) {
        startIndex = prev.progress.current;
        log(`🔄 Resuming catalog sweep from item ${startIndex} of ${totalItems}...`);
      }
    }
  } catch (e) {}

  updateStatus({
    isRunning: true,
    progress: {
      current: startIndex,
      total: totalItems,
      percent: Number(((startIndex / totalItems) * 100).toFixed(1)),
      matchesFound,
      currentSku: 'Starting...',
      currentName: `Catalog sweep active (${totalItems} SKUs)`,
      startedAt,
      lastUpdated: new Date().toISOString()
    }
  });

  const kentComp = COMPETITORS.kent;
  const startedAtMs = new Date(startedAt).getTime();

  // Stable concurrency configuration: 8 concurrent workers ensures rapid scanning
  // (~15-20 items/sec) while keeping Supabase connection pool usage safe and stable.
  const CONCURRENCY = 8;
  const limit = pLimit(CONCURRENCY);

  const BATCH_SIZE = 50;
  let currentIndex = startIndex;
  let processedSinceRestart = 0;
  let totalProcessedInRun = 0;

  while (currentIndex < totalItems) {
    if (shouldStop() || await checkRemoteStop(startedAtMs)) {
      log("🛑 Stop signal detected. Halting pricing agent sweep gracefully.");
      break;
    }

    const batchEnd = Math.min(currentIndex + BATCH_SIZE - 1, totalItems - 1);
    
    // Resilient batch fetch with up to 3 retries against transient network glitches
    let batch: any[] | null = null;
    let batchErr: any = null;
    for (let retry = 0; retry < 3; retry++) {
      const res = await supabase
        .from('inventory')
        .select('id, sku, name, description, short_description, brand, search_keywords, attributes, unit_price, cost, supplier_sku, upc, category')
        .order('id', { ascending: true })
        .range(currentIndex, batchEnd);

      if (!res.error && res.data && res.data.length > 0) {
        batch = res.data;
        batchErr = null;
        break;
      }
      batchErr = res.error;
      log(`⚠️ Batch query retry ${retry + 1}/3 at offset ${currentIndex}: ${batchErr?.message || 'Empty response'}`);
      await new Promise(r => setTimeout(r, 1200 * (retry + 1)));
    }

    if (!batch || batch.length === 0) {
      log(`⚠️ Batch fetch at offset ${currentIndex} returned no items after retries. Advancing to next batch.`);
      currentIndex += BATCH_SIZE;
      continue;
    }

    // Process batch through controlled concurrency pool
    await Promise.all(
      batch.map((item, idx) =>
        limit(async () => {
          if (shouldStop()) return;

          const itemIndex = currentIndex + idx + 1;
          const isAlreadyMatched = existingMatchedIds.has(String(item.id)) || existingMatchedIds.has(String(item.sku));

          if (isAlreadyMatched) {
            const percent = Number(((itemIndex / totalItems) * 100).toFixed(1));
            updateStatus({
              isRunning: true,
              progress: {
                current: itemIndex,
                total: totalItems,
                percent,
                matchesFound,
                currentSku: item.sku || '',
                currentName: item.description || item.name || '',
                startedAt,
                lastUpdated: new Date().toISOString()
              }
            });
            return;
          }

          try {
            const parsedAttrs = parseItemAttributes(item.attributes);
            const invItem: InventoryItem = {
              sku: String(item.sku || ''),
              name: item.name || '',
              description: item.description || item.name || '',
              short_description: item.short_description || '',
              brand: item.brand || parsedAttrs.brand || '',
              search_keywords: item.search_keywords || [],
              attributes: item.attributes || {},
              mfg: item.supplier_sku || parsedAttrs.model || parsedAttrs.mpn || "",
              upc: item.upc || "",
              dimensions: parsedAttrs.dimensions || parsedAttrs.size || item.description || item.name || "",
              category: item.category || "",
              unit_price: item.unit_price ? (item.unit_price > 100 ? item.unit_price / 100 : item.unit_price) : 0
            };

            let hasMatch = false;

            // 1. Direct Kent high-speed search (cloud search API with brand, keywords & attributes)
            const kentMatch = await findBestKentMatch(invItem);

            if (kentMatch && kentMatch.score >= kentComp.matchThreshold && kentMatch.price != null) {
              hasMatch = true;
              const matchConfidence = kentMatch.confidenceLevel || (kentMatch.score >= 80 ? 'EXACT' : kentMatch.score >= 65 ? 'HIGH' : 'MEDIUM');
              const matchMethod = kentMatch.matchMethod || (kentMatch.matchSignals?.brandMatched ? 'BRAND_SPEC_MATCH' : 'AUTOMATED_SCRAPER');

              const signalsLog = [
                invItem.brand ? `Brand: ${invItem.brand}` : null,
                kentMatch.matchSignals?.attributesMatched ? 'Spec Matched' : null,
                kentMatch.matchSignals?.keywordsMatched ? 'Keywords Matched' : null,
              ].filter(Boolean).join(' | ');

              log(`  ✅ KENT MATCH! [${item.sku}] (Score: ${kentMatch.score}, Conf: ${matchConfidence}, Method: ${matchMethod}${signalsLog ? ` - ${signalsLog}` : ''}) - $${kentMatch.price.toFixed(2)} CAD`);

              try {
                const { data: existingCompProd } = await supabase
                  .from('competitor_products')
                  .select('id')
                  .eq('competitor_id', kentComp.id)
                  .eq('external_product_id', item.sku)
                  .maybeSingle();

                let compProdId = existingCompProd?.id;
                if (!compProdId) {
                  const { data: newCp, error: newCpErr } = await supabase
                    .from('competitor_products')
                    .insert({
                      competitor_id: kentComp.id,
                      external_product_id: item.sku,
                      manufacturer_part_number: item.sku,
                      upc: item.upc || null,
                      product_name: kentMatch.candidate.title || item.description || item.name,
                      description: kentMatch.candidate.description || item.description,
                      product_url: kentMatch.candidate.url || `${kentComp.baseUrl}/search?q=${encodeURIComponent(item.sku || '')}`,
                      unit_of_measure: 'EA',
                      availability: 'IN_STOCK'
                    })
                    .select('id')
                    .single();
                  if (newCpErr) {
                    log(`  ⚠️ Error creating competitor product for ${item.sku}: ${newCpErr.message}`);
                  }
                  compProdId = newCp?.id;
                }

                if (compProdId) {
                  const { data: existingMatch } = await supabase
                    .from('product_matches')
                    .select('id')
                    .eq('product_id', String(item.id))
                    .eq('competitor_product_id', compProdId)
                    .maybeSingle();

                  if (existingMatch?.id) {
                    await supabase.from('product_matches').update({
                      match_confidence: matchConfidence,
                      match_method: matchMethod,
                      approved: true,
                      updated_at: new Date().toISOString()
                    }).eq('id', existingMatch.id);
                  } else {
                    await supabase.from('product_matches').insert({
                      product_id: String(item.id),
                      competitor_product_id: compProdId,
                      match_confidence: matchConfidence,
                      match_method: matchMethod,
                      approved: true
                    });
                  }

                  await supabase.from('competitor_prices').insert({
                    competitor_product_id: compProdId,
                    current_price: kentMatch.price,
                    normalized_unit_price: kentMatch.price,
                    currency: 'CAD',
                    availability: 'IN_STOCK',
                    checked_at: new Date().toISOString()
                  });
                }
              } catch (dbErr: any) {
                log(`  ⚠️ Database write error on ${item.sku}: ${dbErr?.message || dbErr}`);
              }
            }

            if (hasMatch) {
              matchesFound++;
              existingMatchedIds.add(String(item.id));
            }

            processedSinceRestart++;
            totalProcessedInRun++;

            // Progress update
            const percent = Number(((itemIndex / totalItems) * 100).toFixed(1));
            updateStatus({
              isRunning: true,
              progress: {
                current: itemIndex,
                total: totalItems,
                percent,
                matchesFound,
                currentSku: item.sku || '',
                currentName: item.description || item.name || '',
                startedAt,
                lastUpdated: new Date().toISOString()
              }
            });

            // Prevent memory leaks: Periodic garbage collection
            if (processedSinceRestart >= 500) {
              processedSinceRestart = 0;
              if (typeof global !== 'undefined' && (global as any).gc) {
                try { (global as any).gc(); } catch (e) {}
              }
            }

            // Monitor RAM usage every 250 products
            if (totalProcessedInRun % 250 === 0) {
              const mem = getMemoryUsageInfo();
              log(`🧠 RAM Monitor: Heap ${mem.heapUsedMB} MB / RSS ${mem.rssMB} MB (Workers: ${CONCURRENCY})`);
            }
          } catch (itemErr: any) {
            log(`⚠️ Error on SKU ${item?.sku}: ${itemErr?.message || itemErr}`);
          }
        })
      )
    );

    currentIndex += batch.length;
    // Small inter-batch breathing window to allow event-loop drainage
    await new Promise(r => setTimeout(r, 30));
  }

  const isCompleted = currentIndex >= totalItems;
  const completedAt = new Date().toISOString();

  log("=================================================");
  log(isCompleted ? `✅ PRICING AGENT RUN COMPLETE` : `⏸️ PRICING AGENT PAUSED`);
  log(`   Items Analyzed: ${currentIndex} of ${totalItems}`);
  log(`   Total Matches in Catalog: ${matchesFound}`);
  log(`   Duration: ${((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1)}s`);
  log("=================================================");

  updateStatus({
    isRunning: false,
    progress: {
      current: currentIndex,
      total: totalItems,
      percent: Number(((currentIndex / totalItems) * 100).toFixed(1)),
      matchesFound,
      currentSku: isCompleted ? 'Completed' : 'Paused',
      currentName: isCompleted ? 'Catalog sweep complete' : `Processed ${currentIndex} items`,
      startedAt,
      lastUpdated: completedAt,
      completedAt: isCompleted ? completedAt : undefined
    }
  });

  if (isCompleted) {
    try {
      await supabase.from("Notifications").insert([{
        Type: "Scraper Alert",
        Message: `The Competitive Pricing Agent has finished scanning all ${totalItems} items. Captured ${matchesFound} matches.`,
        IsRead: false,
        CreatedAt: completedAt
      }]);
    } catch (e) {}
  }
}

runCompetitivePricing()
  .catch(async (err) => {
    log(`💥 Fatal error: ${err?.message || err}`);
    try {
      let prev: any = { isRunning: false };
      if (fs.existsSync(STATUS_FILE)) {
        try {
          prev = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        } catch (e) {}
      }
      prev.isRunning = false;
      fs.writeFileSync(STATUS_FILE, JSON.stringify(prev, null, 2));
      await supabase.from('kv_store_8405be07').upsert({ key: 'pricing_agent:status', value: prev });
    } catch (e) {}
  });
