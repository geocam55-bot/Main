import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

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
    } else if (task.action.type === 'import') {
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
        const rawText = fs.readFileSync(filePath, 'utf8');
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

      // Upsert records in local crm database
      const moduleKey = task.action.module;
      if (!crmDb[moduleKey]) crmDb[moduleKey] = [];

      let upserts = 0;
      importedRecords.forEach((item: any) => {
        // Find by identifiers e.g. Email for contacts, SKU for inventory, ProjectName for deals
        let existingIdx = -1;
        if (moduleKey === 'contacts') {
          existingIdx = crmDb.contacts.findIndex((c: any) => c.Email?.toLowerCase() === item.Email?.toLowerCase() || c.Name === item.Name);
        } else if (moduleKey === 'inventory') {
          existingIdx = crmDb.inventory.findIndex((i: any) => i.SKU === item.SKU);
        } else if (moduleKey === 'deals') {
          existingIdx = crmDb.deals.findIndex((d: any) => d.ProjectName === item.ProjectName);
        }

        const normalizedRecord: any = { id: item.id || 'seed-' + Math.random().toString(36).slice(2, 6) };
        Object.entries(item).forEach(([k, v]) => {
          // Normalize spreadsheet column titles
          let key = k;
          const lowerK = k.toLowerCase();
          if (lowerK === 'item name' || lowerK === 'itemname') key = 'Name';
          else if (lowerK === 'unit price' || lowerK === 'unitprice') key = 'UnitPrice';
          else if (lowerK === 'client name' || lowerK === 'clientname') key = 'ClientName';
          else if (lowerK === 'project name' || lowerK === 'projectname') key = 'ProjectName';
          else if (lowerK === 'deal value' || lowerK === 'dealvalue') key = 'DealValue';
          else if (lowerK === 'close date' || lowerK === 'closedate') key = 'CloseDate';
          else if (lowerK === 'pricetier1' || lowerK === 'price_tier_1' || lowerK === 'tier1') key = 'PriceTier1';
          else if (lowerK === 'pricetier2' || lowerK === 'price_tier_2' || lowerK === 'tier2') key = 'PriceTier2';
          else if (lowerK === 'pricetier3' || lowerK === 'price_tier_3' || lowerK === 'tier3') key = 'PriceTier3';
          else if (lowerK === 'pricetier4' || lowerK === 'price_tier_4' || lowerK === 'tier4') key = 'PriceTier4';
          else if (lowerK === 'pricetier5' || lowerK === 'price_tier_5' || lowerK === 'tier5') key = 'PriceTier5';
          else if (lowerK === 'unit' || lowerK === 'unitofmeasure' || lowerK === 'unit_of_measure' || lowerK === 'uom') key = 'Unit';
          normalizedRecord[key] = v;
        });

        if (moduleKey === 'inventory') {
          if (normalizedRecord.UnitPrice !== undefined && normalizedRecord.PriceTier1 === undefined) {
            normalizedRecord.PriceTier1 = Number(normalizedRecord.UnitPrice);
          }
          if (normalizedRecord.PriceTier1 !== undefined && normalizedRecord.UnitPrice === undefined) {
            normalizedRecord.UnitPrice = Number(normalizedRecord.PriceTier1);
          }
          const defaultPrice = normalizedRecord.UnitPrice !== undefined ? Number(normalizedRecord.UnitPrice) : 0;
          if (normalizedRecord.PriceTier1 === undefined) normalizedRecord.PriceTier1 = defaultPrice;
          if (normalizedRecord.PriceTier2 === undefined) normalizedRecord.PriceTier2 = normalizedRecord.PriceTier1;
          if (normalizedRecord.PriceTier3 === undefined) normalizedRecord.PriceTier3 = normalizedRecord.PriceTier1;
          if (normalizedRecord.PriceTier4 === undefined) normalizedRecord.PriceTier4 = normalizedRecord.PriceTier1;
          if (normalizedRecord.PriceTier5 === undefined) normalizedRecord.PriceTier5 = normalizedRecord.PriceTier1;
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
      logEntry.message = `Successfully imported ${upserts} row records to ${task.action.module} database. Unattended job run complete.`;
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

// Background Task Scheduler Heartbeat Loop
async function runSchedulerTick() {
  const tasks = loadJson(TASKS_FILE, []);
  const now = new Date();
  let updated = false;

  for (const task of tasks) {
    if (task.status === 'active' && task.nextRunTime) {
      const nextRun = new Date(task.nextRunTime);
      if (now >= nextRun) {
        console.log(`[Scheduler] Executing unattended task: "${task.name}" (${task.id})`);
        task.status = 'running';
        saveJson(TASKS_FILE, tasks); // Save immediately to prevent overlapping runs

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
        updated = true;
      }
    }
  }

  if (updated || tasks.some(t => t.status === 'running')) {
    // If we updated tasks, persist them
    saveJson(TASKS_FILE, tasks);
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

  // Highly robust custom CORS middleware supporting dynamic origin and header replication with diagnostics logging
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    
    // Dynamically replicate any headers requested by preflight OPTIONS to bypass CORS blocks on custom headers
    const requestHeaders = req.headers['access-control-request-headers'];
    if (requestHeaders) {
      res.setHeader('Access-Control-Allow-Headers', requestHeaders);
    } else {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma, Expires');
    }

    // Handle OPTIONS requests preflight immediately with a clean 200 success response
    if (req.method === 'OPTIONS') {
      try {
        const logLine = `[${new Date().toISOString()}] [CORS OPTIONS PREFLIGHT] Origin: ${origin || 'none'}, Headers: ${requestHeaders || 'none'}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'server_diag.txt'), logLine);
      } catch (err) {}
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
    const task = tasks.find(t => t.id === id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
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
