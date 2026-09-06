const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('inventory').select('organization_id, count(*)').group('organization_id');
  console.log("Inventory counts by org:", data, error);
  
  const { data: pData } = await supabase.from('profiles').select('*').eq('email', 'geocam55@gmail.com');
  console.log("Profile for geocam55:", pData);
}
check();
