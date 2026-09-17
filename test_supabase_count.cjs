const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
  console.log('Count:', count);
}
run();
