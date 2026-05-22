# Quick Fix for Inventory Performance

## Changes Needed in /components/Inventory.tsx

### 1. Find line 403-438 and REPLACE with:

```typescript
      // Store total count
      setTotalCount(count || 0);
      
      // ⚡ PERFORMANCE FIX: Don't load all 35k items - use pagination instead
      console.log(`✅ Using server-side pagination - only loaded page 1`);
      
      // Check for duplicates (non-blocking, first page only)
      if (currentPage === 1 && count && count > 0) {
        setTimeout(async () => {
          const dupCount = await checkForDuplicates(userOrgId);
          if (dupCount > 0) {
            console.warn(`⚠️ Found ${dupCount} duplicate SKUs in database`);
            setShowDuplicateCleaner(true);
          }
        }, 1000);
      }
      
    } catch (error: any) {
```

### 2. Find line 358-368 and REPLACE with:

```typescript
      // ⚡ Server-side pagination - only load current page
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      let query = supabase
        .from('inventory')
        .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, organization_id, created_at, updated_at', { count: 'exact' })
        .eq('organization_id', userOrgId);
      
      // ⚡ Server-side search filtering
      if (searchQuery.trim()) {
        const search = searchQuery.trim();
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
      }
      
      // ⚡ Server-side category filtering
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      
      query = query
        .order('name', { ascending: true })
        .range(from, to);
      
      const { data, error, count } = await query;
```

### 3. DELETE the entire loadRemainingItems function (lines 257-327)

This function is loading ALL items in the background which causes the slowness.

### 4. Update line 376-390 to:

```typescript
      // Map items
      const mappedItems = data ? data.map(mapInventoryItem) : [];
      
      setItems(mappedItems);
      setTableExists(true);
      setIsLoading(false);
```

The key insight: **Stop loading all 35,516 items**. Only load the current page (50 items).
