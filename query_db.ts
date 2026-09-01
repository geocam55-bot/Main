import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('inventory').select('*').limit(5);
  console.log("Anon key query result length:", data?.length);
  if (error) console.log("Error:", error);
}
check();
