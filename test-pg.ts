import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './src/utils/supabase/info.tsx';
async function test() {
  const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
  const { data, error } = await sb.rpc('get_policies');
  // wait we can't easily query policies. Let's try querying `permissions`
}
test();
