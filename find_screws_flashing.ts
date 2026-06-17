import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('Searching for screws and flashing matches...');

  // Search deck screws
  const { data: deckScrews } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .ilike('description', '%SCREW DECK%')
    .limit(5);

  console.log('\n--- DECK SCREWS MATCHES ---');
  console.log(JSON.stringify(deckScrews, null, 2));

  // Search lag screws
  const { data: lagScrews } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .ilike('description', '%LAG SCREW%')
    .limit(5);

  console.log('\n--- LAG SCREWS MATCHES ---');
  console.log(JSON.stringify(lagScrews, null, 2));

  // Search flashing
  const { data: flashing } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .ilike('description', '%FLASHING%')
    .limit(5);

  console.log('\n--- FLASHING MATCHES ---');
  console.log(JSON.stringify(flashing, null, 2));

  // Search ZINC roll
  const { data: zinc } = await supabase
    .from('inventory')
    .select('id, name, description, sku')
    .eq('organization_id', orgId)
    .ilike('description', '%ZINC%')
    .limit(5);

  console.log('\n--- ZINC MATCHES ---');
  console.log(JSON.stringify(zinc, null, 2));
}

main().catch(console.error);
