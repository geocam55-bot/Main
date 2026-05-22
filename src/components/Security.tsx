import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Eye,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Shield,
} from 'lucide-react';
import type { User, UserRole } from '../App';
import { PermissionGate } from './PermissionGate';
import {
  ALL_ROLES,
  ALL_SPACES,
  accessLevelToPermission,
  canChange,
  canView,
  formatModuleLabel,
  getDefaultPermission,
  getDefaultSpacePermission,
  getSpacePermissionKey,
  normalizePermissionRecords,
  permissionToAccessLevel,
  refreshPermissionsFromStorage,
  type PermissionRecord,
  type SpaceAccessLevel,
} from '../utils/permissions';
import { projectId } from '../utils/supabase/info';
import { getServerHeaders } from '../utils/server-headers';
import { AuditLog as AuditLogViewer } from './AuditLog';
import { logAuditEvent } from '../utils/audit';
import { SecurityModuleHelp } from './SecurityModuleHelp';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

interface SecurityProps {
  user: User;
}

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

export function Security({ user }: SecurityProps) {
  const isSuperAdmin = user.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('permissions');
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [copyFromRole, setCopyFromRole] = useState<UserRole>('manager');
  const [copyToRole, setCopyToRole] = useState<UserRole>('standard_user');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canAccessSecurity = canView('security', user.role);
  const canEditSecurity = canChange('security', user.role);

  const roles = ALL_ROLES.filter((role) => user.role === 'super_admin' || role !== 'super_admin');

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    director: 'Director',
    manager: 'Manager',
    marketing: 'Marketing',
    designer: 'Designer',
    standard_user: 'Standard User',
  };

  const getRoleBadgeClass = (role: UserRole) => (
    role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
    role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    role === 'director' ? 'bg-orange-50 text-orange-700 border-orange-200' :
    role === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-200' :
    role === 'marketing' ? 'bg-green-50 text-green-700 border-green-200' :
    role === 'designer' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
    'bg-muted text-foreground border-border'
  );

  useEffect(() => {
    if (canAccessSecurity) {
      loadPermissions();
    }
  }, [canAccessSecurity]);

  const filteredSpaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return ALL_SPACES.filter((space) => {
      const matchesFilter = selectedSpace === 'all' || space.id === selectedSpace;
      const matchesQuery = !query ||
        space.name.toLowerCase().includes(query) ||
        space.description.toLowerCase().includes(query) ||
        space.modules.some((module) => module.toLowerCase().includes(query));

      return matchesFilter && matchesQuery;
    });
  }, [searchQuery, selectedSpace]);

  const initializeDefaultPermissions = () => {
    setPermissions(normalizePermissionRecords());
  };

  const loadPermissions = async () => {
    setIsLoading(true);
    const orgId = localStorage.getItem('currentOrgId') || user.organizationId || user.organization_id || 'org_001';

    try {
      const headers = await getServerHeaders();
      const res = await Promise.race([
        fetch(`${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`, { headers }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.permissions) && json.permissions.length > 0) {
          const normalized = normalizePermissionRecords(json.permissions);
          localStorage.setItem(`permissions_${orgId}`, JSON.stringify(normalized));
          setPermissions(normalized);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fall back to local storage / defaults below
    }

    try {
      const storedPerms = localStorage.getItem(`permissions_${orgId}`);
      if (storedPerms) {
        setPermissions(normalizePermissionRecords(JSON.parse(storedPerms)));
      } else {
        initializeDefaultPermissions();
      }
    } catch {
      initializeDefaultPermissions();
    }

    setIsLoading(false);
  };

  const getAccessLevel = (spaceId: string, role: UserRole): SpaceAccessLevel => {
    const record = permissions.find((permission) => permission.module === getSpacePermissionKey(spaceId as any) && permission.role === role);
    return permissionToAccessLevel(record || getDefaultSpacePermission(spaceId as any, role));
  };

  const setAccessLevel = (spaceId: string, role: UserRole, accessLevel: SpaceAccessLevel) => {
    const nextPermission = accessLevelToPermission(accessLevel);

    setPermissions((previous) => {
      const updated = [...previous];
      const module = getSpacePermissionKey(spaceId as any);
      const existingIndex = updated.findIndex((permission) => permission.module === module && permission.role === role);

      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], ...nextPermission }; 
      } else {
        updated.push({ module, role, ...nextPermission });
      }

      return updated;
    });

    setHasChanges(true);
  };

  const getModuleAccessChoice = (module: string, role: UserRole): ModuleAccessChoice => {
    const record = permissions.find((permission) => permission.module === module && permission.role === role);
    return record ? permissionToAccessLevel(record) : 'inherit';
  };

  const getEffectiveModuleAccessLevel = (spaceId: string, module: string, role: UserRole): SpaceAccessLevel => {
    const spaceLevel = getAccessLevel(spaceId, role);
    if (spaceLevel === 'none') return 'none';

    const explicitRecord = permissions.find((permission) => permission.module === module && permission.role === role);
    const moduleLevel = permissionToAccessLevel(explicitRecord || getDefaultPermission(module, role));

    if (spaceLevel === 'view') {
      return moduleLevel === 'none' ? 'none' : 'view';
    }

    return moduleLevel;
  };

  const setModuleAccessChoice = (module: string, role: UserRole, accessChoice: ModuleAccessChoice) => {
    setPermissions((previous) => {
      const updated = [...previous];
      const existingIndex = updated.findIndex((permission) => permission.module === module && permission.role === role);

      if (accessChoice === 'inherit') {
        if (existingIndex >= 0) {
          updated.splice(existingIndex, 1);
        }
        return updated;
      }

      const nextPermission = accessLevelToPermission(accessChoice);
      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], ...nextPermission };
      } else {
        updated.push({ module, role, ...nextPermission });
      }

      return updated;
    });

    setHasChanges(true);
  };

  const getSharedSpacesForModule = (module: string) => ALL_SPACES.filter((space) => space.modules.includes(module));

  const handleSave = async () => {
    if (!canEditSecurity) {
      setSaveMessage({ type: 'error', text: 'You have view-only access to Security and cannot save changes.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const orgId = localStorage.getItem('currentOrgId') || user.organizationId || user.organization_id || 'org_001';
    const normalizedPermissions = normalizePermissionRecords(permissions);

    localStorage.setItem(`permissions_${orgId}`, JSON.stringify(normalizedPermissions));
    refreshPermissionsFromStorage();

    let serverSaved = false;
    try {
      const headers = await getServerHeaders();
      const res = await Promise.race([
        fetch(`${SERVER_BASE}/permissions`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            permissions: normalizedPermissions,
            organization_id: orgId,
            changedBy: user.full_name || user.email || 'User',
            changeDescription: 'Updated hierarchical space and option access controls',
          }),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);

      serverSaved = res.ok;
    } catch {
      serverSaved = false;
    }

    logAuditEvent({
      action: 'permission_change',
      resourceType: 'permission',
      description: `Updated hierarchical access across ${ALL_SPACES.length} spaces`,
      metadata: {
        model: 'space-option-hierarchy',
        permission_count: normalizedPermissions.length,
      },
    });

    setPermissions(normalizedPermissions);
    setHasChanges(false);
    setSaveMessage({
      type: 'success',
      text: serverSaved
        ? 'Space access saved successfully.'
        : 'Space access saved locally. Server sync will retry on the next save.',
    });
    setTimeout(() => setSaveMessage(null), 5000);
    setIsSaving(false);
  };

  const handleReset = () => {
    loadPermissions();
    setHasChanges(false);
    setSaveMessage(null);
  };

  const handleBulkUpdate = (role: UserRole, accessLevel: SpaceAccessLevel) => {
    const spacesToUpdate = selectedSpace === 'all'
      ? ALL_SPACES.map((space) => space.id)
      : [selectedSpace];

    spacesToUpdate.forEach((spaceId) => setAccessLevel(spaceId, role, accessLevel));
  };

  const copyAccessBetweenRoles = () => {
    if (copyFromRole === copyToRole) return;

    setPermissions((previous) => {
      const filtered = previous.filter((permission) => permission.role !== copyToRole);
      const copied = previous
        .filter((permission) => permission.role === copyFromRole)
        .map((permission) => ({ ...permission, role: copyToRole }));

      return [...filtered, ...copied];
    });

    setHasChanges(true);
  };

  if (!canAccessSecurity) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access Security Settings. Only Super Admins and Admins can manage space access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PermissionGate user={user} module="security" action="view">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Hierarchical Space Security</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin
                ? 'Manage role access in one place. Start with role-by-space access, then enable advanced option-level controls only when needed.'
                : <>Security now follows a two-level hierarchy: <strong>1) Space Access by Role</strong>, then <strong>2) Option Access inside that Space</strong>. This lets you grant a role entry to a space without exposing every option inside it.</>}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            {!isSuperAdmin && (
              <SecurityModuleHelp
                userId={user.id}
                selectedSpace={selectedSpace}
                hasChanges={hasChanges}
                canEditSecurity={canEditSecurity}
                onOpenPermissionsTab={() => setActiveTab('permissions')}
                onOpenBulkTab={() => setActiveTab('bulk')}
                onOpenAuditTab={() => setActiveTab('audit')}
                onShowAllSpaces={() => setSelectedSpace('all')}
                onClearSearch={() => setSearchQuery('')}
                onReset={handleReset}
                onSave={handleSave}
                onCopyRoleAccess={copyAccessBetweenRoles}
              />
            )}
            {hasChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                Unsaved Changes
              </Badge>
            )}
            <Button variant="outline" onClick={handleReset} disabled={!canEditSecurity || !hasChanges || isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!canEditSecurity || !hasChanges || isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            {isSuperAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowAdvancedOptions((prev) => !prev)}
              >
                {showAdvancedOptions ? 'Hide Option-Level Access' : 'Show Option-Level Access'}
              </Button>
            )}
          </div>
        </div>

        {!isSuperAdmin && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Start with the <strong>Space Access</strong> level, then fine-tune <strong>Options in that Space</strong> only where needed. <strong>View Only</strong> at the space level keeps all nested options read-only.
              {!canEditSecurity && ' You currently have view-only access to Security, so settings here are read-only.'}
            </AlertDescription>
          </Alert>
        )}

        {saveMessage && (
          <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
            {saveMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{saveMessage.text}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="permissions" className="whitespace-nowrap">Hierarchy Matrix</TabsTrigger>
              {!isSuperAdmin && <TabsTrigger value="bulk" className="whitespace-nowrap">Bulk Operations</TabsTrigger>}
              {!isSuperAdmin && <TabsTrigger value="audit" className="whitespace-nowrap">Audit Logs</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="permissions" className="space-y-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search spaces or included modules..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Filter by space" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Spaces</SelectItem>
                      {ALL_SPACES.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.icon} {space.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading space access...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSpaces.map((space) => (
                  <Card key={space.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">{space.icon}</span>
                        <span>{space.name}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{space.description}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {space.modules.map((module) => (
                          <Badge key={module} variant="secondary" className="text-xs">
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-5">
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground">Step 1 — Space Access by Role</h3>
                          <Badge variant="secondary">Hierarchy Level 1</Badge>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground w-40">Role</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Access Level</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roles.map((role) => {
                                const currentLevel = getAccessLevel(space.id, role);
                                return (
                                  <tr key={`${space.id}-${role}`} className="border-b border-border hover:bg-muted/40">
                                    <td className="py-3 px-4 align-top">
                                      <Badge variant="outline" className={getRoleBadgeClass(role)}>
                                        {roleLabels[role]}
                                      </Badge>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex flex-wrap gap-2">
                                        {ACCESS_OPTIONS.map((option) => {
                                          const Icon = option.icon;
                                          const isActive = currentLevel === option.value;
                                          return (
                                            <Button
                                              key={option.value}
                                              type="button"
                                              size="sm"
                                              variant={isActive ? 'default' : 'outline'}
                                              onClick={() => setAccessLevel(space.id, role, option.value)}
                                              disabled={role === 'super_admin' || !canEditSecurity}
                                              className="min-w-[110px]"
                                            >
                                              <Icon className="h-4 w-4 mr-2" />
                                              {option.label}
                                            </Button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {(!isSuperAdmin || showAdvancedOptions) && (
                      <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Step 2 — Option Access inside {space.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              After granting a role access to the space, refine exactly which options it can use. <strong>Inherit</strong> follows the role default and still respects the parent space level.
                            </p>
                          </div>
                          <Badge variant="secondary">Hierarchy Level 2</Badge>
                        </div>

                        <div className="space-y-4">
                          {space.modules.map((module) => {
                            const sharedSpaces = getSharedSpacesForModule(module);

                            return (
                              <Card key={`${space.id}-${module}`} className="bg-background/80">
                                <CardContent className="pt-4 space-y-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{formatModuleLabel(module)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {sharedSpaces.length > 1
                                          ? `Shared with: ${sharedSpaces.map((entry) => entry.name).join(', ')}`
                                          : 'Applies only inside this space.'}
                                      </p>
                                    </div>
                                    {sharedSpaces.length > 1 && (
                                      <Badge variant="outline" className="w-fit">Shared Option</Badge>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    {roles.map((role) => {
                                      const currentChoice = getModuleAccessChoice(module, role);
                                      const effectiveLevel = getEffectiveModuleAccessLevel(space.id, module, role);
                                      const parentSpaceLevel = getAccessLevel(space.id, role);
                                      const effectiveLabel = ACCESS_OPTIONS.find((option) => option.value === effectiveLevel)?.label || 'No Access';
                                      const parentLabel = ACCESS_OPTIONS.find((option) => option.value === parentSpaceLevel)?.label || 'No Access';

                                      return (
                                        <div key={`${space.id}-${module}-${role}`} className="rounded-lg border border-border/60 bg-background p-3">
                                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                            <div className="space-y-1">
                                              <Badge variant="outline" className={getRoleBadgeClass(role)}>
                                                {roleLabels[role]}
                                              </Badge>
                                              <div className="text-xs text-muted-foreground space-y-1">
                                                <p>Parent space: <strong>{parentLabel}</strong></p>
                                                <p>Effective option access: <strong>{effectiveLabel}</strong></p>
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                              {MODULE_ACCESS_OPTIONS.map((option) => {
                                                const Icon = option.icon;
                                                const isActive = currentChoice === option.value;
                                                return (
                                                  <Button
                                                    key={option.value}
                                                    type="button"
                                                    size="sm"
                                                    variant={isActive ? 'default' : 'outline'}
                                                    onClick={() => setModuleAccessChoice(module, role, option.value)}
                                                    disabled={role === 'super_admin' || !canEditSecurity}
                                                    className="min-w-[108px]"
                                                  >
                                                    <Icon className="h-4 w-4 mr-2" />
                                                    {option.label}
                                                  </Button>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {parentSpaceLevel === 'none' && (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                              Enable the space first before this option becomes available for the role.
                                            </p>
                                          )}
                                          {parentSpaceLevel === 'view' && currentChoice === 'full' && (
                                            <p className="mt-2 text-xs text-amber-700">
                                              This option is capped at <strong>View Only</strong> until the parent space is upgraded from read-only access.
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {!isSuperAdmin && <TabsContent value="bulk" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Space Updates</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Apply one access level to all spaces, or copy one role’s space setup to another role.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.filter((role) => role !== 'super_admin').map((role) => (
                    <Card key={role} className="bg-muted/40">
                      <CardContent className="pt-6 space-y-3">
                        <Badge variant="outline">{roleLabels[role]}</Badge>
                        <div className="grid grid-cols-1 gap-2">
                          <Button variant="outline" size="sm" disabled={!canEditSecurity} onClick={() => handleBulkUpdate(role, 'full')}>
                            Full Access for Selected Spaces
                          </Button>
                          <Button variant="outline" size="sm" disabled={!canEditSecurity} onClick={() => handleBulkUpdate(role, 'view')}>
                            View Only for Selected Spaces
                          </Button>
                          <Button variant="outline" size="sm" disabled={!canEditSecurity} className="text-red-600 hover:text-red-700" onClick={() => handleBulkUpdate(role, 'none')}>
                            Remove Access from Selected Spaces
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="text-sm font-medium text-foreground">Copy Space Access Between Roles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Copy From</label>
                        <Select value={copyFromRole} onValueChange={(value) => setCopyFromRole(value as UserRole)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">Copy To</label>
                        <Select value={copyToRole} onValueChange={(value) => setCopyToRole(value as UserRole)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline" disabled={!canEditSecurity} onClick={copyAccessBetweenRoles}>
                      Copy Space Access
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>}

          {!isSuperAdmin && <TabsContent value="audit" className="space-y-6 mt-6">
            <AuditLogViewer user={user} embedded={true} />
          </TabsContent>}
        </Tabs>
      </div>
    </PermissionGate>
  );
}