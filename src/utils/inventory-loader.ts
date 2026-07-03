import { createClient } from './supabase/client';
import { buildInventoryOrSearchClause, buildInventoryAndSearchClause, expandInventorySearchTerms, STOP_WORDS } from './inventory-keywords';

const supabase = createClient();

export interface LoadInventoryOptions {
  organizationId: string;
  currentPage: number;
  itemsPerPage: number;
  searchQuery?: string;
  categoryFilter?: string;
  statusFilter?: string;
  useAdvancedSearch?: boolean;
}

export interface LoadInventoryResult {
  items: any[];
  totalCount: number;
  loadTime: number;
  totalValue?: number; // Total inventory value for filtered results
  activeCount?: number; // Count of active items in filtered results
  lowStockCount?: number; // Count of items with quantity <= 0
  outOfStockCount?: number; // Count of items with quantity = 0
  aiExplanation?: string;
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
  const { organizationId, currentPage, itemsPerPage, searchQuery, categoryFilter, statusFilter, useAdvancedSearch } = options;
  
  try {
    // Calculate pagination range
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    // Build queries
    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    let lowStockQuery = supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lte('quantity', 0);

    let aiExplanation = '';

    // If search is active, parse and apply filters
    if (searchQuery && searchQuery.trim()) {
      let parsedParams: any = null;

      if (useAdvancedSearch) {
        try {
          const res = await fetch('/api/search/conversational', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: searchQuery })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.parsed) {
              parsedParams = data.parsed;
              aiExplanation = parsedParams.explanation || '';
            }
          }
        } catch (fetchErr) {
          console.error("Failed to fetch conversational search from backend:", fetchErr);
        }
      }

      // Helper function to apply a parsed filter set to a given query builder
      const applyFilters = (q: any, isLowStockCheck: boolean) => {
        if (parsedParams) {
          // 1. Search terms
          if (parsedParams.searchTerms && parsedParams.searchTerms.trim()) {
            const andClause = buildInventoryAndSearchClause(parsedParams.searchTerms);
            if (andClause) {
              q = q.or(andClause);
            } else {
              q = q.eq('id', '00000000-0000-0000-0000-000000000000');
            }
          }

          // 2. Category (if present in conversational search)
          if (parsedParams.category) {
            q = q.eq('category', parsedParams.category);
          }

          // 3. Price Filter
          if (parsedParams.priceFilter) {
            const priceInCents = Math.round(parsedParams.priceFilter.value * 100);
            if (parsedParams.priceFilter.operator === 'lt') {
              q = q.lt('unit_price', priceInCents);
            } else if (parsedParams.priceFilter.operator === 'gt') {
              q = q.gt('unit_price', priceInCents);
            } else if (parsedParams.priceFilter.operator === 'lte') {
              q = q.lte('unit_price', priceInCents);
            } else if (parsedParams.priceFilter.operator === 'gte') {
              q = q.gte('unit_price', priceInCents);
            } else if (parsedParams.priceFilter.operator === 'eq') {
              q = q.eq('unit_price', priceInCents);
            }
          }

          // 4. Quantity Filter (skip lte 0 constraints on lowStockCheck to avoid logic conflicts)
          if (parsedParams.quantityFilter && !isLowStockCheck) {
            if (parsedParams.quantityFilter.operator === 'lt') {
              q = q.lt('quantity', parsedParams.quantityFilter.value);
            } else if (parsedParams.quantityFilter.operator === 'gt') {
              q = q.gt('quantity', parsedParams.quantityFilter.value);
            } else if (parsedParams.quantityFilter.operator === 'lte') {
              q = q.lte('quantity', parsedParams.quantityFilter.value);
            } else if (parsedParams.quantityFilter.operator === 'gte') {
              q = q.gte('quantity', parsedParams.quantityFilter.value);
            } else if (parsedParams.quantityFilter.operator === 'eq') {
              q = q.eq('quantity', parsedParams.quantityFilter.value);
            }
          }

          // 5. Supplier
          if (parsedParams.supplier) {
            q = q.ilike('supplier', `%${parsedParams.supplier}%`);
          }

          // 6. Location
          if (parsedParams.location) {
            q = q.ilike('location', `%${parsedParams.location}%`);
          }

          // 7. Status
          if (parsedParams.status) {
            q = q.eq('status', parsedParams.status);
          }
        } else {
          // Standard regex-based/basic parsing
          const { searchTerms, priceFilter } = parseSearchQuery(searchQuery);
          
          if (searchTerms) {
            const andClause = buildInventoryAndSearchClause(searchTerms);
            if (andClause) {
              q = q.or(andClause);
            } else {
              q = q.eq('id', '00000000-0000-0000-0000-000000000000');
            }
          }

          if (priceFilter) {
            const priceInCents = Math.round(priceFilter.value * 100);
            if (priceFilter.operator === 'lt') q = q.lt('unit_price', priceInCents);
            else if (priceFilter.operator === 'gt') q = q.gt('unit_price', priceInCents);
            else if (priceFilter.operator === 'lte') q = q.lte('unit_price', priceInCents);
            else if (priceFilter.operator === 'gte') q = q.gte('unit_price', priceInCents);
          }
        }
        return q;
      };

      query = applyFilters(query, false);
      lowStockQuery = applyFilters(lowStockQuery, true);
    }

    // Apply UI Category filtering (if not overridden/supplied by AI or as fallback)
    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
      lowStockQuery = lowStockQuery.eq('category', categoryFilter);
    }

    // Apply sorting and pagination to the main query
    query = query
      .order('name', { ascending: true })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message} (Code: ${error.code || 'unknown'})`);
    }

    const { count: lowStockCount } = await lowStockQuery;

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    return {
      items: data || [],
      totalCount: count || 0,
      totalValue: 0,
      lowStockCount: lowStockCount || 0,
      loadTime,
      aiExplanation
    };
  } catch (error) {
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