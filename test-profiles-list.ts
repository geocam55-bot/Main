import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('query_sql', {
    sql_text: 'SELECT id, email, role, organization_id FROM public.profiles'
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('User profiles:', JSON.stringify(data, null, 2));
  }
}
main();
