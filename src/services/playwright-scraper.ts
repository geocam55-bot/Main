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

import playwright from 'playwright';
import type { Browser, Page } from 'playwright';

const { chromium } = playwright;

if (!chromium) {
  throw new Error('Playwright Chromium is unavailable. Verify the installed playwright package and browser runtime.');
}
import similarity from 'string-similarity';

// Kent's locator identifier for Halifax - Bayers Lake.
export const KENT_STORE_ID = process.env.KENT_STORE_ID?.trim() || '3060';

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
      { name: 'selected_store', value: KENT_STORE_ID, domain: '.kent.ca' },
      { name: 'store_code', value: KENT_STORE_ID, domain: '.kent.ca' }
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
  },

  rona: {
    id: 3,
    name: 'RONA',
    baseUrl: 'https://www.rona.ca',
    searchUrl: 'https://www.rona.ca/en/search?search=',
    cookies: [
      { name: 'store', value: '8860', domain: '.rona.ca' },
      { name: 'province', value: 'NS', domain: '.rona.ca' }
    ],
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    selectors: {
      productCard: '.product-card, [data-testid="product-card"], .product-item',
      title: '.product-card__title, [data-testid="product-title"], h2, h3',
      price: '.product-card__price, [data-testid="product-price"], .price',
      manufacturer: '.product-card__model, [data-testid="model-number"]',
      upc: '[data-upc]',
      dimensions: '.dimensions',
      description: '.product-card__description',
      productLink: 'a[href*="/product/"], a.product-card__link'
    },
    matchThreshold: 40
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
  storePriceVerified?: boolean;
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  mfg?: string;
  sku?: string;
  upc?: string;
  dimensions?: string;
  description?: string;
  brand?: string;
  category?: string;
  url: string;
}

export interface ScraperApiObservation {
  retailer: string;
  endpoint: string;
  requestMethod?: string;
  resourceType?: string;
  requestHeaders?: Record<string, string>;
  requestPayloadBytes?: number;
  status?: number;
  contentType?: string;
  returnedCount?: number;
  totalCount?: number;
  pagesRetrieved?: number;
  responseKeys?: string[];
  error?: string;
}

interface ScraperDiagnostics {
  errors?: string[];
  apiResponses?: ScraperApiObservation[];
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

  // Format: "$3.98", "$1,299.99", or "3.98"
  const decimalMatch = rawText.match(/\$?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/);
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1].replace(/,/g, ''));
    return isNaN(val) ? null : val;
  }

  return null;
}

export function extractKentStorePrice(groupPrices: unknown, storeId = KENT_STORE_ID): number | null {
  if (typeof groupPrices !== 'string') return null;

  for (const group of groupPrices.split(';')) {
    const [, groupStoreId, rawPrice] = group.split(':');
    if (groupStoreId?.trim() === storeId && rawPrice) {
      return extractPrice(rawPrice);
    }
  }

  return null;
}

export function kentStoreAvailability(storeInStock: unknown, storeId = KENT_STORE_ID): CandidateProduct['availability'] {
  if (storeInStock == null || storeInStock === '') return 'UNKNOWN';

  let stores: unknown = storeInStock;
  if (typeof storeInStock === 'string') {
    try {
      stores = JSON.parse(storeInStock);
    } catch {
      stores = storeInStock.split(/[;,]/).map(store => store.trim());
    }
  }
  if (!Array.isArray(stores)) return 'UNKNOWN';

  return stores.some(store => String(store) === storeId) ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

export function parseHomeDepotCandidates(response: unknown): CandidateProduct[] {
  if (!response || typeof response !== 'object') return [];

  const root = response as Record<string, unknown>;
  const containers = [root, root.data, root.response]
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'));
  const products = Array.isArray(response)
    ? response as Array<Record<string, unknown>>
    : containers.flatMap(container => [container.products, container.results, container.items])
      .find(Array.isArray) as Array<Record<string, unknown>> | undefined;
  if (!products) return [];

  return products.flatMap((product) => {
    if (!product || typeof product !== 'object') return [];
    const pricing = product.pricing && typeof product.pricing === 'object'
      ? product.pricing as Record<string, unknown>
      : {};
    const availability = product.availability && typeof product.availability === 'object'
      ? product.availability as Record<string, unknown>
      : {};
    const inStock = product.inStock ?? product.isInStock ?? product.onlineAvailability;
    const title = String(product.name || product.title || product.productName || '').trim();
    if (!title) return [];

    const productUrl = product.url || product.productUrl || '';
    const url = String(productUrl);
    const price = pricing.displayPrice ?? pricing.value ?? pricing.price ??
      product.displayPrice ?? product.sellingPrice ?? product.price ?? null;

    return [{
      title,
      priceText: priceValueToText(price),
      storePriceVerified: true,
      availability: availability.status === 'IN_STOCK' || inStock === true || inStock === 'IN_STOCK'
        ? 'IN_STOCK'
        : availability.status === 'OUT_OF_STOCK' || inStock === false || inStock === 'OUT_OF_STOCK'
          ? 'OUT_OF_STOCK'
          : 'UNKNOWN',
      sku: String(product.code || product.sku || product.itemId || ''),
      mfg: String(product.modelNumber || product.manufacturerPartNumber || product.mpn || product.code || ''),
      upc: String(product.upc || product.barcode || ''),
      dimensions: String(product.dimensions || ''),
      description: String(product.description || title),
      brand: String(product.brand || ''),
      category: String(product.category || ''),
      url: url ? (url.startsWith('http') ? url : `https://www.homedepot.ca${url}`) : ''
    }];
  });
}

function priceValueToText(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  if (!value || typeof value !== 'object') return '';

  const price = value as Record<string, unknown>;
  for (const key of ['value', 'amount', 'formattedValue', 'formatted', 'price']) {
    const nested = price[key];
    if (typeof nested === 'number' || typeof nested === 'string') return String(nested);
  }
  return '';
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

function getComparableMatchTokens(text: string): string[] {
  const canonicalText = text.toLowerCase()
    .replace(/\b(?:trm|trim)[\s.-]*tex\b/g, 'trimtex')
    .replace(/\bcrnrn?bn\b/g, 'corner bead')
    .replace(/\bcrnr\b/g, 'corner')
    .replace(/\bcorner[\s-]*bead\b/g, 'corner bead')
    .replace(/\bd\s*\/\s*w\b/g, 'drywall')
    .replace(/\b90d\b/g, '90 degree')
    .replace(/\bply\b/g, 'plywood')
    .replace(/\bpt\b/g, 'pressure treated')
    .replace(/\bkd\b/g, 'kiln dried')
    .replace(/\bbtr\b/g, 'better')
    .replace(/\bd4s\b/g, 'dressed four sides')
    .replace(/(\d)(?=[a-z])/g, '$1 ')
    .replace(/([a-z])(?=\d)/g, '$1 ')
    .replace(/(\d)["']?\s*x\s*["']?(?=\d)/g, '$1 ')
    .replace(/\s+x\s+/g, ' ')
    .replace(/[^a-z0-9/]+/g, ' ');
  const stopWords = new Set(['the', 'and', 'for', 'with', 'in', 'to', 'of', 'by', 'on', 'at', 'from', 'a', 'an', 'per', 'ea', 'ft', 'inch']);

  return [...new Set(canonicalText.split(/\s+/).filter(token =>
    token.length > 0 && token !== 'x' && !stopWords.has(token)
  ))];
}

function getDimensionSignature(text: string): string[] {
  const normalized = text.toLowerCase()
    .replace(/(\d)\s+(\d+\/\d+)/g, '$1-$2')
    .replace(/\b(?:inches|inch|in|feet|foot|ft)\b\.?/g, ' ')
    .replace(/["']/g, ' ');
  const number = String.raw`(?:\d+-\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;
  const pattern = new RegExp(`(?<![a-z0-9])(${number})\\s*x\\s*(${number})(?:\\s*x\\s*(${number}))?`, 'i');
  const match = normalized.match(pattern);

  return match ? match.slice(1).filter(Boolean) : [];
}

function normalizeDimensionValue(value: string): string {
  const mixedFraction = value.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (mixedFraction) {
    return String(Number(mixedFraction[1]) + Number(mixedFraction[2]) / Number(mixedFraction[3]));
  }
  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) return String(Number(fraction[1]) / Number(fraction[2]));
  return String(Number(value));
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
  const invIsPlywood = /\b(?:ply|plywood|sheathing|osb)\b/i.test(fullInvText);
  const candIsDrywall = /\b(?:drywall|sheetrock|gypsum)\b/i.test(fullCandText);
  if (invIsPlywood && candIsDrywall) return 0;

  const invIsSPF = /\bspf\b/i.test(fullInvText);
  const candIsDifferentWoodSpecies = /\b(?:maple|oak|cedar|walnut|poplar|birch|mahogany|redwood|cherry)\b/i.test(fullCandText);
  if (invIsSPF && candIsDifferentWoodSpecies) return 0;
  if (invIsSPF && /\bknotty\b/i.test(fullCandText)) return 0;

  const invIsDimensionalLumber =
    /\b(?:lumber|spf|pt brown)\b/i.test(fullInvText) &&
    /\b\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\b/i.test(fullInvText);
  if (invIsDimensionalLumber && /\b(?:handrail|moulding|molding|door stop|trim board)\b/i.test(fullCandText)) return 0;

  // HARD VETO 2: Treated vs Untreated Lumber Mismatch
  const getTreatmentStatus = (text: string): 'treated' | 'untreated' | null => {
    if (/\b(?:untreated|not\s+(?:pressure\s+)?treated|non[\s-]?treated)\b/i.test(text)) {
      return 'untreated';
    }
    if (/\b(?:pressure[\s-]+treated|treated|above[\s-]*ground|ground[\s-]*contact|sienna|micropro)\b/i.test(text)) {
      return 'treated';
    }
    const hasLumberContext = /\b(?:lumber|wood|board|post|joist|deck|timber)\b|\b\d+\s*[x×]\s*\d+\b/i.test(text);
    if (hasLumberContext && /\bpt\b/i.test(text)) {
      return 'treated';
    }
    return null;
  };
  const invTreatmentStatus = getTreatmentStatus(fullInvText);
  const candidateTreatmentStatus = getTreatmentStatus(fullCandText);
  if (invTreatmentStatus && candidateTreatmentStatus && invTreatmentStatus !== candidateTreatmentStatus) return 0;

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
  const invDimensionSignature = getDimensionSignature(fullInvText)
    .map(normalizeDimensionValue);
  const candidateDimensionSignature = getDimensionSignature(fullCandText)
    .map(normalizeDimensionValue);
  const invIsSheetGood = /\b(?:ply|plywood|osb|sheathing|panel)\b/i.test(fullInvText);
  const invSheetThickness = invIsSheetGood
    ? fullInvText.match(/\b(1\/4|3\/8|1\/2|5\/8|7\/16|11\/32|15\/32|23\/32|3\/4)\b/i)?.[1]
    : undefined;
  if (
    invDimensionSignature.length === 0 &&
    invSheetThickness &&
    candidateDimensionSignature.length >= 1 &&
    normalizeDimensionValue(invSheetThickness) !== candidateDimensionSignature[0]
  ) {
    return 0;
  }
  if (
    invDimensionSignature.length > 1 &&
    candidateDimensionSignature.length > 1 &&
    invDimensionSignature.length === candidateDimensionSignature.length
  ) {
    const dimensionsMatch = invDimensionSignature.length === 3
      ? invDimensionSignature[2] === candidateDimensionSignature[2] &&
        (
          (invDimensionSignature[0] === candidateDimensionSignature[0] &&
            invDimensionSignature[1] === candidateDimensionSignature[1]) ||
          (invDimensionSignature[0] === candidateDimensionSignature[1] &&
            invDimensionSignature[1] === candidateDimensionSignature[0])
        )
      : invDimensionSignature.length === 2 &&
        (
          (invDimensionSignature[0] === candidateDimensionSignature[0] &&
            invDimensionSignature[1] === candidateDimensionSignature[1]) ||
          (invDimensionSignature[0] === candidateDimensionSignature[1] &&
            invDimensionSignature[1] === candidateDimensionSignature[0])
        );
    if (dimensionsMatch) {
      score += 40;
    } else {
      return 0;
    }
  } else if (invDims && candDims && invDimensionSignature.length === 0 && candidateDimensionSignature.length === 0) {
    if (normalizeText(invDims) === normalizeText(candDims)) {
      score += 40;
    }
  }

  // ==========================================
  // 7. TOKEN & SIGNIFICANT WORDS MATCHING (+ up to 45)
  // ==========================================
  const stopWords = new Set(['the', 'and', 'for', 'with', 'in', 'to', 'of', 'by', 'on', 'at', 'from', 'a', 'an', 'per', 'ea']);
  const cleanInvWords = getComparableMatchTokens(fullInvText).filter(word => !stopWords.has(word));
  const candidateMatchTokens = new Set(getComparableMatchTokens(fullCandText));

  if (cleanInvWords.length > 0) {
    const matchedWords = cleanInvWords.filter(word => candidateMatchTokens.has(word)).length;
    const tokenRatio = matchedWords / cleanInvWords.length;
    score += Math.round(tokenRatio * 45);

    const primaryDescription = inventoryItem.description || inventoryItem.short_description || inventoryItem.name || '';
    const primaryWords = getComparableMatchTokens(primaryDescription)
      .filter(word => !stopWords.has(word))
      .slice(0, 5);
    if (primaryWords.length > 0) {
      const matchedPrimaryWords = primaryWords.filter(word => candidateMatchTokens.has(word)).length;
      score += Math.round((matchedPrimaryWords / primaryWords.length) * 20);
    }

    // Numbers & Spec match bonus (e.g., '01', '4l', '16', '3.25', '6x6')
    const numbersInInv = cleanInvWords.filter(w => /\d/.test(w));
    if (numbersInInv.length > 0) {
      const matchedNums = numbersInInv.filter(number => candidateMatchTokens.has(number)).length;
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
  const candidateDescriptions = [candidate.title, candidate.description]
    .filter((description): description is string => Boolean(description));
  if (targetDesc && candidateDescriptions.length > 0) {
    const descScore = Math.max(...candidateDescriptions.map(candidateDesc =>
      similarity.compareTwoStrings(
        targetDesc.toLowerCase().slice(0, 300),
        candidateDesc.toLowerCase().slice(0, 300)
      )
    ));
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
  const rawDesc = (item.description || item.short_description || item.name || '').trim();
  const fullDescription = rawDesc.replace(/["']/g, ' ').replace(/\s+/g, ' ').trim();
  const dimensions = getDimensionSignature(rawDesc);
  let cleanedDescription = rawDesc
    .replace(/#\s*(\d+)\s*&\s*(?:BTR|BETTER)\b/gi, '$1 and better')
    .replace(/#\s*(\d+)/gi, 'number $1')
    .replace(/\bBTR\b/gi, 'better')
    .replace(/\bKD\b/gi, 'kiln dried')
    .replace(/\bPLY\b/gi, 'plywood')
    .replace(/\bD4S\b/gi, 'dressed four sides')
    .replace(/\bPT\b(?=\s+(?:BROWN|PLYWOOD|LUMBER|D[124]S)\b)/gi, 'pressure treated')
    .replace(/&/g, 'and')
    .replace(/(\d)["']?\s*[x×]\s*["']?(?=\d)/gi, '$1 x ')
    .replace(/\s+/g, ' ')
    .trim();

  // Put the product description first; an internal inventory SKU is rarely searchable at a retailer.
  if (rawDesc) {
    if (fullDescription) terms.push(fullDescription);
    cleanedDescription = cleanedDescription
      .replace(/\bSPLP\b/gi, 'Shiplap')
      .replace(/\bLUM\b/gi, 'Lumber')
      .replace(/\bBALU\b/gi, 'Baluster')
      .replace(/\bPREPAINTED\b/gi, 'Primed')
      .replace(/\bFRAM\.\b/gi, 'Framing')
      .replace(/\bREG\.\b/gi, 'Regular')
      .replace(/\bELEC\b|\bELECT\b/gi, 'Electric')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Search manufacturer identifiers before optional keywords so Vercel's query cap retains them.
  const mfg = item.mfg || item.supplier_sku || parsedAttrs.model || parsedAttrs.mpn;
  if (mfg && String(mfg).trim().length >= 3 && !/^\d{1,3}$/.test(String(mfg))) {
    const cleanMfg = String(mfg).trim();
    terms.push(cleanMfg);
  }

  if (item.upc && String(item.upc).trim().length >= 6) terms.push(String(item.upc).trim());
  if (cleanedDescription && cleanedDescription.toLowerCase() !== fullDescription.toLowerCase()) {
    terms.push(cleanedDescription);
  }
  if (dimensions.length >= 2) {
    if (/\bOSB\b/i.test(rawDesc) && dimensions.length === 3) {
      terms.push(`${dimensions[0]} OSB ${dimensions[1]} x ${dimensions[2]}`);
    } else if (/\bSPF\b/i.test(rawDesc)) {
      terms.push(`SPF ${dimensions.join(' x ')}`);
      terms.push(`${dimensions.join(' x ')} spruce lumber`);
    } else if (/\bPT\b|\bpressure[\s-]*treated\b/i.test(rawDesc)) {
      const color = /\bbrown\b/i.test(rawDesc) ? 'brown ' : '';
      terms.push(`pressure treated ${color}${dimensions.join(' x ')}`);
    } else if (/\b(?:PLY|PLYWOOD)\b/i.test(rawDesc)) {
      terms.push(`${dimensions.join(' x ')} plywood`);
    }
  } else if (/\b(?:PLY|PLYWOOD)\b/i.test(rawDesc)) {
    terms.push(cleanedDescription);
  }
  const words = cleanedDescription.split(' ').filter(w => w.length > 1);
  if (words.length > 4) terms.push(words.slice(0, 4).join(' '));

  const productName = String(item.name || '').trim();
  if (productName && productName.toLowerCase() !== rawDesc.toLowerCase()) terms.push(productName);
  if (mfg && brand) terms.push(`${brand} ${String(mfg).trim()}`);

  // High-intent catalog keywords supplement the product description.
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

  // Internal inventory SKUs are usually not indexed by retailers.
  if (item.sku && String(item.sku).trim().length >= 3) terms.push(String(item.sku).trim());

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const t of terms) {
    const norm = t.toLowerCase().trim();
    if (norm.length >= 3 && !seen.has(norm)) {
      seen.add(norm);
      unique.push(t.trim());
    }
  }

  return unique.slice(0, 8);
}

// ======================================================
// SCRAPE SEARCH RESULTS (Puppeteer Engine)
// ======================================================

/**
 * Fetches the live, localized store price directly from a Kent product page (Bayers Lake)
 * to bypass stale or un-localized Klevu search catalog index prices.
 */
export async function fetchLiveKentStorePrice(url?: string | null): Promise<number | null> {
  if (!url || !url.includes('kent.ca')) return null;
  let page: Page | null = null;
  try {
    const browser = await getPlaywrightBrowser();
    page = await createOptimizedPage(browser);
    
    await page.context().addCookies([
      { name: 'store', value: 'bayers_lake', domain: '.kent.ca', path: '/' },
      { name: 'selected_store', value: KENT_STORE_ID, domain: '.kent.ca', path: '/' },
      { name: 'store_code', value: KENT_STORE_ID, domain: '.kent.ca', path: '/' }
    ]);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('.price, [data-price-amount], .price-wrapper', { timeout: 6000 }).catch(() => {});

    const scrapedPrice = await page.evaluate(() => {
      const priceElem = document.querySelector('[data-price-amount]');
      if (priceElem) {
        const val = parseFloat(priceElem.getAttribute('data-price-amount') || '');
        if (!isNaN(val) && val > 0) return val;
      }

      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        try {
          const parsed = JSON.parse(script.textContent || '');
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

      const selectors = ['.price-final_price .price', '.price-wrapper .price', '.price', '[class*="price"]'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const match = el.textContent.replace(/,/g, '').match(/\$([0-9.]+)/);
          if (match) {
            const p = parseFloat(match[1]);
            if (!isNaN(p) && p > 0) return p;
          }
        }
      }
      return null;
    });

    await page.close();
    page = null;

    if (scrapedPrice != null && scrapedPrice > 0) {
      return scrapedPrice;
    }
    return null;
  } catch (e) {
    if (page) {
      try { await page.close(); } catch (err) {}
    }
    return null;
  }
}

export async function fetchLiveHomeDepotStorePrice(url?: string | null): Promise<number | null> {
  if (!url || !url.includes('homedepot.ca')) return null;
  let page: Page | null = null;
  try {
    const browser = await getPlaywrightBrowser();
    page = await createOptimizedPage(browser);
    
    await page.context().addCookies([
      { name: 'store', value: '7126', domain: '.homedepot.ca', path: '/' },
      { name: 'selected_store', value: '7126', domain: '.homedepot.ca', path: '/' },
      { name: 'province', value: 'NS', domain: '.homedepot.ca', path: '/' }
    ]);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('[data-testid="product-price"], .price, [class*="price"]', { timeout: 6000 }).catch(() => {});

    const scrapedPrice = await page.evaluate(() => {
      const priceElem = document.querySelector('[data-testid="product-price"], [itemprop="price"]');
      if (priceElem) {
        const text = priceElem.textContent || priceElem.getAttribute('content') || '';
        const match = text.replace(/,/g, '').match(/\$?([0-9.]+)/);
        if (match) {
          const p = parseFloat(match[1]);
          if (!isNaN(p) && p > 0) return p;
        }
      }

      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        try {
          const parsed = JSON.parse(script.textContent || '');
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

      const priceEls = document.querySelectorAll('.price, [class*="price"]');
      for (const el of priceEls) {
        const text = el.textContent || '';
        const match = text.replace(/,/g, '').match(/\$([0-9.]+)/);
        if (match) {
          const p = parseFloat(match[1]);
          if (!isNaN(p) && p > 0) return p;
        }
      }
      return null;
    });

    await page.close();
    page = null;

    if (scrapedPrice != null && scrapedPrice > 0) {
      return scrapedPrice;
    }
    return null;
  } catch (e) {
    if (page) {
      try { await page.close(); } catch (err) {}
    }
    return null;
  }
}

export async function scrapeSearchResults(
  page: Page | null,
  config: CompetitorConfig,
  searchTerm: string,
  diagnostics?: ScraperDiagnostics
): Promise<CandidateProduct[]> {
  const cleanTerm = searchTerm.replace(/[\x27\"]/g, '').trim();
  if (!cleanTerm) return [];

  // Fast-path direct Kent API query (instant response in ~300ms without browser page load)
  if (config.id === 1) {
    try {
      const pageSize = 100;
      const fetchPage = async (offset: number) => {
        const searchEndpoint = new URL('https://eucs28.ksearchnet.com/cloud-search/n-search/search');
        searchEndpoint.searchParams.set('ticket', 'klevu-164006757741514325');
        searchEndpoint.searchParams.set('term', cleanTerm);
        searchEndpoint.searchParams.set('responseType', 'json');
        searchEndpoint.searchParams.set('noOfResults', String(pageSize));
        searchEndpoint.searchParams.set('paginationStartsFrom', String(offset));
        const res = await fetch(searchEndpoint, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(process.env.VERCEL ? 1800 : 3500)
        });
        if (!res.ok) {
          diagnostics?.errors?.push(`Kent API returned HTTP ${res.status}`);
          return null;
        }
        return { data: await res.json(), contentType: res.headers.get('content-type') || undefined };
      };

      const firstPage = await fetchPage(0);
      if (firstPage) {
        const totalCount = Number(firstPage.data.meta?.totalResultsFound) || 0;
        const firstResults = Array.isArray(firstPage.data.result) ? firstPage.data.result : [];
        const offsets = Array.from(
          { length: Math.ceil(Math.max(0, totalCount - firstResults.length) / pageSize) },
          (_, index) => (index + 1) * pageSize
        );
        const additionalPages: Array<{ data: any; contentType?: string } | null> = [];
        for (let index = 0; index < offsets.length; index += 4) {
          additionalPages.push(...await Promise.all(offsets.slice(index, index + 4).map(fetchPage)));
        }
        const pageResults = [
          firstPage,
          ...additionalPages.filter((page): page is { data: any; contentType?: string } => page !== null)
        ];
        const rawResults = pageResults.flatMap(page =>
          Array.isArray(page.data.result) ? page.data.result : []
        );
        diagnostics?.apiResponses?.push({
          retailer: 'Kent',
          endpoint: '/cloud-search/n-search/search',
          status: 200,
          contentType: firstPage.contentType,
          returnedCount: rawResults.length,
          totalCount,
          pagesRetrieved: pageResults.length,
          responseKeys: Object.keys(firstPage.data).sort()
        });
        const results = rawResults.map((r: any) => ({
          title: r.name || '',
          priceText: extractKentStorePrice(r.groupPrices)?.toString() || '',
          storePriceVerified: true,
          availability: kentStoreAvailability(r.store_in_stock),
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
    } catch (apiErr: any) {
      const error = apiErr?.message || String(apiErr);
      diagnostics?.errors?.push(`Kent API: ${error}`);
      diagnostics?.apiResponses?.push({
        retailer: 'Kent',
        endpoint: '/cloud-search/n-search/search',
        error
      });
      // Fall through to the browser search when the catalog API is unavailable.
    }
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
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const hdCandidates = parseHomeDepotCandidates(data);
        diagnostics?.apiResponses?.push({
          retailer: 'Home Depot',
          endpoint: '/api/search/v1/search',
          status: res.status,
          contentType: res.headers.get('content-type') || undefined,
          returnedCount: hdCandidates.length,
          totalCount: Number(data?.totalResults ?? data?.totalCount ?? data?.pagination?.totalResults) || undefined,
          responseKeys: data && typeof data === 'object' ? Object.keys(data).sort() : []
        });
        if (hdCandidates.length > 0) {
          return hdCandidates;
        }
      } else {
        diagnostics?.apiResponses?.push({
          retailer: 'Home Depot',
          endpoint: '/api/search/v1/search',
          status: res.status,
          contentType: res.headers.get('content-type') || undefined,
          returnedCount: 0
        });
        diagnostics?.errors?.push(`Home Depot API returned HTTP ${res.status}`);
      }
    } catch (hdErr: any) {
      const error = hdErr?.message || String(hdErr);
      diagnostics?.errors?.push(`Home Depot API: ${error}`);
      diagnostics?.apiResponses?.push({
        retailer: 'Home Depot',
        endpoint: '/api/search/v1/search',
        error
      });
      // Fallback to browser navigation if API fails
    }
  }

  if (!page) return [];

  const encodedQuery = encodeURIComponent(cleanTerm).replace(/%20/g, '+');
  let url = config.searchUrl + encodedQuery;
  const observedResponseTasks: Promise<void>[] = [];
  const onResponse = (response: import('playwright').Response) => {
    const request = response.request();
    if (request.resourceType() !== 'xhr' && request.resourceType() !== 'fetch') return;

    const parsedUrl = new URL(response.url());
    const contentType = response.headers()['content-type'] || undefined;
    const requestHeaders = request.headers();
    const safeRequestHeaders = Object.fromEntries(
      ['accept', 'content-type', 'accept-language']
        .filter(name => requestHeaders[name])
        .map(name => [name, requestHeaders[name]])
    );
    const requestPayload = request.postData();
    const observation: ScraperApiObservation = {
      retailer: config.name,
      endpoint: `${parsedUrl.origin}${parsedUrl.pathname}`,
      requestMethod: request.method(),
      resourceType: request.resourceType(),
      requestHeaders: safeRequestHeaders,
      requestPayloadBytes: requestPayload ? new TextEncoder().encode(requestPayload).length : 0,
      status: response.status(),
      contentType,
    };
    diagnostics?.apiResponses?.push(observation);
    if (!contentType?.includes('json')) return;

    observedResponseTasks.push((async () => {
      try {
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object') return;
        const record = body as Record<string, unknown>;
        observation.responseKeys = Object.keys(record).sort();
        const products = [record.products, record.results, record.items, record.result]
          .find(Array.isArray);
        if (Array.isArray(products)) observation.returnedCount = products.length;
        const meta = record.meta && typeof record.meta === 'object'
          ? record.meta as Record<string, unknown>
          : record;
        const total = Number(meta.totalResultsFound ?? meta.totalResults ?? meta.totalCount);
        if (Number.isFinite(total) && total > 0) observation.totalCount = total;
      } catch {
        observation.error = 'Could not parse JSON response body';
      }
    })());
  };
  const onRequestFailed = (request: import('playwright').Request) => {
    if (request.resourceType() !== 'xhr' && request.resourceType() !== 'fetch') return;
    const parsedUrl = new URL(request.url());
    const headers = request.headers();
    diagnostics?.apiResponses?.push({
      retailer: config.name,
      endpoint: `${parsedUrl.origin}${parsedUrl.pathname}`,
      requestMethod: request.method(),
      resourceType: request.resourceType(),
      requestHeaders: Object.fromEntries(
        ['accept', 'content-type', 'accept-language']
          .filter(name => headers[name])
          .map(name => [name, headers[name]])
      ),
      requestPayloadBytes: request.postData() ? new TextEncoder().encode(request.postData() || '').length : 0,
      error: request.failure()?.errorText || 'Request failed'
    });
  };

  try {
    page.on('response', onResponse);
    page.on('requestfailed', onRequestFailed);
    const candidates = new Map<string, CandidateProduct>();
    const visitedPages = new Set<string>();

    for (let pageNumber = 0; pageNumber < 10 && url && !visitedPages.has(url); pageNumber++) {
      visitedPages.add(url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 6000 });
      await page.waitForTimeout(900);

      let stableScrolls = 0;
      for (let scroll = 0; scroll < 6 && stableScrolls < 2; scroll++) {
        const pageCandidates = await page.evaluate(({ sel, baseUrl }: { sel: typeof config.selectors; baseUrl: string }) => {
          const cards = document.querySelectorAll(sel.productCard);
          const list: CandidateProduct[] = [];

          for (const card of cards) {
            const titleEl = card.querySelector(sel.title) as HTMLElement | null;
            const priceEl = card.querySelector(sel.price) as HTMLElement | null;
            const mfgEl = card.querySelector(sel.manufacturer) as HTMLElement | null;
            const upcEl = card.querySelector(sel.upc) as HTMLElement | null;
            const dimEl = card.querySelector(sel.dimensions) as HTMLElement | null;
            const descEl = card.querySelector(sel.description) as HTMLElement | null;
            const linkEl = (card.querySelector(sel.productLink) || card.closest('a')) as HTMLAnchorElement | null;
            const title = titleEl?.innerText.trim() || '';
            if (!title || title.includes('How We Use Cookies')) continue;

            let href = linkEl?.getAttribute('href') || '';
            if (href.startsWith('/')) href = baseUrl + href;
            list.push({
              title,
              priceText: priceEl?.getAttribute('data-price-amount') || priceEl?.innerText.trim() || '',
              mfg: mfgEl?.innerText.trim() || '',
              upc: upcEl?.innerText.trim() || '',
              dimensions: dimEl?.innerText.trim() || '',
              description: descEl?.innerText.trim() || '',
              url: href
            });
          }
          return list;
        }, { sel: config.selectors, baseUrl: config.baseUrl });

        const countBefore = candidates.size;
        for (const candidate of pageCandidates) {
          const key = normalizeUPC(candidate.upc) || normalizeMfg(candidate.mfg) ||
            candidate.url.toLowerCase() || candidate.title.toLowerCase();
          candidates.set(key, candidate);
        }
        stableScrolls = candidates.size === countBefore ? stableScrolls + 1 : 0;
        if (stableScrolls < 2) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(700);
        }
      }

      url = await page.evaluate(() => {
        const next = document.querySelector<HTMLAnchorElement>(
          'a[rel="next"], .pagination-next:not(.disabled) a, a[aria-label*="next" i]'
        );
        return next?.href || '';
      });
    }

    return [...candidates.values()];
  } catch (err: any) {
    diagnostics?.errors?.push(`${config.name} browser search: ${err.message}`);
    console.warn(`[Playwright Scraper] ${config.name} scrape warning for "${searchTerm}": ${err.message}`);
    return [];
  } finally {
    page.off('response', onResponse);
    page.off('requestfailed', onRequestFailed);
    await Promise.allSettled(observedResponseTasks);
  }
}

// ======================================================
// FIND BEST PRODUCT MATCH
// ======================================================

export async function findBestProductMatch(
  page: Page | null,
  config: CompetitorConfig,
  inventoryItem: InventoryItem,
  diagnostics?: {
    searchTerms?: string[];
    candidateCounts?: Array<{ term: string; count: number }>;
    errors?: string[];
    bestScore?: number;
    apiResponses?: ScraperApiObservation[];
  }
): Promise<ScoredMatch | null> {
  const allCandidates: CandidateProduct[] = [];
  const searchTerms = getSearchTerms(inventoryItem);
  const activeDiagnostics = diagnostics || {};
  activeDiagnostics.errors ??= [];
  activeDiagnostics.apiResponses ??= [];
  activeDiagnostics.candidateCounts ??= [];
  if (diagnostics) {
    diagnostics.searchTerms = searchTerms;
    diagnostics.candidateCounts = [];
    diagnostics.errors = [];
    diagnostics.apiResponses = [];
  }
  let searchPage = page;
  let attemptedTerms = 0;

  for (const term of searchTerms) {
    if (!searchPage && attemptedTerms >= 3) break;
    attemptedTerms++;
    try {
      const results = await scrapeSearchResults(searchPage, config, term, activeDiagnostics);
      activeDiagnostics.candidateCounts?.push({ term, count: results.length });
      if (searchPage && activeDiagnostics.errors?.some(error => error.startsWith(`${config.name} browser search:`))) {
        searchPage = null;
      }
      if (
        !searchPage &&
        activeDiagnostics.errors?.some(error =>
          error.startsWith(config.id === 1 ? 'Kent API' : 'Home Depot API')
        )
      ) {
        break;
      }
      if (results && results.length > 0) {
        allCandidates.push(...results);
        const normalizedUpc = normalizeUPC(inventoryItem.upc);
        const parsedAttrs = parseItemAttributes(inventoryItem.attributes);
        const normalizedMfg = normalizeMfg(
          inventoryItem.mfg || inventoryItem.supplier_sku || parsedAttrs.model || parsedAttrs.mpn
        );
        const hasExactIdentifier = results.some((candidate) => {
          const candidateUpc = normalizeUPC(candidate.upc);
          const candidateMfg = normalizeMfg(candidate.mfg || candidate.sku);
          return Boolean(
            (normalizedUpc && candidateUpc && normalizedUpc === candidateUpc) ||
            (normalizedMfg && candidateMfg && normalizedMfg === candidateMfg)
          );
        });
        const hasStrongPricedMatch = results.some((candidate) => {
          const price = extractPrice(candidate.priceText);
          return price != null && price > 0 &&
            calculateMatchScore(inventoryItem, candidate) >= Math.max(config.matchThreshold, 65);
        });
        if (hasExactIdentifier || hasStrongPricedMatch) break;
      }
    } catch (err: any) {
      console.error(`[Puppeteer Scraper] Term "${term}" error:`, err.message);
    }
  }

  if (!allCandidates.length) {
    if (diagnostics) diagnostics.bestScore = 0;
    return null;
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const uniqueCandidates = allCandidates.filter(c => {
    const key = normalizeUPC(c.upc) || normalizeMfg(c.sku) || c.url.toLowerCase() || c.title.toLowerCase();
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
      matchFound: score >= Math.max(config.matchThreshold, 55),
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
  if (diagnostics) diagnostics.bestScore = scored[0]?.score ?? 0;
  const best = scored.find(match => match.matchFound && match.price != null && match.price > 0) || scored[0];

  // If Kent candidate was found and has a URL, resolve live localized store price from the page
  // to avoid outdated Klevu search catalog pricing
  if (page && best?.matchFound && config.id === 1 && best.candidate.url &&
      !(best.candidate.storePriceVerified && best.price != null && best.price > 0)) {
    try {
      const liveKentPrice = await fetchLiveKentStorePrice(best.candidate.url);
      if (liveKentPrice != null && liveKentPrice > 0) {
        best.price = liveKentPrice;
        best.candidate.priceText = String(liveKentPrice);
      }
    } catch (priceErr) {}
  }

  // If Home Depot candidate was found and has a URL, resolve live localized store price from the page
  if (page && best?.matchFound && config.id === 2 && best.candidate.url &&
      !(best.candidate.storePriceVerified && best.price != null && best.price > 0)) {
    try {
      const liveHdPrice = await fetchLiveHomeDepotStorePrice(best.candidate.url);
      if (liveHdPrice != null && liveHdPrice > 0) {
        best.price = liveHdPrice;
        best.candidate.priceText = String(liveHdPrice);
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
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-service-autorun',
        '--disable-http2'
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
        console.warn(`[Playwright Scraper] Browser launch failed: ${installErr.message}`);
        throw new Error(`Playwright initialization failed: ${err.message}`);
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
 * Creates an isolated, human-like browser page to bypass competitor bot/Cloudflare detection
 */
export async function createOptimizedPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-CA',
    timezoneId: 'America/Halifax',
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
      'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });

  // Seed store cookies for Halifax Bayers Lake and Halifax Lacewood.
  await context.addCookies([
    { name: 'store', value: 'bayers_lake', domain: '.kent.ca', path: '/' },
    { name: 'store', value: 'bayers_lake', domain: 'kent.ca', path: '/' },
    { name: 'store', value: 'bayers_lake', domain: 'www.kent.ca', path: '/' },
    { name: 'selected_store', value: KENT_STORE_ID, domain: '.kent.ca', path: '/' },
    { name: 'selected_store', value: KENT_STORE_ID, domain: 'kent.ca', path: '/' },
    { name: 'selected_store', value: KENT_STORE_ID, domain: 'www.kent.ca', path: '/' },
    { name: 'store_code', value: KENT_STORE_ID, domain: '.kent.ca', path: '/' },
    { name: 'store_code', value: KENT_STORE_ID, domain: 'kent.ca', path: '/' },
    { name: 'store_code', value: KENT_STORE_ID, domain: 'www.kent.ca', path: '/' },
    { name: 'store', value: '7126', domain: '.homedepot.ca', path: '/' },
    { name: 'store', value: '7126', domain: 'homedepot.ca', path: '/' },
    { name: 'store', value: '7126', domain: 'www.homedepot.ca', path: '/' },
    { name: 'selected_store', value: '7126', domain: '.homedepot.ca', path: '/' },
    { name: 'selected_store', value: '7126', domain: 'homedepot.ca', path: '/' },
    { name: 'selected_store', value: '7126', domain: 'www.homedepot.ca', path: '/' },
    { name: 'province', value: 'NS', domain: '.homedepot.ca', path: '/' },
    { name: 'province', value: 'NS', domain: 'homedepot.ca', path: '/' }
  ]);

  const page = await context.newPage();

  // Override navigator properties and seed localStorage for Halifax store location
  await page.addInitScript((storeId: string) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (navigator as any).languages = ['en-CA', 'en-US', 'en'];
    (window as any).chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

    try {
      localStorage.setItem('currentStore', JSON.stringify({ id: storeId, code: storeId, name: 'Bayers Lake', city: 'Halifax' }));
      localStorage.setItem('selectedStore', storeId);
      localStorage.setItem('storeId', storeId);
      localStorage.setItem('kent_store', 'bayers_lake');
      localStorage.setItem('hd_store_id', '7126');
      localStorage.setItem('homedepot_store', '7126');
    } catch (e) {}
  }, KENT_STORE_ID);

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

/**
 * Retail Price Comparison Agent matching user specifications across RONA, Kent, and Home Depot.
 */
export async function runRetailPriceComparison(searchTerm: string, itemDetails: Partial<InventoryItem> = {}) {
  const timestamp = new Date().toISOString();
  if (!searchTerm || !searchTerm.trim()) {
    return {
      matchesFound: false,
      reason: "Invalid search term provided.",
      timestamp
    };
  }

  const cleanTerm = searchTerm.trim();
  const inventoryItem: InventoryItem = {
    ...itemDetails,
    sku: itemDetails.sku || 'QUERY-' + Date.now(),
    name: itemDetails.name || cleanTerm,
    description: itemDetails.description || cleanTerm,
  };

  const competitorsList = [COMPETITORS.homeDepot, COMPETITORS.rona, COMPETITORS.kent];
  const allResults: any[] = [];
  const competitorDiagnostics: Array<{
    store: string;
    searchTerms: string[];
    candidateCounts: Array<{ term: string; count: number }>;
    errors: string[];
    bestScore: number;
    apiResponses: ScraperApiObservation[];
  }> = [];
  let browser: Browser | null = null;

  try {
    let page: Page | null = null;
    if (!process.env.VERCEL || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROMIUM_PATH) {
      try {
        browser = await getPlaywrightBrowser();
        page = await createOptimizedPage(browser);
      } catch (browserErr: any) {
        console.warn('[Price Comparison] Browser unavailable; trying retailer search APIs:', browserErr.message);
      }
    }

    const scrapeCompetitor = async (comp: CompetitorConfig) => {
      const searchDiagnostics: {
        searchTerms?: string[];
        candidateCounts?: Array<{ term: string; count: number }>;
        errors?: string[];
        bestScore?: number;
        apiResponses?: ScraperApiObservation[];
      } = {};
      try {
        const bestMatch = await findBestProductMatch(page, comp, inventoryItem, searchDiagnostics);
        competitorDiagnostics.push({
          store: comp.name,
          searchTerms: searchDiagnostics.searchTerms || [],
          candidateCounts: searchDiagnostics.candidateCounts || [],
          errors: searchDiagnostics.errors || [],
          bestScore: searchDiagnostics.bestScore || 0,
          apiResponses: searchDiagnostics.apiResponses || [],
        });
        if (bestMatch?.matchFound && bestMatch.price != null && bestMatch.price > 0) {
          allResults.push({
            store: comp.name === 'KENT Building Supplies' ? 'Kent' : (comp.name === 'The Home Depot' ? 'Home Depot' : 'RONA'),
            productName: bestMatch.candidate.title,
            brand: bestMatch.candidate.brand || extractBrand(inventoryItem, bestMatch.candidate.title) || undefined,
            modelNumber: bestMatch.candidate.mfg || bestMatch.candidate.sku || undefined,
            price: bestMatch.price,
            salePrice: bestMatch.price,
            availability: bestMatch.candidate.availability || 'UNKNOWN',
            url: bestMatch.candidate.url || comp.baseUrl,
            matchConfidence: bestMatch.confidenceLevel || 'LOW',
            matchMethod: bestMatch.matchMethod || 'LIVE_SEARCH',
          });
        }
      } catch (compErr: any) {
        competitorDiagnostics.push({
          store: comp.name,
          searchTerms: searchDiagnostics.searchTerms || [],
          candidateCounts: searchDiagnostics.candidateCounts || [],
          errors: searchDiagnostics.errors || [],
          bestScore: searchDiagnostics.bestScore || 0,
          apiResponses: searchDiagnostics.apiResponses || [],
        });
        console.error(`[Price Comparison] Live scrape error for ${comp.name}:`, compErr.message);
      }
    };

    if (page) {
      for (const comp of competitorsList) {
        await scrapeCompetitor(comp);
      }
    } else {
      await Promise.all(competitorsList.map(scrapeCompetitor));
    }

    if (page) {
      try { await page.close(); } catch (e) {}
    }
  } catch (err: any) {
    console.error('[Price Comparison] Browser initialization error:', err.message);
  }

  if (allResults.length === 0) {
    return {
      matchesFound: false,
      reason: "Live scraping returned no matching competitor products for this term. No fallback generated.",
      competitorDiagnostics,
      timestamp
    };
  }

  // Rank results from lowest price to highest price
  allResults.sort((a, b) => a.price - b.price);

  const lowestPrice = allResults[0].price;
  const highestPrice = allResults[allResults.length - 1].price;
  const difference = Math.round((highestPrice - lowestPrice) * 100) / 100;
  const savingsPercent = lowestPrice > 0 ? Math.round(((highestPrice - lowestPrice) / highestPrice) * 10000) / 100 : 0;

  return {
    searchTerm: cleanTerm,
    matchesFound: true,
    lowestPriceStore: allResults[0].store,
    lowestPrice,
    highestPrice,
    difference,
    savingsPercent,
    timestamp,
    competitorDiagnostics,
    results: allResults.map(r => ({
      store: r.store,
      productName: r.productName,
      modelNumber: r.modelNumber || null,
      price: r.price,
      url: r.url,
      matchConfidence: r.matchConfidence,
      matchMethod: r.matchMethod,
      availability: r.availability,
    }))
  };
}
