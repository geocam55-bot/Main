import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, organization_id');
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles in DB:', JSON.stringify(profiles, null, 2));
  }
}

main();
