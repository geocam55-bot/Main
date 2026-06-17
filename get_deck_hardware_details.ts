import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('Fetching relevant products under category BUILDING MATERIALS and HARDWARE...');

  // Paginated retrieval of BUILDING MATERIALS category (limit to 2000 total)
  let items: any[] = [];
  let offset = 0;
  const limit = 1000;

  while (offset < 4000) {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, description, sku, category')
      .eq('organization_id', orgId)
      .in('category', ['BUILDING MATERIALS', 'HARDWARE'])
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching inventory segment:', error);
      break;
    }
    if (!data || data.length === 0) break;
    items = [...items, ...data];
    if (data.length < limit) break;
    offset += data.length;
  }

  console.log(`Fetched ${items.length} total raw building materials and hardware rows.`);

  // Print some important keyword subsets
  const keywords = ['decking', 'ledger', 'hanger', 'screws', 'screw', 'lag', 'flashing', 'concrete', 'baluster', 'picket', 'glass', 'bracket', 'anchor', 'tread', 'shingle'];
  
  console.log('\n--- SAMPLE EXTRACTED BUILDING MATERIALS/HARDWARE SUBSETS ---');
  
  // Group and display
  const subGroup = (keyword: string, limitCount = 5) => {
    const filtered = items.filter(it => (it.description || '').toLowerCase().includes(keyword));
    console.log(`\nSubset: "${keyword}" (Total found: ${filtered.length})`);
    console.log(JSON.stringify(filtered.slice(0, limitCount), null, 2));
  };

  subGroup('flashing', 3);
  subGroup('hanger', 3);
  subGroup('baluster', 3);
  subGroup('decking', 3);
  subGroup('tread', 3);
  subGroup('concrete', 3);
  subGroup('anchor', 3);
  subGroup('bracket', 3);
  subGroup('screw', 3);
  subGroup('glass', 3);
}

main().catch(console.error);
