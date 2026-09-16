/**
 * src/services/puppeteer-scraper.ts
 *
 * Production Playwright Product Matching & Pricing Scraper
 * specifically implemented for:
 * 1. KENT BUILDING SUPPLIES (Halifax Bayers Lake Store)
 * 2. THE HOME DEPOT (Halifax Lacewood Store)
 *
 * Fully integrated with the ProSpaces CRM Inventory Table schema.
 */

import { chromium, Browser, Page } from 'playwright';
import similarity from 'string-similarity';

// ======================================================
// CONFIGURATION & STORE LOCALIZATION
// ======================================================

export interface CompetitorConfig {
  id: number;
  name: string;
  baseUrl: string;
  searchUrl: string;
  cookies?: Array<{ name: string; value: string; domain: string }>;
  headers: Record<string, string>;
  selectors: {
    productCard: string;
    title: string;
    price: string;
    manufacturer: string;
    upc: string;
    dimensions: string;
    description: string;
    productLink: string;
  };
  matchThreshold: number;
}

export const COMPETITORS: Record<string, CompetitorConfig> = {
  kent: {
    id: 1,
    name: 'KENT Building Supplies',
    baseUrl: 'https://kent.ca',
    searchUrl: 'https://kent.ca/en/search/?q=',
    cookies: [
      { name: 'store', value: 'bayers_lake', domain: '.kent.ca' },
      { name: 'selected_store', value: '10', domain: '.kent.ca' },
      { name: 'store_code', value: '10', domain: '.kent.ca' }
    ],
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    selectors: {
      productCard: '.product-item, .product-item-info, li.item.product, .klevuProduct',
      title: '.product-item-link, .product-item-name a, .klevuProductTitle a, a[title]',
      price: '.price, [data-price-amount], .price-wrapper, .special-price, .klevuProductPrice',
      manufacturer: '.sku, [data-product-sku], .product-item-sku',
      upc: '[data-upc], .upc',
      dimensions: '.product-item-dimensions, .dimensions',
      description: '.product-item-description, .product.description, .description',
      productLink: 'a.product-item-link, .product-item-photo, a'
    },
    matchThreshold: 45
  },

  homeDepot: {
    id: 2,
    name: 'The Home Depot',
    baseUrl: 'https://www.homedepot.ca',
    searchUrl: 'https://www.homedepot.ca/search?q=',
    cookies: [
      { name: 'store', value: '7126', domain: '.homedepot.ca' },
      { name: 'selected_store', value: '7126', domain: '.homedepot.ca' },
      { name: 'province', value: 'NS', domain: '.homedepot.ca' }
    ],
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    selectors: {
      productCard: 'article.acl-product-card, [data-testid="product-card"], .product-card, .acl-product-card',
      title: 'h2.acl-product-card__title, h3.acl-product-card__title, [data-testid="product-title"], h2, h3',
      price: '[data-testid="product-price"], .acl-product-card__price, .acl-price, .price, [class*="price"]',
      manufacturer: '[data-testid="model-number"], .acl-product-card__model-number, .model-number',
      upc: '[data-upc], .upc',
      dimensions: '.dimensions, [data-testid="product-dimensions"]',
      description: '.acl-product-card__description, .description',
      productLink: 'a.acl-product-card__title-link, a[href*="/product/"], a[data-testid="product-card-title-link"]'
    },
    matchThreshold: 45
  }
};

// ======================================================
// INVENTORY TYPES & DATA STRUCTURE
// ======================================================

export interface InventoryItem {
  sku: string;
  name?: string;
  description?: string;
  dimensions?: string;
  mfg?: string;
  supplier_sku?: string;
  upc?: string;
  unit_price?: number;
  cost?: number;
  category?: string;
}

export interface CandidateProduct {
  title: string;
  priceText: string;
  price?: number | null;
  mfg?: string;
  sku?: string;
  upc?: string;
  dimensions?: string;
  description?: string;
  url: string;
}

export interface ScoredMatch {
  candidate: CandidateProduct;
  score: number;
  price: number | null;
  matchFound: boolean;
  competitorName: string;
}

// ======================================================
// STRING NORMALIZATION & PARSING HELPERS
// ======================================================

export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeMfg(mfg?: string | null): string {
  if (!mfg) return '';
  return mfg
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function normalizeUPC(upc?: string | null): string {
  if (!upc) return '';
  return upc.toString().replace(/\D/g, '');
}

/**
 * Robust price parser handling standard "$3.98", Kent strings, and
 * Home Depot's verbal layout "$3 And 98 Cents / each"
 */
export function extractPrice(rawText?: string | null): number | null {
  if (!rawText) return null;
  
  // Format: "$3 And 98 Cents"
  const andMatch = rawText.match(/\$([0-9]+)\s*(?:And|and)\s*([0-9]{1,2})\s*(?:Cents|cents)?/i);
  if (andMatch) {
    const dollars = parseInt(andMatch[1], 10);
    const cents = parseInt(andMatch[2], 10);
    return dollars + (cents / 100);
  }

  // Format: "$3.98" or "3.98"
  const decimalMatch = rawText.match(/\$?([0-9]+(?:\.[0-9]{2})?)/);
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1]);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * Domain-aware dimensions extractor for lumber and sheet goods
 */
export function extractDimensions(text?: string | null): string {
  if (!text) return '';
  const cleaned = text.replace(/["']/g, ' ').replace(/-/g, ' ');

  const isSheet = /\b(?:plywood|sheet|sheathing|osb|drywall|board|panel)\b/i.test(text);
  const sheetMatch = cleaned.match(/\b(4|5)\s*(?:ft\.?|')?\s*[xX]\s*(8|9|10|12)\s*(?:ft\.?|')?\b/i);
  const thickMatch = cleaned.match(/\b(1\/4|3\/8|1\/2|5\/8|3\/4|7\/16|11\/32|15\/32|23\/32)\b/);
  
  if (isSheet && sheetMatch) {
    return (thickMatch ? thickMatch[1] + ' ' : '') + sheetMatch[1] + 'x' + sheetMatch[2];
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
    return (thickMatch ? thickMatch[1] + ' ' : '') + sheetMatch[1] + 'x' + sheetMatch[2];
  }

  return '';
}

// ======================================================
// MATCH SCORING (Enhanced Weighted Formula)
// ======================================================

export function calculateMatchScore(inventoryItem: InventoryItem, candidate: CandidateProduct): number {
  let score = 0;

  const invTitle = (inventoryItem.description || inventoryItem.name || '').toLowerCase();
  const candTitle = (candidate.title || candidate.description || '').toLowerCase();

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

  // 4. Token & Significant Words Matching (+ up to 55 points)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'in', 'to', 'of', 'by', 'on', 'at', 'from', 'a', 'an', 'per', 'ea']);
  const cleanInvWords = invTitle
    .replace(/[^a-z0-9\/\- ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  if (cleanInvWords.length > 0) {
    let matchedWords = 0;
    for (const word of cleanInvWords) {
      if (candTitle.includes(word)) {
        matchedWords++;
      }
    }
    const tokenRatio = matchedWords / cleanInvWords.length;
    score += Math.round(tokenRatio * 55);

    // Brand / First word match bonus (e.g., SIKA, DEWALT, BOSTITCH, STANLEY)
    const firstWord = cleanInvWords[0];
    if (firstWord && firstWord.length >= 3 && candTitle.includes(firstWord)) {
      score += 20;
    }

    // Numbers & Spec match bonus (e.g., '01', '4l', '16', '3.25', '6x6')
    const numbersInInv = cleanInvWords.filter(w => /\d/.test(w));
    if (numbersInInv.length > 0) {
      const matchedNums = numbersInInv.filter(n => candTitle.includes(n)).length;
      if (matchedNums === numbersInInv.length) {
        score += 20;
      } else if (matchedNums > 0) {
        score += 10;
      }
    }
  }

  // 5. Description String Similarity via string-similarity (+ up to 25)
  const targetDesc = inventoryItem.description || inventoryItem.name || '';
  const candDesc = candidate.title || candidate.description || '';
  if (targetDesc && candDesc) {
    const descScore = similarity.compareTwoStrings(
      targetDesc.toLowerCase(),
      candDesc.toLowerCase()
    );
    score += Math.round(descScore * 25);
  }

  // 6. Grade & Keyword Matching Bonus
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

export function getSearchTerms(item: InventoryItem): string[] {
  const terms: string[] = [];

  // 1. UPC barcode (if valid)
  if (item.upc && String(item.upc).trim().length >= 6) {
    terms.push(String(item.upc).trim());
  }

  // 2. Manufacturer part number / supplier sku
  const mfg = item.mfg || item.supplier_sku;
  if (mfg && String(mfg).trim().length >= 4 && !/^\d+$/.test(String(mfg))) {
    terms.push(String(mfg).trim());
  }

  const rawDesc = (item.description || item.name || '').trim();
  if (rawDesc) {
    // Clean POS abbreviations
    const cleaned = rawDesc
      .replace(/["']/g, ' ')
      .replace(/\bSPLP\b/gi, 'Shiplap')
      .replace(/\bLUM\b/gi, 'Lumber')
      .replace(/\bBALU\b/gi, 'Baluster')
      .replace(/\bPREPAINTED\b/gi, 'Primed')
      .replace(/\bFRAM\.\b/gi, 'Framing')
      .replace(/\bREG\.\b/gi, 'Regular')
      .replace(/\bELEC\b|\bELECT\b/gi, 'Electric')
      .replace(/#.*$/, '')
      .replace(/&.*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Concise search query (first 3-4 key tokens)
    const words = cleaned.split(' ').filter(w => w.length > 1);
    if (words.length > 4) {
      terms.push(words.slice(0, 4).join(' '));
    }
    if (cleaned) {
      terms.push(cleaned);
    }

    // Dimensional query (e.g. 2x4 8ft or 2x4x8)
    const dims = extractDimensions(rawDesc);
    if (dims) {
      terms.push(`${dims} Lumber`);
    }
  }

  // Deduplicate and cap at 2 highest-quality terms for extreme speed
  const unique = Array.from(new Set(terms.filter(t => t && t.length >= 3)));
  return unique.slice(0, 2);
}

// ======================================================
// SCRAPE SEARCH RESULTS (Puppeteer Engine)
// ======================================================

export async function scrapeSearchResults(
  page: Page,
  config: CompetitorConfig,
  searchTerm: string
): Promise<CandidateProduct[]> {
  const cleanTerm = searchTerm.replace(/[\x27\"]/g, '').trim();
  if (!cleanTerm) return [];

  // Fast-path direct Kent API query (instant response in ~300ms without browser page load)
  if (config.id === 1) {
    try {
      const searchEndpoint = `https://eucs28.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-164006757741514325&term=${encodeURIComponent(cleanTerm)}&responseType=json`;
      const res = await fetch(searchEndpoint, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const results = (data.result || []).map((r: any) => ({
          title: r.name || '',
          priceText: String(r.salePrice || r.price || ''),
          mfg: r.model_no || r.sku || '',
          sku: r.sku || '',
          upc: r.upc || '',
          dimensions: '',
          description: r.shortDesc || r.desc || '',
          url: r.url || ''
        }));
        if (results.length > 0) return results;
      }
    } catch (apiErr) {}
    // If Kent API had no results, don't waste 6s loading page - Kent website uses same backend
    return [];
  }

  const encodedQuery = encodeURIComponent(cleanTerm).replace(/%20/g, '+');
  const url = config.searchUrl + encodedQuery;

  try {
    // Ultra-fast timeout for competitor page load to prevent blocking the agent
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 1200
    });

    // Kent-specific high-speed in-page evaluation:
    // If on kent.ca, query Kent's in-page search endpoint directly in the browser context
    if (config.id === 1) {
      const kentResults = await page.evaluate(async (term: string) => {
        try {
          const cleanQ = term.replace(/[\x27\"]/g, '');
          const searchEndpoint = `https://eucs28.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-164006757741514325&term=${encodeURIComponent(cleanQ)}&responseType=json`;
          const res = await fetch(searchEndpoint);
          const data = await res.json();
          return (data.result || []).map((r: any) => ({
            title: r.name || '',
            priceText: String(r.salePrice || r.price || ''),
            mfg: r.model_no || r.sku || '',
            sku: r.sku || '',
            upc: r.upc || '',
            dimensions: '',
            description: r.shortDesc || r.desc || '',
            url: r.url || ''
          }));
        } catch (e: any) {
          return [];
        }
      }, searchTerm);

      if (Array.isArray(kentResults) && kentResults.length > 0) {
        return kentResults;
      }
    }

    // Default DOM evaluation for rendered product cards
    await new Promise(r => setTimeout(r, 1500));

    const candidates = await page.evaluate(({ sel, baseUrl }: { sel: typeof config.selectors; baseUrl: string }) => {
      const cards = document.querySelectorAll(sel.productCard);
      const list: CandidateProduct[] = [];

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const titleEl = card.querySelector(sel.title) as HTMLElement | null;
        const priceEl = card.querySelector(sel.price) as HTMLElement | null;
        const mfgEl = card.querySelector(sel.manufacturer) as HTMLElement | null;
        const upcEl = card.querySelector(sel.upc) as HTMLElement | null;
        const dimEl = card.querySelector(sel.dimensions) as HTMLElement | null;
        const descEl = card.querySelector(sel.description) as HTMLElement | null;
        const linkEl = (card.querySelector(sel.productLink) || card.closest('a')) as HTMLAnchorElement | null;

        const title = titleEl ? titleEl.innerText.trim() : '';
        if (!title || title.includes('How We Use Cookies')) continue;

        let priceText = priceEl ? (priceEl.getAttribute('data-price-amount') || priceEl.innerText.trim()) : '';
        let href = linkEl ? linkEl.getAttribute('href') || '' : '';
        if (href && href.startsWith('/')) {
          href = baseUrl + href;
        }

        list.push({
          title,
          priceText,
          mfg: mfgEl ? mfgEl.innerText.trim() : '',
          upc: upcEl ? upcEl.innerText.trim() : '',
          dimensions: dimEl ? dimEl.innerText.trim() : '',
          description: descEl ? descEl.innerText.trim() : '',
          url: href || ''
        });
      }

      return list;
    }, { sel: config.selectors, baseUrl: config.baseUrl });

    return candidates;
  } catch (err: any) {
    console.warn(`[Playwright Scraper] ${config.name} scrape warning for "${searchTerm}": ${err.message}`);
    return [];
  }
}

// ======================================================
// FIND BEST PRODUCT MATCH
// ======================================================

export async function findBestProductMatch(
  page: Page,
  config: CompetitorConfig,
  inventoryItem: InventoryItem
): Promise<ScoredMatch | null> {
  const allCandidates: CandidateProduct[] = [];
  const searchTerms = getSearchTerms(inventoryItem);

  for (const term of searchTerms) {
    try {
      const results = await scrapeSearchResults(page, config, term);
      if (results && results.length > 0) {
        allCandidates.push(...results);
        break; // Stop upon finding candidates for first valid term
      }
    } catch (err: any) {
      console.error(`[Puppeteer Scraper] Term "${term}" error:`, err.message);
    }
  }

  if (!allCandidates.length) {
    return null;
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const uniqueCandidates = allCandidates.filter(c => {
    const key = c.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate match scores
  const scored = uniqueCandidates.map(candidate => {
    const score = calculateMatchScore(inventoryItem, candidate);
    const parsedPrice = extractPrice(candidate.priceText);
    return {
      candidate,
      score,
      price: parsedPrice,
      matchFound: score >= config.matchThreshold,
      competitorName: config.name
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

// ======================================================
// BROWSER LIFECYCLE MANAGEMENT (Playwright)
// ======================================================

let sharedBrowser: Browser | null = null;

export async function getPlaywrightBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    try {
      sharedBrowser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    } catch (err: any) {
      try {
        console.log('[Playwright Scraper] Browser executable missing. Attempting automatic installation via npx playwright install chromium...');
        const { execSync } = await import('child_process');
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        sharedBrowser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });
      } catch (installErr: any) {
        console.warn(`[Playwright Scraper] Auto-install/launch notice: ${installErr.message}. Regional catalog benchmark pricing will be applied.`);
        throw new Error(`Playwright Initialization Notice: ${err.message}. Regional catalog benchmark pricing will be applied.`);
      }
    }
  }
  return sharedBrowser;
}

export const getPuppeteerBrowser = getPlaywrightBrowser;

export async function closePlaywrightBrowser(): Promise<void> {
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch (e) {}
    sharedBrowser = null;
  }
}

export const closePuppeteerBrowser = closePlaywrightBrowser;
