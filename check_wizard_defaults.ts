import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // 1. Fetch project_wizard_defaults
  const { data: defaults, error: defErr } = await supabase
    .from('project_wizard_defaults')
    .select('*');
    
  if (defErr) {
    console.error('Error fetching project_wizard_defaults:', defErr.message);
  } else {
    console.log('Project Wizard Defaults count:', defaults?.length);
    console.log(JSON.stringify(defaults, null, 2));
  }

  // 2. Fetch user_defaults
  const { data: userDefs, error: userDefErr } = await supabase
    .from('user_defaults')
    .select('*');
    
  if (userDefErr) {
    console.error('Error fetching user_defaults:', userDefErr.message);
  } else {
    console.log('User Defaults count:', userDefs?.length);
    console.log(JSON.stringify(userDefs, null, 2));
  }
}

main().catch(console.error);
