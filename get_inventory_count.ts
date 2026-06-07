import { createClient } from './src/utils/supabase/client';

const supabase = createClient();

async function main() {
  const { count, error } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error getting count:', error);
    return;
  }

  console.log('Total inventory rows in DB:', count);
}

main().catch(console.error);
