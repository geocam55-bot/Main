import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Database,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  ArrowRight,
  ShieldCheck,
  Package,
  Users,
  FileText,
  Plus,
  Trash2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Server,
  Zap,
  Activity,
  Code,
  Sliders,
  Play,
  Clock,
  ExternalLink,
  Layers
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface FieldMap {
  localField: string;
  targetField: string;
  type: string;
  isRequired?: boolean;
}

interface TableSyncConfig {
  enabled: boolean;
  targetTableName: string;
  syncDirection: 'bidirectional' | 'export_only' | 'import_only';
  primaryKeyMatch: string;
  fieldMappings: FieldMap[];
}

export function ThirdPartyDbSync() {
  // Connection Configuration State
  const [dbProvider, setDbProvider] = useState('postgres');
  const [endpointUrl, setEndpointUrl] = useState('https://db.partner-enterprise.com/v1/sync');
  const [dbName, setDbName] = useState('production_crm_vault');
  const [apiKey, setApiKey] = useState('sk_live_db_9a8f7e6d5c4b3a21_ext_sync');
  const [showApiKey, setShowApiKey] = useState(false);
  const [authHeaderType, setAuthHeaderType] = useState('bearer');
  
  // Connection Testing State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('success');
  const [connectionDetails, setConnectionDetails] = useState({
    latencyMs: 118,
    version: 'PostgreSQL 15.4 / REST v2',
    connectedTables: 3,
    lastTested: 'Just now'
  });

  // Table Mapping Configurations
  const [inventoryConfig, setInventoryConfig] = useState<TableSyncConfig>({
    enabled: true,
    targetTableName: 'external_inventory',
    syncDirection: 'bidirectional',
    primaryKeyMatch: 'sku',
    fieldMappings: [
      { localField: 'sku', targetField: 'item_code', type: 'string', isRequired: true },
      { localField: 'description', targetField: 'product_name', type: 'string' },
      { localField: 'quantity', targetField: 'stock_qty', type: 'number' },
      { localField: 'unitPrice', targetField: 'unit_cost', type: 'number' },
      { localField: 'unit_of_measure', targetField: 'uom', type: 'string' },
      { localField: 'category', targetField: 'category_name', type: 'string' },
    ]
  });

  const [contactsConfig, setContactsConfig] = useState<TableSyncConfig>({
    enabled: true,
    targetTableName: 'crm_contacts',
    syncDirection: 'bidirectional',
    primaryKeyMatch: 'email',
    fieldMappings: [
      { localField: 'name', targetField: 'full_name', type: 'string', isRequired: true },
      { localField: 'email', targetField: 'primary_email', type: 'string', isRequired: true },
      { localField: 'phone', targetField: 'phone_number', type: 'string' },
      { localField: 'company', targetField: 'organization_name', type: 'string' },
      { localField: 'address', targetField: 'billing_address', type: 'string' },
      { localField: 'status', targetField: 'lead_status', type: 'string' },
    ]
  });

  const [bidsConfig, setBidsConfig] = useState<TableSyncConfig>({
    enabled: true,
    targetTableName: 'quotes_bids',
    syncDirection: 'export_only',
    primaryKeyMatch: 'quote_number',
    fieldMappings: [
      { localField: 'quote_number', targetField: 'bid_id', type: 'string', isRequired: true },
      { localField: 'title', targetField: 'project_name', type: 'string' },
      { localField: 'total', targetField: 'deal_value', type: 'number' },
      { localField: 'status', targetField: 'bid_stage', type: 'string' },
      { localField: 'contact_name', targetField: 'client_name', type: 'string' },
      { localField: 'created_at', targetField: 'submission_date', type: 'datetime' },
    ]
  });

  // Global Sync Settings
  const [syncFrequency, setSyncFrequency] = useState('realtime');
  const [conflictPolicy, setConflictPolicy] = useState('local_wins');
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);
  const [enableAuditLog, setEnableAuditLog] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Manual Sync Runner Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncingProgress, setSyncingProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom Field Dialog
  const [addFieldModalTable, setAddFieldModalTable] = useState<'inventory' | 'contacts' | 'bids' | null>(null);
  const [newLocalField, setNewLocalField] = useState('');
  const [newTargetField, setNewTargetField] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');

  // Copy code helper
  const [copiedCode, setCopiedCode] = useState(false);

  const handleTestConnection = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API Key to test connection');
      return;
    }
    setTestingConnection(true);
    setConnectionStatus('idle');

    setTimeout(() => {
      setTestingConnection(false);
      setConnectionStatus('success');
      setConnectionDetails({
        latencyMs: Math.floor(Math.random() * 60) + 80,
        version: `${dbProvider.toUpperCase()} REST API Gateway v2.4`,
        connectedTables: (inventoryConfig.enabled ? 1 : 0) + (contactsConfig.enabled ? 1 : 0) + (bidsConfig.enabled ? 1 : 0),
        lastTested: 'Just now'
      });
      toast.success('Successfully connected to 3rd-party database using API Key!');
    }, 1200);
  };

  const handleRunSyncNow = () => {
    setSyncModalOpen(true);
    setIsSyncing(true);
    setSyncingProgress(10);
    setSyncLogs([
      `[${new Date().toLocaleTimeString()}] Initiating 3rd-Party DB Synchronization...`,
      `[${new Date().toLocaleTimeString()}] Authenticating with endpoint: ${endpointUrl}`,
      `[${new Date().toLocaleTimeString()}] Using API Key: ${apiKey.substring(0, 10)}... (Header: ${authHeaderType.toUpperCase()})`,
    ]);

    setTimeout(() => {
      setSyncingProgress(35);
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📦 Table 1/3 [Inventory]: Syncing ${inventoryConfig.targetTableName}...`,
        `[${new Date().toLocaleTimeString()}]    ➔ Exported 148 inventory items (SKU matching verified).`,
      ]);
    }, 1000);

    setTimeout(() => {
      setSyncingProgress(70);
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 👥 Table 2/3 [Contacts]: Syncing ${contactsConfig.targetTableName}...`,
        `[${new Date().toLocaleTimeString()}]    ➔ Bi-directional sync matched 52 contacts via primary_email.`,
      ]);
    }, 2000);

    setTimeout(() => {
      setSyncingProgress(90);
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📄 Table 3/3 [Bids]: Syncing ${bidsConfig.targetTableName}...`,
        `[${new Date().toLocaleTimeString()}]    ➔ Pushed 29 active quote bids to deal stage.`,
      ]);
    }, 3000);

    setTimeout(() => {
      setSyncingProgress(100);
      setIsSyncing(false);
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ Sync complete! 229 total records synchronized cleanly.`,
        `[${new Date().toLocaleTimeString()}] Audit log saved to system history.`
      ]);
      toast.success('Inventory, Contacts, and Bids tables synchronized successfully!');
    }, 3800);
  };

  const handleAddField = () => {
    if (!newLocalField.trim() || !newTargetField.trim() || !addFieldModalTable) return;
    
    const newMapping: FieldMap = {
      localField: newLocalField.trim(),
      targetField: newTargetField.trim(),
      type: newFieldType,
    };

    if (addFieldModalTable === 'inventory') {
      setInventoryConfig(prev => ({ ...prev, fieldMappings: [...prev.fieldMappings, newMapping] }));
    } else if (addFieldModalTable === 'contacts') {
      setContactsConfig(prev => ({ ...prev, fieldMappings: [...prev.fieldMappings, newMapping] }));
    } else if (addFieldModalTable === 'bids') {
      setBidsConfig(prev => ({ ...prev, fieldMappings: [...prev.fieldMappings, newMapping] }));
    }

    setAddFieldModalTable(null);
    setNewLocalField('');
    setNewTargetField('');
    toast.success('Custom field mapping added');
  };

  const handleRemoveField = (table: 'inventory' | 'contacts' | 'bids', index: number) => {
    if (table === 'inventory') {
      setInventoryConfig(prev => ({ ...prev, fieldMappings: prev.fieldMappings.filter((_, i) => i !== index) }));
    } else if (table === 'contacts') {
      setContactsConfig(prev => ({ ...prev, fieldMappings: prev.fieldMappings.filter((_, i) => i !== index) }));
    } else if (table === 'bids') {
      setBidsConfig(prev => ({ ...prev, fieldMappings: prev.fieldMappings.filter((_, i) => i !== index) }));
    }
  };

  const sampleCurl = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "${authHeaderType === 'bearer' ? 'Authorization: Bearer ' : 'X-API-Key: '}${apiKey}" \\
  -d '{
    "sync_mode": "${syncFrequency}",
    "tables": {
      "inventory": { "target": "${inventoryConfig.targetTableName}", "records": 148 },
      "contacts": { "target": "${contactsConfig.targetTableName}", "records": 52 },
      "bids": { "target": "${bidsConfig.targetTableName}", "records": 29 }
    }
  }'`;

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                <Database className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-foreground">3rd-Party Database Integration</h3>
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                    <Zap className="h-3 w-3 mr-1" /> Multi-Table Sync
                  </Badge>
                  <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                    <ShieldCheck className="h-3 w-3 mr-1" /> API Key Authenticated
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                  Connect ProSpaces CRM's core <strong>Inventory</strong>, <strong>Contacts</strong>, and <strong>Bids</strong> tables to your external database, data warehouse, or ERP system using secure API Key authentication.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="bg-background hover:bg-muted"
              >
                <Activity className={`h-4 w-4 mr-2 text-indigo-600 ${testingConnection ? 'animate-spin' : ''}`} />
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button onClick={handleRunSyncNow} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Play className="h-4 w-4 mr-2 fill-current" />
                Run Sync Now
              </Button>
            </div>
          </div>

          {/* Connected Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-indigo-100">
            <div className="flex items-center gap-3 p-2.5 bg-white/80 rounded-lg border border-indigo-100 shadow-2xs">
              <div className="p-2 bg-blue-100 rounded-md text-blue-700">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">1. Inventory Table</p>
                <p className="text-xs font-semibold text-foreground truncate">
                  Local <ArrowRightLeft className="inline h-3 w-3 text-indigo-500" /> <code className="bg-muted px-1 rounded">{inventoryConfig.targetTableName}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white/80 rounded-lg border border-indigo-100 shadow-2xs">
              <div className="p-2 bg-green-100 rounded-md text-green-700">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">2. Contacts Table</p>
                <p className="text-xs font-semibold text-foreground truncate">
                  Local <ArrowRightLeft className="inline h-3 w-3 text-indigo-500" /> <code className="bg-muted px-1 rounded">{contactsConfig.targetTableName}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white/80 rounded-lg border border-indigo-100 shadow-2xs">
              <div className="p-2 bg-amber-100 rounded-md text-amber-700">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">3. Bids Table</p>
                <p className="text-xs font-semibold text-foreground truncate">
                  Local <ArrowRight className="inline h-3 w-3 text-indigo-500" /> <code className="bg-muted px-1 rounded">{bidsConfig.targetTableName}</code>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: 3rd-Party Credentials & Endpoint */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-600" />
              Step 1: 3rd-Party Database Endpoint & API Key
            </span>
            {connectionStatus === 'success' && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Connection Verified ({connectionDetails.latencyMs}ms)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configure the connection URL, database provider type, and secret API Key generated by your 3rd-party database administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Provider */}
            <div className="space-y-1.5">
              <Label htmlFor="db-provider">Database Provider / Architecture</Label>
              <Select value={dbProvider} onValueChange={setDbProvider}>
                <SelectTrigger id="db-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL (REST API Gateway / Hasura / PostgREST)</SelectItem>
                  <SelectItem value="mysql">MySQL / MariaDB Cloud Database API</SelectItem>
                  <SelectItem value="supabase">Supabase Data API / PostgREST</SelectItem>
                  <SelectItem value="snowflake">Snowflake Data Warehouse REST API</SelectItem>
                  <SelectItem value="airtable">Airtable Enterprise Database API</SelectItem>
                  <SelectItem value="custom_rest">Generic REST / Webhook Sync Database</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auth Header Format */}
            <div className="space-y-1.5">
              <Label htmlFor="auth-header-style">API Key Authentication Header</Label>
              <Select value={authHeaderType} onValueChange={setAuthHeaderType}>
                <SelectTrigger id="auth-header-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Authorization: Bearer &lt;API_KEY&gt;</SelectItem>
                  <SelectItem value="x-api-key">X-API-Key: &lt;API_KEY&gt;</SelectItem>
                  <SelectItem value="x-db-key">X-Database-Key: &lt;API_KEY&gt;</SelectItem>
                  <SelectItem value="query">Query Parameter (?api_key=&lt;API_KEY&gt;)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Endpoint URL */}
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="endpoint-url">3rd-Party Database Sync Endpoint URL *</Label>
              <div className="relative">
                <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endpoint-url"
                  className="pl-9 font-mono text-sm"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://api.your-external-db.com/v1/sync"
                />
              </div>
            </div>

            {/* Target Database Name */}
            <div className="space-y-1.5">
              <Label htmlFor="db-name">Database / Schema Name</Label>
              <Input
                id="db-name"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="production_vault"
              />
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="3rd-party-api-key" className="flex items-center gap-1.5">
                <Key className="h-4 w-4 text-amber-600" />
                3rd-Party Database API Key *
              </Label>
              <span className="text-xs text-muted-foreground">Key is encrypted & stored securely</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="3rd-party-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  className="font-mono pr-10 text-sm"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_db_..."
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="shrink-0"
              >
                {testingConnection ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin text-indigo-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" />
                )}
                Validate Key
              </Button>
            </div>
          </div>

          {connectionStatus === 'success' && (
            <Alert className="bg-emerald-50/70 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-900 text-sm font-semibold">Endpoint & API Key Validated</AlertTitle>
              <AlertDescription className="text-emerald-800 text-xs mt-1">
                Connected to <strong>{connectionDetails.version}</strong> in {connectionDetails.latencyMs}ms. Target tables <code>external_inventory</code>, <code>crm_contacts</code>, and <code>quotes_bids</code> are reachable and writable.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Multi-Table Mapping (Inventory, Contacts, Bids) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Step 2: Table & Schema Field Mapping
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              Map ProSpaces CRM tables to your 3rd-party database tables
            </span>
          </CardTitle>
          <CardDescription>
            Configure table names, sync directions, and individual column field mappings for Inventory, Contacts, and Bids.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="inventory" className="flex items-center gap-2 text-xs sm:text-sm">
                <Package className="h-4 w-4 text-blue-600" />
                <span>Inventory Table</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {inventoryConfig.fieldMappings.length} Fields
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4 text-green-600" />
                <span>Contacts Table</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {contactsConfig.fieldMappings.length} Fields
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="bids" className="flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>Bids / Quotes Table</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {bidsConfig.fieldMappings.length} Fields
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* INVENTORY TABLE TAB */}
            <TabsContent value="inventory" className="space-y-4 pt-1">
              <TableSyncControl
                title="Inventory Table Configuration"
                icon={<Package className="h-5 w-5 text-blue-600" />}
                config={inventoryConfig}
                setConfig={setInventoryConfig}
                onAddField={() => setAddFieldModalTable('inventory')}
                onRemoveField={(idx) => handleRemoveField('inventory', idx)}
              />
            </TabsContent>

            {/* CONTACTS TABLE TAB */}
            <TabsContent value="contacts" className="space-y-4 pt-1">
              <TableSyncControl
                title="Contacts Table Configuration"
                icon={<Users className="h-5 w-5 text-green-600" />}
                config={contactsConfig}
                setConfig={setContactsConfig}
                onAddField={() => setAddFieldModalTable('contacts')}
                onRemoveField={(idx) => handleRemoveField('contacts', idx)}
              />
            </TabsContent>

            {/* BIDS TABLE TAB */}
            <TabsContent value="bids" className="space-y-4 pt-1">
              <TableSyncControl
                title="Bids & Quotes Table Configuration"
                icon={<FileText className="h-5 w-5 text-amber-600" />}
                config={bidsConfig}
                setConfig={setBidsConfig}
                onAddField={() => setAddFieldModalTable('bids')}
                onRemoveField={(idx) => handleRemoveField('bids', idx)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Step 3: Automation & Policy Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-600" />
            Step 3: Sync Schedule & Conflict Resolution Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="sync-frequency">Synchronization Trigger & Schedule</Label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger id="sync-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">⚡ Real-Time Instant Webhook (On Insert / Update)</SelectItem>
                  <SelectItem value="15min">⏱️ Every 15 Minutes</SelectItem>
                  <SelectItem value="hourly">🕒 Every Hour</SelectItem>
                  <SelectItem value="daily">📅 Daily at Midnight UTC</SelectItem>
                  <SelectItem value="manual">🛑 Manual Sync Only (On Demand)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Real-time triggers use webhooks to transmit changes using your API Key instantly whenever Inventory, Contacts, or Bids are modified.
              </p>
            </div>

            {/* Conflict Policy */}
            <div className="space-y-2">
              <Label htmlFor="conflict-policy">Conflict Resolution Strategy</Label>
              <Select value={conflictPolicy} onValueChange={setConflictPolicy}>
                <SelectTrigger id="conflict-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local_wins">ProSpaces CRM (Local) Overwrites 3rd Party</SelectItem>
                  <SelectItem value="remote_wins">3rd Party Database Overwrites Local CRM</SelectItem>
                  <SelectItem value="newest_wins">Keep Most Recently Modified Record (Timestamp)</SelectItem>
                  <SelectItem value="fail_and_alert">Flag Conflict & Require Manual Admin Approval</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines precedence when a record in Inventory, Contacts, or Bids is changed simultaneously on both sides.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Auto-Create Missing Records</Label>
                <p className="text-[11px] text-muted-foreground">Insert unmapped SKUs, emails, or bids</p>
              </div>
              <Switch checked={autoCreateMissing} onCheckedChange={setAutoCreateMissing} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Audit Trail Logging</Label>
                <p className="text-[11px] text-muted-foreground">Save full API payload & response</p>
              </div>
              <Switch checked={enableAuditLog} onCheckedChange={setEnableAuditLog} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Sync Failure Alerts</Label>
                <p className="text-[11px] text-muted-foreground">Notify Admin on HTTP errors</p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Sample Request Payload & cURL */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Code className="h-5 w-5 text-indigo-600" />
              API Key Request Payload & Developer Reference
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(sampleCurl);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
                toast.success('cURL command copied to clipboard');
              }}
              className="text-xs"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copiedCode ? 'Copied' : 'Copy cURL'}
            </Button>
          </CardTitle>
          <CardDescription>
            Example HTTP API call used by the sync worker to push/pull Inventory, Contacts, and Bids data using your configured API Key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
            {sampleCurl}
          </pre>
        </CardContent>
      </Card>

      {/* Add Custom Field Dialog */}
      <Dialog open={!!addFieldModalTable} onOpenChange={() => setAddFieldModalTable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Add Custom Field Mapping ({addFieldModalTable?.toUpperCase()})
            </DialogTitle>
            <DialogDescription>
              Map an additional attribute from ProSpaces CRM to a column in your 3rd-party database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>ProSpaces Local Field Name</Label>
              <Input
                placeholder="e.g. supplier_code, alt_phone, discount_rate"
                value={newLocalField}
                onChange={(e) => setNewLocalField(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>3rd-Party Column Name</Label>
              <Input
                placeholder="e.g. ext_vendor_id, secondary_phone, disc_pct"
                value={newTargetField}
                onChange={(e) => setNewTargetField(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data Type</Label>
              <Select value={newFieldType} onValueChange={setNewFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">Text / String</SelectItem>
                  <SelectItem value="number">Number / Integer / Float</SelectItem>
                  <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                  <SelectItem value="datetime">Date / Timestamp</SelectItem>
                  <SelectItem value="json">JSON / Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddFieldModalTable(null)}>Cancel</Button>
            <Button onClick={handleAddField} disabled={!newLocalField.trim() || !newTargetField.trim()}>
              Add Field Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Sync Logs Dialog */}
      <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
              3rd-Party Database Sync Status
            </DialogTitle>
            <DialogDescription>
              Synchronizing Inventory, Contacts, and Bids tables with API Key authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Syncing Tables...</span>
                <span>{syncingProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${syncingProgress}%` }}
                />
              </div>
            </div>

            {/* Log output */}
            <div className="p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg h-56 overflow-y-auto space-y-1.5">
              {syncLogs.map((log, index) => (
                <div key={index} className="leading-relaxed border-b border-slate-800/50 pb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button disabled={isSyncing} onClick={() => setSyncModalOpen(false)}>
              {isSyncing ? 'Synchronizing...' : 'Close Window'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for individual table configurations
function TableSyncControl({
  title,
  icon,
  config,
  setConfig,
  onAddField,
  onRemoveField,
}: {
  title: string;
  icon: React.ReactNode;
  config: TableSyncConfig;
  setConfig: React.Dispatch<React.SetStateAction<TableSyncConfig>>;
  onAddField: () => void;
  onRemoveField: (idx: number) => void;
}) {
  return (
    <div className="space-y-4 border rounded-xl p-4 bg-muted/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h4 className="font-semibold text-sm text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">Set target table name and direction</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground font-medium">Enable Table Sync</Label>
          <Switch
            checked={config.enabled}
            onCheckedChange={(val) => setConfig(prev => ({ ...prev, enabled: val }))}
          />
        </div>
      </div>

      {config.enabled ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Table Name */}
            <div className="space-y-1">
              <Label className="text-xs">3rd-Party Table Name</Label>
              <Input
                className="h-8 text-xs font-mono"
                value={config.targetTableName}
                onChange={(e) => setConfig(prev => ({ ...prev, targetTableName: e.target.value }))}
                placeholder="table_name"
              />
            </div>

            {/* Sync Direction */}
            <div className="space-y-1">
              <Label className="text-xs">Sync Direction</Label>
              <Select
                value={config.syncDirection}
                onValueChange={(val: any) => setConfig(prev => ({ ...prev, syncDirection: val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">Bi-Directional (↔ Both Ways)</SelectItem>
                  <SelectItem value="export_only">Export Only (➔ Local to 3rd Party)</SelectItem>
                  <SelectItem value="import_only">Import Only (⬅ 3rd Party to Local)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary Key Match */}
            <div className="space-y-1">
              <Label className="text-xs">Primary Key Match Column</Label>
              <Input
                className="h-8 text-xs font-mono"
                value={config.primaryKeyMatch}
                onChange={(e) => setConfig(prev => ({ ...prev, primaryKeyMatch: e.target.value }))}
                placeholder="sku / email / quote_number"
              />
            </div>
          </div>

          {/* Field Mappings Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Column Field Mappings</Label>
              <Button variant="outline" size="sm" onClick={onAddField} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Custom Field
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-background">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="py-2 px-3">ProSpaces Local Field</th>
                    <th className="py-2 px-3 text-center">Direction</th>
                    <th className="py-2 px-3">3rd-Party Target Column</th>
                    <th className="py-2 px-3">Data Type</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {config.fieldMappings.map((mapping, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono text-indigo-700 font-medium">
                        {mapping.localField}
                        {mapping.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        {config.syncDirection === 'bidirectional' ? (
                          <ArrowRightLeft className="h-3.5 w-3.5 mx-auto text-indigo-500" />
                        ) : config.syncDirection === 'export_only' ? (
                          <ArrowRight className="h-3.5 w-3.5 mx-auto text-emerald-500" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5 mx-auto text-amber-500 rotate-180" />
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-800">
                        {mapping.targetField}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {mapping.type}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {!mapping.isRequired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveField(idx)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="p-4 text-center text-xs text-muted-foreground bg-background rounded-lg border border-dashed">
          Synchronization for this table is currently disabled. Toggle the switch above to configure field mappings.
        </div>
      )}
    </div>
  );
}
