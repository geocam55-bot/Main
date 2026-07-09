import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './src/utils/supabase/info.tsx';
async function test() {
  const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
  const { data, error } = await sb.from('permissions').select('organization_id').limit(1);
  console.log(error);
}
test();
