import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_tasks')
    .maybeSingle();

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log('--- TASKS IN DATABASE ---');
  console.log(JSON.stringify(data?.value || [], null, 2));
}

main().catch(console.error);
