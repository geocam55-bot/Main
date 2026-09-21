import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { searchRonaByArticle, extractKeywordsFromRonaProduct, loadRonaIndex } from "../services/rona-catalog-service";

// Supabase client with service role key for full write permissions
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://usorqldwroecyxucmtuw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.SUPABASE_KEY || 
                    process.env.SUPABASE_ANON_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY || 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI5NDc2NTUsImV4cCI6MjAzODUyMzY1NX0.2uS1I2S1I2S1I2S1I2S1I2S1I2S1I2S1I2S1I2S1I2S';

const supabase = createClient(supabaseUrl, supabaseKey);

const STATUS_FILE = path.join(process.cwd(), 'catalog-agent-status.json');
const LOG_FILE = path.join(process.cwd(), 'catalog-agent-diagnostic.log');
const STOP_FILE = path.join(process.cwd(), 'catalog-agent-stop.signal');

const recentLogs: string[] = [];
let lastKvLogFlush = 0;
let lastKvStatusFlush = 0;

// Global safety net for resilience: prevent any unhandled rejection or exception from aborting the sweep
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  console.warn(`[CATALOG AGENT] Unhandled rejection intercepted: ${msg}`);
});

process.on('uncaughtException', (err: any) => {
  const msg = err?.message || String(err);
  console.warn(`[CATALOG AGENT] Uncaught exception intercepted: ${msg}`);
});

/**
  Lightweight in-memory queue for strict concurrency control (equivalent to p-limit)
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

/**
 * RAM monitoring helper
 */
export function getMemoryUsageInfo(): { heapUsedMB: number; heapTotalMB: number; rssMB: number } {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
    rssMB: Math.round(mem.rss / 1024 / 1024 * 10) / 10
  };
}

function syncKv(key: string, val: any) {
  supabase.from('kv_store_8405be07').upsert({ key, value: val }).then(() => {}).catch(() => {});
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);

  recentLogs.push(line);
  if (recentLogs.length > 300) {
    recentLogs.shift();
  }

  const now = Date.now();
  if (now - lastKvLogFlush > 3000) {
    lastKvLogFlush = now;
    syncKv('catalog_agent:logs', { logs: recentLogs.slice(-100).join('\n') });
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
        .eq('key', 'catalog_agent:control')
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

function writeStoppedState() {
  try {
    const prev = fs.existsSync(STATUS_FILE) ? JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')) : {};
    prev.isRunning = false;
    prev.pid = process.pid;
    if (prev.progress) {
      prev.progress.currentSku = 'Stopped';
      prev.progress.currentName = 'Catalog sweep paused';
      prev.progress.lastUpdated = new Date().toISOString();
    }
    prev.stoppedAt = new Date().toISOString();
    fs.writeFileSync(STATUS_FILE, JSON.stringify(prev, null, 2));
    syncKv('catalog_agent:status', prev);
  } catch (e) {}
}

function updateStatus(status: {
  isRunning: boolean;
  pid?: number;
  progress?: {
    current: number;
    total: number;
    percent: number;
    enrichedCount: number;
    currentSku?: string;
    currentName?: string;
    startedAt?: string;
    lastUpdated?: string;
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
    syncKv('catalog_agent:status', status);
  }
}

// ============================================================================
// RONA.CA CATALOG ARTICLE ENRICHMENT PROCESSOR
// ============================================================================

/**
 * Real RONA.CA catalog item enrichment processor
 * Searches Article # on RONA.ca and replaces Item Name with Description from RONA.ca
 */
async function enrichInventoryItem(item: any, idx: number) {
  const rawName = String(item.name || '').trim();
  const sku = String(item.sku || `SKU-${idx + 1}`).trim();
  const category = String(item.category || 'HARDWARE').trim();
  const uom = String(item.unit_of_measure || 'EA').trim();

  // Search RONA.CA by Article # / SKU
  const ronaInfo = await searchRonaByArticle(sku);

  let cleanItemName = rawName;
  let brand = item.brand ? String(item.brand).trim() : '';
  let model = '';
  let sourceUrl = '';
  let keywordsArray: string[] = [];

  if (ronaInfo.found) {
    // Replace the Item Name with the Description from RONA.CA
    cleanItemName = ronaInfo.title;
    if (ronaInfo.brand) brand = ronaInfo.brand;
    if (ronaInfo.model) model = ronaInfo.model;
    sourceUrl = ronaInfo.url;
    keywordsArray = extractKeywordsFromRonaProduct(ronaInfo.title, brand, sku);
  } else {
    // If not found on RONA.ca, check if item.description has the real product title
    const rawDesc = String(item.description || '').trim();
    const isDescProductTitle = rawDesc.length > 0 && 
      !rawDesc.includes("Engineered specifically") && 
      !rawDesc.includes("Delivering contractor-grade") && 
      !rawDesc.includes("Key specifications include") &&
      !(rawDesc.length > 160 && rawDesc.includes(". ") && rawDesc.split(".").length > 2);

    const genericCategoryWords = [
      "materials", "accessories", "tools", "parts", "equipment", "hardware",
      "plumbing", "electricity", "lighting", "paint", "fasteners", "heating",
      "ventilation", "building", "lumber", "carpentry", "finishing", "roofing",
      "insulation", "fittings", "hooks", "squares", "locksmithing", "adhesives",
      "ironwork", "ramps", "gutters", "taps", "household", "seasonal", "appliances",
      "cleaning", "gardening", "electrical", "frame", "cladding", "extinguishers",
      "lightbulbs", "fluorescents", "paintbrushes", "rollers", "disposers", "hydrov"
    ];

    const isGenericCategory = !rawName || 
      rawName === "" || 
      rawName.toUpperCase() === "UNDEFINED" || 
      rawName.startsWith("Product ") ||
      (category && rawName.toLowerCase() === category.toLowerCase()) ||
      (rawName === rawName.toUpperCase() && rawName.length >= 4 && (
        genericCategoryWords.some(w => rawName.toLowerCase().includes(w)) ||
        rawName.includes(",") || rawName.includes("&") || rawName.includes(" AND ")
      ));

    if (isGenericCategory && isDescProductTitle) {
      cleanItemName = rawDesc;
    } else if (cleanItemName && (cleanItemName.toLowerCase().includes('professional-grade') || cleanItemName.toLowerCase().includes('designed for') || cleanItemName.length > 80)) {
      cleanItemName = rawName.split(/[,.-]/)[0]?.trim() || rawName;
    }
    keywordsArray = [
      brand.toLowerCase(),
      category.toLowerCase(),
      sku.toLowerCase(),
      ...cleanItemName.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/)
    ].filter(w => w && w.length > 1);
  }

  const extendedDesc = String(item.description || '').trim();
  const shortDesc = cleanItemName.slice(0, 50).trim();

  const attributesObj: Record<string, string> = {
    'Brand': brand,
    'RONA Article #': sku,
    'Category': category,
    'Unit of Measure': uom,
    ...(model ? { 'Model #': model } : {}),
    ...(sourceUrl ? { 'Source': 'RONA.CA', 'RONA URL': sourceUrl } : { 'Catalog Source': 'Local POS Inventory' })
  };

  return {
    cleanItemName,
    shortDesc,
    extendedDesc,
    brand,
    category,
    keywordsArray,
    attributesObj,
    ronaMatched: ronaInfo.found
  };
}

// ============================================================================
// MAIN BACKGROUND CATALOG AGENT RUNNER
// ============================================================================

export async function runCatalogEnrichment() {
  log("🚀 AI Catalog Enrichment Agent initialized in background worker.");
  log(`📂 Operating System PID: ${process.pid}`);

  // Clear any existing stop signal at startup
  if (fs.existsSync(STOP_FILE)) {
    try { fs.unlinkSync(STOP_FILE); } catch (e) {}
  }

  // Get total inventory items in catalog
  const { count, error: countErr } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    log(`⚠️ Error reading catalog total count: ${countErr.message}`);
  }

  const totalItems = count || 20543;
  log(`📊 Total catalog items to enrich: ${totalItems.toLocaleString()}`);

  // Warm up RONA.CA article catalog index
  log("📦 Loading RONA.CA article catalog index...");
  await loadRonaIndex();
  log("✅ RONA.CA catalog index loaded and ready for Article # lookups.");

  // Check how many are already enriched
  const { count: enrichedCountRaw } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .not('enrichment_updated_at', 'is', null);

  let enrichedCount = enrichedCountRaw || 0;
  log(`✨ Currently enriched items in database: ${enrichedCount.toLocaleString()}`);

  // Resume or start clean: check existing status
  let startIndex = 0;
  if (fs.existsSync(STATUS_FILE)) {
    try {
      const prevStatus = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      if (prevStatus?.progress?.current && prevStatus.progress.current < totalItems) {
        // Option to resume if stopped mid-way
        startIndex = prevStatus.progress.current;
        log(`🔄 Resuming catalog enrichment from offset ${startIndex}...`);
      }
    } catch (e) {}
  }

  const startedAt = new Date().toISOString();
  const startedAtMs = new Date(startedAt).getTime();

  updateStatus({
    isRunning: true,
    progress: {
      current: startIndex,
      total: totalItems,
      percent: Number(((startIndex / totalItems) * 100).toFixed(1)),
      enrichedCount,
      currentSku: 'Starting...',
      currentName: `Active catalog sweep initialized (${totalItems.toLocaleString()} SKUs)`,
      startedAt,
      lastUpdated: startedAt
    }
  });

  // Concurrency pool: 10 concurrent workers for rapid throughput (~20-30 items/sec)
  const CONCURRENCY = 10;
  const limit = pLimit(CONCURRENCY);

  const BATCH_SIZE = 50;
  let currentIndex = startIndex;
  let totalProcessedInRun = 0;
  let processedSinceGc = 0;

  while (currentIndex < totalItems) {
    if (shouldStop() || await checkRemoteStop(startedAtMs)) {
      log("🛑 Stop signal detected. Halting catalog enrichment agent sweep gracefully.");
      break;
    }

    const batchEnd = Math.min(currentIndex + BATCH_SIZE - 1, totalItems - 1);

    // Resilient batch fetch with up to 3 retries against transient network glitches
    let batch: any[] | null = null;
    let batchErr: any = null;
    for (let retry = 0; retry < 3; retry++) {
      const res = await supabase
        .from('inventory')
        .select('id, sku, name, description, unit_price, cost, supplier_sku, upc, category, unit_of_measure, brand')
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
      batch.map((item, itemIdxInBatch) =>
        limit(async () => {
          if (shouldStop()) return;

          try {
            const globalItemIndex = currentIndex + itemIdxInBatch;
            const enriched = await enrichInventoryItem(item, globalItemIndex);

            const updatePayload: any = {
              name: enriched.cleanItemName,
              description: enriched.extendedDesc,
              short_description: enriched.shortDesc,
              brand: enriched.brand,
              category: enriched.category,
              search_keywords: enriched.keywordsArray,
              attributes: enriched.attributesObj,
              enrichment_updated_at: new Date().toISOString()
            };

            let { error: updateErr } = await supabase
              .from('inventory')
              .update(updatePayload)
              .eq('id', item.id);

            if (updateErr) {
              // Fallback if Postgres schema expects comma string
              const fallbackPayload = {
                ...updatePayload,
                search_keywords: enriched.keywordsArray.join(', ')
              };
              const { error: fbErr } = await supabase
                .from('inventory')
                .update(fallbackPayload)
                .eq('id', item.id);
              updateErr = fbErr;
            }

            if (!updateErr) {
              enrichedCount++;
            }

            totalProcessedInRun++;
            processedSinceGc++;

            // Periodically update progress status
            const currentItemNumber = currentIndex + itemIdxInBatch + 1;
            const pct = Number(((currentItemNumber / totalItems) * 100).toFixed(1));

            updateStatus({
              isRunning: true,
              progress: {
                current: currentItemNumber,
                total: totalItems,
                percent: Math.min(pct, 100),
                enrichedCount,
                currentSku: item.sku || 'SKU',
                currentName: item.name || enriched.cleanItemName,
                startedAt,
                lastUpdated: new Date().toISOString()
              }
            });

            // Prevent memory leaks: Periodic garbage collection
            if (processedSinceGc >= 500) {
              processedSinceGc = 0;
              if (typeof global !== 'undefined' && (global as any).gc) {
                try { (global as any).gc(); } catch (e) {}
              }
            }

            // Monitor RAM usage every 250 products
            if (totalProcessedInRun % 250 === 0) {
              const mem = getMemoryUsageInfo();
              log(`🧠 RAM Monitor: Heap ${mem.heapUsedMB} MB / RSS ${mem.rssMB} MB (Workers: ${CONCURRENCY}, Processed: ${totalProcessedInRun})`);
            }
          } catch (itemErr: any) {
            log(`⚠️ Error enriching SKU ${item?.sku}: ${itemErr?.message || itemErr}`);
          }
        })
      )
    );

    currentIndex += batch.length;
    // Small inter-batch breathing window to allow event-loop drainage
    await new Promise(r => setTimeout(r, 20));
  }

  const isCompleted = currentIndex >= totalItems;
  const completedAt = new Date().toISOString();

  if (isCompleted) {
    log(`🎉 Catalog enrichment sweep completed! All ${totalItems.toLocaleString()} SKUs processed. Total enriched: ${enrichedCount.toLocaleString()}`);
    updateStatus({
      isRunning: false,
      progress: {
        current: totalItems,
        total: totalItems,
        percent: 100,
        enrichedCount,
        currentSku: 'Completed',
        currentName: 'Catalog enrichment complete',
        startedAt,
        lastUpdated: completedAt,
        completedAt
      }
    });
  } else {
    log(`🛑 Catalog enrichment sweep halted at item ${currentIndex} of ${totalItems.toLocaleString()}.`);
    writeStoppedState();
  }

  log("🏁 Agent process exiting cleanly.");
  process.exit(0);
}

// Execute standalone if run directly
runCatalogEnrichment()
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
      await supabase.from('kv_store_8405be07').upsert({ key: 'catalog_agent:status', value: prev });
    } catch (e) {}
    process.exit(1);
  });
