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

  const matchKeywords = [
    'end post', 'corner post', 'inline post', 'line post',
    'picket', 'top rail', 'bottom rail', 'glass panel', 'handrail',
    'post l', 'stair post', 'bracket', 'cap', 'sleeve', 'baluster', '2x4'
  ];

  console.log('\n=== RAILING AND POSTS MATCHES ===');
  items.forEach(item => {
    const descLower = (item.description || '').toLowerCase();
    const sku = item.sku || '';
    
    // Check if any of search keywords match
    const matches = matchKeywords.filter(kw => descLower.includes(kw));
    if (matches.length > 0 && (descLower.includes('aluminum') || descLower.includes('aluminium') || descLower.includes('glass') || descLower.includes('picket') || descLower.includes('post') || descLower.includes('rail') || descLower.includes('bracket'))) {
      console.log(`SKU: ${sku} | ID: ${item.id} | DESC: ${item.description.replace(/\n/g, ' ')}`);
    }
  });
}

main().catch(console.error);
