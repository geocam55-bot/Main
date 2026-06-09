import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();

  // 1. Check distinct organization_ids in contacts
  const { data: contactOrgs, error: contactError } = await supabase
    .from('contacts')
    .select('organization_id');
  
  if (contactError) {
    console.error('Error fetching contacts:', contactError);
  } else {
    const orgs = Array.from(new Set((contactOrgs || []).map((c: any) => c.organization_id)));
    console.log('--- CONTACTS ---');
    console.log('Distinct organization_ids in contacts:', orgs);
    console.log('Count of contacts with each org_id:');
    orgs.forEach(org => {
      const count = contactOrgs.filter((c: any) => c.organization_id === org).length;
      console.log(`  - ${org}: ${count} contacts`);
    });
  }

  // 2. Check distinct organization_ids in opportunities (deals)
  const { data: opportunityOrgs, error: optError } = await supabase
    .from('opportunities')
    .select('organization_id');
    
  if (optError) {
    console.error('Error fetching opportunities:', optError);
  } else {
    const orgs = Array.from(new Set((opportunityOrgs || []).map((o: any) => o.organization_id)));
    console.log('--- OPPORTUNITIES (DEALS) ---');
    console.log('Distinct organization_ids in opportunities:', orgs);
  }

  // 3. Check some samples from inventory to see if they're all the same
  const { data: invOrgs, error: invError } = await supabase
    .from('inventory')
    .select('organization_id')
    .limit(1000);
    
  if (invError) {
    console.error('Error fetching inventory:', invError);
  } else {
    const orgs = Array.from(new Set((invOrgs || []).map((i: any) => i.organization_id)));
    console.log('--- INVENTORY ---');
    console.log('Distinct organization_ids in first 1000 inventory entries:', orgs);
  }

  // 4. Try querying organizations from user perspective
  const { data: orgsList, error: orgsError } = await supabase
    .from('organizations')
    .select('*');
  console.log('--- ORGANIZATIONS TABLE ---');
  if (orgsError) {
    console.log('Error querying organizations:', orgsError.message);
  } else {
    console.log('Organizations in table:', orgsList);
  }
}

main().catch(console.error);
