import { createClient } from './supabase/client';
import { getProjectWizardDefaults, getUserDefaults } from './project-wizard-defaults-client';

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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  if (cat === 'decking' || desc.includes('deck board') || desc.includes('decking') || desc.includes('tread')) {
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
    
    // Get project wizard defaults and optional user-level overrides.
    const [defaults, userDefaults] = await Promise.all([
      getProjectWizardDefaults(organizationId),
      userDefaultsOverride
        ? Promise.resolve(userDefaultsOverride)
        : userId
          ? getUserDefaults(userId, organizationId)
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

    // Get unique valid inventory item IDs.
    const inventoryItemIds = Array.from(new Set(defaultsByMaterialAndCategory.values())).filter(isUuid);
    
    let inventoryItems: Array<{ id: string; name: string; unit_price: number; cost: number; sku?: string; description?: string; unit_of_measure?: string }> = [];
    if (inventoryItemIds.length > 0) {
      // Fetch defaults-mapped inventory in chunks to avoid large id.in(...) filters.
      const idChunks = chunkArray(inventoryItemIds, 50);

      for (const idChunk of idChunks) {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, unit_price, cost, sku, description, unit_of_measure')
          .in('id', idChunk)
          .eq('organization_id', organizationId);

        if (!error && data) {
          inventoryItems = [...inventoryItems, ...data];
        }
      }
    }

    // Fallback: only attempt description-based matching when at least one default exists.
    // If defaults are completely wiped, keep pricing empty instead of re-populating via fuzzy matches.
    if (inventoryItems.length === 0 && defaultsByMaterialAndCategory.size > 0) {
      const { data } = await supabase
        .from('inventory')
        .select('id, name, unit_price, cost, sku, description, unit_of_measure')
        .eq('organization_id', organizationId)
        .limit(2500);

      if (data) {
        inventoryItems = data;
      }
    }

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
        let matched = defaultsByMaterialAndCategory.get(`${itemMaterialType}::${baseKey}`);
        if (matched) return matched;

        // Try generic aluminum if color specific fails
        if (itemMaterialType.startsWith('aluminum-')) {
          matched = defaultsByMaterialAndCategory.get(`aluminum::${baseKey}`);
          if (matched) return matched;
        }

        // Try default/generic match
        matched = defaultsByMaterialAndCategory.get(`default::${baseKey}`);
        if (matched) return matched;

        // Check fallback map
        return fallbackDefaultsByCategory.get(baseKey);
      };

      // STRATEGY 2: Match by category using Project Wizard Defaults
      if (!inventoryItem) {
        const categoryKey = material.category.toLowerCase();
        let inventoryItemId = resolveOverride(categoryKey);
        if (inventoryItemId && !inventoryMapById.has(inventoryItemId)) {
          inventoryItemId = undefined;
        }
        matchedDefaultKey = inventoryItemId ? categoryKey : undefined;
        
        // If no direct category match, try smart matching based on description
        if (!inventoryItemId) {
          const description = material.description.toLowerCase();
          const isAluminum = itemMaterialType.startsWith('aluminum');
          
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

          // Smart matching for deck materials
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
          
          // -----------------------------------------------------------
          // Smart matching for garage materials
          // -----------------------------------------------------------
          if (!inventoryItemId && plannerType === 'garage') {
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
          }

          // -----------------------------------------------------------
          // Smart matching for shed materials
          // -----------------------------------------------------------
          if (!inventoryItemId && plannerType === 'shed') {
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
          description: inventoryItem.description,
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
    return { materials, totalT1Price: 0 };
  }
}
