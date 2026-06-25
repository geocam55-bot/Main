import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: secrets } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'secrets:microsoft')
    .maybeSingle();

  const CID = secrets?.value?.clientId;
  const CS = secrets?.value?.clientSecret;
  const tenantId = secrets?.value?.tenantId || 'common';

  console.log('Secrets:', { CID, CS, tenantId });

  const { data: accounts } = await supabase
    .from('kv_store_8405be07')
    .select('key, value')
    .ilike('key', 'email_account:%');

  const account = accounts?.find(a => a.value?.provider === 'outlook' && a.value?.refresh_token);
  if (!account) {
    console.error('No outlook account with refresh token found');
    return;
  }

  const refreshToken = account.value.refresh_token;
  console.log('Attempting refresh with token for:', account.value.email);

  // 1. Without scope
  try {
    const params = new URLSearchParams({
      client_id: CID,
      client_secret: CS,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    console.log('Response without scope status:', r.status);
    const text = await r.text();
    console.log('Response without scope body:', text);
  } catch (err: any) {
    console.error('Fetch without scope failed:', err.message);
  }

  // 2. With scope and redirect_uri
  try {
    const params = new URLSearchParams({
      client_id: CID,
      client_secret: CS,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read Calendars.Read Calendars.ReadWrite Files.Read Files.ReadWrite',
      redirect_uri: secrets?.value?.redirectUri || 'https://www.prospacescrm.com/oauth-callback'
    });
    const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    console.log('Response with scope and redirect_uri status:', r.status);
    const text = await r.text();
    console.log('Response with scope and redirect_uri body:', text);
  } catch (err: any) {
    console.error('Fetch with scope failed:', err.message);
  }
}

main();
