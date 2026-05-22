/**
 * PERFORMANCE FIX: Optimized loadInventory function
 * 
 * This replaces the old approach of loading all 35k+ items
 * Now uses server-side pagination - only loads current page
 * 
 * DROP THIS INTO /components/Inventory.tsx replacing the loadInventory function
 */

const loadInventory = async () => {
  const startTime = performance.now();
  
  try {
    setIsLoading(true);
    console.log('🔄 [Inventory] Loading page', currentPage);
    
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setIsLoading(false);
      return;
    }
    
    const profile = await ensureUserProfile(authUser.id);
    const userOrgId = profile.organization_id;
    
    if (!userOrgId) {
      console.error('❌ No organization_id found for user!');
      setIsLoading(false);
      return;
    }
    
    setOrganizationId(userOrgId);
    
    // ⚡ Server-side pagination - only load current page
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    let query = supabase
      .from('inventory')
      .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, organization_id, created_at, updated_at', { count: 'exact' })
      .eq('organization_id', userOrgId);
    
    // ⚡ Server-side filtering
    if (searchQuery.trim()) {
      const search = searchQuery.trim();
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }
    
    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }
    
    query = query
      .order('name', { ascending: true })
      .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      if (error.code === 'PGRST205' || error.code === '42P01') {
        setTableExists(false);
      }
      setIsLoading(false);
      return;
    }
    
    const items = data ? data.map(mapInventoryItem) : [];
    
    setItems(items);
    setTotalCount(count || 0);
    setTableExists(true);
    setIsLoading(false);
    
    const loadTime = performance.now() - startTime;
    setLoadTimeMs(loadTime);
    
    console.log(`✅ Loaded ${items.length} items (page ${currentPage}/${Math.ceil((count || 0) / itemsPerPage)}) in ${loadTime.toFixed(0)}ms`);
    
    // Check for duplicates (first page only, async)
    if (currentPage === 1) {
      setTimeout(async () => {
        const dupCount = await checkForDuplicates(userOrgId);
        if (dupCount > 0) {
          console.warn(`⚠️ Found ${dupCount} duplicate SKUs`);
          setShowDuplicateCleaner(true);
        }
      }, 1000);
    }
    
  } catch (error: any) {
    console.error('❌ Failed to load inventory:', error);
    if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
      setTableExists(false);
    } else {
      showAlert('error', 'Failed to load inventory items');
    }
    setIsLoading(false);
  }
};
