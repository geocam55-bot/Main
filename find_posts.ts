import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('--- POST PRODUCTS ---');
  const { data, error } = await supabase
    .from('inventory')
    .select('id, sku, description')
    .eq('organization_id', orgId)
    .ilike('description', '%post%');

  if (error || !data) {
    console.error('Error:', error);
    return;
  }

  // Filter out obviously non-railing posts (like mailbox, power-post, post hole, etc.)
  const filtered = data.filter(it => {
    const desc = (it.description || '').toLowerCase();
    return desc.includes('alum') || desc.includes('blk') || desc.includes('clear') || desc.includes('wh') || desc.includes('line') || desc.includes('end') || desc.includes('corner');
  });

  filtered.forEach(it => console.log(`${it.sku} | ${it.id} | ${it.description.replace(/\n/g, ' ')}`));
}

main().catch(console.error);
