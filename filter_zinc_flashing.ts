import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  const { data: mmsSearch } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .or('sku.ilike.%mms%,description.ilike.%zinc%,description.ilike.%roll%');

  if (!mmsSearch) return;

  const targetItems = mmsSearch.filter(it => 
    it.sku.toLowerCase().includes('mms449748') ||
    it.description.toLowerCase().includes('zinc 8') ||
    it.description.toLowerCase().includes('flashing') ||
    it.description.toLowerCase().includes('zinc')
  );

  console.log(`Found ${targetItems.length} filtered items:`);
  console.log(JSON.stringify(targetItems, null, 2));
}

main().catch(console.error);
