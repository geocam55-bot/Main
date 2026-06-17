import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  const { data: mmsSearch } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .ilike('sku', 'MMS4497%');

  console.log(`Found ${mmsSearch?.length} rolls starting with MMS4497:`);
  console.log(JSON.stringify(mmsSearch, null, 2));
}

main().catch(console.error);
