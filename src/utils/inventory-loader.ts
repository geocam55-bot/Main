// @ts-nocheck
import { createClient } from './supabase/client';
import {
  buildInventoryAndSearchClause,
  buildInventoryExactPhraseClause,
  buildInventoryRelaxedSearchClause
} from './inventory-keywords';

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

function scoreExactMatchPriority(item: any, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 0;

  const name = String(item?.name || '').trim().toLowerCase();
  const shortDesc = String(item?.short_description || '').trim().toLowerCase();
  const sku = String(item?.sku || '').trim().toLowerCase();
  const upc = String(item?.upc || '').trim().toLowerCase();
  const supplierSku = String(item?.supplier_sku || '').trim().toLowerCase();
  const desc = String(item?.description || '').trim().toLowerCase();

  if (name === q || shortDesc === q || sku === q || upc === q || supplierSku === q) {
    return 1000;
  }
  if (desc === q) {
    return 900;
  }
  if (
    (name && name.startsWith(q)) ||
    (shortDesc && shortDesc.startsWith(q)) ||
    (sku && sku.startsWith(q))
  ) {
    return 800;
  }
  if (
    name.includes(q) ||
    shortDesc.includes(q) ||
    sku.includes(q) ||
    upc.includes(q) ||
    supplierSku.includes(q)
  ) {
    return 700;
  }
  if (desc.includes(q)) {
    return 500;
  }
  return 0;
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
    
    const PRIMARY_ORG_ID = '34638283-7b3d-47e2-bec8-a9e600e28c4a';
    const activeOrgId = (organizationId && organizationId !== 'default-org') ? organizationId : PRIMARY_ORG_ID;
    const rawSearch = (searchQuery || '').trim();
    const hasSearch = rawSearch.length > 0;
    const hasCategoryFilter = Boolean(categoryFilter && categoryFilter !== 'all');

    // Build queries
    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .eq('organization_id', activeOrgId);

    let lowStockQuery = supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', activeOrgId)
      .lte('quantity', 0);

    let priorityQuery: any = null;
    let aiExplanation = '';
    let parsedParams: any = null;

    // If search is active, parse and apply filters
    if (hasSearch) {
      if (useAdvancedSearch) {
        try {
          const res = await fetch('/api/search/conversational', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: rawSearch })
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

      const applyNumericAndMetaFilters = (q: any, isLowStockCheck: boolean) => {
        if (!parsedParams) return q;

        // Price Filter
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

        // Quantity Filter (skip lte 0 constraints on lowStockCheck to avoid logic conflicts)
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

        // Supplier
        if (parsedParams.supplier) {
          q = q.ilike('supplier', `%${parsedParams.supplier}%`);
        }

        // Location
        if (parsedParams.location) {
          q = q.ilike('location', `%${parsedParams.location}%`);
        }

        return q;
      };

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

          // 2. Category (validate against real database categories or search attributes)
          if (parsedParams.category) {
            const normCat = parsedParams.category.toUpperCase().trim();
            const validCategories = ['BUILDING MATERIALS', 'APPLIANCES', 'AUTOMOBILE'];
            const matched = validCategories.find(c => c === normCat);
            if (matched) {
              q = q.eq('category', matched);
            } else {
              if (!parsedParams.searchTerms || !parsedParams.searchTerms.toLowerCase().includes(parsedParams.category.toLowerCase())) {
                const combined = `${parsedParams.searchTerms || ''} ${parsedParams.category}`.trim();
                const andClause = buildInventoryAndSearchClause(combined);
                if (andClause) {
                  q = q.or(andClause);
                }
              }
            }
          }

          q = applyNumericAndMetaFilters(q, isLowStockCheck);
        } else {
          // Standard regex-based/basic parsing
          const { searchTerms, priceFilter } = parseSearchQuery(rawSearch);
          
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

      // Build exact/phrase priority query using untouched rawSearch so exact Item Names & SKUs always rank first
      const exactPhraseClause = buildInventoryExactPhraseClause(rawSearch);
      if (exactPhraseClause) {
        priorityQuery = supabase
          .from('inventory')
          .select('*')
          .eq('organization_id', activeOrgId)
          .or(exactPhraseClause);

        priorityQuery = applyNumericAndMetaFilters(priorityQuery, false);

        if (hasCategoryFilter) {
          priorityQuery = priorityQuery.eq('category', categoryFilter);
        }

        priorityQuery = priorityQuery
          .limit(Math.max(itemsPerPage, 100));
      }
    }

    // Apply UI Category filtering
    if (hasCategoryFilter) {
      query = query.eq('category', categoryFilter);
      lowStockQuery = lowStockQuery.eq('category', categoryFilter);
    }

    // Apply sorting and pagination to the main query
    query = query
      .order('name', { ascending: true })
      .range(from, to);

    // Execute main query and exact-phrase priority query concurrently (avoiding 3-way contention)
    const [mainResult, priorityResult] = await Promise.allSettled([
      query,
      priorityQuery || Promise.resolve({ data: [], error: null })
    ]);

    const priorityRawData =
      priorityResult.status === 'fulfilled' && !priorityResult.value?.error && Array.isArray(priorityResult.value?.data)
        ? priorityResult.value.data
        : [];

    const priorityData = [...priorityRawData].sort((a, b) => {
      const scoreDiff = scoreExactMatchPriority(b, rawSearch) - scoreExactMatchPriority(a, rawSearch);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });

    let data: any[] | null = null;
    let count: number | null = 0;

    if (mainResult.status === 'rejected') {
      if (priorityData.length === 0) {
        throw mainResult.reason;
      }
    } else {
      const mainVal = mainResult.value;
      if (mainVal.error) {
        // If main query timed out but priority exact/phrase query succeeded, surface priority matches instead of failing
        if (priorityData.length > 0) {
          data = [];
          count = priorityData.length;
        } else {
          throw new Error(`Database error: ${mainVal.error.message} (Code: ${mainVal.error.code || 'unknown'})`);
        }
      } else {
        data = mainVal.data;
        count = mainVal.count;
      }
    }

    // Fetch low-stock count separately only when results exist (avoids competing with main search on Postgres)
    let lowStockCount = 0;
    if ((count && count > 0) || priorityData.length > 0) {
      try {
        const lowStockRes = await lowStockQuery;
        if (!lowStockRes.error && typeof lowStockRes.count === 'number') {
          lowStockCount = lowStockRes.count;
        }
      } catch {
        // Non-critical count
      }
    }

    // Only allow cross-org fallback when browsing unfiltered default-org inventory with 0 rows
    if ((!data || data.length === 0) && !hasSearch && !hasCategoryFilter && (!statusFilter || statusFilter === 'all') && organizationId === 'default-org') {
      const fallbackRes = await supabase
        .from('inventory')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to);
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        count = fallbackRes.count || fallbackRes.data.length;
      }
    }

    // Progressive relaxation fallback: If strict conjunction AND exact-phrase returned 0 rows on a human query,
    // execute relaxed disjunction across keywords, attributes, and text columns within activeOrgId
    if ((!data || data.length === 0) && priorityData.length === 0 && hasSearch) {
      const relaxedSource = parsedParams?.searchTerms?.trim() || rawSearch;
      const relaxedClause = buildInventoryRelaxedSearchClause(relaxedSource);
      if (relaxedClause) {
        let fallbackQuery = supabase
          .from('inventory')
          .select('*', { count: 'exact' })
          .eq('organization_id', activeOrgId)
          .or(relaxedClause);

        if (hasCategoryFilter) {
          fallbackQuery = fallbackQuery.eq('category', categoryFilter);
        }

        fallbackQuery = fallbackQuery
          .order('name', { ascending: true })
          .range(from, to);

        const fallbackRes = await fallbackQuery;
        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
          count = fallbackRes.count || fallbackRes.data.length;
          if (!aiExplanation) {
            aiExplanation = `Showing relevant items for "${rawSearch}"`;
          }
        }
      }
    }

    // Merge prioritized exact/phrase matches at the top while deduplicating
    if (hasSearch && priorityData.length > 0) {
      const priorityIds = new Set(priorityData.map((item: any) => item.id));
      const baseData = Array.isArray(data) ? data : [];

      if (currentPage === 1) {
        const merged = [...priorityData.slice(0, itemsPerPage)];
        for (const item of baseData) {
          if (merged.length >= itemsPerPage) break;
          if (!priorityIds.has(item.id)) {
            merged.push(item);
          }
        }
        data = merged;
      } else if (from < priorityData.length) {
        const slice = priorityData.slice(from, to + 1);
        for (const item of baseData) {
          if (slice.length >= itemsPerPage) break;
          if (!priorityIds.has(item.id)) {
            slice.push(item);
          }
        }
        data = slice;
      } else {
        data = baseData.filter((item: any) => !priorityIds.has(item.id));
      }

      count = Math.max(count || 0, priorityData.length);
    }

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