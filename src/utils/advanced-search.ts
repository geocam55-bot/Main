import { generateInventoryKeywords } from './inventory-keywords';

/**
 * HELPER FUNCTIONS
 */
function extractSearchTerms(query: string): string[] {
  // Remove price-related phrases before extracting terms
  let cleanedQuery = query.toLowerCase();
  
  // Remove price patterns and their values
  const pricePatterns = [
    /under\s+\$?\d+(?:\.\d{2})?/gi,
    /less\s+than\s+\$?\d+(?:\.\d{2})?/gi,
    /below\s+\$?\d+(?:\.\d{2})?/gi,
    /over\s+\$?\d+(?:\.\d{2})?/gi,
    /more\s+than\s+\$?\d+(?:\.\d{2})?/gi,
    /above\s+\$?\d+(?:\.\d{2})?/gi,
    /\$?\d+(?:\.\d{2})?\s*-\s*\$?\d+(?:\.\d{2})?/gi,
    /\$\d+(?:\.\d{2})?/gi, // Remove standalone prices like "$40"
  ];
  
  for (const pattern of pricePatterns) {
    cleanedQuery = cleanedQuery.replace(pattern, ' ');
  }
  
  // Remove quantity-related phrases
  cleanedQuery = cleanedQuery.replace(/in\s+stock/gi, ' ');
  cleanedQuery = cleanedQuery.replace(/out\s+of\s+stock/gi, ' ');
  cleanedQuery = cleanedQuery.replace(/available/gi, ' ');
  cleanedQuery = cleanedQuery.replace(/unavailable/gi, ' ');
  
  return cleanedQuery
    .split(/\s+/)
    .filter(term => term.length > 0 && !['and', 'or', 'the', 'a', 'an', 'with', 'for'].includes(term));
}

function stem(word: string): string {
  word = word.toLowerCase();
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ed')) return word.slice(0, -2);
  return word;
}

function parseQueryIntent(query: string): QueryIntent[] {
  const intents: QueryIntent[] = [];
  const queryLower = query.toLowerCase();
  
  const pricePatterns = [
    { regex: /under\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'less' as const },
    { regex: /less\s+than\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'less' as const },
    { regex: /below\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'less' as const },
    { regex: /over\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'greater' as const },
    { regex: /more\s+than\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'greater' as const },
    { regex: /above\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'greater' as const },
    { regex: /\$?(\d+(?:\.\d{2})?)\s*-\s*\$?(\d+(?:\.\d{2})?)/i, operator: 'between' as const },
  ];
  
  for (const pattern of pricePatterns) {
    const match = queryLower.match(pattern.regex);
    if (match) {
      if (pattern.operator === 'between') {
        intents.push({
          type: 'price',
          operator: pattern.operator,
          value: parseFloat(match[1]),
          value2: parseFloat(match[2]),
        });
      } else {
        intents.push({
          type: 'price',
          operator: pattern.operator,
          value: parseFloat(match[1]),
        });
      }
    }
  }
  
  if (queryLower.includes('in stock') || queryLower.includes('available')) {
    intents.push({ type: 'status', operator: 'equal', value: 'active' });
  }
  if (queryLower.includes('out of stock') || queryLower.includes('unavailable')) {
    intents.push({ type: 'quantity', operator: 'equal', value: 0 });
  }
  
  return intents;
}

function expandSemanticQuery(query: string): string[] {
  const semanticMap: Record<string, string[]> = {
    'tool': ['equipment', 'implement', 'device', 'instrument'],
    'paint': ['coating', 'finish', 'stain', 'varnish'],
    'screw': ['fastener', 'bolt', 'nail'],
    'wood': ['lumber', 'timber', 'plywood'],
    'red': ['crimson', 'scarlet', 'burgundy'],
    'blue': ['navy', 'azure', 'cobalt'],
    'large': ['big', 'huge', 'massive'],
    'small': ['tiny', 'mini', 'compact'],
  };
  
  const queryLower = query.toLowerCase();
  const synonyms: string[] = [];
  
  if (query.split(/\s+/).length > 3) {
    return [];
  }
  
  for (const [key, values] of Object.entries(semanticMap)) {
    if (queryLower.includes(key)) {
      synonyms.push(...values);
    }
  }
  
  return synonyms;
}

function normalizeTagList(tags: unknown): string[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  }

  if (typeof tags === 'string') {
    return tags.split(/[\s,]+/).map(tag => tag.trim()).filter(Boolean);
  }

  if (typeof tags === 'object') {
    return Object.values(tags as Record<string, unknown>)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map(value => value.trim());
  }

  return [];
}

const fuzzyMemo = new Map<string, number>();

function advancedFuzzyMatch(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  
  const maxLen = Math.max(str1.length, str2.length);
  const minLen = Math.min(str1.length, str2.length);
  if (maxLen === 0) return 0;
  
  // Quick rejection if length difference is too large to possibly match
  if (minLen / maxLen < 0.5) return 0;

  const memoKey = `${str1}|${str2}`;
  if (fuzzyMemo.has(memoKey)) {
    return fuzzyMemo.get(memoKey)!;
  }

  const jaroScore = jaroWinkler(str1, str2);
  
  // If Jaro is very low, don't compute Levenshtein/n-gram to save CPU
  if (jaroScore < 0.5) {
    const score = jaroScore * 0.4;
    fuzzyMemo.set(memoKey, score);
    return score;
  }
  
  const levenshteinScore = 1 - (levenshteinDistance(str1, str2) / maxLen);
  const ngramScore = ngramSimilarity(str1, str2, 2);
  
  const finalScore = (levenshteinScore * 0.4) + (jaroScore * 0.4) + (ngramScore * 0.2);
  fuzzyMemo.set(memoKey, finalScore);
  return finalScore;
}

function levenshteinDistance(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  let v0 = new Array(str2.length + 1);
  let v1 = new Array(str2.length + 1);

  for (let i = 0; i <= str2.length; i++) {
    v0[i] = i;
  }

  for (let i = 0; i < str1.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < str2.length; j++) {
      const cost = (str1[i] === str2[j]) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= str2.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v0[str2.length];
}

function jaroWinkler(str1: string, str2: string): number {
  const jaro = jaroSimilarity(str1, str2);
  let prefixLength = 0;
  for (let i = 0; i < Math.min(4, str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }
  return jaro + (prefixLength * 0.1 * (1 - jaro));
}

function jaroSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const matchWindow = Math.max(str1.length, str2.length) / 2 - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (k < str2Matches.length && !str2Matches[k]) k++;
    if (k < str2.length && str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (
    (matches / str1.length +
    matches / str2.length +
    (matches - transpositions / 2) / matches) / 3
  );
}

function ngramSimilarity(str1: string, str2: string, n: number): number {
  const ngrams1 = getNgrams(str1, n);
  const ngrams2 = getNgrams(str2, n);
  
  const intersection = ngrams1.filter(ng => ngrams2.includes(ng)).length;
  const union = new Set([...ngrams1, ...ngrams2]).size;
  
  return union === 0 ? 0 : intersection / union;
}

function getNgrams(str: string, n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= str.length - n; i++) {
    ngrams.push(str.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Types
 */
interface SearchableItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  supplier?: string;
  barcode?: string;
  location?: string;
  tags?: string[];
  status: string;
  priceTier1: number;
  quantityOnHand: number;
}

interface SearchOptions {
  fuzzyThreshold?: number;
  includeInactive?: boolean;
  minScore?: number;
  maxResults?: number;
  sortBy?: 'relevance' | 'name' | 'price' | 'quantity';
  sortOrder?: 'asc' | 'desc';
}

interface SearchResult<T> {
  item: T;
  score: number;
  matchedFields: string[];
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'partial';
}

interface QueryIntent {
  type: 'price' | 'quantity' | 'status';
  operator: 'less' | 'greater' | 'equal' | 'between';
  value: number | string;
  value2?: number;
}

/**
 * Advanced search function with fuzzy matching, semantic understanding, and NLP
 * Optimized for large datasets (10k+ items)
 */
export function advancedSearch<T extends SearchableItem>(
  items: T[],
  query: string,
  options: SearchOptions = {}
): SearchResult<T>[] {
  // Prevent memory leak by capping or clearing the cache periodically
  if (fuzzyMemo.size > 10000) {
    fuzzyMemo.clear();
  }
  const {
    fuzzyThreshold = 0.7,
    includeInactive = true,
    minScore = 0.3,
    maxResults = 100,
    sortBy = 'relevance',
    sortOrder = 'desc',
  } = options;
  
  if (!query || query.trim().length === 0) {
    return items.map(item => ({
      item,
      score: 1,
      matchedFields: [],
      matchType: 'exact' as const,
    }));
  }
  
  const queryLower = query.toLowerCase().trim();
  const searchTerms = extractSearchTerms(query);
  const intents = parseQueryIntent(query);
  
  // ⚡ Performance optimization: Only expand semantic query if we have search terms
  const semanticTerms = searchTerms.length > 0 ? expandSemanticQuery(query) : [];
  
  const results: SearchResult<T>[] = [];
  
  // ⚡ Performance: Pre-compute stemmed versions of search terms once
  const stemmedSearchTerms = searchTerms.map(term => ({ original: term, stemmed: stem(term) }));
  
  for (const item of items) {
    // Skip inactive items if not requested
    if (!includeInactive && item.status !== 'active') {
      continue;
    }
    
    let totalScore = 0;
    let matchCount = 0;
    const matchedFields: string[] = [];
    let bestMatchType: 'exact' | 'fuzzy' | 'semantic' | 'partial' = 'partial';
    const normalizedTags = normalizeTagList(item.tags);
    
    const generatedKeywords = generateInventoryKeywords({
      productName: item.name,
      productDescription: item.description,
      category: item.category,
      sku: item.sku,
      supplierName: item.supplier,
      existingTags: normalizedTags,
    });

    // Fields to search with their weights
    const searchFields = [
      { field: 'name', weight: 10, value: item.name },
      { field: 'sku', weight: 8, value: item.sku },
      { field: 'item_number', weight: 9, value: (item as any).item_number }, // High priority for item numbers
      { field: 'description', weight: 6, value: item.description },
      { field: 'category', weight: 7, value: item.category },
      { field: 'supplier', weight: 4, value: item.supplier },
      { field: 'barcode', weight: 5, value: item.barcode },
      { field: 'location', weight: 3, value: item.location },
      { field: 'tags', weight: 5, value: normalizedTags.join(' ') },
      { field: 'ai_keywords', weight: 6, value: generatedKeywords.all.join(' ') },
    ];
    
    // For multi-word queries, check if ALL search terms appear somewhere in the item
    // (across all fields combined)
    if (searchTerms.length > 0) {
      const allFieldsText = searchFields
        .map(f => f.value || '')
        .join(' ')
        .toLowerCase();
      
      // Check if all search terms are present (order doesn't matter)
      // IMPORTANT: Check both original terms AND stemmed versions
      const allTermsPresent = searchTerms.every(term => {
        const stemmedTerm = stem(term);
        return allFieldsText.includes(term) || allFieldsText.includes(stemmedTerm);
      });
      
      // If not all terms are present, skip this item entirely
      if (!allTermsPresent) {
        continue;
      }
      
      // Bonus score for having all terms present (important for 3+ word searches)
      // This ensures items with all terms rank higher even if spread across fields
      if (allTermsPresent && searchTerms.length >= 2) {
        totalScore += searchTerms.length * 50; // Significant bonus for multi-term matches
        matchCount += searchTerms.length;
      }
    }
    
    // 1. Check each field for matches
    for (const { field, weight, value } of searchFields) {
      if (!value) continue;
      
      const fieldValue = value.toLowerCase();
      
      // Exact match (highest score)
      if (fieldValue === queryLower) {
        totalScore += weight * 10;
        matchCount++;
        matchedFields.push(field);
        bestMatchType = 'exact';
        continue;
      }
      
      // Stemmed exact match (e.g., "hammers" matches "hammer")
      const stemmedQuery = stem(queryLower);
      const stemmedField = stem(fieldValue);
      if (stemmedField === stemmedQuery && stemmedQuery !== queryLower) {
        totalScore += weight * 9.5; // Very high score, just below exact
        matchCount++;
        matchedFields.push(field);
        bestMatchType = 'exact';
        continue;
      }
      
      // Contains exact query
      if (fieldValue.includes(queryLower)) {
        totalScore += weight * 8;
        matchCount++;
        matchedFields.push(field);
        if (bestMatchType !== 'exact') {
          bestMatchType = 'partial';
        }
        continue;
      }
      
      // Contains stemmed query (e.g., "hammer" in field matches "hammers" query)
      if (stemmedQuery !== queryLower && fieldValue.includes(stemmedQuery)) {
        totalScore += weight * 7.5; // High score for stemmed match
        matchCount++;
        matchedFields.push(field);
        if (bestMatchType !== 'exact') {
          bestMatchType = 'partial';
        }
        continue;
      }
      
      // Query contains field value (for shorter field values)
      if (queryLower.includes(fieldValue) && fieldValue.length >= 3) {
        totalScore += weight * 7;
        matchCount++;
        matchedFields.push(field);
        if (bestMatchType !== 'exact') {
          bestMatchType = 'partial';
        }
        continue;
      }
      
      // Multi-word phrase matching: Check if ALL search terms appear in this field
      // This handles cases like "GAF T" matching "GAF Timbertex"
      if (searchTerms.length > 1) {
        const allTermsMatch = searchTerms.every(term => fieldValue.includes(term));
        if (allTermsMatch) {
          // High score bonus for matching all terms
          totalScore += weight * 7;
          matchCount++;
          matchedFields.push(field);
          if (bestMatchType !== 'exact') {
            bestMatchType = 'partial';
          }
          continue;
        }
        
        // Also check with stemmed terms
        const allStemmedTermsMatch = searchTerms.every(term => {
          const stemmedTerm = stem(term);
          return fieldValue.includes(term) || fieldValue.includes(stemmedTerm);
        });
        if (allStemmedTermsMatch) {
          totalScore += weight * 6.5;
          matchCount++;
          matchedFields.push(field);
          if (bestMatchType !== 'exact') {
            bestMatchType = 'partial';
          }
          continue;
        }
      }
      
      // Semantic match
      for (const term of semanticTerms) {
        if (fieldValue.includes(term)) {
          totalScore += weight * 6;
          matchCount++;
          matchedFields.push(field);
          if (bestMatchType === 'partial') {
            bestMatchType = 'semantic';
          }
          break;
        }
      }
      
      // Fuzzy match
      const words = fieldValue.split(/\s+/);
      for (const word of words) {
        // Check if stemmed versions of individual words match
        const stemmedWord = stem(word);
        const stemmedQuery = stem(queryLower);
        
        // Direct word-to-query comparison (handles "hammers" in field matching "hammer" query)
        if (word === queryLower) {
          totalScore += weight * 6;
          matchCount++;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
          break;
        }
        
        // Stemmed word comparison (handles "hammer" in field matching "hammers" query)
        if (stemmedWord === stemmedQuery) {
          totalScore += weight * 5.8;
          matchCount++;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
          bestMatchType = 'exact';
          break;
        }
        
        // Use advanced fuzzy matching that combines multiple algorithms
        const fuzzyScore = advancedFuzzyMatch(word, queryLower);
        if (fuzzyScore >= fuzzyThreshold) {
          totalScore += weight * 5 * fuzzyScore; // Scale by fuzzy score
          matchCount++;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
          if (bestMatchType === 'partial') {
            bestMatchType = 'fuzzy';
          }
          break;
        }
        
        // Also try fuzzy match with stemmed versions (handles plurals with typos)
        if (stemmedWord !== word || stemmedQuery !== queryLower) {
          const stemFuzzyScore = advancedFuzzyMatch(stemmedWord, stemmedQuery);
          if (stemFuzzyScore >= fuzzyThreshold) {
            totalScore += weight * 5 * stemFuzzyScore;
            matchCount++;
            if (!matchedFields.includes(field)) {
              matchedFields.push(field);
            }
            if (bestMatchType === 'partial') {
              bestMatchType = 'fuzzy';
            }
            break;
          }
        }
      }
      
      // Enhanced individual search term matching with fuzzy support
      for (const { original, stemmed } of stemmedSearchTerms) {
        if (fieldValue.includes(original)) {
          totalScore += weight * 3;
          matchCount++;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
        } else {
          // Try exact match with stemmed versions
          if (stemmed !== original && fieldValue.includes(stemmed)) {
            totalScore += weight * 2.8; // Slightly lower than exact match
            matchCount++;
            if (!matchedFields.includes(field)) {
              matchedFields.push(field);
            }
            continue;
          }
          
          // Try fuzzy match on individual words in the field for this term
          const fieldWords = fieldValue.split(/\s+/);
          for (const word of fieldWords) {
            const fuzzyScore = advancedFuzzyMatch(word, original);
            if (fuzzyScore >= fuzzyThreshold) {
              totalScore += weight * 2 * fuzzyScore; // Lower score for fuzzy term match
              matchCount++;
              if (!matchedFields.includes(field)) {
                matchedFields.push(field);
              }
              break;
            }
            
            // Also try fuzzy match with stemmed versions
            const stemmedWord = stem(word);
            if (stemmedWord !== word || stemmed !== original) {
              const stemFuzzyScore = advancedFuzzyMatch(stemmedWord, stemmed);
              if (stemFuzzyScore >= fuzzyThreshold) {
                totalScore += weight * 2 * stemFuzzyScore;
                matchCount++;
                if (!matchedFields.includes(field)) {
                  matchedFields.push(field);
                }
                break;
              }
            }
          }
        }
      }
    }
    
    // 2. Apply intent-based filtering
    let passesIntentFilter = true;
    
    for (const intent of intents) {
      switch (intent.type) {
        case 'price':
          const price = item.priceTier1;
          if (intent.operator === 'less' && price >= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'greater' && price <= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'between' && 
                     (price < (intent.value as number) || price > (intent.value2 as number))) {
            passesIntentFilter = false;
          } else if (intent.operator === 'equal') {
            const range = (intent.value as number) * 0.2; // 20% range
            if (Math.abs(price - (intent.value as number)) > range) {
              passesIntentFilter = false;
            }
          }
          if (passesIntentFilter) {
            totalScore += 20; // Bonus for matching intent
          }
          break;
          
        case 'quantity':
          const qty = item.quantityOnHand;
          if (intent.operator === 'less' && qty >= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'greater' && qty <= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'equal' && qty !== (intent.value as number)) {
            passesIntentFilter = false;
          }
          if (passesIntentFilter) {
            totalScore += 20;
          }
          break;
          
        case 'status':
          if (item.status !== intent.value) {
            passesIntentFilter = false;
          } else {
            totalScore += 15;
          }
          break;
      }
    }
    
    if (!passesIntentFilter) {
      continue;
    }
    
    // 3. Normalize score (0-1)
    const maxPossibleScore = searchFields.reduce((sum, f) => sum + f.weight * 10, 0) + 
                             (intents.length * 20);
    const normalizedScore = totalScore / maxPossibleScore;
    
    // Add to results if meets minimum score
    if (normalizedScore >= minScore || matchCount > 0) {
      results.push({
        item,
        score: normalizedScore,
        matchedFields: Array.from(new Set(matchedFields)),
        matchType: bestMatchType,
      });
    }
  }
  
  // 4. Sort results
  results.sort((a, b) => {
    if (sortBy === 'relevance') {
      return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    } else if (sortBy === 'name') {
      return sortOrder === 'desc' 
        ? b.item.name.localeCompare(a.item.name)
        : a.item.name.localeCompare(b.item.name);
    } else if (sortBy === 'price') {
      return sortOrder === 'desc'
        ? b.item.priceTier1 - a.item.priceTier1
        : a.item.priceTier1 - b.item.priceTier1;
    } else if (sortBy === 'quantity') {
      return sortOrder === 'desc'
        ? b.item.quantityOnHand - a.item.quantityOnHand
        : a.item.quantityOnHand - b.item.quantityOnHand;
    }
    return 0;
  });
  
  // 5. Limit results
  return results.slice(0, maxResults);
}

// ============================================
// 5. UTILITY FUNCTIONS
// ============================================

/**
 * Highlight matching text in a string
 */
export function highlightMatches(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Get search suggestions based on partial input
 */
export function getSearchSuggestions<T extends SearchableItem>(
  items: T[],
  partialQuery: string,
  maxSuggestions: number = 5
): string[] {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }
  
  const suggestions = new Set<string>();
  const queryLower = partialQuery.toLowerCase();
  
  for (const item of items) {
    if (suggestions.size >= maxSuggestions) break;
    
    const generatedKeywords = generateInventoryKeywords({
      productName: item.name,
      productDescription: item.description,
      category: item.category,
      sku: item.sku,
      supplierName: item.supplier,
      existingTags: item.tags,
    });

    if (item.name.toLowerCase().startsWith(queryLower)) {
      suggestions.add(item.name);
    } else if (item.sku.toLowerCase().startsWith(queryLower)) {
      suggestions.add(item.sku);
    } else if ((item as any).item_number?.toLowerCase().startsWith(queryLower)) {
      suggestions.add((item as any).item_number);
    } else if (item.category.toLowerCase().startsWith(queryLower)) {
      suggestions.add(item.category);
    } else {
      const keywordMatch = generatedKeywords.all.find((kw) => kw.startsWith(queryLower));
      if (keywordMatch) {
        suggestions.add(keywordMatch);
      }
    }
  }
  
  return Array.from(suggestions).slice(0, maxSuggestions);
}
