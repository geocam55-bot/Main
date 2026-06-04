import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  console.log('Profiles error:', error);
  console.log('Profiles count:', profiles?.length);
  console.log('Sample profiles:', JSON.stringify(profiles, null, 2));
}

main().catch(console.error);
