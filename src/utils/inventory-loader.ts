import { createClient } from './supabase/client';
import { buildInventoryOrSearchClause, expandInventorySearchTerms } from './inventory-keywords';

const supabase = createClient();

export interface LoadInventoryOptions {
  organizationId: string;
  currentPage: number;
  itemsPerPage: number;
  searchQuery?: string;
  categoryFilter?: string;
  statusFilter?: string;
}

export interface LoadInventoryResult {
  items: any[];
  totalCount: number;
  loadTime: number;
  totalValue?: number; // Total inventory value for filtered results
  activeCount?: number; // Count of active items in filtered results
  lowStockCount?: number; // Count of items with quantity <= 0
  outOfStockCount?: number; // Count of items with quantity = 0
}

/**
 * Parse natural language search queries for price filters
 */
function parseSearchQuery(query: string): {
  searchTerms: string;
  priceFilter?: { operator: 'lt' | 'gt' | 'gte' | 'lte', value: number };
} {
  if (!query || !query.trim()) {
    return { searchTerms: '' };
  }

  let cleanedQuery = query.toLowerCase();
  let priceFilter: { operator: 'lt' | 'gt' | 'gte' | 'lte', value: number } | undefined;

  // Check for price patterns
  const pricePatterns = [
    { regex: /under\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'lt' as const },
    { regex: /less\s+than\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'lt' as const },
    { regex: /below\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'lt' as const },
    { regex: /over\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'gt' as const },
    { regex: /more\s+than\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'gt' as const },
    { regex: /above\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'gt' as const },
  ];

  for (const pattern of pricePatterns) {
    const match = cleanedQuery.match(pattern.regex);
    if (match) {
      priceFilter = {
        operator: pattern.operator,
        value: parseFloat(match[1]),
      };
      // Remove the price phrase from the search query
      cleanedQuery = cleanedQuery.replace(pattern.regex, ' ');
      break;
    }
  }

  // Remove standalone prices like "$40"
  cleanedQuery = cleanedQuery.replace(/\$\d+(?:\.\d{2})?/gi, ' ');

  // Clean up extra spaces
  const searchTerms = cleanedQuery.replace(/\s+/g, ' ').trim();

  return { searchTerms, priceFilter };
}

/**
 * Simple stemming function to handle singular/plural
 */
function stem(word: string): string {
  word = word.toLowerCase();
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * ⚡ Optimized server-side paginated inventory loader
 * Only loads the current page of items - MUCH faster than loading all 35k+ items
 */
export async function loadInventoryPage(options: LoadInventoryOptions): Promise<LoadInventoryResult> {
  const startTime = performance.now();
  const { organizationId, currentPage, itemsPerPage, searchQuery, categoryFilter, statusFilter } = options;
  
  try {
    // Calculate pagination range
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    // Build query with server-side filtering
    // ✅ Use select('*') to avoid errors when optional columns (price_tier_*, department_code, unit_of_measure) haven't been added yet
    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);
    
    // ⚡ Enhanced server-side search with natural language support
    if (searchQuery && searchQuery.trim()) {
      const { searchTerms, priceFilter } = parseSearchQuery(searchQuery);
      
      // Apply text search if there are search terms
      if (searchTerms) {
        const expandedTerms = expandInventorySearchTerms(searchTerms);
        const orClause = buildInventoryOrSearchClause(expandedTerms);
        if (orClause) {
          query = query.or(orClause);
        }
      }
      
      // Apply price filter if present
      // ✅ FIX: Convert dollar value to cents since unit_price is stored in cents
      if (priceFilter) {
        const priceInCents = Math.round(priceFilter.value * 100);
        
        if (priceFilter.operator === 'lt') {
          query = query.lt('unit_price', priceInCents);
        } else if (priceFilter.operator === 'gt') {
          query = query.gt('unit_price', priceInCents);
        } else if (priceFilter.operator === 'lte') {
          query = query.lte('unit_price', priceInCents);
        } else if (priceFilter.operator === 'gte') {
          query = query.gte('unit_price', priceInCents);
        }
      }
    }
    
    // ⚡ Server-side category filtering
    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }
    
    // Apply sorting and pagination
    query = query
      .order('name', { ascending: true })
      .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Database error: ${error.message} (Code: ${error.code || 'unknown'})`);
    }
    
    // 📊 Calculate total value for ALL filtered results (not just current page)
    // ✅ Formula: Total Value = Σ(cost × quantity_on_hand)
    // ✅ FIX: Paginate the aggregate query since Supabase default limit is 1000 rows.
    // Without pagination, only the first 1000 items contribute to the total — massively
    // understating the value for inventories with 10K+ items.
    let totalValue = 0;
    {
      const AGG_BATCH = 5000;
      let aggOffset = 0;
      let totalAggRows = 0;
      let costDivisor = 100; // Default: assume cents. Will auto-detect from first batch.
      let detectedFormat: 'cents' | 'dollars' | 'unknown' = 'unknown';

      while (true) {
        let aggQuery = supabase
          .from('inventory')
          .select('quantity, cost, unit_price')  // ✅ Include unit_price as fallback
          .eq('organization_id', organizationId)
          .order('id', { ascending: true })  // ✅ Deterministic order for stable pagination
          .range(aggOffset, aggOffset + AGG_BATCH - 1);

        // Apply same search/category filters as the main query
        if (searchQuery && searchQuery.trim()) {
          const { searchTerms, priceFilter } = parseSearchQuery(searchQuery);
          if (searchTerms) {
            const expandedTerms = expandInventorySearchTerms(searchTerms);
            const orClause = buildInventoryOrSearchClause(expandedTerms);
            if (orClause) {
              aggQuery = aggQuery.or(orClause);
            }
          }
          if (priceFilter) {
            const priceInCents = Math.round(priceFilter.value * 100);
            if (priceFilter.operator === 'lt') aggQuery = aggQuery.lt('unit_price', priceInCents);
            else if (priceFilter.operator === 'gt') aggQuery = aggQuery.gt('unit_price', priceInCents);
            else if (priceFilter.operator === 'lte') aggQuery = aggQuery.lte('unit_price', priceInCents);
            else if (priceFilter.operator === 'gte') aggQuery = aggQuery.gte('unit_price', priceInCents);
          }
        }
        if (categoryFilter && categoryFilter !== 'all') {
          aggQuery = aggQuery.eq('category', categoryFilter);
        }

        const { data: aggData, error: aggError } = await aggQuery;
        if (aggError) {
          break;
        }
        if (!aggData || aggData.length === 0) break;

        // 🔍 Auto-detect cost format from first batch
        if (aggOffset === 0 && aggData.length > 0) {
          // Gather non-null, non-zero cost values (or fall back to unit_price)
          const sampleValues = aggData
            .map((item: any) => item.cost ?? item.unit_price)
            .filter((v: any) => v != null && v > 0);

          if (sampleValues.length >= 5) {
            const sorted = [...sampleValues].sort((a: number, b: number) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const max = sorted[sorted.length - 1];

            // Heuristic: if median cost < 200, values are almost certainly in dollars
            // (a $2 item in cents = 200; typical products cost $5-$500)
            // If median >= 200, values are likely in cents (a $2 item = 200, $15 = 1500)
            // Also check: if max < 1000, almost certainly dollars (would mean max $10 in cents)
            if (median < 200 || max < 1000) {
              costDivisor = 1;
              detectedFormat = 'dollars';
            } else {
              costDivisor = 100;
              detectedFormat = 'cents';
            }
          }
        }

        totalAggRows += aggData.length;
        totalValue += aggData.reduce((sum: number, item: any) => {
          const quantity = item.quantity || 0;
          // ✅ FIX: Use cost if available, otherwise fall back to unit_price
          const rawValue = item.cost ?? item.unit_price ?? 0;
          // ✅ FIX: Use auto-detected divisor (1 for dollars, 100 for cents)
          return sum + (quantity * rawValue / costDivisor);
        }, 0);

        if (aggData.length < AGG_BATCH) break;
        aggOffset += aggData.length;
      }
    }

    // 📊 Get low stock count (quantity <= 0) using count-only query (very fast, no data returned)
    let lowStockQuery = supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lte('quantity', 0);

    // Apply same filters
    if (searchQuery && searchQuery.trim()) {
      const { searchTerms, priceFilter } = parseSearchQuery(searchQuery);
      if (searchTerms) {
        const expandedTerms = expandInventorySearchTerms(searchTerms);
        const orClause = buildInventoryOrSearchClause(expandedTerms);
        if (orClause) {
          lowStockQuery = lowStockQuery.or(orClause);
        }
      }
      if (priceFilter) {
        const priceInCents = Math.round(priceFilter.value * 100);
        if (priceFilter.operator === 'lt') lowStockQuery = lowStockQuery.lt('unit_price', priceInCents);
        else if (priceFilter.operator === 'gt') lowStockQuery = lowStockQuery.gt('unit_price', priceInCents);
        else if (priceFilter.operator === 'lte') lowStockQuery = lowStockQuery.lte('unit_price', priceInCents);
        else if (priceFilter.operator === 'gte') lowStockQuery = lowStockQuery.gte('unit_price', priceInCents);
      }
    }
    if (categoryFilter && categoryFilter !== 'all') {
      lowStockQuery = lowStockQuery.eq('category', categoryFilter);
    }

    const { count: lowStockCount } = await lowStockQuery;

    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    return {
      items: data || [],
      totalCount: count || 0,
      totalValue,
      lowStockCount: lowStockCount || 0,
      loadTime,
    };
  } catch (error) {
    const endTime = performance.now();
    throw error;
  }
}

/**
 * Check for duplicate SKUs in the database (runs async without blocking UI).
 * Uses paginated fetch to handle 78K+ items (Supabase default limit is 1000).
 */
export async function checkForDuplicates(organizationId: string): Promise<number> {
  try {
    // Paginated fetch of all SKUs
    let allSkus: string[] = [];
    let offset = 0;
    const PAGE = 10000;

    while (true) {
      const { data, error } = await supabase
        .from('inventory')
        .select('sku')
        .eq('organization_id', organizationId)
        .not('sku', 'is', null)
        .range(offset, offset + PAGE - 1);

      if (error) {
        break;
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        if (item.sku) allSkus.push(item.sku);
      }

      if (data.length < PAGE) break;
      offset += data.length;
    }

    if (allSkus.length === 0) return 0;

    const skuMap = new Map<string, number>();
    for (const sku of allSkus) {
      skuMap.set(sku, (skuMap.get(sku) || 0) + 1);
    }

    let dupCount = 0;
    for (const [_, count] of skuMap) {
      if (count > 1) dupCount++;
    }

    return dupCount;
  } catch (error) {
    return 0;
  }
}