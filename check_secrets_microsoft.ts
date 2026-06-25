import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('*')
    .eq('key', 'secrets:microsoft')
    .maybeSingle();

  if (error) {
    console.error('Error fetching secrets:microsoft:', error);
  } else {
    console.log('secrets:microsoft:', JSON.stringify(data, null, 2));
  }
}

main();
