import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('key, value')
    .ilike('key', 'email_account:%');

  if (error) {
    console.error('Error fetching email accounts:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} keys with email_account prefix.`);
  for (const row of data || []) {
    const val = row.value || {};
    console.log(`Key: ${row.key}`);
    console.log(`  Provider: ${val.provider}`);
    console.log(`  Email: ${val.email}`);
    console.log(`  DisplayName: ${val.displayName}`);
    console.log(`  Has Access Token: ${!!val.access_token}`);
    console.log(`  Has Refresh Token: ${!!val.refresh_token}`);
    console.log(`  Token Expires At: ${val.token_expires_at}`);
    console.log(`  Connected At: ${val.connectedAt}`);
    console.log(`  Status: ${val.status}`);
  }
}

main();
