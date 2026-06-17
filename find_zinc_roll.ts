import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('Searching for flashing/zinc item...');

  const { data: mmsSearch } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .or('sku.ilike.%mms%,description.ilike.%zinc%,description.ilike.%roll%');

  console.log(`Found ${mmsSearch?.length} matches:`);
  console.log(JSON.stringify(mmsSearch?.slice(0, 20), null, 2));
}

main().catch(console.error);
