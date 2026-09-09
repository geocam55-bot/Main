import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { buildInventoryAndSearchClause } from './src/utils/inventory-keywords.ts';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const search = 'Standard Spruce';
  let itemsQuery = supabase
    .from('inventory')
    .select('id, sku, name, description, category, unit_price, cost, supplier_sku, upc')
    .order('name', { ascending: true });

  const andClause = buildInventoryAndSearchClause(search);
  if (andClause) {
    itemsQuery = itemsQuery.or(andClause);
  } else {
    itemsQuery = itemsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: invRows, error: invErr } = await itemsQuery.range(0, 149);
  console.log("Error:", invErr);
  console.log("Count:", invRows ? invRows.length : 0);
}
run();
