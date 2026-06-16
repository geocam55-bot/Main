import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const searchTerms = ['MMS449752', 'SO001075653009', 'TERRAIN', 'OVER100', '84895031'];
  
  console.log('Searching for target SKUs in database text fields or any tables...');
  
  // Search inventory table
  for (const term of searchTerms) {
    const { data: invMatches, error } = await supabase
      .from('inventory')
      .select('*')
      .or(`sku.ilike.%${term}%,name.ilike.%${term}%,description.ilike.%${term}%`);
    if (error) {
      console.error(`Error searching inventory for ${term}:`, error);
    } else if (invMatches && invMatches.length > 0) {
      console.log(`[INVENTORY TABLE MATCH for "${term}"]: Found ${invMatches.length} rows:`, invMatches);
    } else {
      console.log(`[INVENTORY TABLE]: No matches for ${term}`);
    }
  }

  // Search entire KV store values (since values are JSON, we can cast/ilike or retrieve and search)
  console.log('\nSearching KV store for occurrences of target SKUs in stringified values...');
  const { data: kvAll, error: kvErr } = await supabase
    .from('kv_store_8405be07')
    .select('key, value');

  if (kvErr) {
    console.error('Error fetching KV store:', kvErr);
    return;
  }

  console.log(`Fetched ${kvAll?.length || 0} keys from kv_store.`);
  for (const row of kvAll || []) {
    const valString = JSON.stringify(row.value);
    for (const term of searchTerms) {
      if (valString.includes(term)) {
        console.log(`[KV_STORE MATCH for "${term}"]: Key "${row.key}" contains the term! Value preview: ${valString.slice(0, 300)}...`);
      }
    }
  }
}

main().catch(console.error);
