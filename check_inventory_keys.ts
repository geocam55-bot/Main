import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching inventory item:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in inventory table:', Object.keys(data[0]));
    console.log('Sample row data:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No inventory rows found, fetching table description with a select of non-existent columns...');
  }
}

main();
