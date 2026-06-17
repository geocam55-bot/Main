import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('--- DATABASE QUERY FOR RAILING & POST PRODUCTS ---');

  // Search glass
  const { data: glasses } = await supabase
    .from('inventory')
    .select('id, sku, description')
    .eq('organization_id', orgId)
    .ilike('description', '%glass%');

  console.log(`\nFound ${glasses?.length || 0} glass items:`);
  glasses?.forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // Search posts
  const { data: posts } = await supabase
    .from('inventory')
    .select('id, sku, description')
    .eq('organization_id', orgId)
    .ilike('description', '%post%');

  console.log(`\nFound ${posts?.length || 0} post items:`);
  posts?.forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // Search rails
  const { data: rails } = await supabase
    .from('inventory')
    .select('id, sku, description')
    .eq('organization_id', orgId)
    .ilike('description', '%rail%');

  console.log(`\nFound ${rails?.length || 0} rail items:`);
  rails?.forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));

  // Search pickets
  const { data: pickets } = await supabase
    .from('inventory')
    .select('id, sku, description')
    .eq('organization_id', orgId)
    .ilike('description', '%picket%');

  console.log(`\nFound ${pickets?.length || 0} picket items:`);
  pickets?.forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));
}

main().catch(console.error);
