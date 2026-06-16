import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const searchSku = '84895031';
  
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('sku', searchSku);

  if (error) {
    console.error('Error fetching SKU:', error);
    return;
  }

  console.log(`Query results for SKU "${searchSku}":`);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
