import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  console.log('--- DB Profiles ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log('Profiles:', pErr ? pErr.message : JSON.stringify(profiles, null, 2));

  console.log('\n--- DB Organizations ---');
  const { data: orgs, error: oErr } = await supabase.from('organizations').select('*');
  console.log('Organizations:', oErr ? oErr.message : JSON.stringify(orgs, null, 2));

  console.log('\n--- KV Secrets ---');
  const { data: secretsInKv, error: sErr } = await supabase.from('kv_store_8405be07').select('key').ilike('key', 'secrets:%');
  console.log('Secrets Keys:', sErr ? sErr.message : JSON.stringify(secretsInKv, null, 2));

  console.log('\n--- Current User Data in KV ---');
  const { data: userKv, error: uErr } = await supabase.from('kv_store_8405be07').select('key, value').ilike('key', 'user:%');
  console.log('Users in KV count:', userKv?.length || 0);
  if (userKv) {
    for (const row of userKv) {
      console.log(`Key: "${row.key}", Value type: ${typeof row.value}, Keys: ${row.value ? Object.keys(row.value) : ''}`);
      if (row.key.startsWith('user:email:') || row.key === 'user:list') {
        console.log(`  -> ${JSON.stringify(row.value)}`);
      } else {
        console.log(`  -> id: ${row.value?.id}, email: ${row.value?.email}, org: ${row.value?.organizationId || row.value?.organisationId}`);
      }
    }
  }
}

main().catch(console.error);
