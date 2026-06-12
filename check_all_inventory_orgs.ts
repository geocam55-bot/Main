import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  let allOrgs: string[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;
  
  console.log('Fetching all inventory organization IDs in batches of 1000...');
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('inventory')
      .select('organization_id')
      .range(from, from + step - 1);
      
    if (error) {
      console.error('Error at range:', from, error);
      break;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allOrgs.push(...data.map(i => i.organization_id));
      from += step;
      if (data.length < step) {
        hasMore = false;
      }
    }
  }
  
  const counts: Record<string, number> = {};
  for (const org of allOrgs) {
    const key = org || 'NULL';
    counts[key] = (counts[key] || 0) + 1;
  }
  
  console.log('--- ENTIRE INVENTORY ORGANIZATION COUNTS (PAGINATED-CORRECT) ---');
  console.log(counts);
}

main().catch(console.error);
