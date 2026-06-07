import { createClient } from './src/utils/supabase/client';
import path from 'path';
import fs from 'fs';

const supabase = createClient();

async function syncOneDriveFileOnBackend(task: any) {
  const fileName = task.action.fileName;
  if (!fileName) {
    throw new Error("No fileName specified in the action.");
  }

  const { data: kvData, error: kvErr } = await supabase
    .from('kv_store_8405be07')
    .select('key, value')
    .like('key', 'email_account:%');

  if (kvErr || !kvData || kvData.length === 0) {
    throw new Error("No connected OAuth accounts found on the server. Please connect under connected Microsoft OneDrive panel first.");
  }

  const accounts = kvData
    .map((item: any) => ({ ...item.value, kvKey: item.key }))
    .filter((a: any) => a.provider === 'outlook');

  if (accounts.length === 0) {
    throw new Error("No connected Microsoft OneDrive accounts found in database records.");
  }

  const creatorStr = String(task.creator || '').toLowerCase().trim();
  const selectedAccount = accounts.find((acc: any) => 
    String(acc.email || '').toLowerCase().trim() === creatorStr
  ) || accounts[0];

  const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
  const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

  console.log('Using AZURE_CLIENT_ID:', AZURE_CLIENT_ID ? 'Configured' : 'Missing');
  console.log('Using AZURE_CLIENT_SECRET:', AZURE_CLIENT_SECRET ? 'Configured' : 'Missing');
  console.log('Selected Microsoft Account:', selectedAccount.email);

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error("Microsoft API credentials (AZURE_CLIENT_ID/AZURE_CLIENT_SECRET) are not configured as environment variables in this tournament.");
  }

  let accessToken = selectedAccount.access_token;
  const expiresAt = selectedAccount.token_expires_at ? new Date(selectedAccount.token_expires_at) : null;
  const needsRefresh = !expiresAt || (expiresAt.getTime() - Date.now() < 5 * 60 * 1000);

  if (needsRefresh && selectedAccount.refresh_token) {
    console.log(`[OneDrive Background Sync] Fetching fresh OAuth access token for ${selectedAccount.email}`);
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
        throw new Error(`Token endpoint responded with status: ${tokenResp.status} - ${await tokenResp.text()}`);
      }

      const tokenJson: any = await tokenResp.json();
      accessToken = tokenJson.access_token;
      selectedAccount.access_token = tokenJson.access_token;
      if (tokenJson.refresh_token) {
        selectedAccount.refresh_token = tokenJson.refresh_token;
      }
      selectedAccount.token_expires_at = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

      await supabase.from('kv_store_8405be07').upsert({
        key: selectedAccount.kvKey,
        value: selectedAccount
      });
      console.log(`[OneDrive Background Sync] Re-authorized OneDrive access successfully.`);
    } catch (refreshErr: any) {
      console.error(`[OneDrive Background Sync] Token refresh warning for ${selectedAccount.email}:`, refreshErr?.message || refreshErr);
    }
  }

  if (!accessToken) {
    throw new Error(`Unauthorized OneDrive session for email: ${selectedAccount.email}`);
  }

  console.log(`[OneDrive Background Sync] Dynamic file resolution starting. Searching for name: "${fileName}"`);
  let fileId = null;

  try {
    const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(fileName)}')?$select=id,name,file`;
    const searchResp = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (searchResp.ok) {
      const searchResult: any = await searchResp.json();
      console.log('Search matches:', (searchResult.value || []).map((f: any) => f.name));
      const match = (searchResult.value || []).find((f: any) => f.name === fileName && f.file);
      if (match) {
        fileId = match.id;
      }
    } else {
      console.error('Search request failed with HTTP status:', searchResp.status, await searchResp.text());
    }
  } catch (searchErr) {
    console.error(`[OneDrive Background Sync] Graph search warning:`, searchErr);
  }

  if (!fileId) {
    try {
      console.log(`[OneDrive Background Sync] Search failed/empty, scanning root children for "${fileName}"...`);
      const childrenUrl = `https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name,file`;
      const childrenResp = await fetch(childrenUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (childrenResp.ok) {
        const childrenResult: any = await childrenResp.json();
        console.log('Root children:', (childrenResult.value || []).map((f: any) => f.name));
        const match = (childrenResult.value || []).find((f: any) => f.name === fileName && f.file);
        if (match) {
          fileId = match.id;
        }
      } else {
        console.error('Children scan failed with HTTP:', childrenResp.status, await childrenResp.text());
      }
    } catch (childrenErr) {
      console.error(`[OneDrive Background Sync] Root children scan warning:`, childrenErr);
    }
  }

  if (!fileId) {
    throw new Error(`Target file "${fileName}" could not be resolved or found on your OneDrive Cloud space.`);
  }

  console.log(`[OneDrive Background Sync] Found OneDrive ID ${fileId}. Downloading payload...`);
  const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;
  const downloadResp = await fetch(downloadUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!downloadResp.ok) {
    throw new Error(`OneDrive API fail pulling file content: HTTP ${downloadResp.status}`);
  }

  const arrayBuffer = await downloadResp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    base64Url: buffer.toString('base64'),
    fileName
  };
}

async function main() {
  const { data: dbData } = await supabase
    .from('kv_store_8405be07')
    .select('value')
    .eq('key', 'import_export_tasks')
    .maybeSingle();

  const tasksList = dbData?.value || [];
  const task = tasksList.find((t: any) => t.id === 'task-wyftk9dbb');
  if (!task) {
    console.error('Task task-wyftk9dbb not found in database!');
    return;
  }

  console.log('Triggering syncOneDriveFileOnBackend for task:', task.name);
  try {
    const res = await syncOneDriveFileOnBackend(task);
    console.log('SUCCESS! Retrieved payload of size:', res.buffer.length);
  } catch (err: any) {
    console.error('FAILURE MATCH:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

main().catch(console.error);
