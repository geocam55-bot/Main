import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  const { data: items, error } = await supabase
    .from('inventory')
    .select('id, sku, description, name')
    .eq('organization_id', orgId);

  if (error || !items) {
    console.error('Error fetching inventory:', error);
    return;
  }

  console.log(`Loaded ${items.length} total inventory items.`);

  const keywords = ['post', 'rail', 'picket', 'glass', 'bracket', 'handrail', 'baluster', 'step'];
  
  keywords.forEach(kw => {
    const matches = items.filter(it => (it.description || '').toLowerCase().includes(kw));
    console.log(`\n=== Keyword: "${kw}" (${matches.length} matches) ===`);
    matches.slice(0, 15).forEach(it => {
      console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`);
    });
  });
}

main().catch(console.error);
