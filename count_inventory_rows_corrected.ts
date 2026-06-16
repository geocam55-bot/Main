import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting rows:', error);
    return;
  }

  console.log('Total count of rows in inventory table (exact, head):', count);

  let allOrgIds: string[] = [];
  let offset = 0;
  const PAGE = 1000;
  
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
    
    data.forEach((r: any) => allOrgIds.push(r.organization_id || 'NULL'));
    console.log(`Fetched page starting at ${offset}. Page size: ${data.length}`);
    
    if (data.length < PAGE) break;
    offset += data.length;
  }

  const counts: Record<string, number> = {};
  allOrgIds.forEach(orgId => {
    counts[orgId] = (counts[orgId] || 0) + 1;
  });

  console.log('Finished counting. Distribution:', counts);
  console.log('Total aggregated count:', allOrgIds.length);
}

main().catch(console.error);
