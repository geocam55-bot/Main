// Precision building dimensions and product resolver utilities
export interface BuildingDimensions {
  raw: string;
  crossSection: string | null;       // e.g. "2x4", "2x6", "2x8", "2x10", "2x12", "1x4", "4x4"
  thickness: string | null;          // e.g. "2", "1", "1/2", "5/8", "3/4", "7/16"
  width: string | null;              // e.g. "4", "6", "8", "10", "12"
  lengthFt: string | null;           // e.g. "8", "9", "10", "12", "14", "16", "18", "20"
  sheetSize: string | null;          // e.g. "4x8", "4x9", "4x10", "4x12"
  studLength: string | null;         // e.g. "92-5/8", "104-5/8", "116-5/8"
  signature: string | null;          // canonical signature: "2x4x10", "2x6x16", "1/2-4x8", "5/8-4x8"
  speciesOrType: string | null;      // e.g. "spf", "spruce", "fir", "drywall", "plywood", "osb"
}

export const GENERIC_CATEGORY_KEYWORDS = [
  'frame materials',
  'framing materials',
  'frame material',
  'framing material',
  'building materials',
  'building material',
  'building products',
  'building product',
  'framing',
  'materials',
  'lumber',
  'sheet goods',
  'accessories for',
  'pipes, fittings',
  'hooks, squares',
  'insulating materials',
  'paint types',
  'lawn, garden',
  'lawn equipment',
  'gutters',
  'tree, plant',
  'electric heating',
  'tools accesso',
  'repair parts',
  'electric acc.',
  'coverings',
  'cables and accesso',
  'furniture, bbq',
  'electrical appliances',
  'wall and floor',
  'portable electric',
  'chains, steel',
  'motorized lawn',
  'fasteners',
  'hand tools',
  'power tools',
  'plumbing',
  'lighting',
  'seasonal',
  'hardware',
  'outlets,boxes',
  'fuses,outlets',
  'ventilation',
  'heating and cooling',
  'home decor',
  'outdoor living',
  'tools & hardware',
  'electrical & lighting',
  'paint & decor'
];

/**
 * Returns true if text is purely a generic category/department header (e.g. "FRAME MATERIALS")
 * rather than a specific product description or name.
 */
export function isGenericCategoryName(text: string = ''): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  if (['', 'undefined', 'null', 'product', 'item', 'item name', 'materials', 'general', 'misc', 'miscellaneous'].includes(t)) {
    return true;
  }
  return GENERIC_CATEGORY_KEYWORDS.some(k => t === k || t.startsWith(k + ' ') || t.endsWith(' ' + k) || (k.length > 6 && t.includes(k)));
}

/**
 * Precision dimension extractor for building materials, lumber, and sheet goods.
 */
export function extractBuildingDimensions(text: string): BuildingDimensions {
  const raw = String(text || '').trim();
  if (!raw) {
    return { raw: '', crossSection: null, thickness: null, width: null, lengthFt: null, sheetSize: null, studLength: null, signature: null, speciesOrType: null };
  }

  let s = raw.toLowerCase()
    .replace(/[\u00d7]/g, 'x')
    .replace(/½/g, '1/2')
    .replace(/¾/g, '3/4')
    .replace(/⅝/g, '5/8')
    .replace(/⅜/g, '3/8')
    .replace(/¼/g, '1/4');

  // Unify units
  s = s.replace(/\b(\d+(?:\.\d+)?|\d+\/\d+)\s*(?:in\.?|inch(?:es)?|["”])\s*(?:x|-)\s*(\d+(?:\.\d+)?|\d+\/\d+)\s*(?:in\.?|inch(?:es)?|["”])?/gi, '$1 x $2');
  s = s.replace(/\b(\d+)\s*(?:ft\.?|feet|foot|['’])\s*(?:x|-)\s*(\d+)\s*(?:ft\.?|feet|foot|['’])?/gi, '$1 x $2');

  let crossSection: string | null = null;
  let thickness: string | null = null;
  let width: string | null = null;
  let lengthFt: string | null = null;
  let sheetSize: string | null = null;
  let studLength: string | null = null;
  let speciesOrType: string | null = null;

  // Detect species or product type
  if (/\b(?:spf|spruce|pine|fir)\b/i.test(s)) speciesOrType = 'spruce';
  else if (/\b(?:drywall|sheetrock|gypsum)\b/i.test(s)) speciesOrType = 'drywall';
  else if (/\b(?:plywood|sheathing)\b/i.test(s)) speciesOrType = 'plywood';
  else if (/\b(?:osb|waferboard)\b/i.test(s)) speciesOrType = 'osb';
  else if (/\b(?:pressure treated|pt)\b/i.test(s)) speciesOrType = 'treated';
  else if (/\b(?:cedar)\b/i.test(s)) speciesOrType = 'cedar';

  // Stud length e.g. 92-5/8, 104-5/8, 116-5/8
  const studMatch = s.match(/\b(92\s*[-/]?\s*5\/8|104\s*[-/]?\s*5\/8|116\s*[-/]?\s*5\/8)\b/i);
  if (studMatch) {
    studLength = studMatch[1].replace(/\s+/g, '');
  }

  // Sheet goods: 4x8, 4x9, 4x10, 4x12
  const sheetMatch = s.match(/\b4\s*x\s*(8|9|10|12)\b/i);
  if (sheetMatch) {
    sheetSize = `4x${sheetMatch[1]}`;
    const sheetThickMatch = s.match(/\b(1\/4|3\/8|7\/16|1\/2|5\/8|3\/4)\b/i) ||
                            s.match(/\b(0\.25|0\.375|0\.4375|0\.5|0\.625|0\.75)\b/i);
    if (sheetThickMatch) {
      thickness = sheetThickMatch[1];
      if (thickness === '0.5') thickness = '1/2';
      if (thickness === '0.625') thickness = '5/8';
      if (thickness === '0.75') thickness = '3/4';
    }
  }

  // 3-part lumber dimensions: 2x4x8, 2x4x10, 2x4x12, 2x4x16, 2x6x12, 2x4-10, 2x4-8, 2x4-12, 2x4 10', 2 x 4 x 10
  const threePartMatch = s.match(/\b([1246])\s*x\s*([23468]|10|12)\s*(?:x|-|\s)\s*(\d{1,2})\s*(?:ft|['’]|\b)/i);
  if (threePartMatch) {
    thickness = threePartMatch[1];
    width = threePartMatch[2];
    crossSection = `${thickness}x${width}`;
    const l = parseInt(threePartMatch[3], 10);
    if (l >= 6 && l <= 24) {
      lengthFt = String(l);
    }
  }

  // 2-part cross section: 2x4, 2x6, 2x8, 2x10, 2x12, 1x4, 1x6, 4x4, 6x6
  if (!crossSection) {
    const twoPartMatch = s.match(/\b([1246])\s*x\s*([23468]|10|12)\b/i);
    if (twoPartMatch) {
      thickness = twoPartMatch[1];
      width = twoPartMatch[2];
      crossSection = `${thickness}x${width}`;
    }
  }

  // Explicit length (8', 10', 12', 14', 16', 8ft, 10ft, 12ft, 16ft, -8', -10', -12', -8, -10, -12)
  if (!lengthFt && !sheetSize) {
    const explicitLenMatch = s.match(/\b(8|9|10|12|14|16|18|20|24)\s*(?:ft|['’]|foot|feet|-ft)\b/i) ||
                             s.match(/(?:x|-)\s*(8|9|10|12|14|16|18|20|24)\s*(?:['’]|ft|\b)/i);
    if (explicitLenMatch) {
      lengthFt = explicitLenMatch[1];
    }
  }

  // Canonical dimension signature
  let signature: string | null = null;
  if (crossSection && lengthFt) {
    signature = `${crossSection}x${lengthFt}`;
  } else if (crossSection && studLength) {
    signature = `${crossSection}-${studLength}`;
  } else if (sheetSize && thickness) {
    signature = `${thickness}-${sheetSize}`;
  } else if (sheetSize) {
    signature = sheetSize;
  } else if (crossSection) {
    signature = crossSection;
  }

  return { raw, crossSection, thickness, width, lengthFt, sheetSize, studLength, signature, speciesOrType };
}

/**
 * Intelligent title & description resolver.
 * Protects against generic category headers (e.g. "FRAME MATERIALS", "BUILDING MATERIALS")
 * and ensures the product's actual description (dimensions, species, specs) is preserved.
 */
export function resolveInventoryTitles(rawName: string = '', rawDescription: string = '', category: string = '') {
  let parsedDescription = rawDescription ? String(rawDescription).trim() : '';

  // Strip embedded <!--metadata:...--> tags if present
  const markerStart = "<!--metadata:";
  const markerEnd = "-->";
  const startIndex = parsedDescription.lastIndexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = parsedDescription.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      parsedDescription = parsedDescription.substring(0, startIndex).trim();
    }
  }

  const nameStr = rawName ? String(rawName).trim() : '';
  const descStr = parsedDescription;

  const isNameGeneric = isGenericCategoryName(nameStr) || (category && nameStr.toLowerCase() === category.trim().toLowerCase());
  const isDescGeneric = isGenericCategoryName(descStr) || (category && descStr.toLowerCase() === category.trim().toLowerCase());

  let finalTitle = nameStr;
  let finalDescription = descStr;

  if (isNameGeneric && !isDescGeneric && descStr) {
    // rawName was "FRAME MATERIALS" (category/item name), descStr is the actual product (e.g. "2x4-10' SPF #2&BTR")
    finalTitle = descStr;
    finalDescription = descStr; // CRITICAL: NEVER overwrite description with "FRAME MATERIALS"
  } else if (!isNameGeneric && isDescGeneric && nameStr) {
    // rawName has the product (e.g. "2x4-10' SPF #2&BTR"), descStr was "FRAME MATERIALS"
    finalTitle = nameStr;
    finalDescription = nameStr; // CRITICAL: NEVER preserve "FRAME MATERIALS" as description
  } else if (isNameGeneric && isDescGeneric) {
    finalTitle = nameStr || descStr || 'Product';
    finalDescription = '';
  } else if (descStr && descStr !== nameStr) {
    const descDims = extractBuildingDimensions(descStr);
    const nameDims = extractBuildingDimensions(nameStr);
    if (descDims.signature && !nameDims.signature) {
      finalTitle = descStr;
      finalDescription = descStr;
    } else {
      finalTitle = nameStr || descStr;
      finalDescription = descStr;
    }
  }

  return {
    title: finalTitle || 'Product',
    description: finalDescription || finalTitle || '',
  };
}

/**
 * Extracts the real, specific product query for competitor lookups.
 * Discards generic category headers like "FRAME MATERIALS" in favor of the product's actual description.
 */
export function extractRealProductSearchTerm(item: {
  description?: string;
  name?: string;
  productName?: string;
  title?: string;
  category?: string;
  sku?: string;
  mfgPartNumber?: string;
  searchQuery?: string;
}): string {
  const rawDesc = String(item.description || '').trim();
  const rawName = String(item.productName || item.name || item.title || '').trim();
  const rawCustom = String(item.searchQuery || '').trim();

  // Test for dimension signatures first (e.g. "2x4-10' SPF")
  const candidates = [rawDesc, rawCustom, rawName].filter(Boolean);
  for (const cand of candidates) {
    if (isGenericCategoryName(cand)) continue;
    const dims = extractBuildingDimensions(cand);
    if (dims.signature) {
      return cand;
    }
  }

  // Next, pick any candidate that is NOT a generic category name
  for (const cand of candidates) {
    if (!isGenericCategoryName(cand)) {
      return cand;
    }
  }

  if (item.mfgPartNumber && !isGenericCategoryName(item.mfgPartNumber)) return item.mfgPartNumber;
  if (item.sku && !isGenericCategoryName(item.sku)) return item.sku;

  return candidates[0] || 'Lumber';
}

/**
 * Builds a direct, accurate search URL for Kent Building Supplies or The Home Depot.
 * Uses exact product dimensions (e.g., "2x4 10ft") or the real description instead of generic category headers.
 */
export function buildCompetitorSearchUrl(competitor: 'kent' | 'homeDepot', term: string): string {
  const safeTerm = isGenericCategoryName(term) ? '' : term;
  const dims = extractBuildingDimensions(safeTerm);
  
  let query = safeTerm;
  if (dims.crossSection && dims.lengthFt) {
    query = `${dims.crossSection} ${dims.lengthFt}ft`;
  } else if (dims.crossSection && dims.studLength) {
    query = `${dims.crossSection} ${dims.studLength}`;
  } else if (dims.sheetSize && dims.thickness) {
    query = `${dims.speciesOrType || 'drywall'} ${dims.thickness} ${dims.sheetSize}`;
  } else if (dims.signature) {
    query = dims.signature;
  }

  if (!query || isGenericCategoryName(query)) {
    query = safeTerm || 'Lumber';
  }

  if (competitor === 'kent') {
    return `https://kent.ca/search/?q=${encodeURIComponent(query)}`;
  } else {
    return `https://www.homedepot.ca/search?q=${encodeURIComponent(query)}`;
  }
}
