import { createClient } from './src/utils/supabase/client';
import * as XLSX from 'xlsx';

// Copying logic from syncOneDriveFileOnBackend
async function main() {
  const supabase = createClient();
  const fileName = 'Product_Export_List.xlsx';

  console.log(`Connecting to Supabase and fetching connected accounts...`);
  const { data: kvData, error: kvErr } = await supabase
    .from('kv_store_8405be07')
    .select('key, value')
    .like('key', 'email_account:%');

  if (kvErr || !kvData || kvData.length === 0) {
    console.error("No connected OAuth accounts found in database.");
    return;
  }

  const accounts = kvData
    .map((item: any) => ({ ...item.value, kvKey: item.key }))
    .filter((a: any) => a.provider === 'outlook');

  if (accounts.length === 0) {
    console.error("No connected Microsoft OneDrive accounts found.");
    return;
  }

  console.log(`Found ${accounts.length} OneDrive accounts:`, accounts.map(a => a.email));

  const selectedAccount = accounts[0];
  console.log(`Using account: ${selectedAccount.email}`);

  const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
  const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    console.error("Microsoft client credentials missing in env variables.");
    return;
  }

  let accessToken = selectedAccount.access_token;
  // Always fetch a fresh token just in case
  console.log(`Requesting refreshed OAuth token...`);
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

    if (!tokenResp.ok) {
      throw new Error(`Token refresh failed: HTTP ${tokenResp.status} - ${await tokenResp.text()}`);
    }

    const tokenJson: any = await tokenResp.json();
    accessToken = tokenJson.access_token;
    console.log(`Refreshed OAuth token successfully.`);
  } catch (err: any) {
    console.error(`Token refresh warning:`, err.message);
  }

  console.log(`Finding file ID for "${fileName}" in OneDrive...`);
  let fileId = null;
  const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(fileName)}')?$select=id,name,file`;
  const searchResp = await fetch(searchUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (searchResp.ok) {
    const searchResult: any = await searchResp.json();
    const match = (searchResult.value || []).find((f: any) => f.name === fileName && f.file);
    if (match) {
      fileId = match.id;
      console.log(`Found file "${fileName}" with ID "${fileId}" (Search API)`);
    }
  }

  if (!fileId) {
    console.log(`Search failed, scanning root children...`);
    const childrenUrl = `https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name,file`;
    const childrenResp = await fetch(childrenUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (childrenResp.ok) {
      const childrenResult: any = await childrenResp.json();
      const match = (childrenResult.value || []).find((f: any) => f.name === fileName && f.file);
      if (match) {
        fileId = match.id;
        console.log(`Found file "${fileName}" with ID "${fileId}" (Root children API)`);
      }
    }
  }

  if (!fileId) {
    console.error(`File "${fileName}" not found in OneDrive.`);
    return;
  }

  console.log(`Downloading direct content from OneDrive for ID "${fileId}"...`);
  const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;
  const downloadResp = await fetch(downloadUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!downloadResp.ok) {
    console.error(`Download failed: HTTP ${downloadResp.status}`);
    return;
  }

  const arrayBuffer = await downloadResp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`Downloaded file size: ${buffer.length} bytes.`);

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  console.log(`Workbook sheet names:`, workbook.SheetNames);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rRange = firstSheet['!ref'];
  console.log(`First sheet reference range: "${rRange}"`);
  
  const rows = XLSX.utils.sheet_to_json(firstSheet);
  console.log(`Total rows parsed from LIVE OneDrive sheet: ${rows.length}`);
}

main().catch(console.error);
