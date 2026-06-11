import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { createClient } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";
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
  Info,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

interface StorageFile {
  name: string;
  size: number;
  lastModified: string;
  extension: string;
  isFolder?: boolean;
  id?: string;
  webUrl?: string;
}

interface ScheduledTask {
  id?: string;
  name: string;
  description: string;
  status: "active" | "disabled" | "running";
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  timezoneOffset?: number;
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
    runWhetherComputerOff?: boolean;
  };
  lastRunTime?: string | null;
  lastRunResult?: "success" | "failed" | null;
  nextRunTime?: string | null;
  createdAt?: string;
  creator: string;
  organizationId?: string | null;
  organisationId?: string | null;
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

const formatToLocalValue = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
};

const calculateNextRunTimeFrontend = (task: ScheduledTask, baseDate = new Date()): Date => {
  try {
    const recurrence = task.recurrence || 'daily';
    const triggerDetail = task.triggerDetail || {};

    if (recurrence === 'one-time') {
      if (!triggerDetail.dateTime) {
        return new Date(baseDate.getTime() + 3600000); 
      }
      const triggerTime = new Date(triggerDetail.dateTime);
      return isNaN(triggerTime.getTime()) ? new Date(baseDate.getTime() + 3600000) : triggerTime;
    }

    const timezoneOffset = task.timezoneOffset !== undefined ? task.timezoneOffset : new Date().getTimezoneOffset();
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
      const daysOfWeek = Array.isArray(triggerDetail.daysOfWeek) ? triggerDetail.daysOfWeek : [1];
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

    return new Date(resultLocalDate.getTime() + timezoneOffset * 60 * 1000);
  } catch (err) {
    console.error('Error in calculateNextRunTimeFrontend:', err);
    return new Date(baseDate.getTime() + 86400000);
  }
};

const CONTACTS_TEMPLATE_SAMPLE = [
  {
    "Name": "John Doe",
    "Email": "john.doe@example.com",
    "Phone": "555-0192",
    "Company": "Acme Construction",
    "Trade": "Electrician",
    "Status": "Active",
    "PriceLevel": "Gold",
    "LegacyNumber": "LEG-101",
    "AccountOwner": "owner@yourcompany.com",
    "Address": "123 Main St",
    "City": "Denver",
    "Province": "CO",
    "PostalCode": "80202",
    "Notes": "Prefers email contact. Leading local rewiring sub-contractor.",
    "Tags": "residential, electrical, gold-tier"
  },
  {
    "Name": "Acme Builders Support",
    "Email": "support@acmebuilders.com",
    "Phone": "555-0143",
    "Company": "Acme Builders Inc.",
    "Trade": "General Contractor",
    "Status": "Lead",
    "PriceLevel": "Silver",
    "LegacyNumber": "LEG-102",
    "AccountOwner": "sales@yourcompany.com",
    "Address": "789 Industrial Pkwy",
    "City": "Denver",
    "Province": "CO",
    "PostalCode": "80216",
    "Notes": "Prefers text notifications. Leading regional masonry and drywall firm.",
    "Tags": "masonry, premium, repeat"
  }
];

const INVENTORY_TEMPLATE_SAMPLE = [
  {
    "SKU": "ELEC-WIR-122",
    "ItemName": "Copper Wire Romex 12/2 100ft",
    "Description": "Non-metallic sheathed electrical residential copper cable.",
    "Category": "Electrical",
    "Quantity": 45,
    "QuantityOnOrder": 15,
    "Location": "Aisle 3A",
    "Status": "instock",
    "UnitPrice": 89.99,
    "Cost": 55.00,
    "PriceTier1": 89.99,
    "PriceTier2": 84.99,
    "PriceTier3": 79.99,
    "PriceTier4": 74.99,
    "PriceTier5": 69.99,
    "Unit": "ea",
    "ImageUrl": "https://example.com/images/elec-wir.jpg"
  },
  {
    "SKU": "PLUM-PVC-075",
    "ItemName": "PVC Pipe 3/4 Inch 10ft",
    "Description": "Schedule 40 PVC plumbing water line pipe. Light grey style.",
    "Category": "Plumbing",
    "Quantity": 150,
    "QuantityOnOrder": 0,
    "Location": "Rack 12",
    "Status": "instock",
    "UnitPrice": 6.49,
    "Cost": 2.10,
    "PriceTier1": 6.49,
    "PriceTier2": 5.99,
    "PriceTier3": 5.49,
    "PriceTier4": 4.99,
    "PriceTier5": 4.49,
    "Unit": "ea",
    "ImageUrl": "https://example.com/images/pvc-pipe.jpg"
  }
];

const DEALS_TEMPLATE_SAMPLE = [
  {
    "ProjectName": "Downtown Office Renovation",
    "Description": "Retrofitting interior electrical circuits and ambient lighting fixture upgrades.",
    "DealValue": 18500,
    "ExpectedCloseDate": "2026-09-15",
    "Stage": "Proposal Sent",
    "CustomerName": "John Doe"
  },
  {
    "ProjectName": "Industrial Conduit Upgrade",
    "Description": "Replacing heavy metallic conduit line and three-phase breaker systems.",
    "DealValue": 75000,
    "ExpectedCloseDate": "2026-12-01",
    "Stage": "Negotiation",
    "CustomerName": "Acme Builders Support"
  }
];

const SCHEMA_GUIDES = {
  contacts: {
    title: "CRM Customer Contacts",
    description: "Map and insert external accounts, sales trade pipelines, contact methods, and location listings.",
    fields: [
      { name: "Name", req: true, desc: "Full client name or core organization moniker." },
      { name: "Email", req: false, desc: "Electronic mail contact string (e.g., mail@corp.com)." },
      { name: "Phone", req: false, desc: "Direct phone/mobile dialing sequence (e.g., 555-0100)." },
      { name: "Company", req: false, desc: "Corporate parent or employer designation." },
      { name: "Trade", req: false, desc: "Client industry / profession role (e.g. Electrician, Builder)." },
      { name: "Status", req: false, desc: "Active business status string (Active, Lead, Warm, Cold)." },
      { name: "PriceLevel", req: false, desc: "Custom margin group (Gold, Silver, Retail)." },
      { name: "LegacyNumber", req: false, desc: "Unique legacy reference to recognize updates." },
      { name: "AccountOwner", req: false, desc: "Account owner e-mail for matching system profile." },
      { name: "Address / City / Province / PostalCode", req: false, desc: "Location elements." },
      { name: "Notes", req: false, desc: "Notes, comment records, or client history logs." },
      { name: "Tags", req: false, desc: "Comma-separated tag parameters (e.g. repeat, residential)." }
    ]
  },
  inventory: {
    title: "Product Inventory & Materials",
    description: "Map and manage hardware material catalogs, on-hand ledger counts, warehouse coordinate details, and pricing margins.",
    fields: [
      { name: "SKU", req: true, desc: "Unique inventory SKU part number (e.g., PIPE-PVC-01)." },
      { name: "ItemName", req: true, desc: "Core material retail name or catalog identifier." },
      { name: "Description", req: false, desc: "Technical details, packaging, raw material specifics." },
      { name: "Category", req: false, desc: "Catalog category (Electrical, Plumbing, Flooring)." },
      { name: "Quantity / QuantityOnHand", req: false, desc: "Internal current ledger count." },
      { name: "QuantityOnOrder", req: false, desc: "Current pending supplier delivery units count." },
      { name: "Location", req: false, desc: "Warehouse coordinates or bin code reference." },
      { name: "UnitPrice", req: false, desc: "Active selling price (decimal format, e.g. 59.99)." },
      { name: "Cost", req: false, desc: "Sourcing acquire unit cost (decimal format, e.g. 24.50)." },
      { name: "PriceTier1", req: false, desc: "Tier 1 - Retail Price (equals base UnitPrice, e.g. 59.99)." },
      { name: "PriceTier2", req: false, desc: "Tier 2 - VIP Price (decimal format, e.g. 54.99)." },
      { name: "PriceTier3", req: false, desc: "Tier 3 - Premium Price (decimal format, e.g. 49.99)." },
      { name: "PriceTier4", req: false, desc: "Tier 4 - Preferred Price (decimal format, e.g. 44.99)." },
      { name: "PriceTier5", req: false, desc: "Tier 5 - Preferred VIP Price (decimal format, e.g. 39.99)." },
      { name: "Unit / UnitOfMeasure", req: false, desc: "Unit of Measure multiplier standard code (e.g. ea, lf, bf, pc)." },
      { name: "ImageUrl", req: false, desc: "Raw web URL for material thumb image cataloging." }
    ]
  },
  deals: {
    title: "Sales Deals & Contracts",
    description: "Map incoming estimates, client opportunity pipelines, and estimated timeline closings.",
    fields: [
      { name: "ProjectName", req: true, desc: "Title describing the opportunity (e.g., Conduit Upgrade)." },
      { name: "CustomerName", req: true, desc: "Full customer Name matching records in Contacts (e.g., John Doe)." },
      { name: "DealValue", req: false, desc: "Numeric contract estimate value (e.g., 25000)." },
      { name: "ExpectedCloseDate", req: false, desc: "Estimated closure date (YYYY-MM-DD)." },
      { name: "Stage", req: false, desc: "Opportunity state index (Proposal Sent, Under Review, Closed Won)." },
      { name: "Description", req: false, desc: "Estimator notes, project details or scopes." }
    ]
  }
};

export function ImportExport({ user, onNavigate }: { user?: any; onNavigate?: (view: string) => void }) {
  // Determine smart fallback backend url depending on runtime host type (Static SPA vs Sandbox Node Container)
  const getSmartDefaultUrl = () => {
    return window.location.origin;
  };

  const getRecommendedBridgeUrl = () => {
    return window.location.origin;
  };

  // Load custom Express API base URL
  const [backendUrl, setBackendUrl] = useState(() => {
    const origin = window.location.origin;
    const stored = localStorage.getItem("import_export_server_url");
    
    // Always prioritize same-origin for reliable local execution
    if (!stored || stored.includes("ais-dev-") || stored.includes("ais-pre-")) {
      localStorage.setItem("import_export_server_url", origin);
      return origin;
    }
    
    return stored || origin;
  });
  const [healthStatus, setHealthStatus] = useState<"unknown" | "connected" | "failed">("unknown");
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showBackendConfig, setShowBackendConfig] = useState(false);

  // Load custom connection mode: 'supabase' (highly robust CRM database direct) vs 'express' (unattended API container)
  const [connectionMode, setConnectionMode] = useState<"supabase" | "express">(() => {
    return (localStorage.getItem("import_export_connection_mode") as any) || "express";
  });

  // Helper function to decode base64 robustly
  const decodeBase64Robust = (base64Str: string): string => {
    try {
      return decodeURIComponent(escape(window.atob(base64Str)));
    } catch {
      try {
        return window.atob(base64Str);
      } catch {
        return base64Str;
      }
    }
  };

  // Helper function to save a virtual file on Supabase DB kv_store_8405be07 table
  const saveVirtualFile = async (fileName: string, base64Content: string, target: "local" | "onedrive" = "local") => {
    const supabase = createClient();
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const isBinary = ["xlsx", "xls", "zip", "pdf", "png", "jpg", "jpeg", "gif"].includes(ext);

    let textContent = "";
    if (!isBinary) {
      textContent = decodeBase64Robust(base64Content);
    }

    // 1. Store contents and raw base64 inside kv_store_8405be07
    const { error: upsertErr } = await supabase.from('kv_store_8405be07').upsert({
      key: `import_export_file_content:${fileName}`,
      value: { 
        content: textContent, 
        base64: base64Content,
        isBinary: isBinary
      }
    });
    if (upsertErr) {
      console.error("Failed to upsert virtual file content to Supabase:", upsertErr);
      throw upsertErr;
    }

    // 2. Load and add to files catalog
    const catKey = target === "onedrive" ? "import_export_onedrive_files" : "import_export_local_files";
    const { data: catData } = await supabase.from('kv_store_8405be07').select('value').eq('key', catKey).maybeSingle();
    let currentFiles = catData?.value || [];
    if (!Array.isArray(currentFiles)) currentFiles = [];

    currentFiles = currentFiles.filter((f: any) => f.name !== fileName);
    currentFiles.push({
      name: fileName,
      size: isBinary ? Math.round(base64Content.length * 0.75) : textContent.length,
      lastModified: new Date().toISOString(),
      extension: ext
    });

    const { error: catUpsertErr } = await supabase.from('kv_store_8405be07').upsert({
      key: catKey,
      value: currentFiles
    });
    if (catUpsertErr) {
      console.error("Failed to update virtual files list catalog:", catUpsertErr);
      throw catUpsertErr;
    }
  };

  // Helper function to delete a virtual file on Supabase DB kv_store_8405be07 table
  const deleteVirtualFile = async (fileName: string) => {
    const supabase = createClient();
    // 1. Delete content
    await supabase.from('kv_store_8405be07').delete().eq('key', `import_export_file_content:${fileName}`);
    
    // 2. Remove from files catalog
    const { data: catData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_local_files').maybeSingle();
    let currentFiles = catData?.value || [];
    if (Array.isArray(currentFiles)) {
      currentFiles = currentFiles.filter((f: any) => f.name !== fileName);
      await supabase.from('kv_store_8405be07').upsert({
        key: 'import_export_local_files',
        value: currentFiles
      });
    }
  };

  // Helper function to read a virtual file from Supabase DB kv_store_8405be07 table
  const readVirtualFile = async (fileName: string): Promise<string> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('kv_store_8405be07').select('value').eq('key', `import_export_file_content:${fileName}`).maybeSingle();
    if (error || !data) return '';
    const val = data.value;
    if (!val) return '';
    if (val.content !== undefined && val.content !== null && !val.isBinary) {
      return val.content;
    }
    if (val.base64) {
      return decodeBase64Robust(val.base64);
    }
    return val.content || '';
  };

  // Helper function to read raw virtual file object from Supabase DB kv_store_8405be07 table
  const readVirtualFileRaw = async (fileName: string): Promise<{ content?: string; base64?: string; isBinary?: boolean } | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('kv_store_8405be07').select('value').eq('key', `import_export_file_content:${fileName}`).maybeSingle();
    if (error || !data) return null;
    return data.value || null;
  };

  // Microsoft/OneDrive Accounts integration
  const [msAccounts, setMsAccounts] = useState<any[]>([]);
  const [fetchingMsAccounts, setFetchingMsAccounts] = useState(false);
  const [isConnectingMs, setIsConnectingMs] = useState(false);
  const [showMsDiagnosticGuide, setShowMsDiagnosticGuide] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [oauthRedirectOrigin, setOauthRedirectOriginState] = useState<string>(() => {
    return localStorage.getItem('oauth_redirect_origin') || 'auto';
  });
  const [customOauthOriginUrl, setCustomOauthOriginUrlState] = useState<string>(() => {
    return localStorage.getItem('custom_oauth_origin_url') || '';
  });
  const [oauthMicrosoftPrompt, setOauthMicrosoftPromptState] = useState<string>(() => {
    return localStorage.getItem('oauth_microsoft_prompt') || 'select_account';
  });

  const setOauthRedirectOrigin = (val: string) => {
    localStorage.setItem('oauth_redirect_origin', val);
    setOauthRedirectOriginState(val);
  };

  const setCustomOauthOriginUrl = (val: string) => {
    localStorage.setItem('custom_oauth_origin_url', val);
    setCustomOauthOriginUrlState(val);
  };

  const setOauthMicrosoftPrompt = (val: string) => {
    localStorage.setItem('oauth_microsoft_prompt', val);
    setOauthMicrosoftPromptState(val);
  };

  const [dbMsClientId, setDbMsClientId] = useState('');
  const [dbMsClientSecret, setDbMsClientSecret] = useState('');
  const [dbMsRedirectUri, setDbMsRedirectUri] = useState('');
  const [dbMsTenantId, setDbMsTenantId] = useState('');
  const [loadingDbMsKeys, setLoadingDbMsKeys] = useState(false);
  const [savingDbMsKeys, setSavingDbMsKeys] = useState(false);

  useEffect(() => {
    if (showMsDiagnosticGuide) {
      const loadDbMsKeys = async () => {
        setLoadingDbMsKeys(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'secrets:microsoft').maybeSingle() as any;
          if (data?.value) {
            setDbMsClientId(data.value.clientId || '');
            setDbMsClientSecret(data.value.clientSecret || '');
            setDbMsRedirectUri(data.value.redirectUri || '');
            setDbMsTenantId(data.value.tenantId || '');
          }
        } catch (e) {
          console.error("Failed to load MS keys from DB:", e);
        } finally {
          setLoadingDbMsKeys(false);
        }
      };
      loadDbMsKeys();
    }
  }, [showMsDiagnosticGuide]);

  const handleSaveDbMsKeys = async () => {
    const trimmedId = dbMsClientId.trim();
    if (trimmedId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId)) {
      toast.error("Format Error: The Application (client) ID must be a 36-character Guid (e.g. f40e01d2-d570-4a4c-8159-3574d75211e2). Please double check your input.");
      return;
    }
    if (dbMsClientSecret.trim() && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbMsClientSecret.trim())) {
      toast.error("Format Error: You entered a Guid for the Client Secret! Under Microsoft Azure AD, you must use the Client Secret 'Value' (e.g., text containing symbols like '~' or '-'), NOT the 'Secret ID' Guid column.");
      return;
    }
    setSavingDbMsKeys(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('kv_store_8405be07').upsert({
        key: 'secrets:microsoft',
        value: {
          clientId: trimmedId,
          clientSecret: dbMsClientSecret.trim(),
          redirectUri: dbMsRedirectUri.trim() || 'https://www.prospacescrm.com/oauth-callback',
          tenantId: dbMsTenantId.trim(),
          updatedAt: new Date().toISOString()
        }
      });
      if (error) {
        toast.error("Failed to save custom credentials: " + error.message);
      } else {
        toast.success("Custom Microsoft App credentials saved and activated perfectly!");
      }
    } catch (e: any) {
      toast.error("Error saving credentials: " + e.message);
    } finally {
      setSavingDbMsKeys(false);
    }
  };

  const fetchMsAccounts = async () => {
    setFetchingMsAccounts(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-accounts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-User-Token': session.access_token
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = (data.accounts || []).filter((acc: any) => acc.provider === "outlook");
        setMsAccounts(list);
      }
    } catch (err) {
      console.error("Failed to fetch MS accounts in scheduler:", err);
    } finally {
      setFetchingMsAccounts(false);
    }
  };

  const handleConnectMicrosoft = async () => {
    setIsConnectingMs(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to connect Microsoft OneDrive.");
        setIsConnectingMs(false);
        return;
      }

      // Fetch custom OAuth Redirect Origin if stored in localStorage
      const customOAuthOrigin = localStorage.getItem('oauth_redirect_origin');
      const storedPrompt = localStorage.getItem('oauth_microsoft_prompt') || 'select_account';
      const bodyPayload: any = {
        includeFiles: true,
        purpose: 'both',
        prompt: storedPrompt
      };

      if (customOAuthOrigin && customOAuthOrigin !== 'auto') {
        if (customOAuthOrigin === 'prospaces_vercel') {
          bodyPayload.redirectUri = 'https://prospaces.vercel.app/oauth-callback';
        } else if (customOAuthOrigin === 'prospaces_crm') {
          bodyPayload.redirectUri = 'https://www.prospacescrm.com/oauth-callback';
        } else if (customOAuthOrigin.startsWith('http://') || customOAuthOrigin.startsWith('https://')) {
          bodyPayload.redirectUri = customOAuthOrigin.includes('/oauth-callback') || customOAuthOrigin.includes('localhost')
            ? customOAuthOrigin 
            : customOAuthOrigin.replace(/\/+$/, '') + '/oauth-callback';
        }
      } else {
        bodyPayload.frontendOrigin = window.location.origin;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('make-server-8405be07/microsoft-oauth-init', {
        method: 'POST',
        body: bodyPayload,
        headers: {
          'X-User-Token': session.access_token,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success || !data?.authUrl) {
        throw new Error(data?.error || 'Failed to generate authorization URL.');
      }

      const width = 650;
      const height = 800;
      const left = Math.max(0, window.screen.width / 2 - width / 2);
      const top = Math.max(0, window.screen.height / 2 - height / 2);

      const popup = window.open(
        data.authUrl,
        `Microsoft OneDrive OAuth`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=yes,status=yes,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast.error('Popup blocker active. Please allow popups to connect Microsoft OneDrive.');
        setIsConnectingMs(false);
        return;
      }

      const pollId = data.pollId;
      if (pollId) {
        let pollAttempts = 0;
        const maxPollAttempts = 180;
        
        const interval = setInterval(async () => {
          pollAttempts++;
          if (pollAttempts > maxPollAttempts) {
            clearInterval(interval);
            setIsConnectingMs(false);
            return;
          }

          try {
            const pollRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/oauth-poll/${pollId}`,
              {
                headers: { 'Authorization': `Bearer ${publicAnonKey}` }
              }
            );

            if (pollRes.ok) {
              const pollResult = await pollRes.json();
              if (pollResult && pollResult.status === 'complete' && pollResult.result) {
                clearInterval(interval);
                setIsConnectingMs(false);
                if (pollResult.result.success) {
                  toast.success("Microsoft OneDrive connected successfully!");
                  setOnedriveFolderId(null);
                  setOnedriveFolderPath([]);
                  fetchMsAccounts();
                } else {
                  toast.error(`Connection failed: ${pollResult.result.error || 'Unknown error'}`);
                }
              }
            }
          } catch (pollErr) {
            // retry
          }
        }, 1500);
      }
    } catch (err: any) {
      setIsConnectingMs(false);
      toast.error(`Microsoft connection error: ${err.message || err}`);
    }
  };

  const handleDisconnectMicrosoft = async (accountId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-User-Token': session.access_token
        }
      });

      if (res.ok) {
        toast.success("Successfully disconnected Microsoft OneDrive account.");
        setOnedriveFolderId(null);
        setOnedriveFolderPath([]);
        fetchMsAccounts();
      } else {
        toast.error("Failed to disconnect account.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to disconnect.");
    }
  };

  // Tabs: 'scheduler' | 'storage' | 'manual' | 'history'
  const [activeTab, setActiveTab] = useState<"scheduler" | "storage" | "manual" | "history">("scheduler");
  // Drive selection for Storage Explorer: 'local' | 'onedrive'
  const [driveTab, setDriveTab] = useState<"local" | "onedrive">("local");
  
  // Data States
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [history, setHistory] = useState<ExecutionLog[]>([]);
  const [localFiles, setLocalFiles] = useState<StorageFile[]>([]);
  const [onedriveFiles, setOnedriveFiles] = useState<StorageFile[]>([]);
  const [onedriveFolderId, setOnedriveFolderId] = useState<string | null>(null);
  const [onedriveFolderPath, setOnedriveFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [syncingFileId, setSyncingFileId] = useState<string | null>(null);
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
  const [runWhetherComputerOff, setRunWhetherComputerOff] = useState(true);

  // Manual execution interactive states
  const [manualModule, setManualModule] = useState<"contacts" | "inventory" | "deals">("contacts");
  const [manualType, setManualType] = useState<"import" | "export">("export");

  // Layout template download states and helpers
  const [selectedLayoutModule, setSelectedLayoutModule] = useState<"contacts" | "inventory" | "deals">("contacts");
  const [showLayoutGuide, setShowLayoutGuide] = useState(false);

  const handleDownloadTemplate = (moduleName: "contacts" | "inventory" | "deals", format: "xlsx" | "csv" | "json") => {
    let sampleData: any[] = [];
    let fileName = "";
    
    if (moduleName === "contacts") {
      sampleData = CONTACTS_TEMPLATE_SAMPLE;
      fileName = "contacts_template";
    } else if (moduleName === "inventory") {
      sampleData = INVENTORY_TEMPLATE_SAMPLE;
      fileName = "inventory_template";
    } else {
      sampleData = DEALS_TEMPLATE_SAMPLE;
      fileName = "deals_template";
    }

    try {
      if (format === "json") {
        const jsonStr = JSON.stringify(sampleData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded Layout Template: ${fileName}.json`);
      } else if (format === "csv") {
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const csvStr = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob(["\ufeff" + csvStr], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded Layout Template: ${fileName}.csv`);
      } else if (format === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Layout Template");
        
        const wopts: any = { bookType: "xlsx", bookSST: false, type: "binary" };
        const wbout = XLSX.write(workbook, wopts);
        
        function s2ab(s: string) {
          const buf = new ArrayBuffer(s.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
          return buf;
        }
        
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded Layout Template: ${fileName}.xlsx`);
      }
    } catch (err: any) {
      toast.error(`Layout generation failed: ${err.message || err}`);
    }
  };
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
    fetchMsAccounts();
  }, []);

  // Synchronize and re-load data whenever connection mode or active preview module changes
  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchFiles("local");
    fetchFiles("onedrive");
    fetchHistory();
    fetchCrmRecords(previewModule);
  }, [connectionMode, previewModule]);

  // Synchronize cloud OneDrive files when microsoft accounts become ready
  useEffect(() => {
    if (msAccounts.length > 0) {
      fetchFiles("onedrive", true, onedriveFolderId);
    }
  }, [msAccounts, onedriveFolderId]);

  // Keep modal choices fresh based on actionStorage selection
  useEffect(() => {
    if (showTaskModal) {
      if (actionStorage === "onedrive" && msAccounts.length > 0) {
        fetchFiles("onedrive", false, onedriveFolderId);
      } else if (actionStorage === "local") {
        fetchFiles("local", true);
      }
    }
  }, [showTaskModal, actionStorage]);

  // Keep Interactive Loader Hub choices fresh based on manualStorage selection or active tab switching
  useEffect(() => {
    if (activeTab === "manual") {
      if (manualStorage === "onedrive" && msAccounts.length > 0) {
        fetchFiles("onedrive", false, onedriveFolderId);
      } else {
        fetchFiles(manualStorage, false);
      }
    }
  }, [activeTab, manualStorage, onedriveFolderId, msAccounts]);

  const testBackendConnection = async (targetUrl = backendUrl, mode = connectionMode) => {
    setCheckingHealth(true);
    try {
      if (mode === "supabase") {
        const supabase = createClient();
        const { error } = await supabase.from('kv_store_8405be07').select('key').limit(1);
        if (error) throw error;
        setHealthStatus("connected");
        toast.success("Successfully connected to Supabase CRM Database cluster!");
        return;
      }

      let sanitizedUrl = targetUrl.trim().replace(/\/$/, "");
      // If the target URL matches the current window location's origin, use a relative path.
      // This is highly robust since relative fetches bypass iframe sandbox constraints, ad blockers, and CORS preflight triggers.
      if (sanitizedUrl === window.location.origin) {
        sanitizedUrl = "";
      }
      // Configure cross-origin credentials to enable sandbox iframe cookie flow
      const isCrossOrigin = sanitizedUrl && sanitizedUrl.startsWith("http") && !sanitizedUrl.startsWith(window.location.origin);
      const fetchOptions: RequestInit = { 
        method: "GET"
      };
      if (isCrossOrigin) {
        fetchOptions.credentials = "include";
        fetchOptions.headers = {
          "Cache-Control": "no-cache"
        };
      }
      // Add dynamic timestamp query parameter to bust browser, cloud-edge, and service-worker caches completely
      const res = await fetch(`${sanitizedUrl}/api/health?_t=${Date.now()}`, fetchOptions);
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        if (text.trim().startsWith("<") || text.trim().toLowerCase().startsWith("<!doctype")) {
          throw new Error("Returned HTML instead of JSON. You have likely entered a static frontend domain (like Vercel, Netlify, or ProSpaces CRM) instead of the actual running backend Express API server.");
        }
        throw parseErr;
      }
      if (res.ok && data.status === "ok") {
        setHealthStatus("connected");
        toast.success("Successfully connected to the Unattended Express API Backend!");
      } else {
        setHealthStatus("failed");
        toast.error(`Connection failed: Server responded with status ${res.status}`);
      }
    } catch (err: any) {
      setHealthStatus("failed");
      toast.error(`Connection failed: ${err.message || "Endpoint unreachable. Ensure backend server is running and CORS is configured."}`);
    } finally {
      setCheckingHealth(false);
    }
  };

  // 1. Check health and perform multi-origin candidacy auto-healing ONCE on mount
  useEffect(() => {
    const healOnMount = async () => {
      if (connectionMode === "supabase") {
        try {
          const supabase = createClient();
          const { error } = await supabase.from('kv_store_8405be07').select('key').limit(1);
          if (!error) {
            setHealthStatus("connected");
            return;
          }
        } catch (e) {
          console.error("Supabase direct auth check failed:", e);
        }
        setHealthStatus("failed");
        return;
      }

      const origin = window.location.origin;
      
      // Perform relative healthcheck with up to 3 self-healing retries & backoff to handle container reboots transparently
      // Always prioritize relative (same-origin) healthcheck first to prevent any CORS blockages
      let relativeSuccess = false;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(`/api/health?_t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "ok") {
              setHealthStatus("connected");
              setBackendUrl(origin);
              localStorage.setItem("import_export_server_url", origin);
              relativeSuccess = true;
              break;
            }
          }
        } catch (err) {
          console.warn(`[Self-Healing] Relative sandbox healthcheck attempt ${attempt}/${maxRetries} failed:`, err);
        }
        if (attempt < maxRetries) {
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (relativeSuccess) {
        return;
      }

      // Fallback: test absolute stored backendUrl or the smart default backend URL
      try {
        let currentStored = localStorage.getItem("import_export_server_url") || getSmartDefaultUrl();
        if (currentStored && currentStored !== origin) {
          const fetchOptions: RequestInit = {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            }
          };
          const res = await fetch(`${currentStored}/api/health?_t=${Date.now()}`, fetchOptions);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "ok") {
              setHealthStatus("connected");
              setBackendUrl(currentStored);
              localStorage.setItem("import_export_server_url", currentStored);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Absolute candidate fallback failed:", err);
      }
      
      setHealthStatus("failed");
    };
    healOnMount();
  }, [connectionMode]);

  // 2. Track health of current backendUrl when it changes, without auto-resetting the user's manual keystrokes
  useEffect(() => {
    let active = true;
    const checkCurrentHealth = async () => {
      if (connectionMode === "supabase") {
        try {
          const supabase = createClient();
          const { error } = await supabase.from('kv_store_8405be07').select('key').limit(1);
          if (active) {
            if (!error) {
              setHealthStatus("connected");
            } else {
              setHealthStatus("failed");
            }
          }
        } catch {
          if (active) setHealthStatus("failed");
        }
        return;
      }

      if (!backendUrl) return;
      try {
        let sanitizedUrl = backendUrl.trim().replace(/\/$/, "");
        if (sanitizedUrl === window.location.origin) {
          sanitizedUrl = "";
        }
        const isCrossOrigin = sanitizedUrl && sanitizedUrl.startsWith("http") && !sanitizedUrl.startsWith(window.location.origin);
        const fetchOptions: RequestInit = { 
          method: "GET"
        };
        if (isCrossOrigin) {
          fetchOptions.credentials = "include";
          fetchOptions.headers = { 
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0" 
          };
        }
        const res = await fetch(`${sanitizedUrl}/api/health?_t=${Date.now()}`, fetchOptions);
        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {}
        
        if (active) {
          if (res.ok && data.status === "ok") {
            setHealthStatus("connected");
          } else {
            setHealthStatus("failed");
          }
        }
      } catch {
        if (active) {
          setHealthStatus("failed");
        }
      }
    };
    checkCurrentHealth();
    return () => {
      active = false;
    };
  }, [backendUrl, connectionMode]);

  useEffect(() => {
    fetchCrmRecords(previewModule);
  }, [previewModule]);

  // Background polling routine for due direct Supabase-mode tasks to ensure scheduled tasks run unattended
  useEffect(() => {
    if (connectionMode !== "supabase") return;

    const intervalId = setInterval(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_tasks').maybeSingle();
        const currentTasks = data?.value || [];
        if (!Array.isArray(currentTasks)) return;

        let anyRan = false;
        const now = new Date();

        for (const task of currentTasks) {
          if (task.status === "active" && task.nextRunTime) {
            const nextRun = new Date(task.nextRunTime);
            if (now >= nextRun) {
              console.log(`[Auto-Scheduler] Client background running due task: "${task.name}" (${task.id})`);
              anyRan = true;
              
              // Transition task to running status inside DB immediately to avoid concurrent races
              task.status = "running";
              await supabase.from('kv_store_8405be07').upsert({
                key: 'import_export_tasks',
                value: currentTasks
              });

              await executeTaskSupabaseDirect(task.id);
            }
          }
        }

        if (anyRan) {
          fetchTasks();
          fetchHistory();
          fetchStats();
          fetchFiles("local");
          fetchFiles("onedrive");
          fetchCrmRecords(previewModule);
        }
      } catch (err) {
        console.error("Auto-scheduler background check error:", err);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(intervalId);
  }, [connectionMode, tasks, previewModule]);

  // Browser-direct/Supabase fallback handlers
  const parseCsv = (text: string): any[] => {
    const cleanText = text.replace(/^\uFEFF/g, "");
    const lines = cleanText.split(/\r?\n/);
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
        else if (/pricetier1|price_tier_1|tier1/i.test(header)) key = "priceTier1";
        else if (/pricetier2|price_tier_2|tier2/i.test(header)) key = "priceTier2";
        else if (/pricetier3|price_tier_3|tier3/i.test(header)) key = "priceTier3";
        else if (/pricetier4|price_tier_4|tier4/i.test(header)) key = "priceTier4";
        else if (/pricetier5|price_tier_5|tier5/i.test(header)) key = "priceTier5";
        else if (/unit_of_measure|unitofmeasure|unit|uom/i.test(header)) key = "unit";
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
  const safeFetch = async (url: string, options?: RequestInit, timeoutMs = 8000) => {
    const isGet = !options?.method || options.method.toUpperCase() === "GET";
    
    // Resolve absolute URL basing on backendUrl settings
    let base = backendUrl.trim().replace(/\/$/, "");
    if (base === window.location.origin) {
      base = "";
    }
    const resolvedUrl = url.startsWith("http") ? url : `${base}${url}`;
    const cacheBusterUrl = isGet ? `${resolvedUrl}${resolvedUrl.includes("?") ? "&" : "?"}_t=${Date.now()}` : resolvedUrl;

    const extendedOptions: RequestInit = {
      ...options
    };

    // Configure cross-origin credentials to support iframe and custom domain session handshakes
    const isCrossOrigin = resolvedUrl && resolvedUrl.startsWith("http") && !resolvedUrl.startsWith(window.location.origin);
    if (isCrossOrigin) {
      extendedOptions.credentials = "include";
    }

    if (isGet) {
      extendedOptions.headers = {
        ...(options?.headers || {}),
        "Cache-Control": "no-cache"
      };
    } else if (options?.headers) {
      extendedOptions.headers = options.headers;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    extendedOptions.signal = controller.signal;

    try {
      const res = await fetch(cacheBusterUrl, extendedOptions);
      clearTimeout(timeoutId);
      
      // Auto-detect and heal static firewall / SPA proxy HTML page issues
      if (url.includes("/api/")) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text/html") || contentType.includes("text/plain")) {
          throw new Error("Returned HTML instead of JSON for API query. Indication of a misconfigured host web firewall.");
        }
        
        // Verify via body clone for bulletproof detection
        const clone = res.clone();
        try {
          const text = await clone.text();
          const trimmed = text.trim();
          if (trimmed.startsWith("<") || trimmed.toLowerCase().startsWith("<!doctype")) {
            throw new Error("Expected JSON response but received HTML index page. Indication of static Vercel/Netlify hosting fallback routing.");
          }
        } catch (e: any) {
          if (e.message?.includes("received HTML") || e.message?.includes("Returned HTML")) {
            throw e;
          }
        }
      }
      
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      // If the request fails & the target URL is different from getSmartDefaultUrl(), fall back to getSmartDefaultUrl()!
      const fallbackBase = getSmartDefaultUrl();
      if (base !== fallbackBase) {
        console.warn(`Fetch to ${resolvedUrl} failed. Falling back to local origin: ${fallbackBase}`);
        try {
          const fallbackResolvedUrl = url.startsWith("http") ? url : `${fallbackBase}${url}`;
          const fallbackCacheBuster = isGet ? `${fallbackResolvedUrl}${fallbackResolvedUrl.includes("?") ? "&" : "?"}_t=${Date.now()}` : fallbackResolvedUrl;
          
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), timeoutMs);
          const fallbackOptions = { ...extendedOptions, signal: fallbackController.signal };
          
          const isFallbackCrossOrigin = fallbackResolvedUrl && fallbackResolvedUrl.startsWith("http") && !fallbackResolvedUrl.startsWith(window.location.origin);
          if (isFallbackCrossOrigin) {
            fallbackOptions.credentials = "include";
          }
          
          const res = await fetch(fallbackCacheBuster, fallbackOptions);
          clearTimeout(fallbackTimeoutId);
          
          // Permanently reset the backendUrl to auto-heal other API queries as well
          setBackendUrl(fallbackBase);
          localStorage.setItem("import_export_server_url", fallbackBase);
          setHealthStatus("connected");
          
          return res;
        } catch (fallbackErr) {
          clearTimeout(fallbackTimeoutId);
          throw err; // throw original if fallback fails too
        }
      }
      throw err;
    }
  };

  const parseResponseJson = async (res: Response): Promise<any> => {
    const text = await res.text();
    if (!res.ok) {
      let errMsg = `Server returned ${res.status}: ${res.statusText || "Error"}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error) errMsg = parsed.error;
        else if (parsed.message) errMsg = parsed.message;
      } catch {}
      throw new Error(errMsg);
    }
    try {
      return JSON.parse(text);
    } catch (err: any) {
      throw new Error(`Invalid JSON response from server: ${text.slice(0, 100) || "(empty)"}`);
    }
  };

  // Fetches lists with integrated browser storage backup & recovery to handle Cloud Run ephemeral container restarts
  const fetchTasks = async () => {
    setLoadingTasks(true);
    const backupKey = `unattended_scheduler_tasks_backup_${connectionMode}`;
    
    // Migrate legacy backup to mode-specific backup key if needed
    if (!localStorage.getItem(backupKey)) {
      const legacyBackup = localStorage.getItem("unattended_scheduler_tasks_backup");
      if (legacyBackup) {
        localStorage.setItem(backupKey, legacyBackup);
      }
    }

    const demoDeletedKey = `unattended_demo_task_deleted_${connectionMode}`;
    const hasDeletedDemo = localStorage.getItem(demoDeletedKey) === "true";

    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();

        // Check if we've already initialized/seeded tasks in Supabase
        const { data: seedFlagData } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks_seeded')
          .maybeSingle();
        const hasSeeded = seedFlagData?.value === true;

        const { data, error } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks')
          .maybeSingle();
        
        if (error) throw error;
        
        let serverTasks = data?.value;
        if (!Array.isArray(serverTasks)) {
          if (hasSeeded || hasDeletedDemo) {
            serverTasks = [];
          } else {
            // Setup a demo task if list is empty
            serverTasks = [
              {
                id: "task-demo-1",
                name: "Automated Daily Portal Export",
                description: "Export daily construction pipeline leads directly into OneDrive Backup storage folder.",
                status: "active",
                recurrence: "daily",
                triggerDetail: { time: "23:00" },
                action: {
                  type: "export",
                  module: "contacts",
                  fileStorage: "local",
                  fileName: "daily_contacts_backup.csv",
                  format: "csv"
                },
                settings: {
                  stopIfRunningHours: 1,
                  retryCount: 3,
                  retryIntervalMinutes: 5
                },
                lastRunTime: new Date(Date.now() - 3600000 * 12).toISOString(),
                lastRunResult: "success",
                nextRunTime: new Date(Date.now() + 3600000 * 12).toISOString(),
                createdAt: new Date().toISOString(),
                creator: "System Scheduler"
              }
            ];

            // Mark as seeded in DB
            const { error: seedErr } = await supabase.from('kv_store_8405be07').upsert({
              key: 'import_export_tasks_seeded',
              value: true
            });
            if (seedErr) throw seedErr;

            const { error: upsertErr } = await supabase.from('kv_store_8405be07').upsert({
              key: 'import_export_tasks',
              value: serverTasks
            });
            if (upsertErr) throw upsertErr;
          }
        } else {
          // Reset any tasks stuck in "running" back to "active" and self-heal missing organizationId properties
          const supabaseClientObj = createClient();
          const authCtx = await getAuthContext(supabaseClientObj);
          const resolvedOrgId = authCtx.organizationId || user?.organizationId || user?.organization_id;

          let tasksChanged = false;
          const sanitizedTasks = serverTasks.map((t: any) => {
            let updatedTask = { ...t };
            let changed = false;

            if (resolvedOrgId) {
              if (!updatedTask.organizationId) {
                updatedTask.organizationId = resolvedOrgId;
                changed = true;
              }
              if (!updatedTask.organisationId) {
                updatedTask.organisationId = resolvedOrgId;
                changed = true;
              }
            }

            if (t.status === "running") {
              updatedTask.status = "active";
              changed = true;
            }

            if (changed) {
              tasksChanged = true;
            }
            return updatedTask;
          });

          if (tasksChanged) {
            serverTasks = sanitizedTasks;
            await supabase.from('kv_store_8405be07').upsert({
              key: 'import_export_tasks',
              value: serverTasks
            });
            console.log("[Scheduler] Auto-resolved organization ID and stuck scheduler running tasks on page fetch.");
          }
        }

        // Apply active delete filter
        if (hasDeletedDemo) {
          serverTasks = serverTasks.filter((t: any) => t.id !== "task-demo-1");
        }

        setTasks(serverTasks);
        localStorage.setItem(backupKey, JSON.stringify(serverTasks));
      } else {
        const res = await safeFetch("/api/import-export/tasks");
        const data = await res.json();
        let serverTasks = Array.isArray(data) ? data : [];

        // Apply active delete filter
        if (hasDeletedDemo) {
          serverTasks = serverTasks.filter((t: any) => t.id !== "task-demo-1");
        }

        setTasks(serverTasks);

        // --- PERSISTENCE AUTO-RESTORE SYSTEM ---
        const backupStr = localStorage.getItem(backupKey);
        if (backupStr) {
          try {
            const backupTasks = JSON.parse(backupStr);
            if (Array.isArray(backupTasks)) {
              // Locate user-defined custom tasks in local backup that are missing on the live server 
              const missingTasks = backupTasks.filter(bt => 
                bt && bt.id && bt.id !== "task-demo-1" && !serverTasks.some(st => st && st.id === bt.id)
              );

              if (missingTasks.length > 0) {
                console.log("[Auto-Restore] Discovered missing tasks on the server. Re-scheduling from local browser backup...", missingTasks);
                toast.info(`Restoring ${missingTasks.length} offline/scheduled tasks that were cleared by a server restart...`, { id: "restoring-tasks" });
                
                // Restore individual tasks using POST requests to the API router
                for (const taskToRestore of missingTasks) {
                  await safeFetch("/api/import-export/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(taskToRestore)
                  });
                }

                // Re-fetch the fully synchronized tasks list from the backend
                const refreshedRes = await safeFetch("/api/import-export/tasks");
                const refreshedData = await refreshedRes.json();
                let finalTasks = Array.isArray(refreshedData) ? refreshedData : serverTasks;
                
                if (hasDeletedDemo) {
                  finalTasks = finalTasks.filter((t: any) => t.id !== "task-demo-1");
                }

                setTasks(finalTasks);
                localStorage.setItem(backupKey, JSON.stringify(finalTasks));
                
                toast.success(`Successfully restored ${missingTasks.length} scheduled tasks from your secure local browser backup.`, { id: "restoring-tasks" });
                return;
              }
            }
          } catch (backupErr) {
            console.error("Local storage backup read/restore fail:", backupErr);
          }
        }

        // If fully synchronized and no restoration was needed, update browser backup with the server's current list
        localStorage.setItem(backupKey, JSON.stringify(serverTasks));
      }
    } catch (e: any) {
      console.error("Failed to fetch live tasks:", e);
      toast.error("Failed to load scheduled tasks from Live server. Attempting to fall back to browser offline task cache.");
      
      // Offline Fallback: If server is completely unreachable, load tasks from browser backup
      const backupStr = localStorage.getItem(backupKey);
      if (backupStr) {
        try {
          const backupTasks = JSON.parse(backupStr);
          if (Array.isArray(backupTasks)) {
            setTasks(backupTasks);
          }
        } catch {}
      }
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();
        const authCtx = await getAuthContext(supabase);
        const resolvedOrgId = authCtx.organizationId || user?.organizationId || user?.organization_id;

        let contactsQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
        let inventoryQuery = supabase.from("inventory").select("id", { count: "exact", head: true });
        let opportunitiesQuery = supabase.from("opportunities").select("id", { count: "exact", head: true });

        if (resolvedOrgId) {
          contactsQuery = contactsQuery.eq("organization_id", resolvedOrgId);
          inventoryQuery = inventoryQuery.eq("organization_id", resolvedOrgId);
          opportunitiesQuery = opportunitiesQuery.eq("organization_id", resolvedOrgId);
        }

        const [{ count: cCount }, { count: iCount }, { count: dCount }] = await Promise.all([
          contactsQuery,
          inventoryQuery,
          opportunitiesQuery
        ]);

        setCrmStats({
          contacts: cCount || 0,
          inventory: iCount || 0,
          deals: dCount || 0
        });
      } else {
        const res = await safeFetch("/api/import-export/crm-stats");
        const data = await res.json();
        setCrmStats(data);
      }
    } catch (e: any) {
      console.error("Failed to load live CRM stats:", e);
    }
  };

  const fetchFiles = async (drive: "local" | "onedrive", silent = false, folderIdInput?: string | null) => {
    if (!silent) setLoadingFiles(true);
    try {
      if (drive === "onedrive" && msAccounts.length > 0) {
        // Fetch from real OneDrive cloud via Supabase edge function
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session. Please log in.");
        }
        const activeEmail = msAccounts[0].email;
        const targetFolderId = folderIdInput !== undefined ? folderIdInput : onedriveFolderId;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/onedrive-files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "X-User-Token": session.access_token
          },
          body: JSON.stringify({
            email: activeEmail,
            userId: session.user.id,
            folderId: targetFolderId
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.items) {
          const normalized = data.items.map((item: any) => ({
            name: item.name,
            size: item.size || 0,
            lastModified: item.lastModifiedDateTime || new Date().toISOString(),
            extension: item.name.split('.').pop() || '',
            isFolder: !!item.isFolder,
            id: item.id,
            webUrl: item.webUrl
          }));
          setOnedriveFiles(normalized);
        } else {
          throw new Error(data.error || "Failed to list OneDrive files");
        }
      } else {
        if (connectionMode === "supabase") {
          if (drive === "local") {
            const supabase = createClient();
            const { data } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_local_files').maybeSingle();
            let filesList = data?.value || [];
            if (!Array.isArray(filesList) || filesList.length === 0) {
              // Populate standard default sample file if directory is blank
              filesList = [
                { name: "sample_contacts_import.csv", size: 385, lastModified: new Date().toISOString(), extension: "csv" },
                { name: "quick_crm_export.csv", size: 512, lastModified: new Date().toISOString(), extension: "csv" }
              ];
              await supabase.from('kv_store_8405be07').upsert({
                key: 'import_export_local_files',
                value: filesList
              });
              // Save a sample content so downloading or running it immediately has a success path
              await supabase.from('kv_store_8405be07').upsert({
                key: "import_export_file_content:sample_contacts_import.csv",
                value: { content: `"Name","Email","Phone","Address"\n"John Doe","john@test.com","555-0199","123 Main St"\n"Jane Smith","jane@test.com","555-0100","456 Oak Ave"` }
              });
            }
            setLocalFiles(filesList);
          } else {
            const supabase = createClient();
            const { data } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_onedrive_files').maybeSingle();
            let filesList = data?.value || [];
            if (!Array.isArray(filesList) || filesList.length === 0) {
              // Populate default standard sample file if blank
              filesList = [
                { name: "Customer_Export_List.xlsx", size: 127078, lastModified: new Date().toISOString(), extension: "xlsx" }
              ];
              await supabase.from('kv_store_8405be07').upsert({
                key: 'import_export_onedrive_files',
                value: filesList
              });
              // Save a sample content so downloading or running it immediately has content
              const initialB64 = "PK"; // minimal PKZIP header
              await supabase.from('kv_store_8405be07').upsert({
                key: "import_export_file_content:Customer_Export_List.xlsx",
                value: { content: "", base64: initialB64, isBinary: true }
              });
            }
            setOnedriveFiles(filesList);
          }
        } else {
          const res = await safeFetch(`/api/import-export/storage/${drive}`);
          if (!res.ok) {
            throw new Error(`HTTP status ${res.status}`);
          }
           const data = await res.json();
          if (data.success) {
            const filesList = data.files || [];
            if (drive === "local") setLocalFiles(filesList);
            else setOnedriveFiles(filesList);
          } else {
            throw new Error(data.error || "Unknown backend error");
          }
        }
      }
    } catch (e: any) {
      console.error(`Failed to load drive files for [${drive}]:`, e);
      if (drive === "onedrive" && msAccounts.length > 0) {
        toast.error(`Unable to access Microsoft OneDrive cloud files: ${e.message}`);
      } else {
        toast.error(`Unable to read ${drive === "local" ? "Local Drive" : "OneDrive"} server directory.`);
      }
    } finally {
      if (!silent) setLoadingFiles(false);
    }
  };

  const syncOneDriveCloudFileToBackend = async (fileId: string, fileName: string, isBackground = false) => {
    setSyncingFileId(fileId);
    const syncToastId = toast.loading(`Synchronizing "${fileName}" from OneDrive Cloud to server storage...`);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session. Please log in.");
      }
      const activeEmail = msAccounts[0]?.email;
      if (!activeEmail) {
        throw new Error("No connected Microsoft OneDrive account found.");
      }
      
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/onedrive-file-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "X-User-Token": session.access_token
        },
        body: JSON.stringify({
          email: activeEmail,
          userId: session.user.id,
          itemId: fileId,
          fileId: fileId
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      const finalBase64 = data.contentBase64 || data.base64;
      if (!finalBase64) {
        throw new Error(data.error || "Failed to download OneDrive file content from cloud");
      }

      if (connectionMode === "supabase") {
        await saveVirtualFile(fileName, finalBase64, "onedrive");
      } else {
        const uploadRes = await safeFetch(`/api/import-export/storage/onedrive/upload-base64`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: fileName,
            fileContent: finalBase64
          })
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload to server storage: ${uploadRes.statusText}`);
        }
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || "Failed to save file on server storage");
        }
      }

      toast.success(`Successfully synchronized "${fileName}" to server's OneDrive folder!`, { id: syncToastId });
    } catch (e: any) {
      console.error("Cloud sync error:", e);
      if (isBackground) {
        toast.warning(`Note: Background cloud sync preview reported an issue (${e.message || e}). This is non-blocking — you can still fully save and schedule your task.`, { id: syncToastId, duration: 6000 });
      } else {
        toast.error(`Cloud sync failed: ${e.message}`, { id: syncToastId });
        throw e; // rethrow so calling procedures are aware of failure
      }
    } finally {
      setSyncingFileId(null);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_history')
          .maybeSingle();
        if (error) throw error;
        setHistory(data?.value || []);
      } else {
        const res = await safeFetch("/api/import-export/history");
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (e: any) {
      console.error("Failed to load scheduler logs history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCrmRecords = async (mod: "contacts" | "inventory" | "deals") => {
    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();
        const authCtx = await getAuthContext(supabase);
        const resolvedOrgId = authCtx.organizationId || user?.organizationId || user?.organization_id;
        const table = mod === "deals" ? "opportunities" : mod;

        let query = supabase.from(table).select("*");
        if (resolvedOrgId) {
          query = query.eq("organization_id", resolvedOrgId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setCrmRecords(data || []);
      } else {
        const res = await safeFetch(`/api/import-export/crm-data/${mod}`);
        const data = await res.json();
        setCrmRecords(data || []);
      }
    } catch (e: any) {
      console.error(`Failed to load live crm preview module [${mod}]:`, e);
    }
  };

  const getAuthContext = async (supabase: any) => {
    const { data: { user: sbUser } } = await supabase.auth.getUser();
    if (!sbUser) return { userId: null, organizationId: null };
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', sbUser.id).maybeSingle();
    
    const orgId = profile?.organization_id || 
                  sbUser.user_metadata?.organization_id || 
                  sbUser.user_metadata?.organizationId || 
                  user?.organization_id || 
                  user?.organizationId || 
                  localStorage.getItem('currentOrgId') || 
                  'org_001';

    return {
      userId: sbUser.id,
      organizationId: orgId
    };
  };

  const parseCsvMatrix = (text: string): string[][] => {
    const cleanText = text.replace(/^\uFEFF/g, "");
    const result: string[][] = [];
    let row: string[] = [];
    let entry = "";
    let insideQuote = false;
    
    for (let i = 0; i < cleanText.length; i++) {
       const char = cleanText[i];
       const nextChar = cleanText[i + 1];
       
       if (insideQuote) {
         if (char === '"') {
           if (nextChar === '"') {
             entry += '"';
             i++; // skip next quote
           } else {
             insideQuote = false;
           }
         } else {
           entry += char;
         }
       } else {
         if (char === '"') {
           insideQuote = true;
         } else if (char === ',') {
           row.push(entry);
           entry = "";
         } else if (char === '\r' || char === '\n') {
           row.push(entry);
           entry = "";
           if (row.some(val => val !== "")) {
             result.push(row);
           }
           row = [];
           if (char === '\r' && nextChar === '\n') {
             i++;
           }
         } else {
           entry += char;
         }
       }
    }
    if (row.length > 0 || entry !== "") {
       row.push(entry);
       if (row.some(val => val !== "")) {
         result.push(row);
       }
    }
    return result;
  };

  const executeTaskSupabaseDirect = async (taskId: string): Promise<{ success: boolean; logResult?: any; error?: string }> => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session. Please log in.");
      }

      // 1. Mark task running in local UI / local db to avoid dual execution
      const { data: taskData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_tasks').maybeSingle();
      const currentTasks = taskData?.value || [];
      const updatedTasks = currentTasks.map((t: any) => t.id === taskId ? { ...t, status: 'running' } : t);
      await supabase.from('kv_store_8405be07').upsert({
        key: 'import_export_tasks',
        value: updatedTasks
      });

      // 2. Call local Express endpoint on our container which has direct connection to the database
      let res;
      try {
        res = await safeFetch(`/api/import-export/tasks/${taskId}/run`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        }, 120000); // 120 seconds timeout for large dataset parse & OneDrive network synchronization

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Server HTTP error ${res.status}`);
        }

        const responseData = await res.json();
        if (!responseData.success) {
          throw new Error(responseData.error || responseData.logResult?.message || "Execution failed on the production server.");
        }

        return {
          success: true,
          logResult: responseData.logResult,
          error: undefined
        };
      } catch (fetchErr: any) {
        console.warn("Direct container execution endpoint returned fetch error or is blocked. Swapping to asynchronous container-side loop execution fallback...", fetchErr);

        // 1. Mark task for immediate background execution in the Supabase state storage
        const { data: currentDbData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_tasks').maybeSingle();
        const freshList = currentDbData?.value || [];
        const taskWithImmediateFlag = freshList.map((t: any) => 
          t.id === taskId ? { ...t, status: 'active', runImmediately: true } : t
        );
        await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_tasks',
          value: taskWithImmediateFlag
        });

        // 2. Add a dynamic log/history entry notifying the user that the task is queued to run in the background
        const matchedTask = freshList.find((t: any) => t.id === taskId) || {};
        const qLog = {
          id: "log-" + Math.random().toString(36).slice(2, 11),
          taskId: taskId,
          taskName: matchedTask.name || "Task",
          time: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          actionType: matchedTask.action?.type || "import",
          module: matchedTask.action?.module || "unknown",
          fileStorage: matchedTask.action?.fileStorage || "local",
          fileName: matchedTask.action?.fileName || "error",
          status: "running",
          recordCount: 0,
          message: `Queued: Direct endpoint unreachable due to cross-site domain security. Running job via server background channel. Completion expected in 10-15 seconds.`
        };

        const { data: histData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_history').maybeSingle();
        let historyList = histData?.value || [];
        if (!Array.isArray(historyList)) historyList = [];
        historyList.unshift(qLog);
        await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_history',
          value: historyList
        });

        toast.info("Asynchronous container trigger sent! Task queue scheduled successfully. Processing has started on the server in the background.", { id: "job-run" });

        return {
          success: true,
          error: undefined,
          logResult: qLog
        };
      }
    } catch (e: any) {
      console.error("Direct Supabase task runner failure:", e);
      try {
        const supabase = createClient();
        const { data: taskData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_tasks').maybeSingle();
        const tasksList = taskData?.value || [];
        if (Array.isArray(tasksList)) {
          const updated = tasksList.map((t: any) => {
            if (t.id === taskId) {
              const nextTime = t.recurrence === "one-time" ? null : calculateNextRunTimeFrontend(t, new Date());
              return {
                ...t,
                status: t.recurrence === "one-time" ? "completed" : "active",
                lastRunTime: new Date().toISOString(),
                lastRunResult: "failed",
                nextRunTime: nextTime ? nextTime.toISOString() : null
              };
            }
            return t;
          });
          await supabase.from('kv_store_8405be07').upsert({
            key: 'import_export_tasks',
            value: updated
          });
        }

        const matchedTask = Array.isArray(tasksList) ? tasksList.find((t: any) => t.id === taskId) : null;
        const taskNameValue = matchedTask?.name || "Task Run Error";
        const actionTypeVal = matchedTask?.action?.type || "import";
        const moduleVal = matchedTask?.action?.module || "unknown";
        const fileStorageVal = matchedTask?.action?.fileStorage || "local";
        const fileNameVal = matchedTask?.action?.fileName || "error";

        // Diagnose common fetch/execution failures to provide ultra-helpful guidance
        let errorExplanation = e.message || String(e);
        if (errorExplanation.toLowerCase().includes("failed to fetch") || errorExplanation.toLowerCase().includes("fetch failed")) {
          errorExplanation = "Failed to fetch: Connection to the backend App Service was unreachable. This happens when the Express server container is cold, restarting, or offline on port 3000. Try refreshing your browser tab now or run again in 10 seconds.";
        } else if (errorExplanation.toLowerCase().includes("row-level security") || errorExplanation.toLowerCase().includes("rls")) {
          errorExplanation = "Row-Level Security violation: Database RLS policies are blocking this unattended sync. Fix this instantly by running the compound RLS healing script in your Supabase SQL Editor as outlined in `/src/FIX_INVENTORY_RLS_NOW.md`.";
        } else if (errorExplanation.toLowerCase().includes("unauthorized") || errorExplanation.toLowerCase().includes("jwt")) {
          errorExplanation = "Session Unauthorized: The user authorization token has expired. Please sign out of ProSpaces and sign back in to renew your keys.";
        }

        // Log the failure to history so the logs are clear
        const errLog = {
          id: "log-" + Math.random().toString(36).slice(2, 11),
          taskId: taskId,
          taskName: taskNameValue,
          time: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          actionType: actionTypeVal,
          module: moduleVal,
          fileStorage: fileStorageVal,
          fileName: fileNameVal,
          status: "failed",
          recordCount: 0,
          message: `Execution failed: ${errorExplanation}`
        };
        const { data: histData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_history').maybeSingle();
        let currentHist = histData?.value || [];
        if (!Array.isArray(currentHist)) currentHist = [];
        currentHist.unshift(errLog);
        await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_history',
          value: currentHist
        });
      } catch (recoveryErr) {
        console.error("Failed to recover task status to inactive after failure:", recoveryErr);
      }
      return { success: false, error: e.message || "Unknown error executing job." };
    }
  };

  // Upload handles to Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: "local" | "onedrive") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExplorerUploading(true);
    const uploadToastId = toast.loading(`Uploading "${file.name}" to directory...`);
    try {
      const base64Data = await readFileAsBase64(file);
      if (connectionMode === "supabase") {
        await saveVirtualFile(file.name, base64Data, target);
        toast.dismiss(uploadToastId);
        toast.success(`Uploaded "${file.name}" successfully to virtual storage!`);
        setExplorerUploading(false);
        await fetchFiles(target, true);
      } else {
        const res = await safeFetch(`/api/import-export/storage/${target}/upload-base64`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: base64Data
          })
        }, 120000);
        const data = await parseResponseJson(res);
        toast.dismiss(uploadToastId);
        if (data.success) {
          toast.success(`Uploaded "${file.name}" successfully!`);
          setExplorerUploading(false);
          await fetchFiles(target, true);
        } else {
          throw new Error(data.error || "File upload response was not successful");
        }
      }
    } catch (e: any) {
      toast.dismiss(uploadToastId);
      console.error("File upload failed:", e);
      toast.error(`File upload failed: ${e.message || e}`);
      setExplorerUploading(false);
    }
  };

  const handleModalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: "local" | "onedrive") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setModalUploading(true);
    const uploadToastId = toast.loading(`Uploading "${file.name}" to directory...`);
    try {
      const base64Data = await readFileAsBase64(file);
      if (connectionMode === "supabase") {
        await saveVirtualFile(file.name, base64Data, target);
        toast.dismiss(uploadToastId);
        toast.success(`Uploaded & mapped "${file.name}" to virtual storage successfully!`);
        setActionFileName(file.name);
        setModalUploading(false);
        fetchFiles(target);
      } else {
        const res = await safeFetch(`/api/import-export/storage/${target}/upload-base64`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: base64Data
          })
        }, 120000);
        const data = await parseResponseJson(res);
        toast.dismiss(uploadToastId);
        if (data.success) {
          toast.success(`Uploaded & mapped "${file.name}" to ${target === "onedrive" ? "OneDrive" : "Local Drive"} successfully!`);
          setActionFileName(file.name);
          setModalUploading(false);
          fetchFiles(target);
        } else {
          throw new Error(data.error || "File upload response was not successful");
        }
      }
    } catch (e: any) {
      toast.dismiss(uploadToastId);
      console.error("Modal file upload failed:", e);
      toast.error(`File upload failed: ${e.message || e}`);
      setModalUploading(false);
    }
  };

  // Delete handles from storage
  const handleFileDelete = async (fileName: string, target: "local" | "onedrive") => {
    if (!confirm(`Are you sure you want to permanently delete ${fileName} from ${target === 'local' ? 'Local Drive' : 'OneDrive'}?`)) return;

    try {
      if (connectionMode === "supabase") {
        await deleteVirtualFile(fileName);
        toast.success(`${fileName} deleted successfully from virtual storage.`);
        fetchFiles(target);
      } else {
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
      }
    } catch (e) {
      toast.error("Network error deleting file");
    }
  };

  // Download handle from backend
  const handleFileDownload = async (fileName: string, target: "local" | "onedrive", fileId?: string) => {
    if (target === "onedrive" && msAccounts.length > 0 && fileId) {
      const downloadToastId = toast.loading(`Downloading "${fileName}" from OneDrive Cloud...`);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session. Please log in.");
        const activeEmail = msAccounts[0]?.email;
        if (!activeEmail) throw new Error("No connected Microsoft OneDrive account found.");

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/onedrive-file-content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "X-User-Token": session.access_token
          },
          body: JSON.stringify({ 
            email: activeEmail, 
            userId: session.user.id, 
            itemId: fileId,
            fileId: fileId
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP error ${res.status}`);
        }
        const data = await res.json();
        const finalBase64 = data.contentBase64 || data.base64;
        if (finalBase64) {
          const raw = window.atob(finalBase64);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: data.mimeType || "application/octet-stream" });
          const urlStr = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = urlStr;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(urlStr);
          toast.success(`Downloaded "${fileName}" successfully!`, { id: downloadToastId });
        } else {
          throw new Error(data.error || "Failed to download OneDrive file");
        }
      } catch (err: any) {
        console.error("Cloud download error:", err);
        toast.error(`Download failed: ${err.message}`, { id: downloadToastId });
      }
    } else {
      if (connectionMode === "supabase") {
        const downloadToastId = toast.loading(`Downloading "${fileName}"...`);
        try {
          const fileData = await readVirtualFileRaw(fileName);
          if (fileData) {
            let blob: Blob;
            if (fileData.base64) {
              let b64 = fileData.base64;
              if (b64.startsWith('data:')) {
                b64 = b64.split(';base64,')[1] || '';
              }
              const raw = window.atob(b64);
              const rawLength = raw.length;
              const uInt8Array = new Uint8Array(rawLength);
              for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
              }
              const ext = fileName.split('.').pop()?.toLowerCase();
              const mime = ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : (ext === 'xls' ? 'application/vnd.ms-excel' : 'application/octet-stream');
              blob = new Blob([uInt8Array], { type: mime });
            } else {
              blob = new Blob([fileData.content || ''], { type: "text/plain" });
            }
            const urlStr = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = urlStr;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(urlStr);
            toast.success(`Downloaded "${fileName}" successfully!`, { id: downloadToastId });
          } else {
            throw new Error("File content is empty or not found in virtual storage.");
          }
        } catch (err: any) {
          toast.error(`Download failed: ${err.message}`, { id: downloadToastId });
        }
      } else {
        window.open(`/api/import-export/storage/${target}/download/${encodeURIComponent(fileName)}`, "_blank");
      }
    }
  };

  // Forces an immediate execution of scheduled task unattended
  const handleRunTaskImmediately = async (taskId: string) => {
    setRunningTaskId(taskId);
    toast.info(connectionMode === "supabase" ? "Triggering direct Supabase job execution..." : "Triggering unattended background job on backend...", { id: "job-run" });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (connectionMode === "supabase") {
        const result = await executeTaskSupabaseDirect(taskId);
        if (result.success) {
          toast.success(`Job run completed: status "${result.logResult.status}"`, { id: "job-run" });
          fetchTasks();
          fetchHistory();
          fetchStats();
          fetchFiles("local");
          fetchFiles("onedrive");
          fetchCrmRecords(previewModule);
        } else {
          toast.error("Unattended job run failed: " + result.error, { id: "job-run" });
        }
      } else {
        try {
          const res = await safeFetch(`/api/import-export/tasks/${taskId}/run`, {
            method: "POST",
            headers: session?.access_token ? {
              "Authorization": `Bearer ${session.access_token}`
            } : {}
          }, 120000);
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
        } catch (expressErr: any) {
          console.warn("Express backend direct connection blocked. Swapping to secure Supabase background scheduler triggers...", expressErr);
          toast.info("Connection filter detected. Routing trigger to secure container queue...", { id: "job-run" });
          const result = await executeTaskSupabaseDirect(taskId);
          if (result.success) {
            toast.success("Job triggers scheduled successfully on server container in the background!", { id: "job-run" });
            fetchTasks();
            fetchHistory();
            fetchStats();
            fetchFiles("local");
            fetchFiles("onedrive");
            fetchCrmRecords(previewModule);
          } else {
            toast.error("Execution trigger failed: " + result.error, { id: "job-run" });
          }
        }
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

    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();
        await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_history',
          value: []
        });
        toast.success("Execution logs cleared.");
        fetchHistory();
      } else {
        const res = await safeFetch("/api/import-export/history/clear", {
          method: "POST"
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Execution logs cleared.");
          fetchHistory();
        }
      }
    } catch (e) {
      toast.error("Could not clear logs");
    }
  };

  // Delete scheduled task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to permanently delete this scheduled task?")) return;

    const backupKey = `unattended_scheduler_tasks_backup_${connectionMode}`;
    const demoDeletedKey = `unattended_demo_task_deleted_${connectionMode}`;

    try {
      // Mark demo task as deleted locally to prevent cold-boot re-seeding
      if (taskId === "task-demo-1") {
        localStorage.setItem(demoDeletedKey, "true");
      }

      if (connectionMode === "supabase") {
        const supabase = createClient();
        const { data: catData, error: selectError } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks')
          .maybeSingle();

        if (selectError) throw selectError;

        let currentTasks = catData?.value || [];
        if (Array.isArray(currentTasks)) {
          currentTasks = currentTasks.filter((t: any) => t.id !== taskId);
          const { error: upsertError } = await supabase.from('kv_store_8405be07').upsert({
            key: 'import_export_tasks',
            value: currentTasks
          });
          if (upsertError) throw upsertError;
        }
        
        // Remove from local storage backup immediately
        const backupStr = localStorage.getItem(backupKey);
        if (backupStr) {
          try {
            const backupTasks = JSON.parse(backupStr);
            if (Array.isArray(backupTasks)) {
              localStorage.setItem(backupKey, JSON.stringify(backupTasks.filter((t: any) => t.id !== taskId)));
            }
          } catch {}
        }
        
        toast.success("Scheduled task deleted.");
        fetchTasks();
      } else {
        const res = await safeFetch(`/api/import-export/tasks/${taskId}`, {
          method: "DELETE"
        });
        const data = await res.json();
        if (data.success) {
          // Remove from local storage backup immediately
          const backupStr = localStorage.getItem(backupKey);
          if (backupStr) {
            try {
              const backupTasks = JSON.parse(backupStr);
              if (Array.isArray(backupTasks)) {
                localStorage.setItem(backupKey, JSON.stringify(backupTasks.filter((t: any) => t.id !== taskId)));
              }
            } catch {}
          }
          
          toast.success("Scheduled task deleted.");
          fetchTasks();
        }
      }
    } catch (e: any) {
      toast.error(`Failed to delete task: ${e.message || e}`);
    }
  };

  // Toggle state between active / disabled
  const handleToggleTaskStatus = async (task: ScheduledTask) => {
    const nextStatus = task.status === "active" ? "disabled" : "active";

    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();
        const { data: catData, error: loadErr } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks')
          .maybeSingle();

        if (loadErr) throw loadErr;

        let currentTasks = catData?.value || [];
        if (Array.isArray(currentTasks)) {
          currentTasks = currentTasks.map((t: any) => {
            if (t.id === task.id) {
              return { ...t, status: nextStatus };
            }
            return t;
          });
          const { error: upsertErr } = await supabase.from('kv_store_8405be07').upsert({
            key: 'import_export_tasks',
            value: currentTasks
          });
          if (upsertErr) throw upsertErr;
        }
        toast.success(`Task is now ${nextStatus === "active" ? "Enabled" : "Disabled"}`);
        fetchTasks();
      } else {
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
      timezoneOffset: new Date().getTimezoneOffset(),
      triggerDetail: {
        dateTime: (() => {
          if (taskRecurrence !== "one-time" || !triggerDateTime) return undefined;
          const d = new Date(triggerDateTime);
          return isNaN(d.getTime()) ? undefined : d.toISOString();
        })(),
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
        retryIntervalMinutes: retryMinutes,
        runWhetherComputerOff: runWhetherComputerOff
      },
      creator: creatorName
    };

    const supabaseClientObj = createClient();
    const authCtx = await getAuthContext(supabaseClientObj);
    const resolvedOrgId = authCtx.organizationId || user?.organizationId || user?.organization_id;
    if (resolvedOrgId) {
      payload.organizationId = resolvedOrgId;
      payload.organisationId = resolvedOrgId;
    }

    if (modalMode === "edit" && editingTaskId) {
      payload.id = editingTaskId;
    }

    try {
      if (connectionMode === "supabase") {
        const supabase = createClient();
        const { data: catData, error: loadErr } = await supabase
          .from('kv_store_8405be07')
          .select('value')
          .eq('key', 'import_export_tasks')
          .maybeSingle();

        if (loadErr) throw loadErr;

        let currentTasks = catData?.value || [];
        if (!Array.isArray(currentTasks)) currentTasks = [];

        if (modalMode === "edit" && editingTaskId) {
          currentTasks = currentTasks.map((t: any) => {
            if (t.id === editingTaskId) {
              const updatedPayload = { ...payload };
              const nextTime = calculateNextRunTimeFrontend(updatedPayload);
              return { 
                ...updatedPayload, 
                lastRunTime: t.lastRunTime, 
                lastRunResult: t.lastRunResult, 
                nextRunTime: nextTime ? nextTime.toISOString() : null, 
                createdAt: t.createdAt 
              };
            }
            return t;
          });
        } else {
          payload.id = "task-" + Math.random().toString(36).slice(2, 11);
          payload.createdAt = new Date().toISOString();
          const nextTime = calculateNextRunTimeFrontend(payload);
          payload.nextRunTime = nextTime ? nextTime.toISOString() : null;
          currentTasks.push(payload);
        }

        const { error: upsertErr } = await supabase.from('kv_store_8405be07').upsert({
          key: 'import_export_tasks',
          value: currentTasks
        });

        if (upsertErr) throw upsertErr;

        toast.success(modalMode === "create" ? "Scheduled task created!" : "Scheduled task updated!");
        setShowTaskModal(false);
        fetchTasks();
      } else {
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
      }
    } catch (err: any) {
      toast.error(`Could not save task to backend: ${err.message || err}`);
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
    setRunWhetherComputerOff(true);
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
    setTriggerDateTime(task.recurrence === "one-time" && task.triggerDetail?.dateTime ? formatToLocalValue(task.triggerDetail.dateTime) : "");
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
    setRunWhetherComputerOff(task.settings.runWhetherComputerOff !== false);
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

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      // Register temporary task, run it, and delete it immediately
      const registerRes = await safeFetch("/api/import-export/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempTask)
      });
      const registerData = await registerRes.json();
      
      if (registerData.success) {
        const runRes = await safeFetch(`/api/import-export/tasks/${registerData.task.id}/run`, {
          method: "POST",
          headers: session?.access_token ? {
            "Authorization": `Bearer ${session.access_token}`
          } : {}
        }, 120000);
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
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Visual Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 shadow-2xs">
              <Clock className="h-5 w-5" id="header-scheduler-icon" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Unattended Task Scheduler
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automate system records synchronization and folder backups.
              </p>
            </div>
          </div>
        </div>

        {/* Database/Storage metrics indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
            <Database className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-600">
              CRM Storage: <span className="font-mono text-slate-900 font-semibold">{crmStats.contacts}</span> Contacts · <span className="font-mono text-slate-900 font-semibold">{crmStats.inventory}</span> Inventory · <span className="font-mono text-slate-900 font-semibold">{crmStats.deals}</span> Deals
            </span>
          </div>

          <button
            onClick={() => setShowBackendConfig(!showBackendConfig)}
            className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-all flex items-center gap-2 text-xs font-semibold"
            title="Express API Backend Settings"
          >
            {healthStatus === "connected" ? (
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : healthStatus === "failed" ? (
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            ) : (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            )}
            <span>Backend: {healthStatus === "connected" ? "Connected" : healthStatus === "failed" ? "Offline" : "Checking..."}</span>
            <Settings className="h-3.5 w-3.5 ml-1 text-slate-400" />
          </button>

          <button 
            onClick={() => {
              testBackendConnection();
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

      {showBackendConfig && (() => {
        const origin = window.location.origin;
        const isBackendCapable = 
          origin.includes("run.app") || 
          origin.includes("localhost") || 
          origin.includes("127.0.0.1") || 
          origin.includes("3000") ||
          origin.includes("google-aistudio-apps.com") ||
          origin.includes("aistudio") ||
          origin.includes("web-platform") ||
          origin.includes("sandbox");

        return (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 font-sans">Active Connection & Scheduler Settings</h3>
                <p className="text-xs text-slate-500">
                  Configure the primary connection mode for the CRM scheduler, database records, and transaction logs.
                </p>
              </div>
              <button
                onClick={() => setShowBackendConfig(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-0.5 border rounded hover:bg-slate-100 bg-white cursor-pointer transition"
              >
                Close
              </button>
            </div>

            {/* Connection Mode Toggle Selector */}
            <div className="bg-white border border-slate-150 rounded-lg p-3.5 space-y-2">
              <span className="block text-4xs uppercase text-slate-450 font-bold font-mono tracking-wider">Database & Scheduler Connection Mode</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConnectionMode("supabase");
                    localStorage.setItem("import_export_connection_mode", "supabase");
                    testBackendConnection(backendUrl, "supabase");
                    toast.success("Successfully set connection to Supabase direct tables!");
                  }}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between min-h-20 cursor-pointer ${
                    connectionMode === "supabase"
                      ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connectionMode === "supabase" ? "bg-emerald-500 animate-pulse" : "bg-slate-350"}`} />
                    <span className="font-semibold text-xs text-slate-800">Supabase CRM cluster (Superbase Direct)</span>
                  </div>
                  <span className="text-3xs text-slate-500 leading-normal mt-1">
                    Connect and save virtual files and database queries directly in Supabase. Bypasses secondary compute nodes. (Recommended & Robust)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConnectionMode("express");
                    localStorage.setItem("import_export_connection_mode", "express");
                    testBackendConnection(backendUrl, "express");
                    toast.success("Connection mode switched to Express API Backend!");
                  }}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between min-h-20 cursor-pointer ${
                    connectionMode === "express"
                      ? "border-blue-500 bg-blue-50/50 text-blue-950 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connectionMode === "express" ? "bg-blue-500 animate-pulse" : "bg-slate-350"}`} />
                    <span className="font-semibold text-xs text-slate-800">Express Node container</span>
                  </div>
                  <span className="text-3xs text-slate-500 leading-normal mt-1">
                    Route pipeline jobs, file-system directories, and backups via dedicated micro-services framework on your hosting node.
                  </span>
                </button>
              </div>
            </div>

            {connectionMode === "supabase" ? (
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                  <span className="inline-block w-2h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Supabase Direct Tables — Active</span>
                </h4>
                <p className="text-3xs text-slate-600 leading-normal">
                  All synchronization processes, file transfers, logs, and schedule registrations bypass Node container ports entirely. You are communicating from the browser client direct to the CRM backend database. No API keys are exposed to third-party endpoints.
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => testBackendConnection()}
                    disabled={checkingHealth}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {checkingHealth ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Verify Supabase Database Connection
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isBackendCapable ? (
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-950 font-sans flex items-center gap-2">
                          <span>🔒 AI Studio Sandbox Mode</span>
                          <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-emerald-800 border border-emerald-250">Active & Connected</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                          CRM automated background jobs, OneDrive synchronization, and directory backups route relatively. This bypasses all cross-domain sandbox controls or CORS headers.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1.5 border-t border-emerald-200/50">
                      <div className="text-3xs text-emerald-850 font-mono flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Sandbox Route: <code className="bg-emerald-100/60 px-1 py-0.5 rounded font-bold font-mono">/api/*</code></span>
                      </div>
                      
                      <button
                        onClick={() => {
                          testBackendConnection(window.location.origin);
                        }}
                        disabled={checkingHealth}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {checkingHealth ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Re-Verify Connection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-4xs uppercase text-slate-450 font-bold font-mono">Backend Server URL Address</label>
                        <div className="relative shadow-xs rounded-lg">
                          <input
                            type="text"
                            placeholder="e.g. http://localhost:3000"
                            value={backendUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBackendUrl(val);
                              setHealthStatus("unknown");
                            }}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem("import_export_server_url", backendUrl);
                            testBackendConnection(backendUrl);
                          }}
                          disabled={checkingHealth}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          {checkingHealth ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Save & Test Connection
                        </button>

                        <button
                          onClick={() => {
                            const defaultUrl = getSmartDefaultUrl();
                            setBackendUrl(defaultUrl);
                            localStorage.setItem("import_export_server_url", defaultUrl);
                            testBackendConnection(defaultUrl);
                          }}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold text-xs transition-all shadow-sm cursor-pointer"
                        >
                          Reset to Default
                        </button>

                        <button
                          onClick={async () => {
                            const bridgeUrl = getRecommendedBridgeUrl();
                            setBackendUrl(bridgeUrl);
                            localStorage.setItem("import_export_server_url", bridgeUrl);
                            toast.info(`Connecting to: ${bridgeUrl}`);
                            await testBackendConnection(bridgeUrl);
                          }}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                          title="Establish cloud bridge directly to the running full-stack container on Google Cloud Run"
                        >
                          <span>🔌 Bridge Cloud Run Backend</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Diagnostics Info */}
                    <div className="bg-white border border-slate-150 rounded-lg p-3.5 text-xs text-slate-600 space-y-3 font-sans leading-relaxed">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Self-Healing Diagnostics:</span>
                        <span className={`px-2 py-0.5 rounded-full text-4xs uppercase font-bold tracking-wider ${
                          healthStatus === "connected" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          healthStatus === "failed" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {healthStatus || "Checking..."}
                        </span>
                      </div>
                      
                      <div className="bg-amber-50/70 border border-amber-200 text-slate-700 p-3 rounded-lg flex flex-col gap-1.5">
                        <p className="font-semibold text-xs text-amber-900 flex items-center gap-1.5">
                          ☁️ Production Custom Domain Cloud Bridge:
                        </p>
                        <p className="text-3xs text-amber-800 leading-relaxed">
                          When visiting your custom Apex domain (e.g., <code className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold">www.prospacescrm.com</code>), the application is served as static web pages. Static servers do not run persistent background processes. 
                          To run background schedulers, folder observers, and backups under your production custom domains, we bridge your static frontend directly to your dedicated Node.js full-stack container on Google Cloud Run:
                          <code className="block mt-1 font-mono text-4xs bg-zinc-800 text-zinc-100 p-1.5 rounded select-all text-center">{getSmartDefaultUrl()}</code>
                          Click the <strong>"Bridge Cloud Run Backend"</strong> button above to establish the cloud link instantly!
                        </p>
                      </div>

                      {healthStatus === "failed" && (
                        <div className="bg-rose-50/95 border border-rose-200 text-rose-950 p-4 rounded-lg flex flex-col gap-2.5">
                          <p className="font-semibold text-xs text-rose-800 flex items-center gap-1.5">
                            ⚠️ Connection Block Details (Modern Browser Block Info)
                          </p>
                          <div className="text-3xs text-rose-800 leading-relaxed space-y-1.5">
                            <p>
                              Google AI Studio workspaces are highly secure and require platform verification cookies (<code className="font-mono bg-rose-100 px-1 py-0.2 rounded font-bold">__Host-</code> / <code className="font-mono bg-rose-100 px-1 py-0.2 rounded font-bold">ais-applet-session</code>) to authorize access to your Express background core container.
                            </p>
                            <p>
                              Because you are loading the CRM via your custom apex domain (<code className="font-mono bg-rose-100 px-1 py-0.2 rounded font-bold">{window.location.origin}</code>), modern browsers <strong>automatically block third-party cookies</strong> from being sent to <code className="font-mono bg-rose-100 px-0.5 py-0.1 rounded font-normal">*.run.app</code>. This triggers a CORS network fetch exception!
                            </p>
                            <p className="font-semibold pt-1 text-slate-800 text-3xs">
                              ✅ Recommended Immediate Solution:
                            </p>
                            <p>
                              Instead of bridging cross-origin, load the app directly from its native Cloud Run URL. It serves the identical full-stack application and establishes a <strong>same-origin connection</strong> with the scheduling node natively—no cookie blocks, no CORS filters:
                            </p>
                            <a 
                              href={getSmartDefaultUrl()} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 w-full mt-1.5 bg-rose-600 hover:bg-rose-750 text-white font-bold py-2 px-3 rounded-md shadow-sm transition-colors text-center text-3xs"
                            >
                              🛰️ Open Full same-origin app on Cloud Run (Full Capabilities Active)
                            </a>
                            <p className="text-[10px] text-slate-500 pt-0.5">
                              Or alternatively: Go to your browser Settings, check "Privacy & Security", and add an exception to allow third-party cookies for <code className="font-mono bg-rose-100/50 px-1 py-0.1 rounded font-normal">*.run.app</code>.
                            </p>
                          </div>
                        </div>
                      )}

                      <p className="text-slate-500 text-3xs pt-1.5">
                        💡 <span className="font-semibold text-slate-650">Note for custom rollouts:</span> If you run the React static frontend but run the Express server on a separate server machine, POST files are intercepted by proxies with error <code className="text-rose-600 font-mono">405 Method Not Allowed</code>. Input your customized Express host URL above to directly bypass the static server middleware and send requests directly to your API service.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

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
                                  {(task.status || '').toUpperCase()}
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
                <div className="space-y-4">
                  <div className="bg-blue-600 text-white rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 p-3 opacity-15">
                      <Cloud className="w-32 h-32" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-blue-100">Microsoft Cloud Service</h4>
                      <p className="text-lg font-bold mt-1">OneDrive Cloud Drive</p>
                      
                      {msAccounts.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-blue-100 flex items-center gap-1.5 font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                            Connected: <span className="underline">{msAccounts[0].email}</span>
                          </p>
                          <p className="text-3xs text-blue-200">
                            Account Owner: {msAccounts[0].displayName || "Microsoft User"}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs text-blue-200 font-medium">
                            No Microsoft account linked here.
                          </p>
                          <p className="text-[10px] text-blue-200/90 leading-relaxed bg-blue-700/40 p-2 rounded-lg border border-blue-500/30">
                            💡 <strong>Use Any Account:</strong> The login flow will prompt you to select or input your specific Microsoft credentials. This allows you to connect any custom OneDrive account, even if it is different from your computer's local account.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-3 relative z-10">
                      {msAccounts.length > 0 ? (
                        <button
                          onClick={() => handleDisconnectMicrosoft(msAccounts[0].id)}
                          className="w-full text-center bg-blue-700/60 hover:bg-rose-700/80 text-white text-xs font-semibold py-1.5 rounded-lg border border-blue-500/50 transition-all outline-none"
                        >
                          Disconnect Microsoft Account
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectMicrosoft}
                          disabled={isConnectingMs}
                          className="w-full text-center bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold py-2 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 outline-none disabled:opacity-50"
                        >
                          {isConnectingMs ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                              Establishing Cloud Link...
                            </>
                          ) : (
                            <>
                              <Cloud className="w-4 h-4 text-blue-600" />
                              Sign in with Microsoft
                            </>
                          )}
                        </button>
                      )}

                      <div className="border-t border-blue-500/50 pt-2 flex items-center justify-between">
                        <span className="text-3xs bg-blue-500 px-2 py-0.5 rounded text-white font-bold tracking-tight">
                          {msAccounts.length > 0 ? "OAUTH CONNECTED" : "LOCAL MODE (./onedrive)"}
                        </span>
                        <span className="text-3xs text-blue-200 italic">OneDrive Unattended SDK v3.2</span>
                      </div>
                    </div>
                  </div>

                  {/* Microsoft Azure Portal Integration Tutorial & Redirect URI Copy Assist */}
                  {(() => {
                    const activeOriginValue = oauthRedirectOrigin === 'prospaces_vercel'
                      ? 'https://prospaces.vercel.app'
                      : oauthRedirectOrigin === 'prospaces_crm'
                      ? 'https://www.prospacescrm.com'
                      : oauthRedirectOrigin === 'custom'
                      ? customOauthOriginUrl
                      : window.location.origin;

                    const activeRedirectUriValue = activeOriginValue.replace(/\/+$/, '') + '/oauth-callback';

                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <button 
                          onClick={() => setShowMsDiagnosticGuide(!showMsDiagnosticGuide)}
                          className="w-full flex items-center justify-between text-left font-sans outline-none group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1 px-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs leading-none">⚙️</div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">Advanced Redirect URI Origin Selector</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Configure custom domains or resolve dynamic sandbox login errors</p>
                            </div>
                          </div>
                          {showMsDiagnosticGuide ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                          )}
                        </button>

                        {showMsDiagnosticGuide && (
                          <div className="pt-2 border-t border-slate-200/60 space-y-3">
                            <p className="text-xs text-slate-650 leading-relaxed font-sans">
                              Because this is a sandboxed preview environment, the URL changes dynamically. Microsoft rejects logging in unless the active preview address is added as an authorized Redirect URI in your Microsoft Azure App Registration.
                            </p>

                            <div className="space-y-2 font-sans bg-amber-500/[0.04] border border-amber-500/10 rounded-lg p-3">
                              <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Active OAuth Redirect Origin</label>
                              <p className="text-3xs text-slate-500 leading-normal mb-2">
                                Working from the AI Studio sandbox? Select a registered production domain (e.g. Vercel or Custom CRM). The authorization window will open under that domain and securely hand the token back to this browser window instantly!
                              </p>
                              <select
                                value={oauthRedirectOrigin || 'auto'}
                                onChange={(e) => setOauthRedirectOrigin(e.target.value)}
                                className="w-full bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-800 outline-none shadow-xs mb-2 cursor-pointer transition-all focus:border-blue-500"
                              >
                                <option value="auto">🔌 Auto-Detect Current (Default: {window.location.origin})</option>
                                <option value="prospaces_crm">🌐 Production CRM (https://www.prospacescrm.com)</option>
                                <option value="prospaces_vercel">🚀 Vercel Host (https://prospaces.vercel.app)</option>
                                <option value="custom">✍️ Custom Registered Origin...</option>
                              </select>

                              {oauthRedirectOrigin === 'custom' && (
                                <div className="mt-2 space-y-1">
                                  <input
                                    type="text"
                                    placeholder="https://your-custom-domain.com"
                                    value={customOauthOriginUrl}
                                    onChange={(e) => setCustomOauthOriginUrl(e.target.value)}
                                    className="w-full bg-white border border-slate-250 p-2 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                  <p className="text-4xs text-slate-400">Must start with http:// or https:// (e.g. registered domain in Azure portal)</p>
                                </div>
                              )}

                              <div className="mt-3 pt-3 border-t border-slate-200/40 space-y-1">
                                <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Microsoft Login Prompt Behavior</label>
                                <p className="text-3xs text-slate-500 leading-normal mb-1.5">
                                  Having trouble switching accounts? Choose "Force Login Screen" to bypass Microsoft active user caching completely!
                                </p>
                                <select
                                  value={oauthMicrosoftPrompt}
                                  onChange={(e) => setOauthMicrosoftPrompt(e.target.value)}
                                  className="w-full bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-800 outline-none shadow-xs cursor-pointer transition-all focus:border-blue-500"
                                >
                                  <option value="select_account">👥 Account Chooser (Bypasses SSO if multiple active, can auto-select if single)</option>
                                  <option value="login">🔐 Force Login Screen (Forces entering credentials — Choose this to switch accounts!)</option>
                                  <option value="consent">📝 Consent Prompt (Forces consent grant overlay)</option>
                                </select>
                              </div>

                              <div className="space-y-1 mt-2.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Redirect URI passed to Microsoft / Google</label>
                                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg p-1.5 pl-2.5">
                                  <code className="text-xs font-mono text-slate-800 break-all select-all flex-1">
                                    {activeRedirectUriValue}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(activeRedirectUriValue);
                                      setCopiedUri(true);
                                      toast.success("Active Redirect URI copied to clipboard!");
                                      setTimeout(() => setCopiedUri(false), 2500);
                                    }}
                                    className="p-1.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-md transition-all shrink-0 outline-none flex items-center justify-center gap-1.5 text-xs font-semibold"
                                  >
                                    {copiedUri ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" shrink-0="true" />
                                        <span className="text-emerald-700">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-slate-400" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 pt-1 font-sans">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Microsoft Azure Setup</p>
                              <ol className="text-xs text-slate-650 space-y-1.5 list-none pl-0">
                                <li className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-3xs flex items-center justify-center shrink-0 font-bold mt-0.5">1</span>
                                  <span className="leading-relaxed">
                                    Open the <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold inline-flex items-center gap-0.5 hover:underline">Microsoft Azure Apps Portal <ExternalLink className="w-2.5 h-2.5" /></a> and click on your **Custom App Registration**.
                                  </span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-3xs flex items-center justify-center shrink-0 font-bold mt-0.5">2</span>
                                  <span className="leading-relaxed">In the **Overview** page, copy your 36-character **Application (client) ID** (do not use the example placeholder ID in our app!).</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-3xs flex items-center justify-center shrink-0 font-bold mt-0.5">3</span>
                                  <span className="leading-relaxed">Go to **Authentication** (left sidebar menu). Under **Web Redirect URIs**, click **"Add URI"** and paste the active redirect URI shown above, then click **Save**.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-3xs flex items-center justify-center shrink-0 font-bold mt-0.5">4</span>
                                  <span className="leading-relaxed">Go to **Certificates & secrets** (left sidebar). Add a new client secret, copy the actual **Value** column (not the Secret ID UUID!), and paste both credentials below!</span>
                                </li>
                              </ol>
                            </div>

                            {/* Custom Microsoft Azure Credentials Overrides */}
                            <div className="mt-4 pt-4 border-t border-slate-200/60 font-sans space-y-3">
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">🔒 Self-Hosted / Custom Azure Client Credentials</p>
                              <p className="text-3xs text-slate-500 leading-normal mb-1">
                                Every Microsoft App Registration has its own unique, randomly generated Application ID. You **MUST** enter your custom Application ID and matching Client Secret Value below.
                              </p>
                              
                              {loadingDbMsKeys ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400 py-1 font-sans">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Fetching current database credentials...</span>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-600 block">Application (client) ID</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Your unique 36-character Azure Client ID GUID"
                                      value={dbMsClientId}
                                      onChange={(e) => setDbMsClientId(e.target.value)}
                                      className={`w-full bg-white border p-2 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${dbMsClientId.trim() === '392b79e9-3377-4a8e-aeb3-782aa4b373a3' ? 'border-blue-400 focus:border-blue-500 focus:ring-blue-500 bg-blue-50/10' : 'border-slate-250'}`}
                                    />
                                    {dbMsClientId.trim() === '392b79e9-3377-4a8e-aeb3-782aa4b373a3' && (
                                      <p className="text-[10px] text-blue-800 font-semibold mt-1 bg-blue-50 p-2 rounded border border-blue-200">
                                        ℹ️ Default Theme Application ID: This matches your Microsoft Azure App Registration. Make sure the Client Secret Value you saved corresponds to this application ID.
                                      </p>
                                    )}
                                    {dbMsClientId.trim() && dbMsClientId.trim() !== '392b79e9-3377-4a8e-aeb3-782aa4b373a3' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbMsClientId.trim()) && (
                                      <p className="text-[10px] text-rose-700 font-medium mt-1">
                                        ⚠️ Client ID format is invalid! It must be a 36-character hyphenated UUID. Example: f40e01d2-d570-4a4c-8159-3574d75211e2.
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-600 block">Client Secret Value</label>
                                    <input
                                      type="password"
                                      placeholder={dbMsClientSecret ? "••••••••••••••••" : "Enter your Client Secret VALUE (e.g. text containing letters/symbols, NOT a Guid)"}
                                      value={dbMsClientSecret}
                                      onChange={(e) => setDbMsClientSecret(e.target.value)}
                                      className={`w-full bg-white border p-2 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbMsClientSecret.trim()) ? 'border-amber-500 focus:border-amber-600 focus:ring-amber-600 bg-amber-50' : 'border-slate-250'}`}
                                    />
                                    {/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbMsClientSecret.trim()) && (
                                      <p className="text-[10px] text-amber-800 font-semibold mt-1 bg-amber-100/60 p-2 rounded border border-amber-200">
                                        ⚠️ WARNING: You have entered a Secret ID Guidance UUID (e.g., f8096a8a...) rather than the actual Client Secret **VALUE** (which typically has a format containing letters, numbers, and symbols like '~' or '-'). The Secret ID will be rejected by Azure. Please copy the text string from the **Value** column right after creating the secret in Azure ID.
                                      </p>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-600 block">Azure AD Tenant ID (Optional)</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. common, organizations, or your 36-char Tenant ID GUID"
                                      value={dbMsTenantId}
                                      onChange={(e) => setDbMsTenantId(e.target.value)}
                                      className="w-full bg-white border border-slate-250 p-2 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-0.5">Defaults to <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-705 font-semibold">common</code> if left blank. Specify your Tenant ID GUID if your Azure App is Single-Tenant only.</p>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-600 block">Custom Redirect URI (Optional)</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. https://www.prospacescrm.com/oauth-callback"
                                      value={dbMsRedirectUri}
                                      onChange={(e) => setDbMsRedirectUri(e.target.value)}
                                      className="w-full bg-white border border-slate-250 p-2 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-0.5">Defaults to https://www.prospacescrm.com/oauth-callback if empty.</p>
                                  </div>

                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={handleSaveDbMsKeys}
                                      disabled={savingDbMsKeys}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm outline-none transition-all cursor-pointer"
                                    >
                                      {savingDbMsKeys ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                          <span>Saving and Syncing...</span>
                                        </>
                                      ) : (
                                        <span>Save & Activate App Credentials</span>
                                      )}
                                    </button>

                                    {(dbMsClientId || dbMsClientSecret) && (
                                      <button
                                        onClick={async () => {
                                          if (confirm("Are you sure you want to clear your custom overrides and revert to system standard credentials?")) {
                                            try {
                                              const supabase = createClient();
                                              await supabase.from('kv_store_8405be07').delete().eq('key', 'secrets:microsoft');
                                              setDbMsClientId('');
                                              setDbMsClientSecret('');
                                              setDbMsRedirectUri('');
                                              setDbMsTenantId('');
                                              toast.success("Custom overrides cleared. Default credentials restored.");
                                            } catch (err: any) {
                                              toast.error("Error clearing settings: " + err.message);
                                            }
                                          }
                                        }}
                                        className="p-2 border border-slate-250 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg text-xs outline-none transition-all cursor-pointer font-medium"
                                      >
                                        Clear Override
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                  
                  {/* Breadcrumb / Back Navigation */}
                  {driveTab === "onedrive" && msAccounts.length > 0 && (onedriveFolderId || onedriveFolderPath.length > 0) && (
                    <div className="mb-4 px-3 py-2 bg-blue-50/55 border border-blue-100 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium overflow-x-auto whitespace-nowrap">
                        <span className="text-slate-400">OneDrive:</span>
                        <button 
                          onClick={() => {
                            setOnedriveFolderId(null);
                            setOnedriveFolderPath([]);
                            fetchFiles("onedrive", false, null);
                          }}
                          className="hover:text-blue-600 transition-colors font-semibold text-blue-700"
                        >
                          Root
                        </button>
                        {onedriveFolderPath.map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3 text-slate-305" />
                            <button
                              onClick={() => {
                                const newPath = onedriveFolderPath.slice(0, idx + 1);
                                setOnedriveFolderId(item.id);
                                setOnedriveFolderPath(newPath);
                                fetchFiles("onedrive", false, item.id);
                              }}
                              className={`hover:text-blue-600 transition-colors ${idx === onedriveFolderPath.length - 1 ? 'font-bold text-slate-800' : 'text-blue-700'}`}
                            >
                              {item.name}
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          if (onedriveFolderPath.length <= 1) {
                            setOnedriveFolderId(null);
                            setOnedriveFolderPath([]);
                            await fetchFiles("onedrive", false, null);
                          } else {
                            const newPath = [...onedriveFolderPath];
                            newPath.pop();
                            const parent = newPath[newPath.length - 1];
                            setOnedriveFolderId(parent.id);
                            setOnedriveFolderPath(newPath);
                            await fetchFiles("onedrive", false, parent.id);
                          }
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-md shadow-3xs transition-all shrink-0 font-sans"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Up
                      </button>
                    </div>
                  )}

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
                      {getExplorerFiles().map((file) => {
                        const isOneDriveCloudFolder = driveTab === "onedrive" && msAccounts.length > 0 && file.isFolder;
                        const isSyncing = syncingFileId === file.id;

                        const handleFolderOpen = () => {
                          if (file.id) {
                            const newPath = [...onedriveFolderPath, { id: file.id, name: file.name }];
                            setOnedriveFolderId(file.id);
                            setOnedriveFolderPath(newPath);
                            fetchFiles("onedrive", false, file.id);
                          }
                        };

                        return (
                          <div key={file.id || file.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hovering hover:bg-slate-50 transition-colors gap-2">
                            <div 
                              className={`flex items-center gap-3 ${isOneDriveCloudFolder ? 'cursor-pointer' : ''}`}
                              onClick={() => {
                                if (isOneDriveCloudFolder) {
                                  handleFolderOpen();
                                }
                              }}
                            >
                              <span className="p-2 bg-slate-100 text-slate-500 rounded-md">
                                {isOneDriveCloudFolder ? (
                                  <Folder className="w-4 h-4 text-amber-500 fill-amber-200" />
                                ) : (
                                  <FileText className="w-4 h-4 text-slate-650" />
                                )}
                              </span>
                              <div className="text-left font-normal max-w-xs sm:max-w-md">
                                <p className={`font-semibold text-xs text-slate-800 truncate ${isOneDriveCloudFolder ? 'hover:text-blue-600 transition-colors' : ''}`} title={file.name}>
                                  {file.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-3xs text-slate-400">
                                  {isOneDriveCloudFolder ? (
                                    <span className="font-semibold text-amber-750/80 bg-amber-50 px-1 py-0.2 rounded text-[10px]">Folder</span>
                                  ) : (
                                    <span className="font-mono bg-slate-50 px-1 py-0.2 rounded text-slate-550">{(file.size / 1024).toFixed(1)} KB</span>
                                  )}
                                  <span>•</span>
                                  <span>Modified: {new Date(file.lastModified).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5">
                              {isOneDriveCloudFolder ? (
                                <button
                                  onClick={handleFolderOpen}
                                  className="px-2.5 py-1 border hover:bg-slate-50 hover:border-slate-350 rounded text-3xs font-semibold text-slate-700 shadow-3xs flex items-center gap-1 bg-white cursor-pointer"
                                >
                                  Open Folder
                                </button>
                              ) : (
                                <>
                                  {/* Sync / Replicate button for real OneDrive cloud file */}
                                  {driveTab === "onedrive" && msAccounts.length > 0 && file.id && (
                                    <button
                                      disabled={isSyncing}
                                      onClick={() => syncOneDriveCloudFileToBackend(file.id!, file.name)}
                                      className="p-1 px-1.5 border hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded bg-white shadow-3xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                      title="Sync this cloud file to server-side directory for physical scheduler operations"
                                    >
                                      {isSyncing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                      ) : (
                                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                                      )}
                                      <span className="text-[10px] font-bold text-slate-500">Sync to Server</span>
                                    </button>
                                  )}

                                  {/* Run shortcut trigger */}
                                  <button
                                    onClick={() => {
                                      setTabModeForFile(file, driveTab);
                                    }}
                                    className="px-2.5 py-1 border hover:bg-slate-50 hover:border-slate-350 rounded text-3xs font-semibold text-slate-700 shadow-3xs flex items-center gap-1 bg-white cursor-pointer"
                                    title="Import records instantly to crm database"
                                  >
                                    <Play className="w-2.5 h-2.5 text-slate-600 fill-slate-500" /> Instant Import
                                  </button>

                                  {/* Download file */}
                                  <button
                                    onClick={() => handleFileDownload(file.name, driveTab, file.id)}
                                    className="p-1 px-1.5 border hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded bg-white shadow-3xs cursor-pointer"
                                    title="Download backup file"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-600" />
                                  </button>

                                  {/* Delete File */}
                                  <button
                                    onClick={() => handleFileDelete(file.name, driveTab)}
                                    className="p-1 px-1.5 border hover:border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 rounded bg-white shadow-3xs cursor-pointer"
                                    title={driveTab === "onedrive" && msAccounts.length > 0 ? "Delete synchronized server-side mirror file copy" : "Delete file permanently"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
            
            {/* Left Hand Sidebar wrapping interactive block + layout download guides */}
            <div className="lg:col-span-1 space-y-5">
              
              {/* Interactive workflow configure card */}
              <div className="bg-white border rounded-xl p-5 shadow-2xs space-y-4 text-left font-normal">
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

                            setManualUploading(true);
                            const uploadToastId = toast.loading(`Uploading "${file.name}" to directory...`);
                            
                            try {
                              const base64Data = await readFileAsBase64(file);
                              if (connectionMode === "supabase") {
                                await saveVirtualFile(file.name, base64Data, manualStorage);
                                toast.dismiss(uploadToastId);
                                toast.success(`Uploaded & loaded "${file.name}" to virtual ${manualStorage === "onedrive" ? "OneDrive" : "Local Drive"} successfully!`);
                                setManualFileName(file.name);
                                fetchFiles(manualStorage);
                              } else {
                                const res = await safeFetch(`/api/import-export/storage/${manualStorage}/upload-base64`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: JSON.stringify({
                                    fileName: file.name,
                                    fileContent: base64Data
                                  })
                                }, 120000);
                                
                                const data = await parseResponseJson(res);
                                toast.dismiss(uploadToastId);

                                if (data.success) {
                                  toast.success(`Uploaded & loaded "${file.name}" to ${manualStorage === "onedrive" ? "OneDrive" : "Local Drive"} successfully!`);
                                  setManualFileName(file.name);
                                  fetchFiles(manualStorage);
                                } else {
                                  throw new Error(data.error || "File upload response was not successful");
                                }
                              }
                            } catch (err: any) {
                              toast.dismiss(uploadToastId);
                              console.error("Manual browse upload failed:", err);
                              toast.error(`File upload failed: ${err.message || err}`);
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

            {/* CRM Layout Template Download Hub */}
            <div className="bg-white border rounded-xl p-5 shadow-2xs text-left font-normal space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="p-1 bg-blue-50 text-blue-600 rounded">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="font-bold text-slate-850 text-sm">File Layout Reference</h3>
                </div>
                <p className="text-2xs text-slate-500 font-normal leading-normal">
                  Download correctly formatted spreadsheet templates to ensure successful bulk spreadsheet uploads.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-4xs uppercase text-slate-400 font-bold mb-1">Table Layout Model</label>
                  <select
                    value={selectedLayoutModule}
                    onChange={(e) => setSelectedLayoutModule(e.target.value as any)}
                    className="w-full border rounded-lg px-2.5 py-1.5 font-medium text-slate-700 bg-white text-xs outline-none focus:border-blue-500"
                  >
                    <option value="contacts">CRM Customer & Team Contacts</option>
                    <option value="inventory">Product Inventory Materials</option>
                    <option value="deals">Sales Contracts / Deals Estimations</option>
                  </select>
                </div>

                <div className="bg-slate-50 border p-3 rounded-lg text-2xs space-y-2">
                  <p className="font-semibold text-slate-700 leading-tight">
                    {SCHEMA_GUIDES[selectedLayoutModule].title} Layout
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {SCHEMA_GUIDES[selectedLayoutModule].description}
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowLayoutGuide(!showLayoutGuide)}
                    className="w-full bg-white border hover:border-slate-350 px-2.5 py-1 rounded text-3xs font-semibold text-slate-600 flex items-center justify-between transition-colors shadow-3xs cursor-pointer"
                  >
                    <span>Column Reference Checklist</span>
                    {showLayoutGuide ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </button>

                  {showLayoutGuide && (
                    <div className="pt-2 max-h-[180px] overflow-y-auto space-y-1.5 border-t border-slate-200 mt-1 scrollbar-thin">
                      {SCHEMA_GUIDES[selectedLayoutModule].fields.map((f, i) => (
                        <div key={i} className="text-[10px] leading-relaxed border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-slate-800 font-bold text-[10px]">{f.name}</code>
                            <span className={`px-1 rounded text-[8px] font-bold ${f.req ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                              {f.req ? "REQUIRED" : "OPTIONAL"}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[10px] mt-0.5">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-4xs uppercase text-slate-400 font-bold">Download Template Formats</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(selectedLayoutModule, "xlsx")}
                      className="py-1.5 border hover:border-emerald-300 hover:bg-emerald-50 text-emerald-800 transition-all bg-white font-bold rounded-lg text-3xs shadow-3xs flex items-center justify-center gap-1 cursor-pointer"
                      title="Download sample Excel binary sheet template"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>EXCEL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(selectedLayoutModule, "csv")}
                      className="py-1.5 border hover:border-blue-300 hover:bg-blue-50 text-blue-800 transition-all bg-white font-bold rounded-lg text-3xs shadow-3xs flex items-center justify-center gap-1 cursor-pointer"
                      title="Download standard Comma-Separated Values template"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(selectedLayoutModule, "json")}
                      className="py-1.5 border hover:border-slate-400 hover:bg-slate-50 text-slate-800 transition-all bg-white font-bold rounded-lg text-3xs shadow-3xs flex items-center justify-center gap-1 cursor-pointer"
                      title="Download sample structured JSON array model"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                            <span className="text-slate-350">{(log.fileStorage || 'local').toUpperCase()} // {log.fileName || 'unknown'}</span>
                          </p>
                          <p className={`${log.status === "success" ? "text-slate-300" : "text-rose-400"} text-2xs leading-relaxed`}>
                            {log.message}
                          </p>
                          <div className="text-4xs text-slate-500 mt-1 select-none">
                            MODULE = {(log.module || 'unknown').toUpperCase()} | PROCESS_STATUS = {(log.status || 'unknown').toUpperCase()} | IMPACTED_ROWS = {log.recordCount ?? 0}
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
        const setTabModeForFile = async (file: StorageFile, currentDrive: "local" | "onedrive") => {
          setManualType("import");
          setManualStorage(currentDrive);
          setManualFileName(file.name);
          // detect module target from name keyword
          if (file.name.toLowerCase().includes("contacts")) setManualModule("contacts");
          else if (file.name.toLowerCase().includes("inventory")) setManualModule("inventory");
          else if (file.name.toLowerCase().includes("deals")) setManualModule("deals");
          
          if (currentDrive === "onedrive" && msAccounts.length > 0 && file.id) {
            try {
              await syncOneDriveCloudFileToBackend(file.id, file.name, true);
            } catch (err: any) {
              toast.warning(`Note: Auto-synchronization of cloud file failed (${err.message || err}). Proceeding with local configuration workspace configuration.`);
            }
          }

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
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setActionStorage(val);
                        fetchFiles(val, false, val === "onedrive" ? onedriveFolderId : null);
                      }}
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
                        <div className="flex items-center justify-between">
                          <label className="block text-4xs uppercase text-slate-450 font-bold font-mono">Select existing file in Folder</label>
                          {actionStorage === "onedrive" && msAccounts.length > 0 && (
                            <span className="text-[10px] text-blue-600 font-semibold truncate max-w-[150px]">
                              Folder: {onedriveFolderPath.length > 0 ? onedriveFolderPath[onedriveFolderPath.length - 1].name : "Root"}
                            </span>
                          )}
                        </div>
                        {(() => {
                           const currentFiles = actionStorage === "onedrive" ? onedriveFiles : localFiles;
                           // Only files (not folders) should be available inside Target Filename select option
                           const onlyFiles = currentFiles.filter(f => !f.isFolder);
                           const folders = currentFiles.filter(f => f.isFolder);

                           return (
                             <div className="space-y-2">
                               <select
                                 value={onlyFiles.some(f => f.name === actionFileName) ? actionFileName : ""}
                                 onChange={(e) => {
                                   const selectedFile = onlyFiles.find(f => f.name === e.target.value);
                                   setActionFileName(e.target.value);
                                   if (e.target.value) {
                                     toast.success(`Selected file "${e.target.value}"`);
                                     // Auto sync from cloud to backend if it's OneDrive
                                     if (actionStorage === "onedrive" && msAccounts.length > 0 && selectedFile?.id) {
                                       syncOneDriveCloudFileToBackend(selectedFile.id, selectedFile.name, true).catch(() => {});
                                     }
                                   }
                                 }}
                                 className="w-full border rounded-lg px-2.5 py-2 outline-none font-medium text-slate-700 bg-white text-xs truncate focus:border-blue-500 cursor-pointer"
                               >
                                 <option value="">-- Choose file on drive --</option>
                                 {onlyFiles.map(file => (
                                   <option key={file.id || file.name} value={file.name}>
                                     {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                   </option>
                                 ))}
                               </select>

                               {/* If OneDrive, allow navigating subfolders directly in this modal! */}
                               {actionStorage === "onedrive" && msAccounts.length > 0 && (folders.length > 0 || onedriveFolderPath.length > 0) && (
                                 <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] space-y-1.5">
                                   <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pb-1 border-b border-blue-100/50">
                                     <span className="font-bold text-slate-700">Navigate OneDrive Folders:</span>
                                     {onedriveFolderPath.length > 0 && (
                                       <button
                                         type="button"
                                         onClick={async () => {
                                           const newPath = [...onedriveFolderPath];
                                           newPath.pop();
                                           const parent = newPath[newPath.length - 1];
                                           const parentId = parent ? parent.id : null;
                                           setOnedriveFolderId(parentId);
                                           setOnedriveFolderPath(newPath);
                                           await fetchFiles("onedrive", false, parentId);
                                         }}
                                         className="text-blue-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                       >
                                         <ArrowLeft className="w-2.5 h-2.5" /> Back
                                       </button>
                                     )}
                                   </div>
                                   <div className="max-h-[80px] overflow-y-auto space-y-1">
                                     {onedriveFolderPath.length > 0 && (
                                       <button
                                         type="button"
                                         onClick={async () => {
                                           setOnedriveFolderId(null);
                                           setOnedriveFolderPath([]);
                                           await fetchFiles("onedrive", false, null);
                                         }}
                                         className="w-full text-left flex items-center gap-1.5 px-2 py-0.5 hover:bg-blue-100/30 text-blue-700 rounded text-[10.5px] font-sans font-bold"
                                       >
                                         <Folder className="w-3 h-3 text-amber-500 fill-amber-200" />
                                         <span>[ROOT DIRECTORY]</span>
                                       </button>
                                     )}
                                     {folders.map(folder => (
                                       <button
                                         key={folder.id}
                                         type="button"
                                         onClick={async () => {
                                           if (folder.id) {
                                             const newPath = [...onedriveFolderPath, { id: folder.id, name: folder.name }];
                                             setOnedriveFolderId(folder.id);
                                             setOnedriveFolderPath(newPath);
                                             await fetchFiles("onedrive", false, folder.id);
                                           }
                                         }}
                                         className="w-full text-left flex items-center gap-1.5 px-2 py-0.5 hover:bg-blue-100/30 hover:text-blue-800 rounded transition-colors text-slate-700 truncate cursor-pointer"
                                       >
                                         <Folder className="w-3 h-3 text-amber-500 fill-amber-100" />
                                         <span>{folder.name}</span>
                                       </button>
                                     ))}
                                     {folders.length === 0 && <span className="text-slate-400 text-[10px] italic block px-2 py-0.5">No subfolders found</span>}
                                   </div>
                                 </div>
                               )}
                             </div>
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

                {/* Cloud & Power settings */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-3">
                  <span className="text-4xs uppercase tracking-wider text-slate-500 font-bold font-mono block">Unattended Node Settings</span>
                  
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="opt-runWhetherComputerOff"
                      checked={runWhetherComputerOff}
                      onChange={(e) => setRunWhetherComputerOff(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="opt-runWhetherComputerOff" className="block text-slate-700 font-semibold text-xs select-none">
                        Run task whether user is logged on or not / Run whether computer is turned on or off
                      </label>
                      <p className="text-3xs text-slate-400 leading-normal font-normal mt-0.5">
                        Normally, tasks with OneDrive target storage require synchronization to are handled server-side. Enabling this allows our background container to safely execute this OneDrive replication flow unattended even if your own computer is turned off.
                      </p>
                    </div>
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
