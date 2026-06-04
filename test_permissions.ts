import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: dbPerms, error } = await supabase.from('permissions').select('*');
  console.log('Error querying permissions:', error);
  console.log('Permissions in DB count:', dbPerms?.length);
  console.log('Permissions sample:', dbPerms);
}

main().catch(console.error);
