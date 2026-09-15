const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function check() {
  const { data, error } = await supabase.from('competitors').insert([{
    name: 'Test',
    website_url: 'https://test.com'
  }]);
  console.log("Insert result:", error ? error.message : "Success");
}
check();
