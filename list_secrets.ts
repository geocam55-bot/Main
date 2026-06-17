import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('key')
    .ilike('key', '%secret%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Secret keys in kv_store:', data);

  const { data: keysData } = await supabase
    .from('kv_store_8405be07')
    .select('key')
    .ilike('key', '%key%');

  console.log('Keys matching "key" in kv_store:', keysData);
}

main().catch(console.error);
