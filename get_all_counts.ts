import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  const tables = ['organizations', 'profiles', 'contacts', 'inventory', 'opportunities'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
    } else {
      console.log(`Table ${table} has ${count} rows`);
    }
    
    // Also log distinct organization_id
    if (table !== 'organizations') {
      const { data, error: orgError } = await supabase
        .from(table)
        .select('organization_id')
        .limit(1000);
        
      if (!orgError && data) {
        const uniqueOrgs = Array.from(new Set(data.map((r: any) => r.organization_id)));
        console.log(`  Distinct orgs in ${table} (sample of first 1000):`, uniqueOrgs);
      }
    }
  }
}

main().catch(console.error);
