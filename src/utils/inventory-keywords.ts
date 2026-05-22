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

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with',
]);

const SYNONYM_MAP: Record<string, string[]> = {
  drill: ['power drill', 'cordless drill', 'driver drill'],
  saw: ['power saw', 'cutting tool'],
  screw: ['fastener', 'screws'],
  bolt: ['fastener', 'bolts'],
  paint: ['coating', 'finish'],
  plywood: ['sheet wood', 'wood panel'],
  lumber: ['timber', 'wood'],
  lithium: ['li-ion', 'lithium-ion'],
  battery: ['rechargeable battery', 'power cell'],
};

function getSynonymsForToken(token: string): string[] {
  if (!Object.prototype.hasOwnProperty.call(SYNONYM_MAP, token)) {
    return [];
  }

  const raw = (SYNONYM_MAP as Record<string, unknown>)[token];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((value) => (typeof value === 'string' ? normalizeToken(value) : ''))
    .filter(Boolean);
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
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
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
  }

  for (const token of generated.all) {
    expanded.add(sanitizeSearchToken(token));
  }

  const normalizedQuery = sanitizeSearchToken(query);
  if (normalizedQuery.length >= 2 && normalizedQuery.split(' ').length <= 6) {
    expanded.add(normalizedQuery);
  }

  return Array.from(expanded)
    .filter((t) => t.length >= 2)
    .slice(0, 16);
}

export function buildInventoryOrSearchClause(terms: string[]): string {
  const fields = ['name', 'sku', 'description', 'category'];
  const clauses: string[] = [];

  for (const term of terms) {
    for (const field of fields) {
      clauses.push(`${field}.ilike.%${term}%`);
    }
  }

  return clauses.join(',');
}
