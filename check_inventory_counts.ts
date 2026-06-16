import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';
  
  const { count, error } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true });
  console.log(`Global total rows in "inventory": ${count} (error: ${error?.message})`);

  const { count: orgCount, error: orgErr } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  console.log(`Organization total rows in "inventory": ${orgCount} (error: ${orgErr?.message})`);

  const { count: nullCount, error: nullErr } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true })
    .is('organization_id', null);
  console.log(`Null organization total rows in "inventory": ${nullCount} (error: ${nullErr?.message})`);
}

main().catch(console.error);
