import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_history')
    .maybeSingle();

  if (error) {
    console.error('Error fetching history:', error);
    return;
  }

  const history = data?.value || [];
  console.log(`Found ${history.length} history log entries in database.`);
  console.log('Last 10 history log entries:');
  console.log(JSON.stringify(history.slice(-10), null, 2));
}

main().catch(console.error);
