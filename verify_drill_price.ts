import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('sku', '00275932');
  
  if (error) {
    console.error('Error fetching item:', error);
  } else {
    console.log('Item database record:', JSON.stringify(data, null, 2));
  }
}

main();
