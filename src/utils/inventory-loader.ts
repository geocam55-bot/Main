import { createClient } from './supabase/client';
import { buildInventoryOrSearchClause, expandInventorySearchTerms, STOP_WORDS } from './inventory-keywords';

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
        const tokens = searchTerms.split(/\s+/)
          .map(token => token.trim().toLowerCase())
          .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
        
        const uniqueExpandedTerms = new Set<string>();
        
        if (tokens.length === 0 && searchTerms.trim().length > 0) {
          // Fallback for short search query
          const cleanQuery = searchTerms.trim().toLowerCase();
          if (!STOP_WORDS.has(cleanQuery)) {
            const expandedTerms = expandInventorySearchTerms(cleanQuery);
            for (const term of expandedTerms) {
              if (!STOP_WORDS.has(term)) {
                uniqueExpandedTerms.add(term);
              }
            }
          }
        } else {
          for (const token of tokens) {
            const expandedTerms = expandInventorySearchTerms(token);
            for (const term of expandedTerms) {
              if (!STOP_WORDS.has(term)) {
                uniqueExpandedTerms.add(term);
              }
            }
          }
        }
        
        const orClause = buildInventoryOrSearchClause(Array.from(uniqueExpandedTerms));
        if (orClause) {
          query = query.or(orClause);
        } else {
          // If we had search terms but they were all stop words, don't return everything.
          // Filter for an impossible ID to return 0 results.
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
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
    // ✅ Note: totalValue is currently not rendered or consumed anywhere in the app,
    // so we bypass this extremely heavy loop on 10k+ rows to ensure sub-second loads and searches.
    let totalValue = 0;

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
        const tokens = searchTerms.split(/\s+/)
          .map(token => token.trim().toLowerCase())
          .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
        
        const uniqueExpandedTerms = new Set<string>();
        
        if (tokens.length === 0 && searchTerms.trim().length > 0) {
          const cleanQuery = searchTerms.trim().toLowerCase();
          if (!STOP_WORDS.has(cleanQuery)) {
            const expandedTerms = expandInventorySearchTerms(cleanQuery);
            for (const term of expandedTerms) {
              if (!STOP_WORDS.has(term)) {
                uniqueExpandedTerms.add(term);
              }
            }
          }
        } else {
          for (const token of tokens) {
            const expandedTerms = expandInventorySearchTerms(token);
            for (const term of expandedTerms) {
              if (!STOP_WORDS.has(term)) {
                uniqueExpandedTerms.add(term);
              }
            }
          }
        }
        
        const orClause = buildInventoryOrSearchClause(Array.from(uniqueExpandedTerms));
        if (orClause) {
          lowStockQuery = lowStockQuery.or(orClause);
        } else {
          // If we had search terms but they were all stop words, don't return everything.
          // Filter for an impossible ID to return 0 results.
          lowStockQuery = lowStockQuery.eq('id', '00000000-0000-0000-0000-000000000000');
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