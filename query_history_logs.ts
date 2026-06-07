import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('*')
    .eq('key', 'import_export_history')
    .maybeSingle();

  if (error) {
    console.error('Error fetching history:', error);
    return;
  }

  const logs = data?.value || [];
  console.log('Total logs:', logs.length);
  console.log('Showing last 5 logs:');
  console.log(JSON.stringify(logs.slice(0, 5), null, 2));
}

main().catch(console.error);
