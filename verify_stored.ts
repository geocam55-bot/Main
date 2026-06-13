import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'secrets:microsoft')
    .maybeSingle();

  if (error) {
    console.error('Error querying:', error);
    return;
  }
  if (!data || !data.value) {
    console.log('No credentials found.');
  } else {
    console.log('Value currently in DB KV store:');
    console.log('Client ID:', data.value.clientId);
    console.log('Client Secret Length:', data.value.clientSecret?.length);
    if (data.value.clientSecret) {
      console.log('Client Secret prefix:', data.value.clientSecret.substring(0, 4) + '...');
      console.log('Client Secret suffix:', '...' + data.value.clientSecret.substring(data.value.clientSecret.length - 4));
    }
    console.log('Redirect URI:', data.value.redirectUri);
    console.log('Tenant ID:', data.value.tenantId);
  }
}

main().catch(console.error);
