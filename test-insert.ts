import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('query_sql', {
    sql_text: `
      INSERT INTO public.permissions (role, module, visible, "add", "change", "delete")
      VALUES ('designer', 'space:sales', false, false, false, false)
      RETURNING *
    `
  });

  if (error) {
    console.error('Error inserting row via SQL:', error);
  } else {
    console.log('Successfully inserted row via SQL:', JSON.stringify(data, null, 2));
  }
}
main();
