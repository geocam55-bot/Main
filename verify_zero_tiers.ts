import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, count, error } = await supabase
    .from('inventory')
    .select('sku, name, price_tier_1, price_tier_2, price_tier_3, price_tier_4, price_tier_5', { count: 'exact' })
    .gt('price_tier_1', 0)
    .or('price_tier_2.eq.0,price_tier_3.eq.0,price_tier_4.eq.0,price_tier_5.eq.0');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Total items where T1 > 0 but at least one tier 2-5 is 0: ${count}`);
    console.log('Sample items (first 10):', JSON.stringify(data?.slice(0, 10), null, 2));
  }
}

main();
