/**
 * scraper.js
 *
 * Production Playwright Product Matching & Pricing Scraper
 * for KENT BUILDING SUPPLIES and THE HOME DEPOT
 *
 * Install:
 * npm install playwright string-similarity
 * npx playwright install chromium
 *
 * Run:
 * node scraper.js [--competitor=kent|homedepot|all] [--limit=5] [--sku=...] [--search="..."]
 */

import { chromium } from "playwright";
import similarity from "string-similarity";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// CONFIGURATION & COMPETITORS
// ======================================================

export const COMPETITORS = {
  kent: {
    id: 1,
    name: "KENT Building Supplies",
    baseUrl: "https://kent.ca",
    searchUrl: "https://kent.ca/en/search/?q=",
    cookies: [
      { name: "store", value: "bayers_lake", domain: ".kent.ca" },
      { name: "selected_store", value: "10", domain: ".kent.ca" },
      { name: "store_code", value: "10", domain: ".kent.ca" }
    ],
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    },
    selectors: {
      productCard: ".product-item, .product-item-info, li.item.product, .klevuProduct",
      title: ".product-item-link, .product-item-name a, .klevuProductTitle a, a[title]",
      price: ".price, [data-price-amount], .price-wrapper, .special-price, .klevuProductPrice",
      manufacturer: ".sku, [data-product-sku], .product-item-sku",
      upc: "[data-upc], .upc",
      dimensions: ".product-item-dimensions, .dimensions",
      description: ".product-item-description, .product.description, .description",
      productLink: "a.product-item-link, .product-item-photo, a"
    },
    matchThreshold: 50
  },

  homeDepot: {
    id: 2,
    name: "The Home Depot",
    baseUrl: "https://www.homedepot.ca",
    searchUrl: "https://www.homedepot.ca/search?q=",
    cookies: [
      { name: "store", value: "7126", domain: ".homedepot.ca" },
      { name: "selected_store", value: "7126", domain: ".homedepot.ca" },
      { name: "province", value: "NS", domain: ".homedepot.ca" }
    ],
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    },
    selectors: {
      productCard: "article.acl-product-card, [data-testid='product-card'], .product-card, .acl-product-card",
      title: "h2.acl-product-card__title, h3.acl-product-card__title, [data-testid='product-title'], h2, h3",
      price: "[data-testid='product-price'], .acl-product-card__price, .acl-price, .price, [class*='price']",
      manufacturer: "[data-testid='model-number'], .acl-product-card__model-number, .model-number",
      upc: "[data-upc], .upc",
      dimensions: ".dimensions, [data-testid='product-dimensions']",
      description: ".acl-product-card__description, .description",
      productLink: "a.acl-product-card__title-link, a[href*='/product/'], a[data-testid='product-card-title-link']"
    },
    matchThreshold: 50
  }
};

// ======================================================
// DEFAULT BUILDING SUPPLIES INVENTORY
// ======================================================

export const defaultInventory = [
  {
    sku: "LUM-SPF248",
    name: "SPF 2X4X8' LUMBER #2 & BETTER",
    description: "SPF 2X4X8' LUMBER #2 & BETTER",
    mfg: "1016318",
    upc: "",
    dimensions: "2x4x8'",
    category: "Lumber",
    unit_price: 5.50
  },
  {
    sku: "PLY-12-SPRUCE",
    name: "Spruce Plywood Standard",
    description: "1/2\" x 4' x 8' (12.5mm) Spruce Plywood Standard",
    mfg: "1015823",
    upc: "056538124801",
    dimensions: "1/2\" x 4' x 8'",
    category: "Plywood",
    unit_price: 42.00
  },
  {
    sku: "LUM-2410-SPF",
    name: "2x4-10' SPF #2&BTR",
    description: "2x4-10' SPF #2&BTR",
    mfg: "1016320",
    upc: "",
    dimensions: "2x4x10'",
    category: "Lumber",
    unit_price: 6.50
  },
  {
    sku: "DRY-12-REG",
    name: "Regular Drywall Panel",
    description: "1/2\" x 4' x 8' Regular Gypsum Drywall Board",
    mfg: "1014522",
    upc: "073796001004",
    dimensions: "1/2\" x 4' x 8'",
    category: "Drywall",
    unit_price: 18.99
  }
];

// ======================================================
// HELPER FUNCTIONS
// ======================================================

export function normalizeText(text) {
  if (!text) return "";
  return text
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMfg(mfg) {
  if (!mfg) return "";
  return mfg
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeUPC(upc) {
  if (!upc) return "";
  return upc.toString().replace(/\D/g, "");
}

/**
 * Parses prices in standard "$3.98", Kent strings, and
 * Home Depot's verbal layout "$3 And 98 Cents / each"
 */
export function extractPrice(rawText) {
  if (!rawText) return null;

  // Format: "$3 And 98 Cents"
  const andMatch = rawText.match(/\$([0-9]+)\s*(?:And|and)\s*([0-9]{1,2})\s*(?:Cents|cents)?/i);
  if (andMatch) {
    const dollars = parseInt(andMatch[1], 10);
    const cents = parseInt(andMatch[2], 10);
    return dollars + (cents / 100);
  }

  // Format: "$3.98" or "3.98"
  const match = rawText.match(/\$?([0-9]+(?:\.[0-9]{2})?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * Domain-aware dimensions extractor for lumber and sheet goods
 */
export function extractDimensions(text) {
  if (!text) return "";
  const cleaned = text.replace(/["']/g, " ").replace(/-/g, " ");

  const isSheet = /\b(?:plywood|sheet|sheathing|osb|drywall|board|panel)\b/i.test(text);
  const sheetMatch = cleaned.match(/\b(4|5)\s*(?:ft\.?|')?\s*[xX]\s*(8|9|10|12)\s*(?:ft\.?|')?\b/i);
  const thickMatch = cleaned.match(/\b(1\/4|3\/8|1\/2|5\/8|3\/4|7\/16|11\/32|15\/32|23\/32)\b/);
  
  if (isSheet && sheetMatch) {
    return (thickMatch ? thickMatch[1] + " " : "") + sheetMatch[1] + "x" + sheetMatch[2];
  }

  const lumberMatch = cleaned.match(/\b([12468])\s*(?:inch|in)?\s*[xX]\s*([2468]|10|12)\s*(?:inch|in)?\s*[xX]\s*([68]|10|12|14|16)\s*(?:ft\.?|foot|feet|\b)/i);
  if (lumberMatch) {
    return `${lumberMatch[1]}x${lumberMatch[2]}x${lumberMatch[3]}`;
  }

  const lumberMatch2 = cleaned.match(/\b([12468])\s*[xX]\s*([2468]|10|12)\b[^\d]*\b([68]|10|12|14|16)\s*(?:ft\.?|foot|feet|stud)?\b/i);
  if (lumberMatch2 && !isSheet) {
    return `${lumberMatch2[1]}x${lumberMatch2[2]}x${lumberMatch2[3]}`;
  }

  if (sheetMatch) {
    return (thickMatch ? thickMatch[1] + " " : "") + sheetMatch[1] + "x" + sheetMatch[2];
  }

  return "";
}

// ======================================================
// MATCH SCORING (Enhanced Weighted Formula)
// ======================================================

export function calculateMatchScore(inventoryItem, candidate) {
  let score = 0;

  const invTitle = (inventoryItem.description || inventoryItem.name || "").toLowerCase();
  const candTitle = (candidate.title || candidate.description || "").toLowerCase();

  // HARD VETO 1: Material Category Conflict (Plywood vs Drywall)
  const invIsPlywood = /\b(?:plywood|sheathing)\b/i.test(invTitle);
  const candIsDrywall = /\b(?:drywall|sheetrock|gypsum)\b/i.test(candTitle);
  if (invIsPlywood && candIsDrywall) return 0;

  // HARD VETO 2: Treated vs Untreated Lumber Mismatch
  const invIsTreated = /\b(?:treated|pressure|pt|above\s*ground|ground\s*contact|sienna|micropro)\b/i.test(invTitle);
  const candIsTreated = /\b(?:treated|pressure|above\s*ground|ground\s*contact|sienna|micropro)\b/i.test(candTitle);
  if (!invIsTreated && candIsTreated) return 0;
  if (invIsTreated && !candIsTreated) return 0;

  // 1. Exact UPC Match (+100)
  const normInvUpc = normalizeUPC(inventoryItem.upc);
  const normCandUpc = normalizeUPC(candidate.upc);
  if (normInvUpc && normCandUpc && normInvUpc === normCandUpc) {
    score += 100;
  }

  // 2. Exact Manufacturer Part / Model # Match (+80)
  const normInvMfg = normalizeMfg(inventoryItem.mfg || inventoryItem.supplier_sku);
  const normCandMfg = normalizeMfg(candidate.mfg || candidate.sku);
  if (normInvMfg && normCandMfg) {
    if (normInvMfg === normCandMfg || normCandMfg.includes(normInvMfg)) {
      score += 80;
    }
  }

  // 3. Dimensions Match (+40)
  const invDims = inventoryItem.dimensions || extractDimensions(inventoryItem.description || inventoryItem.name);
  const candDims = candidate.dimensions || extractDimensions(candidate.title || candidate.description);
  if (invDims && candDims) {
    if (normalizeText(invDims) === normalizeText(candDims)) {
      score += 40;
    }
  }

  // 4. Description String Similarity via string-similarity (+ up to 50)
  const targetDesc = inventoryItem.description || inventoryItem.name || "";
  const candDesc = candidate.title || candidate.description || "";
  if (targetDesc && candDesc) {
    const descScore = similarity.compareTwoStrings(
      targetDesc.toLowerCase(),
      candDesc.toLowerCase()
    );
    score += descScore * 50;
  }

  // 5. Lumber Grade Bonus / Penalty
  const invIsSelect = /\bselect\b/i.test(invTitle);
  const candIsSelect = /\bselect\b/i.test(candTitle);
  const invIsStandard = /\bstandard\b/i.test(invTitle);
  const candIsStandard = /\bstandard\b/i.test(candTitle);

  if (invIsSelect && candIsSelect) score += 15;
  if (invIsStandard && candIsStandard) score += 15;
  if (invIsStandard && candIsSelect) score -= 20;

  return Math.round(score);
}

// ======================================================
// SEARCH TERM GENERATION
// ======================================================

export function getSearchTerms(item) {
  const terms = [];

  // 1. UPC barcode (if valid)
  if (item.upc && String(item.upc).trim().length >= 6) {
    terms.push(String(item.upc).trim());
  }

  const desc = (item.description || item.name || "").trim();
  if (desc) {
    // 2. Cleaned without trailing delimiters like "#2 & BETTER"
    const cleaned = desc.replace(/#.*$/, "").replace(/&.*$/, "").trim();
    if (cleaned) {
      terms.push(cleaned);
    }

    // 3. Compact dimensional query (e.g. 2x4 8ft or 2x4x8)
    const dims = extractDimensions(desc);
    if (dims) {
      if (dims.includes("x")) {
        const parts = dims.split("x");
        if (parts.length === 3) {
          terms.push(`${parts[0]}x${parts[1]} ${parts[2]}ft`);
          terms.push(dims);
        } else {
          terms.push(dims);
        }
      }
    }

    // 4. Raw description if distinct
    if (desc !== cleaned && !terms.includes(desc)) {
      terms.push(desc);
    }
  }

  // 5. Manufacturer part number
  const mfg = item.mfg || item.supplier_sku;
  if (mfg && String(mfg).trim().length >= 3) {
    terms.push(String(mfg).trim());
  }

  return Array.from(new Set(terms.filter(t => t && t.length >= 2)));
}

// ======================================================
// SCRAPE SEARCH RESULTS (Puppeteer Engine)
// ======================================================

export async function scrapeSearchResults(page, config, searchTerm) {
  const encodedQuery = encodeURIComponent(searchTerm).replace(/%20/g, "+");
  const url = config.searchUrl + encodedQuery;

  console.log(`  [${config.name}] Navigating to: ${url}`);

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000
    });

    // Kent-specific high-speed in-page evaluation:
    // If on kent.ca, query Kent's in-page search engine directly within browser context
    if (config.id === 1) {
      const kentResults = await page.evaluate(async (term) => {
        try {
          const cleanQ = term.replace(/[\x27\"]/g, "");
          const searchEndpoint = `https://eucs28.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-164006757741514325&term=${encodeURIComponent(cleanQ)}&responseType=json`;
          const res = await fetch(searchEndpoint);
          const data = await res.json();
          return (data.result || []).map(r => ({
            title: r.name || "",
            priceText: String(r.salePrice || r.price || ""),
            mfg: r.model_no || r.sku || "",
            sku: r.sku || "",
            upc: r.upc || "",
            dimensions: "",
            description: r.shortDesc || r.desc || "",
            url: r.url || ""
          }));
        } catch (e) {
          return [];
        }
      }, searchTerm);

      if (Array.isArray(kentResults) && kentResults.length > 0) {
        console.log(`  [${config.name}] Retrieved ${kentResults.length} candidate item(s).`);
        return kentResults;
      }
    }

    // Default DOM evaluation for rendered product cards
    await new Promise(r => setTimeout(r, 1500));

    const candidates = await page.evaluate(({ sel, baseUrl }) => {
      const cards = document.querySelectorAll(sel.productCard);
      const list = [];

      for (const card of cards) {
        const titleEl = card.querySelector(sel.title);
        const priceEl = card.querySelector(sel.price);
        const mfgEl = card.querySelector(sel.manufacturer);
        const upcEl = card.querySelector(sel.upc);
        const dimEl = card.querySelector(sel.dimensions);
        const descEl = card.querySelector(sel.description);
        const linkEl = card.querySelector(sel.productLink) || card.closest("a");

        const title = titleEl ? titleEl.innerText.trim() : "";
        if (!title || title.includes("How We Use Cookies")) continue;

        let priceText = priceEl ? (priceEl.getAttribute("data-price-amount") || priceEl.innerText.trim()) : "";
        let href = linkEl ? linkEl.getAttribute("href") || "" : "";
        if (href && href.startsWith("/")) {
          href = baseUrl + href;
        }

        list.push({
          title,
          priceText,
          mfg: mfgEl ? mfgEl.innerText.trim() : "",
          upc: upcEl ? upcEl.innerText.trim() : "",
          dimensions: dimEl ? dimEl.innerText.trim() : "",
          description: descEl ? descEl.innerText.trim() : "",
          url: href || ""
        });
      }

      return list;
    }, { sel: config.selectors, baseUrl: config.baseUrl });

    console.log(`  [${config.name}] Retrieved ${candidates.length} candidate card(s).`);
    return candidates;
  } catch (err) {
    console.warn(`  [${config.name}] Scrape warning: ${err.message}`);
    return [];
  }
}

// ======================================================
// FIND BEST PRODUCT MATCH
// ======================================================

export async function findBestProductMatch(page, config, inventoryItem) {
  let allCandidates = [];
  const searchTerms = getSearchTerms(inventoryItem);

  for (const term of searchTerms) {
    try {
      const results = await scrapeSearchResults(page, config, term);
      if (results && results.length > 0) {
        allCandidates.push(...results);
        break; // Stop after first query that yields candidates
      }
    } catch (err) {
      console.error(`  [${config.name}] Term "${term}" error: ${err.message}`);
    }
  }

  if (!allCandidates.length) {
    return null;
  }

  // Deduplicate candidates by title
  const seen = new Set();
  const uniqueCandidates = allCandidates.filter(c => {
    const key = c.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate match scores
  const scored = uniqueCandidates.map(candidate => ({
    candidate,
    score: calculateMatchScore(inventoryItem, candidate),
    price: extractPrice(candidate.priceText)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

// ======================================================
// INVENTORY LOADER (API or Building Supplies Catalog)
// ======================================================

export async function loadInventory(limit = 5, specificSku = null, searchQuery = null) {
  // If user searched for a custom phrase via CLI:
  if (searchQuery) {
    return [{
      sku: "CLI-SEARCH",
      name: searchQuery,
      description: searchQuery,
      dimensions: extractDimensions(searchQuery),
      category: "Building Supplies",
      unit_price: 0
    }];
  }

  // If user passed a specific SKU:
  if (specificSku) {
    const found = defaultInventory.find(i => i.sku.toLowerCase() === specificSku.toLowerCase());
    if (found) return [found];
  }

  // Try fetching live inventory from backend API
  try {
    const res = await fetch(`http://localhost:3000/api/inventory?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      const items = data.items || data.data || [];
      if (items.length > 0) {
        console.log(`Loaded ${items.length} items from live Inventory Table.`);
        return items.map(it => ({
          sku: it.sku || it.id,
          name: it.name,
          description: it.description || it.name,
          mfg: it.supplier_sku || it.mfgPartNumber || "",
          upc: it.upc || "",
          dimensions: it.dimensions || extractDimensions(it.description || it.name),
          category: it.category || "",
          unit_price: it.unit_price ? (it.unit_price > 100 ? it.unit_price / 100 : it.unit_price) : 0
        }));
      }
    }
  } catch (e) {
    // API not running or unreachable
  }

  console.log(`Using default building supplies inventory items (${defaultInventory.length} items).`);
  return defaultInventory.slice(0, limit);
}

// ======================================================
// MAIN SCRAPER RUNNER
// ======================================================

export async function run() {
  const args = process.argv.slice(2);
  const compArg = (args.find(a => a.startsWith("--competitor=")) || "--competitor=all").split("=")[1].toLowerCase();
  const limitArg = parseInt((args.find(a => a.startsWith("--limit=")) || "--limit=2").split("=")[1], 10) || 2;
  const skuArg = (args.find(a => a.startsWith("--sku=")) || "").split("=")[1] || null;
  const searchArg = (args.find(a => a.startsWith("--search=")) || "").split("=")[1] || null;

  const targetCompetitors = [];
  if (compArg === "kent" || compArg === "all") targetCompetitors.push(COMPETITORS.kent);
  if (compArg === "homedepot" || compArg === "all") targetCompetitors.push(COMPETITORS.homeDepot);

  console.log("==================================================================");
  console.log("🚀 PLAYWRIGHT COMPETITOR SCRAPER - KENT & HOME DEPOT");
  console.log("==================================================================");

  const inventory = await loadInventory(limitArg, skuArg, searchArg);

  console.log(`Launching headless Chromium browser with Playwright...`);
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  const scrapeResults = [];

  for (const item of inventory) {
    console.log("------------------------------------------------------------------");
    console.log(`📦 Processing SKU: ${item.sku} | "${item.description || item.name}"`);
    console.log(`   Dimensions: ${item.dimensions || "N/A"} | UPC: ${item.upc || "N/A"} | MFG: ${item.mfg || "N/A"}`);

    const itemResult = {
      sku: item.sku,
      name: item.name,
      description: item.description,
      yourPrice: item.unit_price,
      competitors: {}
    };

    for (const comp of targetCompetitors) {
      console.log(`\n🔎 Competitor: ${comp.name}`);

      // Set cookies for store localization
      if (comp.cookies && comp.cookies.length) {
        const formattedCookies = comp.cookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: "/"
        }));
        await context.addCookies(formattedCookies);
      }

      const match = await findBestProductMatch(page, comp, item);

      if (match && match.score >= comp.matchThreshold) {
        console.log(`  ✅ MATCH FOUND! (Score: ${match.score}/${comp.matchThreshold})`);
        console.log(`     Title: ${match.candidate.title}`);
        console.log(`     Price: $${match.price != null ? match.price.toFixed(2) : "N/A"}`);
        console.log(`     URL:   ${match.candidate.url}`);

        itemResult.competitors[comp.name] = {
          matchFound: true,
          score: match.score,
          price: match.price,
          productTitle: match.candidate.title,
          productUrl: match.candidate.url,
          mfg: match.candidate.mfg,
          upc: match.candidate.upc
        };
      } else {
        console.log(`  ❌ No qualified match found (Score: ${match ? match.score : 0} < ${comp.matchThreshold})`);
        itemResult.competitors[comp.name] = {
          matchFound: false,
          score: match ? match.score : 0
        };
      }
    }

    scrapeResults.push(itemResult);
  }

  await browser.close();

  const outputPath = path.join(process.cwd(), "scraper-results.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ scrapedAt: new Date().toISOString(), itemsProcessed: scrapeResults.length, results: scrapeResults }, null, 2)
  );

  console.log("\n==================================================================");
  console.log(`✨ Scraping complete! Results saved to ${outputPath}`);
  console.log("==================================================================");
}

// Auto-run when executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith("scraper.js")) {
  run().catch(err => {
    console.error("Fatal scraper execution error:", err);
    process.exit(1);
  });
}
