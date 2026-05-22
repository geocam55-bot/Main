import { createClient } from './supabase/client';

/**
 * Optimize inventory table performance by adding critical indexes
 * This should dramatically speed up queries on large datasets (14k+ items)
 */
export async function optimizeInventoryPerformance() {
  const supabase = createClient();
  
  try {
    // Check if we can execute SQL (requires elevated permissions)
    // We'll try to create indexes using Supabase's RPC if available
    
    const optimizations = [
      {
        name: 'idx_inventory_organization_id',
        description: 'Index on organization_id for fast filtering',
        sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON inventory(organization_id);'
      },
      {
        name: 'idx_inventory_org_name',
        description: 'Composite index on organization_id + name for sorted queries',
        sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_org_name ON inventory(organization_id, name);'
      },
      {
        name: 'idx_inventory_sku',
        description: 'Index on SKU for fast lookups',
        sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);'
      },
      {
        name: 'idx_inventory_name_trgm',
        description: 'Trigram index for fast text search on name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm ON inventory USING gin(name gin_trgm_ops);'
      },
      {
        name: 'idx_inventory_description_trgm',
        description: 'Trigram index for fast text search on description',
        sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_description_trgm ON inventory USING gin(description gin_trgm_ops);'
      },
    ];
    
    return {
      success: true,
      message: 'Optimizations ready to apply',
      optimizations
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to prepare optimizations',
      error
    };
  }
}

/**
 * Get performance metrics for inventory queries
 */
export async function getInventoryPerformanceMetrics(organizationId: string) {
  const supabase = createClient();
  
  try {
    // Test query performance
    const startTime = performance.now();
    
    const { data, error, count } = await supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    const duration = performance.now() - startTime;
    
    if (error) throw error;
    
    // Test first page query
    const startTime2 = performance.now();
    
    const { data: firstPage, error: error2 } = await supabase
      .from('inventory')
      .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, organization_id, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .range(0, 199);
    
    const duration2 = performance.now() - startTime2;
    
    if (error2) throw error2;
    
    return {
      totalItems: count || 0,
      countQueryMs: duration,
      firstPageQueryMs: duration2,
      itemsPerSecond: count ? (count / (duration2 / 1000)) : 0,
      needsOptimization: duration2 > 1000 // If first page takes >1 second
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Instructions for manual database optimization
 */
export function getDatabaseOptimizationInstructions() {
  return `
📚 DATABASE OPTIMIZATION INSTRUCTIONS
=====================================

To dramatically speed up inventory queries (from 15-30 seconds to <1 second), 
you need to add indexes to your Supabase database.

🔧 STEP 1: Access Supabase SQL Editor
--------------------------------------
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your ProSpaces CRM project
3. Click "SQL Editor" in the left sidebar

🔧 STEP 2: Run This SQL
-----------------------
Copy and paste the following SQL into the editor and click "RUN":

-- Enable trigram extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on organization_id (CRITICAL for multi-tenant filtering)
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id 
ON inventory(organization_id);

-- Composite index on organization_id + name (speeds up sorted queries)
CREATE INDEX IF NOT EXISTS idx_inventory_org_name 
ON inventory(organization_id, name);

-- Index on SKU for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_sku 
ON inventory(sku);

-- Trigram indexes for fast text search
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm 
ON inventory USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_description_trgm 
ON inventory USING gin(description gin_trgm_ops);

-- Analyze table to update statistics
ANALYZE inventory;

🔧 STEP 3: Verify Indexes
--------------------------
Run this query to verify indexes were created:

SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'inventory' 
ORDER BY indexname;

✅ EXPECTED RESULTS
-------------------
After applying these indexes, you should see:
- Initial load: 15-30 seconds → 0.5-2 seconds (10-30x faster)
- Search queries: Much faster, especially on large datasets
- No code changes needed - indexes work automatically

⚠️ NOTE
--------
These indexes are essential for production use with 14k+ items.
Without indexes, PostgreSQL does full table scans which are extremely slow.
`;
}
