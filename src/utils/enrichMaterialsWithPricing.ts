import { createClient } from './supabase/client';
import { getProjectWizardDefaults, getUserDefaults } from './project-wizard-defaults-client';
import { 
  HARDCODED_DEFAULTS_BY_SKU,
  SPRUCE_DEFAULTS_BY_SKU,
  CEDAR_DEFAULTS_BY_SKU,
  COMPOSITE_DEFAULTS_BY_SKU
} from './default-skus-fallback';

interface MaterialItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
  name?: string; // Inventory item name (added during enrichment)
  sku?: string;
  cost?: number;
  unitPrice?: number;
  totalCost?: number;
  /** Standard lumber length in feet for length-aware SKU matching */
  lumberLength?: number;
  /** Conversion factor for non-lumber items */
  conversionFactor?: number;
  /** Quantity after applying conversion factor */
  convertedQuantity?: number;
  /** Whole units to order (ceiled convertedQuantity) */
  orderQuantity?: number;
  /** The purchase unit after conversion */
  convertedUnit?: string;
  /** Inventory item ID */
  itemId?: string;
}

interface InventoryItemWithPricing {
  id: string;
  name: string; // Inventory item name
  unit_price: number; // stored in cents
  cost: number; // stored in cents
  sku?: string;
  description?: string;
  unit_of_measure?: string;
}

function isUuid(value: string | null | undefined): boolean {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function getDescriptionSearchTerms(description: string): string[] {
  const d = description.toLowerCase();

  if (d.includes('ledger flashing')) return ['ledger', 'flashing'];
  if (d.includes('ledger board') || d.includes('ledger')) return ['ledger', 'board'];
  if (d.includes('rim joist')) return ['rim', 'joist'];
  if (d.includes('joist hanger')) return ['joist', 'hanger'];
  if (d.includes('joist')) return ['joist'];
  if (d.includes('beam')) return ['beam'];
  if (d.includes('post anchor')) return ['post', 'anchor'];
  if (d.includes('post')) return ['post'];
  if (d.includes('decking') || d.includes('deck board')) return ['deck', 'board'];
  if (d.includes('stair stringer') || d.includes('stringer')) return ['stringer'];
  if (d.includes('stair tread') || (d.includes('stair') && d.includes('tread'))) return ['stair', 'tread'];
  if (d.includes('stair riser') || d.includes('riser')) return ['riser'];
  if (d.includes('railing post')) return ['railing', 'post'];
  if (d.includes('top rail')) return ['top', 'rail'];
  if (d.includes('bottom rail')) return ['bottom', 'rail'];
  if (d.includes('baluster') || d.includes('spindle')) return ['baluster'];
  if (d.includes('railing bracket')) return ['railing', 'bracket'];
  if (d.includes('deck screw')) return ['deck', 'screw'];
  if (d.includes('structural screw')) return ['structural', 'screw'];
  if (d.includes('lag screw') || d.includes('lag bolt')) return ['lag', 'screw'];
  if (d.includes('concrete mix')) return ['concrete', 'mix'];

  return d.split(/\s+/).filter(Boolean);
}

function fallbackMatchInventoryByDescription(
  material: MaterialItem,
  inventoryItems: InventoryItemWithPricing[]
): InventoryItemWithPricing | undefined {
  if (inventoryItems.length === 0) return undefined;

  const terms = getDescriptionSearchTerms(material.description);
  const needsLength = material.lumberLength != null;

  let best: { item: InventoryItemWithPricing; score: number } | undefined;

  inventoryItems.forEach((item) => {
    const name = (item.name || '').toLowerCase();
    if (!name) return;

    let score = 0;
    terms.forEach((term) => {
      if (name.includes(term)) score += 15;
    });

    const matchedAllTerms = terms.length > 0 && terms.every((term) => name.includes(term));
    if (matchedAllTerms) score += 40;

    if (needsLength) {
      const len = material.lumberLength;
      const lengthTokens = [
        `(${len}')`,
        `${len}ft`,
        `${len} ft`,
        `${len}-ft`,
      ];

      if (lengthTokens.some((token) => name.includes(token))) {
        score += 40;
      } else {
        score -= 15;
      }
    }

    if (score < 35) return;

    if (!best || score > best.score) {
      best = { item, score };
    }
  });

  return best?.item;
}


const getDeckItemMaterialType = (material: MaterialItem, defaultPassType?: string): string => {
  const desc = material.description.toLowerCase();
  const cat = material.category.toLowerCase();

  // 1. Is it an aluminum railing item?
  if (
    desc.includes('aluminum') ||
    desc.includes('picket package') ||
    desc.includes('tempered glass') ||
    desc.includes('clear glass pickets') ||
    desc.includes('angled stair glass') ||
    desc.includes('vinyl insert for glass') ||
    desc.includes('rubber blocks for glass') ||
    desc.includes('rail support legs') ||
    desc.includes('self drilling screw') ||
    desc.includes('post base plate cover') ||
    desc.includes('decorative post cap') ||
    desc.includes('universal angle bracket')
  ) {
    let color = 'white';
    if (desc.includes('black')) {
      color = 'black';
    } else if (desc.includes('white')) {
      color = 'white';
    } else if (defaultPassType && defaultPassType.includes('black')) {
      color = 'black';
    } else if (defaultPassType && defaultPassType.includes('white')) {
      color = 'white';
    }
    return `aluminum-${color}`;
  }

  // 2. Is it a Railing item (non-aluminum)?
  if (cat === 'railing' || desc.includes('railing') || desc.includes('baluster') || desc.includes('spindle')) {
    if (desc.includes('composite')) return 'composite';
    if (desc.includes('cedar')) return 'cedar';
    if (desc.includes('spruce')) return 'spruce';
    if (desc.includes('treated')) return 'treated';
    
    if (defaultPassType && ['composite', 'cedar', 'spruce', 'treated'].includes(defaultPassType)) {
      return defaultPassType;
    }
    return 'treated';
  }

  // 3. Is it a Decking item?
  if (cat === 'decking' || desc.includes('deck board') || desc.includes('decking') || desc.includes('tread') || desc.includes('riser')) {
    if (desc.includes('composite')) return 'composite';
    if (desc.includes('cedar')) return 'cedar';
    if (desc.includes('spruce')) return 'spruce';
    if (desc.includes('treated')) return 'treated';

    if (defaultPassType && ['composite', 'cedar', 'spruce', 'treated'].includes(defaultPassType)) {
      return defaultPassType;
    }
    return 'treated';
  }

  // 4. Is it a Framing item?
  if (cat === 'framing' || desc.includes('ledger') || desc.includes('joist') || desc.includes('beam') || desc.includes('post') || desc.includes('stringer') || desc.includes('blocking') || desc.includes('block')) {
    if (desc.includes('cedar')) return 'cedar';
    if (desc.includes('spruce')) return 'spruce';
    if (desc.includes('treated') || desc.includes('pressure treated')) return 'treated';
    
    if (defaultPassType && ['composite', 'cedar', 'spruce', 'treated'].includes(defaultPassType)) {
      return defaultPassType;
    }
    return 'treated';
  }

  // 5. Default/Hardware
  if (defaultPassType && ['treated', 'composite', 'cedar', 'spruce'].includes(defaultPassType)) {
    return defaultPassType;
  }
  if (defaultPassType && defaultPassType.startsWith('aluminum-')) {
    return 'treated';
  }

  return defaultPassType || 'default';
};

/**
 * Enrich materials with T1 pricing from inventory based on project wizard defaults
 */
const SKU_TO_FALLBACK_UUID: Record<string, string> = {
  // Pressure Treated (Treated) SKUs
  "84895030": "f0000000-0000-0000-0000-848950300000",
  "84895031": "f0000000-0000-0000-0000-848950310000",
  "84895032": "f0000000-0000-0000-0000-848950320000",
  "84895033": "f0000000-0000-0000-0000-848950330000",
  "84895034": "f0000000-0000-0000-0000-848950340000",
  "84895016": "f0000000-0000-0000-0000-848950160000",
  "84895017": "f0000000-0000-0000-0000-848950170000",
  "84895018": "f0000000-0000-0000-0000-848950180000",
  "84895019": "f0000000-0000-0000-0000-848950190000",
  "84895020": "f0000000-0000-0000-0000-848950200000",
  "84895043": "f0000000-0000-0000-0000-848950430000",
  "84895047": "f0000000-0000-0000-0000-848950470000",
  "84895048": "f0000000-0000-0000-0000-848950480000",
  "84895049": "f0000000-0000-0000-0000-848950490000",
  "84895050": "f0000000-0000-0000-0000-848950500000",
  "84895046": "f0000000-0000-0000-0000-848950460000",
  "84895040": "f0000000-0000-0000-0000-848950400000",
  "84895021": "f0000000-0000-0000-0000-848950210000",
  "84895027": "f0000000-0000-0000-0000-848950270000",
  "51206852": "f0000000-0000-0000-0000-512068520000",

  // Spruce (SPF) SKUs
  "94895030": "f0000000-0000-0000-0000-948950300000",
  "94895031": "f0000000-0000-0000-0000-948950310000",
  "94895032": "f0000000-0000-0000-0000-948950320000",
  "94895033": "f0000000-0000-0000-0000-948950330000",
  "94895034": "f0000000-0000-0000-0000-948950340000",
  "94895016": "f0000000-0000-0000-0000-948950160000",
  "94895017": "f0000000-0000-0000-0000-948950170000",
  "94895018": "f0000000-0000-0000-0000-948950180000",
  "94895019": "f0000000-0000-0000-0000-948950190000",
  "94895020": "f0000000-0000-0000-0000-948950200000",
  "94895043": "f0000000-0000-0000-0000-948950430000",
  "94895047": "f0000000-0000-0000-0000-948950470000",
  "94895048": "f0000000-0000-0000-0000-948950480000",
  "94895049": "f0000000-0000-0000-0000-948950490000",
  "94895050": "f0000000-0000-0000-0000-948950500000",
  "94895046": "f0000000-0000-0000-0000-948950460000",
  "94895040": "f0000000-0000-0000-0000-948950400000",
  "94895021": "f0000000-0000-0000-0000-948950210000",
  "94895027": "f0000000-0000-0000-0000-948950270000",
  "91206852": "f0000000-0000-0000-0000-912068520000",

  // Cedar SKUs
  "74895030": "f0000000-0000-0000-0000-748950300000",
  "74895031": "f0000000-0000-0000-0000-748950310000",
  "74895032": "f0000000-0000-0000-0000-748950320000",
  "74895033": "f0000000-0000-0000-0000-748950330000",
  "74895034": "f0000000-0000-0000-0000-748950340000",
  "74895016": "f0000000-0000-0000-0000-748950160000",
  "74895017": "f0000000-0000-0000-0000-748950170000",
  "74895018": "f0000000-0000-0000-0000-748950180000",
  "74895019": "f0000000-0000-0000-0000-748950190000",
  "74895020": "f0000000-0000-0000-0000-748950200000",
  "74895043": "f0000000-0000-0000-0000-748950430000",
  "74895047": "f0000000-0000-0000-0000-748950470000",
  "74895048": "f0000000-0000-0000-0000-748950480000",
  "74895049": "f0000000-0000-0000-0000-748950490000",
  "74895050": "f0000000-0000-0000-0000-748950500000",
  "74895046": "f0000000-0000-0000-0000-748950460000",
  "74895040": "f0000000-0000-0000-0000-748950400000",
  "74895021": "f0000000-0000-0000-0000-748950210000",
  "74895027": "f0000000-0000-0000-0000-748950270000",
  "71206852": "f0000000-0000-0000-0000-712068520000",

  // Composite SKUs
  "64895016": "f0000000-0000-0000-0000-648950160000",
  "64895017": "f0000000-0000-0000-0000-648950170000",
  "64895018": "f0000000-0000-0000-0000-648950180000",
  "64895019": "f0000000-0000-0000-0000-648950190000",
  "64895020": "f0000000-0000-0000-0000-648950200000",

  // Hardware & common SKUs
  "0533008":  "f0000000-0000-0000-0000-005330080000",
  "1399135":  "f0000000-0000-0000-0000-013991350000",
  "13998018": "f0000000-0000-0000-0000-139980180000",
  "13998079": "f0000000-0000-0000-0000-139980790000",
  "35945332": "f0000000-0000-0000-0000-359453320000",
  "35945278": "f0000000-0000-0000-0000-359452780000",
  "39595063": "f0000000-0000-0000-0000-395950630000",
  "MMS449752": "f0000000-0000-0000-0000-449752000000",

  // Shed, Garage, and Roof Specific UUIDs
  "50000001": "f0000000-0000-0000-0000-500000010000",
  "50000002": "f0000000-0000-0000-0000-500000020000",
  "50000003": "f0000000-0000-0000-0000-500000030000",
  "50000004": "f0000000-0000-0000-0000-500000040000",
  "50000005": "f0000000-0000-0000-0000-500000050000",
  "50000006": "f0000000-0000-0000-0000-500000060000",
  "50000007": "f0000000-0000-0000-0000-500000070000",
  "50000008": "f0000000-0000-0000-0000-500000080000",
  "50000009": "f0000000-0000-0000-0000-500000090000",
  "50000010": "f0000000-0000-0000-0000-500000100000",
  "50000011": "f0000000-0000-0000-0000-500000110000",
  "50000012": "f0000000-0000-0000-0000-500000120000",
  "50000013": "f0000000-0000-0000-0000-500000130000",
  "50000014": "f0000000-0000-0000-0000-500000140000",
  "50000015": "f0000000-0000-0000-0000-500000150000",
  "50000016": "f0000000-0000-0000-0000-500000160000",
  "50000017": "f0000000-0000-0000-0000-500000170000",
  "50000018": "f0000000-0000-0000-0000-500000180000",
  "50000019": "f0000000-0000-0000-0000-500000190000",
  "50000020": "f0000000-0000-0000-0000-500000200000",
  "50000021": "f0000000-0000-0000-0000-500000210000",
  "50000022": "f0000000-0000-0000-0000-500000220000",
  "50000023": "f0000000-0000-0000-0000-500000230000",
  "50000024": "f0000000-0000-0000-0000-500000240000",
  "50000025": "f0000000-0000-0000-0000-500000250000",
  "50000026": "f0000000-0000-0000-0000-500000260000",
  "50000027": "f0000000-0000-0000-0000-500000270000",
  "50000028": "f0000000-0000-0000-0000-500000280000",
  "50000029": "f0000000-0000-0000-0000-500000290000",
  "50000030": "f0000000-0000-0000-0000-500000300000",
  "50000031": "f0000000-0000-0000-0000-500000310000",
  "50000032": "f0000000-0000-0000-0000-500000320000",
  "50000033": "f0000000-0000-0000-0000-500000330000",
  "50000034": "f0000000-0000-0000-0000-500000340000",
  "50000035": "f0000000-0000-0000-0000-500000350000",
  "50000036": "f0000000-0000-0000-0000-500000360000",
  "50000037": "f0000000-0000-0000-0000-500000370000",
  "50000038": "f0000000-0000-0000-0000-500000380000",
  "50000039": "f0000000-0000-0000-0000-500000390000",
};

const HARDCODED_INVENTORY_DETAILS: Record<string, { name: string; unit_price: number; cost: number; description: string; unit_of_measure?: string }> = {
  // Pressure Treated (Treated) Fallbacks
  "84895030": { name: 'PT BROWN 2X8"X8\'', unit_price: 1999, cost: 1200, description: 'Pressure Treated Lumber (8\')' },
  "84895031": { name: 'PT BROWN 2X8"X10\'', unit_price: 2499, cost: 1500, description: 'Pressure Treated Lumber (10\')' },
  "84895032": { name: 'PT BROWN 2X8"X12\'', unit_price: 2999, cost: 1800, description: 'Pressure Treated Lumber (12\')' },
  "84895033": { name: 'PT BROWN 2X8"X14\'', unit_price: 3499, cost: 2100, description: 'Pressure Treated Lumber (14\')' },
  "84895034": { name: 'PT BROWN 2X8"X16\'', unit_price: 3998, cost: 2400, description: 'Pressure Treated Lumber (16\')' },
  "84895016": { name: 'PT BROWN 5/4X6"X8\'', unit_price: 999, cost: 600, description: 'Treated Decking Boards (8\')' },
  "84895017": { name: 'PT BROWN 5/4X6"X10\'', unit_price: 1299, cost: 800, description: 'Treated Decking Boards (10\')' },
  "84895018": { name: 'PT BROWN 5/4X6"X12\'', unit_price: 1499, cost: 900, description: 'Treated Decking Boards (12\')' },
  "84895019": { name: 'PT BROWN 5/4X6"X14\'', unit_price: 1799, cost: 1100, description: 'Treated Decking Boards (14\')' },
  "84895020": { name: 'PT BROWN 5/4X6"X16\'', unit_price: 1999, cost: 1200, description: 'Treated Decking Boards (16\')' },
  "84895043": { name: 'PT BROWN 4X4"X8\'', unit_price: 1849, cost: 1100, description: 'Pressure Treated Post' },
  "84895047": { name: 'PT BROWN 6X6"X10\'', unit_price: 5849, cost: 3500, description: 'Pressure Treated Post' },
  "84895048": { name: 'PT BROWN 6X6"X12\'', unit_price: 6999, cost: 4200, description: 'Pressure Treated Post' },
  "84895049": { name: 'PT BROWN 6X6"X14\'', unit_price: 7999, cost: 4800, description: 'Pressure Treated Post' },
  "84895050": { name: 'PT BROWN 6X6"X16\'', unit_price: 8999, cost: 5400, description: 'Pressure Treated Post' },
  "84895046": { name: 'PT BROWN D4S 6X6"X8\'', unit_price: 4679, cost: 2800, description: 'Pressure Treated Post' },
  "84895040": { name: 'PT BROWN 2X12"X12\'', unit_price: 5475, cost: 3200, description: 'Pressure Treated Lumber' },
  "84895021": { name: 'PT BROWN 2X4"X8\'', unit_price: 999, cost: 600, description: 'Pressure Treated Lumber' },
  "84895027": { name: 'PT BROWN 2X6"X10\'', unit_price: 1781, cost: 1000, description: 'Pressure Treated Lumber' },
  "51206852": { name: 'PT BALUSTER BROWN 2X2X42', unit_price: 249, cost: 150, description: 'Pressure Treated Baluster' },

  // Spruce (SPF) Fallbacks
  "94895030": { name: 'SPF 2X8"X8\'', unit_price: 1599, cost: 1000, description: 'Spruce-Pine-Fir Lumber (8\')' },
  "94895031": { name: 'SPF 2X8"X10\'', unit_price: 1999, cost: 1200, description: 'Spruce-Pine-Fir Lumber (10\')' },
  "94895032": { name: 'SPF 2X8"X12\'', unit_price: 2399, cost: 1400, description: 'Spruce-Pine-Fir Lumber (12\')' },
  "94895033": { name: 'SPF 2X8"X14\'', unit_price: 2799, cost: 1600, description: 'Spruce-Pine-Fir Lumber (14\')' },
  "94895034": { name: 'SPF 2X8"X16\'', unit_price: 3199, cost: 1800, description: 'Spruce-Pine-Fir Lumber (16\')' },
  "94895016": { name: 'SPRUCE 5/4X6"X8\'', unit_price: 799, cost: 500, description: 'Spruce Decking Boards (8\')' },
  "94895017": { name: 'SPRUCE 5/4X6"X10\'', unit_price: 999, cost: 650, description: 'Spruce Decking Boards (10\')' },
  "94895018": { name: 'SPRUCE 5/4X6"X12\'', unit_price: 1199, cost: 750, description: 'Spruce Decking Boards (12\')' },
  "94895019": { name: 'SPRUCE 5/4X6"X14\'', unit_price: 1399, cost: 900, description: 'Spruce Decking Boards (14\')' },
  "94895020": { name: 'SPRUCE 5/4X6"X16\'', unit_price: 1599, cost: 1000, description: 'Spruce Decking Boards (16\')' },
  "94895043": { name: 'SPF 4X4"X8\'', unit_price: 1449, cost: 900, description: 'Spruce Post' },
  "94895047": { name: 'SPF 6X6"X10\'', unit_price: 4549, cost: 2800, description: 'Spruce Post' },
  "94895048": { name: 'SPF 6X6"X12\'', unit_price: 5499, cost: 3300, description: 'Spruce Post' },
  "94895049": { name: 'SPF 6X6"X14\'', unit_price: 6499, cost: 3800, description: 'Spruce Post' },
  "94895050": { name: 'SPF 6X6"X16\'', unit_price: 7499, cost: 4300, description: 'Spruce Post' },
  "94895046": { name: 'SPF D4S 6X6"X8\'', unit_price: 3679, cost: 2200, description: 'Spruce Post' },
  "94895040": { name: 'SPF 2X12"X12\'', unit_price: 4275, cost: 2500, description: 'Spruce Lumber' },
  "94895021": { name: 'SPF 2X4"X8\'', unit_price: 799, cost: 500, description: 'Spruce Lumber' },
  "94895027": { name: 'SPF 2X6"X10\'', unit_price: 1381, cost: 800, description: 'Spruce Lumber' },
  "91206852": { name: 'SPRUCE BALUSTER 2X2X42', unit_price: 199, cost: 110, description: 'Spruce Baluster' },

  // Cedar Fallbacks
  "74895030": { name: 'CEDAR 2X8"X8\'', unit_price: 2499, cost: 1500, description: 'Cedar Lumber (8\')' },
  "74895031": { name: 'CEDAR 2X8"X10\'', unit_price: 2999, cost: 1800, description: 'Cedar Lumber (10\')' },
  "74895032": { name: 'CEDAR 2X8"X12\'', unit_price: 3499, cost: 2100, description: 'Cedar Lumber (12\')' },
  "74895033": { name: 'CEDAR 2X8"X14\'', unit_price: 3999, cost: 2400, description: 'Cedar Lumber (14\')' },
  "74895034": { name: 'CEDAR 2X8"X16\'', unit_price: 4499, cost: 2700, description: 'Cedar Lumber (16\')' },
  "74895016": { name: 'CEDAR 5/4X6"X8\'', unit_price: 1599, cost: 1000, description: 'Cedar Decking Boards (8\')' },
  "74895017": { name: 'CEDAR 5/4X6"X10\'', unit_price: 1999, cost: 1200, description: 'Cedar Decking Boards (10\')' },
  "74895018": { name: 'CEDAR 5/4X6"X12\'', unit_price: 2399, cost: 1400, description: 'Cedar Decking Boards (12\')' },
  "74895019": { name: 'CEDAR 5/4X6"X14\'', unit_price: 2799, cost: 1600, description: 'Cedar Decking Boards (14\')' },
  "74895020": { name: 'CEDAR 5/4X6"X16\'', unit_price: 3199, cost: 1900, description: 'Cedar Decking Boards (16\')' },
  "74895043": { name: 'CEDAR 4X4"X8\'', unit_price: 2449, cost: 1500, description: 'Cedar Post' },
  "74895047": { name: 'CEDAR 6X6"X10\'', unit_price: 6549, cost: 3800, description: 'Cedar Post' },
  "74895048": { name: 'CEDAR 6X6"X12\'', unit_price: 7499, cost: 4400, description: 'Cedar Post' },
  "74895049": { name: 'CEDAR 6X6"X14\'', unit_price: 8499, cost: 5000, description: 'Cedar Post' },
  "74895050": { name: 'CEDAR 6X6"X16\'', unit_price: 9499, cost: 5600, description: 'Cedar Post' },
  "74895046": { name: 'CEDAR D4S 6X6"X8\'', unit_price: 5279, cost: 3100, description: 'Cedar Post' },
  "74895040": { name: 'CEDAR 2X12"X12\'', unit_price: 6275, cost: 3800, description: 'Cedar Lumber' },
  "74895021": { name: 'CEDAR 2X4"X8\'', unit_price: 1299, cost: 800, description: 'Cedar Lumber' },
  "74895027": { name: 'CEDAR 2X6"X10\'', unit_price: 2181, cost: 1300, description: 'Cedar Lumber' },
  "71206852": { name: 'CEDAR BALUSTER 2X2X42', unit_price: 349, cost: 200, description: 'Cedar Baluster' },

  // Composite Fallbacks
  "64895016": { name: 'COMPOSITE 5/4X6"X8\'', unit_price: 3599, cost: 2200, description: 'Composite Decking Boards (8\')' },
  "64895017": { name: 'COMPOSITE 5/4X6"X10\'', unit_price: 4499, cost: 2700, description: 'Composite Decking Boards (10\')' },
  "64895018": { name: 'COMPOSITE 5/4X6"X12\'', unit_price: 5299, cost: 3200, description: 'Composite Decking Boards (12\')' },
  "64895019": { name: 'COMPOSITE 5/4X6"X14\'', unit_price: 6199, cost: 3700, description: 'Composite Decking Boards (14\')' },
  "64895020": { name: 'COMPOSITE 5/4X6"X16\'', unit_price: 6999, cost: 4200, description: 'Composite Decking Boards (16\')' },

  // Standard hardware & misc (common to all types)
  "0533008":  { name: 'Concrete Mix 80lb', unit_price: 699, cost: 400, description: 'Standard Concrete Mix' },
  "1399135":  { name: 'Deck Screws 3" (lb)', unit_price: 999, cost: 600, description: 'Coated Deck Screws' },
  "13998018": { name: 'Lag Screw 1/2"x8"', unit_price: 249, cost: 150, description: 'Hex Head Lag Screw' },
  "13998079": { name: 'Structural Screws 6"', unit_price: 499, cost: 300, description: 'Heavy Duty Structural Screw' },
  "35945332": { name: 'Joist Hanger 2x8', unit_price: 189, cost: 100, description: 'Metal Joist Hanger' },
  "35945278": { name: 'Post Anchor 6x6', unit_price: 1499, cost: 900, description: 'Heavy Duty Post Base Anchor' },
  "39595063": { name: 'Stair Tread 36"', unit_price: 1199, cost: 700, description: 'Pre-cut Stair Tread' },
  "MMS449752": { name: 'Ledger Flashing Tape 75\'', unit_price: 3499, cost: 2000, description: 'Ledger Flashing Tape' },

  // Shed, Garage, and Roof Specific Details
  "50000001": { name: 'SPF 2X4"X8\' Collar Tie', unit_price: 799, cost: 500, description: 'Spruce Wood Collar Tie' },
  "50000002": { name: 'Standard Roof Truss', unit_price: 4500, cost: 2500, description: 'Engineered Roof Truss' },
  "50000003": { name: 'OSB Sheathing 7/16" 4X8\'', unit_price: 1999, cost: 1200, description: 'Oriented Strand Board Sheathing' },
  "50000004": { name: 'OSB Sheathing 1/2" 4X8\'', unit_price: 2199, cost: 1300, description: 'Oriented Strand Board Sheathing' },
  "50000005": { name: 'T&G Plywood 3/4" 4X8\'', unit_price: 3499, cost: 2000, description: 'Tongue & Groove Flooring Plywood' },
  "50000006": { name: 'SPF 1X4"X10\' Corner Trim', unit_price: 1299, cost: 800, description: 'Standard Corner Trim Board' },
  "50000007": { name: 'SPF 1X3"X8\' Door/Window Trim', unit_price: 899, cost: 500, description: 'Door and Window Trim Board' },
  "50000008": { name: 'Shed Flower Box Kit', unit_price: 2499, cost: 1500, description: 'Decorative Window Flower Box' },
  "50000009": { name: 'Concrete Deck Block', unit_price: 599, cost: 350, description: 'Heavy Concrete Support Block' },
  "50000010": { name: 'Weed Barrier Fabric Roll 3\'x100\'', unit_price: 2999, cost: 1800, description: 'Landscape Weed Barrier Fabric' },
  "50000011": { name: 'Plastic Lawn Border 20\'', unit_price: 1499, cost: 900, description: 'Lawn and Landscape Border' },
  "50000012": { name: 'House Wrap Roll 9\'x100\'', unit_price: 11999, cost: 7000, description: 'Synthetic House Wrap Barrier' },
  "50000013": { name: 'LP SmartSide Siding Panel 4\'x8\'', unit_price: 3999, cost: 2400, description: 'Engineered Wood Siding Panel' },
  "50000014": { name: 'Vinyl Shutters (Pair)', unit_price: 3499, cost: 2000, description: 'Decorative Vinyl Window Shutters' },
  "50000015": { name: 'Heavy Duty Strap Hinge 8"', unit_price: 1199, cost: 700, description: 'Shed Door Strap Hinge' },
  "50000016": { name: 'T-Handle Latch and Lock', unit_price: 1899, cost: 1100, description: 'Shed Door Locking T-Handle' },
  "50000017": { name: 'Fiberglass Entry Door 36"x80"', unit_price: 24999, cost: 15000, description: 'Prehung Fiberglass Entry Door' },
  "50000018": { name: 'Heavy Duty Locking Latch', unit_price: 2999, cost: 1800, description: 'Door Security Lock and Latch' },
  "50000019": { name: 'Heavy Duty Shelf Bracket', unit_price: 499, cost: 300, description: 'Metal Shelf Support Bracket' },
  "50000020": { name: 'Shelving Plywood 3/4" 4X8\'', unit_price: 2999, cost: 1800, description: 'Plywood Utility Shelving Sheet' },
  "50000021": { name: 'Simpson Strong-Tie H2.5A', unit_price: 189, cost: 110, description: 'Hurricane Truss Tie Bracket' },
  "50000022": { name: 'Synthetic Roof Underlayment Roll', unit_price: 4299, cost: 2600, description: 'Felt Replacement Underlayment' },
  "50000023": { name: 'Asphalt Shingles (Bundle)', unit_price: 3699, cost: 2200, description: '3-Tab Asphalt Roof Shingles' },
  "50000024": { name: 'Ridge Cap Shingles (Bundle)', unit_price: 4499, cost: 2700, description: 'Matching Ridge Cap Shingles' },
  "50000025": { name: 'Aluminum Drip Edge 10\'', unit_price: 1299, cost: 800, description: 'Roof Perimeter Drip Edge' },
  "50000026": { name: 'Coil Roofing Nails 1200ct', unit_price: 2799, cost: 1600, description: 'Pneumatic Coil Roofing Nails' },
  "50000027": { name: 'Shed Window 18"x24"', unit_price: 5999, cost: 3600, description: 'Single Hung Shed Window' },
  "50000028": { name: 'Smart Garage Door Opener 1/2HP', unit_price: 19999, cost: 12000, description: 'Belt Drive Smart Garage Opener' },
  "50000029": { name: 'Overhead Garage Door 9\'x7\'', unit_price: 79999, cost: 50000, description: 'Insulated Overhead Garage Door' },
  "50000030": { name: 'GE 100-Amp Sub-Panel', unit_price: 8999, cost: 5500, description: '6-Space Electrical Subpanel' },
  "50000031": { name: 'Romex NM-B 14/2 Wire 250\'', unit_price: 10999, cost: 6500, description: 'Non-Metallic Electrical Wire' },
  "50000032": { name: 'Linkable LED Shop Light 4\'', unit_price: 3499, cost: 2000, description: 'Ultra-Bright LED Ceiling Light' },
  "50000033": { name: 'GFCI Receptacle 15-Amp', unit_price: 1599, cost: 950, description: 'Self-Testing GFCI Outlet' },
  "50000034": { name: 'Single Pole Wall Switch', unit_price: 199, cost: 120, description: 'Standard Quiet Wall Switch' },
  "50000035": { name: '1-Gang Electrical Junction Box', unit_price: 149, cost: 90, description: 'Plastic New Work Outlet Box' },
  "50000036": { name: 'Fiberglass Insulation Roll R13', unit_price: 4899, cost: 3000, description: 'Kraft Faced Wall Insulation Roll' },
  "50000037": { name: 'Fiberglass Insulation Roll R21', unit_price: 5899, cost: 3500, description: 'Kraft Faced Ceiling Insulation Roll' },
  "50000038": { name: 'Concrete Anchor Bolt 1/2"x10"', unit_price: 349, cost: 200, description: 'Foundation Anchor Bolt with Nut' },
  "50000039": { name: 'Aluminum Ridge Vent 4\'', unit_price: 1499, cost: 900, description: 'Low Profile Shingle Ridge Vent' },
};

export async function enrichMaterialsWithT1Pricing(
  materials: MaterialItem[],
  organizationId: string,
  plannerType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen',
  materialType?: string,
  conversionFactors?: Record<string, number>,
  userId?: string,
  userDefaultsOverride?: Record<string, string>
): Promise<{ materials: MaterialItem[]; totalT1Price: number }> {
  // Enriching materials with pricing

  try {
    const supabase = createClient();
    const normalizedMaterialType = materialType?.toLowerCase();
    
    // Auto-heal and robustly resolve organizationId if missing or un-initialized
    let resolvedOrgId = organizationId;
    if (!resolvedOrgId || resolvedOrgId === 'undefined' || resolvedOrgId === 'null') {
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
        if (profile?.organization_id) {
          resolvedOrgId = profile.organization_id;
        }
      }
    }
    if (!resolvedOrgId) {
      resolvedOrgId = 'default-org';
    }

    // Get project wizard defaults and optional user-level overrides.
    const [defaults, userDefaults] = await Promise.all([
      getProjectWizardDefaults(resolvedOrgId),
      userDefaultsOverride
        ? Promise.resolve(userDefaultsOverride)
        : userId
          ? getUserDefaults(userId, resolvedOrgId)
          : Promise.resolve({}),
    ]);


    // Build logical multi-key map: material_type::material_category -> inventory_item_id
    const defaultsByMaterialAndCategory = new Map<string, string>();
    const fallbackDefaultsByCategory = new Map<string, string>();

    defaults.forEach(def => {
      if (def.planner_type === plannerType && def.inventory_item_id) {
        const materialTypeKey = (def.material_type || 'default').toLowerCase();
        const categoryKey = def.material_category.toLowerCase();
        
        defaultsByMaterialAndCategory.set(`${materialTypeKey}::${categoryKey}`, def.inventory_item_id);
        
        // Keep a planner-wide fallback map regardless of material type.
        if (!fallbackDefaultsByCategory.has(categoryKey)) {
          fallbackDefaultsByCategory.set(categoryKey, def.inventory_item_id);
        }
      }
    });

    // Merge userDefaults into defaultsByMaterialAndCategory
    Object.entries(userDefaults).forEach(([key, itemId]) => {
      if (!itemId || key.endsWith('-cf')) {
        return;
      }

      const [storedPlannerType, storedMaterialType, ...categoryParts] = key.split('-');
      if (!storedPlannerType || !storedMaterialType || categoryParts.length === 0) {
        return;
      }

      if (storedPlannerType.toLowerCase() !== plannerType) {
        return;
      }

      const materialTypeKey = storedMaterialType.toLowerCase();
      const categoryKey = categoryParts.join('-').toLowerCase();

      // Set user defaults so it overrides everything
      defaultsByMaterialAndCategory.set(`${materialTypeKey}::${categoryKey}`, itemId);
    });

    // Define all fallback SKUs
    const fallbackSkus = Array.from(new Set([
      ...Object.values(HARDCODED_DEFAULTS_BY_SKU),
      ...Object.values(SPRUCE_DEFAULTS_BY_SKU),
      ...Object.values(CEDAR_DEFAULTS_BY_SKU),
      ...Object.values(COMPOSITE_DEFAULTS_BY_SKU),
    ]));

    // Get unique valid inventory item IDs (currently only those from DB-configured defaults).
    const inventoryItemIds = Array.from(new Set(defaultsByMaterialAndCategory.values())).filter(isUuid);
    
    let inventoryItems: Array<{ id: string; name: string; unit_price: number; cost: number; sku?: string; description?: string; unit_of_measure?: string }> = [];
    if (inventoryItemIds.length > 0) {
      // Fetch defaults-mapped inventory in chunks to avoid large id.in(...) filters.
      const idChunks = chunkArray(inventoryItemIds, 50);

      for (const idChunk of idChunks) {
        // Exclude our mock fallback UUIDs from direct database queries to avoid empty lookup logs
        const validDbIds = idChunk.filter(id => !id.startsWith('f0000000-0000-'));
        if (validDbIds.length === 0) continue;

        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, unit_price, cost, sku, description, unit_of_measure')
          .in('id', validDbIds)
          .eq('organization_id', resolvedOrgId);

        if (!error && data) {
          inventoryItems = [...inventoryItems, ...data];
        }
      }
    }

    // Always fetch hardcoded fallback SKUs as well to make sure pricing is resolved for unconfigured defaults
    const skuChunks = chunkArray(fallbackSkus, 50);
    for (const skuChunk of skuChunks) {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, unit_price, cost, sku, description, unit_of_measure')
        .in('sku', skuChunk)
        .eq('organization_id', resolvedOrgId);

      if (!error && data) {
        data.forEach(item => {
          if (!inventoryItems.some(existing => existing.id === item.id)) {
            inventoryItems.push(item);
          }
        });
      }
    }

    // Fallback: only attempt description-based matching when at least one default exists.
    // If defaults are completely wiped, keep pricing empty instead of re-populating via fuzzy matches.
    if (inventoryItems.length === 0 && (defaultsByMaterialAndCategory.size > 0 || fallbackSkus.length > 0)) {
      const { data } = await supabase
        .from('inventory')
        .select('id, name, unit_price, cost, sku, description, unit_of_measure')
        .eq('organization_id', resolvedOrgId)
        .limit(2500);

      if (data) {
        inventoryItems = data;
      }
    }

    // Guarantee that ALL fallback SKUs exist in inventoryItems list (with either database values or hardcoded fallbacks)
    fallbackSkus.forEach(sku => {
      const lowerSku = sku.toLowerCase();
      const alreadyHas = inventoryItems.some(item => item.sku?.toLowerCase() === lowerSku);
      if (!alreadyHas) {
        const fallbackDetail = HARDCODED_INVENTORY_DETAILS[sku];
        const fallbackUuid = SKU_TO_FALLBACK_UUID[sku];
        if (fallbackDetail && fallbackUuid) {
          inventoryItems.push({
            id: fallbackUuid,
            sku: sku,
            name: fallbackDetail.name,
            unit_price: fallbackDetail.unit_price,
            cost: fallbackDetail.cost,
            description: fallbackDetail.description,
            unit_of_measure: fallbackDetail.unit_of_measure || 'ea',
          });
        }
      }
    });

    // NOW that inventoryItems has both real DB items and guaranteed fallback items,
    // run the fallback registration so that defaultsByMaterialAndCategory holds the CORRECT IDs
    // that are actually present in the final inventoryMapById.
    const registerFallbackMap = (fallbackMap: Record<string, string>, targetMaterialType: string) => {
      Object.entries(fallbackMap).forEach(([categoryKey, sku]) => {
        // Find the actual ID in inventoryItems (it could be a DB ID or a fallback ID)
        const matchedItem = inventoryItems.find(item => item.sku?.toLowerCase() === sku.toLowerCase());
        const resolvedId = matchedItem ? matchedItem.id : SKU_TO_FALLBACK_UUID[sku];
        
        if (resolvedId) {
          const lowerCategory = categoryKey.toLowerCase();
          
          // Keep a planner-wide fallback map if not already present.
          if (!fallbackDefaultsByCategory.has(lowerCategory)) {
            fallbackDefaultsByCategory.set(lowerCategory, resolvedId);
          }
          
          const mapKey = `${targetMaterialType.toLowerCase()}::${lowerCategory}`;
          if (!defaultsByMaterialAndCategory.has(mapKey)) {
            defaultsByMaterialAndCategory.set(mapKey, resolvedId);
          }
        }
      });
    };

    registerFallbackMap(HARDCODED_DEFAULTS_BY_SKU, 'default');
    registerFallbackMap(HARDCODED_DEFAULTS_BY_SKU, 'treated');
    registerFallbackMap(SPRUCE_DEFAULTS_BY_SKU, 'spruce');
    registerFallbackMap(CEDAR_DEFAULTS_BY_SKU, 'cedar');
    registerFallbackMap(COMPOSITE_DEFAULTS_BY_SKU, 'composite');

    if (inventoryItems.length === 0) {
      return { materials, totalT1Price: 0 };
    }

    // Build inventory lookup by ID and SKU
    const inventoryMapById = new Map<string, InventoryItemWithPricing>();
    const inventoryMapBySku = new Map<string, InventoryItemWithPricing>();
    inventoryItems?.forEach(item => {
      const inventoryItem = {
        id: item.id,
        name: item.name || '',
        unit_price: item.unit_price || 0,
        cost: item.cost || 0,
        sku: item.sku,
        description: item.description || '',
        unit_of_measure: item.unit_of_measure || undefined,
      };
      inventoryMapById.set(item.id, inventoryItem);
      if (item.sku) {
        inventoryMapBySku.set(item.sku.toLowerCase(), inventoryItem);
      }
    });

    // Enrich materials
    let totalT1Price = 0;
    const enrichedMaterials = materials.map(material => {
      let inventoryItem: InventoryItemWithPricing | undefined;
      let matchMethod = '';
      let matchedDefaultKey: string | undefined;

      // STRATEGY 1: Match by SKU (most reliable - SKUs are unique)
      if (material.sku) {
        inventoryItem = inventoryMapBySku.get(material.sku.toLowerCase());
        if (inventoryItem) {
          matchMethod = `SKU match: "${material.sku}"`;
        }
      }

      const itemMaterialType = plannerType === 'deck'
        ? getDeckItemMaterialType(material, normalizedMaterialType)
        : (normalizedMaterialType || 'default');

      const resolveOverride = (baseKey: string): string | undefined => {
        const normalizedBase = baseKey.toLowerCase();

        // Helper to verify if matched ID exists in inventory and is valid
        const verify = (id: string | undefined): string | undefined => {
          if (id && id !== 'none' && inventoryMapById.has(id)) {
            return id;
          }
          return undefined;
        };

        // 1. Direct material-specific lookup
        let matched = defaultsByMaterialAndCategory.get(`${itemMaterialType.toLowerCase()}::${normalizedBase}`);
        if (verify(matched)) return matched;

        // 2. Prefix-agnostic material-specific lookup: check if any registered key ends with our baseKey
        for (const [mapKey, itemId] of defaultsByMaterialAndCategory.entries()) {
          const [matType, catPath] = mapKey.split('::');
          if (matType === itemMaterialType.toLowerCase() && catPath) {
            const cleanPath = catPath.replace(/\s+/g, ' ').trim();
            const cleanBase = normalizedBase.replace(/\s+/g, ' ').trim();
            
            if (cleanPath === cleanBase || cleanPath.endsWith(` - ${cleanBase}`) || cleanPath.endsWith(`-${cleanBase}`)) {
              if (verify(itemId)) return itemId;
            }
          }
        }

        // 3. Try generic aluminum lookup if color specific fails
        if (itemMaterialType.toLowerCase().startsWith('aluminum-')) {
          matched = defaultsByMaterialAndCategory.get(`aluminum::${normalizedBase}`);
          if (verify(matched)) return matched;

          for (const [mapKey, itemId] of defaultsByMaterialAndCategory.entries()) {
            const [matType, catPath] = mapKey.split('::');
            if (matType === 'aluminum' && catPath) {
              const cleanPath = catPath.replace(/\s+/g, ' ').trim();
              const cleanBase = normalizedBase.replace(/\s+/g, ' ').trim();
              
              if (cleanPath === cleanBase || cleanPath.endsWith(` - ${cleanBase}`) || cleanPath.endsWith(`-${cleanBase}`)) {
                if (verify(itemId)) return itemId;
              }
            }
          }
        }

        // 4. Try default/generic direct lookup
        matched = defaultsByMaterialAndCategory.get(`default::${normalizedBase}`);
        if (verify(matched)) return matched;

        // 5. Try default/generic prefix-agnostic lookup
        for (const [mapKey, itemId] of defaultsByMaterialAndCategory.entries()) {
          const [matType, catPath] = mapKey.split('::');
          if (matType === 'default' && catPath) {
            const cleanPath = catPath.replace(/\s+/g, ' ').trim();
            const cleanBase = normalizedBase.replace(/\s+/g, ' ').trim();
            
            if (cleanPath === cleanBase || cleanPath.endsWith(` - ${cleanBase}`) || cleanPath.endsWith(`-${cleanBase}`)) {
              if (verify(itemId)) return itemId;
            }
          }
        }

        // 6. Direct fallback map lookup
        const dbFallback = fallbackDefaultsByCategory.get(normalizedBase);
        if (verify(dbFallback)) return dbFallback;

        // 7. Suffix-based fallback map lookup
        for (const [catPath, itemId] of fallbackDefaultsByCategory.entries()) {
          const cleanPath = catPath.replace(/\s+/g, ' ').trim();
          const cleanBase = normalizedBase.replace(/\s+/g, ' ').trim();
          
          if (cleanPath === cleanBase || cleanPath.endsWith(` - ${cleanBase}`) || cleanPath.endsWith(`-${cleanBase}`)) {
            if (verify(itemId)) return itemId;
          }
        }

        // 8. Try hardcoded defaults by SKU as final fallback
        let fallbackSku: string | undefined = undefined;
        const mType = itemMaterialType.toLowerCase();

        if (mType === 'spruce') {
          fallbackSku = SPRUCE_DEFAULTS_BY_SKU[normalizedBase];
        } else if (mType === 'cedar') {
          fallbackSku = CEDAR_DEFAULTS_BY_SKU[normalizedBase];
        } else if (mType === 'composite') {
          fallbackSku = COMPOSITE_DEFAULTS_BY_SKU[normalizedBase];
        } else {
          fallbackSku = HARDCODED_DEFAULTS_BY_SKU[normalizedBase];
        }

        if (!fallbackSku) {
          fallbackSku = HARDCODED_DEFAULTS_BY_SKU[normalizedBase];
        }

        if (fallbackSku) {
          const resolvedItem = inventoryMapBySku.get(fallbackSku.toLowerCase());
          if (resolvedItem) return resolvedItem.id;
        }
        return undefined;
      };

      // STRATEGY 2: Match by category or smart matching based on description
      if (!inventoryItem) {
        let inventoryItemId: string | undefined = undefined;
        const description = material.description.toLowerCase();
        const isAluminum = itemMaterialType.startsWith('aluminum');
        const categoryKey = material.category.toLowerCase();
        
        // -----------------------------------------------------------------
        // Length-aware matching: if the material specifies a lumberLength,
        // first try the length-specific default key (e.g. "joists (12')"),
        // then fall back to the generic key (e.g. "joists").
        // -----------------------------------------------------------------
        const tryLengthFirst = (baseKey: string): string | undefined => {
          if (material.lumberLength) {
            const lengthKey = `${baseKey} (${material.lumberLength}')`;
            const lengthMatch = resolveOverride(lengthKey);
            if (lengthMatch && inventoryMapById.has(lengthMatch)) {
              matchedDefaultKey = lengthKey;
              return lengthMatch;
            }
          }
          const genericMatch = resolveOverride(baseKey);
          if (genericMatch && inventoryMapById.has(genericMatch)) {
            matchedDefaultKey = baseKey;
            return genericMatch;
          }
          return undefined;
        };

        // Helper to match and track the key
        const tryMatch = (key: string): string | undefined => {
          const match = resolveOverride(key);
          if (match && inventoryMapById.has(match)) {
            matchedDefaultKey = key;
            return match;
          }
          return undefined;
        };

        // Try description-based smart matching first
        if (plannerType === 'deck') {
          if (description.includes('ledger flashing')) {
            inventoryItemId = tryMatch('ledger flashing');
          } else if (description.includes('ledger')) {
            inventoryItemId = tryLengthFirst('ledger board');
          } else if (description.includes('joist') && !description.includes('hanger') && !description.includes('rim')) {
            inventoryItemId = tryLengthFirst('joists');
          } else if (description.includes('rim joist') || description.includes('rim joists')) {
            inventoryItemId = tryLengthFirst('rim joists');
          } else if (description.includes('joist hanger')) {
            inventoryItemId = tryMatch('joist hangers');
          } else if (description.includes('beam')) {
            inventoryItemId = tryLengthFirst('beams');
          } else if (description.includes('post') && !description.includes('railing') && !description.includes('anchor')) {
            inventoryItemId = tryLengthFirst('posts');
          } else if (description.includes('post anchor')) {
            inventoryItemId = tryMatch('post anchors');
          } else if (description.includes('decking') || description.includes('deck board')) {
            inventoryItemId = tryLengthFirst('decking boards');
          } else if (description.includes('aluminum top & bottom rail') || description.includes('top & bottom rail')) {
            let lengthKey = "6'";
            if (description.includes('6 ft') || description.includes('(6\'')) lengthKey = "6'";
            else if (description.includes('8 ft') || description.includes('(8\'')) lengthKey = "8'";
            else if (description.includes('10 ft') || description.includes('(10\'')) lengthKey = "10'";
            else if (description.includes('12 ft') || description.includes('(12\'')) lengthKey = "12'";
            inventoryItemId = tryMatch(`railing - ${lengthKey}`);
          } else if (description.includes('picket package')) {
            if (description.toLowerCase().includes('stair')) {
              inventoryItemId = tryMatch('spindles/pickets - stair');
            } else {
              inventoryItemId = tryMatch("spindles/pickets - 6'");
            }
          } else if (description.includes('clear glass pickets')) {
            inventoryItemId = tryMatch("spindles/pickets - 6'");
          } else if (description.includes('angled stair glass pickets')) {
            inventoryItemId = tryMatch("spindles/pickets - stair");
          } else if (description.toLowerCase().includes('aluminum stair posts') || description.toLowerCase().includes('stair post')) {
            inventoryItemId = tryMatch('posts - stair');
          } else if (isAluminum && (description.toLowerCase().includes('aluminum posts') || description.toLowerCase().includes('railing post'))) {
            inventoryItemId = tryMatch('posts - inline');
          } else if (!isAluminum && (description.toLowerCase().includes('railing post') || description.toLowerCase().includes('railing posts'))) {
            inventoryItemId = tryMatch('railing posts');
          } else if (!isAluminum && description.toLowerCase().includes('top rail')) {
            inventoryItemId = tryMatch('railing top rail');
          } else if (!isAluminum && description.toLowerCase().includes('bottom rail')) {
            inventoryItemId = tryMatch('railing bottom rail');
          } else if (description.includes('tempered glass panel')) {
            inventoryItemId = tryMatch(description);
          } else if (description.includes('post base plate cover')) {
            inventoryItemId = tryMatch('post base plate cover');
          } else if (description.includes('decorative post cap')) {
            inventoryItemId = tryMatch('decorative post cap');
          } else if (description.includes('universal angle bracket')) {
            inventoryItemId = tryMatch('universal angle bracket (uab)');
          } else if (description.includes('vinyl insert for glass')) {
            inventoryItemId = tryMatch('vinyl insert for glass (gvi)');
          } else if (description.includes('rubber blocks for glass')) {
            inventoryItemId = tryMatch('rubber blocks for glass (grb-10)');
          } else if (description.includes('rail support legs')) {
            inventoryItemId = tryMatch('rail support legs (srsl)');
          } else if (description.includes('self drilling screws')) {
            inventoryItemId = tryMatch('self drilling screws');
          } else if (description.includes('baluster') || description.includes('spindle')) {
            inventoryItemId = tryMatch('railing balusters');
          } else if (description.includes('railing bracket')) {
            inventoryItemId = tryMatch('railing brackets');
          } else if (description.includes('stringer')) {
            inventoryItemId = tryLengthFirst('stair stringers');
          } else if (description.includes('blocking') || description.includes('block')) {
            inventoryItemId = tryLengthFirst('blocking');
          } else if (description.includes('stair') && description.includes('tread')) {
            inventoryItemId = tryMatch('stair treads');
          } else if (description.toLowerCase().includes('riser')) {
            inventoryItemId = tryMatch('stair risers');
          } else if (description.includes('deck screw')) {
            inventoryItemId = tryMatch('deck screws');
          } else if (description.includes('structural screw')) {
            inventoryItemId = tryMatch('structural screws');
          } else if (description.includes('lag screw') || description.includes('lag bolt')) {
            inventoryItemId = tryMatch('lag screws');
          } else if (description.includes('concrete mix')) {
            inventoryItemId = tryMatch('concrete mix');
          } else if (description.includes('formtube')) {
            inventoryItemId = tryMatch('formtube');
          }
        } else if (plannerType === 'garage') {
          if (description.includes('stud')) {
            inventoryItemId = tryLengthFirst('wall studs');
          } else if (description.includes('plate')) {
            inventoryItemId = tryLengthFirst('plates');
          } else if (description.includes('header')) {
            inventoryItemId = tryLengthFirst('headers');
          } else if (description.includes('blocking') || description.includes('bracing')) {
            inventoryItemId = tryMatch('blocking/bracing');
          } else if (description.includes('truss')) {
            inventoryItemId = tryMatch('roof trusses');
          } else if (description.includes('wall sheathing')) {
            inventoryItemId = tryMatch('wall sheathing');
          } else if (description.includes('roof sheathing')) {
            inventoryItemId = tryMatch('roof sheathing');
          } else if (description.includes('fascia')) {
            inventoryItemId = tryLengthFirst('fascia boards');
          } else if (description.includes('trim')) {
            inventoryItemId = tryMatch('trim boards');
          } else if (description.includes('house wrap') || description.includes('tyvek')) {
            inventoryItemId = tryMatch('house wrap');
          } else if (description.includes('siding')) {
            inventoryItemId = tryMatch('siding');
          } else if (description.includes('garage door opener')) {
            inventoryItemId = tryMatch('garage door opener');
          } else if (description.includes('overhead') || description.includes('garage door')) {
            inventoryItemId = tryMatch('garage door');
          } else if (description.includes('walk door') || description.includes('entry door') || description.includes('steel walk')) {
            inventoryItemId = tryMatch('entry door');
          } else if (description.includes('sub-panel') || description.includes('sub panel')) {
            inventoryItemId = tryMatch('sub-panel');
          } else if (description.includes('romex')) {
            inventoryItemId = tryMatch('romex wire');
          } else if (description.includes('shop light') || description.includes('led')) {
            inventoryItemId = tryMatch('led shop lights');
          } else if (description.includes('gfci') || description.includes('outlet')) {
            inventoryItemId = tryMatch('outlets (gfci)');
          } else if (description.includes('light switch')) {
            inventoryItemId = tryMatch('light switches');
          } else if (description.includes('junction box')) {
            inventoryItemId = tryMatch('junction boxes');
          } else if (description.includes('insulation') && description.includes('wall')) {
            inventoryItemId = tryMatch('insulation (walls)');
          } else if (description.includes('insulation') && description.includes('ceiling')) {
            inventoryItemId = tryMatch('insulation (ceiling)');
          } else if (description.includes('anchor bolt')) {
            inventoryItemId = tryMatch('anchor bolts');
          } else if (description.includes('hurricane')) {
            inventoryItemId = tryMatch('hurricane ties');
          } else if (description.includes('felt') || description.includes('underlayment')) {
            inventoryItemId = tryMatch('felt underlayment');
          } else if (description.includes('shingle')) {
            inventoryItemId = tryMatch('roof shingles');
          } else if (description.includes('ridge cap')) {
            inventoryItemId = tryMatch('ridge cap');
          } else if (description.includes('drip edge')) {
            inventoryItemId = tryMatch('drip edge');
          } else if (description.includes('roofing nail')) {
            inventoryItemId = tryMatch('roofing nails');
          } else if (description.includes('window')) {
            inventoryItemId = tryMatch('windows');
          }
        } else if (plannerType === 'shed') {
          if (description.includes('floor joist')) {
            inventoryItemId = tryLengthFirst('floor joists');
          } else if (description.includes('rim joist') || description.includes('rim joists')) {
            inventoryItemId = tryLengthFirst('rim joists');
          } else if (description.includes('wall stud') || (description.includes('stud') && !description.includes('joist'))) {
            inventoryItemId = tryLengthFirst('wall studs');
          } else if (description.includes('plate')) {
            inventoryItemId = tryLengthFirst('plates');
          } else if (description.includes('header')) {
            inventoryItemId = tryLengthFirst('headers');
          } else if (description.includes('rafter')) {
            inventoryItemId = tryLengthFirst('rafters');
          } else if (description.includes('collar tie')) {
            inventoryItemId = tryMatch('collar ties');
          } else if (description.includes('ridge board') || description.includes('ridge')) {
            inventoryItemId = tryLengthFirst('ridge board');
          } else if (description.includes('loft joist')) {
            inventoryItemId = tryLengthFirst('loft joists');
          } else if (description.includes('truss')) {
            inventoryItemId = tryMatch('roof trusses');
          } else if (description.includes('wall sheathing')) {
            inventoryItemId = tryMatch('wall sheathing');
          } else if (description.includes('roof sheathing')) {
            inventoryItemId = tryMatch('roof sheathing');
          } else if (description.includes('tongue') || description.includes('floor decking') || description.includes('plywood') && categoryKey === 'flooring') {
            inventoryItemId = tryMatch('floor decking');
          } else if (description.includes('fascia')) {
            inventoryItemId = tryLengthFirst('fascia boards');
          } else if (description.includes('corner trim')) {
            inventoryItemId = tryMatch('corner trim');
          } else if (description.includes('door/window trim') || (description.includes('trim') && description.includes('door'))) {
            inventoryItemId = tryMatch('door/window trim');
          } else if (description.includes('flower box')) {
            inventoryItemId = tryMatch('flower box kit');
          } else if (description.includes('skid')) {
            inventoryItemId = tryMatch('foundation skids');
          } else if (description.includes('runner')) {
            inventoryItemId = tryMatch('runners');
          } else if (description.includes('concrete block')) {
            inventoryItemId = tryMatch('concrete blocks');
          } else if (description.includes('landscape fabric')) {
            inventoryItemId = tryMatch('landscape fabric');
          } else if (description.includes('border')) {
            inventoryItemId = tryMatch('border');
          } else if (description.includes('house wrap')) {
            inventoryItemId = tryMatch('house wrap');
          } else if (description.includes('siding')) {
            inventoryItemId = tryMatch('siding');
          } else if (description.includes('shutter')) {
            inventoryItemId = tryMatch('shutters');
          } else if (description.includes('door') && description.includes('hinge')) {
            inventoryItemId = tryMatch('hinges');
          } else if (description.includes('handle') || description.includes('latch')) {
            inventoryItemId = tryMatch('handle/latch');
          } else if (description.includes('door') && !description.includes('trim') && !description.includes('hinge') && !description.includes('handle')) {
            inventoryItemId = tryMatch('door');
          } else if (description.includes('barn door hardware')) {
            inventoryItemId = tryMatch('door hardware');
          } else if (description.includes('shelf support') || description.includes('shelf bracket')) {
            inventoryItemId = tryMatch('shelf supports') || tryMatch('shelf brackets');
          } else if (description.includes('plywood shelving')) {
            inventoryItemId = tryMatch('plywood shelving');
          } else if (description.includes('hurricane')) {
            inventoryItemId = tryMatch('hurricane ties');
          } else if (description.includes('felt') || description.includes('underlayment')) {
            inventoryItemId = tryMatch('felt underlayment');
          } else if (description.includes('shingle')) {
            inventoryItemId = tryMatch('roof shingles');
          } else if (description.includes('ridge cap')) {
            inventoryItemId = tryMatch('ridge cap');
          } else if (description.includes('drip edge')) {
            inventoryItemId = tryMatch('drip edge');
          } else if (description.includes('roofing nail')) {
            inventoryItemId = tryMatch('roofing nails');
          } else if (description.includes('window')) {
            inventoryItemId = tryMatch('windows');
          }
        }

        // If description-based smart matching didn't yield anything, fall back to direct category matching
        if (!inventoryItemId) {
          inventoryItemId = resolveOverride(categoryKey);
          if (inventoryItemId && !inventoryMapById.has(inventoryItemId)) {
            inventoryItemId = undefined;
          }
          if (inventoryItemId) {
            matchedDefaultKey = categoryKey;
          }
        }

        if (inventoryItemId) {
          inventoryItem = inventoryMapById.get(inventoryItemId);
        }
      }
      
      // STRATEGY 3: Fallback fuzzy match directly against inventory names.
      if (!inventoryItem) {
        inventoryItem = fallbackMatchInventoryByDescription(material, Array.from(inventoryMapById.values()));
        if (inventoryItem) {
          matchMethod = 'Fallback name match';
        }
      }

      if (inventoryItem) {
        // Convert from cents to dollars for T1 pricing (unit_price)
        const t1Price = inventoryItem.unit_price / 100;
        const costPrice = inventoryItem.cost / 100;

        // Apply conversion factor if provided (e.g., screws sold by the box, tape by the roll)
        // CF is a multiplier: convertedQty = rawQty × CF
        // Pricing is PROPORTIONAL (no rounding): total = rawQty × CF × unitPrice
        // e.g., 12 ft of flashing tape, roll=$799, CF=0.0033 → 12 × 0.0033 × $799 = $31.64
        // e.g., 20 lbs deck screws, box=$X, CF=0.04 → 20 × 0.04 × $X = 0.8 × $X
        const cf = (matchedDefaultKey && conversionFactors?.[matchedDefaultKey]) || 1;
        const hasCF = cf !== 1 && cf > 0;
        const convertedQty = hasCF ? material.quantity * cf : material.quantity;
        const orderQty = hasCF ? Math.ceil(convertedQty) : material.quantity; // whole units to order

        // Proportional pricing based on actual usage, not rounded-up order qty
        const total = t1Price * convertedQty;
        
        totalT1Price += total;
        
        const matchedUnitOfMeasure = inventoryItem.unit_of_measure || material.unit || 'ea';
        return {
          ...material,
          itemId: inventoryItem.id, // Use the inventory item's ID
          name: inventoryItem.name, // Add inventory item name
          sku: inventoryItem.sku || '',
          unitPrice: t1Price,
          cost: costPrice,
          totalCost: total,
          originalDescription: material.description,
          description: material.description || inventoryItem.description,
          unit_of_measure: matchedUnitOfMeasure,
          unitOfMeasure: matchedUnitOfMeasure,
          unit: matchedUnitOfMeasure,
          ...(hasCF ? {
            conversionFactor: cf,
            convertedQuantity: convertedQty,
            orderQuantity: orderQty,
            convertedUnit: cf >= 1 ? `box${orderQty !== 1 ? 'es' : ''}` : 'each',
          } : {}),
        };
      }
      
      return material;
    });

    return {
      materials: enrichedMaterials,
      totalT1Price,
    };
  } catch (error) {
    console.error('[enrichMaterialsWithT1Pricing] Error enriching materials:', error);
    return { materials, totalT1Price: 0 };
  }
}
