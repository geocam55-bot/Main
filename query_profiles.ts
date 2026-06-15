import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id, name');

  if (pError) {
    console.error('Error querying profiles:', pError);
  } else {
    console.log('Profiles currently in DB:');
    console.log(JSON.stringify(profiles, null, 2));
  }

  // Also query the counts of contacts grouping by organization_id and owner_id
  const { data: contacts, error: cError } = await supabase
    .from('contacts')
    .select('id, organization_id, owner_id, email, account_owner_number');
  
  if (cError) {
    console.error('Error querying contacts:', cError);
  } else {
    console.log(`\nTotal Contacts in DB: ${contacts.length}`);
    const orgGroups: Record<string, number> = {};
    const ownerGroups: Record<string, number> = {};
    contacts.forEach((ct: any) => {
      orgGroups[ct.organization_id] = (orgGroups[ct.organization_id] || 0) + 1;
      ownerGroups[ct.owner_id] = (ownerGroups[ct.owner_id] || 0) + 1;
    });
    console.log('Contacts grouped by Organization ID:');
    console.log(orgGroups);
    console.log('Contacts grouped by Owner ID:');
    console.log(ownerGroups);
  }
}

main().catch(console.error);
