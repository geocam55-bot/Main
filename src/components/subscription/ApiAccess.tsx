import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  ShieldOff,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  Code,
  ExternalLink,
  Lock,
  Building2,
  Loader2,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  API_SCOPES,
  type ApiKeyMeta,
} from '../../utils/api-keys-client';
import { projectId } from '../../utils/supabase/info';
import type { User } from '../../App';

interface ApiAccessProps {
  user: User;
  hasAccess: boolean; // from useSubscription().hasFeature('api-access')
}

export function ApiAccess({ user, hasAccess }: ApiAccessProps) {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRawKeyDialog, setShowRawKeyDialog] = useState(false);
  const [rawKey, setRawKey] = useState('');
  const [rawKeyCopied, setRawKeyCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Create dialog state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>('never');
  const [newKeyScopes, setNewKeyScopes] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    API_SCOPES.forEach(s => { defaults[s.id] = s.id.endsWith(':read'); });
    return defaults;
  });

  const loadKeys = useCallback(async () => {
    if (!hasAccess) return;
    try {
      setLoading(true);
      const data = await listApiKeys();
      setKeys(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    const selectedScopes = Object.entries(newKeyScopes)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (selectedScopes.length === 0) {
      toast.error('Please select at least one permission scope');
      return;
    }

    try {
      setActionLoading(true);
      const expiryDays: Record<string, number | undefined> = {
        never: undefined,
        '30': 30,
        '90': 90,
        '180': 180,
        '365': 365,
      };
      const result = await createApiKey({
        name: newKeyName.trim(),
        scopes: selectedScopes,
        expires_in_days: expiryDays[newKeyExpiry],
      });

      setRawKey(result.raw_key);
      setShowCreateDialog(false);
      setShowRawKeyDialog(true);
      setNewKeyName('');
      setNewKeyExpiry('never');
      // Reset scopes to defaults
      const defaults: Record<string, boolean> = {};
      API_SCOPES.forEach(s => { defaults[s.id] = s.id.endsWith(':read'); });
      setNewKeyScopes(defaults);

      await loadKeys();
      toast.success('API key created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      setActionLoading(true);
      await revokeApiKey(keyId);
      await loadKeys();
      setConfirmRevoke(null);
      toast.success('API key revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    try {
      setActionLoading(true);
      await deleteApiKey(keyId);
      await loadKeys();
      setConfirmDelete(null);
      toast.success('API key deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete key');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not available');
      }
      setRawKeyCopied(true);
      setTimeout(() => setRawKeyCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch {
      // Fallback
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setRawKeyCopied(true);
          setTimeout(() => setRawKeyCopied(false), 2000);
          toast.success('Copied to clipboard');
        } else {
          toast.error('Failed to copy');
        }
      } catch (err) {
        toast.error('Failed to copy');
      }
    }
  };

  const activeKeys = keys.filter(k => k.status === 'active');
  const revokedKeys = keys.filter(k => k.status === 'revoked');

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

  // ── Upgrade wall for non-Enterprise ───────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="p-4 bg-amber-100 rounded-full">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-amber-900">API Access - Enterprise Only</h3>
              <p className="text-amber-700 max-w-md">
                API access allows you to integrate ProSpaces CRM with external applications,
                automate workflows, and build custom integrations using REST API keys.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full max-w-lg">
                <div className="flex flex-col items-center gap-1 p-3 bg-background rounded-lg border border-amber-200">
                  <Code className="h-5 w-5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">REST API</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-background rounded-lg border border-amber-200">
                  <Key className="h-5 w-5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">API Key Auth</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-background rounded-lg border border-amber-200">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">Scoped Permissions</span>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 mt-2">
                <Building2 className="h-3 w-3 mr-1" />
                Available on Enterprise plan ($199/user/mo)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main Enterprise API Access UI ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-600" />
            API Keys
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for external integrations and automation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDocs(!showDocs)}>
            <BookOpen className="h-4 w-4 mr-1" />
            {showDocs ? 'Hide Docs' : 'API Docs'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadKeys} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Key
          </Button>
        </div>
      </div>

      {/* API Documentation Collapsible */}
      {showDocs && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4 text-blue-600" />
              API Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Base URL</h4>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-slate-800 text-green-400 px-3 py-2 rounded font-mono flex-1 overflow-x-auto">
                  {baseUrl}
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(baseUrl)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Authentication</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the <code className="bg-muted px-1 py-0.5 rounded text-xs">X-API-Key</code> header:
              </p>
              <code className="block text-xs bg-slate-800 text-green-400 px-3 py-2 rounded font-mono overflow-x-auto whitespace-pre">
{`curl -H "X-API-Key: ps_live_..." \\
     ${baseUrl}/api/v1/contacts`}
              </code>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Available Endpoints</h4>
              <div className="space-y-1.5">
                {[
                  { method: 'GET', path: '/api/v1/contacts', scope: 'contacts:read', desc: 'List contacts (paginated)' },
                  { method: 'GET', path: '/api/v1/contacts/:id', scope: 'contacts:read', desc: 'Get a single contact' },
                  { method: 'POST', path: '/api/v1/contacts', scope: 'contacts:write', desc: 'Create a contact' },
                  { method: 'PATCH', path: '/api/v1/contacts/:id', scope: 'contacts:write', desc: 'Update a contact' },
                  { method: 'DELETE', path: '/api/v1/contacts/:id', scope: 'contacts:write', desc: 'Delete a contact' },
                  { method: 'GET', path: '/api/v1/deals', scope: 'deals:read', desc: 'List deals/bids' },
                  { method: 'POST', path: '/api/v1/deals', scope: 'deals:write', desc: 'Create a deal' },
                  { method: 'GET', path: '/api/v1/tasks', scope: 'tasks:read', desc: 'List tasks' },
                  { method: 'POST', path: '/api/v1/tasks', scope: 'tasks:write', desc: 'Create a task' },
                  { method: 'PATCH', path: '/api/v1/tasks/:id', scope: 'tasks:write', desc: 'Update a task' },
                  { method: 'GET', path: '/api/v1/quotes', scope: 'quotes:read', desc: 'List quotes' },
                  { method: 'POST', path: '/api/v1/quotes', scope: 'quotes:write', desc: 'Create a quote' },
                  { method: 'GET', path: '/api/v1/inventory', scope: 'inventory:read', desc: 'List inventory' },
                  { method: 'PATCH', path: '/api/v1/inventory/:id', scope: 'inventory:write', desc: 'Update item' },
                  { method: 'GET', path: '/api/v1/users', scope: 'users:read', desc: 'List org users' },
                  { method: 'GET', path: '/api/v1/reports/summary', scope: 'reports:read', desc: 'Org summary stats' },
                ].map((ep) => (
                  <div key={ep.path + ep.method} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${
                      ep.method === 'GET' ? 'border-green-300 text-green-700' :
                      ep.method === 'POST' ? 'border-blue-300 text-blue-700' :
                      'border-amber-300 text-amber-700'
                    }`}>
                      {ep.method}
                    </Badge>
                    <code className="font-mono text-foreground">{ep.path}</code>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-muted-foreground">{ep.desc}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-auto">{ep.scope}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Rate Limits</h4>
              <p className="text-sm text-muted-foreground">
                Enterprise API keys are rate-limited to <strong>1,000 requests per minute</strong> per key.
                If you need higher limits, contact your account manager.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Keys</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeKeys.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Revoked</p>
            <p className="text-2xl font-bold text-muted-foreground mt-1">{revokedKeys.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Key Limit</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeKeys.length}/10</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 mt-1">Enterprise</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading API keys...</span>
        </div>
      ) : keys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="p-3 bg-muted rounded-full">
                <Key className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground">No API keys yet</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create your first API key to start integrating with external systems.
              </p>
              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Create API Key
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Active keys */}
          {activeKeys.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-foreground">Active Keys</h4>
              {activeKeys.map((key) => (
                <KeyCard
                  key={key.id}
                  apiKey={key}
                  onRevoke={() => setConfirmRevoke(key.id)}
                  onDelete={() => setConfirmDelete(key.id)}
                />
              ))}
            </>
          )}

          {/* Revoked keys */}
          {revokedKeys.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-muted-foreground mt-6">Revoked Keys</h4>
              {revokedKeys.map((key) => (
                <KeyCard
                  key={key.id}
                  apiKey={key}
                  onRevoke={() => {}}
                  onDelete={() => setConfirmDelete(key.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Create Key Dialog ────────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" />
              Create API Key
            </DialogTitle>
            <DialogDescription>
              Generate a new API key with specific permissions for your integration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Key Name *</Label>
              <Input
                id="key-name"
                placeholder="e.g., Zapier Integration, Webhook Service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">A descriptive name to identify this key.</p>
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <Label>Expiration</Label>
              <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scopes */}
            <div className="space-y-2">
              <Label>Permission Scopes</Label>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {(() => {
                  const groups = new Map<string, typeof API_SCOPES[number][]>();
                  API_SCOPES.forEach(s => {
                    if (!groups.has(s.group)) groups.set(s.group, []);
                    groups.get(s.group)!.push(s);
                  });
                  return Array.from(groups.entries()).map(([group, scopes]) => (
                    <div key={group} className="px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{group}</p>
                      <div className="space-y-1.5">
                        {scopes.map(scope => (
                          <div key={scope.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`scope-${scope.id}`}
                                checked={newKeyScopes[scope.id] || false}
                                onCheckedChange={(v) => setNewKeyScopes(prev => ({ ...prev, [scope.id]: v }))}
                              />
                              <Label htmlFor={`scope-${scope.id}`} className="text-sm cursor-pointer">
                                {scope.description}
                              </Label>
                            </div>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                              {scope.id.split(':')[1]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={actionLoading || !newKeyName.trim()}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Key className="h-4 w-4 mr-1" />}
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Show Raw Key Dialog (one-time reveal) ───────────────────── */}
      <Dialog open={showRawKeyDialog} onOpenChange={setShowRawKeyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="h-5 w-5" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Important:</strong> This is the only time the full key will be shown.
              Store it securely. If lost, you'll need to create a new key.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Your API Key</Label>
            <div className="relative">
              <code className="block bg-slate-800 text-green-400 p-3 rounded font-mono text-sm break-all select-all">
                {rawKey}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 text-muted-foreground hover:text-white"
                onClick={() => copyToClipboard(rawKey)}
              >
                {rawKeyCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => { setShowRawKeyDialog(false); setRawKey(''); }}>
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirm ───────────────────────────────────────────── */}
      <Dialog open={!!confirmRevoke} onOpenChange={() => setConfirmRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldOff className="h-5 w-5" />
              Revoke API Key?
            </DialogTitle>
            <DialogDescription>
              Revoking this key will immediately prevent any integrations using it from accessing your data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmRevoke && handleRevoke(confirmRevoke)}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-1" />}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ───────────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              Delete API Key?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this API key record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Key Card Sub-component ──────────────────────────────────────────────

function KeyCard({
  apiKey,
  onRevoke,
  onDelete,
}: {
  apiKey: ApiKeyMeta;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  const isRevoked = apiKey.status === 'revoked';
  const isExpired = apiKey.expires_at ? new Date(apiKey.expires_at) < new Date() : false;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card className={`transition-all ${isRevoked ? 'opacity-60 border-border' : 'border-border hover:border-border'}`}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${isRevoked ? 'bg-muted' : 'bg-purple-50'}`}>
              <Key className={`h-4 w-4 ${isRevoked ? 'text-muted-foreground' : 'text-purple-600'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm text-foreground truncate">{apiKey.name}</h4>
                <Badge
                  variant={isRevoked ? 'secondary' : isExpired ? 'destructive' : 'default'}
                  className={`text-[10px] px-1.5 py-0 ${
                    isRevoked ? '' : isExpired ? '' : 'bg-green-100 text-green-700 border-green-200'
                  }`}
                >
                  {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {apiKey.key_prefix}
                </code>
                <span>Created {formatDate(apiKey.created_at)}</span>
                {apiKey.expires_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {formatDate(apiKey.expires_at)}
                  </span>
                )}
                <span>by {apiKey.created_by_name}</span>
              </div>
              {/* Scopes */}
              <div className="flex flex-wrap gap-1 mt-2">
                {apiKey.scopes.map(scope => (
                  <Badge key={scope} variant="outline" className="text-[10px] px-1.5 py-0 font-mono border-border">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isRevoked && (
              <Button variant="ghost" size="sm" onClick={onRevoke} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <ShieldOff className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}