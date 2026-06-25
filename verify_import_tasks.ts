import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: tasks, error: tasksErr } = await supabase
    .from('kv_store_8405be07')
    .select('*')
    .ilike('key', '%task%');
  console.log('Tasks:', JSON.stringify(tasks, null, 2));

  const { data: hist, error: histErr } = await supabase
    .from('kv_store_8405be07')
    .select('*')
    .eq('key', 'import_export_history');
  console.log('History:', JSON.stringify(hist, null, 2));
}

main();
