import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './src/utils/supabase/info.tsx';
import { getServerHeaders } from './src/utils/server-headers.ts';

async function test() {
  const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
  
  // Can we fetch?
  const { data, error } = await sb.from('permissions').select('*');
  console.log('Without auth:', data?.length, error);
}
test();
