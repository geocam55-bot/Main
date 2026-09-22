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

import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
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
  short_description?: string;
  brand?: string;
  search_keywords?: string[] | string;
  attributes?: Record<string, any> | string;
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
  brand?: string;
  category?: string;
  url: string;
}

export type MatchConfidenceLevel = 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'REGIONAL_ESTIMATE';

export interface ScoredMatch {
  candidate: CandidateProduct;
  score: number;
  price: number | null;
  matchFound: boolean;
  competitorName: string;
  confidenceLevel?: MatchConfidenceLevel;
  matchMethod?: string;
  matchSignals?: {
    brandMatched?: boolean;
    exactIdentifier?: boolean;
    dimensionsMatched?: boolean;
    attributesMatched?: boolean;
    keywordsMatched?: boolean;
  };
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
// MATCH SCORING (Enhanced Multi-Signal Formula with Brand, Attributes, Keywords & Description)
// ======================================================

const KNOWN_BRANDS = [
  'dewalt', 'milwaukee', 'makita', 'bosch', 'bostitch', 'stanley', 'irwin',
  'sika', 'lepage', 'dap', 'owens corning', 'certainteed', 'iko', 'bp',
  'simpson strong-tie', 'canwel', 'taiga', 'james hardie', 'trex', 'timbertech',
  'durock', 'hardiebacker', 'sheetrock', 'cgc', 'armstrong', 'ge', 'leviton',
  'legrand', 'schlage', 'weiser', 'kwikset', 'paslode', 'hitachi', 'metabo',
  'ryobi', 'ridgid', 'gorilla', 'titebond', 'resisto', 'soprema', 'grace',
  'blueskin', 'tyvek', 'tuck tape', 'knauf', 'rockwool', 'roxul', 'johns manville'
];

/**
 * Safely parse attributes if stored as JSON string or object
 */
export function parseItemAttributes(attrs?: Record<string, any> | string | null): Record<string, any> {
  if (!attrs) return {};
  if (typeof attrs === 'object') return attrs;
  try {
    return JSON.parse(attrs);
  } catch (e) {
    return {};
  }
}

/**
 * Extract clean search keywords as string array
 */
export function parseSearchKeywords(keywords?: string[] | string | null): string[] {
  if (!keywords) return [];
  if (Array.isArray(keywords)) {
    return keywords.map(k => String(k).trim()).filter(k => k.length > 1);
  }
  if (typeof keywords === 'string') {
    return keywords.split(/[,;\n]/).map(k => k.trim()).filter(k => k.length > 1);
  }
  return [];
}

/**
 * Extract normalized brand from item or text
 */
export function extractBrand(item: InventoryItem, text?: string): string {
  if (item.brand && item.brand.trim()) {
    return item.brand.trim().toLowerCase();
  }
  const parsedAttrs = parseItemAttributes(item.attributes);
  if (parsedAttrs.brand && typeof parsedAttrs.brand === 'string') {
    return parsedAttrs.brand.trim().toLowerCase();
  }
  const target = `${text || ''} ${item.name || ''} ${item.description || ''}`.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${b.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(target)) {
      return b;
    }
  }
  return '';
}

/**
 * Computes match confidence level and metadata based on score and verified match signals
 */
export function determineMatchConfidence(
  score: number,
  signals?: {
    upcMatch?: boolean;
    mfgMatch?: boolean;
    brandMatch?: boolean;
    attrMatch?: boolean;
    keywordMatch?: boolean;
  }
): { confidence: MatchConfidenceLevel; method: string } {
  if (signals?.upcMatch) {
    return { confidence: 'EXACT', method: 'UPC_BARCODE' };
  }
  if (signals?.mfgMatch && (signals.brandMatch || score >= 75)) {
    return { confidence: 'EXACT', method: 'BRAND_MPN_MATCH' };
  }
  if (score >= 80) {
    return { confidence: 'EXACT', method: signals?.brandMatch ? 'VERIFIED_BRAND_SPEC' : 'AUTOMATED_SCRAPER' };
  }
  if (score >= 65 || (signals?.brandMatch && (signals.attrMatch || signals.keywordMatch))) {
    return { confidence: 'HIGH', method: signals?.brandMatch ? 'BRAND_SPEC_MATCH' : 'HIGH_TOKEN_MATCH' };
  }
  if (score >= 45) {
    return { confidence: 'MEDIUM', method: 'SPEC_MATCH' };
  }
  return { confidence: 'LOW', method: 'PARTIAL_MATCH' };
}

export function calculateMatchScore(inventoryItem: InventoryItem, candidate: CandidateProduct): number {
  let score = 0;

  const invTitle = (inventoryItem.name || '').toLowerCase();
  const invDesc = (inventoryItem.description || inventoryItem.short_description || '').toLowerCase();
  const fullInvText = `${invTitle} ${invDesc}`.trim();

  const candTitle = (candidate.title || '').toLowerCase();
  const candDesc = (candidate.description || '').toLowerCase();
  const fullCandText = `${candTitle} ${candDesc}`.trim();

  // HARD VETO 1: Material Category Conflict (Plywood vs Drywall)
  const invIsPlywood = /\b(?:plywood|sheathing|osb)\b/i.test(fullInvText);
  const candIsDrywall = /\b(?:drywall|sheetrock|gypsum)\b/i.test(fullCandText);
  if (invIsPlywood && candIsDrywall) return 0;

  // HARD VETO 2: Treated vs Untreated Lumber Mismatch
  const invIsTreated = /\b(?:treated|pressure|pt|above\s*ground|ground\s*contact|sienna|micropro)\b/i.test(fullInvText);
  const candIsTreated = /\b(?:treated|pressure|above\s*ground|ground\s*contact|sienna|micropro)\b/i.test(fullCandText);
  if (!invIsTreated && candIsTreated) return 0;
  if (invIsTreated && !candIsTreated) return 0;

  // ==========================================
  // 1. Exact UPC Match (+100)
  // ==========================================
  const normInvUpc = normalizeUPC(inventoryItem.upc);
  const normCandUpc = normalizeUPC(candidate.upc);
  if (normInvUpc && normCandUpc && normInvUpc === normCandUpc) {
    score += 100;
  }

  // ==========================================
  // 2. Exact Manufacturer Part / Model # Match (+80)
  // ==========================================
  const parsedAttrs = parseItemAttributes(inventoryItem.attributes);
  const mfgCandidate = inventoryItem.mfg || inventoryItem.supplier_sku || parsedAttrs.model || parsedAttrs.mpn || parsedAttrs.mfg_part_number;
  const normInvMfg = normalizeMfg(mfgCandidate);
  const normCandMfg = normalizeMfg(candidate.mfg || candidate.sku);
  if (normInvMfg && normCandMfg) {
    if (normInvMfg === normCandMfg || normCandMfg.includes(normInvMfg)) {
      score += 80;
    }
  }

  // ==========================================
  // 3. BRAND MATCHING & CONFLICT DETECTION (+35 / -60)
  // ==========================================
  const invBrand = extractBrand(inventoryItem);
  const candBrand = (candidate.brand || '').toLowerCase() || extractBrand({ sku: candidate.sku || '' }, fullCandText);

  if (invBrand) {
    if (candBrand && invBrand === candBrand) {
      score += 35;
    } else if (fullCandText.includes(invBrand)) {
      score += 30;
    } else if (candBrand && candBrand !== invBrand) {
      // Direct brand contradiction between recognized major brands (e.g. DeWalt vs Milwaukee)
      score -= 60;
    }
  }

  // ==========================================
  // 4. ATTRIBUTES (JSON) DEEP MATCHING (+ up to 45)
  // ==========================================
  if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
    // Model / MPN inside attributes
    const attrModel = parsedAttrs.model || parsedAttrs.mpn || parsedAttrs.mfg_part_number;
    if (attrModel && String(attrModel).length >= 3) {
      const cleanModel = String(attrModel).toLowerCase();
      if (fullCandText.includes(cleanModel)) {
        score += 35;
      }
    }

    // Dimensions or Size inside attributes
    const attrDims = parsedAttrs.dimensions || parsedAttrs.size || parsedAttrs.thickness;
    if (attrDims && String(attrDims).length >= 2) {
      const cleanDims = normalizeText(String(attrDims));
      const candClean = normalizeText(fullCandText);
      if (candClean.includes(cleanDims)) {
        score += 25;
      }
    }

    // Material or Finish inside attributes
    const attrMaterial = parsedAttrs.material || parsedAttrs.finish;
    if (attrMaterial && String(attrMaterial).length >= 3) {
      const cleanMat = String(attrMaterial).toLowerCase();
      if (fullCandText.includes(cleanMat)) {
        score += 15;
      }
    }

    // Grade inside attributes
    const attrGrade = parsedAttrs.grade;
    if (attrGrade && String(attrGrade).length >= 2) {
      const cleanGrade = String(attrGrade).toLowerCase();
      if (fullCandText.includes(cleanGrade)) {
        score += 15;
      }
    }

    // Voltage / Spec / Pack Count
    const attrVoltage = parsedAttrs.voltage;
    if (attrVoltage && fullCandText.includes(String(attrVoltage).toLowerCase())) {
      score += 15;
    }
  }

  // ==========================================
  // 5. SEARCH KEYWORDS COVERAGE (+ up to 30)
  // ==========================================
  const searchKeywords = parseSearchKeywords(inventoryItem.search_keywords);
  if (searchKeywords.length > 0) {
    let kwHits = 0;
    for (const kw of searchKeywords) {
      const cleanKw = kw.toLowerCase().trim();
      if (cleanKw.length >= 3 && fullCandText.includes(cleanKw)) {
        kwHits++;
      } else {
        // Test individual significant tokens of the keyword
        const tokens = cleanKw.split(/\s+/).filter(t => t.length >= 3);
        const matched = tokens.filter(t => fullCandText.includes(t)).length;
        if (tokens.length > 0 && matched === tokens.length) {
          kwHits += 0.8;
        }
      }
    }
    const kwRatio = Math.min(1, kwHits / Math.min(searchKeywords.length, 3));
    score += Math.round(kwRatio * 30);
  }

  // ==========================================
  // 6. DIMENSIONS MATCHING (+40)
  // ==========================================
  const invDims = inventoryItem.dimensions || parsedAttrs.dimensions || extractDimensions(fullInvText);
  const candDims = candidate.dimensions || extractDimensions(fullCandText);
  if (invDims && candDims) {
    if (normalizeText(invDims) === normalizeText(candDims)) {
      score += 40;
    }
  }

  // ==========================================
  // 7. TOKEN & SIGNIFICANT WORDS MATCHING (+ up to 45)
  // ==========================================
  const stopWords = new Set(['the', 'and', 'for', 'with', 'in', 'to', 'of', 'by', 'on', 'at', 'from', 'a', 'an', 'per', 'ea']);
  const cleanInvWords = (invTitle + ' ' + (inventoryItem.short_description || ''))
    .replace(/[^a-z0-9\/\- ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  if (cleanInvWords.length > 0) {
    let matchedWords = 0;
    for (const word of cleanInvWords) {
      if (fullCandText.includes(word)) {
        matchedWords++;
      }
    }
    const tokenRatio = matchedWords / cleanInvWords.length;
    score += Math.round(tokenRatio * 45);

    // Numbers & Spec match bonus (e.g., '01', '4l', '16', '3.25', '6x6')
    const numbersInInv = cleanInvWords.filter(w => /\d/.test(w));
    if (numbersInInv.length > 0) {
      const matchedNums = numbersInInv.filter(n => fullCandText.includes(n)).length;
      if (matchedNums === numbersInInv.length) {
        score += 20;
      } else if (matchedNums > 0) {
        score += 10;
      }
    }
  }

  // ==========================================
  // 8. ENRICHED DESCRIPTION SIMILARITY (+ up to 25)
  // ==========================================
  const targetDesc = inventoryItem.description || inventoryItem.short_description || inventoryItem.name || '';
  const candDescText = candidate.title || candidate.description || '';
  if (targetDesc && candDescText) {
    const descScore = similarity.compareTwoStrings(
      targetDesc.toLowerCase().slice(0, 300),
      candDescText.toLowerCase().slice(0, 300)
    );
    score += Math.round(descScore * 25);
  }

  // ==========================================
  // 9. Grade & Standard Keywords
  // ==========================================
  const invIsSelect = /\bselect\b/i.test(fullInvText);
  const candIsSelect = /\bselect\b/i.test(fullCandText);
  const invIsStandard = /\bstandard\b/i.test(fullInvText);
  const candIsStandard = /\bstandard\b/i.test(fullCandText);

  if (invIsSelect && candIsSelect) score += 15;
  if (invIsStandard && candIsStandard) score += 15;
  if (invIsStandard && candIsSelect) score -= 20;

  return Math.max(0, Math.round(score));
}

// ======================================================
// SEARCH TERM GENERATION (Multi-Signal Query Builder)
// ======================================================

export function getSearchTerms(item: InventoryItem): string[] {
  const terms: string[] = [];
  const parsedAttrs = parseItemAttributes(item.attributes);
  const brand = extractBrand(item);

  // 1. UPC barcode (highest precision)
  if (item.upc && String(item.upc).trim().length >= 6) {
    terms.push(String(item.upc).trim());
  }

  // 2. Brand + Manufacturer Part / Model # (highest precision text query)
  const mfg = item.mfg || item.supplier_sku || parsedAttrs.model || parsedAttrs.mpn;
  if (mfg && String(mfg).trim().length >= 3 && !/^\d{1,3}$/.test(String(mfg))) {
    const cleanMfg = String(mfg).trim();
    if (brand) {
      terms.push(`${brand} ${cleanMfg}`);
    }
    terms.push(cleanMfg);
  }

  // 3. Top High-Intent Search Keywords from Catalog Enrichment
  const keywords = parseSearchKeywords(item.search_keywords);
  if (keywords.length > 0) {
    // Pick top 2 most descriptive keywords (between 8 and 45 chars)
    const validKw = keywords.filter(k => k.length >= 6 && k.length <= 50);
    for (const kw of validKw.slice(0, 2)) {
      terms.push(kw);
    }
  }

  // 4. Brand + Dimensions / Spec (e.g. Sika SikaBond 29oz, Simpson Strong-Tie H2.5A)
  const dims = parsedAttrs.dimensions || parsedAttrs.size || extractDimensions(item.description || item.name);
  if (brand && dims) {
    const cat = item.category ? item.category.replace(/[^a-zA-Z]/g, ' ').trim().split(' ')[0] : '';
    terms.push(`${brand} ${dims} ${cat}`.trim());
  }

  // 5. Cleaned Title / POS Description Query
  const rawDesc = (item.description || item.short_description || item.name || '').trim();
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
      const concise = words.slice(0, 4).join(' ');
      if (brand && !concise.toLowerCase().includes(brand)) {
        terms.push(`${brand} ${concise}`);
      } else {
        terms.push(concise);
      }
    }
    if (cleaned && cleaned.length <= 45) {
      terms.push(cleaned);
    }
  }

  // Deduplicate and select top 3 most targeted queries
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const t of terms) {
    const norm = t.toLowerCase().trim();
    if (norm.length >= 3 && !seen.has(norm)) {
      seen.add(norm);
      unique.push(t.trim());
    }
  }

  return unique.slice(0, 3);
}

// ======================================================
// SCRAPE SEARCH RESULTS (Puppeteer Engine)
// ======================================================

/**
 * Fetches the live, localized store price directly from a Kent product page (Store 10 - Bayers Lake)
 * to bypass stale or un-localized Klevu search catalog index prices.
 */
export async function fetchLiveKentStorePrice(url?: string | null): Promise<number | null> {
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

    // 1. Check JSON-LD structured data (Product offers) - Highest accuracy for live store price
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

    // 2. Check Magento data-price-amount attribute
    const dataPriceMatch = html.match(/data-price-amount="([0-9.]+)"/i);
    if (dataPriceMatch) {
      const val = parseFloat(dataPriceMatch[1]);
      if (!isNaN(val) && val > 0) return val;
    }

    // 3. Check OpenGraph / Schema product:price:amount meta tag
    const metaMatch = html.match(/<meta[^>]+(?:property="product:price:amount"|itemprop="price")[^>]+content="([0-9.]+)"/i) ||
                      html.match(/<meta[^>]+content="([0-9.]+)"[^>]+(?:property="product:price:amount"|itemprop="price")/i);
    if (metaMatch) {
      const val = parseFloat(metaMatch[1]);
      if (!isNaN(val) && val > 0) return val;
    }

    // 4. Check finalPrice wrapper span
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

export async function scrapeSearchResults(
  page: Page | null,
  config: CompetitorConfig,
  searchTerm: string
): Promise<CandidateProduct[]> {
  const cleanTerm = searchTerm.replace(/[\x27\"]/g, '').trim();
  if (!cleanTerm) return [];

  // Fast-path direct Kent API query (instant response in ~300ms without browser page load)
  if (config.id === 1) {
    try {
      const searchEndpoint = `https://eucs28.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-164006757741514325&term=${encodeURIComponent(cleanTerm)}&responseType=json`;
      const res = await fetch(searchEndpoint, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
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
          brand: r.brand || r.manufacturer || '',
          category: r.category || '',
          url: r.url || ''
        }));
        if (results.length > 0) return results;
      }
    } catch (apiErr) {}
    return [];
  }

  // Fast-path direct Home Depot Canada search API (Store 7126 - Halifax Lacewood)
  if (config.id === 2) {
    try {
      const hdApiUrl = `https://www.homedepot.ca/api/search/v1/search?q=${encodeURIComponent(cleanTerm)}&store=7126`;
      const res = await fetch(hdApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        const hdCandidates: CandidateProduct[] = (data.products || []).map((p: any) => {
          const priceVal = p.pricing?.displayPrice?.value ?? p.pricing?.value ?? null;
          return {
            title: p.name || '',
            priceText: priceVal != null ? String(priceVal) : '',
            sku: String(p.code || ''),
            mfg: p.modelNumber || p.code || '',
            upc: p.upc || '',
            dimensions: '',
            description: p.description || p.name || '',
            brand: p.brand || '',
            category: '',
            url: p.url ? (p.url.startsWith('http') ? p.url : `https://www.homedepot.ca${p.url}`) : ''
          };
        });
        if (hdCandidates.length > 0) {
          return hdCandidates;
        }
      }
    } catch (hdErr) {
      // Fallback to browser navigation if API fails
    }
  }

  if (!page) return [];

  const encodedQuery = encodeURIComponent(cleanTerm).replace(/%20/g, '+');
  const url = config.searchUrl + encodedQuery;

  try {
    // Fast timeout for competitor page load
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 3000
    });

    // Default DOM evaluation for rendered product cards
    await new Promise(r => setTimeout(r, 1200));

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
  page: Page | null,
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
        // Check if any candidate in this batch qualifies with a high score (>= matchThreshold)
        const hasQualifiedMatch = results.some(cand => calculateMatchScore(inventoryItem, cand) >= config.matchThreshold);
        if (hasQualifiedMatch) {
          break; // Stop upon finding qualified candidates
        }
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
  const invBrand = extractBrand(inventoryItem);
  const parsedAttrs = parseItemAttributes(inventoryItem.attributes);
  const searchKeywords = parseSearchKeywords(inventoryItem.search_keywords);

  const scored = uniqueCandidates.map(candidate => {
    const score = calculateMatchScore(inventoryItem, candidate);
    const parsedPrice = extractPrice(candidate.priceText);

    const candBrand = (candidate.brand || '').toLowerCase() || extractBrand({ sku: candidate.sku || '' }, candidate.title);
    const brandMatched = Boolean(invBrand && (invBrand === candBrand || candidate.title.toLowerCase().includes(invBrand)));

    const normInvUpc = normalizeUPC(inventoryItem.upc);
    const normCandUpc = normalizeUPC(candidate.upc);
    const upcMatch = Boolean(normInvUpc && normCandUpc && normInvUpc === normCandUpc);

    const normInvMfg = normalizeMfg(inventoryItem.mfg || inventoryItem.supplier_sku || parsedAttrs.model || parsedAttrs.mpn);
    const normCandMfg = normalizeMfg(candidate.mfg || candidate.sku);
    const mfgMatch = Boolean(normInvMfg && normCandMfg && (normInvMfg === normCandMfg || normCandMfg.includes(normInvMfg)));

    const attrMatch = Boolean(
      (parsedAttrs.dimensions && candidate.title.toLowerCase().includes(String(parsedAttrs.dimensions).toLowerCase())) ||
      (parsedAttrs.model && candidate.title.toLowerCase().includes(String(parsedAttrs.model).toLowerCase())) ||
      (parsedAttrs.material && candidate.title.toLowerCase().includes(String(parsedAttrs.material).toLowerCase()))
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
      matchFound: score >= config.matchThreshold,
      competitorName: config.name,
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

  // If Kent candidate was found and has a URL, resolve live localized store price from the page
  // to avoid outdated Klevu search catalog pricing
  if (best && config.id === 1 && best.candidate.url) {
    try {
      const liveKentPrice = await fetchLiveKentStorePrice(best.candidate.url);
      if (liveKentPrice != null && liveKentPrice > 0) {
        best.price = liveKentPrice;
        best.candidate.priceText = String(liveKentPrice);
      }
    } catch (priceErr) {}
  }

  return best;
}

// ======================================================
// BROWSER LIFECYCLE MANAGEMENT (Playwright)
// ======================================================

let sharedBrowser: Browser | null = null;

export async function getPlaywrightBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    const customExecPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROMIUM_PATH || undefined;
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
    if (customExecPath) {
      launchOptions.executablePath = customExecPath;
    }

    try {
      sharedBrowser = await chromium.launch(launchOptions);
    } catch (err: any) {
      try {
        console.log('[Playwright Scraper] Browser executable missing. Attempting automatic installation via npx playwright install chromium...');
        const { execSync } = await import('child_process');
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        sharedBrowser = await chromium.launch(launchOptions);
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

export async function restartPlaywrightBrowser(): Promise<Browser> {
  await closePlaywrightBrowser();
  return await getPlaywrightBrowser();
}

/**
 * Creates an isolated, memory-optimized page for scraping with blocked assets
 */
export async function createOptimizedPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US'
  });
  const page = await context.newPage();
  try {
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        return route.abort();
      }
      return route.continue();
    });
  } catch (e) {}
  return page;
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
