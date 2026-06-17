import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  console.log('Retrieving relevant deck lumber products from the inventory table...');

  // 1. Posts - typically PT BROWN 4X4X8 or similar
  const { data: posts } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .ilike('description', '%PT BROWN%')
    .ilike('description', '%4X4%');

  console.log('\n--- PT BROWN 4x4 POSTS ---');
  console.log(JSON.stringify(posts, null, 2));

  // 2. Stair Stringers - typically PT BROWN stair stringers
  const { data: stringers } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .ilike('description', '%stringer%');

  console.log('\n--- STAIR STRINGERS ---');
  console.log(JSON.stringify(stringers, null, 2));

  // 3. 2x8 boards
  const { data: boards } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .ilike('description', '%PT BROWN%')
    .ilike('description', '%2X8%');

  console.log('\n--- PT BROWN 2x8 BOARDS ---');
  console.log(JSON.stringify(boards, null, 2));
}

main().catch(console.error);
