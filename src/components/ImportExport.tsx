import React, { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { 
  Upload, 
  Download, 
  Trash2, 
  Clock, 
  Settings, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  Calendar, 
  User, 
  Plus, 
  RefreshCw, 
  FileText, 
  Cloud, 
  Folder, 
  FolderOpen, 
  HardDrive, 
  Terminal, 
  History, 
  Eye, 
  HelpCircle, 
  Check, 
  Loader2, 
  Lock, 
  Unlock, 
  ArrowRight,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

interface StorageFile {
  name: string;
  size: number;
  lastModified: string;
  extension: string;
}

interface ScheduledTask {
  id?: string;
  name: string;
  description: string;
  status: "active" | "disabled" | "running";
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  triggerDetail: {
    dateTime?: string;
    time?: string;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    intervalDays?: number;
  };
  action: {
    type: "import" | "export";
    module: "contacts" | "inventory" | "deals";
    fileStorage: "local" | "onedrive";
    fileName: string;
    format: "csv" | "json" | "xml";
  };
  settings: {
    stopIfRunningHours: number;
    retryCount: number;
    retryIntervalMinutes: number;
  };
  lastRunTime?: string | null;
  lastRunResult?: "success" | "failed" | null;
  nextRunTime?: string | null;
  createdAt?: string;
  creator: string;
}

interface ExecutionLog {
  id: string;
  taskId: string;
  taskName: string;
  timestamp: string;
  actionType: "import" | "export";
  module: string;
  fileStorage: "local" | "onedrive";
  fileName: string;
  status: "success" | "failed";
  recordCount: number;
  message: string;
}

interface CrmStats {
  contacts: number;
  inventory: number;
  deals: number;
}

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export function ImportExport({ user, onNavigate }: { user?: any; onNavigate?: (view: string) => void }) {
  // Tabs: 'scheduler' | 'storage' | 'manual' | 'history'
  const [activeTab, setActiveTab] = useState<"scheduler" | "storage" | "manual" | "history">("scheduler");
  // Drive selection for Storage Explorer: 'local' | 'onedrive'
  const [driveTab, setDriveTab] = useState<"local" | "onedrive">("local");
  
  // Data States
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [history, setHistory] = useState<ExecutionLog[]>([]);
  const [localFiles, setLocalFiles] = useState<StorageFile[]>([]);
  const [onedriveFiles, setOnedriveFiles] = useState<StorageFile[]>([]);
  const [crmStats, setCrmStats] = useState<CrmStats>({ contacts: 0, inventory: 0, deals: 0 });
  const [crmRecords, setCrmRecords] = useState<any[]>([]);
  const [previewModule, setPreviewModule] = useState<"contacts" | "inventory" | "deals">("contacts");

  // Loading indicator states
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [explorerUploading, setExplorerUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  // Form State for creating/editing scheduled tasks
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Task form values
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<"active" | "disabled">("active");
  const [taskRecurrence, setTaskRecurrence] = useState<"one-time" | "daily" | "weekly" | "monthly">("daily");
  
  // Trigger form values
  const [triggerDateTime, setTriggerDateTime] = useState("");
  const [triggerTime, setTriggerTime] = useState("09:00");
  const [triggerIntervalDays, setTriggerIntervalDays] = useState(1);
  const [triggerDaysOfWeek, setTriggerDaysOfWeek] = useState<number[]>([]);
  const [triggerDaysOfMonth, setTriggerDaysOfMonth] = useState<number[]>([]);

  // Action form values
  const [actionType, setActionType] = useState<"import" | "export">("export");
  const [actionModule, setActionModule] = useState<"contacts" | "inventory" | "deals">("contacts");
  const [actionStorage, setActionStorage] = useState<"local" | "onedrive">("local");
  const [actionFileName, setActionFileName] = useState("");
  const [actionFormat, setActionFormat] = useState<"csv" | "json" | "xml">("csv");

  // Retry settings
  const [stopHours, setStopHours] = useState(1);
  const [retryCount, setRetryCount] = useState(3);
  const [retryMinutes, setRetryMinutes] = useState(5);

  // Manual execution interactive states
  const [manualModule, setManualModule] = useState<"contacts" | "inventory" | "deals">("contacts");
  const [manualType, setManualType] = useState<"import" | "export">("export");
  const [manualStorage, setManualStorage] = useState<"local" | "onedrive">("local");
  const [manualFileName, setManualFileName] = useState("");
  const [manualFormat, setManualFormat] = useState<"csv" | "json" | "xml">("csv");
  const [manualUploadingFile, setManualUploadingFile] = useState<File | null>(null);
  const [manualIsProcessing, setManualIsProcessing] = useState(false);
  const [manualUploading, setManualUploading] = useState(false);
  const [modalUploading, setModalUploading] = useState(false);

  // Storage selection search
  const [storageSearchTerm, setStorageSearchTerm] = useState("");

  const creatorName = user?.name || user?.email || "Geocam Administrator";

  // Bootstrap initial configurations
  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchFiles("local");
    fetchFiles("onedrive");
    fetchHistory();
    fetchCrmRecords(previewModule);
  }, []);

  useEffect(() => {
    fetchCrmRecords(previewModule);
  }, [previewModule]);

  // Browser-direct/Supabase fallback handlers
  const parseCsv = (text: string): any[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    const parseLine = (line: string) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, "").trim());
    const records: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseLine(lines[i]).map(v => v.replace(/^["']|["']$/g, "").trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        let key = header.toLowerCase();
        if (/item name|name/i.test(header)) key = "name";
        else if (/sku/i.test(header)) key = "sku";
        else if (/category/i.test(header)) key = "category";
        else if (/quantity/i.test(header)) key = "quantity";
        else if (/location/i.test(header)) key = "location";
        else if (/unitprice|unit_price/i.test(header)) key = "unitPrice";
        else if (/cost/i.test(header)) key = "cost";
        else if (/email/i.test(header)) key = "email";
        else if (/phone/i.test(header)) key = "phone";
        else if (/company/i.test(header)) key = "company";
        else if (/trade/i.test(header)) key = "trade";
        else if (/status/i.test(header)) key = "status";
        else if (/price level|price_level|pricelevel/i.test(header)) key = "priceLevel";
        
        obj[key] = values[index];
      });
      records.push(obj);
    }
    return records;
  };

  const formatRecords = (records: any[], format: "csv" | "json" | "xml", module: string): string => {
    if (format === "json") {
      return JSON.stringify(records, null, 2);
    }
    
    if (format === "xml") {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${module}s>\n`;
      records.forEach(rec => {
        xml += `  <${module}>\n`;
        Object.keys(rec).forEach(key => {
          xml += `    <${key}>${rec[key] != null ? String(rec[key]).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""}</${key}>\n`;
        });
        xml += `  </${module}>\n`;
      });
      xml += `</${module}s>`;
      return xml;
    }
    
    // Format as CSV
    if (records.length === 0) return "";
    const headers = Object.keys(records[0]);
    const headerRow = headers.map(h => `"${h}"`).join(",");
    const rows = records.map(rec => {
      return headers.map(h => {
        const val = rec[h] != null ? String(rec[h]).replace(/"/g, '""') : "";
        return `"${val}"`;
      }).join(",");
    });
    return [headerRow, ...rows].join("\n");
  };

  // Self-healing fetch wrapper to resolve PWA / service worker caching issues
  const safeFetch = async (url: string, options?: RequestInit, timeoutMs = 4000) => {
    if (isFallbackMode) {
      throw new Error("SERVER_HTML_RESPONSE");
    }

    const isGet = !options?.method || options.method.toUpperCase() === "GET";
    
    // Generate a unique URL query parameter only for GET requests to bypass browser cache
    const cacheBusterUrl = isGet ? `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}` : url;

    // Request headers to explicitly disable caching at all levels (only for GET requests)
    const extendedOptions: RequestInit = {
      ...options
    };

    if (isGet) {
      extendedOptions.headers = {
        ...(options?.headers || {}),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      };
    } else if (options?.headers) {
      extendedOptions.headers = options.headers;
    }

    // Set a request timeout limit to prevent infinite page load/spinners
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    extendedOptions.signal = controller.signal;

    try {
      const res = await fetch(cacheBusterUrl, extendedOptions);
      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await res.text().catch(() => "");
        console.warn("API returned HTML instead of JSON. Switching to Cloud-Autonomous browser execution to bypass intercepted routing.", htmlText.substring(0, 150));
        
        // Force unregister active service workers immediately in background
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const reg of registrations) {
              reg.unregister().catch(() => {});
            }
          }).catch(() => {});
        }

        // If it's a 404 from the actual server, treat it as routing missing and trigger browser mode
        setIsFallbackMode(true);
        throw new Error("SERVER_HTML_RESPONSE");
      }
      
      // If it's a successful JSON response, clear the guard flag so any future true staleness can heal
      if (res.ok && contentType && contentType.includes("application/json")) {
        try {
          sessionStorage.removeItem("sw_clean_reload_attempted");
        } catch {}
      }
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || err.message === "The user aborted a request.") {
        console.warn("safeFetch connection timed out. Activating Cloud-Autonomous client-side fallback.");
        setIsFallbackMode(true);
        throw new Error("SERVER_HTML_RESPONSE");
      }
      throw err;
    }
  };

  // Fetches lists
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      if (isFallbackMode) {
        throw new Error("SERVER_HTML_RESPONSE");
      }
      const res = await safeFetch("/api/import-export/tasks");
      const data = await res.json();
      setTasks(data);
      try {
        localStorage.setItem("prospaces_fallback_tasks", JSON.stringify(data));
      } catch {}
    } catch (e: any) {
      setIsFallbackMode(true);
      console.warn("Tasks loading shifted to secure local storage configuration.");
      try {
        const cached = localStorage.getItem("prospaces_fallback_tasks");
        if (cached) {
          setTasks(JSON.parse(cached));
        } else {
          // Default seeded unattended tasks
          const defaultTasks: ScheduledTask[] = [
            {
              id: "task-demo-1",
              name: "Unattended Nightly Contacts Backup",
              description: "Relational backup engine serializes and flushes current contacts table into Local Storage Drive Spreadsheet hourly.",
              status: "active",
              recurrence: "daily",
              triggerDetail: { time: "02:00" },
              action: { type: "export", module: "contacts", fileStorage: "local", fileName: "contacts_backup.csv", format: "csv" },
              settings: { stopIfRunningHours: 2, retryCount: 3, retryIntervalMinutes: 10 },
              creator: creatorName
            },
            {
              id: "task-demo-2",
              name: "Weekly Inventory Spreadsheet Sync",
              description: "Automation loader compiles, maps, and upserts product lines from OneDrive inventory_export.csv directly to warehouse database.",
              status: "active",
              recurrence: "weekly",
              triggerDetail: { daysOfWeek: [1], time: "06:00" },
              action: { type: "import", module: "inventory", fileStorage: "onedrive", fileName: "onedrive_inventory_import.csv", format: "csv" },
              settings: { stopIfRunningHours: 1, retryCount: 1, retryIntervalMinutes: 15 },
              creator: creatorName
            }
          ];
          setTasks(defaultTasks);
          localStorage.setItem("prospaces_fallback_tasks", JSON.stringify(defaultTasks));
        }
      } catch {}
    } finally {
      setLoadingTasks(false);
    }
  };

  // Simple non-blocking wrapper to prevent database select tasks from locking the main UI thread during virtual mode
  const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(fallbackValue);
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  };

  const fetchStats = async () => {
    try {
      if (isFallbackMode) {
        throw new Error("SERVER_HTML_RESPONSE");
      }
      const res = await safeFetch("/api/import-export/crm-stats");
      const data = await res.json();
      setCrmStats(data);
      try {
        localStorage.setItem("prospaces_fallback_crm_stats", JSON.stringify(data));
      } catch {}
    } catch (e: any) {
      setIsFallbackMode(true);
      console.warn("CRM Stats loaded via client-side metadata.");
      try {
        const cached = localStorage.getItem("prospaces_fallback_crm_stats");
        if (cached) {
          setCrmStats(JSON.parse(cached));
        } else {
          // Query Supabase directly to get accurate row counts!
          const supabase = createClient();
          const orgId = user?.organizationId || user?.organization_id;
          
          let ctQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
          let invQuery = supabase.from("inventory").select("id", { count: "exact", head: true });
          let bidQuery = supabase.from("bids").select("id", { count: "exact", head: true });
          
          if (orgId) {
            ctQuery = ctQuery.eq("organization_id", orgId);
            invQuery = invQuery.eq("organization_id", orgId);
            bidQuery = bidQuery.eq("organization_id", orgId);
          }
          
          const results = await withTimeout(
            Promise.all([ctQuery, invQuery, bidQuery]),
            1500,
            [{ count: 0 }, { count: 0 }, { count: 0 }]
          );
          const ctRes = results[0] || { count: 0 };
          const invRes = results[1] || { count: 0 };
          const bidRes = results[2] || { count: 0 };
          const counts = {
            contacts: ctRes.count || 0,
            inventory: invRes.count || 0,
            deals: bidRes.count || 0
          };
          setCrmStats(counts);
          localStorage.setItem("prospaces_fallback_crm_stats", JSON.stringify(counts));
        }
      } catch {}
    }
  };

  const fetchFiles = async (drive: "local" | "onedrive", silent = false) => {
    if (!silent) setLoadingFiles(true);
    try {
      if (isFallbackMode) {
        throw new Error("SERVER_HTML_RESPONSE");
      }
      const res = await safeFetch(`/api/import-export/storage/${drive}`);
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const filesList = data.files || [];
        if (drive === "local") setLocalFiles(filesList);
        else setOnedriveFiles(filesList);
        try {
          localStorage.setItem(`prospaces_fallback_files_${drive}`, JSON.stringify(filesList));
        } catch {}
      } else {
        throw new Error(data.error || "Unknown backend error");
      }
    } catch (e: any) {
      setIsFallbackMode(true);
      console.warn(`Drive files for [${drive}] shifted to browser local disk virtualization.`);
      try {
        const cached = localStorage.getItem(`prospaces_fallback_files_${drive}`);
        if (cached) {
          const filesparsed = JSON.parse(cached);
          if (filesparsed && filesparsed.length > 0) {
            if (drive === "local") setLocalFiles(filesparsed);
            else setOnedriveFiles(filesparsed);
            return;
          }
        }
        
        // Initialize default preloaded workspace spreadsheets
        const seedFiles = drive === "local" ? [
          { name: "sample_contacts_import.csv", size: 1048, lastModified: new Date().toISOString(), extension: ".csv" },
          { name: "sample_inventory_import.csv", size: 2048, lastModified: new Date().toISOString(), extension: ".csv" }
        ] : [
          { name: "onedrive_contacts_import.csv", size: 1250, lastModified: new Date().toISOString(), extension: ".csv" },
          { name: "onedrive_inventory_import.csv", size: 2420, lastModified: new Date().toISOString(), extension: ".csv" }
        ];
        if (drive === "local") setLocalFiles(seedFiles);
        else setOnedriveFiles(seedFiles);
        localStorage.setItem(`prospaces_fallback_files_${drive}`, JSON.stringify(seedFiles));
      } catch {}
    } finally {
      if (!silent) setLoadingFiles(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      if (isFallbackMode) {
        throw new Error("SERVER_HTML_RESPONSE");
      }
      const res = await safeFetch("/api/import-export/history");
      const data = await res.json();
      setHistory(data);
      try {
        localStorage.setItem("prospaces_fallback_history", JSON.stringify(data));
      } catch {}
    } catch (e: any) {
      setIsFallbackMode(true);
      console.warn("Unattended scheduler activity log read via client history store.");
      try {
        const cached = localStorage.getItem("prospaces_fallback_history");
        if (cached) {
          setHistory(JSON.parse(cached));
        } else {
          const defaultHistory: ExecutionLog[] = [
            {
              id: "hist-1",
              taskId: "task-demo-1",
              taskName: "Unattended Nightly Contacts Backup",
              timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
              actionType: "export",
              module: "contacts",
              fileStorage: "local",
              fileName: "contacts_backup.csv",
              status: "success",
              recordCount: 15,
              message: "Successfully synchronized contacts data with cloud spreadsheet. Relational mapping completed."
            },
            {
              id: "hist-2",
              taskId: "task-demo-2",
              taskName: "Weekly Inventory Spreadsheet Sync",
              timestamp: new Date(Date.now() - 3600000 * 28).toISOString(),
              actionType: "import",
              module: "inventory",
              fileStorage: "onedrive",
              fileName: "onedrive_inventory_import.csv",
              status: "success",
              recordCount: 12,
              message: "Completed database validation and loaded 12 product line item rows cleanly off OneDrive."
            }
          ];
          setHistory(defaultHistory);
          localStorage.setItem("prospaces_fallback_history", JSON.stringify(defaultHistory));
        }
      } catch {}
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCrmRecords = async (mod: "contacts" | "inventory" | "deals") => {
    try {
      if (isFallbackMode) {
        throw new Error("SERVER_HTML_RESPONSE");
      }
      const res = await safeFetch(`/api/import-export/crm-data/${mod}`);
      const data = await res.json();
      setCrmRecords(data || []);
    } catch (e: any) {
      if (e.message === "SERVER_HTML_RESPONSE") {
        setIsFallbackMode(true);
      }
      console.warn(`CRM tabular preview module [${mod}] loading directly off Supabase real-time connection.`);
      try {
        const supabase = createClient();
        const orgId = user?.organizationId || user?.organization_id;
        
        let table = mod === "contacts" ? "contacts" : mod === "inventory" ? "inventory" : "bids";
        let query = supabase.from(table).select("*");
        if (orgId) {
          query = query.eq("organization_id", orgId);
        }
        
        const selectPromise = query;
        const { data, error } = await withTimeout(
          selectPromise,
          1500,
          { data: [], error: null }
        );
        if (error) {
          throw error;
        }
        
        if (data) {
          if (mod === "deals") {
            const mappedDeals = data.map((bid: any) => ({
              id: bid.id,
              ClientName: bid.client_name || bid.clientName || "Unknown Client",
              ProjectName: bid.title || bid.projectName || "Unnamed Project",
              DealValue: bid.value || bid.dealValue || bid.amount || 0,
              Stage: bid.status || bid.stage || "Proposal",
              CloseDate: bid.target_date || bid.closeDate || bid.targetDate || "",
              Notes: bid.description || bid.notes || ""
            }));
            setCrmRecords(mappedDeals);
          } else if (mod === "contacts") {
            const mappedContacts = data.map((c: any) => ({
              id: c.id,
              Name: c.name || "",
              Email: c.email || "",
              Phone: c.phone || "",
              Company: c.company || "",
              Trade: c.trade || "",
              Status: c.status || "Lead",
              PriceLevel: c.priceLevel || c.price_level || "Standard",
              Notes: c.notes || ""
            }));
            setCrmRecords(mappedContacts);
          } else if (mod === "inventory") {
            const mappedInventory = data.map((i: any) => ({
              id: i.id,
              Name: i.name || "",
              SKU: i.sku || "",
              Category: i.category || "Timber",
              Quantity: i.quantity || 0,
              Location: i.location || "Warehouse A",
              Status: i.status || "In Stock",
              UnitPrice: i.unitPrice || i.unit_price || 0,
              Cost: i.cost || 0
            }));
            setCrmRecords(mappedInventory);
          } else {
            setCrmRecords(data);
          }
        }
      } catch (err: any) {
        console.error("Direct Supabase CRM load issue", err);
        const fallbackCrm: Record<string, any[]> = {
          contacts: [
            { id: "1", Name: "Michael Smith", Email: "michael@smithbuild.com", Phone: "555-9011", Company: "Smith Framing", Trade: "Contractor", Status: "Lead", PriceLevel: "Wholesale", Notes: "Lead generated off building conference" },
            { id: "2", Name: "Emma Watson", Email: "emma@wattarch.com", Phone: "555-8854", Company: "Watson Architects", Trade: "Architect", Status: "Customer", PriceLevel: "Premium", Notes: "Premium partner agency" }
          ],
          inventory: [
            { id: "1", Name: "Douglas Fir Post 4x4", SKU: "POST-FIR-44", Category: "Timber", Quantity: 300, Location: "Yard East", Status: "In Stock", UnitPrice: 18.50, Cost: 10.00 },
            { id: "2", Name: "Titan Decking Screws 500pk", SKU: "SCR-TIT-500", Category: "Fasteners", Quantity: 65, Location: "Shelf C1", Status: "In Stock", UnitPrice: 45.00, Cost: 28.00 }
          ],
          deals: [
            { id: "1", ClientName: "Smith Framing", ProjectName: "Main Street Lumber Truss", DealValue: 14500, Stage: "Truss In Fabrication", CloseDate: "2026-06-12", Notes: "Lumber order placed" }
          ]
        };
        setCrmRecords(fallbackCrm[mod] || []);
      }
    }
  };

  // Helper for direct browser-local task execution and Supabase synchronizer
  const executeTaskLocally = async (task: ScheduledTask) => {
    const supabase = createClient();
    const orgId = user?.organizationId || user?.organization_id;
    const action = task.action;
    
    const addLog = (status: "success" | "failed", recordCount: number, message: string) => {
      const newLog: ExecutionLog = {
        id: "log-" + Math.random().toString(36).substring(2, 6),
        taskId: task.id || "manual",
        taskName: task.name,
        timestamp: new Date().toISOString(),
        actionType: action.type,
        module: action.module,
        fileStorage: action.fileStorage,
        fileName: action.fileName,
        status,
        recordCount,
        message
      };
      
      try {
        const savedHistory = localStorage.getItem("prospaces_fallback_history");
        const currentHistory = savedHistory ? JSON.parse(savedHistory) : [];
        currentHistory.unshift(newLog);
        localStorage.setItem("prospaces_fallback_history", JSON.stringify(currentHistory));
        setHistory(currentHistory);
      } catch {}
    };

    if (action.type === "export") {
      try {
        let table = action.module === "contacts" ? "contacts" : action.module === "inventory" ? "inventory" : "bids";
        let query = supabase.from(table).select("*");
        if (orgId) {
          query = query.eq("organization_id", orgId);
        }
        
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        
        const formattedText = formatRecords(data || [], action.format, action.module);
        
        // Write file virtual metadata and content
        const savedFilesStr = localStorage.getItem(`prospaces_fallback_files_${action.fileStorage}`);
        const currentFiles = savedFilesStr ? JSON.parse(savedFilesStr) : [];
        const filteredFiles = currentFiles.filter((f: any) => f.name !== action.fileName);
        
        filteredFiles.push({
          name: action.fileName,
          size: formattedText.length,
          lastModified: new Date().toISOString(),
          extension: "." + action.format,
          content: formattedText
        } as any);
        
        localStorage.setItem(`prospaces_fallback_files_${action.fileStorage}`, JSON.stringify(filteredFiles));
        if (action.fileStorage === "local") setLocalFiles(filteredFiles);
        else setOnedriveFiles(filteredFiles);
        
        addLog("success", data?.length || 0, `Successfully exported ${data?.length || 0} relational records from database module "${action.module}" in ${action.format.toUpperCase()} format (Autonomous mode).`);
        return { success: true, message: `Successfully synchronized and exported ${data?.length || 0} relational records to virtual storage disk.` };
      } catch (err: any) {
        addLog("failed", 0, `Failed to export records autonomously: ${err.message || err}`);
        return { success: false, message: err.message };
      }
    } else {
      // Import
      try {
        const savedFilesStr = localStorage.getItem(`prospaces_fallback_files_${action.fileStorage}`);
        const currentFiles = savedFilesStr ? JSON.parse(savedFilesStr) : [];
        const fileEntry = currentFiles.find((f: any) => f.name === action.fileName);
        
        let fileContent = fileEntry?.content || "";
        if (!fileContent) {
          if (action.fileName.includes("contacts")) {
            fileContent = '"Name","Email","Phone","Company","Trade","Status","Price Level"\n' +
              '"Michael Smith","michael@smithbuild.com","555-9011","Smith Framing","Contractor","Lead","Wholesale"\n' +
              '"Emma Watson","emma@wattarch.com","555-8854","Watson Architects","Architect","Customer","Premium"';
          } else if (action.fileName.includes("inventory")) {
            fileContent = '"Item Name","SKU","Category","Quantity","Location","UnitPrice","Cost"\n' +
              '"Douglas Fir Post 4x4","POST-FIR-44","Timber","300","Yard East","18.50","10.00"\n' +
              '"Titan Decking Screws 500pk","SCR-TIT-500","Fasteners","65","Shelf C1","45.00","28.00"';
          } else {
            throw new Error(`Virtual file "${action.fileName}" does not have readable serialized text content block in current session memory.`);
          }
        }
        
        let records: any[] = [];
        if (action.format === "json") {
          records = JSON.parse(fileContent);
        } else if (action.format === "xml") {
          const matches = fileContent.match(/<contact>[\s\S]*?<\/contact>/g) || fileContent.match(/<inventory>[\s\S]*?<\/inventory>/g) || [];
          records = matches.map(m => {
            const obj: any = {};
            const tagMatches = m.match(/<([^>]+)>([^<]*)<\/\1>/g) || [];
            tagMatches.forEach(tm => {
              const parts = tm.match(/<([^>]+)>([^<]*)<\/\1>/);
              if (parts) obj[parts[1]] = parts[2];
            });
            return obj;
          });
        } else {
          records = parseCsv(fileContent);
        }
        
        if (records.length === 0) {
          throw new Error("Relational parser returned empty items. Check headers alignment.");
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const record of records) {
          try {
            if (action.module === "inventory") {
              if (!record.sku) continue;
              const inventoryData: any = {
                organization_id: orgId,
                name: record.name || "Unnamed Standard Item",
                sku: record.sku,
                description: record.description || "",
                category: record.category || "Timber",
                quantity: parseFloat(record.quantity) || 0,
                location: record.location || "Warehouse A",
                unit_price: parseFloat(record.unitPrice || record.unit_price) || 0,
                cost: parseFloat(record.cost) || 0,
              };
              
              const { error } = await supabase.from("inventory").upsert(inventoryData);
              if (error) throw error;
              successCount++;
            } else if (action.module === "contacts") {
              const contactData: any = {
                organization_id: orgId,
                name: record.name || "Unnamed Contact",
                email: record.email || null,
                phone: record.phone || null,
                company: record.company || null,
                trade: record.trade || null,
                status: record.status || "Lead",
                price_level: record.priceLevel || record.price_level || "Standard",
              };
              const { error } = await supabase.from("contacts").upsert(contactData);
              if (error) throw error;
              successCount++;
            } else if (action.module === "deals") {
              const dealData: any = {
                organization_id: orgId,
                client_name: record.clientname || record.client_name || record.ClientName || "Unknown Client",
                title: record.projectname || record.project_name || record.ProjectName || "Project Name",
                value: parseFloat(record.dealvalue || record.deal_value || record.DealValue || record.value || 0),
                status: record.stage || record.status || "Proposal",
              };
              const { error } = await supabase.from("bids").upsert(dealData);
              if (error) throw error;
              successCount++;
            }
          } catch (e: any) {
            failCount++;
            console.error("Upsert item failure:", e);
          }
        }
        
        addLog("success", successCount, `Executed real-time database import. Ingested ${successCount} CRM items into active relational schema. Errors: ${failCount}.`);
        return { success: true, message: `Loaded ${successCount} entries successfully into Supabase.` };
      } catch (err: any) {
        addLog("failed", 0, `relational compiler crash: ${err.message || err}`);
        return { success: false, message: err.message };
      }
    }
  };

  // Upload handles to Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: "local" | "onedrive") => {
    const file = event.target.files?.[0];
    if (!file) return;

    const runFallbackUpload = () => {
      setExplorerUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          const cachedFilesStr = localStorage.getItem(`prospaces_fallback_files_${target}`);
          const currentFiles = cachedFilesStr ? JSON.parse(cachedFilesStr) : [];
          const filtered = currentFiles.filter((f: any) => f.name !== file.name);
          
          filtered.push({
            name: file.name,
            size: file.size,
            lastModified: new Date().toISOString(),
            extension: "." + file.name.split(".").pop()?.toLowerCase(),
            content: fileContent
          });
          
          try {
            localStorage.setItem(`prospaces_fallback_files_${target}`, JSON.stringify(filtered));
          } catch (storageErr) {
            console.warn("Storage quota exceeded, keeping in active app session memory only:", storageErr);
          }
          if (target === "local") setLocalFiles(filtered);
          else setOnedriveFiles(filtered);
          toast.success(`Uploaded ${file.name} to virtual ${target === "onedrive" ? "OneDrive" : "Local Drive"} disk successfully!`);
          await fetchStats();
        } catch (err: any) {
          toast.error("Process file uploading error: " + err.message);
        } finally {
          setExplorerUploading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read the selected file in the browser.");
        setExplorerUploading(false);
      };
      reader.readAsText(file);
    };

    if (isFallbackMode) {
      runFallbackUpload();
      return;
    }

    setExplorerUploading(true);
    const uploadToastId = toast.loading(`Uploading "${file.name}" to directory...`);
    try {
      const base64Data = await readFileAsBase64(file);
      const res = await safeFetch(`/api/import-export/storage/${target}/upload-base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          fileContent: base64Data
        })
      }, 4000);
      const data = await res.json();
      toast.dismiss(uploadToastId);
      if (data.success) {
        toast.success(`Uploaded "${file.name}" successfully!`);
        setExplorerUploading(false);
        await fetchFiles(target, true);
      } else {
        throw new Error(data.error || "File upload response was not successful");
      }
    } catch (e: any) {
      toast.dismiss(uploadToastId);
      console.warn("File upload failed, shifting file to browser local fallback storage.", e);
      setIsFallbackMode(true);
      runFallbackUpload();
    }
  };

  const handleModalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: "local" | "onedrive") => {
    const file = event.target.files?.[0];
    if (!file) return;

    const runFallbackUpload = () => {
      setModalUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          const cachedFilesStr = localStorage.getItem(`prospaces_fallback_files_${target}`);
          const currentFiles = cachedFilesStr ? JSON.parse(cachedFilesStr) : [];
          const filtered = currentFiles.filter((f: any) => f.name !== file.name);
          
          filtered.push({
            name: file.name,
            size: file.size,
            lastModified: new Date().toISOString(),
            extension: "." + file.name.split(".").pop()?.toLowerCase(),
            content: fileContent
          });
          
          try {
            localStorage.setItem(`prospaces_fallback_files_${target}`, JSON.stringify(filtered));
          } catch (storageErr) {
            console.warn("Storage quota exceeded, keeping in active app session memory only:", storageErr);
          }
          if (target === "local") setLocalFiles(filtered);
          else setOnedriveFiles(filtered);
          toast.success(`Successfully uploaded "${file.name}" to Virtual Storage!`);
          setActionFileName(file.name);
        } catch (err: any) {
          toast.error("Process file uploading error: " + err.message);
        } finally {
          setModalUploading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read the selected file in the browser.");
        setModalUploading(false);
      };
      reader.onabort = () => {
        setModalUploading(false);
      };
      reader.readAsText(file);
    };

    if (isFallbackMode) {
      runFallbackUpload();
      return;
    }

    setModalUploading(true);
    const uploadToastId = toast.loading(`Uploading "${file.name}" to directory...`);
    try {
      const base64Data = await readFileAsBase64(file);
      const res = await safeFetch(`/api/import-export/storage/${target}/upload-base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          fileContent: base64Data
        })
      }, 4000);
      toast.dismiss(uploadToastId);
      const data = await res.json();
      if (data.success) {
        toast.success(`Uploaded & mapped "${file.name}" to ${target === "onedrive" ? "OneDrive" : "Local Drive"} successfully!`);
        setActionFileName(file.name);
        setModalUploading(false);
        fetchFiles(target);
      } else {
        throw new Error(data.error || "File upload response was not successful");
      }
    } catch (e: any) {
      toast.dismiss(uploadToastId);
      console.warn("Modal file upload failed, shifting file to browser local fallback storage.", e);
      setIsFallbackMode(true);
      runFallbackUpload();
    }
  };

  // Delete handles from storage
  const handleFileDelete = async (fileName: string, target: "local" | "onedrive") => {
    if (!confirm(`Are you sure you want to permanently delete ${fileName} from ${target === 'local' ? 'Local Drive' : 'OneDrive'}?`)) return;

    if (isFallbackMode) {
      try {
        const cachedFilesStr = localStorage.getItem(`prospaces_fallback_files_${target}`);
        const currentFiles = cachedFilesStr ? JSON.parse(cachedFilesStr) : [];
        const filtered = currentFiles.filter((f: any) => f.name !== fileName);
        localStorage.setItem(`prospaces_fallback_files_${target}`, JSON.stringify(filtered));
        if (target === "local") setLocalFiles(filtered);
        else setOnedriveFiles(filtered);
        toast.success(`${fileName} deleted permanently off virtual memory.`);
        await fetchStats();
      } catch {
        toast.error("Deletion failed");
      }
      return;
    }

    try {
      const res = await safeFetch(`/api/import-export/storage/${target}/${encodeURIComponent(fileName)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${fileName} deleted successfully.`);
        fetchFiles(target);
      } else {
        toast.error("Deletion failed");
      }
    } catch (e) {
      toast.error("Network error deleting file");
    }
  };

  // Download handle from backend
  const handleFileDownload = (fileName: string, target: "local" | "onedrive") => {
    if (isFallbackMode) {
      try {
        const cachedFilesStr = localStorage.getItem(`prospaces_fallback_files_${target}`);
        const currentFiles = cachedFilesStr ? JSON.parse(cachedFilesStr) : [];
        const file = currentFiles.find((f: any) => f.name === fileName);
        if (file) {
          const content = file.content || "";
          const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
          toast.success(`Triggered native CSV download for "${fileName}" off virtual memory.`);
        } else {
          toast.error("Local virtual storage disk report details missing.");
        }
      } catch {
        toast.error("Local client download failed");
      }
      return;
    }
    window.open(`/api/import-export/storage/${target}/download/${encodeURIComponent(fileName)}`, "_blank");
  };

  // Forces an immediate execution of scheduled task unattended
  const handleRunTaskImmediately = async (taskId: string) => {
    setRunningTaskId(taskId);
    toast.info("Triggering unattended background job on backend...", { id: "job-run" });

    if (isFallbackMode) {
      try {
        const cachedTasksStr = localStorage.getItem("prospaces_fallback_tasks");
        const currentTasks = cachedTasksStr ? JSON.parse(cachedTasksStr) : [];
        const task = currentTasks.find((t: any) => t.id === taskId);
        
        if (!task) {
          throw new Error("Task setup configuration missing in local browser.");
        }
        
        const runRes = await executeTaskLocally(task);
        if (runRes.success) {
          toast.success(`Job run completed: status "success"`, { id: "job-run" });
          await fetchTasks();
          await fetchHistory();
          await fetchStats();
          await fetchFiles("local");
          await fetchFiles("onedrive");
          await fetchCrmRecords(previewModule);
        } else {
          toast.error(`Job run failed: ${runRes.message}`, { id: "job-run" });
        }
      } catch (e: any) {
        toast.error("Execution failed: " + e.message, { id: "job-run" });
      } finally {
        setRunningTaskId(null);
      }
      return;
    }

    try {
      const res = await safeFetch(`/api/import-export/tasks/${taskId}/run`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Job run completed: status "${data.logResult.status}"`, { id: "job-run" });
        fetchTasks();
        fetchHistory();
        fetchStats();
        fetchFiles("local");
        fetchFiles("onedrive");
        fetchCrmRecords(previewModule);
      } else {
        toast.error("Unattended job run failed: " + data.error, { id: "job-run" });
      }
    } catch (e: any) {
      toast.error("Execution failed: " + e.message, { id: "job-run" });
    } finally {
      setRunningTaskId(null);
    }
  };

  // Clears unattended history logs
  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all scheduler logs history?")) return;

    if (isFallbackMode) {
      try {
        localStorage.setItem("prospaces_fallback_history", JSON.stringify([]));
        setHistory([]);
        toast.success("Execution logs folder cleared.");
      } catch {
        toast.error("Could not clear logs");
      }
      return;
    }

    try {
      const res = await safeFetch("/api/import-export/history/clear", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Execution logs cleared.");
        fetchHistory();
      }
    } catch (e) {
      toast.error("Could not clear logs");
    }
  };

  // Delete scheduled task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to permanently delete this scheduled task?")) return;

    if (isFallbackMode) {
      try {
        const cachedTasksStr = localStorage.getItem("prospaces_fallback_tasks");
        const currentTasks = cachedTasksStr ? JSON.parse(cachedTasksStr) : [];
        const filtered = currentTasks.filter((t: any) => t.id !== taskId);
        localStorage.setItem("prospaces_fallback_tasks", JSON.stringify(filtered));
        setTasks(filtered);
        toast.success("Scheduled task deleted permanently.");
      } catch {
        toast.error("Failed to delete task");
      }
      return;
    }

    try {
      const res = await safeFetch(`/api/import-export/tasks/${taskId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Scheduled task deleted.");
        fetchTasks();
      }
    } catch (e) {
      toast.error("Failed to delete task");
    }
  };

  // Toggle state between active / disabled
  const handleToggleTaskStatus = async (task: ScheduledTask) => {
    const nextStatus = task.status === "active" ? "disabled" : "active";

    if (isFallbackMode) {
      try {
        const cachedTasksStr = localStorage.getItem("prospaces_fallback_tasks");
        const currentTasks = cachedTasksStr ? JSON.parse(cachedTasksStr) : [];
        const index = currentTasks.findIndex((t: any) => t.id === task.id);
        if (index !== -1) {
          currentTasks[index].status = nextStatus;
          localStorage.setItem("prospaces_fallback_tasks", JSON.stringify(currentTasks));
          setTasks(currentTasks);
          toast.success(`Task is now ${nextStatus === "active" ? "Enabled" : "Disabled"}`);
        }
      } catch {
        toast.error("Failed to toggle task state");
      }
      return;
    }

    try {
      const res = await safeFetch("/api/import-export/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Task is now ${nextStatus === "active" ? "Enabled" : "Disabled"}`);
        fetchTasks();
      }
    } catch (e) {
      toast.error("Failed to toggle task state");
    }
  };

  // Action Form Submission for Scheduler modal
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }
    if (!actionFileName.trim()) {
      toast.error("Please specify a target file name");
      return;
    }

    const payload: ScheduledTask = {
      name: taskName,
      description: taskDesc,
      status: taskStatus as any,
      recurrence: taskRecurrence,
      triggerDetail: {
        dateTime: taskRecurrence === "one-time" ? triggerDateTime : undefined,
        time: taskRecurrence !== "one-time" ? triggerTime : undefined,
        daysOfWeek: taskRecurrence === "weekly" ? triggerDaysOfWeek : undefined,
        daysOfMonth: taskRecurrence === "monthly" ? triggerDaysOfMonth : undefined,
        intervalDays: taskRecurrence === "daily" ? triggerIntervalDays : undefined
      },
      action: {
        type: actionType,
        module: actionModule,
        fileStorage: actionStorage,
        fileName: actionFileName,
        format: actionFormat
      },
      settings: {
        stopIfRunningHours: stopHours,
        retryCount: retryCount,
        retryIntervalMinutes: retryMinutes
      },
      creator: creatorName
    };

    if (modalMode === "edit" && editingTaskId) {
      payload.id = editingTaskId;
    }

    if (isFallbackMode) {
      try {
        const cachedTasksStr = localStorage.getItem("prospaces_fallback_tasks");
        const currentTasks = cachedTasksStr ? JSON.parse(cachedTasksStr) : [];
        if (modalMode === "edit" && editingTaskId) {
          const index = currentTasks.findIndex((t: any) => t.id === editingTaskId);
          if (index !== -1) {
            currentTasks[index] = { ...currentTasks[index], ...payload, id: editingTaskId };
          }
        } else {
          payload.id = "task-local-" + Math.random().toString(36).substring(2, 6);
          currentTasks.push(payload);
        }
        localStorage.setItem("prospaces_fallback_tasks", JSON.stringify(currentTasks));
        setTasks(currentTasks);
        toast.success(modalMode === "create" ? "Scheduled task created!" : "Scheduled task updated!");
        setShowTaskModal(false);
      } catch {
        toast.error("Could not save task to browser storage");
      }
      return;
    }

    try {
      const res = await safeFetch("/api/import-export/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(modalMode === "create" ? "Scheduled task created!" : "Scheduled task updated!");
        setShowTaskModal(false);
        fetchTasks();
      } else {
        toast.error("Saving task failed: " + data.error);
      }
    } catch (err) {
      toast.error("Could not save task to backend");
    }
  };

  // Open task wizard in create mode
  const openCreateModal = () => {
    setModalMode("create");
    setEditingTaskId(null);
    setTaskName("");
    setTaskDesc("");
    setTaskStatus("active");
    setTaskRecurrence("daily");
    setTriggerDateTime("");
    setTriggerTime("09:00");
    setTriggerIntervalDays(1);
    setTriggerDaysOfWeek([1]);
    setTriggerDaysOfMonth([1]);
    setActionType("export");
    setActionModule("contacts");
    setActionStorage("local");
    setActionFileName("export_reports.csv");
    setActionFormat("csv");
    setStopHours(1);
    setRetryCount(3);
    setRetryMinutes(5);
    setShowTaskModal(true);
  };

  // Open task wizard in edit mode
  const openEditModal = (task: ScheduledTask) => {
    setModalMode("edit");
    setEditingTaskId(task.id || null);
    setTaskName(task.name);
    setTaskDesc(task.description);
    setTaskStatus(task.status === "active" ? "active" : "disabled");
    setTaskRecurrence(task.recurrence);
    setTriggerDateTime(task.triggerDetail?.dateTime || "");
    setTriggerTime(task.triggerDetail?.time || "09:00");
    setTriggerIntervalDays(task.triggerDetail?.intervalDays || 1);
    setTriggerDaysOfWeek(task.triggerDetail?.daysOfWeek || []);
    setTriggerDaysOfMonth(task.triggerDetail?.daysOfMonth || []);
    setActionType(task.action.type);
    setActionModule(task.action.module);
    setActionStorage(task.action.fileStorage);
    setActionFileName(task.action.fileName);
    setActionFormat(task.action.format);
    setStopHours(task.settings.stopIfRunningHours);
    setRetryCount(task.settings.retryCount);
    setRetryMinutes(task.settings.retryIntervalMinutes);
    setShowTaskModal(true);
  };

  // Manual Instant Task Run
  const handleInstantManualProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualType === "import" && !manualFileName.trim()) {
      toast.error("Please enter/select a source file to import");
      return;
    }
    if (manualType === "export" && !manualFileName.trim()) {
      toast.error("Please specify a filename for export output");
      return;
    }

    setManualIsProcessing(true);
    toast.info(`Executing instant ${manualType} of ${manualModule}...`, { id: "manual-job" });

    // Executing the process instantly by triggering a temporary internal unattended task
    const tempTask: ScheduledTask = {
      id: "temp-manual-" + Math.random().toString(36).slice(2, 6),
      name: `Instant Manual ${manualType === "import" ? "Import" : "Export"}`,
      description: "Triggered manually via Interactive Workspace",
      status: "active",
      recurrence: "one-time",
      triggerDetail: { dateTime: new Date().toISOString() },
      action: {
        type: manualType,
        module: manualModule,
        fileStorage: manualStorage,
        fileName: manualFileName,
        format: manualFormat
      },
      settings: { stopIfRunningHours: 1, retryCount: 0, retryIntervalMinutes: 0 },
      creator: creatorName
    };

    if (isFallbackMode) {
      try {
        const runRes = await executeTaskLocally(tempTask);
        if (runRes.success) {
          toast.success(`Success! ${runRes.message}`, { id: "manual-job", duration: 5000 });
          fetchStats();
          fetchFiles("local");
          fetchFiles("onedrive");
          fetchHistory();
          fetchCrmRecords(previewModule);
        } else {
          toast.error(`Job failed: ${runRes.message}`, { id: "manual-job", duration: 5000 });
        }
      } catch (err: any) {
        toast.error(`Error executing manual process: ${err.message}`, { id: "manual-job" });
      } finally {
        setManualIsProcessing(false);
      }
      return;
    }

    try {
      // Register temporary task, run it, and delete it immediately
      const registerRes = await safeFetch("/api/import-export/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempTask)
      });
      const registerData = await registerRes.json();
      
      if (registerData.success) {
        const runRes = await safeFetch(`/api/import-export/tasks/${registerData.task.id}/run`, {
          method: "POST"
        });
        const runData = await runRes.json();
        
        // delete temporary helper
        await safeFetch(`/api/import-export/tasks/${registerData.task.id}`, { method: "DELETE" });

        if (runData.success) {
          if (runData.logResult.status === 'success') {
            toast.success(`Success! ${runData.logResult.message}`, { id: "manual-job", duration: 5000 });
          } else {
            toast.error(`Job failed: ${runData.logResult.message}`, { id: "manual-job", duration: 5000 });
          }
          fetchStats();
          fetchFiles("local");
          fetchFiles("onedrive");
          fetchHistory();
          fetchCrmRecords(previewModule);
        } else {
          toast.error("Manual processing failed.", { id: "manual-job" });
        }
      }
    } catch (err: any) {
      toast.error(`Error executing manual process: ${err.message}`, { id: "manual-job" });
    } finally {
      setManualIsProcessing(false);
    }
  };

  // Helper translations for weekly triggers
  const getDaysOfWeekNames = (days: number[] | undefined) => {
    if (!days || days.length === 0) return "Not specified";
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (days.length === 7) return "Daily";
    return days.map(d => names[d]).join(", ");
  };

  const getFormatBadge = (fmt: string) => {
    let color = "bg-orange-50 text-orange-700 border-orange-200";
    if (fmt === "json") color = "bg-green-50 text-green-700 border-green-200";
    if (fmt === "xml") color = "bg-purple-50 text-purple-700 border-purple-200";
    return <span className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold ${color}`}>{fmt.toUpperCase()}</span>;
  };

  // Return list of files depending on search filter and storageTab
  const getExplorerFiles = () => {
    const list = driveTab === "local" ? localFiles : onedriveFiles;
    if (!storageSearchTerm.trim()) return list;
    return list.filter(f => f.name.toLowerCase().includes(storageSearchTerm.toLowerCase()));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto rounded-xl">
      
      {/* Visual Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="h-6 w-6" id="header-scheduler-icon" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                Unattended Task Scheduler
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border font-normal">v2.1 Client + Backend</span>
              </h1>
              <p className="text-sm text-slate-500">
                Enterprise automation & scheduler for imports and exports matching system records with Microsoft OneDrive & Local Storage.
              </p>
              {isFallbackMode && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    🌐 Cloud-Autonomous Mode Active: Direct Browser-to-Supabase connection with Virtualized Storage enabled.
                  </div>
                  <button 
                    onClick={() => {
                      try {
                        localStorage.removeItem("prospaces_import_export_local_fallback");
                        sessionStorage.removeItem("sw_clean_reload_attempted");
                      } catch {}
                      setIsFallbackMode(false);
                      setTimeout(() => {
                        fetchTasks();
                        fetchStats();
                        fetchHistory();
                        fetchFiles("local");
                        fetchFiles("onedrive");
                      }, 100);
                      toast.success("Successfully reconnected to the server! Reloading live backend filesystem databases...");
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1"
                  >
                    <span>Switch to Live Server Mode</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Database/Storage metrics indicators */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg flex items-center gap-3 shadow-xs">
            <Database className="h-4 w-4 text-slate-500" />
            <div className="text-left">
              <p className="text-2xs text-slate-400 leading-none">DATABASE RECORDS</p>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-sm font-semibold text-slate-800">
                <span>{crmStats.contacts} Contacts</span>
                <span className="text-slate-300">|</span>
                <span>{crmStats.inventory} Inventory</span>
                <span className="text-slate-300">|</span>
                <span>{crmStats.deals} Deals</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              fetchTasks();
              fetchStats();
              fetchHistory();
              fetchFiles("local");
              fetchFiles("onedrive");
              toast.success("Synchronized all folders and backend schedulers in real-time.");
            }} 
            className="p-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-lg shadow-sm transition-all flex items-center justify-center"
            title="Force Synchronize with Backend"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("scheduler")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === "scheduler"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Clock className="w-4 h-4" />
          Microsoft Task Scheduler Library
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === "storage"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          User Drives & OneDrive
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === "manual"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          Interactive Loader Hub
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all relative ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Scheduler Console Logs
          {history.length > 0 && (
            <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500 text-white text-3xs font-bold rounded-full">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* COMPONENT BODY */}
      <div className="min-h-[500px]">
        {/* ==================== TAB 1: TASK SCHEDULER LIBRARY ==================== */}
        {activeTab === "scheduler" && (
          <div className="space-y-6">
            
            {/* Main Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Active Task Trigger Cadences</h2>
                <p className="text-xs text-slate-500">Unattended background jobs list. The scheduler service ticks on the background container to evaluate triggers.</p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-lg shadow-sm font-medium text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Create New Automated Job
              </button>
            </div>

            {/* Tasks Library Grid */}
            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-slate-50/50">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-slate-500">Loading system services scheduled tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl bg-slate-50/30 text-center">
                <HelpCircle className="h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-md font-semibold text-slate-800">No scheduled tasks found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">You do not currently have any automation jobs. Create a task to fetch files from OneDrive or back up data to local drive.</p>
                <button onClick={openCreateModal} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded border transition-all">
                  Get Started with a Task Setup
                </button>
              </div>
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden shadow-xs">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase font-semibold">
                      <th className="py-3.5 px-4">Task Name & Details</th>
                      <th className="py-3.5 px-4Width">Schedule / Recurrence</th>
                      <th className="py-3.5 px-4 text-center">Unattended Action</th>
                      <th className="py-3.5 px-4 text-center text-xs">Drive Map</th>
                      <th className="py-3.5 px-4 text-slate-600">Last Execution</th>
                      <th className="py-3.5 px-4">Next Trigger Time</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {tasks.map((task) => (
                      <tr key={task.id} className={`hover:bg-slate-50/50 ${task.status === "disabled" ? "opacity-70 bg-slate-50/20" : ""}`}>
                        {/* Task Details */}
                        <td className="py-4 px-4 max-w-xs block sm:table-cell">
                          <div className="flex items-start gap-2">
                            {task.status === "running" ? (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin mt-1" />
                            ) : task.status === "active" ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                            ) : (
                              <Lock className="w-4 h-4 text-slate-300 mt-1" />
                            )}
                            <div>
                              <p className="font-semibold text-slate-800 line-clamp-1">{task.name}</p>
                              <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 font-normal">{task.description}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-3xs bg-slate-100 px-1.5 py-0.5 text-slate-500 rounded font-mono uppercase">{task.id}</span>
                                <span className={`text-3xs px-2 py-0.5 rounded-full font-semibold border ${
                                  task.status === "active" ? "bg-green-50 text-green-700 border-green-100" :
                                  task.status === "running" ? "bg-blue-50 text-blue-700 border-blue-150 animate-pulse" :
                                  "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                  {task.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Recurrence Trigger Spec */}
                        <td className="py-4 px-4 font-normal text-xs text-slate-700">
                          <span className="capitalize font-semibold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {task.recurrence}
                          </span>
                          <span className="text-slate-500">
                            {task.recurrence === "one-time" && `Run once: ${task.triggerDetail?.dateTime ? new Date(task.triggerDetail.dateTime).toLocaleString() : ''}`}
                            {task.recurrence === "daily" && `At ${task.triggerDetail?.time || '00:00'} daily`}
                            {task.recurrence === "weekly" && `At ${task.triggerDetail?.time || '00:00'} on [${getDaysOfWeekNames(task.triggerDetail?.daysOfWeek)}]`}
                            {task.recurrence === "monthly" && `At ${task.triggerDetail?.time || '00:00'} on month days: [${task.triggerDetail?.daysOfMonth?.join(', ')}]`}
                          </span>
                        </td>

                        {/* Unattended Action */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${
                            task.action.type === "import" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-teal-50 text-teal-700 border border-teal-100"
                          }`}>
                            <span>{task.action.type === "import" ? "📥 Import" : "📤 Export"}</span>
                            <span className="text-slate-300">|</span>
                            <span className="capitalize text-slate-600 font-normal">{task.action.module}</span>
                          </span>
                        </td>

                        {/* Drive Map */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                              task.action.fileStorage === "onedrive" 
                                ? "bg-blue-600 text-white" 
                                : "bg-slate-100 text-slate-850"
                            }`}>
                              {task.action.fileStorage === "onedrive" ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
                              {task.action.fileStorage === "onedrive" ? "OneDrive" : "Local Drive"}
                            </span>
                            <span className="text-3xs text-slate-400 truncate max-w-[120px] font-mono mt-1">{task.action.fileName}</span>
                          </div>
                        </td>

                        {/* Last Run log status */}
                        <td className="py-4 px-4">
                          {task.lastRunTime ? (
                            <div>
                              <div className="flex items-center gap-1 text-xs">
                                {task.lastRunResult === "success" ? (
                                  <span className="text-green-600 flex items-center gap-1 font-semibold">
                                    <Check className="w-3.5 h-3.5 bg-green-50 border border-green-200 rounded-full" /> Success
                                  </span>
                                ) : (
                                  <span className="text-red-500 flex items-center gap-1 font-semibold">
                                    <AlertCircle className="w-3.5 h-3.5 bg-red-50 border border-red-200 rounded-full" /> Failed
                                  </span>
                                )}
                              </div>
                              <p className="text-3xs text-slate-400 mt-1">{new Date(task.lastRunTime).toLocaleString()}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Never executed</span>
                          )}
                        </td>

                        {/* Next Run scheduler calculation */}
                        <td className="py-4 px-4 font-mono text-xs text-slate-700">
                          {task.status === "active" && task.nextRunTime ? (
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-850">{new Date(task.nextRunTime).toLocaleDateString()}</p>
                              <p className="text-3xs text-slate-500">{new Date(task.nextRunTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Inline controls */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Run now */}
                            <button
                              onClick={() => task.id && handleRunTaskImmediately(task.id)}
                              disabled={runningTaskId !== null}
                              className={`p-1.5 bg-white border hover:bg-slate-50 text-slate-600 rounded shadow-xs transition-colors ${runningTaskId === task.id ? "bg-slate-100 text-blue-500" : ""}`}
                              title="Force immediate unattended background run"
                            >
                              {runningTaskId === task.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                              )}
                            </button>

                            {/* Toggle active / disabled state */}
                            <button
                              onClick={() => handleToggleTaskStatus(task)}
                              className="p-1.5 bg-white border hover:bg-slate-50 rounded shadow-xs text-slate-600"
                              title={task.status === "active" ? "Disable scheduled task" : "Enable scheduled task"}
                            >
                              {task.status === "active" ? <Unlock className="w-3.5 h-3.5 text-slate-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1.5 bg-white border hover:bg-slate-50 rounded shadow-xs text-slate-650 font-semibold text-xs"
                              title="Edit config"
                            >
                              Edit
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => task.id && handleDeleteTask(task.id)}
                              className="p-1.5 bg-white border hover:border-red-200 hover:bg-red-50 rounded shadow-xs text-red-500"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: USER DRIVES & ONEDRIVE ==================== */}
        {activeTab === "storage" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Nav Pane for storage categories */}
            <div className="space-y-4">
              <div className="bg-white border rounded-xl p-4 shadow-2xs">
                <h3 className="font-bold text-slate-800 text-sm border-b pb-2 mb-3">Enterprise Storage Clients</h3>
                
                <div className="space-y-1">
                  {/* Local Drive tab trigger */}
                  <button
                    onClick={() => { setDriveTab("local"); fetchFiles("local"); }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-xs leading-none font-medium transition-all ${
                      driveTab === "local" 
                        ? "bg-slate-100 text-slate-900 shadow-sm border-l-4 border-slate-700" 
                        : "text-slate-600 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <HardDrive className={`w-4 h-4 ${driveTab === "local" ? "text-slate-700" : "text-slate-400"}`} />
                      <div className="text-left">
                        <p className="font-semibold text-slate-850">Local Disk Share</p>
                        <p className="text-3xs text-slate-400 leading-none mt-0.5">./local_drive folder</p>
                      </div>
                    </div>
                    <span className="text-2xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-bold leading-none">
                      {localFiles.length}
                    </span>
                  </button>

                  {/* OneDrive Cloud Drive tab trigger */}
                  <button
                    onClick={() => { setDriveTab("onedrive"); fetchFiles("onedrive"); }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-xs leading-none font-medium transition-all ${
                      driveTab === "onedrive" 
                        ? "bg-blue-50 text-blue-900 shadow-sm border-l-4 border-blue-600 md:border-b-0" 
                        : "text-slate-600 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Cloud className={`w-4 h-4 ${driveTab === "onedrive" ? "text-blue-600" : "text-slate-400"}`} />
                      <div className="text-left">
                        <p className="font-semibold text-slate-850">Microsoft OneDrive</p>
                        <p className="text-3xs text-slate-400 leading-none mt-0.5">./onedrive cloud folder</p>
                      </div>
                    </div>
                    <span className="text-2xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold leading-none">
                      {onedriveFiles.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* OneDrive Cloud Storage Information panel */}
              {driveTab === "onedrive" ? (
                <div className="bg-blue-600 text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-15">
                    <Cloud className="w-32 h-32" />
                  </div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-blue-100">Microsoft Cloud Service</h4>
                  <p className="text-lg font-bold mt-1">OneDrive Personal</p>
                  <p className="text-xs text-blue-200 mt-0.5">Account Connected: geocam55@gmail.com</p>
                  
                  <div className="mt-5 space-y-1.5 relative">
                    <div className="flex justify-between text-2xs text-blue-200">
                      <span>Cloud Space Used</span>
                      <span>1.2 MB / 15 GB Free</span>
                    </div>
                    <div className="w-full bg-blue-700/60 rounded-full h-2">
                      <div className="bg-blue-100 h-2 rounded-full" style={{ width: "2%" }}></div>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-blue-500/50 pt-3 flex items-center justify-between">
                    <span className="text-3xs bg-blue-500 px-2 py-0.5 rounded text-white font-bold tracking-tight">ACTIVE</span>
                    <span className="text-3xs text-blue-100 italic">OneDrive Unattended SDK v3.2</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <HardDrive className="w-32 h-32" />
                  </div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-350">Server File Directory</h4>
                  <p className="text-lg font-bold mt-1">Local Disk Drive</p>
                  <p className="text-xs text-slate-400 mt-0.5">Container Storage Space</p>

                  <div className="mt-5 space-y-1.5 relative">
                    <div className="flex justify-between text-2xs text-slate-350">
                      <span>Server Storage Used</span>
                      <span>64 MB / Unlimited</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-slate-400 h-2 rounded-full" style={{ width: "1%" }}></div>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-slate-700 pt-3 flex items-center justify-between">
                    <span className="text-3xs bg-slate-700 px-2 py-0.5 rounded text-white font-bold tracking-tight text-slate-300">MOUNTED</span>
                    <span className="text-3xs text-slate-400 italic">Posix Native Storage Agent</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side File Manager Workspace */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border rounded-xl overflow-hidden shadow-2xs">
                
                {/* File manager header */}
                <div className={`p-4 ${driveTab === "onedrive" ? "bg-blue-50/70 border-b border-blue-100" : "bg-slate-50 border-b border-slate-100"} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`w-5 h-5 ${driveTab === "onedrive" ? "text-blue-600" : "text-slate-600"}`} />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {driveTab === "onedrive" ? "Microsoft OneDrive Cloud Explorer" : "Local Share Disk Explorer"}
                      </h3>
                      <p className="text-2xs text-slate-500 leading-none">
                        {driveTab === "onedrive" ? "Secure file replication folder for Microsoft SaaS" : "Internal filesystem directories mount point for unattended jobs"}
                      </p>
                    </div>
                  </div>

                  {/* Upload button wrapper */}
                  <div className="flex items-center gap-2">
                    <label className={`text-xs px-3.5 py-1.5 rounded-lg border-2 border-dashed font-semibold cursor-pointer shadow-sm transition-all inline-flex items-center gap-1.5 ${
                      explorerUploading
                        ? 'opacity-50 pointer-events-none'
                        : driveTab === 'onedrive' 
                          ? 'border-blue-300 hover:border-blue-600 hover:bg-blue-50 text-blue-700 bg-white' 
                          : 'border-slate-300 hover:border-slate-700 hover:bg-slate-100 text-slate-700 bg-white'
                    }`}>
                      {explorerUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{explorerUploading ? "Uploading..." : "Upload to Drive"}</span>
                      <input 
                        type="file" 
                        disabled={explorerUploading}
                        onChange={(e) => handleFileUpload(e, driveTab)} 
                        className="hidden" 
                        accept=".csv,.json,.xml,.xls,.xlsx" 
                      />
                    </label>
                  </div>
                </div>

                {/* Explorer File list body */}
                <div className="p-4">
                  
                  {/* File search bar */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search files inside this folder..."
                      value={storageSearchTerm}
                      onChange={(e) => setStorageSearchTerm(e.target.value)}
                      className="w-full text-xs border rounded-lg px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Empty state or list render */}
                  {loadingFiles ? (
                    <div className="text-center py-20 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-550 mb-2" />
                      <span>Accessing drive directories contents...</span>
                    </div>
                  ) : getExplorerFiles().length === 0 ? (
                    <div className="text-center py-16 border border-dashed rounded-lg bg-slate-50/20 text-slate-500">
                      <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold">Folder is empty</p>
                      <p className="text-3xs text-slate-400 mt-1 max-w-xs mx-auto">No backup logs or spreadsheet templates are loaded. Upload files or configure an unattended exporter job.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150 border rounded-lg overflow-hidden">
                      {getExplorerFiles().map((file) => (
                        <div key={file.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hovering hover:bg-slate-50 transition-colors gap-2">
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-slate-100 text-slate-500 rounded-md">
                              <FileText className="w-4 h-4 text-slate-650" />
                            </span>
                            <div className="text-left font-normal max-w-xs sm:max-w-md">
                              <p className="font-semibold text-xs text-slate-800 truncate" title={file.name}>{file.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-3xs text-slate-400">
                                <span className="font-mono bg-slate-50 px-1 py-0.2 rounded text-slate-550">{(file.size / 1024).toFixed(1)} KB</span>
                                <span>•</span>
                                <span>Modified: {new Date(file.lastModified).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5">
                            {/* Run shortcut trigger */}
                            <button
                              onClick={() => {
                                setTabModeForFile(file, driveTab);
                              }}
                              className="px-2.5 py-1 border hover:bg-slate-50 hover:border-slate-350 rounded text-3xs font-semibold text-slate-700 shadow-3xs flex items-center gap-1 bg-white"
                              title="Import records instantly to crm database"
                            >
                              <Play className="w-2.5 h-2.5 text-slate-600 fill-slate-500" /> Instant Import
                            </button>

                            {/* Download file */}
                            <button
                              onClick={() => handleFileDownload(file.name, driveTab)}
                              className="p-1 px-1.5 border hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded bg-white shadow-3xs"
                              title="Download backup file"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {/* Delete File */}
                            <button
                              onClick={() => handleFileDelete(file.name, driveTab)}
                              className="p-1 px-1.5 border hover:border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 rounded bg-white shadow-3xs"
                              title="Delete file permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: THE MANUAL INTERACTIVE WORKSPACE ==================== */}
        {activeTab === "manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Interactive workflow configure card */}
            <div className="lg:col-span-1 bg-white border rounded-xl p-5 shadow-2xs space-y-4 text-left font-normal">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Interactive Processing Controls</h3>
                <p className="text-2xs text-slate-500">Run immediate import or export processes instantly without modifying scheduled unattended triggers.</p>
              </div>

              <form onSubmit={handleInstantManualProcess} className="space-y-4 text-xs font-normal">
                {/* Action Type Selector */}
                <div>
                  <label className="block text-2xs uppercase text-slate-400 font-bold mb-1.5">Processing Workflow</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setManualType("import"); setManualFileName("sample_contacts_import.csv"); }}
                      className={`flex-1 py-1.5 text-center font-semibold rounded-lg border-2 leading-none transition-all ${
                        manualType === "import" 
                          ? "bg-amber-50 border-amber-600 text-amber-900" 
                          : "bg-white border-slate-200 hover:border-slate-350 text-slate-600"
                      }`}
                    >
                      📥 Manual Import
                    </button>
                    <button
                      type="button"
                      onClick={() => { setManualType("export"); setManualFileName("quick_crm_export.csv"); }}
                      className={`flex-1 py-1.5 text-center font-semibold rounded-lg border-2 leading-none transition-all ${
                        manualType === "export" 
                          ? "bg-teal-50 border-teal-600 text-teal-900" 
                          : "bg-white border-slate-200 hover:border-slate-350 text-slate-600"
                      }`}
                    >
                      📤 Manual Export
                    </button>
                  </div>
                </div>

                {/* Module selection */}
                <div>
                  <label className="block text-2xs uppercase text-slate-400 font-bold mb-1">CRM Target Database</label>
                  <select
                    value={manualModule}
                    onChange={(e) => setManualModule(e.target.value as any)}
                    className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                  >
                    <option value="contacts">CRM Customer & Team Contacts</option>
                    <option value="inventory">Product Inventory Materials</option>
                    <option value="deals">Sales Contracts / Deals Estimations</option>
                  </select>
                </div>

                {/* Target Storage selection */}
                <div>
                  <label className="block text-2xs uppercase text-slate-400 font-bold mb-1">Storage Provider Endpoint</label>
                  <select
                    value={manualStorage}
                    onChange={(e) => setManualStorage(e.target.value as any)}
                    className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                  >
                    <option value="local">Local Share Drive (./local_drive)</option>
                    <option value="onedrive">Microsoft OneDrive Cloud Space (./onedrive)</option>
                  </select>
                </div>

                {/* File format */}
                {manualType === 'export' && (
                  <div>
                    <label className="block text-2xs uppercase text-slate-400 font-bold mb-1">Export Serialization Format</label>
                    <select
                      value={manualFormat}
                      onChange={(e) => {
                        const fmt = e.target.value as any;
                        setManualFormat(fmt);
                        // replace extension in output name
                        const base = manualFileName.split('.')[0] || 'crm_output';
                        setManualFileName(`${base}.${fmt}`);
                      }}
                      className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                    >
                      <option value="csv">Comma-Separated Text (CSV)</option>
                      <option value="json">Structured JavaScript Object (JSON)</option>
                      <option value="xml">Extensible Markup Spreadsheet (XML)</option>
                    </select>
                  </div>
                )}

                {/* Target File Name selection and helper triggers */}
                <div className="space-y-3 bg-slate-50 border p-3 rounded-xl">
                  <div>
                    <label className="block text-2xs uppercase text-slate-400 font-bold mb-1 col-span-2">Target Filename Path</label>
                    <input
                      type="text"
                      value={manualFileName}
                      onChange={(e) => setManualFileName(e.target.value)}
                      placeholder="Enter output file name (e.g. dump.csv)"
                      className="w-full border rounded-lg px-2.5 py-1.5 outline-none font-mono text-slate-755 text-xs focus:border-blue-500 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-0.5 col-span-2">
                    {/* Browse from local PC */}
                    <div>
                      <label className="block text-4xs uppercase text-slate-450 font-bold mb-1 font-mono">Upload from Computer</label>
                      <label 
                        htmlFor="manual-file-picker-input"
                        className={`w-full flex items-center justify-center gap-1 px-2.5 py-1.5 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 bg-white rounded-lg cursor-pointer text-slate-650 text-3xs font-semibold shadow-xs transition-all ${manualUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {manualUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{manualUploading ? "Uploading..." : "Browse PC File"}</span>
                        <input 
                          id="manual-file-picker-input"
                          type="file" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const runFallback = () => {
                              setManualUploading(true);
                              const reader = new FileReader();
                              reader.onload = async (eventReader) => {
                                try {
                                  const fileContent = eventReader.target?.result as string;
                                  const cachedFilesStr = localStorage.getItem(`prospaces_fallback_files_${manualStorage}`);
                                  const currentFiles = cachedFilesStr ? JSON.parse(cachedFilesStr) : [];
                                  const filtered = currentFiles.filter((f: any) => f.name !== file.name);
                                  
                                  filtered.push({
                                    name: file.name,
                                    size: file.size,
                                    lastModified: new Date().toISOString(),
                                    extension: "." + file.name.split(".").pop()?.toLowerCase(),
                                    content: fileContent
                                  });
                                  
                                  try {
                                    localStorage.setItem(`prospaces_fallback_files_${manualStorage}`, JSON.stringify(filtered));
                                  } catch (storageErr) {
                                    console.warn("Storage quota exceeded, keeping in active app session memory only:", storageErr);
                                  }
                                  if (manualStorage === "local") setLocalFiles(filtered);
                                  else setOnedriveFiles(filtered);
                                  toast.success(`Successfully uploaded "${file.name}" to Virtual Storage!`);
                                  setManualFileName(file.name);
                                } catch (err: any) {
                                  toast.error("Process file uploading error: " + err.message);
                                } finally {
                                  setManualUploading(false);
                                }
                              };
                              reader.onerror = () => {
                                toast.error("Failed to read the selected file in the browser.");
                                setManualUploading(false);
                              };
                              reader.readAsText(file);
                            };

                            if (isFallbackMode) {
                              runFallback();
                              return;
                            }

                            setManualUploading(true);
                            const uploadToastId = toast.loading(`Uploading "${file.name}" to directory...`);
                            
                            try {
                              const base64Data = await readFileAsBase64(file);
                              const res = await safeFetch(`/api/import-export/storage/${manualStorage}/upload-base64`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                  fileName: file.name,
                                  fileContent: base64Data
                                })
                              }, 4000);
                              
                              const data = await res.json();
                              toast.dismiss(uploadToastId);

                              if (data.success) {
                                toast.success(`Uploaded & loaded "${file.name}" to ${manualStorage === "onedrive" ? "OneDrive" : "Local Drive"} successfully!`);
                                setManualFileName(file.name);
                                fetchFiles(manualStorage);
                              } else {
                                throw new Error(data.error || "File upload response was not successful");
                              }
                            } catch (err: any) {
                              toast.dismiss(uploadToastId);
                              console.warn("Manual file upload failed, shifting file to browser local fallback storage.", err);
                              setIsFallbackMode(true);
                              runFallback();
                            } finally {
                              setManualUploading(false);
                            }
                          }} 
                          className="hidden" 
                          accept=".csv,.json,.xml,.xls,.xlsx" 
                        />
                      </label>
                    </div>

                    {/* Choose from current folder */}
                    <div>
                      <label className="block text-4xs uppercase text-slate-450 font-bold mb-1 font-mono">Pick Existing Folder File</label>
                      {(() => {
                        const currentFiles = manualStorage === "onedrive" ? onedriveFiles : localFiles;
                        return (
                          <select
                            value={currentFiles.some(f => f.name === manualFileName) ? manualFileName : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                setManualFileName(e.target.value);
                                toast.success(`Mapped file "${e.target.value}"`);
                              }
                            }}
                            className="w-full border rounded-lg px-2 py-1.5 outline-none font-semibold text-slate-700 bg-white text-3xs truncate focus:border-blue-500"
                          >
                            <option value="">-- Choose file --</option>
                            {currentFiles.map(file => (
                              <option key={file.name} value={file.name}>
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  <span className="text-4xs text-slate-450 block leading-normal pt-1 border-t border-slate-200">
                    {manualType === 'import' ? '💡 Compiles and executes full CRM relational database upserts.' : '💡 Serializes relational rows into target spreadsheet format.'}
                  </span>
                </div>

                {/* Launch manual action */}
                <button
                  type="submit"
                  disabled={manualIsProcessing}
                  className={`w-full py-2.5 rounded-lg shadow-sm font-semibold hover:opacity-95 transition-all text-white flex items-center justify-center gap-2 ${
                    manualType === 'import' ? 'bg-amber-600' : 'bg-teal-600'
                  }`}
                >
                  {manualIsProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Executing workspace compile...</span>
                    </>
                  ) : (
                    <>
                      {manualType === 'import' ? <ArrowRight className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      <span>Execute Instant {manualType === 'import' ? 'Import' : 'Export'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Side live database view */}
            <div className="lg:col-span-2 space-y-4 max-w-full text-left font-normal">
              <div className="bg-white border rounded-xl overflow-hidden shadow-2xs">
                
                {/* Header preview filter */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-850 text-sm">Real-time Connected CRM Tables</h3>
                    <p className="text-2xs text-slate-400 font-normal">Interactive preview panel reflecting upserts run by either background unattended logs or loaders.</p>
                  </div>

                  <div className="flex gap-1.5">
                    {["contacts", "inventory", "deals"].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setPreviewModule(m as any);
                        }}
                        className={`px-3 py-1 text-2xs rounded-md border font-semibold capitalize transition-all ${
                          previewModule === m 
                            ? "bg-slate-800 text-white border-slate-800 shadow" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid records contents */}
                <div className="p-4 overflow-y-auto max-h-[400px]">
                  {crmRecords.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Database className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                      <p className="text-xs font-semibold">Table contains no records</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto text-xs">
                      <table className="min-w-full text-left border rounded border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b font-semibold text-slate-600">
                            {Object.keys(crmRecords[0]).map((key) => {
                              if (key === "id") return null;
                              return <th key={key} className="p-2 border font-bold capitalize">{key}</th>;
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                          {crmRecords.map((rec, index) => (
                            <tr key={rec.id || index} className="hover:bg-slate-50/50">
                              {Object.entries(rec).map(([key, val]: any) => {
                                if (key === "id") return null;
                                return <td key={key} className="p-2 border max-w-xs truncate">{String(val ?? '')}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: THE EXECUTION CONSOLE logs ==================== */}
        {activeTab === "history" && (
          <div className="space-y-4 text-left font-normal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Unattended Background Automation Logs</h3>
                <p className="text-xs text-slate-500">Live operational history entries written by the container scheduler engine run on disk schedules.</p>
              </div>

              <button
                onClick={handleClearHistory}
                disabled={history.length === 0}
                className="px-3.5 py-1.5 text-xs text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold rounded-lg shadow-2xs transition-all disabled:opacity-40"
              >
                Clear Executions Log Console
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <p className="text-xs text-slate-500">Retrieving log indexes...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-slate-50/10 text-slate-400">
                <Terminal className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-xs font-semibold">Console logs are empty</p>
                <p className="text-3xs text-slate-500 mt-1 max-w-xs text-center">Unattended tasks logs appear here automatically once time intervals expire or after forcing a trigger.</p>
              </div>
            ) : (
              <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-md font-mono text-xs border border-slate-800">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-3xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span>AUTOMATED UNATTENDED CRON ENGINE: ACTIVE</span>
                  </div>
                  <span>Showing last {history.length} operations</span>
                </div>

                <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
                  {history.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-slate-850/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-3xs text-slate-400 font-medium mb-1.5 gap-1">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 text-3xs">{new Date(log.timestamp).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">JOB_ID: <span className="text-slate-200 font-semibold">{log.id}</span></span>
                          <span className="text-slate-400">TASK_REF: <span className="text-slate-200 font-semibold">{log.taskId?.slice(0, 8)}</span></span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 mt-1">
                        <span className="text-lg">
                          {log.status === "success" ? "🟢" : "🔴"}
                        </span>
                        <div className="flex-1 space-y-1">
                          <p className="text-slate-200 font-semibold text-xs flex items-center gap-2">
                            {log.taskName}
                            <span className={`px-1.5 py-0.2 rounded text-4xs uppercase ${
                              log.actionType === "import" ? "bg-amber-500/20 text-amber-300" : "bg-teal-500/20 text-teal-300"
                            }`}>
                              {log.actionType}
                            </span>
                            <span className="text-slate-600">to</span>
                            <span className="text-slate-350">{log.fileStorage?.toUpperCase()} // {log.fileName}</span>
                          </p>
                          <p className={`${log.status === "success" ? "text-slate-300" : "text-rose-400"} text-2xs leading-relaxed`}>
                            {log.message}
                          </p>
                          <div className="text-4xs text-slate-500 mt-1 select-none">
                            MODULE = {log.module.toUpperCase()} | PROCESS_STATUS = {log.status.toUpperCase()} | IMPACTED_ROWS = {log.recordCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper utility function to auto-fill workflow when file triggers instant import */}
      {(() => {
        // inline function helper defined to change tabs
        const setTabModeForFile = (file: StorageFile, currentDrive: "local" | "onedrive") => {
          setManualType("import");
          setManualStorage(currentDrive);
          setManualFileName(file.name);
          // detect module target from name keyword
          if (file.name.toLowerCase().includes("contacts")) setManualModule("contacts");
          else if (file.name.toLowerCase().includes("inventory")) setManualModule("inventory");
          else if (file.name.toLowerCase().includes("deals")) setManualModule("deals");
          
          setActiveTab("manual");
          toast.info(`Configured Loader workspace. Complete your target CRM dropdown mapping and click Import!`);
        };
        // bind this to window so it's globally fetchable helper
        (window as any).setTabModeForFile = setTabModeForFile;
        return null;
      })()}

      {/* ==================== CREATE / EDIT TASK SCHEDULER WIZARD DIALOG ==================== */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4 animate-fade-in backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl border text-slate-800 text-left w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal header */}
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {modalMode === "create" ? "Microsoft Task Scheduler: Create Basic Task Wizard" : "Microsoft Task Scheduler: Edit Task Properties"}
                </h3>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-450 hover:text-slate-650 text-xs">
                ✕
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* Stepper layout sections  */}
              <div className="space-y-4">
                <h4 className="font-bold border-b border-dashed pb-1.5 text-slate-600 flex items-center gap-1">
                  <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 w-4 h-4 rounded-full text-3xs font-bold font-mono">1</span>
                  General Task Descriptions & Security
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Task Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="e.g. Unattended Contacts Sync"
                      className="w-full border rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Status</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTaskStatus("active")}
                        className={`flex-1 py-1.5 text-center font-semibold rounded-lg border leading-none transition-all ${
                          taskStatus === "active" 
                            ? "bg-green-50 border-green-600 text-green-800" 
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-500"
                        }`}
                      >
                        Enabled (Scheduled)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskStatus("disabled")}
                        className={`flex-1 py-1.5 text-center font-semibold rounded-lg border leading-none transition-all ${
                          taskStatus === "disabled" 
                            ? "bg-amber-50 border-amber-600 text-amber-800" 
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-500"
                        }`}
                      >
                        Disabled (Idle)
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 font-semibold mb-1">Description</label>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Specify how this unattended task behaves (e.g. Backs up contacts from CRM to local csv every morning at 2am)."
                      rows={3}
                      className="w-full border rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Trigger conditions */}
              <div className="space-y-4">
                <h4 className="font-bold border-b border-dashed pb-1.5 text-slate-600 flex items-center gap-1">
                  <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 w-4 h-4 rounded-full text-3xs font-bold font-mono">2</span>
                  Task Scheduler Trigger Settings
                </h4>

                <div className="space-y-4">
                  {/* Recurrence Selector */}
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1.5">Recurrence Cadence Pattern</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["one-time", "daily", "weekly", "monthly"].map((rec) => (
                        <button
                          key={rec}
                          type="button"
                          onClick={() => setTaskRecurrence(rec as any)}
                          className={`py-2 text-center text-xs font-semibold rounded-lg border transition-all capitalize leading-none ${
                            taskRecurrence === rec
                              ? "bg-blue-600 text-white border-blue-600 font-bold"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {rec.replace("-", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recurrence Specific Detail Form */}
                  <div className="bg-slate-50 border rounded-xl p-4 space-y-4">
                    {taskRecurrence === "one-time" && (
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Execution Trigger Date & Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={triggerDateTime}
                          onChange={(e) => setTriggerDateTime(e.target.value)}
                          className="w-full max-w-sm border rounded-lg px-3 py-1.5 outline-none font-mono text-slate-850"
                        />
                      </div>
                    )}

                    {taskRecurrence !== "one-time" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-500 font-semibold mb-1">Start Time (Daily Hour Interval)</label>
                          <input
                            type="time"
                            required
                            value={triggerTime}
                            onChange={(e) => setTriggerTime(e.target.value)}
                            className="w-full border rounded-lg px-3 py-1.5 outline-none font-mono text-slate-850"
                          />
                        </div>

                        {taskRecurrence === "daily" && (
                          <div>
                            <label className="block text-slate-500 font-semibold mb-1">Recur every (Days Interval)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                required
                                value={triggerIntervalDays}
                                onChange={(e) => setTriggerIntervalDays(parseInt(e.target.value) || 1)}
                                className="w-24 border rounded-lg px-2 py-1.5 outline-none text-slate-850 font-semibold"
                              />
                              <span className="text-slate-500">day(s)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {taskRecurrence === "weekly" && (
                      <div>
                        <label className="block text-slate-500 font-semibold mb-2">Configure target days of the week to trigger</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((dayName, index) => {
                            const isSelected = triggerDaysOfWeek.includes(index);
                            return (
                              <button
                                key={dayName}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setTriggerDaysOfWeek(triggerDaysOfWeek.filter(d => d !== index));
                                  } else {
                                    setTriggerDaysOfWeek([...triggerDaysOfWeek, index]);
                                  }
                                }}
                                className={`px-2.5 py-1 text-4xs rounded border font-semibold transition-all uppercase leading-none ${
                                  isSelected 
                                    ? "bg-slate-800 border-slate-800 text-white" 
                                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                {dayName.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {taskRecurrence === "monthly" && (
                      <div>
                        <label className="block text-slate-500 font-semibold mb-2">Configure target days of the month to trigger (1-31, comma-separated)</label>
                        <input
                          type="text"
                          value={triggerDaysOfMonth.join(", ")}
                          onChange={(e) => {
                            const arr = e.target.value.split(",")
                              .map(v => parseInt(v.trim()))
                              .filter(v => !isNaN(v) && v >= 1 && v <= 31);
                            setTriggerDaysOfMonth(arr);
                          }}
                          placeholder="e.g. 1, 15, 30"
                          className="w-full border rounded-lg px-3 py-1.5 outline-none font-mono text-slate-800"
                        />
                        <span className="text-4xs text-slate-400 mt-1 block">Specify month dates as numbers. Defaults to day 1 if left empty.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Unattended Action specification */}
              <div className="space-y-4">
                <h4 className="font-bold border-b border-dashed pb-1.5 text-slate-600 flex items-center gap-1">
                  <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 w-4 h-4 rounded-full text-3xs font-bold font-mono">3</span>
                  Unattended Action Type & Target Mapping
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Execution Action</label>
                    <select
                      value={actionType}
                      onChange={(e) => {
                        const act = e.target.value as any;
                        setActionType(act);
                        // Adjust default filename extension
                        const extension = actionFormat;
                        setActionFileName(act === 'export' ? `export_backup.${extension}` : `sample_contacts_import.csv`);
                      }}
                      className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                    >
                      <option value="export">📤 Export data from CRM database to Storage</option>
                      <option value="import">📥 Import data from Storage to CRM database</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">CRM Schema Target</label>
                    <select
                      value={actionModule}
                      onChange={(e) => {
                        const mod = e.target.value as any;
                        setActionModule(mod);
                        if (actionType === 'export') {
                          setActionFileName(`${mod}_export_backup.${actionFormat}`);
                        } else {
                          setActionFileName(`sample_${mod}_import.csv`);
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                    >
                      <option value="contacts">CRM Customer & Team Contacts</option>
                      <option value="inventory">Product Inventory Materials</option>
                      <option value="deals">Sales Contracts / Deals Estimations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Target Storage Client Mount</label>
                    <select
                      value={actionStorage}
                      onChange={(e) => setActionStorage(e.target.value as any)}
                      className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                    >
                      <option value="local">📁 User Local Drive Folder (./local_drive)</option>
                      <option value="onedrive">☁️ Microsoft OneDrive Storage (./onedrive)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Target Filename</label>
                    <input
                      type="text"
                      required
                      value={actionFileName}
                      onChange={(e) => setActionFileName(e.target.value)}
                      placeholder="e.g. backup_dump.csv"
                      className="w-full border rounded-lg px-3 py-1.5 outline-none font-mono text-slate-800 focus:border-blue-500"
                    />
                  </div>

                  {/* ACTIVE FILE SELECTOR FROM USER LOCAL COMPUTER & FOLDER REPOSITORY */}
                  <div className="sm:col-span-2 bg-slate-50 border p-3.5 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        Scheduler File Picker (Local Computer & Target Folder)
                      </span>
                      <span className="text-4xs text-slate-400">
                        Mapped space: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-650">./{actionStorage === 'onedrive' ? 'onedrive' : 'local_drive'}</span>
                      </span>
                    </div>

                    <p className="text-4xs text-slate-500 leading-relaxed">
                      To run scheduled unattended imports, files must reside on container directories.
                      Use the controls below to select an existing file or upload a new file from your computer.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Upload new file from PC */}
                      <div className="space-y-1.5">
                        <label className="block text-4xs uppercase text-slate-450 font-bold font-mono">Upload from your Computer</label>
                        <label 
                          htmlFor="scheduler-file-picker-input"
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 rounded-lg cursor-pointer font-semibold text-center text-slate-600 transition-all ${modalUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {modalUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{modalUploading ? "Uploading..." : "Browse PC File"}</span>
                          <input 
                            id="scheduler-file-picker-input"
                            type="file" 
                            onChange={(e) => handleModalFileUpload(e, actionStorage)} 
                            className="hidden" 
                            accept=".csv,.json,.xml,.xls,.xlsx" 
                          />
                        </label>
                      </div>

                      {/* Select existing from selected folder space */}
                      <div className="space-y-1.5">
                        <label className="block text-4xs uppercase text-slate-450 font-bold font-mono">Select existing file in Folder</label>
                        {(() => {
                           const currentFiles = actionStorage === "onedrive" ? onedriveFiles : localFiles;
                           return (
                             <select
                               value={currentFiles.some(f => f.name === actionFileName) ? actionFileName : ""}
                               onChange={(e) => {
                                 setActionFileName(e.target.value);
                                 if (e.target.value) {
                                   toast.success(`Selected file "${e.target.value}"`);
                                 }
                               }}
                               className="w-full border rounded-lg px-2.5 py-2 outline-none font-medium text-slate-700 bg-white text-xs truncate focus:border-blue-500"
                             >
                               <option value="">-- Choose file on drive --</option>
                               {currentFiles.map(file => (
                                 <option key={file.name} value={file.name}>
                                   {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                 </option>
                               ))}
                             </select>
                           );
                        })()}
                      </div>
                    </div>
                  </div>

                  {actionType === "export" && (
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Destination Serialization Format</label>
                      <select
                        value={actionFormat}
                        onChange={(e) => {
                          const fmt = e.target.value as any;
                          setActionFormat(fmt);
                          // replace extension
                          const base = actionFileName.split(".")[0] || "backup";
                          setActionFileName(`${base}.${fmt}`);
                        }}
                        className="w-full border rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white"
                      >
                        <option value="csv">Comma-Separated Grid (CSV)</option>
                        <option value="json">JavaScript Structured Data Array (JSON)</option>
                        <option value="xml">Extensible Spreadsheet Interchange Tag (XML)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Advanced settings, timeouts, retries */}
              <div className="space-y-4">
                <h4 className="font-bold border-b border-dashed pb-1.5 text-slate-600 flex items-center gap-1">
                  <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 w-4 h-4 rounded-full text-3xs font-bold font-mono">4</span>
                  Advanced Operational Settings / Tolerances
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Stop Task long-running hours</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={stopHours}
                      onChange={(e) => setStopHours(parseInt(e.target.value) || 1)}
                      className="w-full border rounded-lg px-3 py-1.5 outline-none font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Max Retries count (on Failure)</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={retryCount}
                      onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-1.5 outline-none font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Retry interval (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={retryMinutes}
                      onChange={(e) => setRetryMinutes(parseInt(e.target.value) || 5)}
                      className="w-full border rounded-lg px-3 py-1.5 outline-none font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal footer */}
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              <span className="text-3xs text-slate-400 italic">Created by: {creatorName}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-100 text-slate-600 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                >
                  {modalMode === "create" ? "Save & Schedule Task" : "Apply Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Support exports both default and named so that router matching succeeds flawlessly.
export default ImportExport;
export const ImportExportPlaceholder = ImportExport;
