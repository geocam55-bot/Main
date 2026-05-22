import { useState, useEffect, useCallback } from 'react';
import { tenantsAPI } from '../utils/api';
import { AVAILABLE_MODULES } from '../lib/global-settings';
import type { User } from '../App';
import {
  Building2,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Zap,
  Mail,
  Package,
  FileText,
  Calendar,
  Upload,
  Boxes,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { OrganizationModuleManagerHelp } from './OrganizationModuleManagerHelp';

interface TenantOrg {
  id: string;
  name: string;
  status: string;
  plan: string;
  logo?: string;
  [key: string]: any;
}

// Map module IDs to icons for a richer UI
const MODULE_ICONS: Record<string, typeof Sparkles> = {
  ai_suggestions_enabled: Sparkles,
  marketing_enabled: Mail,
  inventory_enabled: Package,
  import_export_enabled: Upload,
  documents_enabled: FileText,
  project_wizards_enabled: Boxes,
  appointments_enabled: Calendar,
};

interface OrganizationModuleManagerProps {
  user: User;
}

export function OrganizationModuleManager({ user }: OrganizationModuleManagerProps) {
  const [organizations, setOrganizations] = useState<TenantOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedOrg = organizations.find(o => o.id === selectedOrgId) || null;

  // Compute all available modules dynamically
  const availableModules = (() => {
    const modules = new Set<string>();
    AVAILABLE_MODULES.forEach(m => modules.add(m.id));
    if (selectedOrg) {
      Object.keys(selectedOrg).forEach(key => {
        if (key.endsWith('_enabled')) {
          modules.add(key);
        }
      });
    }
    return Array.from(modules);
  })();

  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await tenantsAPI.getAll();
      const orgs = data.tenants || [];
      setOrganizations(orgs);
      // If an org was previously selected, keep it; otherwise auto-select first
      if (orgs.length > 0 && !orgs.find((o: TenantOrg) => o.id === selectedOrgId)) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (_err) {
      showAlert('error', 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId, showAlert]);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleToggleModule = async (moduleKey: string, enabled: boolean) => {
    if (!selectedOrg) return;

    setIsSaving(moduleKey);
    try {
      // Build the update payload with just the module that changed
      // Use updateFeatures to avoid overwriting other organization data
      await tenantsAPI.updateFeatures(selectedOrg.id, {
        [moduleKey]: enabled
      });

      // Update local state immediately for snappy UI
      setOrganizations(prev =>
        prev.map(org =>
          org.id === selectedOrg.id
            ? { ...org, [moduleKey]: enabled }
            : org
        )
      );

      const moduleDef = AVAILABLE_MODULES.find(m => m.id === moduleKey);
      const label = moduleDef ? moduleDef.label : moduleKey.replace('_enabled', '').replace(/_/g, ' ');
      showAlert('success', `${label} ${enabled ? 'enabled' : 'disabled'} for ${selectedOrg.name}`);
    } catch (_err) {
      showAlert('error', `Failed to update module`);
    } finally {
      setIsSaving(null);
    }
  };

  const getModuleLabel = (key: string) => {
    const moduleDef = AVAILABLE_MODULES.find(m => m.id === key);
    return moduleDef ? moduleDef.label : key.replace('_enabled', '').replace(/_/g, ' ');
  };

  const getModuleDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      ai_suggestions_enabled: 'AI-powered task suggestions and smart recommendations',
      marketing_enabled: 'Email campaigns, landing pages, and marketing automation',
      inventory_enabled: 'Product catalog, stock tracking, and inventory management',
      import_export_enabled: 'Bulk import/export of contacts, inventory, and data',
      documents_enabled: 'Document management, storage, and sharing',
      project_wizards_enabled: '3D planners for kitchen, deck, garage, and more',
      appointments_enabled: 'Calendar scheduling and appointment management',
    };
    return descriptions[key] || 'Toggle this module on or off for the organization';
  };

  const enabledCount = selectedOrg
    ? availableModules.filter(key => Boolean(selectedOrg[key])).length
    : 0;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-muted text-foreground border-border',
      suspended: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-muted text-foreground border-border';
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-muted text-foreground border-border',
      starter: 'bg-blue-100 text-blue-700 border-blue-200',
      professional: 'bg-purple-100 text-purple-700 border-purple-200',
      enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return colors[plan] || 'bg-muted text-foreground border-border';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
          <span className="text-muted-foreground">Loading organizations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Module Manager</h2>
                <p className="text-sm text-muted-foreground">
                  Select an organization and toggle modules on or off
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <OrganizationModuleManagerHelp
                userId={user.id}
                totalOrganizations={organizations.length}
                selectedOrganizationName={selectedOrg?.name || ''}
                enabledModules={enabledCount}
                totalModules={availableModules.length}
                onRefreshOrganizations={loadOrganizations}
                onSelectFirstOrganization={() => {
                  if (organizations.length > 0) {
                    setSelectedOrgId(organizations[0].id);
                  }
                }}
                onSelectNoOrganization={() => setSelectedOrgId('')}
                onShowEnabledModulesSummary={() => {
                  showAlert('success', `${enabledCount} of ${availableModules.length} modules enabled for ${selectedOrg?.name || 'selected organization'}`);
                }}
              />
              <div className="min-w-[280px]">
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Select an organization...</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadOrganizations}
                title="Refresh organizations"
                className="bg-background"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert */}
      {alert && (
        <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Selected Org Info + Module Toggles */}
      {selectedOrg ? (
        <div className="space-y-4">
          {/* Org Summary Bar */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedOrg.logo ? (
                    <div className="h-10 w-10 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedOrg.logo}
                        alt={`${selectedOrg.name} logo`}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {selectedOrg.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={getStatusColor(selectedOrg.status)}>
                        {selectedOrg.status}
                      </Badge>
                      <Badge variant="outline" className={getPlanColor(selectedOrg.plan)}>
                        {selectedOrg.plan}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-sm px-3 py-1"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    {enabledCount} / {availableModules.length} modules active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module Toggle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {availableModules.map(key => {
              const label = getModuleLabel(key);
              const description = getModuleDescription(key);
              const isEnabled = Boolean(selectedOrg[key]);
              const isSavingThis = isSaving === key;
              const IconComponent = MODULE_ICONS[key] || Shield;

              return (
                <Card
                  key={key}
                  className={`transition-all duration-200 ${
                    isEnabled
                      ? 'border-blue-200 bg-blue-50/30 shadow-sm'
                      : 'border-border bg-background hover:border-border'
                  }`}
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isEnabled
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <Label className="text-sm font-medium text-foreground leading-tight">
                            {label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {description}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 pt-0.5">
                        {isSavingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              handleToggleModule(key, checked)
                            }
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-muted-foreground">
              {organizations.length === 0
                ? 'No organizations found. Create one first.'
                : 'Select an organization from the dropdown above to manage its modules.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}