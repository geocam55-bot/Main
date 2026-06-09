import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // 1. Get organizations count and listing
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
  console.log('--- Organizations ---');
  if (orgsError) {
    console.error('Organizations Error:', orgsError);
  } else {
    console.log(`Total organizations: ${orgs?.length}`);
    console.log('Sample organizations:', JSON.stringify(orgs, null, 2));
  }

  // 2. Get profiles and their organizations
  const { data: profiles, error: profError } = await supabase.from('profiles').select('id, name, email, organization_id');
  console.log('--- Profiles ---');
  if (profError) {
    console.error('Profiles Error:', profError);
  } else {
    console.log(`Total profiles: ${profiles?.length}`);
    console.log('Sample profiles with orgs:', JSON.stringify(profiles, null, 2));
  }

  // 3. Distinct organization IDs in Inventory (approximate/sample)
  const { data: invOrgs, error: invOrgsError } = await supabase.from('inventory').select('organization_id').limit(100);
  if (invOrgsError) {
    console.error('Inventory Orgs Error:', invOrgsError);
  } else {
    const uniqueInvOrgs = Array.from(new Set(invOrgs.map((item: any) => item.organization_id)));
    console.log('Distinct organization_ids in top 100 inventory sample:', uniqueInvOrgs);
  }
}

main().catch(console.error);
