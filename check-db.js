import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { count: matchCount } = await supabase.from('product_matches').select('*', { count: 'exact', head: true });
  const { count: priceCount } = await supabase.from('competitor_prices').select('*', { count: 'exact', head: true });
  console.log(`Matches: ${matchCount}, Prices: ${priceCount}`);
}
check();
