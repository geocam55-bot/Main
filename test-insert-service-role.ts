import { createClient } from '@supabase/supabase-js';
import { projectId } from './src/utils/supabase/info';

async function main() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
    return;
  }
  const supabaseUrl = `https://${projectId}.supabase.co`;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('permissions')
    .insert([{
      role: 'designer',
      module: 'space:sales',
      visible: false,
      add: false,
      change: false,
      delete: false
    }])
    .select();

  if (error) {
    console.error('Error inserting row:', error);
  } else {
    console.log('Successfully inserted row:', JSON.stringify(data, null, 2));
  }
}
main();
