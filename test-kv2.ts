import { createClient } from '@supabase/supabase-js';
import { projectId, anonKey } from './src/utils/supabase/info.tsx';
async function test() {
  const sb = createClient(`https://${projectId}.supabase.co`, anonKey);
  const { data: { session } } = await sb.auth.signInWithPassword({ email: 'geocam55@gmail.com', password: 'password' }); // Replace password if known? Wait, no.
  console.log(session ? 'LoggedIn' : 'No Session');
}
test();
