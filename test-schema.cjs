require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await sb.rpc('get_table_columns');
  console.log("Error:", error);
  // Just try to query it:
  const res = await sb.from('deliveries').select('*').limit(1);
  if (res.data && res.data.length > 0) {
     console.log(Object.keys(res.data[0]));
  } else {
     console.log("Empty or err:", res.error);
  }
}
test();
