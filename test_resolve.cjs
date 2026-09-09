const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const pidStr = "SPF 2X4X8";
  
  let { data } = await supabase
    .from('inventory')
    .select('*')
    .or(`sku.eq.${pidStr},upc.eq.${pidStr},supplier_sku.eq.${pidStr},mfg_part_number.eq.${pidStr}`)
    .limit(1)
    .maybeSingle();
    
  if (!data) {
     let res2 = await supabase
      .from('inventory')
      .select('*')
      .or(`description.ilike.%${pidStr}%,name.ilike.%${pidStr}%`)
      .limit(1)
      .maybeSingle();
     data = res2.data;
  }
  
  console.log("Found:", data ? data.sku : null);
}
run();
