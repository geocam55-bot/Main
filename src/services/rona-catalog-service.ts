import fs from 'fs';
import path from 'path';

export interface RonaProductInfo {
  found: boolean;
  articleNumber: string;
  title: string;
  brand: string;
  model: string;
  url: string;
  rawSlug?: string;
}

const INDEX_FILE = path.join(process.cwd(), 'data', 'rona_catalog_index.json');
let memoryIndex: Record<string, { title: string; brand: string; model: string; slug: string }> | null = null;
let isInitializing = false;

const KNOWN_BRANDS: [string, string][] = [
  ['rust-oleum', 'Rust-Oleum'],
  ['simpson-strong-tie', 'Simpson Strong-Tie'],
  ['simple-green', 'Simple Green'],
  ['lepage', 'Lepage'],
  ['dap', 'DAP'],
  ['sharkbite', 'SharkBite'],
  ['richelieu', 'Richelieu'],
  ['paslode', 'Paslode'],
  ['dewalt', 'DEWALT'],
  ['milwaukee', 'Milwaukee'],
  ['makita', 'Makita'],
  ['bosch', 'Bosch'],
  ['stanley', 'Stanley'],
  ['purdy', 'Purdy'],
  ['wooster', 'Wooster'],
  ['climaloc', 'Climaloc'],
  ['certainteed', 'CertainTeed'],
  ['owens-corning', 'Owens Corning'],
  ['rockwool', 'Rockwool'],
  ['johns-manville', 'Johns Manville'],
  ['cgc', 'CGC'],
  ['iko', 'IKO'],
  ['bp', 'BP'],
  ['grk', 'GRK'],
  ['3m', '3M'],
  ['moen', 'Moen'],
  ['delta', 'Delta'],
  ['kohler', 'Kohler'],
  ['leviton', 'Leviton'],
  ['schlage', 'Schlage'],
  ['weiser', 'Weiser'],
  ['rona', 'RONA'],
  ['sico', 'Sico'],
  ['bennett', 'Bennett'],
  ['dynamic', 'Dynamic'],
  ['hillman', 'Hillman'],
  ['national-hardware', 'National Hardware'],
  ['spax', 'Spax'],
  ['tuck-tape', 'Tuck Tape'],
  ['resisto', 'Resisto'],
  ['soprema', 'Soprema'],
  ['blueskin', 'Blueskin'],
  ['tyvek', 'Tyvek'],
  ['gorilla', 'Gorilla'],
  ['titebond', 'Titebond'],
  ['ge', 'GE'],
  ['eaton', 'Eaton'],
  ['siemens', 'Siemens'],
  ['schneider-electric', 'Schneider Electric'],
  ['garant', 'Garant'],
  ['toro', 'Toro'],
  ['true-temper', 'True Temper'],
  ['scotts', 'Scotts'],
  ['suncast', 'Suncast']
];

export function decodeRonaSlug(slug: string, articleNo: string): { title: string; brand: string; model: string } {
  let body = slug;
  // Remove suffix -articleNo
  const cleanSku = articleNo.replace(/^0+/, '');
  const suffixPattern = new RegExp(`-(0*${cleanSku})$`, 'i');
  body = body.replace(suffixPattern, '');

  const parts = body.split('-');
  let model = '';
  if (parts.length > 2) {
    const last = parts[parts.length - 1];
    if (/^[a-z0-9]*\d+[a-z0-9]*$/i.test(last) && last.length >= 3 && last.length <= 15) {
      if (!/^(?:\d+in|\d+ft|\d+mm|\d+cm|\d+lb|\d+oz|\d+pk|\d+v|\d+amp|\d+m)$/i.test(last)) {
        model = parts.pop()!.toUpperCase();
      }
    }
  }

  // Detect brand prefix
  let detectedBrand = '';
  const slugLower = parts.join('-');
  for (const [slugPrefix, properBrand] of KNOWN_BRANDS) {
    if (slugLower.startsWith(slugPrefix + '-') || slugLower === slugPrefix) {
      detectedBrand = properBrand;
      break;
    }
  }

  let text = parts.join(' ');

  // Dimensions formatting
  text = text.replace(/\b(\d+)\s+(\d+)\s+([248]|16)\s+(in|ft)\b/gi, '$1-$2/$3-$4');
  text = text.replace(/\b(\d+)\s+([248]|16)\s+(in|ft)\b/gi, '$1/$2-$3');
  text = text.replace(/\b(\d+)\s+(in|ft)\b/gi, '$1-$2');
  text = text.replace(/\b(\d+)\s*x\s*(\d+)\b/gi, '$1 x $2');

  const wordMap: Record<string, string> = {
    spf: 'SPF', rona: 'RONA', dewalt: 'DEWALT', btr: 'Btr', pvc: 'PVC', abs: 'ABS',
    led: 'LED', hvac: 'HVAC', gfci: 'GFCI', cgc: 'CGC', iko: 'IKO', bp: 'BP',
    grk: 'GRK', '3m': '3M', ge: 'GE', osb: 'OSB', pt: 'PT', xl: 'XL',
    milwaukee: 'Milwaukee', makita: 'Makita', bosch: 'Bosch', stanley: 'Stanley',
    purdy: 'Purdy', lepage: 'Lepage', dap: 'DAP', sico: 'Sico', moen: 'Moen',
    delta: 'Delta', sharkbite: 'SharkBite', kohler: 'Kohler', leviton: 'Leviton',
    schlage: 'Schlage', weiser: 'Weiser', paslode: 'Paslode', richelieu: 'Richelieu',
    'pro-grade': 'Pro Grade'
  };

  const words = text.split(' ').map((w, idx) => {
    const low = w.toLowerCase();
    if (wordMap[low]) return wordMap[low];
    if (['in', 'ft', 'x', 'and', 'or', 'for', 'with', 'per', 'to', 'of', 'by', 'a', 'the'].includes(low) && idx > 0) {
      return low;
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  let title = words.join(' ');
  title = title.replace(/\bRust Oleum\b/gi, 'Rust-Oleum');
  title = title.replace(/\bSimpson Strong Tie\b/gi, 'Simpson Strong-Tie');
  title = title.replace(/\bSimple Green\b/gi, 'Simple Green');
  title = title.replace(/\bOwens Corning\b/gi, 'Owens Corning');

  if (!detectedBrand && words[0]) {
    detectedBrand = words[0];
  }

  // If brand is a measurement or number, fix brand
  if (!detectedBrand || /^\d+/i.test(detectedBrand) || /^(?:in|ft|mm|cm|lb|oz)$/i.test(detectedBrand)) {
    if (/spf/i.test(title)) {
      detectedBrand = 'SPF Lumber';
    } else if (/lumber|stud|timber|board|decking/i.test(title)) {
      detectedBrand = 'RONA Lumber';
    } else {
      detectedBrand = '';
    }
  }

  return { title, brand: detectedBrand, model };
}

/**
 * Ensures the in-memory RONA catalog index is loaded
 */
export async function loadRonaIndex(): Promise<Record<string, { title: string; brand: string; model: string; slug: string }>> {
  if (memoryIndex && Object.keys(memoryIndex).length > 0) {
    return memoryIndex;
  }

  if (fs.existsSync(INDEX_FILE)) {
    try {
      console.log('[RonaCatalogService] Loading index from disk...');
      const raw = fs.readFileSync(INDEX_FILE, 'utf8');
      memoryIndex = JSON.parse(raw);
      console.log(`[RonaCatalogService] Loaded ${Object.keys(memoryIndex!).length} RONA products into memory.`);
      return memoryIndex!;
    } catch (e: any) {
      console.error('[RonaCatalogService] Failed to parse existing index, will regenerate:', e.message);
    }
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 200));
    }
    return memoryIndex || {};
  }

  isInitializing = true;
  try {
    console.log('[RonaCatalogService] Building RONA catalog index from official sitemaps...');
    const urls = [
      'https://www.rona.ca/sitemap-products-en.xml.gz',
      'https://www.rona.ca/sitemap-products-en-1.xml.gz',
      'https://www.rona.ca/sitemap-products-en-2.xml.gz'
    ];

    const index: Record<string, { title: string; brand: string; model: string; slug: string }> = {};

    for (const u of urls) {
      try {
        const res = await fetch(u);
        const xml = await res.text();
        const regex = /<loc>https:\/\/www\.rona\.ca\/en\/product\/(.*?)<\/loc>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
          const slug = match[1];
          const parts = slug.split('-');
          const articleNo = parts[parts.length - 1];
          if (!articleNo) continue;

          const decoded = decodeRonaSlug(slug, articleNo);
          const entry = {
            title: decoded.title,
            brand: decoded.brand,
            model: decoded.model,
            slug
          };

          index[articleNo.toLowerCase()] = entry;
          const unpadded = articleNo.replace(/^0+/, '');
          if (unpadded && !index[unpadded.toLowerCase()]) {
            index[unpadded.toLowerCase()] = entry;
          }
        }
      } catch (err: any) {
        console.warn(`[RonaCatalogService] Warning downloading sitemap ${u}:`, err.message);
      }
    }

    const outDir = path.dirname(INDEX_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
    memoryIndex = index;
    console.log(`[RonaCatalogService] Initialized index with ${Object.keys(index).length} products.`);
    return memoryIndex;
  } finally {
    isInitializing = false;
  }
}

/**
 * Searches the RONA catalog for an item by SKU / Article #
 */
export async function searchRonaByArticle(sku: string): Promise<RonaProductInfo> {
  const index = await loadRonaIndex();
  const rawSku = String(sku || '').trim().toLowerCase();
  if (!rawSku) {
    return { found: false, articleNumber: '', title: '', brand: '', model: '', url: '' };
  }

  const unpadded = rawSku.replace(/^0+/, '');
  const pad7 = unpadded.padStart(7, '0');
  const pad8 = unpadded.padStart(8, '0');
  const pad6 = unpadded.padStart(6, '0');

  // Try direct lookups
  let hit = index[rawSku] || index[unpadded] || index[pad7] || index[pad8] || index[pad6];

  // Try prefix variations for tools/hardware (e.g. 5-digit numbers with "02" or "00" prefix)
  if (!hit && unpadded.length === 5) {
    hit = index['02' + unpadded] || index['00' + unpadded];
  }

  if (hit) {
    return {
      found: true,
      articleNumber: sku,
      title: hit.title,
      brand: hit.brand,
      model: hit.model,
      url: `https://www.rona.ca/en/product/${hit.slug}`,
      rawSlug: hit.slug
    };
  }

  return {
    found: false,
    articleNumber: sku,
    title: '',
    brand: '',
    model: '',
    url: ''
  };
}

/**
 * Extracts searchable keywords and lumber specs from RONA title
 */
export function extractKeywordsFromRonaProduct(title: string, brand?: string, sku?: string): string[] {
  const keywords = new Set<string>();

  if (brand) keywords.add(brand.toLowerCase());
  if (sku) keywords.add(sku.toLowerCase());

  // Dimensional patterns: 2-in x 10-in x 16-ft -> 2x10x16, 2x10, 16ft
  const lumberMatch = title.match(/(\d+)(?:-in)?\s*[xX]\s*(\d+)(?:-in)?\s*[xX]\s*(\d+)(?:-ft)?/i);
  if (lumberMatch) {
    const [_, d1, d2, d3] = lumberMatch;
    keywords.add(`${d1}x${d2}x${d3}`);
    keywords.add(`${d1}x${d2}`);
    keywords.add(`${d3}ft`);
    keywords.add(`${d3}'`);
    keywords.add(`${d1}x${d2}x${d3}ft`);
  }

  const dimMatch2 = title.match(/(\d+)\s*[xX]\s*(\d+)/i);
  if (dimMatch2) {
    keywords.add(`${dimMatch2[1]}x${dimMatch2[2]}`);
  }

  // Tokenize words
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\/-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !['in', 'ft', 'and', 'or', 'for', 'with', 'the', 'per'].includes(w));

  for (const w of words) {
    keywords.add(w);
  }

  return Array.from(keywords);
}
