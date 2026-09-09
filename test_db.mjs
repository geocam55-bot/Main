import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const searchQuery = "Standard Spruce";
  const { data } = await supabase
    .from('inventory')
    .select('id, sku, name, description')
    .or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,upc.ilike.%${searchQuery}%,supplier_sku.ilike.%${searchQuery}%,search_keywords.ilike.%${searchQuery}%`);
  console.log(data);
}
run();
