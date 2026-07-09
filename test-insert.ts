import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './src/utils/supabase/info.tsx';
async function test() {
  const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
  const { error } = await sb.from('permissions').insert([{
    role: 'designer',
    module: 'test:module',
    visible: true,
    add: false,
    change: false,
    delete: false
  }]);
  console.log(error);
}
test();
