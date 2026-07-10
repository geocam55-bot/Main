import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('query_sql', {
    sql_text: `SELECT role, module, visible FROM public.permissions WHERE role = 'designer'`
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Designer permissions in DB:', JSON.stringify(data, null, 2));
  }
}
main();
