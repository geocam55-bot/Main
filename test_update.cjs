const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function check() {
  const { data, error, count } = await supabase.from('competitors').update({ name: 'Test' }).eq('id', 1);
  console.log("Update result:", data, error, count);
}
check();
