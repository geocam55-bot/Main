import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // Count using head: true
  const { count, error } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting rows:', error);
    return;
  }

  console.log('Total count of rows in inventory table (exact, head):', count);

  // Group by org_id using paginated queries of organization_id
  let allOrgIds: string[] = [];
  let offset = 0;
  const PAGE = 5000;
  
  while (true) {
    const { data, error } = await supabase
      .from('inventory')
      .select('organization_id')
      .range(offset, offset + PAGE - 1);
      
    if (error) {
      console.error('Error fetching inventory page:', error);
      break;
    }
    if (!data || data.length === 0) break;
    
    data.forEach((r: any) => allOrgIds.push(rowOrg(r)));
    if (data.length < PAGE) break;
    offset += data.length;
  }

  function rowOrg(r: any) {
    return r.organization_id || 'NULL';
  }

  const counts: Record<string, number> = {};
  allOrgIds.forEach(orgId => {
    counts[orgId] = (counts[orgId] || 0) + 1;
  });

  console.log('Finished counting. Distribution:', counts);
  console.log('Total aggregated count:', allOrgIds.length);
}

main().catch(console.error);
