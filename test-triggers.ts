import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('query_sql', {
    sql_text: `
      SELECT tgname, tgtype, tgenabled, pg_get_triggerdef(oid) as definition
      FROM pg_trigger
      WHERE tgrelid = 'public.permissions'::regclass
    `
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Triggers on permissions:', JSON.stringify(data, null, 2));
  }
}
main();
