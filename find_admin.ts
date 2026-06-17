import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const orgId = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

  console.log('Querying profiles for RONA Atlantic admins...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('role', 'admin');

  if (error) {
    console.error('Error fetching admin profiles:', error);
  } else {
    console.log('Admin profiles:', data);
  }

  const { data: superAdmins } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('role', 'super_admin');

  console.log('Super Admin profiles:', superAdmins);
}

main().catch(console.error);
