import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // 1. First, delete any designer rows
  await supabase.rpc('query_sql', {
    sql_text: `DELETE FROM public.permissions WHERE role = 'designer'`
  });

  // 2. Insert designer row
  const insertRes = await supabase.rpc('query_sql', {
    sql_text: `
      INSERT INTO public.permissions (role, module, visible, "add", "change", "delete")
      VALUES ('designer', 'space:sales', false, false, false, false)
      RETURNING *
    `
  });

  if (insertRes.error) {
    console.error('Insert error:', insertRes.error);
  } else {
    console.log('Insert success:', JSON.stringify(insertRes.data, null, 2));
  }

  // 3. Query the roles again
  const queryRes = await supabase.rpc('query_sql', {
    sql_text: `SELECT role, module, visible, "add", "change", "delete" FROM public.permissions WHERE role = 'designer'`
  });

  if (queryRes.error) {
    console.error('Query error:', queryRes.error);
  } else {
    console.log('Query results:', JSON.stringify(queryRes.data, null, 2));
  }
}
main();
