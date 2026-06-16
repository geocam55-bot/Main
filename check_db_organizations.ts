import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // Check unique organizations in organizations table
  const { data: orgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('id, name');
  console.log('Organizations in DB:', orgsErr ? orgsErr.message : orgs);

  // Check unique organizations in profiles table
  const { data: profiles, error: profsErr } = await supabase
    .from('profiles')
    .select('id, email, name, organization_id');
  console.log('Profiles in DB:', profsErr ? profsErr.message : profiles);

  // Check unique organizations and counts in inventory table
  const { data: invOrgs, error: invOrgsErr } = await supabase
    .from('inventory')
    .select('organization_id');
    
  if (invOrgsErr) {
    console.error('Error fetching inventory orgs:', invOrgsErr);
    return;
  }

  const counts: Record<string, number> = {};
  invOrgs.forEach((row: any) => {
    const orgId = row.organization_id || 'NULL';
    counts[orgId] = (counts[orgId] || 0) + 1;
  });
  console.log('Inventory record counts by organization_id:', counts);
}

main().catch(console.error);
