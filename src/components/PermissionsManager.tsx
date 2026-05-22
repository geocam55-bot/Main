import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, Ban, Eye, Pencil, RefreshCw, Save, Shield } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { getServerHeaders } from '../utils/server-headers';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { PermissionsTableSetup } from './PermissionsTableSetup';
import type { UserRole } from '../App';
import {
  ALL_SPACES,
  accessLevelToPermission,
  canChange,
  formatModuleLabel,
  getDefaultPermission,
  getDefaultSpacePermission,
  getSpacePermissionKey,
  normalizePermissionRecords,
  permissionToAccessLevel,
  refreshPermissionsFromStorage,
  type SpaceAccessLevel,
} from '../utils/permissions';

const supabase = createClient();
const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

interface SpacePermission {
  role: UserRole;
  module: string;
  visible: boolean;
  add: boolean;
  change: boolean;
  delete: boolean;
}

interface PermissionsManagerProps {
  userRole: UserRole;
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access across all organizations' },
  { value: 'admin', label: 'Admin', description: 'Full access within the organization' },
  { value: 'director', label: 'Director', description: 'Leadership visibility with broad operational access' },
  { value: 'manager', label: 'Manager', description: 'Manage teams and day-to-day operations' },
  { value: 'marketing', label: 'Marketing', description: 'Marketing and outreach focused access' },
  { value: 'designer', label: 'Designer', description: 'Design and Project Wizards focused access' },
  { value: 'standard_user', label: 'Standard User', description: 'General day-to-day user access' },
];

const ACCESS_OPTIONS: Array<{ value: SpaceAccessLevel; label: string; icon: typeof Ban }> = [
  { value: 'none', label: 'No Access', icon: Ban },
  { value: 'view', label: 'View Only', icon: Eye },
  { value: 'full', label: 'Full Access', icon: Pencil },
];

type ModuleAccessChoice = 'inherit' | SpaceAccessLevel;

const MODULE_ACCESS_OPTIONS: Array<{ value: ModuleAccessChoice; label: string; icon: typeof Ban }> = [
  { value: 'inherit', label: 'Inherit', icon: Shield },
  { value: 'none', label: 'No Access', icon: Ban },
  { value: 'view', label: 'View Only', icon: Eye },
  { value: 'full', label: 'Full Access', icon: Pencil },
];

export function PermissionsManager({ userRole }: PermissionsManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('standard_user');
  const [permissions, setPermissions] = useState<Record<string, SpacePermission>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, SpacePermission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tableNotFound, setTableNotFound] = useState(false);

  const canManagePermissions = userRole === 'super_admin' || userRole === 'admin';
  const canEditPermissions = canChange('security', userRole);
  const visibleRoles = ROLES.filter((role) => userRole === 'super_admin' || role.value !== 'super_admin');

  useEffect(() => {
    loadPermissions(selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    const keys = new Set([...Object.keys(permissions), ...Object.keys(originalPermissions)]);
    const changed = Array.from(keys).some((key) => {
      const current = permissions[key];
      const original = originalPermissions[key];

      if (!current && !original) return false;
      if (!current || !original) return true;

      return (
        current.visible !== original.visible ||
        current.add !== original.add ||
        current.change !== original.change ||
        current.delete !== original.delete
      );
    });

    setHasChanges(changed);
  }, [permissions, originalPermissions]);

  const loadPermissions = async (role: UserRole) => {
    setIsLoading(true);
    setTableNotFound(false);

    const buildPermissionsByRole = (records: any[] | null | undefined, targetRole: UserRole) => {
      const normalized = normalizePermissionRecords((records || []) as any[]);
      const nextPermissions: Record<string, SpacePermission> = {};

      ALL_SPACES.forEach((space) => {
        const spaceKey = getSpacePermissionKey(space.id);
        const defaultPermission = getDefaultSpacePermission(space.id, targetRole);
        const storedPermission = normalized.find(
          (permission) => permission.role === targetRole && permission.module === spaceKey
        );

        nextPermissions[spaceKey] = {
          role: targetRole,
          module: spaceKey,
          ...(storedPermission || defaultPermission),
        };

        space.modules.forEach((module) => {
          const storedModulePermission = normalized.find(
            (permission) => permission.role === targetRole && permission.module === module
          );

          if (storedModulePermission) {
            nextPermissions[module] = {
              role: targetRole,
              module,
              ...storedModulePermission,
            };
          }
        });
      });

      return nextPermissions;
    };

    try {
      // First try KV (same source used at runtime by initializePermissions)
      const orgId = localStorage.getItem('currentOrgId');
      const headers = await getServerHeaders();
      if (orgId && headers['X-User-Token']) {
        const response = await fetch(`${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`, {
          headers,
        });

        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json.permissions) && json.permissions.length > 0) {
            const nextPermissions = buildPermissionsByRole(json.permissions, role);
            setPermissions(nextPermissions);
            setOriginalPermissions(JSON.parse(JSON.stringify(nextPermissions)));
            setTableNotFound(false);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fall back to table data if KV has not been initialized yet.
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', role);

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          setTableNotFound(true);
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const nextPermissions = buildPermissionsByRole(data, role);

      setPermissions(nextPermissions);
      setOriginalPermissions(JSON.parse(JSON.stringify(nextPermissions)));
      setTableNotFound(false);
    } catch {
      toast.error('Failed to load hierarchical access settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccessLevel = (spaceId: string, accessLevel: SpaceAccessLevel) => {
    const spaceKey = getSpacePermissionKey(spaceId as any);

    setPermissions((previous) => ({
      ...previous,
      [spaceKey]: {
        role: selectedRole,
        module: spaceKey,
        ...(previous[spaceKey] || {}),
        ...accessLevelToPermission(accessLevel),
      },
    }));
  };

  const getModuleAccessChoice = (module: string): ModuleAccessChoice => {
    const record = permissions[module];
    return record ? permissionToAccessLevel(record) : 'inherit';
  };

  const getEffectiveModuleAccessLevel = (spaceId: string, module: string): SpaceAccessLevel => {
    const spaceKey = getSpacePermissionKey(spaceId as any);
    const spaceLevel = permissionToAccessLevel(permissions[spaceKey] || getDefaultSpacePermission(spaceId as any, selectedRole));
    if (spaceLevel === 'none') return 'none';

    const moduleLevel = permissionToAccessLevel(permissions[module] || getDefaultPermission(module, selectedRole));
    if (spaceLevel === 'view') {
      return moduleLevel === 'none' ? 'none' : 'view';
    }

    return moduleLevel;
  };

  const updateModuleAccess = (module: string, accessChoice: ModuleAccessChoice) => {
    setPermissions((previous) => {
      const updated = { ...previous };

      if (accessChoice === 'inherit') {
        delete updated[module];
        return updated;
      }

      updated[module] = {
        role: selectedRole,
        module,
        ...(previous[module] || {}),
        ...accessLevelToPermission(accessChoice),
      };

      return updated;
    });
  };

  const savePermissions = async () => {
    setIsSaving(true);

    try {
      const trackedModules = Array.from(new Set([
        ...ALL_SPACES.map((space) => getSpacePermissionKey(space.id)),
        ...ALL_SPACES.flatMap((space) => space.modules),
      ]));

      const insertData = Object.values(permissions)
        .filter((permission) => trackedModules.includes(permission.module))
        .map((permission) => ({
          role: selectedRole,
          module: permission.module,
          visible: permission.visible,
          add: permission.add,
          change: permission.change,
          delete: permission.delete,
        }));

      const { error: deleteError } = await supabase
        .from('permissions')
        .delete()
        .eq('role', selectedRole)
        .in('module', trackedModules);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('permissions')
        .insert(insertData);

      if (insertError) throw insertError;

      // Sync all roles' permissions to the KV store so initializePermissions picks them up.
      // If this fails, users may still see stale access checks, so surface it clearly.
      let kvSynced = false;
      try {
        const { data: allPerms } = await supabase.from('permissions').select('*');
        if (allPerms && allPerms.length > 0) {
          const orgId = localStorage.getItem('currentOrgId');
          const headers = await getServerHeaders();
          if (orgId && headers['X-User-Token']) {
            const response = await fetch(`${SERVER_BASE}/permissions`, {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ permissions: allPerms, organization_id: orgId }),
            });
            kvSynced = response.ok;

            if (response.ok) {
              const normalizedForOrg = normalizePermissionRecords(allPerms as any[]);
              localStorage.setItem(`permissions_${orgId}`, JSON.stringify(normalizedForOrg));
              refreshPermissionsFromStorage();
            }
          }
        }
      } catch {
        kvSynced = false;
      }

      await loadPermissions(selectedRole);

      if (kvSynced) {
        toast.success(`Hierarchical access saved for ${ROLES.find((role) => role.value === selectedRole)?.label}!`);
      } else {
        toast.error('Permissions were saved in the table, but server sync failed. Users may still see outdated access until sync succeeds.');
      }
    } catch {
      toast.error('Failed to save hierarchical access');
    } finally {
      setIsSaving(false);
    }
  };

  const resetPermissions = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
  };

  if (!canManagePermissions) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage space access. Only Super Admins and Admins can access this section.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-foreground mb-2">Role Space & Option Access</h2>
        <p className="text-muted-foreground">
          Manage security in two levels: <strong>1) access to the space</strong>, then <strong>2) access to options inside that space</strong>. This gives each role only the tools it actually needs.
        </p>
      </div>

      {tableNotFound ? (
        <PermissionsTableSetup />
      ) : (
        <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full">
              {visibleRoles.map((role) => (
                <TabsTrigger key={role.value} value={role.value} className="whitespace-nowrap">
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {visibleRoles.map((role) => (
            <TabsContent key={role.value} value={role.value} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {role.label} Hierarchical Access
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-muted-foreground">Loading space access...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {hasChanges && (
                        <Alert className="mb-4 border-yellow-400 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-900">
                            You have unsaved changes. Click <strong>Save Changes</strong> to apply them.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        {ALL_SPACES.map((space) => {
                          const spaceKey = getSpacePermissionKey(space.id);
                          const permission = permissions[spaceKey];
                          const currentLevel = permissionToAccessLevel(permission || getDefaultSpacePermission(space.id, selectedRole));

                          return (
                            <Card key={space.id} className="bg-muted/30">
                              <CardContent className="pt-5 space-y-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{space.icon}</span>
                                    <p className="text-sm font-medium text-foreground">{space.name}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{space.description}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {space.modules.map((module) => (
                                      <Badge key={module} variant="secondary" className="text-xs">
                                        {formatModuleLabel(module)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-foreground">Step 1 — Space Access</p>
                                    <Badge variant="secondary">Level 1</Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {ACCESS_OPTIONS.map((option) => {
                                      const Icon = option.icon;
                                      return (
                                        <Button
                                          key={option.value}
                                          type="button"
                                          size="sm"
                                          variant={currentLevel === option.value ? 'default' : 'outline'}
                                          onClick={() => updateAccessLevel(space.id, option.value)}
                                          disabled={!canEditPermissions}
                                        >
                                          <Icon className="h-4 w-4 mr-2" />
                                          {option.label}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background/70 p-4 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">Step 2 — Option Access</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Inherit follows the role default and still respects the parent space access.
                                      </p>
                                    </div>
                                    <Badge variant="secondary">Level 2</Badge>
                                  </div>

                                  <div className="space-y-3">
                                    {space.modules.map((module) => {
                                      const currentChoice = getModuleAccessChoice(module);
                                      const effectiveLevel = getEffectiveModuleAccessLevel(space.id, module);
                                      const effectiveLabel = ACCESS_OPTIONS.find((option) => option.value === effectiveLevel)?.label || 'No Access';
                                      const sharedCount = ALL_SPACES.filter((entry) => entry.modules.includes(module)).length;

                                      return (
                                        <div key={`${space.id}-${module}`} className="rounded-lg border border-border/60 p-3">
                                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium text-foreground">{formatModuleLabel(module)}</p>
                                                {sharedCount > 1 && <Badge variant="outline">Shared Option</Badge>}
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                Effective access: <strong>{effectiveLabel}</strong>
                                              </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                              {MODULE_ACCESS_OPTIONS.map((option) => {
                                                const Icon = option.icon;
                                                return (
                                                  <Button
                                                    key={option.value}
                                                    type="button"
                                                    size="sm"
                                                    variant={currentChoice === option.value ? 'default' : 'outline'}
                                                    onClick={() => updateModuleAccess(module, option.value)}
                                                    disabled={!canEditPermissions}
                                                  >
                                                    <Icon className="h-4 w-4 mr-2" />
                                                    {option.label}
                                                  </Button>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {currentLevel === 'none' && (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                              Enable the parent space first before this option becomes available.
                                            </p>
                                          )}
                                          {currentLevel === 'view' && currentChoice === 'full' && (
                                            <p className="mt-2 text-xs text-amber-700">
                                              This option is capped at <strong>View Only</strong> while the space remains read-only.
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button onClick={savePermissions} disabled={!canEditPermissions || !hasChanges || isSaving} className="flex-1">
                          {isSaving ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button onClick={resetPermissions} variant="outline" disabled={!canEditPermissions || !hasChanges || isSaving}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}