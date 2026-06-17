import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('key')
    .ilike('key', '%default%');

  if (error) {
    console.error('Error fetching KV keys:', error.message);
    return;
  }

  console.log('Keys containing "default":', data);
}

main().catch(console.error);
