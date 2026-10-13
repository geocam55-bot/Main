import React, { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { 
  Shield, 
  Key, 
  Database, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle2, 
  Code, 
  Sparkles,
  Mail,
  Send,
  AlertCircle,
  Loader2,
  Building2
} from 'lucide-react';
import { 
  ensureSecureEnvTables, 
  listAppEnv, 
  listTenantEnv, 
  setAppEnv, 
  setTenantEnv, 
  deleteAppEnv,
  deleteTenantEnv,
  type AppEnvVar, 
  type TenantEnvVar 
} from '../../utils/secure-env';

interface EnvironmentSettingsPanelProps {
  scope: 'tenant' | 'system';
  organizationId?: string;
}

const SUPABASE_MIGRATION_SQL = `-- 1. App-level Environment Variables Table (Used by System / Super Admin)
CREATE TABLE IF NOT EXISTS public.app_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_env_vars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated or service role to manage app_env_vars" ON public.app_env_vars;
CREATE POLICY "Allow authenticated or service role to manage app_env_vars" ON public.app_env_vars
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- 2. Tenant-level Environment Variables Table (Used by Organizations / Tenants)
CREATE TABLE IF NOT EXISTS public.tenant_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT tenant_env_vars_org_key_unique UNIQUE (organization_id, key)
);
ALTER TABLE public.tenant_env_vars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated or service role to manage tenant_env_vars" ON public.tenant_env_vars;
CREATE POLICY "Allow authenticated or service role to manage tenant_env_vars" ON public.tenant_env_vars
    FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');
`;

export function EnvironmentSettingsPanel({ scope, organizationId }: EnvironmentSettingsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [vars, setVars] = useState<(AppEnvVar | TenantEnvVar)[]>([]);
  const [visibleValues, setVisibleValues] = useState<Record<string, boolean>>({});
  
  // Dedicated SMTP Form State: Host, User, Password, Email, From, Port
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  // General Variable Form state
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // In-app Delete Confirmation Dialog state
  const [itemToDelete, setItemToDelete] = useState<(AppEnvVar | TenantEnvVar) | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const orgId = organizationId || localStorage.getItem('currentOrgId') || '';

  const loadVariables = async () => {
    if (scope === 'tenant' && !orgId) {
      setVars([]);
      return;
    }

    setLoading(true);
    try {
      let data: (AppEnvVar | TenantEnvVar)[] = [];
      if (scope === 'tenant') {
        data = await listTenantEnv(orgId);
      } else {
        data = await listAppEnv();
      }
      setVars(data);

      // Populate SMTP fields from existing variables
      const map = new Map(data.map(item => [item.key.toUpperCase(), item.value]));
      const prefix = scope === 'system' ? 'SYSTEM_SMTP_' : 'SMTP_';

      setSmtpHost(map.get(`${prefix}HOST`) || map.get('SMTP_HOST') || '');
      setSmtpPort(map.get(`${prefix}PORT`) || map.get('SMTP_PORT') || '587');
      setSmtpUser(map.get(`${prefix}USER`) || map.get(`${prefix}USERNAME`) || map.get('SMTP_USER') || '');
      setSmtpPassword(map.get(`${prefix}PASS`) || map.get(`${prefix}PASSWORD`) || map.get('SMTP_PASS') || map.get('SMTP_PASSWORD') || '');
      setSmtpEmail(map.get(`${prefix}EMAIL`) || map.get('SMTP_EMAIL') || map.get('SYSTEM_SUPPORT_EMAIL') || '');
      setSmtpFrom(map.get(`${prefix}FROM`) || map.get(`${prefix}FROM_EMAIL`) || map.get('SMTP_FROM') || map.get('SMTP_FROM_EMAIL') || '');
    } catch (err: any) {
      toast.error(`Failed to load ${scope} environment variables: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVariables();
  }, [scope, orgId]);

  // Handle Saving the complete SMTP Config
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scope === 'tenant' && !orgId) {
      toast.error('No organization selected for tenant variables.');
      return;
    }
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpPassword.trim()) {
      toast.error('Host, User, and Password are required for SMTP configuration');
      return;
    }

    setSavingSmtp(true);
    try {
      const prefix = scope === 'system' ? 'SYSTEM_SMTP_' : 'SMTP_';
      const itemsToSave: { key: string; value: string; desc: string }[] = [
        { key: `${prefix}HOST`, value: smtpHost.trim(), desc: 'SMTP Host Server' },
        { key: `${prefix}PORT`, value: (smtpPort || '587').trim(), desc: 'SMTP Port Number' },
        { key: `${prefix}USER`, value: smtpUser.trim(), desc: 'SMTP Login Username' },
        { key: `${prefix}PASS`, value: smtpPassword.trim(), desc: 'SMTP Login Password' },
        { key: `${prefix}EMAIL`, value: (smtpEmail || smtpUser).trim(), desc: 'SMTP Account Mailbox Email' },
        { key: `${prefix}FROM`, value: (smtpFrom || `${smtpEmail || smtpUser}`).trim(), desc: 'SMTP From Header' },
      ];

      for (const item of itemsToSave) {
        if (scope === 'tenant') {
          await setTenantEnv(orgId, item.key, item.value, item.desc);
        } else {
          await setAppEnv(item.key, item.value, item.desc);
        }
      }

      toast.success('SMTP Email settings saved successfully for this organization!');
      await loadVariables();
    } catch (err: any) {
      toast.error(`Failed to save SMTP settings: ${err.message || err}`);
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scope === 'tenant' && !orgId) {
      toast.error('No organization selected for tenant variables.');
      return;
    }
    if (!key.trim() || !value.trim()) {
      toast.error('Variable Key and Secret Value are required');
      return;
    }

    setLoading(true);
    try {
      const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      let success = false;

      if (scope === 'tenant') {
        success = await setTenantEnv(orgId, cleanKey, value.trim(), description.trim());
      } else {
        success = await setAppEnv(cleanKey, value.trim(), description.trim());
      }

      if (success) {
        toast.success(`Saved ${scope === 'tenant' ? 'Tenant' : 'System'} variable: ${cleanKey}`);
        setKey('');
        setValue('');
        setDescription('');
        setIsEditing(false);
        await loadVariables();
      } else {
        toast.error(`Failed to save variable ${cleanKey}.`);
      }
    } catch (err: any) {
      toast.error(`Error saving variable: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Safe In-App Delete Handler
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const targetKey = itemToDelete.key;
    setIsDeleting(true);

    try {
      let success = false;
      if (scope === 'tenant') {
        success = await deleteTenantEnv(orgId, targetKey);
      } else {
        success = await deleteAppEnv(targetKey);
      }

      if (success) {
        toast.success(`Deleted variable: ${targetKey}`);
        setVars(prev => prev.filter(v => v.key !== targetKey));
        setItemToDelete(null);
        await loadVariables();
      } else {
        toast.error(`Failed to delete variable ${targetKey}.`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: AppEnvVar | TenantEnvVar) => {
    setKey(item.key);
    setValue(item.value);
    setDescription(item.description || '');
    setIsEditing(true);
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  const toggleVisibility = (itemKey: string) => {
    setVisibleValues(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const applyTemplate = (templateKey: string, placeholderDesc: string) => {
    setKey(templateKey);
    setDescription(placeholderDesc);
    setValue('');
    setIsEditing(false);
  };

  const handleInitializeTables = async () => {
    setLoading(true);
    try {
      const ok = await ensureSecureEnvTables();
      if (ok) {
        toast.success('Database tables checked/created successfully!');
        await loadVariables();
      } else {
        toast.info('Could not auto-create via RPC. Copy and run the SQL migration below in your Supabase SQL editor.');
        setShowSql(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const tenantPresets = [
    { key: 'SMTP_HOST', desc: 'Host: Outgoing mail server (e.g. smtp.gmail.com)' },
    { key: 'SMTP_USER', desc: 'User: SMTP authentication username' },
    { key: 'SMTP_PASS', desc: 'Password: SMTP password or app password' },
    { key: 'SMTP_EMAIL', desc: 'Email: Sender mailbox address' },
    { key: 'SMTP_FROM', desc: 'From: Display header (e.g. Acme Quotes <quotes@acme.com>)' },
    { key: 'SMTP_PORT', desc: 'Port: Usually 587 (TLS) or 465 (SSL)' },
    { key: 'QUICKBOOKS_CLIENT_ID', desc: 'Tenant QuickBooks OAuth client ID' },
    { key: 'TWILIO_AUTH_TOKEN', desc: 'Tenant Twilio authentication token for SMS' },
  ];

  const systemPresets = [
    { key: 'SYSTEM_SMTP_HOST', desc: 'Host: Global SMTP server for platform' },
    { key: 'SYSTEM_SMTP_USER', desc: 'User: Global SMTP username' },
    { key: 'SYSTEM_SMTP_PASS', desc: 'Password: Global SMTP password' },
    { key: 'SYSTEM_SMTP_EMAIL', desc: 'Email: System mailbox address' },
    { key: 'SYSTEM_SMTP_FROM', desc: 'From: System from header (e.g. ProSpaces <support@prospacescrm.ca>)' },
    { key: 'SYSTEM_SMTP_PORT', desc: 'Port: 587 or 465' },
    { key: 'GEMINI_API_KEY', desc: 'Google Gemini AI API key for intelligence features' },
    { key: 'STRIPE_SECRET_KEY', desc: 'Stripe backend secret key for customer subscriptions' },
  ];

  const presets = scope === 'tenant' ? tenantPresets : systemPresets;
  const isSmtpComplete = !!(smtpHost && smtpUser && smtpPassword);

  if (scope === 'tenant' && !orgId) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <Building2 className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="font-semibold text-lg">No Organization Selected</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tenant environment variables are strictly isolated per organization. Please ensure your account is assigned to an active organization in the <strong>Organization</strong> settings tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                {scope === 'tenant' ? (
                  <>
                    <Key className="h-5 w-5 text-blue-500" />
                    Tenant Environment & SMTP Credentials
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-indigo-500" />
                    System Environment & Platform Credentials
                  </>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {scope === 'tenant' ? (
                  <>
                    Stored in <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">public.tenant_env_vars</code>. 
                    Scoped exclusively to organization <Badge variant="outline" className="ml-1 font-mono text-xs">{orgId}</Badge>.
                  </>
                ) : (
                  <>
                    Stored in <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">public.app_env_vars</code>. 
                    Used for platform-wide email notifications, password resets, and system API integrations.
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSql(!showSql)}
                className="gap-1.5 text-xs"
              >
                <Code className="h-3.5 w-3.5" />
                {showSql ? 'Hide SQL' : 'View SQL Setup'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadVariables} 
                disabled={loading}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        {showSql && (
          <CardContent className="pt-0 border-t border-border mt-4">
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  Supabase Schema Definition & Row-Level Security (RLS)
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleInitializeTables}
                    disabled={loading}
                    className="text-xs h-7"
                  >
                    Auto-Provision Tables
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => copyToClipboard(SUPABASE_MIGRATION_SQL, 'sql')}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedKey === 'sql' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    Copy SQL
                  </Button>
                </div>
              </div>
              <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto text-foreground max-h-56">
                {SUPABASE_MIGRATION_SQL}
              </pre>
            </div>
          </CardContent>
        )}
      </Card>

      {/* DEDICATED SMTP CONFIGURATION CARD */}
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">
                  SMTP Mail Server Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure the 5 primary parameters for outgoing mail delivery (User, Password, Email, From, Host).
                </CardDescription>
              </div>
            </div>
            <Badge variant={isSmtpComplete ? 'default' : 'secondary'} className="text-xs gap-1">
              {isSmtpComplete ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                  SMTP Configured
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  Incomplete
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSmtp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-host" className="text-xs font-semibold flex items-center justify-between">
                  <span>Host</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SMTP_HOST</span>
                </Label>
                <Input
                  id="smtp-host"
                  placeholder="e.g. smtp.gmail.com or smtp.ionos.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-port" className="text-xs font-semibold flex items-center justify-between">
                  <span>Port</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SMTP_PORT</span>
                </Label>
                <Input
                  id="smtp-port"
                  placeholder="587 (TLS) or 465 (SSL)"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-user" className="text-xs font-semibold flex items-center justify-between">
                  <span>User (Username)</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SMTP_USER</span>
                </Label>
                <Input
                  id="smtp-user"
                  placeholder="e.g. user@domain.com or login id"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass" className="text-xs font-semibold flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SMTP_PASS</span>
                </Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={showSmtpPass ? 'text' : 'password'}
                    placeholder="Enter SMTP password or app key"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    className="font-mono text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showSmtpPass ? 'Hide password' : 'Show password'}
                  >
                    {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-email" className="text-xs font-semibold flex items-center justify-between">
                  <span>Email (Mailbox)</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SMTP_EMAIL</span>
                </Label>
                <Input
                  id="smtp-email"
                  type="email"
                  placeholder="e.g. notifications@company.com"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-from" className="text-xs font-semibold flex items-center justify-between">
                  <span>From (Display Name & Header)</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SMTP_FROM</span>
                </Label>
                <Input
                  id="smtp-from"
                  placeholder='e.g. "ProSpaces CRM <support@domain.com>"'
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground">
                Saves all 5 SMTP variables exclusively to organization <span className="font-mono">{orgId}</span>.
              </p>
              <Button type="submit" size="sm" disabled={savingSmtp} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {savingSmtp ? 'Saving SMTP...' : 'Save SMTP Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Preset Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground flex items-center gap-1 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Quick Field Presets:
        </span>
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyTemplate(preset.key, preset.desc)}
            className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-full transition-colors text-xs font-mono"
            title={preset.desc}
          >
            + {preset.key}
          </button>
        ))}
      </div>

      {/* Add / Edit General Variable Form */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isEditing ? <Edit2 className="h-4 w-4 text-amber-500" /> : <Plus className="h-4 w-4 text-primary" />}
            {isEditing ? 'Edit Variable' : 'Add Custom Variable / API Key'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="var-key" className="text-xs font-semibold">Variable Key (ALL CAPS)</Label>
                <Input
                  id="var-key"
                  placeholder="e.g. TWILIO_AUTH_TOKEN"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  className="font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="var-val" className="text-xs font-semibold">Secret Value / Credential</Label>
                <Input
                  id="var-val"
                  type="password"
                  placeholder="Enter secret value..."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="var-desc" className="text-xs font-semibold">Description (Optional)</Label>
                <Input
                  id="var-desc"
                  placeholder="What is this credential used for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {isEditing && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setKey('');
                    setValue('');
                    setDescription('');
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {isEditing ? 'Update Variable' : 'Save Variable'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Variables List Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Saved Organization Variables ({vars.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-muted-foreground font-medium border-y border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Secret Value</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vars.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No tenant variables found for organization {orgId}.
                    </td>
                  </tr>
                ) : (
                  vars.map((v) => {
                    const isVisible = visibleValues[v.key];
                    return (
                      <tr key={v.key} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-foreground">
                          {v.key}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span>
                              {isVisible ? v.value : '••••••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleVisibility(v.key)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-1"
                              title={isVisible ? 'Hide value' : 'Show value'}
                            >
                              {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(v.value, v.key)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-1"
                              title="Copy secret value"
                            >
                              {copiedKey === v.key ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {v.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {v.updated_at ? new Date(v.updated_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(v)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit variable"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setItemToDelete(v)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer"
                              title={`Delete ${v.key}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* In-App Delete Confirmation Modal */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => { if (!open) setItemToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete {itemToDelete?.key}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete variable <strong className="font-mono text-foreground">{itemToDelete?.key}</strong> from organization <strong className="font-mono text-foreground">{orgId}</strong>?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Variable'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
