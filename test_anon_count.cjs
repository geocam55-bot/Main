const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
  console.log('Anon Count:', count);
}
run();
