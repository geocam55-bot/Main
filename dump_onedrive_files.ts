import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  const { data: kvData } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .like('key', 'email_account:%');

  const accounts = (kvData || [])
    .map((item: any) => item.value)
    .filter((a: any) => a.provider === 'outlook');

  if (accounts.length === 0) {
    console.error('No connected Microsoft accounts found.');
    return;
  }

  const selectedAccount = accounts[0];
  console.log(`Using OneDrive Account: ${selectedAccount.email}`);

  const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
  const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

  let accessToken = selectedAccount.access_token;
  try {
    const tokenResp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        refresh_token: selectedAccount.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    if (tokenResp.ok) {
      const g = await tokenResp.json();
      accessToken = g.access_token;
    }
  } catch (e: any) {
    console.error('Token refresh failed:', e.message);
  }

  // 1. Let's hit the me/drive/root/children API
  console.log('--- Listing Root Directory Children ---');
  let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (resp.ok) {
    const json: any = await resp.json();
    console.log(`Found ${json.value?.length || 0} items at OneDrive Root:`);
    for (const item of json.value || []) {
      console.log(`- Name: "${item.name}", ID: "${item.id}", Folder: ${!!item.folder}, Size: ${item.size}`);
      // If folder, list its children too!
      if (item.folder) {
        const subUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/children`;
        const subResp = await fetch(subUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (subResp.ok) {
          const subJson: any = await subResp.json();
          for (const s of subJson.value || []) {
            console.log(`  └─ Name: "${s.name}", ID: "${s.id}", Folder: ${!!s.folder}, Size: ${s.size}`);
          }
        }
      }
    }
  } else {
    console.error(`Root fetch failed: HTTP ${resp.status}`);
  }

  // 2. Let's do a broad Graph API search for '.xlsx'
  console.log('\n--- Searching OneDrive for all XLSX files ---');
  const searchUrl = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='.xlsx')?$select=id,name,size,folder,file";
  const searchResp = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (searchResp.ok) {
    const sJson: any = await searchResp.json();
    console.log(`Search result elements count: ${sJson.value?.length || 0}`);
    for (const item of sJson.value || []) {
      console.log(`- Name: "${item.name}", ID: "${item.id}", Size: ${item.size}`);
    }
  } else {
    console.error(`Search fetch failed: HTTP ${searchResp.status}`);
  }
}

main().catch(console.error);
