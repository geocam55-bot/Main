export interface InventoryKeywordInput {
  productName?: string;
  productDescription?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  modelNumber?: string;
  supplierName?: string;
  existingTags?: string[] | string | Record<string, unknown> | null;
}

export interface GeneratedInventoryKeywords {
  core: string[];
  attributes: string[];
  useCase: string[];
  variants: string[];
  all: string[];
}

export const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with', 'do', 'you', 'have', 'show', 'me', 'please', 'i', 'want', 'can', 'item', 'items', 'find'
]);

const SYNONYM_MAP: Record<string, string[]> = {
  pt: ['treated', 'pressure-treated', 'pressure treated', 'outdoor', 'exterior'],
  treated: ['pt', 'pressure-treated', 'pressure treated', 'outdoor', 'exterior'],
  spf: ['spruce', 'spruce pine fir', 'pine', 'fir', 'kiln-dried spf'],
  spruce: ['spf', 'lumber', 'framing', 'wood', 'building materials'],
  pine: ['spf', 'lumber', 'framing', 'wood'],
  fir: ['spf', 'douglas fir', 'lumber', 'framing'],
  stud: ['studs', 'framing', '2x4', 'frame materials', 'lumber'],
  studs: ['stud', 'framing', '2x4', 'frame materials', 'lumber'],
  framing: ['frame materials', 'framing materials', 'lumber', 'stud', 'spf'],
  lumber: ['timber', 'wood', 'framing', 'frame materials', 'building materials'],
  timber: ['lumber', 'framing', 'frame materials', 'wood'],
  wood: ['lumber', 'timber', 'framing'],
  decking: ['deck', 'board', 'outdoor'],
  deck: ['decking', 'board'],
  screws: ['screw', 'fastener', 'fasteners', 'hardware', 'nails', 'bolts'],
  screw: ['screws', 'fastener', 'fasteners', 'hardware', 'nails', 'bolts'],
  nails: ['nail', 'fastener', 'fasteners', 'hardware'],
  nail: ['nails', 'fastener', 'fasteners', 'hardware'],
  bolts: ['bolt', 'fastener', 'fasteners', 'hardware'],
  bolt: ['bolts', 'fastener', 'fasteners', 'hardware'],
  fastener: ['fasteners', 'screws', 'nails', 'bolts', 'hardware'],
  fasteners: ['fastener', 'screws', 'nails', 'bolts', 'hardware'],
  posts: ['post', 'timber', '4x4'],
  post: ['posts', 'timber', '4x4'],
  joist: ['joists', 'rim', 'framing'],
  joists: ['joist', 'rim', 'framing'],
  beam: ['beams', 'ledger', 'framing'],
  beams: ['beam', 'ledger', 'framing'],
  railing: ['picket', 'pickets', 'baluster', 'balusters', 'rail', 'rails'],
  picket: ['pickets', 'railing', 'baluster'],
  pickets: ['picket', 'railing', 'balusters'],
  baluster: ['balusters', 'picket', 'pickets'],
  balusters: ['baluster', 'picket', 'pickets'],
  drill: ['driver', 'power tool', 'portable electric', 'tools', 'cordless'],
  driver: ['drill', 'impact', 'power tool', 'portable electric', 'tools'],
  saw: ['power saw', 'circular saw', 'miter', 'portable electric', 'tools'],
  paint: ['coating', 'primer', 'roller', 'applicator', 'sundries', 'paint types'],
  primer: ['paint', 'coating', 'sundries'],
  drywall: ['sheetrock', 'gypsum', 'wallboard', 'finishing materials', 'building materials'],
  sheetrock: ['drywall', 'gypsum', 'wallboard', 'finishing materials'],
  plywood: ['sheathing', 'subfloor', 'wood panel', 'building materials'],
  osb: ['waferboard', 'sheathing', 'subfloor', 'building materials'],
  insulation: ['insulating', 'mineral wool', 'fiberglass', 'weather barrier'],
  roofing: ['shingles', 'exterior cladding', 'underlayment', 'roofing and exterior'],
  siding: ['exterior cladding', 'cladding', 'building materials'],
  lithium: ['li-ion', 'lithium-ion', 'battery'],
  battery: ['rechargeable battery', 'power cell', 'lithium'],
};

/**
 * Dimension parser for human lumber and building material terms:
 * Extracts nominal cross sections (2x4, 2x6, 4x8), lengths, and domain synonyms
 */
export function extractDimensionSynonyms(token: string): string[] {
  const t = token.toLowerCase().trim();
  const synonyms: string[] = [];

  // 1. 3-part lumber dimensions: e.g. 2x4x8, 2x4-8, 2x4 8ft, 2x4 8', 2x6x10, 2x6x12, 2x6x16, 2x8x12, 2x10x16, 1x4x8, 4x4x8
  const m3 = t.match(/^(\d+)x(\d+)(?:x|-)(\d{1,2})(?:ft|['’])?$/);
  if (m3) {
    const [, thick, width, len] = m3;
    const cross = `${thick}x${width}`;
    synonyms.push(cross);
    synonyms.push(`${cross}x${len}`);
    synonyms.push(`${cross}-${len}`);
    synonyms.push(`${len}ft`);
    synonyms.push('framing');
    synonyms.push('lumber');
    synonyms.push('stud');
    synonyms.push('frame materials');
    synonyms.push('building materials');
    return synonyms;
  }

  // 2. 2-part cross-section or sheet goods: e.g. 2x4, 2x6, 2x8, 2x10, 2x12, 1x4, 4x4, 4x8
  const m2 = t.match(/^(\d+)x(\d+)$/);
  if (m2) {
    const [, d1, d2] = m2;
    if ((d1 === '4' && d2 === '8') || (d1 === '4' && d2 === '9') || (d1 === '4' && d2 === '10')) {
      synonyms.push('plywood', 'drywall', 'sheetrock', 'osb', 'sheathing', 'panel', 'board');
    } else {
      synonyms.push('framing', 'lumber', 'stud', 'frame materials', 'building materials');
    }
    return synonyms;
  }

  // 3. Length tokens: e.g. 8ft, 8', 10ft, 10', 12ft, 12', 16ft, 16'
  const mLen = t.match(/^(\d{1,2})(?:ft|['’])$/);
  if (mLen) {
    synonyms.push(mLen[1]);
    synonyms.push(`${mLen[1]}ft`);
    return synonyms;
  }

  return synonyms;
}

function getSynonymsForToken(token: string): string[] {
  const dimSyns = extractDimensionSynonyms(token);

  if (!Object.prototype.hasOwnProperty.call(SYNONYM_MAP, token)) {
    return dimSyns;
  }

  const raw = (SYNONYM_MAP as Record<string, unknown>)[token];
  if (!Array.isArray(raw)) {
    return dimSyns;
  }

  const mapped = raw
    .map((value) => (typeof value === 'string' ? normalizeToken(value) : ''))
    .filter(Boolean);

  return Array.from(new Set([...dimSyns, ...mapped]));
}

const USE_CASE_TERMS: Array<[RegExp, string[]]> = [
  [/outdoor|exterior|weather/i, ['outdoor', 'exterior', 'jobsite']],
  [/interior|indoor/i, ['interior', 'indoor', 'home']],
  [/wood|lumber|plywood/i, ['woodworking', 'carpentry', 'framing']],
  [/electrical|voltage|amp|battery/i, ['electrical', 'installation', 'repair']],
  [/paint|coating|primer/i, ['painting', 'finishing', 'renovation']],
];

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9\-./]/g, '').trim();
}

function stemToken(token: string): string {
  if (token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.endsWith('es')) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function pluralizeToken(token: string): string {
  if (token.endsWith('y') && token.length > 2) return `${token.slice(0, -1)}ies`;
  if (token.endsWith('s')) return token;
  return `${token}s`;
}

function safeSplit(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length >= 1 && !STOP_WORDS.has(t));
}

function normalizeTextValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function normalizeExistingTags(tags: InventoryKeywordInput['existingTags']): string[] {
  const normalized = new Set<string>();

  const visit = (value: unknown): void => {
    if (!value) return;

    if (typeof value === 'string') {
      for (const token of safeSplit(value)) {
        normalized.add(token);
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }
      return;
    }

    if (typeof value === 'object') {
      for (const entry of Object.values(value as Record<string, unknown>)) {
        visit(entry);
      }
    }
  };

  visit(tags);
  return Array.from(normalized);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function deriveVariants(tokens: string[]): string[] {
  const variants = new Set<string>();
  for (const token of tokens) {
    const stem = stemToken(token);
    const plural = pluralizeToken(stem);

    variants.add(token);
    variants.add(stem);
    variants.add(plural);

    if (token.includes('-')) {
      variants.add(token.replace(/-/g, ' '));
      variants.add(token.replace(/-/g, ''));
    }
    if (token.includes('/')) {
      variants.add(token.replace(/\//g, ' '));
    }
  }

  return uniqueSorted(variants);
}

export function generateInventoryKeywords(input: InventoryKeywordInput): GeneratedInventoryKeywords {
  const normalizedExistingTags = normalizeExistingTags(input.existingTags);

  const textParts = [
    normalizeTextValue(input.productName),
    normalizeTextValue(input.productDescription),
    normalizeTextValue(input.category),
    normalizeTextValue(input.subcategory),
    normalizeTextValue(input.brand),
    normalizeTextValue(input.sku),
    normalizeTextValue(input.modelNumber),
    normalizeTextValue(input.supplierName),
    ...normalizedExistingTags,
  ]
    .join(' ')
    .trim();

  const tokens = safeSplit(textParts);

  const core = new Set<string>();
  const attributes = new Set<string>();
  const useCase = new Set<string>();

  for (const token of tokens) {
    // Treat alphanumeric + unit-like tokens as attribute terms.
    if (/\d/.test(token) || /v|volt|amp|mm|cm|in|ft|oz|lb/.test(token)) {
      attributes.add(token);
      for (const syn of extractDimensionSynonyms(token)) {
        core.add(syn);
      }
      continue;
    }

    core.add(token);

    const synonyms = getSynonymsForToken(token);
    for (const synonym of synonyms) {
      core.add(synonym);
    }
  }

  const combinedText = textParts.toLowerCase();
  for (const [pattern, terms] of USE_CASE_TERMS) {
    if (pattern.test(combinedText)) {
      for (const term of terms) {
        useCase.add(term);
      }
    }
  }

  const variants = deriveVariants([...core, ...attributes, ...normalizedExistingTags]);
  const all = uniqueSorted([...core, ...attributes, ...useCase, ...variants]);

  return {
    core: uniqueSorted(core),
    attributes: uniqueSorted(attributes),
    useCase: uniqueSorted(useCase),
    variants,
    all,
  };
}

function sanitizeSearchToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function expandInventorySearchTerms(query: string): string[] {
  const baseTokens = safeSplit(query);
  const generated = generateInventoryKeywords({ productName: query, productDescription: query });

  const expanded = new Set<string>();
  for (const token of baseTokens) {
    expanded.add(sanitizeSearchToken(token));
    for (const syn of extractDimensionSynonyms(token)) {
      expanded.add(sanitizeSearchToken(syn));
    }
  }

  for (const token of generated.all) {
    expanded.add(sanitizeSearchToken(token));
  }

  const normalizedQuery = sanitizeSearchToken(query);
  if (normalizedQuery.length >= 1 && normalizedQuery.split(' ').length <= 6) {
    expanded.add(normalizedQuery);
    for (const syn of extractDimensionSynonyms(normalizedQuery)) {
      expanded.add(sanitizeSearchToken(syn));
    }
  }

  return Array.from(expanded)
    .filter((t) => t.length >= 1 && !STOP_WORDS.has(t))
    .slice(0, 5);
}

export const INVENTORY_SEARCH_TEXT_FIELDS = [
  'name',
  'sku',
  'description',
  'short_description',
  'brand',
  'category',
  'supplier',
  'supplier_sku',
  'upc'
];

export const INVENTORY_SEARCH_ATTRIBUTE_FIELDS = [
  'attributes->>Key Specification',
  'attributes->>Primary Application'
];

/**
 * Builds PostgREST ILIKE sub-clauses for a single term across all core text fields,
 * enriched attributes, and the search_keywords array.
 */
export function buildTermSubClauses(term: string): string[] {
  const clean = sanitizeSearchToken(term);
  if (!clean) return [];

  const clauses: string[] = [];

  for (const field of INVENTORY_SEARCH_TEXT_FIELDS) {
    clauses.push(`${field}.ilike.%${clean}%`);
  }

  for (const attr of INVENTORY_SEARCH_ATTRIBUTE_FIELDS) {
    clauses.push(`${attr}.ilike.%${clean}%`);
  }

  if (/^[a-z0-9-]+$/i.test(clean)) {
    clauses.push(`search_keywords.cs.{${clean.toLowerCase()}}`);
  }

  return clauses;
}

export function buildInventoryOrSearchClause(terms: string[]): string {
  const clauses: string[] = [];

  for (const term of terms) {
    const subClauses = buildTermSubClauses(term);
    clauses.push(...subClauses);
  }

  return clauses.join(',');
}

export function buildInventoryAndSearchClause(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return '';

  const sanitized = sanitizeSearchToken(trimmed);
  const tokens = safeSplit(trimmed);

  // If query is short or dimension like "2 x" or "2x4"
  if (tokens.length === 0) {
    if (sanitized) {
      const subClauses = buildTermSubClauses(sanitized);
      return subClauses.join(',');
    }
    return '';
  }

  const orClauses: string[] = [];

  for (const token of tokens) {
    const expanded = expandInventorySearchTerms(token);
    const subClauses: string[] = [];
    for (const term of expanded) {
      subClauses.push(...buildTermSubClauses(term));
    }
    if (subClauses.length > 0) {
      orClauses.push(`or(${subClauses.join(',')})`);
    }
  }

  if (orClauses.length === 0) {
    if (sanitized) {
      return buildTermSubClauses(sanitized).join(',');
    }
    return '';
  }
  if (orClauses.length === 1) {
    const rawInner = orClauses[0].slice(3, -1); // remove "or(" and ")"
    return rawInner;
  }
  return `and(${orClauses.join(',')})`;
}

/**
 * Builds a relaxed fallback clause (OR disjunction of high-signal terms across all fields)
 * used when a strict multi-word AND query yields 0 results.
 */
export function buildInventoryRelaxedSearchClause(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return '';

  const tokens = safeSplit(trimmed);
  if (tokens.length <= 1) {
    return buildInventoryAndSearchClause(query);
  }

  const allSubClauses: string[] = [];
  for (const token of tokens) {
    const expanded = expandInventorySearchTerms(token);
    for (const term of expanded) {
      allSubClauses.push(...buildTermSubClauses(term));
    }
  }

  const unique = Array.from(new Set(allSubClauses));
  return unique.join(',');
}

