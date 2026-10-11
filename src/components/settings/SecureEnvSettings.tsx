import React, { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Shield, Key, Database, Plus, Trash2, Edit2, Save, RefreshCw, CheckCircle, Code } from 'lucide-react';
import { 
  ensureSecureEnvTables, 
  listAppEnv, 
  listTenantEnv, 
  setAppEnv, 
  setTenantEnv, 
  type AppEnvVar, 
  type TenantEnvVar 
} from '../../utils/secure-env';
import { createClient } from '../../utils/supabase/client';

interface SecureEnvSettingsProps {
  organization: any | null;
  user: any;
}

const SUPABASE_MIGRATION_SQL = `
-- 1. App-level Environment Variables Table (Used by the App)
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


-- 2. Tenant-level Environment Variables Table (Used by Tenants / Organizations)
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

export function SecureEnvSettings({ organization, user }: SecureEnvSettingsProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'tenant' | 'sql'>('tenant');
  const [loading, setLoading] = useState(false);
  const [appVars, setAppVars] = useState<AppEnvVar[]>([]);
  const [tenantVars, setTenantVars] = useState<TenantEnvVar[]>([]);
  
  // New/Edit state for App env
  const [appKey, setAppKey] = useState('');
  const [appValue, setAppValue] = useState('');
  const [appDesc, setAppDesc] = useState('');

  // New/Edit state for Tenant env
  const [tenantKey, setTenantKey] = useState('');
  const [tenantValue, setTenantValue] = useState('');
  const [tenantDesc, setTenantDesc] = useState('');

  const orgId = organization?.id || organization?.organization_id || 'default_org';

  const loadData = async () => {
    setLoading(true);
    try {
      await ensureSecureEnvTables();
      const [appData, tenantData] = await Promise.all([
        listAppEnv(),
        listTenantEnv(orgId)
      ]);
      setAppVars(appData);
      setTenantVars(tenantData);
    } catch (err: any) {
      toast.error(`Failed to load environment variables: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleSaveAppVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appKey.trim() || !appValue.trim()) {
      toast.error('Key and Value are required');
      return;
    }
    setLoading(true);
    const success = await setAppEnv(appKey.trim(), appValue.trim(), appDesc.trim());
    if (success) {
      toast.success(`Successfully saved App variable: ${appKey}`);
      setAppKey('');
      setAppValue('');
      setAppDesc('');
      loadData();
    } else {
      toast.error('Failed to save App variable. Ensure tables exist (check SQL tab).');
      setLoading(false);
    }
  };

  const handleSaveTenantVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantKey.trim() || !tenantValue.trim()) {
      toast.error('Key and Value are required');
      return;
    }
    setLoading(true);
    const success = await setTenantEnv(orgId, tenantKey.trim(), tenantValue.trim(), tenantDesc.trim());
    if (success) {
      toast.success(`Successfully saved Tenant variable: ${tenantKey}`);
      setTenantKey('');
      setTenantValue('');
      setTenantDesc('');
      loadData();
    } else {
      toast.error('Failed to save Tenant variable. Ensure tables exist (check SQL tab).');
      setLoading(false);
    }
  };

  const handleInitializeTables = async () => {
    setLoading(true);
    const success = await ensureSecureEnvTables();
    if (success) {
      toast.success('Secure environment tables successfully provisioned in Supabase with RLS!');
      loadData();
    } else {
      toast.error('Could not auto-create tables. Please run the SQL script manually in your Supabase SQL editor.');
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-primary" />
              Secure Environment Variables
            </CardTitle>
            <CardDescription>
              Manage sensitive API keys, SMTP credentials, and configuration securely in Supabase tables with RLS protection.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tenant" className="gap-2">
              <Key className="h-4 w-4" />
              Tenant Variables
            </TabsTrigger>
            <TabsTrigger value="app" className="gap-2">
              <Database className="h-4 w-4" />
              App Variables
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-2">
              <Code className="h-4 w-4" />
              Supabase SQL & Setup
            </TabsTrigger>
          </TabsList>

          {/* Tenant Variables Tab */}
          <TabsContent value="tenant" className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border text-sm space-y-1">
              <p className="font-medium text-foreground">Tenant-Level Environment Variables</p>
              <p className="text-muted-foreground">
                Used by your organization (<span className="font-semibold">{organization?.name || orgId}</span>) for integrations like Fleet Complete, custom SMTP servers, Azure/Google OAuth credentials, and third-party APIs.
              </p>
            </div>

            <form onSubmit={handleSaveTenantVar} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="tenant-key">Variable Key</Label>
                <Input
                  id="tenant-key"
                  placeholder="e.g. FLEET_COMPLETE_API_KEY"
                  value={tenantKey}
                  onChange={(e) => setTenantKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-value">Secret Value</Label>
                <Input
                  id="tenant-value"
                  type="password"
                  placeholder="e.g. fc_token_..."
                  value={tenantValue}
                  onChange={(e) => setTenantValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-desc">Description (Optional)</Label>
                <Input
                  id="tenant-desc"
                  placeholder="e.g. Fleet API token"
                  value={tenantDesc}
                  onChange={(e) => setTenantDesc(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <Plus className="h-4 w-4" />
                  Save Variable
                </Button>
              </div>
            </form>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Key</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenantVars.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No tenant environment variables found. Add your first variable above or initialize tables.
                      </td>
                    </tr>
                  ) : (
                    tenantVars.map((v) => (
                      <tr key={v.id || v.key} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium">{v.key}</td>
                        <td className="p-3 font-mono text-muted-foreground">••••••••••••••••</td>
                        <td className="p-3 text-muted-foreground">{v.description || '—'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {v.updated_at ? new Date(v.updated_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* App Variables Tab */}
          <TabsContent value="app" className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border text-sm space-y-1">
              <p className="font-medium text-foreground">App-Level Environment Variables</p>
              <p className="text-muted-foreground">
                Used globally by the application for system-wide configuration, such as master system SMTP settings for password recovery emails and default AI API keys.
              </p>
            </div>

            <form onSubmit={handleSaveAppVar} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="app-key">Variable Key</Label>
                <Input
                  id="app-key"
                  placeholder="e.g. SMTP_HOST"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-value">Secret Value</Label>
                <Input
                  id="app-value"
                  type="password"
                  placeholder="e.g. smtp.sendgrid.net"
                  value={appValue}
                  onChange={(e) => setAppValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-desc">Description (Optional)</Label>
                <Input
                  id="app-desc"
                  placeholder="e.g. System SMTP server"
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <Plus className="h-4 w-4" />
                  Save Variable
                </Button>
              </div>
            </form>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Key</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {appVars.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No app environment variables found. Add your first app variable above.
                      </td>
                    </tr>
                  ) : (
                    appVars.map((v) => (
                      <tr key={v.id || v.key} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium">{v.key}</td>
                        <td className="p-3 font-mono text-muted-foreground">••••••••••••••••</td>
                        <td className="p-3 text-muted-foreground">{v.description || '—'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {v.updated_at ? new Date(v.updated_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* SQL & Setup Tab */}
          <TabsContent value="sql" className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border text-sm space-y-2">
              <p className="font-medium text-foreground">Supabase Database Tables & RLS Protection</p>
              <p className="text-muted-foreground">
                To enable secure database storage for environment variables, run the following SQL script in your Supabase SQL Editor. Row Level Security (RLS) policies are included to ensure data privacy and security.
              </p>
              <div className="pt-2 flex gap-3">
                <Button onClick={handleInitializeTables} disabled={loading} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Auto-Provision Tables via RPC
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
                    toast.success('SQL script copied to clipboard!');
                  }}
                  className="gap-2"
                >
                  Copy SQL to Clipboard
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Migration SQL Script</Label>
              <Textarea
                readOnly
                value={SUPABASE_MIGRATION_SQL.trim()}
                className="font-mono text-xs h-72 bg-muted/30"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
