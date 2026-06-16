import { createClient } from './src/utils/supabase/client';
import * as XLSX from 'xlsx';

async function scanFolderRecursive(accessToken: string, folderId: string, targetName: string): Promise<any> {
  const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name,folder,file,size`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) return null;

  const json: any = await resp.json();
  const items = json.value || [];

  // Look for direct match
  const match = items.find((f: any) => f.name.toLowerCase() === targetName.toLowerCase() && f.file);
  if (match) {
    return match;
  }

  // Look inside subfolders
  for (const item of items) {
    if (item.folder) {
      console.log(`Scanning subfolder: "${item.name}"...`);
      const foundIdx = await scanFolderRecursive(accessToken, item.id, targetName);
      if (foundIdx) return foundIdx;
    }
  }

  return null;
}

async function main() {
  const supabase = createClient();
  const fileName = 'Product_Export_List.xlsx';

  const { data: kvData } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .like('key', 'email_account:%');

  const accounts = (kvData || [])
    .map((item: any) => item.value)
    .filter((a: any) => a.provider === 'outlook');

  if (accounts.length === 0) {
    console.error('No outlook accounts.');
    return;
  }

  const selectedAccount = accounts[0];
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
  } catch (e: any) {}

  console.log(`Starting recursive OneDrive scan for: "${fileName}"...`);
  const matchFile = await scanFolderRecursive(accessToken, 'root', fileName);

  if (matchFile) {
    console.log(`SUCCESS! Found file in folder!`, matchFile);
    
    // Let's test downloading it too!
    console.log(`Downloading ${matchFile.name} from ID: ${matchFile.id}...`);
    const dUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${matchFile.id}/content`;
    const dResp = await fetch(dUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (dResp.ok) {
      const arr = await dResp.arrayBuffer();
      const buf = Buffer.from(arr);
      console.log(`Downloaded ${buf.length} bytes.`);
      
      const wb = XLSX.read(buf, { type: 'buffer' });
      console.log('Sheet names:', wb.SheetNames);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      console.log('Worksheet ref range:', sheet['!ref']);
      const rows = XLSX.utils.sheet_to_json(sheet);
      console.log(`Total rows in the actual OneDrive Product_Export_List.xlsx file: ${rows.length}`);
      
      // Check if "84895031" is inside this file!
      const matchingRows = rows.filter(r => JSON.stringify(r).includes('84895031'));
      console.log(`Searching SKU "84895031" matches count: ${matchingRows.length}`);
      if (matchingRows.length > 0) {
        console.log('SAMPLES OF THE SKU IN LIVE ONEDRIVE FILE:', JSON.stringify(matchingRows, null, 2));
      }
    } else {
      console.error('Download failed');
    }
  } else {
    console.error('File not found recursively.');
  }
}

main().catch(console.error);
