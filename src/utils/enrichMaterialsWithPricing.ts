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


    // Build a lookup map: material_category -> inventory_item_id
    const defaultsMap = new Map<string, string>();
    const anyTypeDefaultsMap = new Map<string, string>();
    defaults.forEach(def => {
      if (def.planner_type === plannerType && def.inventory_item_id) {
        const categoryKey = def.material_category.toLowerCase();
        const defMaterialType = def.material_type?.toLowerCase();

        // Keep a planner-wide fallback map regardless of material type.
        if (!anyTypeDefaultsMap.has(categoryKey)) {
          anyTypeDefaultsMap.set(categoryKey, def.inventory_item_id);
        }

        // Match on material_type if both are provided
        if (normalizedMaterialType) {
          // Exact type match (highest priority)
          if (defMaterialType === normalizedMaterialType) {
            defaultsMap.set(categoryKey, def.inventory_item_id);
          }
          // Fallback for generic aluminum entries when using aluminum-white / aluminum-black
          else if (normalizedMaterialType.startsWith('aluminum-') && defMaterialType === 'aluminum') {
            if (!defaultsMap.has(categoryKey)) {
              defaultsMap.set(categoryKey, def.inventory_item_id);
            }
          }
          // Fallback for generic/default entries (only if exact not already set)
          else if (!defMaterialType || defMaterialType === 'default') {
            if (!defaultsMap.has(categoryKey)) {
              defaultsMap.set(categoryKey, def.inventory_item_id);
            }
          }
        } else {
          // No material type requested: use generic/default entries
          if (!defMaterialType || defMaterialType === 'default') {
            defaultsMap.set(categoryKey, def.inventory_item_id);
          }
        }
      }
    });

    // If no defaults matched the current material type, fall back to any planner defaults.
    if (defaultsMap.size === 0 && anyTypeDefaultsMap.size > 0) {
      anyTypeDefaultsMap.forEach((itemId, categoryKey) => {
        defaultsMap.set(categoryKey, itemId);
      });
    }

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

      const storedType = storedMaterialType.toLowerCase();
      const effectiveMaterialType = normalizedMaterialType || 'default';
      const isGenericAluminumFallback = effectiveMaterialType.startsWith('aluminum-') && storedType === 'aluminum';
      if (storedType !== effectiveMaterialType && storedType !== 'default' && !isGenericAluminumFallback) {
        return;
      }

      const userCategoryKey = categoryParts.join('-').toLowerCase();
      // Exact material-type user overrides win over generic/default user overrides.
      if (storedType === effectiveMaterialType) {
        defaultsMap.set(userCategoryKey, itemId);
      } else if (isGenericAluminumFallback) {
        if (!defaultsMap.has(userCategoryKey)) {
          defaultsMap.set(userCategoryKey, itemId);
        }
      } else if (!defaultsMap.has(userCategoryKey)) {
        defaultsMap.set(userCategoryKey, itemId);
      }
    });

    // Get unique valid inventory item IDs.
    const inventoryItemIds = Array.from(new Set(defaultsMap.values())).filter(isUuid);
    
    let inventoryItems: Array<{ id: string; name: string; unit_price: number; cost: number; sku?: string }> = [];
    if (inventoryItemIds.length > 0) {
      // Fetch defaults-mapped inventory in chunks to avoid large id.in(...) filters.
      const idChunks = chunkArray(inventoryItemIds, 50);

      for (const idChunk of idChunks) {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, unit_price, cost, sku')
          .in('id', idChunk)
          .eq('organization_id', organizationId);

        if (!error && data) {
          inventoryItems = [...inventoryItems, ...data];
        }
      }
    }

    // Fallback: only attempt description-based matching when at least one default exists.
    // If defaults are completely wiped, keep pricing empty instead of re-populating via fuzzy matches.
    if (inventoryItems.length === 0 && defaultsMap.size > 0) {
      const { data } = await supabase
        .from('inventory')
        .select('id, name, unit_price, cost, sku')
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

      // STRATEGY 2: Match by category using Project Wizard Defaults
      if (!inventoryItem) {
        const categoryKey = material.category.toLowerCase();
        let inventoryItemId = defaultsMap.get(categoryKey);
        matchedDefaultKey = inventoryItemId ? categoryKey : undefined;
        
        // If no direct category match, try smart matching based on description
        if (!inventoryItemId) {
          const description = material.description.toLowerCase();
          
          // -----------------------------------------------------------------
          // Length-aware matching: if the material specifies a lumberLength,
          // first try the length-specific default key (e.g. "joists (12')"),
          // then fall back to the generic key (e.g. "joists").
          // -----------------------------------------------------------------
          const tryLengthFirst = (baseKey: string): string | undefined => {
            if (material.lumberLength) {
              const lengthKey = `${baseKey} (${material.lumberLength}')`;
              const lengthMatch = defaultsMap.get(lengthKey);
              if (lengthMatch) {
                matchedDefaultKey = lengthKey;
                return lengthMatch;
              }
            }
            if (defaultsMap.has(baseKey)) {
              matchedDefaultKey = baseKey;
            }
            return defaultsMap.get(baseKey);
          };

          // Helper to match and track the key
          const tryMatch = (key: string): string | undefined => {
            const match = defaultsMap.get(key);
            if (match) matchedDefaultKey = key;
            return match;
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
          } else if (description.includes('railing post')) {
            inventoryItemId = tryMatch('railing posts');
          } else if (description.includes('aluminum posts')) {
            inventoryItemId = tryMatch('aluminum posts');
          } else if (description.includes('aluminum stair posts')) {
            inventoryItemId = tryMatch('aluminum stair posts');
          } else if (description.includes('aluminum top & bottom rail')) {
            inventoryItemId = tryMatch('aluminum top & bottom rail');
          } else if (description.includes('top rail') || description.includes('cap rail')) {
            inventoryItemId = tryMatch('railing top rail');
          } else if (description.includes('bottom rail')) {
            inventoryItemId = tryMatch('railing bottom rail');
          } else if (description.includes('tempered glass panel')) {
            inventoryItemId = tryMatch(description);
          } else if (description.includes('clear glass pickets (cdg-6)')) {
            inventoryItemId = tryMatch('clear glass pickets (cdg-6)');
          } else if (description.includes('angled stair glass pickets (cag-6)')) {
            inventoryItemId = tryMatch('angled stair glass pickets (cag-6)');
          } else if (description.includes('picket package')) {
            inventoryItemId = tryMatch('picket packages');
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
        
        return {
          ...material,
          itemId: inventoryItem.id, // Use the inventory item's ID
          name: inventoryItem.name, // Add inventory item name
          sku: inventoryItem.sku || '',
          unitPrice: t1Price,
          cost: costPrice,
          totalCost: total,
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
