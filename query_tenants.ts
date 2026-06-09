import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();

  console.log('--- QUERY TENANTS TABLE ---');
  const { data: tenantsList, error: tenantsError } = await supabase
    .from('tenants')
    .select('*');
    
  if (tenantsError) {
    console.error('Error querying tenants:', tenantsError.message);
  } else {
    console.log(`Total tenants count: ${tenantsList?.length}`);
    console.log('Tenants details:', JSON.stringify(tenantsList, null, 2));
  }
}

main().catch(console.error);
