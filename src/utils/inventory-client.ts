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

    // Creating inventory item with clean data

    const keywordData = attachKeywordColumns(cleanData, itemData);

    let { data, error } = await supabase
      .from('inventory')
      .insert([keywordData])
      .select()
      .single();

    if (error && isMissingSearchKeywordsColumnError(error)) {
      ({ data, error } = await supabase
        .from('inventory')
        .insert([removeKeywordColumns(keywordData)])
        .select()
        .single());
    }

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
    // Note: Cost field temporarily removed from update to avoid PGRST204 error
    // Will be re-enabled after database migration

    // Updating inventory item with clean data

    const keywordData = attachKeywordColumns(cleanData, itemData);

    let { data, error } = await supabase
      .from('inventory')
      .update(keywordData)
      .eq('id', id)
      .select()
      .single();

    if (error && isMissingSearchKeywordsColumnError(error)) {
      ({ data, error } = await supabase
        .from('inventory')
        .update(removeKeywordColumns(keywordData))
        .eq('id', id)
        .select()
        .single());
    }

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
      name: itemData.name,
      sku: itemData.sku,
      organization_id: organizationId,
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
      let { data: updatedItems, error: updateError } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('sku', itemData.sku)
        .eq('organization_id', organizationId)
        .select();

      if (updateError && isMissingSearchKeywordsColumnError(updateError)) {
        ({ data: updatedItems, error: updateError } = await supabase
          .from('inventory')
          .update(removeKeywordColumns(updateData))
          .eq('sku', itemData.sku)
          .eq('organization_id', organizationId)
          .select());
      }
      
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
      
      let { data: createdItem, error: createError } = await supabase
        .from('inventory')
        .insert([keywordData])
        .select()
        .single();

      if (createError && isMissingSearchKeywordsColumnError(createError)) {
        ({ data: createdItem, error: createError } = await supabase
          .from('inventory')
          .insert([removeKeywordColumns(keywordData)])
          .select()
          .single());
      }
      
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
        name: itemData.name,
        sku: itemData.sku,
        organization_id: organizationId,
      };

      // Add optional fields only if they exist
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
        let { data: createdData, error: createError } = await supabase
          .from('inventory')
          .insert(itemsToCreate)
          .select();

        if (createError && isMissingSearchKeywordsColumnError(createError)) {
          const fallbackItems = itemsToCreate.map(removeKeywordColumns);
          ({ data: createdData, error: createError } = await supabase
            .from('inventory')
            .insert(fallbackItems)
            .select());
        }

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
            let { error: updateError } = await supabase
              .from('inventory')
              .update(updateData)
              .eq('id', id);

            if (updateError && isMissingSearchKeywordsColumnError(updateError)) {
              ({ error: updateError } = await supabase
                .from('inventory')
                .update(removeKeywordColumns(updateData))
                .eq('id', id));
            }

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

// Helper to map simple database schema to expected format
function mapInventoryItem(dbItem: any): any {
  // Convert unit_price from cents (integer) back to dollars (decimal)
  const unitPriceInDollars = dbItem.unit_price ? dbItem.unit_price / 100 : 0;
  
  // Convert cost from cents (integer) back to dollars (decimal)
  const costInDollars = dbItem.cost ? dbItem.cost / 100 : 0;
  
  // ✅ FIX: Use != null check instead of truthiness to properly handle $0.00 prices
  // A value of 0 is a legitimate price ($0.00) and should NOT trigger fallback
  
  // Auto-migrate: if T5 is inactive but has data, carry it into T2 (VIP) if T2 is NULL or 0.
  const t5Inactive = !isTierActive(5);
  const t5Value = dbItem.price_tier_5 != null ? dbItem.price_tier_5 : null;
  
  // Determine the base/retail price (T1 or unit_price)
  const priceTier1 = dbItem.price_tier_1 != null ? dbItem.price_tier_1 / 100 : unitPriceInDollars;
  
  // For T2-T4: if the tier is NULL in the DB, fall back to priceTier1 (Retail).
  // Business logic: if no specific tier price is set, the item sells at Retail.
  // A value of 0 in the DB is a legitimate $0.00 price and is preserved as-is.
  // T2 (VIP): also check inactive T5 for auto-migration
  // ✅ FIX: Also migrate when T2 is 0 (not just NULL) if T5 has a real non-zero value.
  // This handles the case where a previous import put VIP data into price_tier_5.
  const shouldMigrateT5toT2 = t5Inactive && t5Value != null && t5Value !== 0
    && (dbItem.price_tier_2 == null || dbItem.price_tier_2 === 0);
  const priceTier2 = shouldMigrateT5toT2 ? t5Value / 100
                   : dbItem.price_tier_2 != null ? dbItem.price_tier_2 / 100
                   : priceTier1;
  const priceTier3 = dbItem.price_tier_3 != null ? dbItem.price_tier_3 / 100 : priceTier1;
  const priceTier4 = dbItem.price_tier_4 != null ? dbItem.price_tier_4 / 100 : priceTier1;
  // T5: if tier is inactive, always default to 0 regardless of DB value
  const priceTier5 = t5Inactive ? 0 : (dbItem.price_tier_5 != null ? dbItem.price_tier_5 / 100 : priceTier1);
  
  return {
    ...snakeToCamel(dbItem),
    // Map simple schema to full schema
    quantityOnHand: dbItem.quantity || 0,
    quantityOnOrder: dbItem.quantity_on_order || 0,
    unitPrice: unitPriceInDollars,
    cost: costInDollars,
    priceTier1,
    priceTier2,
    priceTier3,
    priceTier4,
    priceTier5,
    departmentCode: dbItem.department_code || '',
    unitOfMeasure: dbItem.unit_of_measure || 'ea',
    reorderLevel: 0,
    minStock: 0,
    maxStock: 0,
    status: 'active',
    tags: [],
    searchKeywords: Array.isArray(dbItem.search_keywords) ? dbItem.search_keywords : [],
    keywordVersion: dbItem.keyword_version || null,
    keywordsGeneratedAt: dbItem.keywords_generated_at || null,
  };
}
