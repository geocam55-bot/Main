import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractUserToken } from './auth-helper.ts';

// ---------------------------------------------------------------------------
// Helper: Smart batch upsert that pre-checks existing SKUs and splits into
// updates (existing) vs inserts (new), avoiding the slow one-by-one fallback.
// ---------------------------------------------------------------------------
interface BatchResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}

async function smartBatchUpsert(
  supabase: any,
  records: any[],
  orgId: string,
  startIdx: number,
): Promise<BatchResult> {
  const result: BatchResult = { inserted: 0, updated: 0, skipped: 0, errors: 0, errorMessages: [] };

  // 1. Build inventory records from raw import data
  const inventoryRecords: any[] = [];
  for (const record of records) {
    try {
      if (!record.name && !record.sku) { result.skipped++; continue; }
      inventoryRecords.push({
        organization_id: orgId,
        name: record.name || record.sku || 'Unnamed Item',
        sku: record.sku || `AUTO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        description: record.description || '',
        category: record.category || 'Uncategorized',
        quantity: parseInt(record.quantity) || 0,
        quantity_on_order: parseInt(record.quantity_on_order) || 0,
        unit_price: Math.round((parseFloat(record.unit_price) || parseFloat(record.price_tier_1) || 0) * 100),
        cost: Math.round((parseFloat(record.cost) || 0) * 100),
        price_tier_1: Math.round((parseFloat(record.price_tier_1) || 0) * 100),
        price_tier_2: Math.round((parseFloat(record.price_tier_2) || 0) * 100),
        price_tier_3: Math.round((parseFloat(record.price_tier_3) || 0) * 100),
        price_tier_4: Math.round((parseFloat(record.price_tier_4) || 0) * 100),
        price_tier_5: Math.round((parseFloat(record.price_tier_5) || 0) * 100),
        department_code: record.department_code || null,
        unit_of_measure: record.unit_of_measure || 'ea',
      });
    } catch (e: any) {
      result.errors++;
      if (result.errorMessages.length < 20) result.errorMessages.push(`Record ${startIdx + records.indexOf(record)}: ${e.message}`);
    }
  }

  if (inventoryRecords.length === 0) return result;

  // 2. Collect all SKUs and pre-check which ones already exist in one query
  const skuList = inventoryRecords.map(r => r.sku);
  // Supabase .in() has a practical limit (~300-500 items). Process in sub-batches.
  const SKU_CHECK_BATCH = 300;
  const existingMap = new Map<string, string>(); // sku -> existing record id

  for (let i = 0; i < skuList.length; i += SKU_CHECK_BATCH) {
    const skuSlice = skuList.slice(i, i + SKU_CHECK_BATCH);
    const { data: existingRows, error: lookupErr } = await supabase
      .from('inventory')
      .select('id, sku')
      .eq('organization_id', orgId)
      .in('sku', skuSlice);

    if (lookupErr) {
      console.error(`SKU lookup error at offset ${i}:`, lookupErr.message);
      // On lookup failure, treat all as new and let insert handle conflicts
    } else if (existingRows) {
      for (const row of existingRows) {
        existingMap.set(row.sku, row.id);
      }
    }
  }

  console.log(`  Pre-check: ${existingMap.size} existing SKUs, ${inventoryRecords.length - existingMap.size} new`);

  // 3. Split into updates and inserts
  const toUpdate: Array<{ id: string; data: any }> = [];
  const toInsert: any[] = [];

  for (const rec of inventoryRecords) {
    const existingId = existingMap.get(rec.sku);
    if (existingId) {
      toUpdate.push({ id: existingId, data: rec });
    } else {
      toInsert.push(rec);
    }
  }

  // 4. Batch INSERT new records
  if (toInsert.length > 0) {
    const INSERT_BATCH = 200;
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const batch = toInsert.slice(i, i + INSERT_BATCH);
      const { error: insertError } = await supabase.from('inventory').insert(batch);
      if (insertError) {
        console.error(`Insert batch error at ${i}:`, insertError.message);
        // If batch fails, try individually (rare — shouldn't happen since we already filtered existing)
        for (const rec of batch) {
          const { error: singleErr } = await supabase.from('inventory').insert(rec);
          if (singleErr) {
            result.errors++;
            if (result.errorMessages.length < 20) result.errorMessages.push(`Insert SKU ${rec.sku}: ${singleErr.message}`);
          } else {
            result.inserted++;
          }
        }
      } else {
        result.inserted += batch.length;
      }
    }
  }

  // 5. Batch UPDATE existing records (parallelized in groups of 20)
  if (toUpdate.length > 0) {
    const UPDATE_PARALLEL = 20;
    for (let i = 0; i < toUpdate.length; i += UPDATE_PARALLEL) {
      const batch = toUpdate.slice(i, i + UPDATE_PARALLEL);
      const updatePromises = batch.map(({ id, data }) =>
        supabase.from('inventory').update(data).eq('id', id)
      );
      const results = await Promise.all(updatePromises);
      for (let j = 0; j < results.length; j++) {
        if (results[j].error) {
          result.errors++;
          if (result.errorMessages.length < 20) result.errorMessages.push(`Update SKU ${batch[j].data.sku}: ${results[j].error.message}`);
        } else {
          result.updated++;
        }
      }
    }
  }

  return result;
}

export function inventoryDiagnostic(app: Hono) {

  // Check table existence and schema
  app.post('/make-server-8405be07/inventory-diagnostic/check-table', async (c) => {
    console.log('🔍 Check table endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const results: any = { tables: {}, errors: [] };

      // Check multiple possible table names
      const tableNames = ['inventory', 'inventory_items', 'products', 'items'];
      
      for (const tableName of tableNames) {
        try {
          const { count, error, status, statusText } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          results.tables[tableName] = {
            exists: !error || error.code !== '42P01', // 42P01 = table doesn't exist
            count: count,
            error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
            status,
            statusText,
          };
        } catch (e: any) {
          results.tables[tableName] = {
            exists: false,
            count: null,
            error: { message: e.message },
          };
        }
      }

      // Also try to get column info from inventory table
      try {
        const { data: sampleRow, error: sampleError } = await supabase
          .from('inventory')
          .select('*')
          .limit(1);

        results.inventorySample = {
          columns: sampleRow && sampleRow.length > 0 ? Object.keys(sampleRow[0]) : [],
          sampleRow: sampleRow?.[0] || null,
          error: sampleError ? { message: sampleError.message, code: sampleError.code } : null,
          rowReturned: sampleRow && sampleRow.length > 0,
        };
      } catch (e: any) {
        results.inventorySample = { error: { message: e.message } };
      }

      // Check scheduled_jobs table
      try {
        const { data: jobs, count: jobCount, error: jobError } = await supabase
          .from('scheduled_jobs')
          .select('id, status, data_type, file_name, record_count, organization_id, error_message, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(10);

        results.scheduledJobs = {
          totalCount: jobCount,
          recentJobs: jobs || [],
          error: jobError ? { message: jobError.message, code: jobError.code } : null,
        };
      } catch (e: any) {
        results.scheduledJobs = { error: { message: e.message } };
      }

      // Check background_import_items table (items might be staged here)
      try {
        const { count: importItemCount, error: importError } = await supabase
          .from('background_import_items')
          .select('*', { count: 'exact', head: true });

        results.backgroundImportItems = {
          count: importItemCount,
          error: importError ? { message: importError.message, code: importError.code } : null,
        };
      } catch (e: any) {
        results.backgroundImportItems = { error: { message: e.message } };
      }

      console.log('✅ Table check complete:', JSON.stringify(results, null, 2));
      return c.json(results);

    } catch (error: any) {
      console.error('❌ Check table error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Run diagnostic - bypasses RLS to see ALL inventory items
  app.post('/make-server-8405be07/inventory-diagnostic/run', async (c) => {
    console.log('🔍 Inventory diagnostic endpoint hit');

    try {
      // Verify user is authenticated
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      // Parse request body for fallback user info
      let bodyData: any = {};
      try {
        bodyData = await c.req.json();
      } catch {
        // No body is fine
      }

      // Use service role to bypass RLS
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify the user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        console.error('Auth error:', authError);
        return c.json({ error: 'Unauthorized', details: authError?.message }, 401);
      }

      console.log('🔍 Authenticated user:', user.id, user.email);

      // Get user's profile and org ID - try multiple approaches
      let userOrgId: string | null = null;
      let userEmail = user.email || bodyData.email || '';
      let userRole = bodyData.role || 'unknown';
      const orgResolutionLog: string[] = [];

      // Approach 1: Try profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, organization_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        userOrgId = profile.organization_id;
        userEmail = profile.email || userEmail;
        userRole = profile.role || userRole;
        orgResolutionLog.push(`profiles table: ${userOrgId}`);
        console.log('✅ Found profile, org:', userOrgId);
      } else {
        orgResolutionLog.push(`profiles table: FAILED (${profileError?.message})`);
        console.warn('⚠️ Profile lookup failed:', profileError?.message, profileError?.code);

        // Approach 2: Try organization_members table
        const { data: membership, error: memberError } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (membership) {
          userOrgId = membership.organization_id;
          userRole = membership.role || userRole;
          orgResolutionLog.push(`organization_members table: ${userOrgId}`);
          console.log('✅ Found org via organization_members:', userOrgId);
        } else {
          orgResolutionLog.push(`organization_members table: FAILED (${memberError?.message})`);
          console.warn('⚠️ organization_members lookup failed:', memberError?.message);

          // Approach 3: Use org ID from request body (passed from frontend)
          if (bodyData.organizationId) {
            userOrgId = bodyData.organizationId;
            orgResolutionLog.push(`request body: ${userOrgId}`);
            console.log('✅ Using org ID from request body:', userOrgId);
          } else {
            orgResolutionLog.push(`request body: no organizationId provided`);
            // Approach 4: Check user metadata
            const meta = user.user_metadata || {};
            if (meta.organization_id) {
              userOrgId = meta.organization_id;
              orgResolutionLog.push(`user metadata: ${userOrgId}`);
              console.log('✅ Using org ID from user metadata:', userOrgId);
            } else {
              orgResolutionLog.push(`user metadata: no organization_id`);
            }
          }
        }
      }

      console.log('🔍 Final - User:', userEmail, 'Org:', userOrgId);
      console.log('🔍 Org resolution log:', orgResolutionLog);

      // Collect query errors to return to frontend
      const queryErrors: Record<string, string> = {};

      // 1. Total items in database (bypassing RLS)
      const { count: totalCount, error: totalError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('Total count error:', JSON.stringify(totalError));
        queryErrors['totalCount'] = `${totalError.message} (code: ${totalError.code}, hint: ${totalError.hint || 'none'})`;
      }
      console.log('📊 Total items in database:', totalCount, totalError ? `ERROR: ${totalError.message}` : '');

      // 2. Items in user's organization
      let userOrgCount: number | null = 0;
      let userOrgError: any = null;
      if (userOrgId) {
        const result = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', userOrgId);
        userOrgCount = result.count;
        userOrgError = result.error;
      }

      if (userOrgError) {
        console.error('User org count error:', JSON.stringify(userOrgError));
        queryErrors['userOrgCount'] = `${userOrgError.message} (code: ${userOrgError.code})`;
      }
      console.log('📊 Items in user org:', userOrgCount);

      // 3. Items with NULL organization_id
      const { count: nullOrgCount, error: nullOrgError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .is('organization_id', null);

      if (nullOrgError) {
        console.error('Null org count error:', JSON.stringify(nullOrgError));
        queryErrors['nullOrgCount'] = `${nullOrgError.message} (code: ${nullOrgError.code})`;
      }
      console.log('📊 Items with null org:', nullOrgCount);

      // 4. Get distinct organization_ids and their counts
      const { data: allOrgItems, error: orgItemsError } = await supabase
        .from('inventory')
        .select('organization_id')
        .not('organization_id', 'is', null)
        .limit(100000);

      if (orgItemsError) {
        queryErrors['orgBreakdown'] = `${orgItemsError.message} (code: ${orgItemsError.code})`;
      }

      const orgCounts: Record<string, number> = {};
      if (allOrgItems) {
        allOrgItems.forEach((item: any) => {
          const orgId = item.organization_id;
          orgCounts[orgId] = (orgCounts[orgId] || 0) + 1;
        });
      }

      const orgBreakdown = Object.entries(orgCounts).map(([org_id, count]) => ({
        org_id,
        count,
        is_user_org: org_id === userOrgId,
      }));

      // Sort: user org first, then by count descending
      orgBreakdown.sort((a, b) => {
        if (a.is_user_org) return -1;
        if (b.is_user_org) return 1;
        return b.count - a.count;
      });

      console.log('📊 Org breakdown:', orgBreakdown);

      // 5. Get sample items from different scenarios
      const { data: userOrgSamples } = userOrgId
        ? await supabase
            .from('inventory')
            .select('id, name, sku, category, quantity, organization_id, created_at')
            .eq('organization_id', userOrgId)
            .order('created_at', { ascending: false })
            .limit(5)
        : { data: [] };

      const { data: nullOrgSamples } = await supabase
        .from('inventory')
        .select('id, name, sku, category, quantity, organization_id, created_at')
        .is('organization_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const otherOrgIds = Object.keys(orgCounts).filter(id => id !== userOrgId);
      let otherOrgSamples: any[] = [];
      if (otherOrgIds.length > 0) {
        const { data: otherSamples } = await supabase
          .from('inventory')
          .select('id, name, sku, category, quantity, organization_id, created_at')
          .in('organization_id', otherOrgIds.slice(0, 3))
          .order('created_at', { ascending: false })
          .limit(5);
        otherOrgSamples = otherSamples || [];
      }

      // 6. Check recent import jobs - look at multiple possible data_type values
      const { data: recentJobs } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Filter to inventory-related jobs
      const inventoryJobs = (recentJobs || []).filter((job: any) =>
        job.data_type === 'inventory' ||
        job.job_type === 'inventory_import' ||
        job.type === 'inventory_import' ||
        (job.file_name && job.file_name.toLowerCase().includes('inventory'))
      );

      // 7. Check staging table (background_import_items)
      let stagingCount = 0;
      try {
        const { count: sCount } = await supabase
          .from('background_import_items')
          .select('*', { count: 'exact', head: true });
        stagingCount = sCount || 0;
      } catch (e) {
        // ignore
      }

      // 8. Check for potential backup tables
      const backupTables: Record<string, number> = {};
      const potentialBackups = ['inventory_backup', 'inventory_old', 'inventory_v1', 'products_backup', 'old_inventory'];
      
      for (const tableName of potentialBackups) {
        try {
          const { count: bCount, error: bError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (!bError && bCount !== null) {
            backupTables[tableName] = bCount;
          }
        } catch (e) {
          // ignore
        }
      }

      // 9. Try to get a raw sample to understand the data shape
      let rawSample: any = null;
      try {
        const { data: rawData, error: rawError } = await supabase
          .from('inventory')
          .select('*')
          .limit(1);
        
        if (rawData && rawData.length > 0) {
          rawSample = {
            columns: Object.keys(rawData[0]),
            row: rawData[0],
          };
        } else if (rawError) {
          rawSample = { error: rawError.message, code: rawError.code };
        } else {
          rawSample = { message: 'Table exists but has 0 rows' };
        }
      } catch (e: any) {
        rawSample = { error: e.message };
      }

      const result = {
        user: {
          email: userEmail,
          orgId: userOrgId,
          role: userRole,
          userId: user.id,
        },
        counts: {
          totalInDatabase: totalCount || 0,
          inUserOrg: userOrgCount || 0,
          withNullOrg: nullOrgCount || 0,
          inOtherOrgs: Math.max(0, (totalCount || 0) - (userOrgCount || 0) - (nullOrgCount || 0)),
          inStaging: stagingCount || 0,
        },
        orgBreakdown,
        orgResolutionLog,
        queryErrors,
        rawSample,
        samples: {
          userOrg: userOrgSamples || [],
          nullOrg: nullOrgSamples || [],
          otherOrgs: otherOrgSamples,
        },
        recentJobs: inventoryJobs.length > 0 ? inventoryJobs : (recentJobs || []).slice(0, 10),
        diagnosis: getDiagnosis(totalCount || 0, userOrgCount || 0, nullOrgCount || 0, orgBreakdown, userOrgId),
        backupTables, // Include found backups
      };

      console.log('✅ Diagnostic complete:', JSON.stringify(result.counts));
      console.log('🩺 Diagnosis:', result.diagnosis);
      console.log('🔍 Query errors:', queryErrors);

      return c.json(result);

    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      return c.json({ error: 'Internal server error', message: error.message, stack: error.stack }, 500);
    }
  });

  // Fix: Reassign items with wrong/null organization_id to user's org
  app.post('/make-server-8405be07/inventory-diagnostic/fix-org-ids', async (c) => {
    console.log('🔧 Fix org IDs endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const body = await c.req.json();
      const { fixType, targetOrgId, sourceOrgId } = body;
      // fixType: 'null_to_user' | 'other_to_user' | 'all_to_user'

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, organization_id, role')
        .eq('id', user.id)
        .single();

      // Determine org ID: prefer targetOrgId from request, then profile, then organization_members
      let userOrgId = targetOrgId;
      if (!userOrgId && profile) {
        userOrgId = profile.organization_id;
      }
      if (!userOrgId) {
        // Fallback: try organization_members
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (membership) {
          userOrgId = membership.organization_id;
        }
      }
      if (!userOrgId) {
        return c.json({ error: 'Could not determine organization ID. Please specify a target org ID.' }, 400);
      }

      console.log(`🔧 Fix type: ${fixType}, target org: ${userOrgId}, source org: ${sourceOrgId || 'N/A'}`);

      let updatedCount = 0;
      const batchErrors: string[] = [];

      if (fixType === 'null_to_user') {
        // Fix items with NULL organization_id
        console.log('🔧 Fixing NULL org items -> ', userOrgId);

        let hasMore = true;
        let iteration = 0;
        while (hasMore && iteration < 200) { // Safety limit: 200 batches = 200,000 items
          iteration++;
          const { data: batch, error: batchError } = await supabase
            .from('inventory')
            .select('id')
            .is('organization_id', null)
            .limit(1000);

          if (batchError) {
            console.error('Batch fetch error:', batchError);
            batchErrors.push(`Batch ${iteration} fetch: ${batchError.message}`);
            break;
          }

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          if (updateError) {
            console.error('Batch update error:', updateError);
            batchErrors.push(`Batch ${iteration} update: ${updateError.message}`);
            break;
          }

          updatedCount += ids.length;
          console.log(`📦 Updated batch ${iteration}: ${ids.length} items (total: ${updatedCount})`);

          if (batch.length < 1000) {
            hasMore = false;
          }
        }

      } else if (fixType === 'other_to_user' && sourceOrgId) {
        // Fix items from a specific other org
        console.log(`🔧 Fixing items from org ${sourceOrgId} -> ${userOrgId}`);

        let hasMore = true;
        let iteration = 0;
        while (hasMore && iteration < 200) {
          iteration++;
          const { data: batch, error: batchError } = await supabase
            .from('inventory')
            .select('id')
            .eq('organization_id', sourceOrgId)
            .limit(1000);

          if (batchError) {
            batchErrors.push(`Batch ${iteration} fetch: ${batchError.message}`);
            break;
          }

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          if (updateError) {
            batchErrors.push(`Batch ${iteration} update: ${updateError.message}`);
            break;
          }

          updatedCount += ids.length;
          console.log(`📦 Updated batch ${iteration}: ${ids.length} items (total: ${updatedCount})`);

          if (batch.length < 1000) {
            hasMore = false;
          }
        }

      } else if (fixType === 'all_to_user') {
        // Fix ALL items that don't belong to user's org
        console.log(`🔧 Fixing ALL items -> ${userOrgId}`);

        // First fix null org items
        let hasMore = true;
        let iteration = 0;
        while (hasMore && iteration < 200) {
          iteration++;
          const { data: batch } = await supabase
            .from('inventory')
            .select('id')
            .is('organization_id', null)
            .limit(1000);

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          if (updateError) {
            batchErrors.push(`Null batch ${iteration} update: ${updateError.message}`);
            break;
          }

          updatedCount += ids.length;
          if (batch.length < 1000) hasMore = false;
        }

        // Then fix items in other orgs
        hasMore = true;
        iteration = 0;
        while (hasMore && iteration < 200) {
          iteration++;
          const { data: batch, error: batchError } = await supabase
            .from('inventory')
            .select('id')
            .neq('organization_id', userOrgId)
            .not('organization_id', 'is', null)
            .limit(1000);

          if (batchError) {
            batchErrors.push(`Other batch ${iteration} fetch: ${batchError.message}`);
            break;
          }

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          if (updateError) {
            batchErrors.push(`Other batch ${iteration} update: ${updateError.message}`);
            break;
          }

          updatedCount += ids.length;
          console.log(`📦 Updated batch ${iteration}: ${ids.length} items (total: ${updatedCount})`);

          if (batch.length < 1000) hasMore = false;
        }
      }

      console.log(`✅ Fix complete: ${updatedCount} items updated, ${batchErrors.length} errors`);

      return c.json({
        success: true,
        updatedCount,
        targetOrgId: userOrgId,
        batchErrors: batchErrors.length > 0 ? batchErrors : undefined,
      });

    } catch (error: any) {
      console.error('❌ Fix error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Direct SQL count endpoint - uses RPC if available, otherwise raw count
  app.post('/make-server-8405be07/inventory-diagnostic/raw-count', async (c) => {
    console.log('🔢 Raw count endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Try multiple approaches to count
      const results: any = {};

      // Approach 1: Standard count
      const { count: count1, error: err1 } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });
      results.standardCount = { count: count1, error: err1 ? err1.message : null };

      // Approach 2: Select id and count returned rows
      const { data: data2, error: err2 } = await supabase
        .from('inventory')
        .select('id')
        .limit(1);
      results.selectOne = { 
        hasData: data2 && data2.length > 0, 
        error: err2 ? err2.message : null 
      };

      // Approach 3: Try estimated count
      const { count: count3, error: err3 } = await supabase
        .from('inventory')
        .select('*', { count: 'estimated', head: true });
      results.estimatedCount = { count: count3, error: err3 ? err3.message : null };

      // Approach 4: Get distinct org IDs
      const { data: data4, error: err4 } = await supabase
        .from('inventory')
        .select('organization_id')
        .limit(20);
      results.sampleOrgs = {
        orgs: data4?.map((r: any) => r.organization_id) || [],
        error: err4 ? err4.message : null,
      };

      console.log('🔢 Raw count results:', JSON.stringify(results));
      return c.json(results);

    } catch (error: any) {
      console.error('❌ Raw count error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Find pending import jobs across ALL orgs (service role bypasses RLS)
  app.post('/make-server-8405be07/inventory-diagnostic/find-pending-jobs', async (c) => {
    console.log('🔍 Find pending jobs endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Find ALL scheduled jobs regardless of org - use service role to bypass RLS
      const { data: allJobs, error: jobsError } = await supabase
        .from('scheduled_jobs')
        .select('id, organization_id, created_by, job_type, data_type, scheduled_time, status, created_at, completed_at, error_message, record_count, file_name, creator_name')
        .order('created_at', { ascending: false })
        .limit(50);

      if (jobsError) {
        console.error('Jobs query error:', jobsError);
        return c.json({ error: 'Failed to query jobs', details: jobsError.message }, 500);
      }

      // For each pending job, check if it has file_data with records
      const jobSummaries = [];
      for (const job of (allJobs || [])) {
        const summary: any = { ...job };

        // For pending/processing jobs, check how many records are in file_data
        if (job.status === 'pending' || job.status === 'processing') {
          const { data: jobWithData, error: dataError } = await supabase
            .from('scheduled_jobs')
            .select('file_data')
            .eq('id', job.id)
            .single();

          if (jobWithData?.file_data?.records) {
            summary.recordsInFileData = jobWithData.file_data.records.length;
            // Show first record as sample
            if (jobWithData.file_data.records.length > 0) {
              summary.sampleRecord = jobWithData.file_data.records[0];
            }
            summary.mappingKeys = jobWithData.file_data.mapping
              ? Object.keys(jobWithData.file_data.mapping)
              : [];
          } else {
            summary.recordsInFileData = 0;
            summary.fileDataError = dataError?.message || 'No file_data or empty records';
          }
        }

        jobSummaries.push(summary);
      }

      const pendingCount = jobSummaries.filter(j => j.status === 'pending').length;
      const totalPendingRecords = jobSummaries
        .filter(j => j.status === 'pending')
        .reduce((sum, j) => sum + (j.recordsInFileData || 0), 0);

      console.log(`✅ Found ${allJobs?.length || 0} jobs, ${pendingCount} pending with ${totalPendingRecords} total records`);

      return c.json({
        totalJobs: allJobs?.length || 0,
        pendingCount,
        totalPendingRecords,
        jobs: jobSummaries,
      });

    } catch (error: any) {
      console.error('❌ Find pending jobs error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Process a pending job server-side (CHUNKED to avoid Edge Function timeouts).
  // Each call processes up to `batchLimit` records starting from `batchOffset`.
  // Returns { done, nextOffset, ... } — the frontend should loop until done === true.
  app.post('/make-server-8405be07/inventory-diagnostic/process-job', async (c) => {
    console.log('🔧 Process job endpoint hit (chunked)');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const body = await c.req.json();
      const { jobId, targetOrgId, batchOffset = 0, batchLimit = 500 } = body;

      if (!jobId) {
        return c.json({ error: 'jobId is required' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { data: job, error: jobError } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return c.json({ error: 'Job not found', details: jobError?.message }, 404);
      }

      const records = job.file_data?.records || [];
      if (records.length === 0) {
        return c.json({ error: 'Job has no records in file_data' }, 400);
      }

      const orgId = targetOrgId || job.organization_id;
      if (!orgId) {
        return c.json({ error: 'No target organization ID. Provide targetOrgId in the request body.' }, 400);
      }

      const totalRecords = records.length;
      const startIdx = Math.min(batchOffset, totalRecords);
      const endIdx = Math.min(startIdx + batchLimit, totalRecords);
      const slice = records.slice(startIdx, endIdx);

      console.log(`🔧 Job ${jobId}: chunk ${startIdx}-${endIdx} of ${totalRecords} -> org ${orgId}`);

      // Mark as processing on first chunk
      if (batchOffset === 0) {
        await supabase
          .from('scheduled_jobs')
          .update({ status: 'processing', record_count: 0 })
          .eq('id', jobId);
      }

      const batchResult = await smartBatchUpsert(supabase, slice, orgId, startIdx);

      const nextOffset = endIdx;
      const done = nextOffset >= totalRecords;
      const progress = Math.round((nextOffset / totalRecords) * 100);
      const cumulativeInserted = (job.record_count || 0) + batchResult.inserted + batchResult.updated;

      // Persist cumulative count (no 'progress' column — offset is tracked by the frontend)
      await supabase
        .from('scheduled_jobs')
        .update({
          record_count: cumulativeInserted,
        })
        .eq('id', jobId);

      // Finalize on last chunk
      if (done) {
        const finalStatus = cumulativeInserted === 0 && batchResult.errors > 0 ? 'failed' : 'completed';
        await supabase
          .from('scheduled_jobs')
          .update({
            status: finalStatus,
            completed_at: new Date().toISOString(),
            error_message: batchResult.errorMessages.length > 0 ? batchResult.errorMessages.slice(0, 10).join('\n') : null,
          })
          .eq('id', jobId);
        console.log(`✅ Job ${jobId} ${finalStatus}: ${cumulativeInserted} total inserted`);
      } else {
        console.log(`📦 Job ${jobId} chunk done: +${batchResult.inserted}, cumulative ${cumulativeInserted}, next ${nextOffset}/${totalRecords}`);
      }

      return c.json({
        success: true,
        jobId,
        done,
        nextOffset,
        totalRecords,
        batchInserted: batchResult.inserted,
        batchUpdated: batchResult.updated,
        batchErrors: batchResult.errors,
        batchSkipped: batchResult.skipped,
        cumulativeInserted,
        progress,
        targetOrgId: orgId,
        errors: batchResult.errorMessages.length > 0 ? batchResult.errorMessages : undefined,
      });

    } catch (error: any) {
      console.error('❌ Process job error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Process ALL pending jobs — CHUNKED version.
  // Each call processes one batch (batchLimit records) from the first pending/processing job.
  // Returns { done, remainingJobs, ... } — the frontend should loop until done === true.
  app.post('/make-server-8405be07/inventory-diagnostic/process-all-pending', async (c) => {
    console.log('🔧 Process all pending (chunked) endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const body = await c.req.json();
      const { targetOrgId, batchLimit = 500, resumeOffset = 0, currentJobId } = body;

      if (!targetOrgId) {
        return c.json({ error: 'targetOrgId is required' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Find pending OR processing (in-progress) inventory jobs
      // NOTE: 'progress' column does not exist in scheduled_jobs — offset is tracked by the frontend
      // IMPORTANT: Do NOT select file_data here — it can be hundreds of MB across multiple jobs.
      // We fetch file_data separately for just the single job we're about to process.
      const { data: pendingJobs, error: jobsError } = await supabase
        .from('scheduled_jobs')
        .select('id, organization_id, data_type, status, record_count')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true });

      if (jobsError) {
        console.error('Failed to query pending jobs:', jobsError);
        return c.json({ error: 'Failed to query pending jobs', details: jobsError.message }, 500);
      }

      // Without file_data in the initial query we can only filter by data_type.
      // Fallback: if no jobs have data_type='inventory', try ALL pending jobs
      // (the old code also accepted jobs whose file_data contained a sku field).
      let inventoryJobs = (pendingJobs || []).filter(
        (j: any) => j.data_type === 'inventory'
      );
      if (inventoryJobs.length === 0 && (pendingJobs || []).length > 0) {
        console.log('No jobs with data_type=inventory, falling back to all pending jobs');
        inventoryJobs = pendingJobs || [];
      }

      if (inventoryJobs.length === 0) {
        return c.json({
          success: true,
          done: true,
          message: 'No pending inventory jobs remaining',
          remainingJobs: 0,
          totalInserted: 0,
        });
      }

      // Pick the first job — then fetch file_data for JUST this one job
      const job = inventoryJobs[0] as any;

      const { data: jobWithData, error: jobDataError } = await supabase
        .from('scheduled_jobs')
        .select('file_data')
        .eq('id', job.id)
        .single();

      if (jobDataError || !jobWithData) {
        console.error('Failed to fetch file_data for job:', job.id, jobDataError);
        return c.json({ error: 'Failed to fetch job data', details: jobDataError?.message }, 500);
      }

      const records = jobWithData.file_data?.records || [];
      const totalRecords = records.length;

      if (totalRecords === 0) {
        await supabase
          .from('scheduled_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString(), record_count: 0 })
          .eq('id', job.id);
        return c.json({
          success: true, done: false, currentJobId: job.id, currentJobDone: true,
          remainingJobs: inventoryJobs.length - 1, batchInserted: 0, totalRecords: 0,
        });
      }

      // Resume from frontend-tracked offset (no 'progress' column in scheduled_jobs)
      // If the frontend is resuming the same job, use its offset; otherwise start at 0
      const batchOffset = (currentJobId === job.id && resumeOffset > 0) ? resumeOffset : 0;
      const startIdx = Math.min(batchOffset, totalRecords);
      const endIdx = Math.min(startIdx + batchLimit, totalRecords);
      const slice = records.slice(startIdx, endIdx);

      console.log(`🔧 Job ${job.id}: chunk ${startIdx}-${endIdx} of ${totalRecords} -> org ${targetOrgId}`);

      if (job.status === 'pending') {
        await supabase
          .from('scheduled_jobs')
          .update({ status: 'processing', record_count: 0 })
          .eq('id', job.id);
      }

      const batchResult = await smartBatchUpsert(supabase, slice, targetOrgId, startIdx);

      const nextOffset = endIdx;
      const currentJobDone = nextOffset >= totalRecords;
      const cumulativeInserted = (job.record_count || 0) + batchResult.inserted + batchResult.updated;
      const progress = Math.round((nextOffset / totalRecords) * 100);

      // Persist cumulative count (no 'progress' column — offset tracked by frontend)
      await supabase
        .from('scheduled_jobs')
        .update({
          record_count: cumulativeInserted,
        })
        .eq('id', job.id);

      if (currentJobDone) {
        const finalStatus = cumulativeInserted === 0 && batchResult.errors > 0 ? 'failed' : 'completed';
        await supabase
          .from('scheduled_jobs')
          .update({
            status: finalStatus,
            completed_at: new Date().toISOString(),
            error_message: batchResult.errorMessages.length > 0 ? batchResult.errorMessages.join('\n') : null,
          })
          .eq('id', job.id);
        console.log(`✅ Job ${job.id} ${finalStatus}: ${cumulativeInserted} total inserted`);
      }

      const remainingJobs = currentJobDone ? inventoryJobs.length - 1 : inventoryJobs.length;
      const allDone = currentJobDone && remainingJobs === 0;

      console.log(`📦 Chunk done: +${batchResult.inserted}, job ${currentJobDone ? 'COMPLETE' : `${progress}%`}, ${remainingJobs} jobs left`);

      return c.json({
        success: true,
        done: allDone,
        currentJobId: job.id,
        currentJobDone,
        nextOffset,
        remainingJobs,
        batchInserted: batchResult.inserted,
        batchUpdated: batchResult.updated,
        batchErrors: batchResult.errors,
        cumulativeInserted,
        totalRecords,
        progress,
        targetOrgId,
        errors: batchResult.errorMessages.length > 0 ? batchResult.errorMessages : undefined,
      });

    } catch (error: any) {
      console.error('❌ Process all pending error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Delete a specific job
  app.post('/make-server-8405be07/inventory-diagnostic/delete-job', async (c) => {
    console.log('🗑️ Delete job endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const body = await c.req.json();
      const { jobId } = body;

      if (!jobId) {
        return c.json({ error: 'jobId is required' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Delete the job
      const { error: deleteError } = await supabase
        .from('scheduled_jobs')
        .delete()
        .eq('id', jobId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return c.json({ error: 'Failed to delete job', details: deleteError.message }, 500);
      }

      console.log(`✅ Job ${jobId} deleted successfully`);
      return c.json({ success: true, deletedJobId: jobId });

    } catch (error: any) {
      console.error('❌ Delete job error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Delete ALL pending jobs
  app.post('/make-server-8405be07/inventory-diagnostic/delete-all-pending', async (c) => {
    console.log('🗑️ Delete all pending jobs endpoint hit');

    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Count pending jobs first
      const { count, error: countError } = await supabase
        .from('scheduled_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Delete all pending jobs
      const { error: deleteError } = await supabase
        .from('scheduled_jobs')
        .delete()
        .eq('status', 'pending');

      if (deleteError) {
        console.error('Delete all error:', deleteError);
        return c.json({ error: 'Failed to delete pending jobs', details: deleteError.message }, 500);
      }

      console.log(`✅ Deleted ${count || 0} pending jobs`);
      return c.json({ success: true, deletedCount: count || 0 });

    } catch (error: any) {
      console.error('❌ Delete all pending error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // ============================================================
  // CHUNKED DEDUPLICATION v2 — parallelised scan + self-contained delete
  //
  // Key changes from v1:
  //   • Scan uses PARALLEL page fetches (10 concurrent) to stay well
  //     within the Edge Function timeout even for 156K+ items.
  //   • Scan returns COUNTS only (no huge idsToDelete payload).
  //   • Delete endpoint is self-contained: re-scans, derives IDs,
  //     deletes up to `batchSize` per call.  Frontend loops until done.
  // ============================================================

  // ---------- helper: parallel paginated fetch of (id, sku, created_at) ----------
  // CRITICAL FIX: Uses deterministic ordering (created_at ASC, id ASC) to prevent
  // rows from shifting between pages during parallel fetches.  After fetching,
  // results are deduplicated by id as an extra safety net so the same row
  // appearing in two overlapping pages can never create a phantom "duplicate".
  async function fetchAllItemsParallel(
    supabase: any,
    organizationId: string,
  ): Promise<{ items: { id: string; sku: string; created_at: string }[]; error?: string }> {
    const PAGE = 1000;
    const PARALLEL = 10; // concurrent fetches

    // 1. Get exact count so we know how many pages to issue
    const { count, error: cntErr } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .not('sku', 'is', null);

    if (cntErr) return { items: [], error: cntErr.message };
    if (!count || count === 0) return { items: [] };

    const totalPages = Math.ceil(count / PAGE);
    console.log(`  ⚡ Parallel fetch: ${count} items across ${totalPages} pages (${PARALLEL} concurrent)`);

    const rawItems: { id: string; sku: string; created_at: string }[] = [];

    // 2. Fetch pages in parallel batches
    //    ORDER BY created_at ASC, id ASC  — fully deterministic so no row
    //    can shift between pages even when timestamps are identical.
    for (let batch = 0; batch < totalPages; batch += PARALLEL) {
      const promises = [];
      for (let p = batch; p < Math.min(batch + PARALLEL, totalPages); p++) {
        const from = p * PAGE;
        const to = from + PAGE - 1;
        promises.push(
          supabase
            .from('inventory')
            .select('id, sku, created_at')
            .eq('organization_id', organizationId)
            .not('sku', 'is', null)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)
        );
      }
      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.error) {
          console.error('  Parallel fetch page error:', r.error.message);
        }
        if (r.data) rawItems.push(...r.data);
      }
      console.log(`  📄 Pages ${batch + 1}–${Math.min(batch + PARALLEL, totalPages)}: ${rawItems.length} raw rows so far`);
    }

    // 3. Deduplicate by id — safety net in case any row appeared in two pages
    const seen = new Set<string>();
    const allItems: { id: string; sku: string; created_at: string }[] = [];
    for (const item of rawItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
    if (allItems.length !== rawItems.length) {
      console.warn(`  ⚠️ Deduped fetch results: ${rawItems.length} raw → ${allItems.length} unique rows (${rawItems.length - allItems.length} phantom duplicates removed)`);
    }

    return { items: allItems };
  }

  // ---------- helper: group items by SKU, return keeper + duplicates ----------
  // Groups by trimmed SKU, keeps the item with the OLDEST created_at
  // (or lowest id as tiebreaker), marks the rest for deletion.
  function findDuplicateIds(items: { id: string; sku: string; created_at: string }[]): {
    skuGroupCount: number;
    idsToDelete: string[];
    duplicateSkuCount: number;
  } {
    // Build groups: SKU → array of { id, created_at }
    const skuGroups = new Map<string, { id: string; created_at: string }[]>();
    for (const item of items) {
      if (!item.sku) continue;
      const key = item.sku.trim();
      if (!key) continue;
      if (!skuGroups.has(key)) skuGroups.set(key, []);
      skuGroups.get(key)!.push({ id: item.id, created_at: item.created_at });
    }

    const idsToDelete: string[] = [];
    let duplicateSkuCount = 0;
    for (const [, entries] of skuGroups) {
      if (entries.length > 1) {
        duplicateSkuCount++;
        // Sort by created_at ASC, then id ASC — keep the first, delete the rest
        entries.sort((a, b) => {
          const cmp = a.created_at.localeCompare(b.created_at);
          return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
        });
        for (let i = 1; i < entries.length; i++) {
          idsToDelete.push(entries[i].id);
        }
      }
    }
    return { skuGroupCount: skuGroups.size, idsToDelete, duplicateSkuCount };
  }

  // Step 1: Scan for duplicates — returns COUNTS only (lightweight response)
  app.post('/make-server-8405be07/inventory-diagnostic/dedup-scan', async (c) => {
    console.log('🔍 Dedup scan endpoint hit (v2 parallel)');
    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { organizationId } = body;
      if (!organizationId) return c.json({ error: 'organizationId is required' }, 400);

      console.log(`🔍 Scanning duplicates for org ${organizationId}`);

      const { items: allItems, error: fetchErr } = await fetchAllItemsParallel(supabase, organizationId);
      if (fetchErr) {
        console.error('Parallel fetch failed:', fetchErr);
        return c.json({ error: 'Failed to fetch inventory', message: fetchErr }, 500);
      }

      const { skuGroupCount, idsToDelete, duplicateSkuCount } = findDuplicateIds(allItems);

      console.log(`🔍 Scan complete: ${allItems.length} total, ${duplicateSkuCount} duplicate SKUs, ${idsToDelete.length} records to remove`);

      return c.json({
        success: true,
        totalScanned: allItems.length,
        uniqueSkus: skuGroupCount,
        duplicateSkus: duplicateSkuCount,
        toDeleteCount: idsToDelete.length,
        // NOTE: idsToDelete intentionally omitted — the delete endpoint re-derives them.
      });
    } catch (error: any) {
      console.error('❌ Dedup scan error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Step 2: Self-contained chunked delete — re-scans, finds duplicates, deletes a batch.
  //         Frontend loops until response.done === true.
  app.post('/make-server-8405be07/inventory-diagnostic/dedup-delete-chunk', async (c) => {
    console.log('🗑️ Dedup delete-chunk endpoint hit');
    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { organizationId, batchSize = 5000 } = body;
      if (!organizationId) return c.json({ error: 'organizationId is required' }, 400);

      // 1. Parallel scan
      const { items: allItems, error: fetchErr } = await fetchAllItemsParallel(supabase, organizationId);
      if (fetchErr) {
        return c.json({ error: 'Failed to fetch inventory for dedup', message: fetchErr }, 500);
      }

      const { idsToDelete, duplicateSkuCount } = findDuplicateIds(allItems);

      if (idsToDelete.length === 0) {
        return c.json({ success: true, deleted: 0, errors: 0, remaining: 0, duplicateSkus: 0, done: true });
      }

      // 2. Delete up to batchSize IDs this call
      const batch = idsToDelete.slice(0, batchSize);
      let deleted = 0;
      let errors = 0;
      const SUB = 500;

      for (let i = 0; i < batch.length; i += SUB) {
        const sub = batch.slice(i, i + SUB);
        const { error: delErr } = await supabase
          .from('inventory')
          .delete()
          .in('id', sub)
          .eq('organization_id', organizationId);

        if (delErr) {
          console.error('Dedup sub-batch delete error:', delErr.message);
          errors += sub.length;
        } else {
          deleted += sub.length;
        }
      }

      const remaining = idsToDelete.length - batch.length;
      console.log(`🗑️ Deleted ${deleted}, errors ${errors}, remaining ~${remaining}, dupe SKUs ${duplicateSkuCount}`);

      return c.json({
        success: true,
        deleted,
        errors,
        remaining,
        totalToDelete: idsToDelete.length,
        duplicateSkus: duplicateSkuCount,
        done: remaining === 0,
      });
    } catch (error: any) {
      console.error('❌ Dedup delete-chunk error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Legacy: Delete a batch of IDs passed from frontend (kept for backward compat)
  app.post('/make-server-8405be07/inventory-diagnostic/dedup-delete-batch', async (c) => {
    console.log('🗑️ Dedup delete-batch (legacy) endpoint hit');
    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing authentication token (send X-User-Token header)' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { organizationId, ids } = body;
      if (!organizationId || !ids || !Array.isArray(ids) || ids.length === 0) {
        return c.json({ error: 'organizationId and ids[] are required' }, 400);
      }

      let deleted = 0;
      let errors = 0;
      const SUB = 500;
      for (let i = 0; i < ids.length; i += SUB) {
        const batch = ids.slice(i, i + SUB);
        const { error: delErr } = await supabase
          .from('inventory')
          .delete()
          .in('id', batch)
          .eq('organization_id', organizationId);

        if (delErr) {
          console.error(`Dedup batch delete error:`, delErr.message);
          errors += batch.length;
        } else {
          deleted += batch.length;
        }
      }

      console.log(`🗑️ Deleted ${deleted}, errors ${errors}`);
      return c.json({ success: true, deleted, errors });
    } catch (error: any) {
      console.error('❌ Dedup delete-batch error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });
}

function getDiagnosis(
  total: number,
  inUserOrg: number,
  withNullOrg: number,
  orgBreakdown: { org_id: string; count: number; is_user_org: boolean }[],
  userOrgId: string | null
): { issue: string; severity: 'none' | 'warning' | 'critical'; recommendation: string } {

  if (total === 0) {
    return {
      issue: 'No inventory items found in the database. This could mean the table is empty, the import failed, or items are in a different table.',
      severity: 'critical',
      recommendation: 'Click "Check Table Schema" to verify the inventory table exists and has the right structure. Also check if import jobs completed successfully.',
    };
  }

  if (inUserOrg === total && withNullOrg === 0) {
    return {
      issue: 'All items are correctly assigned to your organization.',
      severity: 'none',
      recommendation: 'Everything looks good! If items still don\'t show, check the Inventory page pagination/filters.',
    };
  }

  if (inUserOrg === 0 && withNullOrg > 0 && withNullOrg === total) {
    return {
      issue: `All ${total.toLocaleString()} items have NULL organization_id.`,
      severity: 'critical',
      recommendation: 'Items were imported without an organization_id. Click "Fix: Assign Orphaned Items" to assign them to your organization.',
    };
  }

  if (inUserOrg === 0 && withNullOrg === 0) {
    const otherOrgs = orgBreakdown.filter(o => !o.is_user_org);
    if (otherOrgs.length > 0) {
      const otherTotal = otherOrgs.reduce((sum, o) => sum + o.count, 0);
      return {
        issue: `All ${otherTotal.toLocaleString()} items are assigned to a different organization ID than yours (${userOrgId}).`,
        severity: 'critical',
        recommendation: 'Items were imported under a different organization. Use the "Move to My Org" buttons in the Organization Breakdown section, or click "Fix All" to reassign everything.',
      };
    }
  }

  if (inUserOrg > 0 && withNullOrg > 0) {
    return {
      issue: `${inUserOrg.toLocaleString()} items are in your org, but ${withNullOrg.toLocaleString()} have no organization assigned.`,
      severity: 'warning',
      recommendation: 'Some items are orphaned. Click "Fix: Assign Orphaned Items" to claim them.',
    };
  }

  if (inUserOrg > 0 && inUserOrg < total) {
    const missing = total - inUserOrg;
    return {
      issue: `Only ${inUserOrg.toLocaleString()} of ${total.toLocaleString()} items are in your organization. ${missing.toLocaleString()} items are elsewhere.`,
      severity: 'warning',
      recommendation: 'Some items are assigned to other organizations or have no org. Review the breakdown and fix as needed.',
    };
  }

  return {
    issue: 'Unable to determine specific issue.',
    severity: 'warning',
    recommendation: 'Review the detailed counts and org breakdown below.',
  };
}