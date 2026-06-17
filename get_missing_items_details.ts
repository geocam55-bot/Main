import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // 1. Let's find products matching "stair stringer", "post", "2x8x10", or "4x4x8"
  console.log('Searching for potential matches for missing defaults in inventory table...');

  // Match for posts: typically 4x4" or 6x6" or search for "PT BROWN" and "4X4"
  const { data: postsData } = await supabase
    .from('inventory')
    .select('id, name, description, sku, category')
    .ilike('description', '%post%')
    .limit(20);

  console.log('\n--- POTENTIAL POSTS MATCHES ---');
  console.log(JSON.stringify(postsData, null, 2));

  // Match for stair stringers: search for "stringer"
  const { data: stringersData } = await supabase
    .from('inventory')
    .select('id, name, description, sku, category')
    .ilike('description', '%stringer%');

  console.log('\n--- POTENTIAL STRINGERS MATCHES ---');
  console.log(JSON.stringify(stringersData, null, 2));

  // Match for 2x8x10 or 2x8 lumber (for beams/joists/ledger board)
  const { data: lumberData } = await supabase
    .from('inventory')
    .select('id, name, description, sku, category')
    .ilike('description', '%2X8%10%')
    .limit(5);

  console.log('\n--- POTENTIAL 2X8"X10\' LUMBER MATCHES ---');
  console.log(JSON.stringify(lumberData, null, 2));
}

main().catch(console.error);
