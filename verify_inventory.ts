import { createClient } from '@supabase/supabase-common-ts';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment.');
    return;
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey);
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('Querying top 30 inventory items to see SKU format and descriptions...');
  const { data, error } = await supabase
    .from('inventory')
    .select('id, sku, description, name')
    .eq('organization_id', orgId)
    .limit(30);

  if (error || !data) {
    console.error('Error fetching inventory:', error);
    return;
  }

  data.forEach(it => {
    console.log(`SKU: ${it.sku} | ID: ${it.id} | Name: ${it.name} | Desc: ${it.description?.substring(0, 50)}`);
  });

  console.log('\nQuerying for SKUs starting with 848:');
  const { data: lumberData } = await supabase
    .from('inventory')
    .select('id, sku, description')
    .eq('organization_id', orgId)
    .ilike('sku', '8489%');

  lumberData?.forEach(it => {
    console.log(`Lumber SKU: ${it.sku} | ID: ${it.id} | Desc: ${it.description}`);
  });
}

main().catch(console.error);
