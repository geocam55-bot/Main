import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { isTierActive } from '../lib/global-settings';
import { buildInventoryOrSearchClause, expandInventorySearchTerms } from './inventory-keywords';
import { generateInventoryKeywords } from './inventory-keywords';

// ✅ Use select('*') to avoid errors when optional columns (price_tier_*, department_code, unit_of_measure) haven't been added yet.
// The mapping function handles missing fields with defaults.
const INVENTORY_SELECT = '*';
const KEYWORD_VERSION = 'kw_v1';

export interface RegenerateAllKeywordsProgress {
  processed: number;
  total: number;
  updated: number;
  failed: number;
  percent: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Unknown error');
  }
  return 'Unknown error';
}

function isMissingSearchKeywordsColumnError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42703' || message.includes('search_keywords') || message.includes('keywords_generated_at') || message.includes('keyword_version');
}

function parseMissingColumn(errorMessage: string, table: string): string | null {
  const errMsgLower = errorMessage.toLowerCase();
  
  // 1. Double quotes from standard Postgres message, e.g. column "col_name" does not exist
  const doubleQuoteMatches = [...errMsgLower.matchAll(/"([a-zA-Z0-9_\-]+)"/g)].map(m => m[1]);
  // 2. Single quotes from PostgREST cache message, e.g. Could not find the 'col_name' column of 'table'
  const singleQuoteMatches = [...errMsgLower.matchAll(/'([a-zA-Z0-9_\-]+)'/g)].map(m => m[1]);
  
  const allWordMatches = [...doubleQuoteMatches, ...singleQuoteMatches];
  
  // Exclude common words like table name, table identifiers, and common Postgres types/words
  const excludeWords = new Set([
    table.toLowerCase(), "inventory", "profiles", "bids", "opportunities", "contacts", "deals",
    "public", "relation", "of"
  ]);
  
  return allWordMatches.find(w => !excludeWords.has(w)) || null;
}

async function performRobustQuery(
  operation: (data: any) => Promise<{ data: any; error: any }>,
  initialPayload: any,
  maxRetries = 15
): Promise<{ data: any; error: any }> {
  let payload = Array.isArray(initialPayload)
    ? initialPayload.map(item => ({ ...item }))
    : { ...initialPayload };
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const { data, error } = await operation(payload);
    if (!error) {
      return { data, error };
    }
    
    const errMsg = String(error.message || '').toLowerCase();
    const isColumnError = error.code === '42703' || 
                          errMsg.includes('column') || 
                          errMsg.includes('schema cache') || 
                          errMsg.includes('not find') || 
                          errMsg.includes('does not exist');
                          
    if (isColumnError) {
      console.warn(`[Robust DB client] Column error detected: "${error.message}". Automatic payload correction attempt ${attempt + 1}...`);
      
      let strippedAny = false;
      
      const stripColumn = (col: string) => {
        if (Array.isArray(payload)) {
          payload.forEach((item: any) => {
            if (item[col] !== undefined) {
              delete item[col];
              strippedAny = true;
            }
          });
        } else {
          if (payload[col] !== undefined) {
            delete payload[col];
            strippedAny = true;
          }
        }
      };

      // 1. Try to find the exact problematic column using our robust parser
      const parsedCol = parseMissingColumn(error.message || '', 'inventory');
      if (parsedCol) {
        stripColumn(parsedCol);
      }
      
      // 2. If we didn't strip anything with the parsed column, try explicit checks for safety
      if (!strippedAny) {
        if (errMsg.includes('image_url') || errMsg.includes('imageurl')) {
          stripColumn('image_url');
        } else if (errMsg.includes('unit_of_measure') || errMsg.includes('unitofmeasure')) {
          stripColumn('unit_of_measure');
        } else if (errMsg.includes('department_code') || errMsg.includes('departmentcode')) {
          stripColumn('department_code');
        } else if (errMsg.includes('location')) {
          stripColumn('location');
        } else if (errMsg.includes('status')) {
          stripColumn('status');
        } else if (errMsg.includes('quantity_on_hand')) {
          stripColumn('quantity_on_hand');
        } else if (errMsg.includes('price_tier_1') || errMsg.includes('price_tier_2') || errMsg.includes('price_tier_3') || errMsg.includes('price_tier_4') || errMsg.includes('price_tier_5')) {
          stripColumn('price_tier_1');
          stripColumn('price_tier_2');
          stripColumn('price_tier_3');
          stripColumn('price_tier_4');
          stripColumn('price_tier_5');
        } else if (errMsg.includes('search_keywords') || errMsg.includes('keywords_generated_at') || errMsg.includes('keyword_version')) {
          stripColumn('search_keywords');
          stripColumn('keywords_generated_at');
          stripColumn('keyword_version');
        }
      }
      
      // If we still haven't stripped anything, use general fallback cleanup to be sure we don't loop endlessly
      if (!strippedAny) {
        const defaultToStrip = [
          'image_url', 'unit_of_measure', 'department_code', 
          'location', 'status', 'quantity_on_hand',
          'price_tier_1', 'price_tier_2', 'price_tier_3', 
          'price_tier_4', 'price_tier_5',
          'search_keywords', 'keywords_generated_at', 'keyword_version'
        ];
        for (const col of defaultToStrip) {
          stripColumn(col);
        }
      }
      
      if (!strippedAny) {
        // If really nothing was stripped, return to avoid an infinite loop
        return { data, error };
      }
      
      attempt++;
    } else {
      return { data, error };
    }
  }
  
  return operation(payload);
}

function buildSearchKeywords(itemData: any): string[] {
  const existingTags = Array.isArray(itemData?.tags)
    ? itemData.tags.filter(Boolean)
    : typeof itemData?.tags === 'string'
      ? itemData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

  try {
    const generated = generateInventoryKeywords({
      productName: itemData?.name || '',
      productDescription: itemData?.description || '',
      category: itemData?.category || '',
      brand: itemData?.brand || itemData?.manufacturer || '',
      sku: itemData?.sku || '',
      modelNumber: itemData?.model_number || itemData?.modelNumber || '',
      supplierName: itemData?.supplier || itemData?.supplier_name || '',
      existingTags,
    });

    return generated.all.slice(0, 96);
  } catch (error) {
    const sku = itemData?.sku || 'unknown-sku';
    throw new Error(`Keyword generation failed for SKU ${sku}: ${getErrorMessage(error)}`);
  }
}

function attachKeywordColumns(cleanData: any, sourceData: any): any {
  const next = { ...cleanData };
  next.search_keywords = buildSearchKeywords(sourceData);
  next.keyword_version = KEYWORD_VERSION;
  next.keywords_generated_at = new Date().toISOString();
  return next;
}

function removeKeywordColumns(data: any): any {
  const next = { ...data };
  delete next.search_keywords;
  delete next.keyword_version;
  delete next.keywords_generated_at;
  return next;
}

export async function getAllInventoryClient() {
  try {
    const supabase = createClient();
    
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        // Using session user for inventory (getUser failed)
      } else {
        // Silently return empty during initial load
        return { items: [] };
      }
    } else {
      authUser = user;
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      // Failed to get user profile
      return { items: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Inventory scope filtering based on role and organization

    if (!userOrgId) {
      // No organization_id found for user
      return { items: [] };
    }

    // ✅ CRITICAL FIX: Limit the initial load to 1000 items to prevent "Failed to fetch"
    // network errors on the Deals page. A full sync of 14,000+ items inside Promise.all
    // causes the browser to abort the request.
    // Fetching inventory
    
    const { data: allData, error: batchError } = await supabase
      .from('inventory')
      .select(INVENTORY_SELECT, { count: 'exact' })
      .eq('organization_id', userOrgId)
      .order('name', { ascending: true })
      .limit(1000);
      
    if (batchError) {
      // Database error loading inventory
      
      // Handle specific error cases gracefully
      if (batchError.code === '42703') {
        // Column missing - database migration may be needed
        return { items: [] };
      } else if (batchError.code === 'PGRST205' || batchError.code === '42P01') {
        // Table missing - database setup may be needed
        return { items: [] };
      }
      
      throw batchError;
    }
    
    // Inventory data loaded

    // Convert snake_case to camelCase and map to expected format
    const items = allData ? allData.map(mapInventoryItem) : [];
    // Mapped inventory items
    
    return { items };
  } catch (error: any) {
    // Error loading inventory
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { items: [] };
  }
}

// Get inventory with server-side filtering for better performance
export async function searchInventoryClient(filters?: {
  search?: string;
  category?: string;
  status?: string;
  organizationId?: string;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated, returning empty inventory
      return { items: [] };
    }

    // Get user's profile to check their role and organization
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      return { items: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Search inventory filtering

    let query = supabase
      .from('inventory')
      .select(INVENTORY_SELECT);

    // Apply organization filter based on user's role
    // ALL roles should only see inventory from their own organization
    query = query.eq('organization_id', userOrgId);
    // Filtering inventory for organization

    // Apply category filter
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    // Note: Status filter removed - column doesn't exist in actual schema
    // The UI still shows status filter, but it's handled client-side for backward compatibility

    // Apply search filter - use ILIKE for case-insensitive pattern matching
    // This uses the trigram indexes we created
    if (filters?.search && filters.search.trim()) {
      const expandedTerms = expandInventorySearchTerms(filters.search.trim());
      const orClause = buildInventoryOrSearchClause(expandedTerms);
      if (orClause) {
        query = query.or(orClause);
      }
    }

    // Order by name
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    // Search results loaded

    // Convert snake_case to camelCase and map to expected format
    const items = data ? data.map(mapInventoryItem) : [];
    return { items };
  } catch (error: any) {
    // Error searching inventory
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { items: [] };
  }
}

function injectMetadataIntoDescription(cleanData: any, itemData: any) {
  const metadata: any = {};
  
  // Collect any missing database columns from itemData
  const imageUrl = itemData.image_url !== undefined ? itemData.image_url : itemData.imageUrl;
  if (imageUrl !== undefined) {
    metadata.imageUrl = imageUrl;
  }
  if (itemData.location !== undefined) {
    metadata.location = itemData.location;
  }
  if (itemData.status !== undefined) {
    metadata.status = itemData.status;
  }
  if (cleanData.quantity !== undefined) {
    metadata.quantityOnHand = cleanData.quantity;
  }

  // Parse any existing metadata in base description so we don't wipe it out
  const rawDescription = cleanData.description || '';
  let baseDescription = rawDescription;
  
  const markerStart = "<!--metadata:";
  const markerEnd = "-->";
  const startIndex = rawDescription.lastIndexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = rawDescription.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      const jsonStr = rawDescription.substring(startIndex + markerStart.length, endIndex);
      try {
        const parsedMetadata = JSON.parse(jsonStr);
        Object.assign(metadata, parsedMetadata);
        baseDescription = rawDescription.substring(0, startIndex).trim();
      } catch (e) {
        // Fallback
      }
    }
  }

  if (Object.keys(metadata).length > 0) {
    cleanData.description = `${baseDescription}\n\n<!--metadata:${JSON.stringify(metadata)}-->`.trim();
  }
}

// Helper to dynamically align payload keys to match exact casing of columns present in the database table
async function alignPayloadToDBCasing(supabase: any, payload: any, sampleId?: string): Promise<any> {
  try {
    let sample: any = null;
    if (sampleId) {
      const { data } = await supabase.from('inventory').select('*').eq('id', sampleId).maybeSingle();
      sample = data;
    }
    if (!sample) {
      const { data } = await supabase.from('inventory').select('*').limit(1).maybeSingle();
      sample = data;
    }
    if (!sample) return payload;
    
    const aligned: any = {};
    const sampleKeys = Object.keys(sample);
    
    for (const [key, val] of Object.entries(payload)) {
      const cleanKey = key.toLowerCase().replace(/_/g, '');
      const matchingKey = sampleKeys.find(sk => sk.toLowerCase().replace(/_/g, '') === cleanKey);
      
      if (matchingKey) {
        aligned[matchingKey] = val;
      } else {
        aligned[key] = val;
      }
    }
    return aligned;
  } catch (err) {
    return payload;
  }
}

export async function createInventoryClient(itemData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // ✅ FIX: Get organization_id from profile, not user_metadata
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      throw new Error('Failed to get user profile');
    }

    const organizationId = profile.organization_id;

    if (!organizationId) {
      // No organization_id found for user
      throw new Error('No organization_id found for user');
    }

    // Creating inventory item for organization

    // Clean the data - only include fields that exist in the database
    const cleanData: any = {
      name: itemData.name,
      sku: itemData.sku,
      organization_id: organizationId, // ✅ Use profile organization_id
    };

    // Add optional fields only if they exist - ONLY valid database columns
    if (itemData.description !== undefined) cleanData.description = itemData.description;
    if (itemData.category !== undefined) cleanData.category = itemData.category;
    if (itemData.quantity !== undefined) {
      // Parse quantity as integer - handle decimal values by rounding
      const qty = typeof itemData.quantity === 'string' 
        ? parseFloat(itemData.quantity) 
        : itemData.quantity;
      cleanData.quantity = Math.round(qty);
    }
    if (itemData.quantity_on_order !== undefined) {
      // Parse quantity_on_order as integer - handle decimal values by rounding
      const qtyOnOrder = typeof itemData.quantity_on_order === 'string' 
        ? parseFloat(itemData.quantity_on_order) 
        : itemData.quantity_on_order;
      cleanData.quantity_on_order = Math.round(qtyOnOrder);
    }
    if (itemData.unit_price !== undefined) {
      // Convert unit_price to cents (integer) - multiply by 100
      const price = typeof itemData.unit_price === 'string' 
        ? parseFloat(itemData.unit_price) 
        : itemData.unit_price;
      cleanData.unit_price = Math.round(price * 100);
    }
    if (itemData.cost !== undefined) {
      // Convert cost to cents (integer) - multiply by 100
      const cost = typeof itemData.cost === 'string' 
        ? parseFloat(itemData.cost) 
        : itemData.cost;
      cleanData.cost = Math.round(cost * 100);
    }
    if (itemData.image_url !== undefined) cleanData.image_url = itemData.image_url;
    // Price tiers (stored in cents)
    if (itemData.price_tier_1 !== undefined) {
      const p = typeof itemData.price_tier_1 === 'string' ? parseFloat(itemData.price_tier_1) : itemData.price_tier_1;
      cleanData.price_tier_1 = Math.round(p * 100);
    }
    if (itemData.price_tier_2 !== undefined) {
      const p = typeof itemData.price_tier_2 === 'string' ? parseFloat(itemData.price_tier_2) : itemData.price_tier_2;
      cleanData.price_tier_2 = Math.round(p * 100);
    }
    if (itemData.price_tier_3 !== undefined) {
      const p = typeof itemData.price_tier_3 === 'string' ? parseFloat(itemData.price_tier_3) : itemData.price_tier_3;
      cleanData.price_tier_3 = Math.round(p * 100);
    }
    if (itemData.price_tier_4 !== undefined) {
      const p = typeof itemData.price_tier_4 === 'string' ? parseFloat(itemData.price_tier_4) : itemData.price_tier_4;
      cleanData.price_tier_4 = Math.round(p * 100);
    }
    if (itemData.price_tier_5 !== undefined) {
      const p = typeof itemData.price_tier_5 === 'string' ? parseFloat(itemData.price_tier_5) : itemData.price_tier_5;
      cleanData.price_tier_5 = Math.round(p * 100);
    }
    if (itemData.department_code !== undefined) cleanData.department_code = itemData.department_code;
    if (itemData.unit_of_measure !== undefined) cleanData.unit_of_measure = itemData.unit_of_measure;
    if (itemData.reorder_level !== undefined) cleanData.reorder_level = itemData.reorder_level;
    if (itemData.location !== undefined) cleanData.location = itemData.location;
    if (itemData.upc !== undefined) cleanData.upc = itemData.upc;
    if (itemData.supplier !== undefined) cleanData.supplier = itemData.supplier;
    if (itemData.supplierSKU !== undefined) cleanData.supplier_sku = itemData.supplierSKU;
    if (itemData.supplier_sku !== undefined) cleanData.supplier_sku = itemData.supplier_sku;

    // Add additional fields matching complete database schema
    if (itemData.min_stock !== undefined) cleanData.min_stock = itemData.min_stock;
    if (itemData.minStock !== undefined) cleanData.min_stock = itemData.minStock;
    if (itemData.max_stock !== undefined) cleanData.max_stock = itemData.max_stock;
    if (itemData.maxStock !== undefined) cleanData.max_stock = itemData.maxStock;
    if (itemData.lead_time_days !== undefined) cleanData.lead_time_days = itemData.lead_time_days;
    if (itemData.leadTimeDays !== undefined) cleanData.lead_time_days = itemData.leadTimeDays;
    if (itemData.notes !== undefined) cleanData.notes = itemData.notes;
    if (itemData.tags !== undefined) cleanData.tags = Array.isArray(itemData.tags) ? itemData.tags : [];
    if (itemData.price_levels !== undefined) {
      try {
        cleanData.price_levels = typeof itemData.price_levels === 'string' && itemData.price_levels.trim() !== '' 
          ? JSON.parse(itemData.price_levels) 
          : itemData.price_levels;
      } catch (e) {
        cleanData.price_levels = itemData.price_levels;
      }
    }

    // Maintain pricing structure: If Tier2,Tier3,Tier4,Tier5 are 0 or undefined then let them be Tier1
    const fallbackT1 = cleanData.price_tier_1 !== undefined 
      ? cleanData.price_tier_1 
      : (cleanData.unit_price !== undefined ? cleanData.unit_price : 0);
    if (cleanData.price_tier_2 === 0 || cleanData.price_tier_2 === undefined) cleanData.price_tier_2 = fallbackT1;
    if (cleanData.price_tier_3 === 0 || cleanData.price_tier_3 === undefined) cleanData.price_tier_3 = fallbackT1;
    if (cleanData.price_tier_4 === 0 || cleanData.price_tier_4 === undefined) cleanData.price_tier_4 = fallbackT1;
    if (cleanData.price_tier_5 === 0 || cleanData.price_tier_5 === undefined) cleanData.price_tier_5 = fallbackT1;

    injectMetadataIntoDescription(cleanData, itemData);

    // Creating inventory item with clean data

    const keywordData = attachKeywordColumns(cleanData, itemData);
    const alignedKeywordData = await alignPayloadToDBCasing(supabase, keywordData);

    const { data, error } = await performRobustQuery(
      async (payload) => {
        return await supabase
          .from('inventory')
          .insert([payload])
          .select()
          .single();
      },
      alignedKeywordData
    );

    if (error) throw error;

    // Convert snake_case to camelCase and map to expected format
    const item = data ? mapInventoryItem(data) : null;
    return { item };
  } catch (error: any) {
    // Error creating inventory item
    throw error;
  }
}

export async function updateInventoryClient(id: string, itemData: any) {
  try {
    const supabase = createClient();
    // Clean the data - only include fields that exist in the database
    const cleanData: any = {};

    // Add fields only if they exist
    if (itemData.name !== undefined) cleanData.name = itemData.name;
    if (itemData.sku !== undefined) cleanData.sku = itemData.sku;
    if (itemData.description !== undefined) cleanData.description = itemData.description;
    if (itemData.category !== undefined) cleanData.category = itemData.category;
    if (itemData.quantity !== undefined) {
      // Parse quantity as integer - handle decimal values by rounding
      const qty = typeof itemData.quantity === 'string' 
        ? parseFloat(itemData.quantity) 
        : itemData.quantity;
      cleanData.quantity = Math.round(qty);
    }
    if (itemData.quantity_on_order !== undefined) {
      // Parse quantity_on_order as integer - handle decimal values by rounding
      const qtyOnOrder = typeof itemData.quantity_on_order === 'string' 
        ? parseFloat(itemData.quantity_on_order) 
        : itemData.quantity_on_order;
      cleanData.quantity_on_order = Math.round(qtyOnOrder);
    }
    if (itemData.unit_price !== undefined) {
      // Convert unit_price to cents (integer) - multiply by 100
      const price = typeof itemData.unit_price === 'string' 
        ? parseFloat(itemData.unit_price) 
        : itemData.unit_price;
      cleanData.unit_price = Math.round(price * 100);
    }
    if (itemData.cost !== undefined) {
      // Convert cost to cents (integer) - multiply by 100
      const cost = typeof itemData.cost === 'string' 
        ? parseFloat(itemData.cost) 
        : itemData.cost;
      cleanData.cost = Math.round(cost * 100);
    }
    if (itemData.image_url !== undefined) cleanData.image_url = itemData.image_url;
    // Price tiers (stored in cents)
    if (itemData.price_tier_1 !== undefined) {
      const p = typeof itemData.price_tier_1 === 'string' ? parseFloat(itemData.price_tier_1) : itemData.price_tier_1;
      cleanData.price_tier_1 = Math.round(p * 100);
    }
    if (itemData.price_tier_2 !== undefined) {
      const p = typeof itemData.price_tier_2 === 'string' ? parseFloat(itemData.price_tier_2) : itemData.price_tier_2;
      cleanData.price_tier_2 = Math.round(p * 100);
    }
    if (itemData.price_tier_3 !== undefined) {
      const p = typeof itemData.price_tier_3 === 'string' ? parseFloat(itemData.price_tier_3) : itemData.price_tier_3;
      cleanData.price_tier_3 = Math.round(p * 100);
    }
    if (itemData.price_tier_4 !== undefined) {
      const p = typeof itemData.price_tier_4 === 'string' ? parseFloat(itemData.price_tier_4) : itemData.price_tier_4;
      cleanData.price_tier_4 = Math.round(p * 100);
    }
    if (itemData.price_tier_5 !== undefined) {
      const p = typeof itemData.price_tier_5 === 'string' ? parseFloat(itemData.price_tier_5) : itemData.price_tier_5;
      cleanData.price_tier_5 = Math.round(p * 100);
    }
    if (itemData.department_code !== undefined) cleanData.department_code = itemData.department_code;
    if (itemData.unit_of_measure !== undefined) cleanData.unit_of_measure = itemData.unit_of_measure;
    if (itemData.reorder_level !== undefined) cleanData.reorder_level = itemData.reorder_level;
    if (itemData.location !== undefined) cleanData.location = itemData.location;
    if (itemData.upc !== undefined) cleanData.upc = itemData.upc;
    if (itemData.supplier !== undefined) cleanData.supplier = itemData.supplier;
    if (itemData.supplierSKU !== undefined) cleanData.supplier_sku = itemData.supplierSKU;
    if (itemData.supplier_sku !== undefined) cleanData.supplier_sku = itemData.supplier_sku;

    // Add additional fields matching complete database schema
    if (itemData.min_stock !== undefined) cleanData.min_stock = itemData.min_stock;
    if (itemData.minStock !== undefined) cleanData.min_stock = itemData.minStock;
    if (itemData.max_stock !== undefined) cleanData.max_stock = itemData.max_stock;
    if (itemData.maxStock !== undefined) cleanData.max_stock = itemData.maxStock;
    if (itemData.lead_time_days !== undefined) cleanData.lead_time_days = itemData.lead_time_days;
    if (itemData.leadTimeDays !== undefined) cleanData.lead_time_days = itemData.leadTimeDays;
    if (itemData.notes !== undefined) cleanData.notes = itemData.notes;
    if (itemData.tags !== undefined) cleanData.tags = Array.isArray(itemData.tags) ? itemData.tags : [];
    if (itemData.price_levels !== undefined) {
      try {
        cleanData.price_levels = typeof itemData.price_levels === 'string' && itemData.price_levels.trim() !== '' 
          ? JSON.parse(itemData.price_levels) 
          : itemData.price_levels;
      } catch (e) {
        cleanData.price_levels = itemData.price_levels;
      }
    }

    // Maintain pricing structure: If Tier2,Tier3,Tier4,Tier5 are 0 then let them be Tier1
    const fallbackT1 = cleanData.price_tier_1 !== undefined 
      ? cleanData.price_tier_1 
      : (cleanData.unit_price !== undefined ? cleanData.unit_price : 0);
    if (cleanData.price_tier_2 === 0) cleanData.price_tier_2 = fallbackT1;
    if (cleanData.price_tier_3 === 0) cleanData.price_tier_3 = fallbackT1;
    if (cleanData.price_tier_4 === 0) cleanData.price_tier_4 = fallbackT1;
    if (cleanData.price_tier_5 === 0) cleanData.price_tier_5 = fallbackT1;

    injectMetadataIntoDescription(cleanData, itemData);

    // Note: Cost field temporarily removed from update to avoid PGRST204 error
    // Will be re-enabled after database migration

    // Updating inventory item with clean data

    const keywordData = attachKeywordColumns(cleanData, itemData);
    const alignedKeywordData = await alignPayloadToDBCasing(supabase, keywordData, id);

    const { data, error } = await performRobustQuery(
      async (payload) => {
        return await supabase
          .from('inventory')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
      },
      alignedKeywordData
    );

    if (error) throw error;
    
    // Data returned from update verified

    // Convert snake_case to camelCase and map to expected format
    const item = data ? mapInventoryItem(data) : null;
    // Mapped item ready
    
    return { item };
  } catch (error: any) {
    // Error updating inventory item
    throw error;
  }
}

export async function deleteInventoryClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    // Error deleting inventory item
    throw error;
  }
}

// Upsert inventory item by SKU - update if exists, create if new
export async function upsertInventoryBySKUClient(itemData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Get organization_id from user profile (more reliable than metadata)
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      throw new Error('Failed to get user profile');
    }

    const organizationId = profile.organization_id;
    if (!organizationId) {
      // No organization_id in profile
      throw new Error('No organization ID found in user profile');
    }

    // Upsert inventory processing

    // Clean the data - only include fields that exist in the database
    const cleanData: any = {
      name: itemData.name !== undefined ? itemData.name : (itemData.ItemName !== undefined ? itemData.ItemName : (itemData.Name !== undefined ? itemData.Name : undefined)),
      sku: itemData.sku !== undefined ? itemData.sku : (itemData.SKU !== undefined ? itemData.SKU : undefined),
      organization_id: organizationId,
    };

    // Add optional fields only if they exist - ONLY valid database columns
    if (itemData.description !== undefined) cleanData.description = itemData.description;
    if (itemData.category !== undefined) cleanData.category = itemData.category;
    
    const qtyRaw = itemData.quantity !== undefined ? itemData.quantity : (itemData.quantityOnHand !== undefined ? itemData.quantityOnHand : (itemData.Quantity !== undefined ? itemData.Quantity : undefined));
    if (qtyRaw !== undefined) {
      // Parse quantity as integer - handle decimal values by rounding
      const qty = typeof qtyRaw === 'string' ? parseFloat(qtyRaw) : qtyRaw;
      cleanData.quantity = Math.round(qty);
    }
    
    const qtyOnOrderRaw = itemData.quantity_on_order !== undefined ? itemData.quantity_on_order : (itemData.quantityOnOrder !== undefined ? itemData.quantityOnOrder : (itemData.QuantityOnOrder !== undefined ? itemData.QuantityOnOrder : undefined));
    if (qtyOnOrderRaw !== undefined) {
      // Parse quantity_on_order as integer - handle decimal values by rounding
      const qtyOnOrder = typeof qtyOnOrderRaw === 'string' ? parseFloat(qtyOnOrderRaw) : qtyOnOrderRaw;
      cleanData.quantity_on_order = Math.round(qtyOnOrder);
    }
    
    const unitPriceRaw = itemData.unit_price !== undefined ? itemData.unit_price : (itemData.unitPrice !== undefined ? itemData.unitPrice : (itemData.UnitPrice !== undefined ? itemData.UnitPrice : undefined));
    if (unitPriceRaw !== undefined) {
      // Convert unit_price to cents (integer) - multiply by 100
      const price = typeof unitPriceRaw === 'string' ? parseFloat(unitPriceRaw) : unitPriceRaw;
      cleanData.unit_price = Math.round(price * 100);
    }
    
    const costRaw = itemData.cost !== undefined ? itemData.cost : (itemData.Cost !== undefined ? itemData.Cost : undefined);
    if (costRaw !== undefined) {
      // Convert cost to cents (integer) - multiply by 100
      const cost = typeof costRaw === 'string' ? parseFloat(costRaw) : costRaw;
      cleanData.cost = Math.round(cost * 100);
    }
    
    const imageUrlRaw = itemData.image_url !== undefined ? itemData.image_url : (itemData.imageUrl !== undefined ? itemData.imageUrl : (itemData.imageURL !== undefined ? itemData.imageURL : (itemData.ImageURL !== undefined ? itemData.ImageURL : undefined)));
    if (imageUrlRaw !== undefined) cleanData.image_url = imageUrlRaw;
    
    // Price tiers (stored in cents)
    const p1Raw = itemData.price_tier_1 !== undefined ? itemData.price_tier_1 : (itemData.priceTier1 !== undefined ? itemData.priceTier1 : (itemData.PriceTier1 !== undefined ? itemData.PriceTier1 : undefined));
    if (p1Raw !== undefined) {
      const p = typeof p1Raw === 'string' ? parseFloat(p1Raw) : p1Raw;
      cleanData.price_tier_1 = Math.round(p * 100);
    }
    
    const p2Raw = itemData.price_tier_2 !== undefined ? itemData.price_tier_2 : (itemData.priceTier2 !== undefined ? itemData.priceTier2 : (itemData.PriceTier2 !== undefined ? itemData.PriceTier2 : undefined));
    if (p2Raw !== undefined) {
      const p = typeof p2Raw === 'string' ? parseFloat(p2Raw) : p2Raw;
      cleanData.price_tier_2 = Math.round(p * 100);
    }
    
    const p3Raw = itemData.price_tier_3 !== undefined ? itemData.price_tier_3 : (itemData.priceTier3 !== undefined ? itemData.priceTier3 : (itemData.PriceTier3 !== undefined ? itemData.PriceTier3 : undefined));
    if (p3Raw !== undefined) {
      const p = typeof p3Raw === 'string' ? parseFloat(p3Raw) : p3Raw;
      cleanData.price_tier_3 = Math.round(p * 100);
    }
    
    const p4Raw = itemData.price_tier_4 !== undefined ? itemData.price_tier_4 : (itemData.priceTier4 !== undefined ? itemData.priceTier4 : (itemData.PriceTier4 !== undefined ? itemData.PriceTier4 : undefined));
    if (p4Raw !== undefined) {
      const p = typeof p4Raw === 'string' ? parseFloat(p4Raw) : p4Raw;
      cleanData.price_tier_4 = Math.round(p * 100);
    }
    
    const p5Raw = itemData.price_tier_5 !== undefined ? itemData.price_tier_5 : (itemData.priceTier5 !== undefined ? itemData.priceTier5 : (itemData.PriceTier5 !== undefined ? itemData.PriceTier5 : undefined));
    if (p5Raw !== undefined) {
      const p = typeof p5Raw === 'string' ? parseFloat(p5Raw) : p5Raw;
      cleanData.price_tier_5 = Math.round(p * 100);
    }
    
    const deptRaw = itemData.department_code !== undefined ? itemData.department_code : (itemData.departmentCode !== undefined ? itemData.departmentCode : (itemData.DepartmentCode !== undefined ? itemData.DepartmentCode : undefined));
    if (deptRaw !== undefined) cleanData.department_code = deptRaw;
    
    const unitRaw = itemData.unit_of_measure !== undefined ? itemData.unit_of_measure : (itemData.unitOfMeasure !== undefined ? itemData.unitOfMeasure : (itemData.unit !== undefined ? itemData.unit : (itemData.Unit !== undefined ? itemData.Unit : undefined)));
    if (unitRaw !== undefined) cleanData.unit_of_measure = unitRaw;
    
    const reorderRaw = itemData.reorder_level !== undefined ? itemData.reorder_level : (itemData.reorderLevel !== undefined ? itemData.reorderLevel : (itemData.ReorderLevel !== undefined ? itemData.ReorderLevel : undefined));
    if (reorderRaw !== undefined) {
      const r = typeof reorderRaw === 'string' ? parseInt(reorderRaw) : reorderRaw;
      cleanData.reorder_level = isNaN(r) ? 0 : r;
    }
    
    const locRaw = itemData.location !== undefined ? itemData.location : (itemData.Location !== undefined ? itemData.Location : undefined);
    if (locRaw !== undefined) cleanData.location = locRaw;
    
    const upcRaw = itemData.upc !== undefined ? itemData.upc : (itemData.UPC !== undefined ? itemData.UPC : undefined);
    if (upcRaw !== undefined) cleanData.upc = upcRaw;
    
    const supplierRaw = itemData.supplier !== undefined ? itemData.supplier : (itemData.Supplier !== undefined ? itemData.Supplier : undefined);
    if (supplierRaw !== undefined) cleanData.supplier = supplierRaw;
    
    const supplierSkuRaw = itemData.supplier_sku !== undefined ? itemData.supplier_sku : (itemData.supplierSKU !== undefined ? itemData.supplierSKU : (itemData.SupplierSKU !== undefined ? itemData.SupplierSKU : undefined));
    if (supplierSkuRaw !== undefined) cleanData.supplier_sku = supplierSkuRaw;

    // Maintain pricing structure: If Tier2,Tier3,Tier4,Tier5 are 0 then let them be Tier1
    const fallbackT1 = cleanData.price_tier_1 !== undefined 
      ? cleanData.price_tier_1 
      : (cleanData.unit_price !== undefined ? cleanData.unit_price : 0);
    if (cleanData.price_tier_2 === 0) cleanData.price_tier_2 = fallbackT1;
    if (cleanData.price_tier_3 === 0) cleanData.price_tier_3 = fallbackT1;
    if (cleanData.price_tier_4 === 0) cleanData.price_tier_4 = fallbackT1;
    if (cleanData.price_tier_5 === 0) cleanData.price_tier_5 = fallbackT1;

    injectMetadataIntoDescription(cleanData, itemData);

    // Note: Cost field temporarily removed from upsert to avoid PGRST204 error
    // Will be re-enabled after database migration

    const keywordData = attachKeywordColumns(cleanData, itemData);

    // Clean data prepared for database

    // Check if item with this SKU already exists in this organization
    // If there are duplicates, we'll find ALL of them and update them all
    let existingItems: any[] = [];
    if (itemData.sku) {
      const { data, error } = await supabase
        .from('inventory')
        .select(INVENTORY_SELECT)
        .eq('sku', itemData.sku)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true }); // Oldest first
      
      if (error) {
        // Error checking for existing inventory item
        throw error;
      }
      
      if (data && data.length > 0) {
        existingItems = data;
        
        // Duplicates detected if more than 1 - will update all
      }
    }

    if (existingItems.length > 0) {
      // Update ALL existing items with this SKU to ensure consistency
      const updateData = { ...keywordData };
      delete updateData.organization_id;
      
      // Updating existing item(s)
      
      // Update all records with this SKU
      const { data: updatedItems, error: updateError } = await performRobustQuery(
        async (payload) => {
          return await supabase
            .from('inventory')
            .update(payload)
            .eq('sku', itemData.sku)
            .eq('organization_id', organizationId)
            .select();
        },
        updateData
      );
      
      if (updateError) {
        // Error updating inventory items
        throw updateError;
      }
      
      // Return the first updated item
      const item = updatedItems && updatedItems.length > 0 ? mapInventoryItem(updatedItems[0]) : null;
      return { 
        item, 
        action: 'updated',
        updatedCount: updatedItems?.length || 0
      };
    } else {
      // Create new item
      // Creating new item
      
      const { data: createdItem, error: createError } = await performRobustQuery(
        async (payload) => {
          return await supabase
            .from('inventory')
            .insert([payload])
            .select()
            .single();
        },
        keywordData
      );
      
      if (createError) {
        // Error creating inventory item
        throw createError;
      }
      
      const item = createdItem ? mapInventoryItem(createdItem) : null;
      return { item, action: 'created' };
    }
  } catch (error: any) {
    // Error upserting inventory item
    throw error;
  }
}

// Bulk upsert inventory items - processes multiple records in a single batch
export async function bulkUpsertInventoryBySKUClient(itemsData: any[]) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Get organization_id from user profile (more reliable than metadata)
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      throw new Error('Failed to get user profile');
    }

    const organizationId = profile.organization_id;
    if (!organizationId) {
      // No organization_id in profile
      throw new Error('No organization ID found in user profile');
    }

    if (!itemsData || itemsData.length === 0) {
      return { created: 0, updated: 0, failed: 0, errors: [] };
    }

    // Bulk upsert inventory items for organization

    // Clean all items data
    const cleanItems = itemsData.map(itemData => {
      const cleanData: any = {
        name: itemData.name !== undefined ? itemData.name : (itemData.ItemName !== undefined ? itemData.ItemName : (itemData.Name !== undefined ? itemData.Name : undefined)),
        sku: itemData.sku !== undefined ? itemData.sku : (itemData.SKU !== undefined ? itemData.SKU : undefined),
        organization_id: organizationId,
      };

      // Add optional fields only if they exist
      if (itemData.description !== undefined) cleanData.description = itemData.description;
      if (itemData.category !== undefined) cleanData.category = itemData.category;
      
      const qtyRaw = itemData.quantity !== undefined ? itemData.quantity : (itemData.quantityOnHand !== undefined ? itemData.quantityOnHand : (itemData.Quantity !== undefined ? itemData.Quantity : undefined));
      if (qtyRaw !== undefined) {
        // Parse quantity as integer - handle decimal values by rounding
        const qty = typeof qtyRaw === 'string' ? parseFloat(qtyRaw) : qtyRaw;
        cleanData.quantity = Math.round(qty);
      }
      
      const qtyOnOrderRaw = itemData.quantity_on_order !== undefined ? itemData.quantity_on_order : (itemData.quantityOnOrder !== undefined ? itemData.quantityOnOrder : (itemData.QuantityOnOrder !== undefined ? itemData.QuantityOnOrder : undefined));
      if (qtyOnOrderRaw !== undefined) {
        // Parse quantity_on_order as integer - handle decimal values by rounding
        const qtyOnOrder = typeof qtyOnOrderRaw === 'string' ? parseFloat(qtyOnOrderRaw) : qtyOnOrderRaw;
        cleanData.quantity_on_order = Math.round(qtyOnOrder);
      }
      
      const unitPriceRaw = itemData.unit_price !== undefined ? itemData.unit_price : (itemData.unitPrice !== undefined ? itemData.unitPrice : (itemData.UnitPrice !== undefined ? itemData.UnitPrice : undefined));
      if (unitPriceRaw !== undefined) {
        // Convert unit_price to cents (integer) - multiply by 100
        const price = typeof unitPriceRaw === 'string' ? parseFloat(unitPriceRaw) : unitPriceRaw;
        cleanData.unit_price = Math.round(price * 100);
      }
      
      const costRaw = itemData.cost !== undefined ? itemData.cost : (itemData.Cost !== undefined ? itemData.Cost : undefined);
      if (costRaw !== undefined) {
        // Convert cost to cents (integer) - multiply by 100
        const cost = typeof costRaw === 'string' ? parseFloat(costRaw) : costRaw;
        cleanData.cost = Math.round(cost * 100);
      }
      
      const imageUrlRaw = itemData.image_url !== undefined ? itemData.image_url : (itemData.imageUrl !== undefined ? itemData.imageUrl : (itemData.imageURL !== undefined ? itemData.imageURL : (itemData.ImageURL !== undefined ? itemData.ImageURL : undefined)));
      if (imageUrlRaw !== undefined) cleanData.image_url = imageUrlRaw;
      
      // Price tiers (stored in cents)
      const p1Raw = itemData.price_tier_1 !== undefined ? itemData.price_tier_1 : (itemData.priceTier1 !== undefined ? itemData.priceTier1 : (itemData.PriceTier1 !== undefined ? itemData.PriceTier1 : undefined));
      if (p1Raw !== undefined) {
        const p = typeof p1Raw === 'string' ? parseFloat(p1Raw) : p1Raw;
        cleanData.price_tier_1 = Math.round(p * 100);
      }
      
      const p2Raw = itemData.price_tier_2 !== undefined ? itemData.price_tier_2 : (itemData.priceTier2 !== undefined ? itemData.priceTier2 : (itemData.PriceTier2 !== undefined ? itemData.PriceTier2 : undefined));
      if (p2Raw !== undefined) {
        const p = typeof p2Raw === 'string' ? parseFloat(p2Raw) : p2Raw;
        cleanData.price_tier_2 = Math.round(p * 100);
      }
      
      const p3Raw = itemData.price_tier_3 !== undefined ? itemData.price_tier_3 : (itemData.priceTier3 !== undefined ? itemData.priceTier3 : (itemData.PriceTier3 !== undefined ? itemData.PriceTier3 : undefined));
      if (p3Raw !== undefined) {
        const p = typeof p3Raw === 'string' ? parseFloat(p3Raw) : p3Raw;
        cleanData.price_tier_3 = Math.round(p * 100);
      }
      
      const p4Raw = itemData.price_tier_4 !== undefined ? itemData.price_tier_4 : (itemData.priceTier4 !== undefined ? itemData.priceTier4 : (itemData.PriceTier4 !== undefined ? itemData.PriceTier4 : undefined));
      if (p4Raw !== undefined) {
        const p = typeof p4Raw === 'string' ? parseFloat(p4Raw) : p4Raw;
        cleanData.price_tier_4 = Math.round(p * 100);
      }
      
      const p5Raw = itemData.price_tier_5 !== undefined ? itemData.price_tier_5 : (itemData.priceTier5 !== undefined ? itemData.priceTier5 : (itemData.PriceTier5 !== undefined ? itemData.PriceTier5 : undefined));
      if (p5Raw !== undefined) {
        const p = typeof p5Raw === 'string' ? parseFloat(p5Raw) : p5Raw;
        cleanData.price_tier_5 = Math.round(p * 100);
      }
      
      const deptRaw = itemData.department_code !== undefined ? itemData.department_code : (itemData.departmentCode !== undefined ? itemData.departmentCode : (itemData.DepartmentCode !== undefined ? itemData.DepartmentCode : undefined));
      if (deptRaw !== undefined) cleanData.department_code = deptRaw;
      
      const unitRaw = itemData.unit_of_measure !== undefined ? itemData.unit_of_measure : (itemData.unitOfMeasure !== undefined ? itemData.unitOfMeasure : (itemData.unit !== undefined ? itemData.unit : (itemData.Unit !== undefined ? itemData.Unit : undefined)));
      if (unitRaw !== undefined) cleanData.unit_of_measure = unitRaw;
      
      const reorderRaw = itemData.reorder_level !== undefined ? itemData.reorder_level : (itemData.reorderLevel !== undefined ? itemData.reorderLevel : (itemData.ReorderLevel !== undefined ? itemData.ReorderLevel : undefined));
      if (reorderRaw !== undefined) {
        const r = typeof reorderRaw === 'string' ? parseInt(reorderRaw) : reorderRaw;
        cleanData.reorder_level = isNaN(r) ? 0 : r;
      }
      
      const locRaw = itemData.location !== undefined ? itemData.location : (itemData.Location !== undefined ? itemData.Location : undefined);
      if (locRaw !== undefined) cleanData.location = locRaw;
      
      const upcRaw = itemData.upc !== undefined ? itemData.upc : (itemData.UPC !== undefined ? itemData.UPC : undefined);
      if (upcRaw !== undefined) cleanData.upc = upcRaw;
      
      const supplierRaw = itemData.supplier !== undefined ? itemData.supplier : (itemData.Supplier !== undefined ? itemData.Supplier : undefined);
      if (supplierRaw !== undefined) cleanData.supplier = supplierRaw;
      
      const supplierSkuRaw = itemData.supplier_sku !== undefined ? itemData.supplier_sku : (itemData.supplierSKU !== undefined ? itemData.supplierSKU : (itemData.SupplierSKU !== undefined ? itemData.SupplierSKU : undefined));
      if (supplierSkuRaw !== undefined) cleanData.supplier_sku = supplierSkuRaw;

      // Maintain pricing structure: If Tier2,Tier3,Tier4,Tier5 are 0 then let them be Tier1
      const fallbackT1 = cleanData.price_tier_1 !== undefined 
        ? cleanData.price_tier_1 
        : (cleanData.unit_price !== undefined ? cleanData.unit_price : 0);
      if (cleanData.price_tier_2 === 0) cleanData.price_tier_2 = fallbackT1;
      if (cleanData.price_tier_3 === 0) cleanData.price_tier_3 = fallbackT1;
      if (cleanData.price_tier_4 === 0) cleanData.price_tier_4 = fallbackT1;
      if (cleanData.price_tier_5 === 0) cleanData.price_tier_5 = fallbackT1;

      injectMetadataIntoDescription(cleanData, itemData);

      return attachKeywordColumns(cleanData, itemData);
    });

    // Sample cleaned item ready

    // Get all SKUs from the batch
    const skus = cleanItems.map(item => item.sku).filter(Boolean);

    // Query existing items by SKU in this organization
    // Note: This will get ALL records including duplicates
    const { data: existingItems, error: queryError } = await supabase
      .from('inventory')
      .select('id, sku')
      .eq('organization_id', organizationId)
      .in('sku', skus);

    if (queryError) {
      // Error querying existing inventory
      throw queryError;
    }

    // Create a map of existing SKU -> Array of IDs (to handle duplicates)
    const existingSkuMap = new Map<string, string[]>();
    let duplicatesFound = 0;
    
    if (existingItems) {
      existingItems.forEach(item => {
        const existingIds = existingSkuMap.get(item.sku) || [];
        existingIds.push(item.id);
        existingSkuMap.set(item.sku, existingIds);
        
        // Track duplicates
        if (existingIds.length > 1 && existingIds.length === 2) {
          duplicatesFound++;
        }
      });
    }
    
    // Duplicates tracked if any found

    // Separate items into updates and creates
    const itemsToUpdate: { ids: string[]; data: any; sku: string }[] = [];
    const itemsToCreate: any[] = [];

    cleanItems.forEach(item => {
      const existingIds = existingSkuMap.get(item.sku);
      if (existingIds && existingIds.length > 0) {
        // Item exists (possibly with duplicates) - prepare for update
        const updateData = { ...item };
        delete updateData.organization_id; // Don't update organization_id
        itemsToUpdate.push({ ids: existingIds, data: updateData, sku: item.sku });
      } else {
        // Item doesn't exist - prepare for insert
        itemsToCreate.push(item);
      }
    });

    // Batch breakdown calculated

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Bulk insert new items
    if (itemsToCreate.length > 0) {
      try {
        // Creating items using direct insert
        
        // Direct insert without RPC to avoid schema cache issues
        const { data: createdData, error: createError } = await performRobustQuery(
          async (payload) => {
            return await supabase
              .from('inventory')
              .insert(payload)
              .select();
          },
          itemsToCreate
        );

        if (createError) {
          // Error bulk creating inventory
          errors.push(`Bulk create error: ${createError.message}`);
          failed += itemsToCreate.length;
        } else {
          created = createdData?.length || 0;
          // Successfully created items
        }
      } catch (error: any) {
        // Error in bulk create
        errors.push(`Bulk create exception: ${error.message}`);
        failed += itemsToCreate.length;
      }
    }

    // Bulk update existing items (one by one since Supabase doesn't support bulk update well)
    if (itemsToUpdate.length > 0) {
      for (const { ids, data: updateData, sku } of itemsToUpdate) {
        try {
          for (const id of ids) {
            const { error: updateError } = await performRobustQuery(
              async (payload) => {
                return await supabase
                  .from('inventory')
                  .update(payload)
                  .eq('id', id);
              },
              updateData
            );

            if (updateError) {
              throw updateError;
            }
          }
          updated += ids.length;
        } catch (error: any) {
          failed++;
          errors.push(`SKU ${sku}: ${error.message}`);
        }
      }
    }

    // Bulk upsert complete

    return { created, updated, failed, errors };
  } catch (error: any) {
    // Error bulk upserting inventory
    throw error;
  }
}

export async function regenerateInventoryKeywordsClient(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const profile = await ensureUserProfile(user.id);
  const organizationId = profile.organization_id;
  if (!organizationId) throw new Error('No organization ID found for user');

  const { data: item, error: fetchError } = await supabase
    .from('inventory')
    .select(INVENTORY_SELECT)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (fetchError || !item) {
    throw new Error('Inventory item not found');
  }

  const payload = {
    search_keywords: buildSearchKeywords(item),
    keyword_version: KEYWORD_VERSION,
    keywords_generated_at: new Date().toISOString(),
  };

  let { error: updateError } = await supabase
    .from('inventory')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (updateError && isMissingSearchKeywordsColumnError(updateError)) {
    throw new Error('Database migration required: search keyword columns are missing.');
  }

  if (updateError) {
    throw updateError;
  }

  return { success: true, keywordCount: payload.search_keywords.length };
}

export async function regenerateAllInventoryKeywordsClient(
  onProgress?: (progress: RegenerateAllKeywordsProgress) => void,
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const profile = await ensureUserProfile(user.id);
  const organizationId = profile.organization_id;
  if (!organizationId) throw new Error('No organization ID found for user');

  const { count, error: countError } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (countError) {
    throw countError;
  }

  const total = count || 0;

  const PAGE_SIZE = 300;
  let offset = 0;
  let updated = 0;
  let failed = 0;
  const failureDetails: string[] = [];

  const emitProgress = () => {
    if (!onProgress) return;
    const processed = updated + failed;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
    onProgress({
      processed,
      total,
      updated,
      failed,
      percent,
    });
  };

  emitProgress();

  while (true) {
    const { data: batch, error: batchError } = await supabase
      .from('inventory')
      .select(INVENTORY_SELECT)
      .eq('organization_id', organizationId)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (batchError) {
      throw batchError;
    }

    if (!batch || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      let payload;
      try {
        payload = {
          search_keywords: buildSearchKeywords(item),
          keyword_version: KEYWORD_VERSION,
          keywords_generated_at: new Date().toISOString(),
        };
      } catch (error) {
        failed += 1;
        if (failureDetails.length < 5) {
          failureDetails.push(getErrorMessage(error));
        }
        emitProgress();
        continue;
      }

      let { error: updateError } = await supabase
        .from('inventory')
        .update(payload)
        .eq('id', item.id)
        .eq('organization_id', organizationId);

      if (updateError && isMissingSearchKeywordsColumnError(updateError)) {
        throw new Error('Database migration required: search keyword columns are missing.');
      }

      if (updateError) {
        failed += 1;
        if (failureDetails.length < 5) {
          const sku = item?.sku || item?.id || 'unknown-sku';
          failureDetails.push(`SKU ${sku}: ${getErrorMessage(updateError)}`);
        }
      } else {
        updated += 1;
      }

      emitProgress();
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += batch.length;
  }

  return { success: true, updated, failed, total, failureDetails };
}

// Helper function to convert snake_case to camelCase
function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => snakeToCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = snakeToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to map simple database schema to expected format with case-insensitive column lookups
function mapInventoryItem(dbItem: any): any {
  const getCaseInsensitive = (obj: any, targetKey: string, fallback: any = undefined): any => {
    if (!obj) return fallback;
    
    // 1. Direct match
    if (obj[targetKey] !== undefined && obj[targetKey] !== null) return obj[targetKey];
    
    // 2. Define aliases for semantic fallback matching
    const aliases: Record<string, string[]> = {
      'name': ['item_name', 'itemname', 'title', 'item', 'product_name', 'productname', 'label'],
      'description': ['desc', 'notes', 'long_description', 'longdescription'],
      'sku': ['part_number', 'partnumber', 'item_code', 'itemcode', 'sku_code', 'skucode'],
      'category': ['department', 'dept', 'group', 'class'],
      'unit_of_measure': ['uom', 'unit', 'measure'],
      'quantity': ['qty', 'quantity_on_hand', 'quantityonhand', 'stock', 'inventory_on_hand', 'inventoryonhand'],
      'quantity_on_order': ['qty_on_order', 'quantityonorder', 'on_order', 'onorder'],
      'reorder_level': ['reorderlevel', 'reorder_point', 'reorderpoint'],
      'unit_price': ['unitprice', 'price', 'selling_price', 'sellingprice', 'price_tier_1', 'price_tier1'],
      'cost': ['cost_price', 'costprice', 'purchase_price', 'purchaseprice'],
      'upc': ['barcode', 'upc_code', 'upccode', 'ean', 'ean_code', 'eancode'],
      'min_stock': ['minstock', 'minimum_stock', 'minimumstock'],
      'max_stock': ['maxstock', 'maximum_stock', 'maximumstock'],
      'lead_time_days': ['leadtimedays', 'lead_time', 'leadtime'],
      'notes': ['comments', 'comment'],
      'tags': ['labels', 'tag_list'],
    };

    const candidates = [targetKey, ...(aliases[targetKey] || [])];
    const cleanCandidates = candidates.map(c => c.toLowerCase().replace(/_/g, ''));
    
    // 3. Match keys with lowercase and underscores removed
    for (const k of Object.keys(obj)) {
      const cleanK = k.toLowerCase().replace(/_/g, '');
      if (cleanCandidates.includes(cleanK)) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
    }
    
    // 4. Exact lowercase match
    const lowerCandidates = candidates.map(c => c.toLowerCase());
    for (const k of Object.keys(obj)) {
      const lowerK = k.toLowerCase();
      if (lowerCandidates.includes(lowerK)) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
    }
    
    return fallback;
  };

  const rawUnitPrice = getCaseInsensitive(dbItem, 'unit_price', 0);
  const rawCost = getCaseInsensitive(dbItem, 'cost', 0);
  const unitPriceInDollars = rawUnitPrice ? rawUnitPrice / 100 : 0;
  const costInDollars = rawCost ? rawCost / 100 : 0;
  
  // ✅ FIX: Use != null check instead of truthiness to properly handle $0.00 prices
  // A value of 0 is a legitimate price ($0.00) and should NOT trigger fallback
  
  // Auto-migrate: if T5 is inactive but has data, carry it into T2 (VIP) if T2 is NULL or 0.
  const t5Inactive = !isTierActive(5);
  const t5Value = getCaseInsensitive(dbItem, 'price_tier_5');
  
  // Determine the base/retail price (T1 or unit_price)
  const rawT1 = getCaseInsensitive(dbItem, 'price_tier_1');
  const priceTier1 = rawT1 != null ? rawT1 / 100 : unitPriceInDollars;
  
  // For T2-T4: if the tier is NULL in the DB, fall back to priceTier1 (Retail).
  // Business logic: if no specific tier price is set, the item sells at Retail.
  // If Tier2,Tier3,Tier4,Tier5 is 0 then let it be Tier1.
  // T2 (VIP): also check inactive T5 for auto-migration
  // ✅ FIX: Also migrate when T2 is 0 (not just NULL) if T5 has a real non-zero value.
  // This handles the case where a previous import put VIP data into price_tier_5.
  const rawT2 = getCaseInsensitive(dbItem, 'price_tier_2');
  const shouldMigrateT5toT2 = t5Inactive && t5Value != null && t5Value !== 0
    && (rawT2 == null || rawT2 === 0);
  let priceTier2 = shouldMigrateT5toT2 ? t5Value / 100
                   : rawT2 != null ? rawT2 / 100
                   : priceTier1;
  if (priceTier2 === 0) {
    priceTier2 = priceTier1;
  }

  const rawT3 = getCaseInsensitive(dbItem, 'price_tier_3');
  let priceTier3 = rawT3 != null ? rawT3 / 100 : priceTier1;
  if (priceTier3 === 0) {
    priceTier3 = priceTier1;
  }

  const rawT4 = getCaseInsensitive(dbItem, 'price_tier_4');
  let priceTier4 = rawT4 != null ? rawT4 / 100 : priceTier1;
  if (priceTier4 === 0) {
    priceTier4 = priceTier1;
  }

  // T5: if tier is inactive and user has not requested active fallback, normally 0.
  // But if Tier5 is 0, let it be Tier1.
  let priceTier5 = t5Inactive ? 0 : (t5Value != null ? t5Value / 100 : priceTier1);
  if (priceTier5 === 0) {
    priceTier5 = priceTier1;
  }

  // Parse description metadata comments if present
  let rawDescription = getCaseInsensitive(dbItem, 'description', '');
  let parsedDescription = rawDescription;
  let metadata: any = {};
  
  const markerStart = "<!--metadata:";
  const markerEnd = "-->";
  const startIndex = rawDescription.lastIndexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = rawDescription.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      const jsonStr = rawDescription.substring(startIndex + markerStart.length, endIndex);
      try {
        metadata = JSON.parse(jsonStr);
        parsedDescription = rawDescription.substring(0, startIndex).trim();
      } catch (e) {
        // Fallback
      }
    }
  }
  
  const dbQuantity = getCaseInsensitive(dbItem, 'quantity', 0);
  const dbQuantityOnOrder = getCaseInsensitive(dbItem, 'quantity_on_order', 0);
  const dbReorderLevel = getCaseInsensitive(dbItem, 'reorder_level', 0);
  const dbDepartmentCode = getCaseInsensitive(dbItem, 'department_code', '');
  
  let rawUnitOfMeasure = getCaseInsensitive(dbItem, 'unit_of_measure', 'ea');
  let dbUnitOfMeasure = 'ea';
  if (rawUnitOfMeasure) {
    const uomLower = String(rawUnitOfMeasure).toLowerCase().trim();
    if (uomLower === 'each' || uomLower === 'ea' || uomLower === 'pcs' || uomLower === 'pc' || uomLower === 'each (ea)') {
      dbUnitOfMeasure = 'ea';
    } else if (uomLower.includes('box')) {
      dbUnitOfMeasure = 'box';
    } else if (uomLower.includes('case')) {
      dbUnitOfMeasure = 'case';
    } else if (uomLower.includes('pound') || uomLower === 'lb' || uomLower === 'lbs') {
      dbUnitOfMeasure = 'lb';
    } else if (uomLower.includes('kilogram') || uomLower === 'kg' || uomLower === 'kgs') {
      dbUnitOfMeasure = 'kg';
    } else if (uomLower.includes('foot') || uomLower === 'ft' || uomLower === 'feet') {
      dbUnitOfMeasure = 'ft';
    } else if (uomLower.includes('meter') || uomLower === 'm') {
      dbUnitOfMeasure = 'm';
    } else if (uomLower.includes('gallon') || uomLower === 'gal') {
      dbUnitOfMeasure = 'gal';
    } else if (uomLower.includes('liter') || uomLower === 'l') {
      dbUnitOfMeasure = 'l';
    } else {
      dbUnitOfMeasure = 'ea';
    }
  }

  const dbLocation = getCaseInsensitive(dbItem, 'location', '');
  const dbImageUrl = getCaseInsensitive(dbItem, 'image_url', '');
  const dbSupplier = getCaseInsensitive(dbItem, 'supplier', '');
  const dbSupplierSku = getCaseInsensitive(dbItem, 'supplier_sku', '');
  const dbUpc = getCaseInsensitive(dbItem, 'upc', '');
  const dbStatus = getCaseInsensitive(dbItem, 'status', 'active');
  const dbMinStock = getCaseInsensitive(dbItem, 'min_stock', 0);
  const dbMaxStock = getCaseInsensitive(dbItem, 'max_stock', 0);
  const dbLeadTimeDays = getCaseInsensitive(dbItem, 'lead_time_days', 0);
  const dbNotes = getCaseInsensitive(dbItem, 'notes', '');
  const dbTags = getCaseInsensitive(dbItem, 'tags', []);
  const dbPriceLevels = getCaseInsensitive(dbItem, 'price_levels', '');

  let tagsArray: string[] = [];
  if (Array.isArray(dbTags)) {
    tagsArray = dbTags;
  } else if (typeof dbTags === 'string') {
    tagsArray = (dbTags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  return {
    ...snakeToCamel(dbItem),
    description: parsedDescription,
    // Map simple schema to full schema
    quantityOnHand: metadata.quantityOnHand !== undefined ? metadata.quantityOnHand : dbQuantity,
    quantityOnOrder: dbQuantityOnOrder,
    unitPrice: unitPriceInDollars,
    cost: costInDollars,
    priceTier1,
    priceTier2,
    priceTier3,
    priceTier4,
    priceTier5,
    departmentCode: dbDepartmentCode,
    unitOfMeasure: dbUnitOfMeasure,
    reorderLevel: dbReorderLevel,
    upc: dbUpc,
    barcode: dbUpc,
    supplier: dbSupplier,
    supplierSKU: dbSupplierSku,
    minStock: dbMinStock,
    maxStock: dbMaxStock,
    leadTimeDays: dbLeadTimeDays,
    notes: dbNotes,
    priceLevels: typeof dbPriceLevels === 'object' && dbPriceLevels !== null ? JSON.stringify(dbPriceLevels) : (dbPriceLevels || ''),
    status: metadata.status || dbStatus || 'active',
    location: metadata.location || dbLocation || '',
    imageUrl: metadata.imageUrl || dbImageUrl || '',
    tags: tagsArray,
    searchKeywords: Array.isArray(getCaseInsensitive(dbItem, 'search_keywords')) ? getCaseInsensitive(dbItem, 'search_keywords') : [],
    keywordVersion: getCaseInsensitive(dbItem, 'keyword_version', null),
    keywordsGeneratedAt: getCaseInsensitive(dbItem, 'keywords_generated_at', null),
  };
}
