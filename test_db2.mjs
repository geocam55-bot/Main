import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { buildInventoryAndSearchClause } from './src/utils/inventory-keywords.ts';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const clause = buildInventoryAndSearchClause('Standard Spruce');
  console.log("Generated Clause:", clause);
  
  const { data } = await supabase
    .from('inventory')
    .select('id, sku, name, description')
    .or(clause)
    .limit(5);
  
  console.log(data);
}
run();
