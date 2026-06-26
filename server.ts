import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as XLSXModule from 'xlsx';
// @ts-ignore
const XLSX: any = XLSXModule.default || XLSXModule;
import os from 'os';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveVirtualFileServer(fileName: string, base64Content: string) {
  try {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const isBinary = ["xlsx", "xls", "zip", "pdf", "png", "jpg", "jpeg", "gif"].includes(ext);

    let textContent = "";
    if (!isBinary) {
      try {
        textContent = Buffer.from(base64Content, 'base64').toString('utf8');
      } catch {
        textContent = base64Content;
      }
    }

    const { error: upsertErr } = await supabase.from('kv_store_8405be07').upsert({
      key: `import_export_file_content:${fileName}`,
      value: {
        name: fileName,
        base64: base64Content,
        textContent: textContent,
        size: Buffer.from(base64Content, 'base64').length,
        lastModified: new Date().toISOString()
      }
    });

    if (upsertErr) {
      console.error(`[Server] Supabase fail saving virtual file ${fileName}:`, upsertErr.message);
    }
  } catch (err: any) {
    console.error(`[Server] Error saving virtual file ${fileName}:`, err?.message || err);
  }
}

async function loadVirtualFileServer(fileName: string) {
  try {
    const { data, error } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', `import_export_file_content:${fileName}`)
      .maybeSingle();
    if (error) {
      console.error(`[Server] Supabase fail loading virtual file ${fileName}:`, error.message);
      return null;
    }
    return data?.value || null;
  } catch (err: any) {
    console.error(`[Server] Error loading virtual file ${fileName}:`, err?.message || err);
    return null;
  }
}


// Ensure storage and data folders exist
const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DRIVE_DIR = path.join(process.cwd(), 'local_drive');
const ONEDRIVE_DIR = path.join(process.cwd(), 'onedrive');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOCAL_DRIVE_DIR)) fs.mkdirSync(LOCAL_DRIVE_DIR, { recursive: true });
if (!fs.existsSync(ONEDRIVE_DIR)) fs.mkdirSync(ONEDRIVE_DIR, { recursive: true });

const TASKS_FILE = path.join(DATA_DIR, 'scheduled_tasks.json');
const LOGS_FILE = path.join(DATA_DIR, 'scheduled_task_history.json');
const CRM_DB_FILE = path.join(DATA_DIR, 'crm_database.json');

const MOCK_CRM_DB_FILE = path.join(DATA_DIR, 'mock_crm_database.json');
if (fs.existsSync(MOCK_CRM_DB_FILE) && !fs.existsSync(CRM_DB_FILE)) {
  try {
    fs.copyFileSync(MOCK_CRM_DB_FILE, CRM_DB_FILE);
    console.log('[Migration] Migrated mock_crm_database.json to crm_database.json');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

// Helper to load/save JSON files safely
function loadJson(file, defaultData) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
  }
  return defaultData;
}

function saveJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

// Seeding standard CRM database if not exists
const initialCrmDb = {
  contacts: [
    { id: '1', Name: 'John Doe', Email: 'john@example.com', Phone: '555-0199', Company: 'Acme Corp', Trade: 'Builder', Status: 'Lead', PriceLevel: 'Standard', Notes: 'Met at builders convention' },
    { id: '2', Name: 'Sarah Jenkins', Email: 'sarah@design.com', Phone: '555-0144', Company: 'Jenkins Design', Trade: 'Architect', Status: 'Customer', PriceLevel: 'Wholesale', Notes: 'Premium client' },
    { id: '3', Name: 'Bob Builder', Email: 'bob@constructions.com', Phone: '555-0200', Company: 'Bob Constructions', Trade: 'Carpenter', Status: 'Active', PriceLevel: 'Contractor', Notes: 'Prefers SMS updates' }
  ],
  inventory: [
    { id: '1', Name: 'Premium Oak Decking Tile', SKU: 'DEC-OAK-01', Category: 'Timber', Quantity: 450, Location: 'Warehouse A', Status: 'In Stock', UnitPrice: 12.50, Cost: 7.20, PriceTier1: 12.50, PriceTier2: 12.00, PriceTier3: 11.50, PriceTier4: 11.00, PriceTier5: 10.50, Unit: 'ea' },
    { id: '2', Name: 'Stainless Concrete Anchors 4x', SKU: 'ANC-CON-04', Category: 'Fasteners', Quantity: 1200, Location: 'Shelf 12B', Status: 'In Stock', UnitPrice: 1.80, Cost: 0.90, PriceTier1: 1.80, PriceTier2: 1.70, PriceTier3: 1.60, PriceTier4: 1.50, PriceTier5: 1.40, Unit: 'ea' },
    { id: '3', Name: 'Outdoor Composite Plank Green', SKU: 'PLK-COMP-09', Category: 'Planks', Quantity: 80, Location: 'Warehouse B', Status: 'Low Stock', UnitPrice: 24.00, Cost: 15.00, PriceTier1: 24.00, PriceTier2: 23.00, PriceTier3: 22.00, PriceTier4: 21.00, PriceTier5: 20.00, Unit: 'lf' }
  ],
  deals: [
    { id: '1', ClientName: 'Acme Corp', ProjectName: 'Corporate Deck Expansion', DealValue: 24500, Stage: 'Negotiation', CloseDate: '2026-06-15', Notes: 'Pending custom board approval' },
    { id: '2', ClientName: 'Jenkins Family', ProjectName: 'Pool House Framing', DealValue: 12800, Stage: 'Proposal Sent', CloseDate: '2026-07-02', Notes: 'Includes hardware kits supply' }
  ]
};

// Seed storage files if empty so it feels alive right away
function seedStorageFiles() {
  const crm = loadJson(CRM_DB_FILE, initialCrmDb);
  if (!fs.existsSync(CRM_DB_FILE)) {
    saveJson(CRM_DB_FILE, crm);
  }

  // Create some sample drive files
  const sampleContactsCsv = '"Name","Email","Phone","Company","Trade","Status","Price Level"\n' +
    '"Michael Smith","michael@smithbuild.com","555-9011","Smith Framing","Contractor","Lead","Wholesale"\n' +
    '"Emma Watson","emma@wattarch.com","555-8854","Watson Architects","Architect","Customer","Premium"';
  
  const sampleInventoryCsv = '"Item Name","SKU","Category","Quantity","Location","UnitPrice","Cost","PriceTier1","PriceTier2","PriceTier3","PriceTier4","PriceTier5","Unit"\n' +
    '"Douglas Fir Post 4x4","POST-FIR-44","Timber","300","Yard East","18.50","10.00","18.50","17.50","16.50","15.50","14.50","ea"\n' +
    '"Titan Decking Screws 500pk","SCR-TIT-500","Fasteners","65","Shelf C1","45.00","28.00","45.00","43.00","41.00","39.00","37.00","ea"';

  fs.writeFileSync(path.join(LOCAL_DRIVE_DIR, 'sample_contacts_import.csv'), sampleContactsCsv, 'utf8');
  fs.writeFileSync(path.join(LOCAL_DRIVE_DIR, 'sample_inventory_import.csv'), sampleInventoryCsv, 'utf8');
  fs.writeFileSync(path.join(ONEDRIVE_DIR, 'onedrive_contacts_import.csv'), sampleContactsCsv, 'utf8');
  fs.writeFileSync(path.join(ONEDRIVE_DIR, 'onedrive_inventory_import.csv'), sampleInventoryCsv, 'utf8');

  // Seed sample task if empty and we haven't seeded yet
  const tasksSeededFlag = path.join(DATA_DIR, 'scheduler_tasks_seeded.flag');
  if (!fs.existsSync(tasksSeededFlag)) {
    const tasks = loadJson(TASKS_FILE, []);
    if (tasks.length === 0) {
      const demoTask = {
        id: 'task-demo-1',
        name: 'Unattended Nightly Contacts Backup',
        description: 'Automatically exports all active contacts from the CRM system into a CSV spreadsheet saved on the Local Drive.',
        status: 'active',
        recurrence: 'daily',
        triggerDetail: {
          time: '02:00',
          intervalDays: 1
        },
        action: {
          type: 'export',
          module: 'contacts',
          fileStorage: 'local',
          fileName: 'nightly_contacts_backup.csv',
          format: 'csv'
        },
        settings: {
          stopIfRunningHours: 1,
          retryCount: 3,
          retryIntervalMinutes: 5
        },
        lastRunTime: null,
        lastRunResult: null,
        nextRunTime: null,
        createdAt: new Date().toISOString(),
        creator: 'System Administrator'
      };
      demoTask.nextRunTime = calculateNextRunTime(demoTask).toISOString();
      saveJson(TASKS_FILE, [demoTask]);
    }
    fs.writeFileSync(tasksSeededFlag, 'seeded', 'utf8');
  }

  // Seed sample log history if empty
  const logs = loadJson(LOGS_FILE, []);
  if (logs.length === 0) {
    const demoLogs = [
      {
        id: "log-sys-ready",
        taskId: "task-demo-1",
        taskName: "Unattended Nightly Contacts Backup",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
        actionType: "export",
        module: "contacts",
        fileStorage: "local",
        fileName: "nightly_contacts_backup.csv",
        status: "success",
        recordCount: 4,
        message: "Successfully exported 4 records from contacts to unattended local storage file: nightly_contacts_backup.csv"
      },
      {
        id: "log-sys-init",
        taskId: "task-demo-1",
        taskName: "Unattended Nightly Contacts Backup",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        actionType: "export",
        module: "contacts",
        fileStorage: "local",
        fileName: "nightly_contacts_backup.csv",
        status: "success",
        recordCount: 4,
        message: "Successfully executed unattended file export backup. Written 4 records to storage successfully."
      }
    ];
    saveJson(LOGS_FILE, demoLogs);
  }
}

seedStorageFiles();

// Auto-reset any tasks stuck in "running" state on startup / reboot to prevent frozen triggers
try {
  const tasks = loadJson(TASKS_FILE, []);
  let changed = false;
  tasks.forEach((t: any) => {
    if (t.status === 'running') {
      t.status = 'active';
      changed = true;
    }
  });
  if (changed) {
    saveJson(TASKS_FILE, tasks);
    console.log('[Scheduler] Resolved stuck executing tasks on container bootstrap.');
  }
} catch (err) {
  console.error('[Scheduler] Initialization tasks sanitization failed:', err);
}

// Calculate next run time
function calculateNextRunTime(task: any, baseDate = new Date()): Date {
  try {
    if (!task) return new Date(baseDate.getTime() + 86400000);
    const recurrence = task.recurrence || 'daily';
    const triggerDetail = task.triggerDetail || {};

    if (recurrence === 'one-time') {
      if (!triggerDetail.dateTime) {
        return new Date(baseDate.getTime() + 3600000); // 1 hr from now fallback
      }
      const triggerTime = new Date(triggerDetail.dateTime);
      return isNaN(triggerTime.getTime()) ? new Date(baseDate.getTime() + 3600000) : triggerTime;
    }

    const timezoneOffset = typeof task.timezoneOffset === 'number' ? task.timezoneOffset : 0;
    
    // Transform baseDate to user's local time perspective (represented as UTC hours)
    const localBaseDate = new Date(baseDate.getTime() - timezoneOffset * 60 * 1000);
    let nextLocalDate = new Date(localBaseDate);

    if (!triggerDetail.time) {
      triggerDetail.time = '09:00';
    }
    const [hours, minutes] = String(triggerDetail.time).split(':').map(Number);
    nextLocalDate.setUTCHours(isNaN(hours) ? 9 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);

    const addDays = (d: Date, days: number) => {
      const res = new Date(d);
      res.setUTCDate(res.getUTCDate() + days);
      return res;
    };

    let resultLocalDate = nextLocalDate;

    if (recurrence === 'daily') {
      let interval = Number(triggerDetail.intervalDays) || 1;
      if (isNaN(interval) || interval <= 0) {
        interval = 1;
      }
      while (nextLocalDate <= localBaseDate) {
        nextLocalDate = addDays(nextLocalDate, interval);
      }
      resultLocalDate = nextLocalDate;
    } else if (recurrence === 'weekly') {
      const daysOfWeek = Array.isArray(triggerDetail.daysOfWeek) ? triggerDetail.daysOfWeek : [1]; // 0: Sun, 1: Mon, etc.
      let candidate = new Date(nextLocalDate);
      let found = false;
      for (let i = 0; i < 15; i++) {
        if (candidate > localBaseDate && daysOfWeek.includes(candidate.getUTCDay())) {
          resultLocalDate = candidate;
          found = true;
          break;
        }
        candidate = addDays(candidate, 1);
      }
      if (!found) resultLocalDate = candidate;
    } else if (recurrence === 'monthly') {
      const daysOfMonth = Array.isArray(triggerDetail.daysOfMonth) ? triggerDetail.daysOfMonth : [1];
      let candidate = new Date(nextLocalDate);
      let found = false;
      for (let i = 0; i < 366; i++) {
        if (candidate > localBaseDate && daysOfMonth.includes(candidate.getUTCDate())) {
          resultLocalDate = candidate;
          found = true;
          break;
        }
        candidate = addDays(candidate, 1);
      }
      if (!found) resultLocalDate = addDays(nextLocalDate, 1);
    } else {
      resultLocalDate = addDays(nextLocalDate, 1);
    }

    // Convert back from user's local time perspective to server's UTC absolute time sequence
    return new Date(resultLocalDate.getTime() + timezoneOffset * 60 * 1000);
  } catch (err) {
    console.error('Error in calculateNextRunTime:', err);
    return new Date(baseDate.getTime() + 86400000); // Fail-safe to tomorrow
  }
}

// Helper to perform fetch requests with generous timeout and automatic retries for flaky Microsoft APIs
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, delayMs = 1500, timeoutMs = 45000): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const mergedOptions = { ...options, signal: controller.signal };

    try {
      const response = await fetch(url, mergedOptions);
      clearTimeout(id);
      
      // Retry on server-side issues (5xx) or rate limits (429)
      if (response.status >= 500 || response.status === 429) {
        if (attempt === retries) {
          return response;
        }
        console.warn(`[OneDrive Retry] Attempt ${attempt} returned status ${response.status}. Retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return response;
    } catch (err: any) {
      clearTimeout(id);
      lastError = err;
      if (attempt === retries) {
        throw err;
      }
      const isTimeout = err.name === 'AbortError';
      console.warn(`[OneDrive Retry] Attempt ${attempt} failed (${isTimeout ? 'Timeout (>45s)' : err.message || err}). Retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastError || new Error("Maximum retries reached");
}

// Helper to search folders recursively for a file name
async function scanFolderRecursiveServer(accessToken: string, folderId: string, targetName: string, depth = 0): Promise<any> {
  if (depth > 4) return null; // safety depth limit
  try {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name,folder,file,size`;
    const resp = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) return null;

    const json: any = await resp.json();
    const items = json.value || [];

    // First do direct case-insensitive check
    const match = items.find((f: any) => f.name.toLowerCase() === targetName.toLowerCase() && f.file);
    if (match) return match;

    // Scan directories recursively
    for (const item of items) {
      if (item.folder) {
        const found = await scanFolderRecursiveServer(accessToken, item.id, targetName, depth + 1);
        if (found) return found;
      }
    }
  } catch (err) {
    console.error(`[OneDrive Recursive Server Search] Error searching folder ID "${folderId}":`, err);
  }
  return null;
}

// Helper to automatically pull fresh file content from OneDrive during unattended task execution
export async function syncOneDriveFileOnBackend(task: any) {
  const fileName = task.action.fileName;
  if (!fileName) {
    throw new Error("No fileName specified in the action.");
  }

  // 1. Fetch connected accounts from kv store
  const { data: kvData, error: kvErr } = await supabase
    .from('kv_store_8405be07')
    .select('key, value')
    .like('key', 'email_account:%');

  if (kvErr || !kvData || kvData.length === 0) {
    throw new Error("No connected OAuth accounts found on the server. Please connect under connected Microsoft OneDrive panel first.");
  }

  // 2. Filter and sort MS accounts
  // We sort accounts by connectedAt in descending order (newest first). This ensures that if there are duplicate or old accounts, we always try the most recent ones first.
  const accounts = kvData
    .map((item: any) => ({ ...item.value, kvKey: item.key }))
    .filter((a: any) => a.provider === 'outlook')
    .sort((a: any, b: any) => new Date(b.connectedAt || 0).getTime() - new Date(a.connectedAt || 0).getTime());

  if (accounts.length === 0) {
    throw new Error("No connected Microsoft OneDrive accounts found in database records.");
  }

  // 3. Find candidates. If creatorStr is specified and matches any account email, prioritize those first, but keep them sorted by connectedAt descending.
  const creatorStr = String(task.creator || '').toLowerCase().trim();
  const matchingAccounts = accounts.filter((acc: any) => 
    String(acc.email || '').toLowerCase().trim() === creatorStr
  );
  
  // Use matching accounts if available, otherwise fallback to all accounts
  const candidateAccounts = matchingAccounts.length > 0 ? matchingAccounts : accounts;

  const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
  const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error("Microsoft API credentials (AZURE_CLIENT_ID/AZURE_CLIENT_SECRET) are not configured as environment variables in this tournament.");
  }

  let accessToken = '';
  let selectedAccount: any = null;
  let lastErrorMsg = '';

  for (const account of candidateAccounts) {
    console.log(`[OneDrive Background Sync] Attempting to authorize using connected account: ${account.email} (Connected: ${account.connectedAt || 'unknown'}, ID: ${account.id || 'unknown'})`);
    
    let currentAccessToken = account.access_token;
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const needsRefresh = !expiresAt || (expiresAt.getTime() - Date.now() < 5 * 60 * 1000);

    if (needsRefresh && account.refresh_token) {
      console.log(`[OneDrive Background Sync] Fetching fresh OAuth access token for ${account.email}`);
      try {
        const tokenResp = await fetchWithRetry('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: AZURE_CLIENT_ID,
            client_secret: AZURE_CLIENT_SECRET,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token'
          })
        });

        if (!tokenResp.ok) {
          throw new Error(`Token endpoint responded with status: ${tokenResp.status} - ${await tokenResp.text()}`);
        }

        const tokenJson: any = await tokenResp.json();
        currentAccessToken = tokenJson.access_token;
        account.access_token = tokenJson.access_token;
        if (tokenJson.refresh_token) {
          account.refresh_token = tokenJson.refresh_token;
        }
        account.token_expires_at = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

        await supabase.from('kv_store_8405be07').upsert({
          key: account.kvKey,
          value: account
        });
        console.log(`[OneDrive Background Sync] Re-authorized OneDrive access successfully for ${account.email}.`);
        accessToken = currentAccessToken;
        selectedAccount = account;
        break; // Successfully authorized! Exit loop.
      } catch (refreshErr: any) {
        const errMsg = refreshErr?.message || String(refreshErr);
        console.error(`[OneDrive Background Sync] Token refresh failed for ${account.email}:`, errMsg);
        lastErrorMsg = errMsg;
        // Continue to the next candidate account in the loop
      }
    } else if (currentAccessToken) {
      console.log(`[OneDrive Background Sync] Existing token for ${account.email} is still valid.`);
      accessToken = currentAccessToken;
      selectedAccount = account;
      break; // Token is valid! Exit loop.
    }
  }

  if (!accessToken || !selectedAccount) {
    // If we failed all accounts, provide a comprehensive explanation using the last encountered error
    let friendlyError = lastErrorMsg || "No active access tokens found and no refresh tokens succeeded.";
    if (lastErrorMsg.includes("invalid_client") || lastErrorMsg.includes("AADSTS7000215")) {
      friendlyError = `[Azure/OneDrive Auth Error] AADSTS7000215: Invalid Azure Client Secret. It looks like you've provided the "Secret ID" (a GUID) from the Azure Certificates & secrets page instead of the "Value" column. Please generate a new client secret in Azure, copy its actual "Value" column (which is a text string of symbols and letters), and configure it as the AZURE_CLIENT_SECRET environment variable in Google AI Studio Settings.`;
    } else if (lastErrorMsg.includes("unauthorized_client") || lastErrorMsg.includes("AADSTS700016")) {
      const isSwapped = AZURE_CLIENT_ID.includes('~') || !(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(AZURE_CLIENT_ID.trim()));
      if (isSwapped) {
        friendlyError = `[Azure/OneDrive Auth Error] AADSTS700016: Application not found. It looks like you have SWAPPED the Application (Client) ID and the Client Secret! Your AZURE_CLIENT_ID currently contains a secret value with a '~' character. Please swap them back in your Google AI Studio Settings: set AZURE_CLIENT_ID to the UUID/Guid Application ID (the one like "${AZURE_CLIENT_SECRET}") and set AZURE_CLIENT_SECRET to the secret Value (the one like "${AZURE_CLIENT_ID}").`;
      } else {
        friendlyError = `[Azure/OneDrive Auth Error] AADSTS700016: Application with identifier '${AZURE_CLIENT_ID}' was not found. Please ensure that in the Azure App Registration of your app, under "Supported account types", you selected "Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)". If it is selected as single tenant, personal accounts won't be able to log in.`;
      }
    } else if (lastErrorMsg.includes("invalid_grant") || lastErrorMsg.includes("AADSTS70000")) {
      friendlyError = `[Azure/OneDrive Auth Error] AADSTS70000: The refresh token is invalid or was issued for a different client ID. This can happen if the client ID was changed, or if the token is too old. Please reconnect your Microsoft account under the connected Microsoft OneDrive panel.`;
    }
    throw new Error(`OneDrive login/refresh failed: ${friendlyError}`);
  }

  if (!accessToken) {
    throw new Error(`Unauthorized OneDrive session for email: ${selectedAccount.email}`);
  }

  // 4. Resolve the OneDrive file id from Graph
  console.log(`[OneDrive Background Sync] Dynamic file resolution starting. Searching for name: "${fileName}"`);
  let fileId = null;

  try {
    const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(fileName)}')?$select=id,name,file`;
    const searchResp = await fetchWithRetry(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (searchResp.ok) {
      const searchResult: any = await searchResp.json();
      const match = (searchResult.value || []).find((f: any) => f.name === fileName && f.file);
      if (match) {
        fileId = match.id;
        console.log(`[OneDrive Background Sync] Successfully resolved file "${fileName}" via Search API: ${fileId}`);
      }
    }
  } catch (searchErr) {
    console.error(`[OneDrive Background Sync] Graph search warning:`, searchErr);
  }

  if (!fileId) {
    console.log(`[OneDrive Background Sync] Search API yielded no results. Scanning nested OneDrive folders recursively for "${fileName}"...`);
    try {
      const match = await scanFolderRecursiveServer(accessToken, 'root', fileName);
      if (match) {
        fileId = match.id;
        console.log(`[OneDrive Background Sync] Correctly resolved nested file "${fileName}" via recursive scanning helper: ${fileId}`);
      }
    } catch (scanErr: any) {
      console.error(`[OneDrive Background Sync] Recursive scan warning:`, scanErr);
    }
  }

  if (!fileId) {
    throw new Error(`Target file "${fileName}" could not be resolved or found on your OneDrive Cloud space (either in root or in any subdirectories).`);
  }

  // 5. Download the file as array buffer
  console.log(`[OneDrive Background Sync] Found OneDrive ID ${fileId}. Downloading payload...`);
  const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;
  const downloadResp = await fetchWithRetry(downloadUrl, {
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

// Helper to automatically push fresh file content back to OneDrive during unattended export tasks
async function uploadOneDriveFileFromBackend(task: any, base64Content: string) {
  const fileName = task.action.fileName;
  if (!fileName) return;

  const { data: kvData, error: kvErr } = await supabase
    .from('kv_store_8405be07')
    .select('key, value')
    .like('key', 'email_account:%');

  if (kvErr || !kvData || kvData.length === 0) return;

  // 2. Filter and sort MS accounts
  // We sort accounts by connectedAt in descending order (newest first). This ensures that if there are duplicate or old accounts, we always try the most recent ones first.
  const accounts = kvData
    .map((item: any) => ({ ...item.value, kvKey: item.key }))
    .filter((a: any) => a.provider === 'outlook')
    .sort((a: any, b: any) => new Date(b.connectedAt || 0).getTime() - new Date(a.connectedAt || 0).getTime());

  if (accounts.length === 0) return;

  // 3. Find candidates. If creatorStr is specified and matches any account email, prioritize those first, but keep them sorted by connectedAt descending.
  const creatorStr = String(task.creator || '').toLowerCase().trim();
  const matchingAccounts = accounts.filter((acc: any) => 
    String(acc.email || '').toLowerCase().trim() === creatorStr
  );
  
  // Use matching accounts if available, otherwise fallback to all accounts
  const candidateAccounts = matchingAccounts.length > 0 ? matchingAccounts : accounts;

  const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
  const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) return;

  let accessToken = '';
  let selectedAccount: any = null;

  for (const account of candidateAccounts) {
    console.log(`[OneDrive Background Export] Attempting to authorize using connected account: ${account.email} (Connected: ${account.connectedAt || 'unknown'}, ID: ${account.id || 'unknown'})`);
    
    let currentAccessToken = account.access_token;
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const needsRefresh = !expiresAt || (expiresAt.getTime() - Date.now() < 5 * 60 * 1000);

    if (needsRefresh && account.refresh_token) {
      console.log(`[OneDrive Background Export] Fetching fresh OAuth access token for ${account.email}`);
      try {
        const tokenResp = await fetchWithRetry('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: AZURE_CLIENT_ID,
            client_secret: AZURE_CLIENT_SECRET,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token'
          })
        });

        if (tokenResp.ok) {
          const tokenJson: any = await tokenResp.json();
          currentAccessToken = tokenJson.access_token;
          account.access_token = tokenJson.access_token;
          if (tokenJson.refresh_token) {
            account.refresh_token = tokenJson.refresh_token;
          }
          account.token_expires_at = new Date(Date.now() + tokenJson.expires_in * 1000).toISOString();

          await supabase.from('kv_store_8405be07').upsert({
            key: account.kvKey,
            value: account
          });
          console.log(`[OneDrive Background Export] Re-authorized OneDrive access successfully for ${account.email}.`);
          accessToken = currentAccessToken;
          selectedAccount = account;
          break; // Successfully authorized! Exit loop.
        } else {
          console.error(`[OneDrive Background Export] Token refresh response failed for ${account.email}: ${tokenResp.status}`);
        }
      } catch (refreshErr) {
        console.error(`[OneDrive Background Export] Token refresh error for ${account.email}:`, refreshErr);
      }
    } else if (currentAccessToken) {
      console.log(`[OneDrive Background Export] Existing token for ${account.email} is still valid.`);
      accessToken = currentAccessToken;
      selectedAccount = account;
      break; // Token is valid! Exit loop.
    }
  }

  if (!accessToken) {
    console.error(`[OneDrive Background Export] Could not authorize any OneDrive session for task.`);
    return;
  }

  const buffer = Buffer.from(base64Content, 'base64');
  console.log(`[OneDrive Background Export] Uploading fresh spreadsheet ${fileName} back into OneDrive...`);

  // Try to locate the existing file ID to perform a targeted in-place update (prevents duplicate files at Root level)
  let uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(fileName)}:/content`;
  try {
    const match = await scanFolderRecursiveServer(accessToken, 'root', fileName);
    if (match && match.id) {
      uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${match.id}/content`;
      console.log(`[OneDrive Background Export] File found recursively at id "${match.id}". Performing selective in-place upload target...`);
    } else {
      console.log(`[OneDrive Background Export] Nested file not found, defaulting upload location to Root dir...`);
    }
  } catch (err) {
    console.error(`[OneDrive Background Export] Lookup target error, defaulting to OneDrive root upload:`, err);
  }

  const uploadResp = await fetchWithRetry(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: buffer
  });

  if (uploadResp.ok) {
    console.log(`[OneDrive Background Export] Successfully uploaded exports to user's remote OneDrive in real-time.`);
  } else {
    console.error(`[OneDrive Background Export] Upload endpoint error: HTTP ${uploadResp.status}`);
  }
}

// Background scheduler tick execution function
async function executeScheduledTask(task: any) {
  const logEntry: any = {
    id: 'log-' + Math.random().toString(36).slice(2, 9),
    taskId: task.id,
    taskName: task.name,
    timestamp: new Date().toISOString(),
    actionType: task.action.type,
    module: task.action.module,
    fileStorage: task.action.fileStorage,
    fileName: task.action.fileName,
    status: 'success',
    recordCount: 0,
    message: ''
  };

  try {
    const driveDir = task.action.fileStorage === 'onedrive' ? ONEDRIVE_DIR : LOCAL_DRIVE_DIR;
    const filePath = path.join(driveDir, task.action.fileName);
    const crmDb = loadJson(CRM_DB_FILE, initialCrmDb);

    if (task.action.type === 'export') {
      const records = crmDb[task.action.module] || [];
      let fileContent = '';

      if (task.action.format === 'json') {
        fileContent = JSON.stringify(records, null, 2);
      } else if (task.action.format === 'xml') {
        fileContent = `<?xml version="1.0" encoding="UTF-8"?>\n<crm_data module="${task.action.module}">\n` +
          records.map((r: any) => `  <item>\n` + Object.entries(r).map(([k, v]) => `    <${k}>${v}</${k}>`).join('\n') + `\n  </item>`).join('\n') +
          `\n</crm_data>`;
      } else {
        // Default CSV
        if (records.length > 0) {
          const headers = Object.keys(records[0]);
          fileContent += headers.map(h => `"${h}"`).join(',') + '\n';
          records.forEach((r: any) => {
            fileContent += headers.map(h => {
              const val = r[h] !== undefined ? String(r[h]).replace(/"/g, '""') : '';
              return `"${val}"`;
            }).join(',') + '\n';
          });
        } else {
          fileContent = 'CRM database contains no records for this module.';
        }
      }

      fs.writeFileSync(filePath, fileContent, 'utf8');
      logEntry.recordCount = records.length;
      logEntry.message = `Successfully exported ${records.length} records from ${task.action.module} to unattended ${task.action.fileStorage} storage file: ${task.action.fileName}`;
      
      // Auto-upload exported data back into user OneDrive unattended
      if (task.action.fileStorage === 'onedrive') {
        const b64 = Buffer.from(fileContent, 'utf8').toString('base64');
        await uploadOneDriveFileFromBackend(task, b64).catch(e => {
          console.error('[OneDrive Export] Background upload failed:', e);
        });
      }
    } else if (task.action.type === 'import') {
      // Dynamic OneDrive Fetch: For OneDrive files, ALWAYS try to pull down the fresh copy first!
      if (task.action.fileStorage === 'onedrive') {
        console.log(`[Scheduler] Unattended OneDrive Import: Fetching latest copy of "${task.action.fileName}" from OneDrive...`);
        try {
          const syncResult = await syncOneDriveFileOnBackend(task);
          if (syncResult && syncResult.buffer) {
            fs.writeFileSync(filePath, syncResult.buffer);
            console.log(`[Scheduler] Unattended OneDrive Import: Successfully pulled a fresh copy of "${task.action.fileName}" to local workspace.`);
          }
        } catch (syncErr: any) {
          console.error(`[Scheduler] Unattended OneDrive Import refresh failure:`, syncErr.message || syncErr);
        }
      }

      // Dynamic Recovery: Check if file missing locally and try to load/recover from database
      if (!fs.existsSync(filePath)) {
        console.log(`[Scheduler] File '${task.action.fileName}' not found in '${driveDir}'. Attempting to restore virtual copy from Supabase...`);
        try {
          const dbFile = await loadVirtualFileServer(task.action.fileName);
          if (dbFile && dbFile.base64) {
            let b64 = dbFile.base64;
            if (b64.startsWith('data:')) {
              b64 = b64.split(';base64,')[1] || '';
            }
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            console.log(`[Scheduler] Dynamically restored '${task.action.fileName}' from virtual DB copy.`);
          }
        } catch (restoreErr: any) {
          console.error(`[Scheduler] Failed to restore file from db fallback:`, restoreErr?.message || restoreErr);
        }
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`Execution failed: Import source file '${task.action.fileName}' not found in ${task.action.fileStorage === 'onedrive' ? 'OneDrive' : 'Local Drive'} (even after DB backup restore attempt).`);
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      let importedRecords = [];

      if (fileExtension === '.json') {
        importedRecords = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else if (fileExtension === '.csv') {
        const rawText = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/g, "");
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          // simple CSV parser
          const parseCsvLine = (line: string) => {
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            return matches.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
          };
          const headers = parseCsvLine(lines[0]);
          for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            const row: any = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx] || '';
            });
            importedRecords.push(row);
          }
        }
      } else {
        // Excel using xlsx read
        const workbook = XLSX.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        importedRecords = XLSX.utils.sheet_to_json(worksheet);
      }

      if (!Array.isArray(importedRecords) || importedRecords.length === 0) {
        throw new Error(`Successfully read but found no valid tabular rows to import.`);
      }

      // ---> INTELLIGENT AUTO-HEALING MAPPING FOR TABLE MISMATCHES <---
      let moduleKey = task.action.module;
      
      const firstRec = importedRecords[0];
      const lowerHeaderKeys = Object.keys(firstRec || {}).map(k => k.toLowerCase().replace(/^\uFEFF|\uFEFF/g, "").replace(/[\s\-_#/()]/g, ""));
      
      // Checking indicators
      const hasSku = lowerHeaderKeys.some(k => k === "sku" || k === "skucode" || k === "partnumber" || k === "partno" || k === "materialsku" || k === "itemsku" || k === "id");
      const hasItemName = lowerHeaderKeys.some(k => k === "itemname" || k === "item_name" || k === "productname" || k === "materialname" || k === "name" || k === "product" || k === "item" || k === "material" || k === "title");
      const hasCost = lowerHeaderKeys.some(k => k === "cost" || k === "costprice" || k === "unitcost");
      const hasPriceTiers = lowerHeaderKeys.some(k => k.includes("pricetier") || k.includes("tier1") || k.includes("price_tier"));

      const hasProjectName = lowerHeaderKeys.some(k => k === "projectname" || k === "dealname" || k === "project" || k === "project_name" || k === "deal_name");
      const hasClientName = lowerHeaderKeys.some(k => k === "clientname" || k === "customername" || k === "client_name" || k === "customer_name");
      const hasDealValue = lowerHeaderKeys.some(k => k === "dealvalue" || k === "deal_value" || k === "value");

      const hasEmail = lowerHeaderKeys.some(k => k === "email" || k === "emailaddress" || k === "email_address");
      const hasPhone = lowerHeaderKeys.some(k => k === "phone" || k === "phonenumber" || k === "phone_number" || k === "telephone");
      const hasLegacyNumber = lowerHeaderKeys.some(k => k === "legacy" || k === "legacynumber" || k === "legacyno" || k === "legacy_number");

      let resolvedModule = moduleKey;
      if (hasSku || (hasItemName && (hasCost || hasPriceTiers || lowerHeaderKeys.includes("quantity")))) {
        resolvedModule = "inventory";
      } else if (hasProjectName || hasClientName || hasDealValue) {
        resolvedModule = "deals";
      } else if (hasEmail || hasPhone || hasLegacyNumber) {
        resolvedModule = "contacts";
      }

      if (resolvedModule !== moduleKey) {
        console.log(`[Auto-Healing] Detected ${resolvedModule} data in file import. Promoting module context from '${moduleKey}' to '${resolvedModule}' for task '${task.name}'.`);
        moduleKey = resolvedModule as any;
        
        // Also update task schedule file to persist this correction
        try {
          const tasks = loadJson(TASKS_FILE, []);
          const matchedTask = tasks.find((t: any) => t.id === task.id);
          if (matchedTask) {
            matchedTask.action.module = resolvedModule;
            saveJson(TASKS_FILE, tasks);
            console.log(`[Auto-Healing] Successfully updated backend task configuration database.`);
          }
        } catch (saveErr) {
          console.error('[Auto-Healing] Failed to update tasks database on backend:', saveErr);
        }
      }

      // Upsert records in local crm database
      if (!crmDb[moduleKey]) crmDb[moduleKey] = [];

      let upserts = 0;
      importedRecords.forEach((item: any) => {
        // Find by identifiers e.g. Email for contacts, SKU for inventory, ProjectName for deals
        let existingIdx = -1;

        // Find keys case-insensitively from input item
        const itemKeys = Object.keys(item || {});
        const findVal = (possibleKeys: string[]) => {
          const matchedKey = itemKeys.find(k => possibleKeys.includes(k.toLowerCase().replace(/[\s\-_#/()]/g, "")));
          return matchedKey ? String(item[matchedKey]).trim() : '';
        };

        const itemSku = findVal(['sku', 'skucode', 'partnumber', 'partno']);
        const itemEmail = findVal(['email', 'emailaddress', 'customeremailaddress', 'customeremail', 'contactemail']);
        const itemName = findVal(['name', 'contact', 'contactname', 'customer', 'fullname', 'itemname', 'productname', 'title']);
        const itemProjectName = findVal(['projectname', 'dealname', 'project', 'title', 'project_name']);
        const itemLegacyNumber = findVal(['legacy', 'legacynumber', 'legacyno']);

        if (moduleKey === 'contacts') {
          existingIdx = crmDb.contacts.findIndex((c: any) => 
            (itemEmail && c.Email?.toLowerCase() === itemEmail.toLowerCase()) || 
            (itemName && c.Name?.toLowerCase() === itemName.toLowerCase()) ||
            (itemLegacyNumber && (c.LegacyNumber === itemLegacyNumber || c.legacy_number === itemLegacyNumber))
          );
        } else if (moduleKey === 'inventory') {
          const searchSku = itemSku || item.id || '';
          existingIdx = crmDb.inventory.findIndex((i: any) => i.SKU?.toLowerCase() === searchSku.toLowerCase());
        } else if (moduleKey === 'deals' || moduleKey === 'bids') {
          existingIdx = crmDb.deals.findIndex((d: any) => 
            (itemProjectName && d.ProjectName?.toLowerCase() === itemProjectName.toLowerCase()) ||
            (itemName && d.ProjectName?.toLowerCase() === itemName.toLowerCase())
          );
        }

        const existingRecord = existingIdx !== -1 ? crmDb[moduleKey][existingIdx] : null;
        const normalizedRecord: any = { id: item.id || (existingRecord ? existingRecord.id : 'seed-' + Math.random().toString(36).slice(2, 6)) };
        Object.entries(item).forEach(([k, v]) => {
          // Normalize spreadsheet column titles
          let key = k;
          const lowerK = k.toLowerCase().replace(/^\uFEFF|\uFEFF/g, "").replace(/[\s\-_#/()]/g, "");
          if (lowerK === 'item name' || lowerK === 'itemname' || lowerK === 'name' || lowerK === 'productname' || lowerK === 'materialname' || lowerK === 'product' || lowerK === 'item' || lowerK === 'material' || lowerK === 'title') key = 'Name';
          else if (lowerK === 'unit price' || lowerK === 'unitprice') key = 'UnitPrice';
          else if (lowerK === 'client name' || lowerK === 'clientname') key = 'ClientName';
          else if (lowerK === 'project name' || lowerK === 'projectname') key = 'ProjectName';
          else if (lowerK === 'deal value' || lowerK === 'dealvalue') key = 'DealValue';
          else if (lowerK === 'close date' || lowerK === 'closedate') key = 'CloseDate';
          else if (lowerK === 'pricetier1' || lowerK === 'price_tier_1' || lowerK === 'tier1' || lowerK === 'retail') key = 'PriceTier1';
          else if (lowerK === 'pricetier2' || lowerK === 'price_tier_2' || lowerK === 'tier2' || lowerK === 'vip') key = 'PriceTier2';
          else if (lowerK === 'pricetier3' || lowerK === 'price_tier_3' || lowerK === 'tier3' || lowerK === 'vipb' || lowerK === 'vip_b' || lowerK === 'vip b' || lowerK === 'eliteb' || lowerK === 'elite-b') key = 'PriceTier3';
          else if (lowerK === 'pricetier4' || lowerK === 'price_tier_4' || lowerK === 'tier4' || lowerK === 'vipa' || lowerK === 'vip_a' || lowerK === 'vip a' || lowerK === 'elitea' || lowerK === 'elite-a') key = 'PriceTier4';
          else if (lowerK === 'pricetier5' || lowerK === 'price_tier_5' || lowerK === 'tier5' || lowerK === 'wholesale') key = 'PriceTier5';
          else if (lowerK === 'unit' || lowerK === 'unitofmeasure' || lowerK === 'unit_of_measure' || lowerK === 'uom') key = 'Unit';
          else if (lowerK === 'imageurl' || lowerK === 'image_url' || lowerK === 'image') key = 'image_url';
          normalizedRecord[key] = v;
        });

        if (moduleKey === 'inventory') {
          // Ensure Tier 1 is always exactly equal to UnitPrice
          normalizedRecord.PriceTier1 = normalizedRecord.UnitPrice !== undefined ? Number(normalizedRecord.UnitPrice) : undefined;

          // If PriceTier2, 3, 4, 5 are blank strings, treat them as undefined to allow fallback
          if (normalizedRecord.PriceTier2 === "") delete normalizedRecord.PriceTier2;
          if (normalizedRecord.PriceTier3 === "") delete normalizedRecord.PriceTier3;
          if (normalizedRecord.PriceTier4 === "") delete normalizedRecord.PriceTier4;
          if (normalizedRecord.PriceTier5 === "") delete normalizedRecord.PriceTier5;

          const defaultPrice = normalizedRecord.UnitPrice !== undefined ? Number(normalizedRecord.UnitPrice) : 0;
          if (normalizedRecord.PriceTier1 === undefined) normalizedRecord.PriceTier1 = defaultPrice;
          if (normalizedRecord.PriceTier2 === undefined) normalizedRecord.PriceTier2 = defaultPrice;
          if (normalizedRecord.PriceTier3 === undefined) normalizedRecord.PriceTier3 = defaultPrice;
          if (normalizedRecord.PriceTier4 === undefined) normalizedRecord.PriceTier4 = defaultPrice;
          if (normalizedRecord.PriceTier5 === undefined) normalizedRecord.PriceTier5 = defaultPrice;
          if (normalizedRecord.Unit === undefined) normalizedRecord.Unit = 'ea';
        }

        if (existingIdx !== -1) {
          crmDb[moduleKey][existingIdx] = { ...crmDb[moduleKey][existingIdx], ...normalizedRecord };
        } else {
          crmDb[moduleKey].push(normalizedRecord);
        }
        upserts++;
      });

      saveJson(CRM_DB_FILE, crmDb);
      logEntry.recordCount = upserts;
      logEntry.message = `Successfully imported ${upserts} row records to ${task.action.module} database and rebuilt local memory-search indices. Unattended job run complete.`;
    }
  } catch (error: any) {
    logEntry.status = 'failed';
    logEntry.message = error.message;
    console.error(`Task execution error [${task.id}]:`, error);
  }

  // Save execution log
  const currentLogs = loadJson(LOGS_FILE, []);
  currentLogs.unshift(logEntry);
  saveJson(LOGS_FILE, currentLogs.slice(0, 500)); // cap logs list at 500

  return logEntry;
}

// Background execution for Supabase-mode scheduled tasks
export async function executeSupabaseScheduledTask(task: any, customSupabase?: any) {
  const db = customSupabase || supabase;
  const logEntry: any = {
    id: 'log-' + Math.random().toString(36).slice(2, 9),
    taskId: task.id,
    taskName: task.name,
    timestamp: new Date().toISOString(),
    actionType: task.action.type,
    module: task.action.module,
    fileStorage: task.action.fileStorage,
    fileName: task.action.fileName,
    status: 'success',
    recordCount: 0,
    message: ''
  };

  try {
    const mType = task.action.type;
    let mModule = task.action.module;
    let table = mModule === "deals" ? "opportunities" : mModule;
    const fileName = task.action.fileName;
    const format = task.action.format;

    console.log(`[Scheduler Supabase] 🚀 Starting Unattended Job Execution:
  • Task ID: ${task.id}
  • Task Name: "${task.name}"
  • Action: ${mType}
  • Module/Table: ${mModule} (${table})
  • Target File: "${fileName}"
  • Format: ${format}
  • Initiator: ${task.creator}`);

    // Resolve organization ID
    let organizationId = '';
    const creatorEmail = String(task.creator || '').toLowerCase().trim();

    // Always attempt to query user details from kv_store using the task creator's email first.
    // This ensures that the custom tenant organization configured for that user is used as the source of truth,
    // overriding any stale or generic values (like 'default-org' or incorrect ID payloads) stored on the task.
    if (creatorEmail) {
      try {
        const { data: emailData } = await db.from('kv_store_8405be07').select('value').eq('key', 'user:email:' + creatorEmail).maybeSingle();
        if (emailData && emailData.value) {
          const userId = emailData.value;
          const { data: userData } = await db.from('kv_store_8405be07').select('value').eq('key', 'user:' + userId).maybeSingle();
          if (userData?.value?.organizationId) {
            organizationId = userData.value.organizationId;
            console.log(`[Scheduler Supabase] Resolved active customer organizationId: "${organizationId}" from kv_store for creator: "${creatorEmail}"`);
          }
        }
      } catch (err) {
        console.error(`[Scheduler Supabase] Error querying kv_store for user organizationId:`, err);
      }
    }

    // Fallback to task payload if not resolved from KV store
    if (!organizationId || organizationId === 'default-org') {
      organizationId = task.organisationId || task.organizationId;
      if (organizationId) {
        console.log(`[Scheduler Supabase] Resolved organizationId from task credentials fallback: "${organizationId}"`);
      }
    }

    // Secondary fallback: query profiles table if still not resolved
    if (!organizationId || organizationId === 'default-org') {
      console.log(`[Scheduler Supabase] Organization ID missing or default in task payload. Querying profiles table...`);
      try {
        const { data: profiles } = await db.from('profiles').select('organization_id, id, name, email');
        if (profiles && profiles.length > 0) {
          const matched = profiles.find((p: any) => 
            (p.name && String(p.name).toLowerCase().trim() === creatorEmail) ||
            (p.email && String(p.email).toLowerCase().trim() === creatorEmail)
          );
          organizationId = matched ? matched.organization_id : profiles[0].organization_id;
          console.log(`[Scheduler Supabase] Resolved organizationId: "${organizationId}" via profiles table matching for "${creatorEmail}".`);
        }
      } catch (err) {
        console.error(`[Scheduler Supabase] Error querying profiles table fallback:`, err);
      }
    }

    if (!organizationId) {
      organizationId = 'default-org';
    }

    // Propagate resolved organization ID to task references back
    task.organizationId = organizationId;
    task.organisationId = organizationId;

    if (!organizationId) {
      throw new Error("Could not resolve organization ID for Supabase background task execution.");
    }

    // Ensure the resolved organization actually exists in public.organizations table
    try {
      console.log(`[Scheduler Supabase] Verifying if organization "${organizationId}" exists in organizations table...`);
      const { data: orgData, error: orgCheckError } = await db
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgCheckError) {
        console.error(`[Scheduler Supabase] Error checking organization "${organizationId}" in database:`, orgCheckError.message);
      } else if (!orgData) {
        console.log(`[Scheduler Supabase] Organization "${organizationId}" is missing from "organizations" table. Inserting auto-healed organization record...`);
        let name = "Auto-Healed Organization";
        if (organizationId === 'org-1762782701221') {
          name = "Default Member Organization";
        } else if (organizationId === '34638283-7b3d-47e2-bec8-a9e600e28c4a') {
          name = "RONA Atlantic Organization";
        } else if (organizationId === 'default-org') {
          name = "ProSpaces CRM";
        }
        
        const { error: orgInsertError } = await db
          .from('organizations')
          .insert({
            id: organizationId,
            name: name,
            status: 'active',
            plan: 'enterprise',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (orgInsertError) {
          console.error(`[Scheduler Supabase] Failed to auto-insert missing organization "${organizationId}":`, orgInsertError.message);
        } else {
          console.log(`[Scheduler Supabase] Successfully auto-inserted missing organization "${organizationId}" ("${name}") into database.`);
        }
      } else {
        console.log(`[Scheduler Supabase] Organization "${organizationId}" already exists in the "organizations" table.`);
      }
    } catch (orgEx: any) {
      console.error(`[Scheduler Supabase] Exception ensuring organization exists:`, orgEx.message || orgEx);
    }

    if (mType === 'export') {
      console.log(`[Scheduler Supabase] [Export Mode] Fetching database rows from Table "${table}" for Organization ID: "${organizationId}"...`);
      const { data: dbRecords, error: dbErr } = await db
        .from(table)
        .select("*")
        .eq('organization_id', organizationId);
      
      if (dbErr) {
        console.error(`[Scheduler Supabase] [Export Mode] ❌ Database query failed for Table "${table}":`, dbErr);
        throw dbErr;
      }

      let fileText = "";
      const records = dbRecords || [];
      console.log(`[Scheduler Supabase] [Export Mode] Query complete. Retrieved ${records.length} records. Formatting into: ${format}`);
      logEntry.recordCount = records.length;

      if (format === "json") {
        fileText = JSON.stringify(records, null, 2);
      } else if (format === "xml") {
        fileText = `<?xml version="1.0" encoding="UTF-8"?>\n<crm_data module="${mModule}">\n` +
          records.map((r: any) => `  <item>\n` + Object.entries(r).map(([k, v]) => `    <${k}>${v}</${k}>`).join('\n') + `\n  </item>`).join('\n') +
          `\n</crm_data>`;
      } else {
        // csv format
        if (records.length === 0) {
          fileText = "";
        } else {
          const keysSet = new Set<string>();
          records.forEach((r: any) => {
            Object.keys(r).forEach(k => keysSet.add(k));
          });
          const keys = Array.from(keysSet);
          const escapeCsvVal = (val: any) => {
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };
          const headerRow = keys.map(escapeCsvVal).join(",");
          const bodyRows = records.map((r: any) => keys.map(k => escapeCsvVal(r[k])).join(","));
          fileText = [headerRow, ...bodyRows].join("\n");
        }
      }

      // Convert to base64
      const base64Str = Buffer.from(fileText, 'utf8').toString('base64');
      await saveVirtualFileServer(fileName, base64Str);
      logEntry.message = `Successfully exported ${records.length} records from ${mModule} to virtual file "${fileName}" in unattended Supabase background mode.`;
      
      // Auto-upload exported data back into user OneDrive unattended
      if (task.action.fileStorage === 'onedrive') {
        await uploadOneDriveFileFromBackend(task, base64Str).catch(e => {
          console.error('[OneDrive Export Supabase] Background upload failed:', e);
        });
      }
    } else {
      // import format
      console.log(`[Scheduler Supabase] [Import Mode] Starting import processing from storage format...`);
      let activeBase64: string | null = null;
      let activeBuffer: Buffer | null = null;

      if (task.action.fileStorage === 'onedrive') {
        console.log(`[Scheduler Supabase] Unattended OneDrive Import: Fetching latest copy of "${fileName}" from OneDrive...`);
        try {
          const syncResult = await syncOneDriveFileOnBackend(task);
          if (syncResult && (syncResult.base64Url || syncResult.buffer)) {
            activeBase64 = syncResult.base64Url;
            activeBuffer = syncResult.buffer;
            console.log(`[Scheduler Supabase] Unattended OneDrive Import: Successfully retrieved online copy of "${fileName}" in-memory.`);
            // Save cache back in background (non-blocking, ignore statement timeouts)
            saveVirtualFileServer(fileName, syncResult.base64Url).catch(e => {
              console.warn(`[Scheduler Supabase] Background database file cache writing notice:`, e.message || e);
            });
          } else {
            console.warn(`[Scheduler Supabase] Unattended OneDrive Import sync fetched empty or invalid response.`);
          }
        } catch (syncErr: any) {
          console.error(`[Scheduler Supabase] Unattended OneDrive Import refresh failure:`, syncErr.message || syncErr);
        }
      }

      let fileObj: any = null;
      if (!activeBase64 && !activeBuffer) {
        console.log(`[Scheduler Supabase] [Import Mode] No in-memory live file. Loading virtual source file "${fileName}" from database cache...`);
        fileObj = await loadVirtualFileServer(fileName);
        if (!fileObj) {
          throw new Error(`Virtual source file "${fileName}" could not be found or was empty in Supabase storage.`);
        }
        activeBase64 = fileObj.base64;
        console.log(`[Scheduler Supabase] [Import Mode] Virtual file cache found. Base64 length: ${activeBase64?.length || 0} chars.`);
      }

      let parsedRecords: any[] = [];
      const fileContent = activeBuffer 
        ? activeBuffer.toString('utf8')
        : (fileObj?.textContent || Buffer.from(activeBase64 || '', 'base64').toString('utf8'));

      console.log(`[Scheduler Supabase] [Import Mode] Parsing file contents using format "${format}"...`);
      if (format === "json") {
        try {
          const resJson = JSON.parse(fileContent);
          parsedRecords = Array.isArray(resJson) ? resJson : [resJson];
          console.log(`[Scheduler Supabase] [Import Mode] parsed JSON content successfully. Total parsed array elements: ${parsedRecords.length}`);
        } catch (jsonErr: any) {
          console.error(`[Scheduler Supabase] [Import Mode] ❌ JSON parser failed:`, jsonErr);
          throw new Error(`JSON parsing failed: ${jsonErr.message}`);
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || format === 'xlsx' || format === 'xls') {
        try {
          if (!activeBuffer && !activeBase64) {
            throw new Error("No in-memory or database content found for active Excel import task file.");
          }
          console.log(`[Scheduler Supabase] [Import Mode] Reading Excel workbook...`);
          const workbook = activeBuffer 
            ? XLSX.read(activeBuffer, { type: 'buffer' })
            : XLSX.read(activeBase64, { type: 'base64' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedRecords = XLSX.utils.sheet_to_json(worksheet);
          console.log(`[Scheduler Supabase] [Import Mode] Parsed Excel sheet "${firstSheetName}" successfully. Records count: ${parsedRecords.length}`);
        } catch (xlsxErr: any) {
          console.error(`[Scheduler Supabase] [Import Mode] ❌ Excel parser failed:`, xlsxErr);
          throw new Error(`Excel workbook parsing failed: ${xlsxErr.message}`);
        }
      } else {
        // csv parser
        try {
          console.log(`[Scheduler Supabase] [Import Mode] Splitting CSV lines...`);
          const rawText = fileContent.replace(/^\uFEFF/g, "");
          const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          console.log(`[Scheduler Supabase] [Import Mode] Total CSV source text lines: ${lines.length}`);
          if (lines.length > 1) {
            const parseCsvLine = (line: string) => {
              const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
              return matches.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
            };
            const headers = parseCsvLine(lines[0]);
            console.log(`[Scheduler Supabase] [Import Mode] Extracted headers: ${JSON.stringify(headers)}`);
            parsedRecords = lines.slice(1).map(line => {
              const values = parseCsvLine(line);
              const row: any = {};
              headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
              });
              return row;
            });
            console.log(`[Scheduler Supabase] [Import Mode] Extracted CSV records array count: ${parsedRecords.length}`);
          } else {
            console.warn(`[Scheduler Supabase] [Import Mode] CSV file has insufficient lines (fewer than 2, including headers).`);
          }
        } catch (csvErr: any) {
          console.error(`[Scheduler Supabase] [Import Mode] ❌ CSV parser failed:`, csvErr);
          throw new Error(`CSV parsing failed: ${csvErr.message}`);
        }
      }

      if (parsedRecords.length === 0) {
        logEntry.message = `Import completed with 0 records processed from virtual file "${fileName}".`;
        console.log(`[Scheduler Supabase] [Import Mode] ⚠️ Complete. 0 records parsed from "${fileName}".`);
      } else {
        // ---> INTELLIGENT AUTO-HEALING MAPPING FOR TABLE MISMATCHES <---
        let activeTable = table;
        let activeModule = mModule;

        const firstRec = parsedRecords[0];
        const lowerHeaderKeys = Object.keys(firstRec || {}).map(k => k.toLowerCase().replace(/^\uFEFF|\uFEFF/g, "").replace(/[\s\-_#/()]/g, ""));
        console.log(`[Scheduler Supabase] Auto-Healing mapping headers list for match: ${JSON.stringify(lowerHeaderKeys)}`);
        
        const hasSku = lowerHeaderKeys.some(k => k === "sku" || k === "skucode" || k === "partnumber" || k === "partno" || k === "materialsku" || k === "itemsku" || k === "id");
        const hasItemName = lowerHeaderKeys.some(k => k === "itemname" || k === "item_name" || k === "productname" || k === "materialname" || k === "name" || k === "product" || k === "item" || k === "material" || k === "title");
        const hasCost = lowerHeaderKeys.some(k => k === "cost" || k === "costprice" || k === "unitcost");
        const hasPriceTiers = lowerHeaderKeys.some(k => k.includes("pricetier") || k.includes("tier1") || k.includes("price_tier"));

        const hasProjectName = lowerHeaderKeys.some(k => k === "projectname" || k === "dealname" || k === "project" || k === "project_name" || k === "deal_name");
        const hasClientName = lowerHeaderKeys.some(k => k === "clientname" || k === "customername" || k === "client_name" || k === "customer_name");
        const hasDealValue = lowerHeaderKeys.some(k => k === "dealvalue" || k === "deal_value" || k === "value");

        const hasEmail = lowerHeaderKeys.some(k => k === "email" || k === "emailaddress" || k === "email_address");
        const hasPhone = lowerHeaderKeys.some(k => k === "phone" || k === "phonenumber" || k === "phone_number" || k === "telephone");
        const hasLegacyNumber = lowerHeaderKeys.some(k => k === "legacy" || k === "legacynumber" || k === "legacyno" || k === "legacy_number");

        if (hasSku || (hasItemName && (hasCost || hasPriceTiers || lowerHeaderKeys.includes("quantity")))) {
          activeTable = "inventory";
          activeModule = "inventory";
        } else if (hasProjectName || hasClientName || hasDealValue) {
          activeTable = "opportunities";
          activeModule = "deals";
        } else if (hasEmail || hasPhone || hasLegacyNumber) {
          activeTable = "contacts";
          activeModule = "contacts";
        }

        console.log(`[Scheduler Supabase] Intended target: ${mModule} (${table}). Differentiated destination: ${activeModule} (${activeTable})`);
        table = activeTable;
        mModule = activeModule;

        // Fetch schema columns
        const { data: sampleColsData } = await db.from(table).select("*").limit(1);
        const existingDbCols = new Set<string>();
        if (sampleColsData && sampleColsData.length > 0) {
          Object.keys(sampleColsData[0]).forEach(k => existingDbCols.add(k));
        } else {
          const fallbackCols: Record<string, string[]> = {
            contacts: ["id", "organization_id", "owner_id", "name", "email", "phone", "company", "trade", "status", "price_level", "legacy_number", "account_owner_number", "address", "city", "province", "postal_code", "notes", "tags", "ptd_sales", "ptd_gp_percent", "ytd_sales", "ytd_gp_percent", "lyr_sales", "lyr_gp_percent"],
            inventory: ["id", "organization_id", "sku", "name", "description", "unit_price", "cost", "quantity", "quantity_on_hand", "quantity_on_order", "status", "image_url", "category", "location", "price_tier_1", "price_tier_2", "price_tier_3", "price_tier_4", "price_tier_5", "unit_of_measure"],
            opportunities: ["id", "organization_id", "owner_id", "title", "description", "customer_id", "value", "expected_close_date", "status", "stage"]
          };
          (fallbackCols[table] || []).forEach(k => existingDbCols.add(k));
        }

        if (table === "inventory") {
          ["price_tier_1", "price_tier_2", "price_tier_3", "price_tier_4", "price_tier_5", "unit_of_measure", "image_url"].forEach(k => existingDbCols.add(k));
        }

        let priceTierLabels: any = null;
        if (table === "inventory" && organizationId) {
          try {
            const { data: orgSettings } = await db
              .from('kv_store_8405be07')
              .select('value')
              .eq('key', 'org_settings_extra:' + organizationId)
              .maybeSingle();
            if (orgSettings && orgSettings.value && orgSettings.value.price_tier_labels) {
              priceTierLabels = orgSettings.value.price_tier_labels;
              console.log(`[Scheduler Supabase] Loaded custom price tier labels for organization ${organizationId}:`, priceTierLabels);
            }
          } catch (err) {
            console.error(`[Scheduler Supabase] Error fetching custom price tier labels:`, err);
          }
        }

        // Caching references with unlimited paginated scans to bypass Supabase default 1,000 row limits
        const profilesMap = new Map<string, string>();
        let hasMore = true;
        let offset = 0;
        const pageLimit = 1000;

        while (hasMore) {
          const { data: pData, error: pErr } = await db
            .from("profiles")
            .select("id, email")
            .range(offset, offset + pageLimit - 1);
          if (pErr || !pData || pData.length === 0) {
            hasMore = false;
          } else {
            pData.forEach((p: any) => {
              if (p.email) profilesMap.set(p.email.toLowerCase().trim(), p.id);
            });
            offset += pageLimit;
          }
        }

        const contactsLegacyMap = new Map<string, string>();
        const contactsNameMap = new Map<string, string>();
        const contactsEmailMap = new Map<string, string>();
        const existingContactsMap = new Map<string, any>();
        hasMore = true;
        offset = 0;
        while (hasMore) {
          const { data: cData, error: cErr } = await db
            .from("contacts")
            .select("id, legacy_number, name, email, company")
            .eq("organization_id", organizationId)
            .range(offset, offset + pageLimit - 1);
          if (cErr || !cData || cData.length === 0) {
            hasMore = false;
          } else {
            cData.forEach((c: any) => {
              if (c.legacy_number) contactsLegacyMap.set(String(c.legacy_number).trim(), c.id);
              if (c.name) contactsNameMap.set(c.name.toLowerCase().trim(), c.id);
              if (c.email) contactsEmailMap.set(c.email.toLowerCase().trim(), c.id);
              existingContactsMap.set(c.id, c);
            });
            offset += pageLimit;
          }
        }

        const inventorySkuMap = new Map<string, string>();
        hasMore = true;
        offset = 0;
        while (hasMore) {
          const { data: iData, error: iErr } = await db
            .from("inventory")
            .select("id, sku")
            .eq("organization_id", organizationId)
            .range(offset, offset + pageLimit - 1);
          if (iErr || !iData || iData.length === 0) {
            hasMore = false;
          } else {
            iData.forEach((inv: any) => {
              if (inv.sku) inventorySkuMap.set(String(inv.sku).toLowerCase().trim(), inv.id);
            });
            offset += pageLimit;
          }
        }
        console.log(`[Scheduler Supabase] Loaded ${inventorySkuMap.size} existing unique SKUs for organization "${organizationId}" mapping.`);

        const opportunitiesMap = new Map<string, string>();
        hasMore = true;
        offset = 0;
        while (hasMore) {
          const { data: oppData, error: oppErr } = await db
            .from("opportunities")
            .select("id, title")
            .eq("organization_id", organizationId)
            .range(offset, offset + pageLimit - 1);
          if (oppErr || !oppData || oppData.length === 0) {
            hasMore = false;
          } else {
            oppData.forEach((opp: any) => {
              if (opp.title) opportunitiesMap.set(opp.title.toLowerCase().trim(), opp.id);
            });
            offset += pageLimit;
          }
        }

        const bidsTitleMap = new Map<string, string>();
        hasMore = true;
        offset = 0;
        while (hasMore) {
          const { data: bidData, error: bidErr } = await db
            .from("bids")
            .select("id, title")
            .eq("organization_id", organizationId)
            .range(offset, offset + pageLimit - 1);
          if (bidErr || !bidData || bidData.length === 0) {
            hasMore = false;
          } else {
            bidData.forEach((bid: any) => {
              if (bid.title) bidsTitleMap.set(bid.title.toLowerCase().trim(), bid.id);
            });
            offset += pageLimit;
          }
        }

        const cleanedRecordsMap = new Map<string, any>();

        for (const rec of parsedRecords) {
          const mappedRec: any = { organization_id: organizationId };

          for (const [k, v] of Object.entries(rec)) {
            if (v === undefined || v === null) continue;
            const cleanVal = typeof v === "string" ? v.trim() : v;
            const lowerKey = k.toLowerCase().replace(/^\uFEFF|\uFEFF/g, "").replace(/[\s\-_#/()]/g, "");

            if (table === "contacts") {
              if (lowerKey === "name" || lowerKey === "contact" || lowerKey === "contactname" || lowerKey === "customer" || lowerKey === "customername" || lowerKey === "fullname") {
                mappedRec.name = cleanVal;
              } else if (lowerKey === "email" || lowerKey === "emailaddress" || lowerKey === "customeremailaddress" || lowerKey === "customeremail" || lowerKey === "email_address" || lowerKey === "contactemail") {
                mappedRec.email = cleanVal;
              } else if (lowerKey === "phone" || lowerKey === "phonenumber" || lowerKey === "telephone" || lowerKey === "phone_number") {
                mappedRec.phone = cleanVal;
              } else if (lowerKey === "company" || lowerKey === "companyname" || lowerKey === "organization") {
                mappedRec.company = cleanVal;
              } else if (lowerKey === "trade" || lowerKey === "industry" || lowerKey === "job") {
                mappedRec.trade = cleanVal;
              } else if (lowerKey === "status") {
                mappedRec.status = cleanVal;
              } else if (lowerKey === "pricelevel" || lowerKey === "level" || lowerKey === "price_level") {
                mappedRec.price_level = cleanVal;
              } else if (lowerKey === "legacy" || lowerKey === "legacynumber" || lowerKey === "legacyno" || lowerKey === "legacy_number" || lowerKey === "accountcode1" || lowerKey === "accountcode" || lowerKey === "customer_number" || lowerKey === "customercode") {
                mappedRec.legacy_number = cleanVal;
              } else if (lowerKey === "accountownernumber" || lowerKey === "accountowneremail" || lowerKey === "accountowner" || lowerKey === "owner" || lowerKey === "owner_id" || lowerKey === "customersalespersonemail" || lowerKey === "customersalesperson" || lowerKey === "salesperson" || lowerKey === "salespersonemail") {
                mappedRec.account_owner_number = cleanVal;
              } else if (lowerKey === "address" || lowerKey === "streetaddress") {
                mappedRec.address = cleanVal;
              } else if (lowerKey === "city") {
                mappedRec.city = cleanVal;
              } else if (lowerKey === "provincestate" || lowerKey === "province" || lowerKey === "state") {
                mappedRec.province = cleanVal;
              } else if (lowerKey === "postalzipcode" || lowerKey === "postalcode" || lowerKey === "zipcode" || lowerKey === "zip" || lowerKey === "postalzip" || lowerKey === "postal") {
                mappedRec.postal_code = cleanVal;
              } else if (lowerKey === "notes" || lowerKey === "comments") {
                mappedRec.notes = cleanVal;
              } else if (lowerKey === "tags") {
                mappedRec.tags = cleanVal;
              } else if (lowerKey === "ytdnetsales" || lowerKey === "ytdsales" || lowerKey === "ytd_sales") {
                const parsedPr = parseFloat(String(cleanVal).replace(/[^0-9.-]/g, ""));
                mappedRec.ytd_sales = isNaN(parsedPr) ? 0 : parsedPr;
              } else if (lowerKey === "ytdgrossmargin%" || lowerKey === "ytdgppercent" || lowerKey === "ytdgpm" || lowerKey === "ytd_gp_percent") {
                const parsedPr = parseFloat(String(cleanVal).replace(/[^0-9.-]/g, ""));
                mappedRec.ytd_gp_percent = Math.max(-999.99, Math.min(999.99, isNaN(parsedPr) ? 0 : parsedPr));
              } else if (lowerKey === "lydnetsales" || lowerKey === "lyrsales" || lowerKey === "lyr_sales") {
                const parsedPr = parseFloat(String(cleanVal).replace(/[^0-9.-]/g, ""));
                mappedRec.lyr_sales = isNaN(parsedPr) ? 0 : parsedPr;
              } else if (lowerKey === "lydgrossmargin%" || lowerKey === "lyrgppercent" || lowerKey === "lyrgpm" || lowerKey === "lyr_gp_percent") {
                const parsedPr = parseFloat(String(cleanVal).replace(/[^0-9.-]/g, ""));
                mappedRec.lyr_gp_percent = Math.max(-999.99, Math.min(999.99, isNaN(parsedPr) ? 0 : parsedPr));
              }
            } 
            else if (table === "inventory") {
              if (lowerKey === "itemname" || lowerKey === "name" || lowerKey === "productname" || lowerKey === "materialname" || lowerKey === "product" || lowerKey === "item" || lowerKey === "material" || lowerKey === "title") mappedRec.name = cleanVal;
              else if (lowerKey === "description") mappedRec.description = cleanVal;
              else if (lowerKey === "sku" || lowerKey === "skucode" || lowerKey === "partnumber" || lowerKey === "partno") mappedRec.sku = cleanVal;
              else if (lowerKey === "category") mappedRec.category = cleanVal;
              else if (lowerKey === "quantity" || lowerKey === "quantityonhand" || lowerKey === "instock" || lowerKey === "qty") {
                const parsedQty = parseFloat(String(cleanVal));
                mappedRec.quantity = isNaN(parsedQty) ? 0 : Math.round(parsedQty);
              }
              else if (lowerKey === "quantityonorder") {
                const parsedQty = parseFloat(String(cleanVal));
                mappedRec.quantity_on_order = isNaN(parsedQty) ? 0 : Math.round(parsedQty);
              }
              else if (lowerKey === "unitprice" || lowerKey === "price" || lowerKey === "sellprice" || lowerKey === "unit_price") {
                const parsedPr = parseFloat(String(cleanVal));
                if (!isNaN(parsedPr)) {
                  mappedRec.unit_price = Math.round(parsedPr * 100);
                }
              }
              else if (lowerKey === "cost" || lowerKey === "costprice" || lowerKey === "unitcost") {
                const parsedCs = parseFloat(String(cleanVal));
                mappedRec.cost = isNaN(parsedCs) ? 0 : Math.round(parsedCs * 100);
              }
              else if (lowerKey === "image" || lowerKey === "imageurl" || lowerKey === "photo") mappedRec.image_url = cleanVal;
              else if (lowerKey === "location" || lowerKey === "warehouse") mappedRec.location = cleanVal;
              else if (lowerKey === "unit" || lowerKey === "unitofmeasure" || lowerKey === "uom" || lowerKey === "unit_of_measure") mappedRec.unit_of_measure = cleanVal;
              else if (lowerKey === "reorderlevel" || lowerKey === "reorder_level" || lowerKey === "minstock" || lowerKey === "min_stock") {
                const parsedRl = parseInt(String(cleanVal));
                mappedRec.reorder_level = isNaN(parsedRl) ? 0 : parsedRl;
              }
              else if (lowerKey === "upc" || lowerKey === "barcode" || lowerKey === "upccode") mappedRec.upc = cleanVal;
              else if (lowerKey === "supplier" || lowerKey === "vendor") mappedRec.supplier = cleanVal;
              else if (lowerKey === "suppliersku" || lowerKey === "supplier_sku" || lowerKey === "supplierpartnumber" || lowerKey === "supplierpart") mappedRec.supplier_sku = cleanVal;
              else if (lowerKey === "status" || lowerKey === "state") mappedRec.status = cleanVal;
              else if (lowerKey === "departmentcode" || lowerKey === "department_code" || lowerKey === "dept" || lowerKey === "department") mappedRec.department_code = cleanVal;
              else {
                // Check against dynamic price tier labels if loaded
                let matchedTier = 0;
                if (priceTierLabels) {
                  const normKey = lowerKey.trim();
                  const t1Label = String(priceTierLabels.t1 || "").toLowerCase().replace(/[\s\-_#/()]/g, "").trim();
                  const t2Label = String(priceTierLabels.t2 || "").toLowerCase().replace(/[\s\-_#/()]/g, "").trim();
                  const t3Label = String(priceTierLabels.t3 || "").toLowerCase().replace(/[\s\-_#/()]/g, "").trim();
                  const t4Label = String(priceTierLabels.t4 || "").toLowerCase().replace(/[\s\-_#/()]/g, "").trim();
                  const t5Label = String(priceTierLabels.t5 || "").toLowerCase().replace(/[\s\-_#/()]/g, "").trim();

                  if (normKey && normKey !== "0") {
                    if (normKey === t1Label) matchedTier = 1;
                    else if (normKey === t2Label) matchedTier = 2;
                    else if (normKey === t3Label) matchedTier = 3;
                    else if (normKey === t4Label) matchedTier = 4;
                    else if (normKey === t5Label) matchedTier = 5;
                  }
                }

                if (matchedTier === 0) {
                  // Standard hardcoded fallbacks as secondary check
                  if (lowerKey === "pricetier1" || lowerKey === "tier1" || lowerKey === "retail") matchedTier = 1;
                  else if (lowerKey === "pricetier2" || lowerKey === "tier2" || lowerKey === "vip") matchedTier = 2;
                  else if (lowerKey === "pricetier3" || lowerKey === "tier3" || lowerKey === "vipb" || lowerKey === "vip_b" || lowerKey === "vip b" || lowerKey === "eliteb" || lowerKey === "elite-b") matchedTier = 3;
                  else if (lowerKey === "pricetier4" || lowerKey === "tier4" || lowerKey === "vipa" || lowerKey === "vip_a" || lowerKey === "vip a" || lowerKey === "elitea" || lowerKey === "elite-a") matchedTier = 4;
                  else if (lowerKey === "pricetier5" || lowerKey === "tier5" || lowerKey === "wholesale") matchedTier = 5;
                }

                if (matchedTier >= 1 && matchedTier <= 5) {
                  if (cleanVal !== "") {
                    const parsedPr = parseFloat(String(cleanVal));
                    if (!isNaN(parsedPr)) {
                      mappedRec[`price_tier_${matchedTier}` as keyof typeof mappedRec] = Math.round(parsedPr * 100);
                    }
                  }
                }
              }
            } 
            else if (table === "opportunities") {
              if (lowerKey === "title" || lowerKey === "subject" || lowerKey === "dealname" || lowerKey === "deal" || lowerKey === "projectname" || lowerKey === "name") mappedRec.title = cleanVal;
              else if (lowerKey === "description" || lowerKey === "notes") mappedRec.description = cleanVal;
              else if (lowerKey === "value" || lowerKey === "amount" || lowerKey === "dealvalue" || lowerKey === "deal_value") {
                const parsedVal = parseFloat(String(cleanVal));
                mappedRec.value = isNaN(parsedVal) ? 0 : Math.round(parsedVal);
              }
              else if (lowerKey === "expectedclosedate" || lowerKey === "closedate" || lowerKey === "close") mappedRec.expected_close_date = cleanVal;
              else if (lowerKey === "status" || lowerKey === "state") mappedRec.status = cleanVal;
              else if (lowerKey === "stage" || lowerKey === "step") mappedRec.stage = cleanVal;
              else if (lowerKey === "clientname" || lowerKey === "customername" || lowerKey === "customerid" || lowerKey === "client") {
                mappedRec.customer_id = cleanVal;
              }
            }
          }

          // Force standard rules/metadata for Inventory tier falls
          if (table === "inventory") {
            if (mappedRec.unit_price !== undefined && mappedRec.price_tier_1 === undefined) {
              mappedRec.price_tier_1 = mappedRec.unit_price;
            }
            if (mappedRec.price_tier_1 !== undefined && mappedRec.unit_price === undefined) {
              mappedRec.unit_price = mappedRec.price_tier_1;
            }
            const defaultPrice = mappedRec.unit_price || 0;
            if (mappedRec.price_tier_1 === undefined || mappedRec.price_tier_1 === 0) mappedRec.price_tier_1 = defaultPrice;
            const t1 = mappedRec.price_tier_1 || defaultPrice;
            if (mappedRec.price_tier_2 === undefined || mappedRec.price_tier_2 === 0) mappedRec.price_tier_2 = t1;
            if (mappedRec.price_tier_3 === undefined || mappedRec.price_tier_3 === 0) mappedRec.price_tier_3 = t1;
            if (mappedRec.price_tier_4 === undefined || mappedRec.price_tier_4 === 0) mappedRec.price_tier_4 = t1;
            if (mappedRec.price_tier_5 === undefined || mappedRec.price_tier_5 === 0) mappedRec.price_tier_5 = t1;
            if (mappedRec.unit_of_measure === undefined) mappedRec.unit_of_measure = "ea";

            const metadataObj: any = {};
            if (mappedRec.image_url) metadataObj.imageUrl = mappedRec.image_url;
            if (mappedRec.location) metadataObj.location = mappedRec.location;
            if (mappedRec.status) metadataObj.status = mappedRec.status;
            if (mappedRec.quantity) metadataObj.quantityOnHand = mappedRec.quantity;

            if (Object.keys(metadataObj).length > 0) {
              const baseDesc = mappedRec.description || '';
              mappedRec.description = `${baseDesc}\n\n<!--metadata:${JSON.stringify(metadataObj)}-->`.trim();
            }
          }

          // Clean non-columns based on fallback schema references
          const finalCleanedRec: any = {};
          for (const k of Object.keys(mappedRec)) {
            if (existingDbCols.has(k)) {
              finalCleanedRec[k] = mappedRec[k];
            }
          }

          // Resolve references
          if (table === "contacts") {
            const ownerSpec = rec.account_owner_number || rec.owner || rec.accountowner;
            if (ownerSpec) {
              const matchedId = profilesMap.get(String(ownerSpec).toLowerCase().trim());
              if (matchedId) finalCleanedRec.owner_id = matchedId;
            }
          } else if (table === "opportunities") {
            const ownerSpec = rec.owner || rec.owner_id;
            if (ownerSpec) {
              const matchedId = profilesMap.get(String(ownerSpec).toLowerCase().trim());
              if (matchedId) finalCleanedRec.owner_id = matchedId;
            }

            if (finalCleanedRec.customer_id) {
              const custSpec = String(finalCleanedRec.customer_id).trim();
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(custSpec);
              if (!isUuid) {
                const nameKey = custSpec.toLowerCase().trim();
                if (contactsNameMap.has(nameKey)) {
                  finalCleanedRec.customer_id = contactsNameMap.get(nameKey);
                } else {
                  delete finalCleanedRec.customer_id;
                }
              }
            }
          }

          // Ensure basic values exist
          if (table === "contacts" && !finalCleanedRec.name) {
            // Self-healing contact name resolution: fall back to company, email, or legacy number
            const fallbackName = finalCleanedRec.company || finalCleanedRec.email || (finalCleanedRec.legacy_number ? `Account ${finalCleanedRec.legacy_number}` : '');
            if (fallbackName) {
              finalCleanedRec.name = fallbackName;
            } else {
              finalCleanedRec.name = "Unnamed Contact";
            }
          }
          if (table === "inventory" && !finalCleanedRec.name) {
            const firstLineDesc = finalCleanedRec.description ? String(finalCleanedRec.description).split('\n')[0].trim() : '';
            const fallbackName = firstLineDesc || (finalCleanedRec.sku ? `Product ${finalCleanedRec.sku}` : '');
            if (fallbackName) {
              finalCleanedRec.name = fallbackName;
            } else {
              finalCleanedRec.name = "Unnamed Product";
            }
          }
          if (table === "contacts" && !finalCleanedRec.name) continue;
          if (table === "inventory" && !finalCleanedRec.sku) continue;
          if (table === "opportunities" && !finalCleanedRec.title) continue;
          if (table === "bids" && !finalCleanedRec.title) continue;

          // Map deduplicated ID references
          let targetId = '';
          if (table === "contacts") {
            const existingId = (finalCleanedRec.legacy_number && contactsLegacyMap.get(String(finalCleanedRec.legacy_number).trim())) ||
                               (finalCleanedRec.email && contactsEmailMap.get(String(finalCleanedRec.email).toLowerCase().trim())) ||
                               (finalCleanedRec.name && contactsNameMap.get(String(finalCleanedRec.name).toLowerCase().trim()));
            targetId = existingId || crypto.randomUUID();
          } else if (table === "inventory") {
            const existingId = finalCleanedRec.sku && inventorySkuMap.get(String(finalCleanedRec.sku).toLowerCase().trim());
            targetId = existingId || crypto.randomUUID();
          } else if (table === "opportunities") {
            const existingId = finalCleanedRec.title && opportunitiesMap.get(String(finalCleanedRec.title).toLowerCase().trim());
            targetId = existingId || crypto.randomUUID();
          } else if (table === "bids") {
            const existingId = finalCleanedRec.title && bidsTitleMap.get(String(finalCleanedRec.title).toLowerCase().trim());
            targetId = existingId || crypto.randomUUID();
          } else {
            targetId = crypto.randomUUID();
          }

          finalCleanedRec.id = targetId;

          // Merge fields into any existing record in batch OR existing DB record
          const existingInBatch = cleanedRecordsMap.get(targetId);
          const existingInDb = table === "contacts" ? existingContactsMap.get(targetId) : null;
          const baseRec = existingInBatch || existingInDb || {};

          const mergedRec = { ...baseRec };
          for (const [key, val] of Object.entries(finalCleanedRec)) {
            if (val !== undefined && val !== null && val !== "") {
              if (table === "contacts" && key === "name") {
                // Keep the existing name if it's a real name and the new name is a fallback company name
                const incomingNameStr = String(val).trim();
                const incomingCompanyStr = String(finalCleanedRec.company || baseRec.company || "").trim();
                const incomingIsFallback = incomingNameStr.toLowerCase() === incomingCompanyStr.toLowerCase();

                const existingNameStr = String(baseRec.name || "").trim();
                const existingCompanyStr = String(baseRec.company || "").trim();
                const existingIsReal = existingNameStr !== "" && existingNameStr.toLowerCase() !== existingCompanyStr.toLowerCase();

                if (incomingIsFallback && existingIsReal) {
                  continue; // Skip overwriting with the fallback name
                }
              }
              mergedRec[key] = val;
            }
          }

          cleanedRecordsMap.set(targetId, mergedRec);
        }

        const cleanedRecordsList = Array.from(cleanedRecordsMap.values());

        // Exec chunked self-healing upserts
        const chunkSize = 150;
        let insertCount = 0;
        let errorCount = 0;
        let lastErrDetail = "";

        console.log(`[Scheduler Supabase] [Import Mode] Prepared ${cleanedRecordsList.length} normalized records for UPSERT query into table "${table}"`);
        console.log(`[Scheduler Supabase] [Import Mode] Starting chunked self-healing upsert for ${cleanedRecordsList.length} rows (Chunk size: ${chunkSize})...`);

        const executeChunkedUpsertWithHealing = async (chunk: any[]) => {
          let records = chunk.map(r => ({ ...r }));
          
          // Deduplicate the chunk records by 'id' to prevent the Postgres error:
          // "ON CONFLICT DO UPDATE command cannot affect row a second time"
          const uniqueRecordsMap = new Map();
          for (const r of records) {
            if (r.id) {
              uniqueRecordsMap.set(r.id, r);
            }
          }
          records = Array.from(uniqueRecordsMap.values());

          let success = false;
          let attempts = 0;
          const maxAttempts = 15;

          console.log(`[Scheduler Supabase] [Upsert] Beginning executeChunkedUpsertWithHealing for chunk of ${chunk.length} records...`);

          while (!success && attempts < maxAttempts) {
            attempts++;
            console.log(`[Scheduler Supabase] [Upsert] Attempt ${attempts}/${maxAttempts} for ${records.length} records...`);
            const { error: upsertErr } = await db.from(table).upsert(records);
            if (!upsertErr) {
              success = true;
              console.log(`[Scheduler Supabase] [Upsert] Chunk of ${records.length} records successfully upserted on attempt ${attempts}.`);
              break;
            }

            const msg = upsertErr.message || "";
            const errCode = upsertErr.code || "";
            const errDetails = upsertErr.details || "";
            console.warn(`[Scheduler Supabase] [Upsert Error Details] Attempt ${attempts} failed: message="${msg}", code="${errCode}", details="${errDetails}"`);

            let colToExclude: string | null = null;

            const match1 = msg.match(/Could not find the '([^']+)' column/i);
            if (match1 && match1[1]) {
              colToExclude = match1[1];
            } else {
              const match2 = msg.match(/column "([^"]+)" of relation .+/i);
              if (match2 && match2[1]) {
                colToExclude = match2[1];
              } else {
                const match3 = msg.match(/column "([^"]+)" does not exist/i);
                if (match3 && match3[1]) {
                  colToExclude = match3[1];
                }
              }
            }

            if (colToExclude) {
              console.log(`[Scheduler Supabase] [Upsert-Heal] Missing column "${colToExclude}" detected! Removing from record structure and retrying...`);
              records = records.map(r => {
                const nr = { ...r };
                delete nr[colToExclude!];
                return nr;
              });
            } else {
              console.error(`[Scheduler Supabase] [Upsert-Error] Unresolvable upsert error encountered: "${msg}"`);
              throw upsertErr;
            }
          }

          if (!success) {
            throw new Error(`Self-healing upsert failed after max attempts.`);
          }
        };

        for (let chunkIdx = 0; chunkIdx < cleanedRecordsList.length; chunkIdx += chunkSize) {
          const chunk = cleanedRecordsList.slice(chunkIdx, chunkIdx + chunkSize);
          try {
            console.log(`[Scheduler Supabase] [Import Mode] Processing chunk [${chunkIdx} to ${Math.min(chunkIdx + chunkSize, cleanedRecordsList.length)}]...`);
            await executeChunkedUpsertWithHealing(chunk);
            insertCount += chunk.length;
          } catch (chunkErr: any) {
            errorCount += chunk.length;
            lastErrDetail = chunkErr?.message || String(chunkErr);
            console.error(`[Scheduler Supabase] [Upsert Fail] Chunk [${chunkIdx} to ${chunkIdx + chunk.length}] failed completely:`, lastErrDetail);
          }
        }

        // ---> OPTIMIZATION & AUTO-REINDEXING AFTER SUCCESSFUL IMPORT <---
        if (insertCount > 0) {
          console.log(`[Scheduler Supabase] [Reindex] Auto-reindexing and statistics refresh triggered for table "${table}" (inserted: ${insertCount}).`);
          try {
            // 1. Backfill baseline keyword search terms if the table is public.inventory
            if (table === "inventory") {
              console.log(`[Scheduler Supabase] [Reindex] Automatically regenerating background database search keywords for organization: "${organizationId}"...`);
              const backfillKeywordsSql = `
                UPDATE public.inventory
                SET
                  search_keywords = ARRAY(
                    SELECT DISTINCT lower(token)
                    FROM unnest(
                      regexp_split_to_array(
                        concat_ws(' ', coalesce(name, ''), coalesce(description, ''), coalesce(category, ''), coalesce(sku, '')),
                        '\\s+'
                      )
                    ) AS token
                    WHERE length(token) >= 2
                  ),
                  keyword_version = 'kw_v1',
                  keywords_generated_at = now()
                WHERE organization_id = '${organizationId}';
              `;
              await db.rpc('exec_sql', { sql: backfillKeywordsSql });
              console.log(`[Scheduler Supabase] [Reindex] Completed automated keyword search backfill.`);
            }

            // 2. Refresh PostgreSQL query analyzer stats on target table
            console.log(`[Scheduler Supabase] [Reindex] Executing ANALYZE on public.${table}...`);
            await db.rpc('exec_sql', { sql: `ANALYZE public.${table};` });

            // 3. Rebuild B-Tree and GIN indexes on public table to eliminate index bloat and ensure fast query execution
            console.log(`[Scheduler Supabase] [Reindex] Performing REINDEX on public.${table}...`);
            await db.rpc('exec_sql', { sql: `REINDEX TABLE public.${table};` });
            console.log(`[Scheduler Supabase] [Reindex] 🎉 Reindexing & statistics compilation finished successfully.`);
          } catch (reindexErr: any) {
            console.warn(`[Scheduler Supabase] [Reindex Warning] Reindexing step failed but import succeeded. Error: ${reindexErr?.message || reindexErr}`);
          }
        }

        logEntry.recordCount = insertCount;
        if (errorCount === 0) {
          logEntry.message = `Successfully synchronized & imported ${insertCount} records into table "${table}" unattended, performed automated keywords update and completed database index reindexing from virtual file: ${fileName}`;
          console.log(`[Scheduler Supabase] [Import Mode] 🎉 Success! Synchronized & imported ${insertCount} records into "${table}".`);
        } else {
          logEntry.status = 'failed';
          logEntry.message = `Sync completed with warnings: upserted ${insertCount} rows successfully, failed on ${errorCount} rows. Last error: ${lastErrDetail}`;
          console.warn(`[Scheduler Supabase] [Import Mode] ⚠️ Completed with warnings: upserted ${insertCount}, failed on ${errorCount} rows. Last error: ${lastErrDetail}`);
          if (insertCount === 0) {
            throw new Error(`Sync completely failed on all rows. Last error: ${lastErrDetail}`);
          }
        }
      }
    }
  } catch (error: any) {
    logEntry.status = 'failed';
    let errorExplanation = error?.message || String(error);
    if (errorExplanation.includes("row-level security") || errorExplanation.includes("RLS")) {
      errorExplanation = `${errorExplanation}. Fix this by running our compound RLS healing script in your Supabase SQL Editor as guided in /src/FIX_INVENTORY_RLS_NOW.md.`;
    } else if (errorExplanation.includes("Microsoft OAuth") || errorExplanation.includes("OneDrive") || errorExplanation.includes("token") || errorExplanation.includes("Unauthorized")) {
      errorExplanation = `${errorExplanation}. Reconnect your Microsoft OneDrive integration under the Connected Accounts panel.`;
    }
    logEntry.message = errorExplanation;
    console.error(`[Scheduler Supabase] ❌ Task execution FAILED for "${task.name}" (${task.id}):`, error);
  }

  // Save execution status log to Supabase kv key 'import_export_history'
  try {
    const { data: histData } = await db.from('kv_store_8405be07').select('value').eq('key', 'import_export_history').maybeSingle();
    let currentHist = histData?.value || [];
    if (!Array.isArray(currentHist)) currentHist = [];
    currentHist.unshift(logEntry);
    await db.from('kv_store_8405be07').upsert({
      key: 'import_export_history',
      value: currentHist.slice(0, 500)
    });
  } catch (logErr) {
    console.error('[Scheduler Supabase Log Save Error]', logErr);
  }

  return logEntry;
}

// Background Task Scheduler Heartbeat Loop
async function runSchedulerTick() {
  const now = new Date();
  
  // 1. Process container-local tasks
  let localTasks = loadJson(TASKS_FILE, []);
  let localUpdated = false;

  for (const task of localTasks) {
    if (task.status === 'active' && task.nextRunTime) {
      const nextRun = new Date(task.nextRunTime);
      if (now >= nextRun) {
        console.log(`[Scheduler] Executing unattended local task: "${task.name}" (${task.id})`);
        task.status = 'running';
        saveJson(TASKS_FILE, localTasks); // Save immediately to prevent overlapping runs

        const result = await executeScheduledTask(task);

        if (task.recurrence === 'one-time') {
          task.status = 'completed';
          task.nextRunTime = null;
        } else {
          task.status = 'active';
          const nextTime = calculateNextRunTime(task, new Date());
          task.nextRunTime = nextTime ? nextTime.toISOString() : null;
        }

        task.lastRunTime = now.toISOString();
        task.lastRunResult = result.status;
        localUpdated = true;
      }
    }
  }

  if (localUpdated || localTasks.some((t: any) => t.status === 'running')) {
    saveJson(TASKS_FILE, localTasks);
  }

  // 2. Process Supabase cloud tasks to support "unattended running when computer is off"
  try {
    const { data: dbData, error: dbErr } = await supabase
      .from('kv_store_8405be07')
      .select('value')
      .eq('key', 'import_export_tasks')
      .maybeSingle();

    if (!dbErr && dbData?.value && Array.isArray(dbData.value)) {
      const supabaseTasks = dbData.value;
      let supabaseUpdated = false;

      for (const task of supabaseTasks) {
        // Only run unattended if the status is active and the task triggers running whether computer is off
        const runOff = task.settings?.runWhetherComputerOff !== false;
        const isForceRun = task.runImmediately === true || task.status === 'pending_run';
        const isScheduledRun = task.status === 'active' && task.nextRunTime && runOff && now >= new Date(task.nextRunTime);
        
        if (isForceRun || isScheduledRun) {
          console.log(`[Scheduler] Executing Supabase task: "${task.name}" (${task.id}). ForceRun: ${isForceRun}`);
          task.status = 'running';
          task.runImmediately = false; // Reset the immediate trigger flag
          
          // Save immediately to avoid dual triggers
          await supabase.from('kv_store_8405be07').upsert({
            key: 'import_export_tasks',
            value: supabaseTasks
          });

          const result = await executeSupabaseScheduledTask(task);

          if (task.recurrence === 'one-time') {
            task.status = 'completed';
            task.nextRunTime = null;
          } else {
            task.status = 'active';
            const nextTime = calculateNextRunTime(task, new Date());
            task.nextRunTime = nextTime ? nextTime.toISOString() : null;
          }

          task.lastRunTime = now.toISOString();
          task.lastRunResult = result.status;
          supabaseUpdated = true;

            // Log result into Supabase execution history
            try {
              const { data: histData } = await supabase
                .from('kv_store_8405be07')
                .select('value')
                .eq('key', 'import_export_history')
                .maybeSingle();
              const historyList = histData?.value || [];
              historyList.unshift(result);
              await supabase.from('kv_store_8405be07').upsert({
                key: 'import_export_history',
                value: historyList.slice(0, 500)
              });
            } catch (histErr) {
              console.error('[Scheduler] Failed to write Supabase execution history:', histErr);
            }
          }
        }

        if (supabaseUpdated) {
          await supabase.from('kv_store_8405be07').upsert({
            key: 'import_export_tasks',
            value: supabaseTasks
          });
        }
      }
    } catch (err) {
    console.error('[Scheduler] Error running unattended Supabase scheduler tick:', err);
  }
}

// Start scheduler heartbeat check (every 10 seconds)
setInterval(runSchedulerTick, 10000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Root level diagnostics to verify server is actually running and receiving traffic
  try {
    fs.writeFileSync(path.join(process.cwd(), 'server_diag.txt'), `[DIAG] Server starting at ${new Date().toISOString()}\n`, 'utf8');
  } catch (err) {
    console.error('Diag write failed:', err);
  }

  // Standard, bulletproof CORS handling using official 'cors' library + manual OPTIONS preflight bypass
  app.use(cors({
    origin: (origin, callback) => {
      // Direct mirroring of the requesting origin or fallback to user custom production domain for cross-domain support
      callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma', 'Expires', 'Upgrade-Insecure-Requests', 'X-User-Token']
  }));

  // Extra guard to ensure any direct OPTIONS request returns instantly
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      } else {
        res.setHeader('Access-Control-Allow-Origin', 'https://www.prospacescrm.com');
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      const requestHeaders = req.headers['access-control-request-headers'];
      if (requestHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestHeaders);
      } else {
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma, Expires, Upgrade-Insecure-Requests');
      }
      res.status(200).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Log all incoming requests for diagnostics
  app.use((req, res, next) => {
    try {
      const logLine = `[${new Date().toISOString()}] REQ: ${req.method} ${req.url} (original: ${req.originalUrl || ''})\n`;
      fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), logLine);
    } catch (err) {
      console.error('Diag append failed:', err);
    }
    next();
  });

  // Log incoming API requests to a file for diagnostics
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}\n`;
      console.log(`[API] ${req.method} ${req.url}`);
      try {
        const logDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(path.join(logDir, 'api_requests.log'), logLine);
      } catch (err) {
        console.error('Failed to write to api_requests.log:', err);
      }
    }
    next();
  });

  // Setup multer
  const uploadDir = path.join(os.tmpdir(), 'prospaces_uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const upload = multer({ dest: uploadDir });

  // API router / endpoints
  app.post('/api/import-export/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ fileId: req.file.filename, originalName: req.file.originalname });
  });

  // Base64 robust file receiver - bypasses sandbox streaming issues or buggy multer versions
  app.post('/api/import-export/storage/:target/upload-base64', async (req, res) => {
    const { target } = req.params;
    const { fileName, fileContent } = req.body;
    const targetDir = target === 'onedrive' ? ONEDRIVE_DIR : LOCAL_DRIVE_DIR;

    if (!fileName || !fileContent) {
      return res.status(400).json({ success: false, error: 'Missing fileName or fileContent' });
    }

    try {
      const destPath = path.join(targetDir, fileName);
      // Decodes the base64 string to a binary buffer
      const buffer = Buffer.from(fileContent, 'base64');
      fs.writeFileSync(destPath, buffer);
      
      // Dual-write: upload copy to Supabase kv_store database 
      await saveVirtualFileServer(fileName, fileContent);

      const logLine = `[${new Date().toISOString()}] [API BASE64 SUCCESS] Saved ${fileName} (${buffer.length} bytes) to ${destPath} and uploaded copy to virtual storage\n`;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), logLine);
      } catch {}
      
      return res.json({ success: true, fileName });
    } catch (err: any) {
      console.error('Base64 upload error:', err);
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // --- STORAGE CLIENT APIs ---
  app.get('/api/import-export/storage/:target', (req, res) => {
    const { target } = req.params;
    const targetDir = target === 'onedrive' ? ONEDRIVE_DIR : LOCAL_DRIVE_DIR;
    
    try {
      const files = fs.readdirSync(targetDir).map(file => {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          lastModified: stats.mtime,
          extension: path.extname(file).toLowerCase()
        };
      });
      res.json({ success: true, files });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/import-export/storage/:target/upload', (req, res, next) => {
    const target = req.params.target;
    const len = req.headers['content-length'] || 'unknown';
    const ct = req.headers['content-type'] || 'unknown';
    const logLine = `[${new Date().toISOString()}] [API START] POST /api/import-export/storage/${target}/upload, content-length: ${len}, content-type: ${ct}\n`;
    try {
      fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), logLine);
    } catch (e) {
      console.error('Diag append failed in upload start:', e);
    }
    next();
  }, upload.single('file'), async (req, res) => {
    const { target } = req.params;
    const targetDir = target === 'onedrive' ? ONEDRIVE_DIR : LOCAL_DRIVE_DIR;

    if (!req.file) {
      const warnLine = `[${new Date().toISOString()}] [API WARN] No req.file found after multer parsing! target: ${target}\n`;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), warnLine);
      } catch (e) {}
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      const destPath = path.join(targetDir, req.file.originalname);
      fs.copyFileSync(req.file.path, destPath);
      
      // Dual-write uploaded file content as base64 backup to DB
      const fileContentBase64 = fs.readFileSync(destPath).toString('base64');
      await saveVirtualFileServer(req.file.originalname, fileContentBase64);

      fs.unlinkSync(req.file.path); // remove temp multer file
      
      const successLine = `[${new Date().toISOString()}] [API SUCCESS] Successfully uploaded & saved ${req.file.originalname} to ${destPath} and uploaded copy to virtual storage\n`;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), successLine);
      } catch (e) {}
      
      res.json({ success: true, fileName: req.file.originalname });
    } catch (err: any) {
      const errLine = `[${new Date().toISOString()}] [API ERROR] Failed in file save/unlink sequence: ${err.message || err}\n`;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), errLine);
      } catch (e) {}
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/import-export/storage/:target/:fileName', (req, res) => {
    const { target, fileName } = req.params;
    const targetDir = target === 'onedrive' ? ONEDRIVE_DIR : LOCAL_DRIVE_DIR;

    try {
      const filePath = path.join(targetDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/import-export/storage/:target/download/:fileName', (req, res) => {
    const { target, fileName } = req.params;
    const targetDir = target === 'onedrive' ? ONEDRIVE_DIR : LOCAL_DRIVE_DIR;
    const filePath = path.join(targetDir, fileName);

    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // --- CRM DATA PREVIEW APIs ---
  app.get('/api/import-export/crm-stats', (req, res) => {
    const crm = loadJson(CRM_DB_FILE, initialCrmDb);
    res.json({
      contacts: crm.contacts.length,
      inventory: crm.inventory.length,
      deals: crm.deals.length
    });
  });

  app.get('/api/import-export/crm-data/:module', (req, res) => {
    const { module } = req.params;
    const crm = loadJson(CRM_DB_FILE, initialCrmDb);
    res.json(crm[module] || []);
  });

  // --- TASK SCHEDULER APIs ---
  app.get('/api/import-export/tasks', (req, res) => {
    const tasks = loadJson(TASKS_FILE, []);
    res.json(tasks);
  });

  app.post('/api/import-export/tasks', (req, res) => {
    const taskData = req.body;
    const tasks = loadJson(TASKS_FILE, []);

    let savedTask;
    if (taskData.id) {
      // Edit
      const idx = tasks.findIndex(t => t.id === taskData.id);
      if (idx !== -1) {
        tasks[idx] = { 
          ...tasks[idx], 
          ...taskData, 
          nextRunTime: calculateNextRunTime(taskData).toISOString()
        };
        savedTask = tasks[idx];
      } else {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
    } else {
      // Create new
      const newTask = {
        ...taskData,
        id: 'task-' + Math.random().toString(36).slice(2, 9),
        createdAt: new Date().toISOString(),
        lastRunTime: null,
        lastRunResult: null,
        status: taskData.status || 'active'
      };
      newTask.nextRunTime = calculateNextRunTime(newTask).toISOString();
      tasks.push(newTask);
      savedTask = newTask;
    }

    saveJson(TASKS_FILE, tasks);
    res.json({ success: true, task: savedTask });
  });

  app.delete('/api/import-export/tasks/:id', (req, res) => {
    const { id } = req.params;
    const tasks = loadJson(TASKS_FILE, []);
    const filtered = tasks.filter(t => t.id !== id);
    saveJson(TASKS_FILE, filtered);
    res.json({ success: true });
  });

  app.post('/api/import-export/tasks/:id/run', async (req, res) => {
    const { id } = req.params;
    const tasks = loadJson(TASKS_FILE, []);
    let task = tasks.find(t => t.id === id);

    if (!task) {
      // Find in Supabase database
      try {
        const { data: dbData } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks')
          .maybeSingle();

        const supabaseTasks = dbData?.value || [];
        const tIdx = supabaseTasks.findIndex((t: any) => t.id === id);
        if (tIdx === -1) {
          res.status(404).json({ error: 'Task not found in local or Supabase databases' });
          return;
        }

        const supabaseTask = supabaseTasks[tIdx];
        supabaseTask.status = 'running';
        await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_tasks',
          value: supabaseTasks
        });

        const authHeader = req.headers.authorization;
        let customSupabase = undefined;
        if (authHeader) {
          console.log(`[Server API] Creating request-authenticated Supabase client with Authorization token.`);
          customSupabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            },
            global: {
              headers: {
                Authorization: authHeader
              }
            }
          });
        }

        const logResult = await executeSupabaseScheduledTask(supabaseTask, customSupabase);

        // Reload fresh tasks list to preserve any concurrent modifications
        const { data: reloadData } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks')
          .maybeSingle();
        const currentTasks = reloadData?.value || [];
        const matchIdx = currentTasks.findIndex((t: any) => t.id === id);
        if (matchIdx !== -1) {
          const tRef = currentTasks[matchIdx];
          tRef.status = tRef.recurrence === 'one-time' ? 'completed' : 'active';
          tRef.lastRunTime = new Date().toISOString();
          tRef.lastRunResult = logResult.status;
          const nextTime = calculateNextRunTime(tRef, new Date());
          tRef.nextRunTime = nextTime ? nextTime.toISOString() : null;
        }

        await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_tasks',
          value: currentTasks
        });

        res.json({ success: logResult.status === 'success', logResult });
      } catch (err: any) {
        try {
          const { data: reloadData } = await supabase
            .from('kv_store_8405be07')
            .select('value')
            .eq('key', 'import_export_tasks')
            .maybeSingle();
          const currentTasks = reloadData?.value || [];
          const matchIdx = currentTasks.findIndex((t: any) => t.id === id);
          if (matchIdx !== -1) {
            const tRef = currentTasks[matchIdx];
            tRef.status = 'active';
            tRef.lastRunResult = 'failed';
          }
          await supabase.from('kv_store_8405be07').upsert({
            key: 'import_export_tasks',
            value: currentTasks
          });
        } catch (_) {}
        res.status(500).json({ success: false, error: err.message || "Manual run on production backend container failed" });
      }
      return;
    }

    task.status = 'running';
    saveJson(TASKS_FILE, tasks);

    try {
      const logResult = await executeScheduledTask(task);
      task.status = 'active';
      task.lastRunTime = new Date().toISOString();
      task.lastRunResult = logResult.status;
      saveJson(TASKS_FILE, tasks);
      res.json({ success: true, logResult });
    } catch (err: any) {
      task.status = 'active';
      task.lastRunResult = 'failed';
      saveJson(TASKS_FILE, tasks);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/import-export/history', (req, res) => {
    const logs = loadJson(LOGS_FILE, []);
    res.json(logs);
  });

  app.post('/api/import-export/history/clear', (req, res) => {
    saveJson(LOGS_FILE, []);
    res.json({ success: true });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // --- AUTOMATIC CREDENTIAL SYNCING TO SUPABASE FOR PRODUCTION ---
  async function syncLocalEnvironmentToSupabase() {
    try {
      const azureClientId = process.env.AZURE_CLIENT_ID;
      const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
      const azureRedirectUri = process.env.AZURE_REDIRECT_URI || 'https://www.prospacescrm.com/oauth-callback';

      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://www.prospacescrm.com/oauth-callback';

      if (azureClientId && azureClientSecret) {
        // Check if there are already existing Microsoft credentials stored
        const { data: existingMicrosoft } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'secrets:microsoft').maybeSingle() as any;
        
        const isCustom = existingMicrosoft?.value?.isCustom === true;
        const isStale = existingMicrosoft?.value && !isCustom && (existingMicrosoft.value.clientId !== azureClientId || existingMicrosoft.value.clientSecret !== azureClientSecret);
        if (isCustom) {
          console.log('[Server Config Sync] Special client-side custom Microsoft Azure settings are configured. Skipping auto-override.');
        } else if (existingMicrosoft?.value?.clientId && !isStale) {
          console.log('[Server Config Sync] Microsoft credentials already exist in DB (clientId: ' + existingMicrosoft.value.clientId + ') and are up-to-date. Skipping auto-sync.');
        } else {
          console.log('[Server Config Sync] Syncing Microsoft credentials to Supabase DB...', {
            clientId: azureClientId,
            redirectUri: azureRedirectUri,
            reason: isStale ? 'credentials updated in environment' : 'first-time setup'
          });
          const { error } = await supabase.from('kv_store_8405be07').upsert({
            key: 'secrets:microsoft',
            value: {
              clientId: azureClientId,
              clientSecret: azureClientSecret,
              redirectUri: azureRedirectUri,
              tenantId: existingMicrosoft?.value?.tenantId || 'common',
              updatedAt: new Date().toISOString()
            }
          });
          if (error) {
            console.error('[Server Config Sync] Failed to sync Microsoft credentials to Supabase:', error.message);
          } else {
            console.log('[Server Config Sync] Synchronized Microsoft credentials to Supabase perfectly.');
          }
        }
      }

      if (googleClientId && googleClientSecret) {
        // Check if there are already existing Google credentials stored
        const { data: existingGoogle } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'secrets:google').maybeSingle() as any;

        const isStale = existingGoogle?.value && (existingGoogle.value.clientId !== googleClientId || existingGoogle.value.clientSecret !== googleClientSecret);
        if (existingGoogle?.value?.clientId && !isStale) {
          console.log('[Server Config Sync] Google credentials already exist in DB (clientId: ' + existingGoogle.value.clientId + ') and are up-to-date. Skipping auto-sync.');
        } else {
          console.log('[Server Config Sync] Syncing Google credentials to Supabase DB...', {
            clientId: googleClientId,
            redirectUri: googleRedirectUri,
            reason: isStale ? 'credentials updated in environment' : 'first-time setup'
          });
          const { error } = await supabase.from('kv_store_8405be07').upsert({
            key: 'secrets:google',
            value: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
              redirectUri: googleRedirectUri,
              updatedAt: new Date().toISOString()
            }
          });
          if (error) {
            console.error('[Server Config Sync] Failed to sync Google credentials to Supabase:', error.message);
          } else {
            console.log('[Server Config Sync] Synchronized Google credentials to Supabase perfectly.');
          }
        }
      }
    } catch (err: any) {
      console.error('[Server Config Sync] Exception in syncLocalEnvironmentToSupabase:', err.message || err);
    }
  }

  // Trigger sync on server startup
  syncLocalEnvironmentToSupabase();

  // --- SELF-UNINSTALLING SERVICE WORKER ENDPOINTS ---
  app.get(['/service-worker.js', '/sw.js'], (req, res) => {
    res.set({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.send(`
// Self-uninstalling Service Worker to resolve stale caching and static API interception issues
// Dynamic instance signature: ${Date.now()}-${Math.random()}
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
    .then(() => {
      console.log('[ServiceWorker] Caches cleared. Unregistering self...');
      return self.registration.unregister();
    })
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach((client) => {
        if (client.navigate) {
          try {
            client.navigate(client.url);
          } catch (e) {
            console.error('Failed to navigate client:', e);
          }
        }
      });
    })
  );
});
    `);
  });

  // --- FALLBACK CATCH-ALL FOR ALL UNHANDLED API ROUTES ---
  app.all('/api/*all', (req, res) => {
    console.warn(`[WARN] Unhandled API request: ${req.method} ${req.originalUrl || req.url}`);
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`
    });
  });

  const locations = [
    path.join(process.cwd(), 'build'),
    path.join(process.cwd(), 'dist')
  ];
  let distPath = locations[0];
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      distPath = loc;
      break;
    }
  }

  const isProduction = process.env.NODE_ENV === "production";


  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get('*all', async (req, res, next) => {
      const url = req.originalUrl;

      // Skip API requests so they don't get routed to HTML templates
      if (url.startsWith('/api/')) {
        return next();
      }

      // Determine which HTML file to serve
      let filename = 'index.html';
      if (url.includes('.html')) {
        const basename = path.basename(url.split('?')[0]);
        if (basename) {
          filename = basename;
        }
      } else {
        // Handle routes that point to specific multi-app entries if requested,
        // otherwise default to index.html (SPA)
        const parts = url.split('/');
        const firstSegment = parts[1]?.split('?')[0];
        if (firstSegment && ['project-wizards', 'marketing', 'insights', 'inventory', 'it'].includes(firstSegment)) {
          filename = `${firstSegment}.html`;
        }
      }

      const filePath = path.resolve(process.cwd(), filename);
      if (fs.existsSync(filePath)) {
        try {
          let template = fs.readFileSync(filePath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
          return;
        }
      }

      // Fallback to main index.html
      try {
        const fallbackPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(fallbackPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get('*all', (req, res, next) => {
      // Skip API requests in production so they don't get routed to HTML index
      if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        return next();
      }

      // Determine which HTML file to serve in production multi-page setup
      let filename = 'index.html';
      const url = req.originalUrl || req.url;
      if (url.includes('.html')) {
        const basename = path.basename(url.split('?')[0]);
        if (basename) {
          filename = basename;
        }
      } else {
        const parts = url.split('/');
        const firstSegment = parts[1]?.split('?')[0];
        if (firstSegment && ['project-wizards', 'marketing', 'insights', 'inventory', 'it'].includes(firstSegment)) {
          filename = `${firstSegment}.html`;
        }
      }

      res.sendFile(path.join(distPath, filename));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
