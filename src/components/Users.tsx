import { useState, useEffect } from 'react';
import { DatabaseSetup } from './DatabaseSetup';
import { SimpleSyncButton } from './SimpleSyncButton';
import { OneTimeSetup } from './OneTimeSetup';
import { ManagerMigrationHelper } from './ManagerMigrationHelper';
import type { User, UserRole, Organization } from '../App';
import { PermissionGate } from './PermissionGate';
import { canView, canAdd, canChange, canDelete } from '../utils/permissions';
import { tenantsAPI, usersAPI, settingsAPI } from '../utils/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, Plus, UserPlus, Edit, Trash2, MoreVertical, Building2, Shield, AlertCircle, Key, Copy, Pencil, Check, X } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { copyToClipboard } from '../utils/clipboard';
import { ProfilesSyncFixer } from './ProfilesSyncFixer';
import { QuickOrgFix } from './QuickOrgFix';
import { PermissionsManager } from './PermissionsManager';
import { UserRecovery } from './UserRecovery';
import { ProfilesTableFix } from './ProfilesTableFix';
import { FindMissingUser } from './FindMissingUser';
import { FixInvalidOrgIds } from './FixInvalidOrgIds';
import { InvalidOrgIdAlert } from './InvalidOrgIdAlert';
import { createClient } from '../utils/supabase/client';
import { getServerHeaders } from '../utils/server-headers';
import { toast } from 'sonner@2.0.3';
import { useDebounce } from '../utils/useDebounce';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createSubscription, updateSubscription, getOrgSubscriptions, type PlanId } from '../utils/subscription-client';
import { UsersModuleHelp } from './UsersModuleHelp';

const supabase = createClient();

interface UsersProps {
  user: User;
  organization?: Organization | null;
  onOrganizationUpdate?: (org: Organization) => void;
}

interface OrgUser extends User {
  status: 'active' | 'invited' | 'inactive';
  lastLogin?: string;
  managerId?: string;
}

interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  logo?: string;
}

export function Users({ user, organization, onOrganizationUpdate }: UsersProps) {
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 🚀 Debounce search for better performance
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usingClientSide, setUsingClientSide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showAllOrgs, setShowAllOrgs] = useState(false); // Debug toggle
  const [showProfilesFix, setShowProfilesFix] = useState(false); // Show profiles table fix
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<OrgUser | null>(null);
  const [showOrgChangeWarning, setShowOrgChangeWarning] = useState(false);
  const [originalOrganizationId, setOriginalOrganizationId] = useState('');
  const [pendingOrgChange, setPendingOrgChange] = useState<string | null>(null);
  const [isInviteCredentialsDialogOpen, setIsInviteCredentialsDialogOpen] = useState(false);
  const [inviteCredentials, setInviteCredentials] = useState<{ email: string; tempPassword: string; name: string } | null>(null);
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [isSavingOrgName, setIsSavingOrgName] = useState(false);
  const [isSyncingMissing, setIsSyncingMissing] = useState(false);
  const [missingUsersResult, setMissingUsersResult] = useState<{ missing: any[]; wrongOrg: any[] } | null>(null);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'manual'>('email');

  // Check permissions using the permissions system
  // Director can VIEW users but not add/edit/delete
  const canViewUsers = canView('users', user.role);
  const canManageUsers = canAdd('users', user.role) || canChange('users', user.role);
  const canManageAllUsers = canDelete('users', user.role) || (user.role === 'super_admin' || user.role === 'admin');
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  const [users, setUsers] = useState<OrgUser[]>([]);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'standard_user' as UserRole,
    organizationId: user.organizationId,
    plan: '' as PlanId | '',
  });

  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    role: 'standard_user' as UserRole,
    organizationId: '',
    status: 'active' as 'active' | 'invited' | 'inactive',
    managerId: '',
    plan: '' as PlanId | '',
  });

  // Track per-user plan assignments
  const [userPlanMap, setUserPlanMap] = useState<Record<string, PlanId>>({});

  // Load users on mount
  useEffect(() => {
    loadUsers();
    
    // Load default invite method from organization settings
    if (user.organizationId) {
      settingsAPI.getOrganizationSettings(user.organizationId).then(settings => {
        if (settings?.user_invite_method) {
          setInviteMethod(settings.user_invite_method as 'email' | 'manual');
        }
      }).catch(err => {
        // Handle silently
      });
    }
  }, []);

  // Load tenants if super admin
  useEffect(() => {
    if (user.role === 'super_admin') {
      loadTenants();
    }
  }, [user.role]);

  // Load user plans when users list changes
  useEffect(() => {
    if (users.length > 0) {
      loadUserPlans();
    }
  }, [users]);

  const loadUserPlans = async () => {
    if (!['admin', 'super_admin'].includes(user.role)) return;
    try {
      const planMap: Record<string, PlanId> = {};

      // Read billing_plan directly from profiles table
      const userIds = users.map(u => u.id).filter(Boolean);
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, billing_plan')
          .in('id', userIds)
          .not('billing_plan', 'is', null);
        if (data) {
          for (const row of data) {
            if (row.billing_plan) {
              planMap[row.id] = row.billing_plan as PlanId;
            }
          }
        }
      }

      setUserPlanMap(planMap);
    } catch { /* non-critical — billing_plan column may not exist yet */ }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null); // Clear previous errors
    
    try {
      // Use the server-side API which bypasses RLS (direct client queries get blocked)
      const result = await usersAPI.getAll();
      const allUsers = result?.users || [];

      if (allUsers.length > 0) {
      }

      if (allUsers.length === 0) {
        // No users found - sync helper will be shown
        setUsers([]);
        setShowDebug(false);
        return;
      }

      // Filter by organization for non-super_admin (server returns all accessible profiles)
      let filtered = allUsers;
      if (user.role !== 'super_admin' && user.organizationId) {
        filtered = allUsers.filter((u: any) => u.organization_id === user.organizationId);
      }

      // Map snake_case column names to camelCase for consistency
      const mappedUsers = filtered.map((u: any) => ({
        ...u,
        organizationId: u.organization_id,
        lastLogin: u.last_login,
      }));

      setUsers(mappedUsers);
      setError(null);
    } catch (err: any) {
      if (err?.code === '42P17' || err?.message?.includes('infinite recursion')) {
        setError('infinite recursion: ' + String(err));
      } else {
        setError(String(err));
      }
      
      setShowDebug(true);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadTenants = async () => {
    try {
      setIsLoadingTenants(true);
      
      // Load organizations directly from Supabase for SUPER_ADMIN
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        return;
      }
      
      // Map to tenant format
      const loadedTenants = organizations?.map(org => ({
        id: org.id,
        name: org.name,
        status: org.status || 'active',
        logo: org.logo,
      })) || [];
      
      setTenants(loadedTenants);
    } catch (error) {
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    // 🔍 Enhanced search: search across multiple fields
    const matchesSearch = !query || 
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query) ||
      (u.status && u.status.toLowerCase().includes(query));
    
    // Admin users should not see super_admin users
    const roleFilter = user.role === 'super_admin' || u.role !== 'super_admin';
    
    return matchesSearch && roleFilter;
  });

  // Get list of managers/directors for the manager dropdown
  const managers = users.filter(u => (u.role === 'manager' || u.role === 'director') && u.status === 'active');

  // Check if there's an organization mismatch (user is not seeing their own org)
  const hasOrgMismatch = users.length > 0 && user.role !== 'super_admin' && 
    !users.some(u => u.organizationId === user.organizationId);

  // Check if user has invalid timestamp-based org ID
  const hasInvalidOrgId = /^org-[0-9]+$/.test(user.organizationId);

  // Helper to detect if a string looks like a UUID
  const looksLikeUuid = (s: string) => /^[0-9a-fA-F]{8}[-\s]?[0-9a-fA-F]{4}/.test(s);

  // Display org name: prefer the DB name unless it looks like a UUID (corrupted)
  const rawOrgName = organization?.name || '';
  const orgNameIsValid = rawOrgName && !looksLikeUuid(rawOrgName) && rawOrgName !== 'Organization';
  const displayOrgName = orgNameIsValid ? rawOrgName : 'Not set — click pencil to rename';

  // Save edited org name
  const handleSaveOrgName = async () => {
    if (!editOrgName.trim() || !user.organizationId) return;
    setIsSavingOrgName(true);
    try {
      await settingsAPI.updateOrganizationName(user.organizationId, editOrgName.trim());
      // Update parent state so it refreshes everywhere immediately
      if (organization) {
        const updated = { ...organization, name: editOrgName.trim() };
        onOrganizationUpdate?.(updated);
      }
      toast.success('Organization name updated!');
      setIsEditingOrgName(false);
    } catch (err) {
      toast.error('Failed to update organization name');
    } finally {
      setIsSavingOrgName(false);
    }
  };

  // Scan for auth users missing from profiles
  const handleSyncMissingUsers = async () => {
    setIsSyncingMissing(true);
    setMissingUsersResult(null);
    try {
      const headers = await getServerHeaders();
      const orgId = user.organizationId;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/profiles/find-missing?organization_id=${encodeURIComponent(orgId)}`,
        { headers }
      );
      if (!res.ok) {
        const body = await res.text();
        toast.error('Failed to scan for missing users');
        return;
      }
      const data = await res.json();
      setMissingUsersResult({ missing: data.missing || [], wrongOrg: data.wrongOrg || [] });
      const total = (data.missing?.length || 0) + (data.wrongOrg?.length || 0);
      if (total === 0) {
        toast.success('All auth users have matching profiles — no issues found!');
      } else {
        toast.warning(`Found ${total} user(s) with profile issues`);
      }
    } catch (err: any) {
      toast.error('Error scanning: ' + err.message);
    } finally {
      setIsSyncingMissing(false);
    }
  };

  // Fix missing/wrong-org profiles
  const handleFixMissingUsers = async (usersToFix: any[]) => {
    try {
      const headers = await getServerHeaders();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/profiles/fix-missing`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ users: usersToFix, organizationId: user.organizationId }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        toast.error('Failed to fix users');
        return;
      }
      const data = await res.json();
      toast.success(`Fixed ${data.fixed} user(s)!`);
      setMissingUsersResult(null);
      loadUsers(); // Refresh the list
    } catch (err: any) {
      toast.error('Error fixing: ' + err.message);
    }
  };

  // Helper to get organization name for user table rows
  const getOrgName = (organizationId: string) => {
    // For Super Admin - look up from tenants list
    if (user.role === 'super_admin') {
      const tenant = tenants.find(t => t.id === organizationId);
      if (tenant && !looksLikeUuid(tenant.name)) {
        return tenant.name;
      }
      // If tenant not found or name looks like UUID, show ID with truncation
      return organizationId || 'Unknown';
    }
    
    // For regular Admin - check if it's their organization
    if (user.role === 'admin') {
      if (organizationId === user.organizationId) {
        // Show displayOrgName (which already handles UUID detection)
        return displayOrgName;
      }
      return organizationId || 'Unknown';
    }
    
    return organizationId || 'Unknown';
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    inviteUser();
  };

  const inviteUser = async () => {
    try {
      setShowProfilesFix(false); // Reset before trying
      
      // For super_admin, pass the selected organizationId
      const inviteData: any = {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        inviteMethod,
      };
      
      // If super_admin, include the organizationId; also pass org name for auto-creation
      if (user.role === 'super_admin') {
        inviteData.organizationId = newUser.organizationId;
        const tenant = tenants.find(t => t.id === newUser.organizationId);
        if (tenant) inviteData.organizationName = tenant.name;
      } else if (organization?.name) {
        inviteData.organizationName = organization.name;
      }
      
      // Call API to invite user (now creates a real Supabase Auth account)
      const result = await usersAPI.invite(inviteData);

      // Assign billing plan if one was selected
      if (newUser.plan && result?.userId) {
        try {
          // Save billing_plan directly on the profiles table
          await supabase
            .from('profiles')
            .update({
              billing_plan: newUser.plan,
              updated_at: new Date().toISOString(),
            })
            .eq('id', result.userId);
          // Also try the subscription API (works after server deploy)
          try {
            await createSubscription(newUser.plan as PlanId, 'month', undefined, false, result.userId, user.organizationId);
          } catch { /* Edge Function may not be deployed yet */ }
        } catch (planErr: any) {
          toast.error('User created but failed to assign plan: ' + (planErr.message || 'Unknown error'));
        }
      }
      
      // Reload users and plan map
      await loadUsers();
      await loadUserPlans();
      
      // Reset form and close dialog
      setNewUser({ name: '', email: '', role: 'standard_user', organizationId: user.organizationId, plan: '' });
      setIsAddDialogOpen(false);
      
      // Show the credentials dialog so admin can share the temp password
      if (result?.tempPassword) {
        setInviteCredentials({
          email: inviteData.email,
          tempPassword: result.tempPassword,
          name: inviteData.name,
        });
        setIsInviteCredentialsDialogOpen(true);
        toast.success('User account created! Share the temporary password with the user.');
      } else {
        toast.success('User invited successfully! An email has been sent to them.');
      }
    } catch (error: any) {
      // Check for organization not found error
      if (error.message?.includes('does not exist') && error.message?.includes('Organization')) {
        toast.error(error.message + ' Please create it in the Tenants module first.');
      } else if (error.message?.includes('profiles_id_fkey') || error.message?.includes('is not present in table')) {
        setShowProfilesFix(true);
        toast.error('Database migration required. See instructions above.');
      } else if (error.message?.includes('already exists')) {
        toast.error('A user with this email already exists');
      } else {
        toast.error('Failed to invite user: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    // Find the user to check their role
    const userToDelete = users.find(u => u.id === id);
    
    // Prevent admin from deleting super_admin users
    if (user.role === 'admin' && userToDelete?.role === 'super_admin') {
      toast.error('You do not have permission to delete Super Admin users');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }
    
    try {
      await usersAPI.delete(id);
      await loadUsers(); // Reload users after deletion
    } catch (error) {
      alert('Failed to remove user. Please try again.');
    }
  };

  const handleEditUser = (orgUser: OrgUser) => {
    // Prevent admin from editing super_admin users
    if (user.role === 'admin' && orgUser.role === 'super_admin') {
      toast.error('You do not have permission to edit Super Admin users');
      return;
    }
    
    setSelectedUser(orgUser);
    setOriginalOrganizationId(orgUser.organizationId); // Store original for comparison
    setEditUser({
      name: orgUser.name,
      email: orgUser.email,
      role: orgUser.role,
      organizationId: orgUser.organizationId,
      status: orgUser.status,
      managerId: orgUser.managerId || '',
      plan: userPlanMap[orgUser.id] || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    // Check if organization changed
    const orgChanged = editUser.organizationId !== originalOrganizationId;
    
    // If organization changed, show warning and require confirmation
    if (orgChanged && user.role === 'super_admin') {
      const oldOrgName = getOrgName(originalOrganizationId);
      const newOrgName = getOrgName(editUser.organizationId);
      
      const confirmed = confirm(
        `⚠️ ORGANIZATION CHANGE WARNING\n\n` +
        `You are about to move ${selectedUser.name} from:\n` +
        `  "${oldOrgName}"\n` +
        `to:\n` +
        `  "${newOrgName}"\n\n` +
        `This will affect their access to data and may cause issues.\n\n` +
        `Are you absolutely sure you want to do this?`
      );
      
      if (!confirmed) {
        toast.info('User update cancelled');
        return;
      }
      
      // Removed log
      
      toast.success(`User organization changed from "${oldOrgName}" to "${newOrgName}"`);
    }

    try {
      // First, try to update with manager_id
      let updateData: any = {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        organization_id: editUser.organizationId,
        status: editUser.status,
        updated_at: new Date().toISOString(),
      };

      // Try to include manager_id - if it fails, we'll retry without it
      updateData.manager_id = editUser.managerId || null;

      let { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', selectedUser.id);

      // If we get a column not found error for manager_id, retry without it
      if (error && error.code === 'PGRST204' && error.message?.includes('manager_id')) {
        // Show migration helper
        setError('MANAGER_COLUMN_MISSING');
        
        // Retry the update without manager_id
        const { manager_id, ...updateDataWithoutManager } = updateData;
        const { error: retryError } = await supabase
          .from('profiles')
          .update(updateDataWithoutManager)
          .eq('id', selectedUser.id);

        if (retryError) {
          toast.error('Failed to update user: ' + retryError.message);
          return;
        }

        toast.warning('User updated, but manager assignment requires database migration. See instructions above.');
        // Still save the plan even on manager_id fallback — fall through to plan logic below
        error = null;
      }

      if (error) {
        toast.error('Failed to update user: ' + error.message);
        return;
      }

      toast.success('User updated successfully!');

      // Handle plan change if admin changed the billing plan
      if (selectedUser && editUser.plan) {
        const currentPlan = userPlanMap[selectedUser.id];
        if (editUser.plan !== currentPlan) {
          try {
            // Save billing_plan directly on the profiles table
            const { error: planError } = await supabase
              .from('profiles')
              .update({
                billing_plan: editUser.plan,
                updated_at: new Date().toISOString(),
              })
              .eq('id', selectedUser.id);
            if (planError) {
              throw planError;
            }
            // Also try the subscription API (works after server deploy)
            try {
              if (currentPlan) {
                await updateSubscription(editUser.plan as PlanId, undefined, selectedUser.id, selectedUser.organizationId);
              } else {
                await createSubscription(editUser.plan as PlanId, 'month', undefined, false, selectedUser.id, selectedUser.organizationId);
              }
            } catch { /* Edge Function may not be deployed yet */ }
            toast.success(`Billing plan updated to ${editUser.plan === 'starter' ? 'Standard User' : editUser.plan === 'professional' ? 'Professional' : 'Enterprise'} for ${selectedUser.name}`);
          } catch (planErr: any) {
            toast.error('Profile saved but failed to update plan: ' + (planErr.message || 'Unknown error'));
          }
        }
      } else if (selectedUser && !editUser.plan && userPlanMap[selectedUser.id]) {
        // Plan was cleared — set to null
        try {
          await supabase
            .from('profiles')
            .update({ billing_plan: null, updated_at: new Date().toISOString() })
            .eq('id', selectedUser.id);
        } catch { /* non-critical */ }
      }

      // Reload users and plan map
      await loadUsers();
      await loadUserPlans();

      // Close dialog
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update user. Please try again.');
    }
  };

  const handleResetPassword = async (orgUser: OrgUser) => {
    // Prevent admin from resetting super_admin passwords
    if (user.role === 'admin' && orgUser.role === 'super_admin') {
      toast.error('You do not have permission to reset Super Admin passwords');
      return;
    }
    
    setResetPasswordUser(orgUser);
    setIsResettingPassword(true);
    
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    setNewPassword(tempPassword);
    
    try {
      // Call the server endpoint to reset the password
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/reset-password`;
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userEmail: orgUser.email,
          tempPassword: tempPassword
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      // Always ensure needs_password_change is set so the user is prompted on next login.
      try {
        await supabase
          .from('profiles')
          .update({ needs_password_change: true, temp_password: tempPassword, temp_password_created_at: new Date().toISOString() })
          .eq('email', orgUser.email.toLowerCase());
      } catch {
        // Non-fatal — server may have already set it
      }

      // Try to send password reset email (optional - not critical)
      try {
        await supabase.auth.resetPasswordForEmail(orgUser.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      } catch (emailError) {
      }

      // Show the dialog with the generated password
      setIsResetPasswordDialogOpen(true);
      toast.success('✅ Temporary password set! User can now log in.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set temporary password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!newPassword) {
      toast.error('No password to copy');
      return;
    }

    const success = await copyToClipboard(newPassword);
    
    if (success) {
      toast.success('Password copied to clipboard!');
    } else {
      toast.error('Could not copy automatically. Please select and copy the password manually.');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'director': return 'bg-indigo-100 text-indigo-700';
      case 'manager': return 'bg-green-100 text-green-700';
      case 'marketing': return 'bg-amber-100 text-amber-700';
      case 'standard_user': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'invited': return 'bg-yellow-100 text-yellow-700';
      case 'inactive': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-foreground';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!canViewUsers) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl text-foreground">Users</h1>
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage users. Only Admins, Directors, and Super Admins can access this section.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PermissionGate user={user} module="users" action="view">
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <UsersModuleHelp
          userId={user.id}
          totalUsers={users.length}
          canManageUsers={canManageUsers}
          onOpenUsersTab={() => setActiveTab('users')}
          onOpenPermissionsTab={() => setActiveTab('permissions')}
          onOpenRecoveryTab={() => setActiveTab('recovery')}
          onRefreshUsers={loadUsers}
          onFindMissingUsers={() => {
            if (canManageAllUsers) {
              handleSyncMissingUsers();
            }
          }}
          onOpenInviteUser={() => {
            if (canManageUsers) {
              setIsAddDialogOpen(true);
            }
          }}
        />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-3">
            <TabsTrigger value="users" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">User Management</TabsTrigger>
            <TabsTrigger value="permissions" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Space Access</TabsTrigger>
            <TabsTrigger value="recovery" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">User Recovery</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-6">
          {/* Invalid Organization ID Alert - Shows prominently if user has timestamp-based org ID */}
          {hasInvalidOrgId && !isLoadingUsers && (
            <InvalidOrgIdAlert 
              invalidOrgId={user.organizationId}
              correctOrgId="rona-atlantic"
            />
          )}

          {/* Loading State */}
          {isLoadingUsers && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-900">Loading Users...</h3>
                    <p className="text-sm text-blue-700 mt-1">Please wait while we fetch your users from the database</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Error Display - For other errors */}
          {error && !error.includes('infinite recursion') && !isLoadingUsers && (
            <Alert className="border-red-400 bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Error loading users:</strong>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded">{error}</pre>
                <Button 
                  onClick={loadUsers} 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Setup Guide - Shows only when there's a problem */}
          {showDebug && users.length > 0 && <ProfilesSyncFixer onRefresh={loadUsers} />}
          
          {/* Manager Migration Helper - Shows when manager_id column is missing */}
          {error === 'MANAGER_COLUMN_MISSING' && <ManagerMigrationHelper />}
          
          {/* Profiles Table Fix - Shows when foreign key constraint error occurs */}
          {showProfilesFix && <ProfilesTableFix />}
          
          {/* Organization Info Card */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Current Organization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Organization Name</p>
                      {isEditingOrgName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editOrgName}
                            onChange={(e) => setEditOrgName(e.target.value)}
                            className="h-8 text-sm max-w-[250px]"
                            placeholder="Enter organization name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveOrgName();
                              } else if (e.key === 'Escape') {
                                setIsEditingOrgName(false);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            onClick={handleSaveOrgName}
                            disabled={isSavingOrgName || !editOrgName.trim()}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsEditingOrgName(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{displayOrgName}</p>
                          {(user.role === 'admin' || user.role === 'super_admin') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600"
                              onClick={() => {
                                setEditOrgName(organization?.name || '');
                                setIsEditingOrgName(true);
                              }}
                              title="Edit organization name"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Organization ID</p>
                      <p className="font-mono text-sm text-foreground bg-background px-2 py-1 rounded border border-border inline-block">
                        {user.organizationId}
                      </p>
                    </div>
                  </div>
                  {user.role === 'super_admin' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md inline-flex">
                      <Shield className="h-4 w-4" />
                      <span>You can view, edit, and delete users from ALL organizations</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={loadUsers}
                disabled={isLoadingUsers}
                className="flex items-center gap-2"
              >
                <svg 
                  className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              {canManageAllUsers && (
                <Button
                  variant="outline"
                  onClick={handleSyncMissingUsers}
                  disabled={isSyncingMissing}
                  className="flex items-center gap-2"
                >
                  <Search className={`h-4 w-4 ${isSyncingMissing ? 'animate-pulse' : ''}`} />
                  {isSyncingMissing ? 'Scanning...' : 'Find Missing Users'}
                </Button>
              )}
              {canManageUsers && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to your organization by filling out the form below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>

                    {/* Organization selector - only for super admins */}
                    {user.role === 'super_admin' && (
                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization *</Label>
                        <Select 
                          value={newUser.organizationId} 
                          onValueChange={(value) => setNewUser({ ...newUser, organizationId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTenants ? "Loading..." : "Select organization"} />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                <div className="flex items-center gap-2">
                                  {tenant.logo ? (
                                    <img 
                                      src={tenant.logo} 
                                      alt={tenant.name} 
                                      className="h-4 w-4 object-contain"
                                    />
                                  ) : (
                                    <Building2 className="h-4 w-4" />
                                  )}
                                  <span>{tenant.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select which organization this user will belong to
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard_user">Standard User</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="designer">Designer</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {user.role === 'super_admin' && (
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {newUser.role === 'standard_user' && 'Can manage only their own data'}
                        {newUser.role === 'marketing' && 'Full access to marketing and campaigns, limited access to contacts'}
                        {newUser.role === 'designer' && 'Access to Project Wizards and design tools. Admins can enable additional modules.'}
                        {newUser.role === 'manager' && 'Can manage data of users they oversee'}
                        {newUser.role === 'director' && 'Same as Manager, plus full user visibility on Team Dashboard'}
                        {newUser.role === 'admin' && 'Full access within the organization'}
                        {newUser.role === 'super_admin' && 'Full access across all organizations'}
                      </p>
                    </div>

                    {/* Billing Plan selector */}
                    {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="plan">Billing Plan</Label>
                      <Select value={newUser.plan || 'none'} onValueChange={(value) => setNewUser({ ...newUser, plan: value === 'none' ? '' : value as PlanId })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Plan (Free)</SelectItem>
                          <SelectItem value="starter">Standard User — $29/mo</SelectItem>
                          <SelectItem value="professional">Professional — $79/mo</SelectItem>
                          <SelectItem value="enterprise">Enterprise — $199/mo</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Assign a billing plan to this user. Each user can have a different plan level.
                      </p>
                    </div>
                    )}

                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="inviteMethodOverride">Delivery Method</Label>
                      <Select value={inviteMethod} onValueChange={(value: 'email' | 'manual') => setInviteMethod(value)}>
                        <SelectTrigger id="inviteMethodOverride">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Automatically Email Invite Link</SelectItem>
                          <SelectItem value="manual">Generate Temporary Password</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {inviteMethod === 'email' ? 'Requires SMTP setup in Supabase Auth.' : 'You will need to manually share the temporary password.'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invite
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>

          {/* Missing Users Results */}
          {missingUsersResult && ((missingUsersResult.missing.length > 0 || missingUsersResult.wrongOrg.length > 0) && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Auth Users Missing from User List
                </h4>

                {missingUsersResult.missing.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-amber-700 mb-2">
                      <strong>{missingUsersResult.missing.length}</strong> user(s) exist in auth but have no profile:
                    </p>
                    <div className="space-y-1">
                      {missingUsersResult.missing.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between bg-background rounded px-3 py-2 text-sm border border-amber-200">
                          <div>
                            <span className="font-medium">{u.name}</span>
                            <span className="text-muted-foreground ml-2">{u.email}</span>
                            <span className="text-xs text-muted-foreground ml-2">({u.role})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {missingUsersResult.wrongOrg.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-amber-700 mb-2">
                      <strong>{missingUsersResult.wrongOrg.length}</strong> user(s) have a profile but wrong organization:
                    </p>
                    <div className="space-y-1">
                      {missingUsersResult.wrongOrg.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between bg-background rounded px-3 py-2 text-sm border border-amber-200">
                          <div>
                            <span className="font-medium">{u.name}</span>
                            <span className="text-muted-foreground ml-2">{u.email}</span>
                            <span className="text-xs text-red-500 ml-2">(org: {u.currentOrg?.slice(0,8)}...)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleFixMissingUsers([...missingUsersResult.missing, ...missingUsersResult.wrongOrg])}
                  >
                    Fix All ({missingUsersResult.missing.length + missingUsersResult.wrongOrg.length} users)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setMissingUsersResult(null)}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, role, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {usingClientSide && users.length > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Local Mode:</strong> Currently showing users that you've invited in this session. Deploy the backend to see all organization users and sync across devices.
                  </AlertDescription>
                </Alert>
              )}
              <div className="overflow-x-auto">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-muted-foreground">Loading users...</p>
                    </div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <UserPlus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg text-foreground mb-2">No users found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? 'Try adjusting your search query' : 'Get started by inviting your first team member'}
                    </p>
                    {!searchQuery && canManageUsers && (
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Invite User
                      </Button>
                    )}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm text-muted-foreground">Actions</th>
                        <th className="text-left py-3 px-4 text-sm text-muted-foreground">User</th>
                        {(user.role === 'super_admin' || user.role === 'admin') && (
                          <th className="text-left py-3 px-4 text-sm text-muted-foreground">Organization</th>
                        )}
                        <th className="text-left py-3 px-4 text-sm text-muted-foreground">Role</th>
                        <th className="text-left py-3 px-4 text-sm text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-4 text-sm text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 text-sm text-muted-foreground">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((orgUser) => (
                        <tr key={orgUser.id} className="border-b border-border hover:bg-muted">
                          {canManageUsers && (
                          <td className="py-3 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={orgUser.id === user.id}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => handleEditUser(orgUser)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteUser(orgUser.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-blue-600"
                                  onClick={() => handleResetPassword(orgUser)}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                {orgUser.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm text-foreground">{orgUser.name}</p>
                                <p className="text-xs text-muted-foreground">{orgUser.email}</p>
                              </div>
                            </div>
                          </td>
                          {(user.role === 'super_admin' || user.role === 'admin') && (
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-foreground">
                                  {getOrgName(orgUser.organizationId)}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  ID: {orgUser.organizationId}
                                </span>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getRoleColor(orgUser.role)}`}>
                              {orgUser.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {userPlanMap[orgUser.id] ? (
                              <span className={`inline-block px-2 py-1 text-xs rounded ${
                                userPlanMap[orgUser.id] === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                userPlanMap[orgUser.id] === 'professional' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {userPlanMap[orgUser.id] === 'starter' ? 'Standard User' :
                                 userPlanMap[orgUser.id] === 'professional' ? 'Professional' :
                                 userPlanMap[orgUser.id] === 'enterprise' ? 'Enterprise' :
                                 userPlanMap[orgUser.id]}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs rounded bg-muted text-muted-foreground">Free</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getStatusColor(orgUser.status)}`}>
                              {orgUser.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">{formatDate(orgUser.lastLogin)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col bg-background">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update the user's details and permissions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateUser} className="space-y-4 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    required
                  />
                </div>

                {/* Organization selector - only for super admins */}
                {user.role === 'super_admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="organization" className="flex items-center gap-2">
                      Organization *
                      {editUser.organizationId !== originalOrganizationId && (
                        <span className="text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded">
                          ⚠️ CHANGED
                        </span>
                      )}
                    </Label>
                    <Select 
                      value={editUser.organizationId} 
                      onValueChange={(value) => setEditUser({ ...editUser, organizationId: value })}
                    >
                      <SelectTrigger className={editUser.organizationId !== originalOrganizationId ? 'border-orange-500 border-2' : ''}>
                        <SelectValue placeholder={isLoadingTenants ? "Loading..." : "Select organization"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            <div className="flex items-center gap-2">
                              {tenant.logo ? (
                                <img 
                                  src={tenant.logo} 
                                  alt={tenant.name} 
                                  className="h-4 w-4 object-contain"
                                />
                              ) : (
                                <Building2 className="h-4 w-4" />
                              )}
                              <span>{tenant.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editUser.organizationId !== originalOrganizationId ? (
                      <Alert className="border-orange-500 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-900 text-xs">
                          <strong>⚠️ Warning:</strong> Changing organization will affect this user's access to data. You will be asked to confirm before saving.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select which organization this user will belong to
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={editUser.role} onValueChange={(value: UserRole) => setEditUser({ ...editUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard_user">Standard User</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {user.role === 'super_admin' && (
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editUser.role === 'standard_user' && 'Can manage only their own data'}
                    {editUser.role === 'marketing' && 'Full access to marketing and campaigns, limited access to contacts'}
                    {editUser.role === 'designer' && 'Access to Project Wizards and design tools. Admins can enable additional modules.'}
                    {editUser.role === 'manager' && 'Can manage data of users they oversee'}
                    {editUser.role === 'director' && 'Same as Manager, plus full user visibility on Team Dashboard'}
                    {editUser.role === 'admin' && 'Full access within the organization'}
                    {editUser.role === 'super_admin' && 'Full access across all organizations'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={editUser.status} onValueChange={(value: 'active' | 'invited' | 'inactive') => setEditUser({ ...editUser, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="invited">Invited</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editUser.status === 'active' && 'User has full access to the system'}
                    {editUser.status === 'invited' && 'User has been invited but not yet accepted'}
                    {editUser.status === 'inactive' && 'User account is temporarily disabled'}
                  </p>
                </div>

                {/* Billing Plan selector */}
                {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="editPlan">Billing Plan</Label>
                  <Select value={editUser.plan || 'none'} onValueChange={(value) => setEditUser({ ...editUser, plan: value === 'none' ? '' : value as PlanId })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Plan (Free)</SelectItem>
                      <SelectItem value="starter">Standard User — $29/mo</SelectItem>
                      <SelectItem value="professional">Professional — $79/mo</SelectItem>
                      <SelectItem value="enterprise">Enterprise — $199/mo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Change this user's billing plan. Each user can have a different plan level.
                  </p>
                </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="manager">Manager (Optional)</Label>
                  <Select value={editUser.managerId || 'none'} onValueChange={(value) => setEditUser({ ...editUser, managerId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                              {manager.name.charAt(0)}
                            </div>
                            <span>{manager.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {managers.length === 0 
                      ? 'No active managers available. Assign a Manager role to a user first.' 
                      : 'Assign a manager who will oversee this user'}
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Update User
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-background">
              <DialogHeader>
                <DialogTitle>🔐 Password Generated</DialogTitle>
                <DialogDescription>
                  Temporary password for {resetPasswordUser?.name} ({resetPasswordUser?.email})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Generated Password - Large and Prominent */}
                <div className="space-y-2">
                  <Label>Generated Temporary Password</Label>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-3xl font-mono font-bold text-blue-900 select-all break-all flex-1">
                        {newPassword}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCopyPassword}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 font-semibold">
                    ⚠️ This password is shown only once. Copy it before closing this dialog!
                  </p>
                </div>

                {/* Success Notice */}
                <Alert className="bg-green-50 border-green-300 border-2">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong className="text-base">✅ Password is Active!</strong>
                    <p className="mt-2 text-sm">The user can now <strong>login immediately</strong> with the temporary password shown above. They will be prompted to change it on first login.</p>
                  </AlertDescription>
                </Alert>

                {/* Instructions */}
                <div className="space-y-3">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                      📋 Share the Password
                    </h5>
                    <div className="text-sm text-blue-900 space-y-2 ml-8">
                      <p>Send this temporary password to <strong>{resetPasswordUser?.email}</strong>:</p>
                      <div className="bg-background border border-blue-300 rounded p-3">
                        <p className="font-mono text-lg font-bold text-blue-900">{newPassword}</p>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">⚠️ They will be required to change this password on first login.</p>
                    </div>
                  </div>

                  {/* Method 2: Supabase Dashboard UI */}
                  <details className="bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <summary className="p-4 cursor-pointer font-semibold text-blue-900 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                      🔧 Alternative: Supabase Dashboard UI (Click to expand)
                    </summary>
                    <div className="px-4 pb-4 text-sm text-blue-900 space-y-2 mt-2">
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Go to Supabase Dashboard → Authentication → Users</li>
                        <li>Find: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">{resetPasswordUser?.email}</code></li>
                        <li>Click "..." menu → "Update User"</li>
                        <li>Check "Auto Confirm User" and enter password: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">{newPassword}</code></li>
                        <li>Click "Save"</li>
                      </ol>
                    </div>
                  </details>

                  {/* Method 3: Email (when available) */}
                  <details className="bg-muted border-2 border-border rounded-lg opacity-70">
                    <summary className="p-4 cursor-pointer font-semibold text-muted-foreground flex items-center gap-2">
                      <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                      📧 Email Method (Not Available - Email Not Configured)
                    </summary>
                    <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2 mt-2">
                      <p className="font-medium">Once email is configured in Supabase, you can:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Click "Reset Password" button</li>
                        <li>User receives email with reset link</li>
                        <li>User clicks link and enters the password you provide</li>
                        <li>Password is automatically set</li>
                      </ol>
                      <p className="text-xs mt-2 italic bg-muted p-2 rounded">
                        💡 To enable: Configure SMTP in Supabase Dashboard → Settings → Auth → Email Templates
                      </p>
                    </div>
                  </details>
                </div>

                {/* User Information */}
                <div className="bg-muted border border-border rounded-lg p-3">
                  <h5 className="font-semibold text-foreground mb-2 text-sm">👤 User Information</h5>
                  <div className="text-sm text-foreground space-y-1">
                    <div><strong>Name:</strong> {resetPasswordUser?.name}</div>
                    <div><strong>Email:</strong> {resetPasswordUser?.email}</div>
                    <div><strong>Role:</strong> {resetPasswordUser?.role}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Password
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setIsResetPasswordDialogOpen(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }} 
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Invite Credentials Dialog - shown after creating a new user account */}
          <Dialog open={isInviteCredentialsDialogOpen} onOpenChange={setIsInviteCredentialsDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-background">
              <DialogHeader>
                <DialogTitle>Account Created Successfully</DialogTitle>
                <DialogDescription>
                  A new account has been created for {inviteCredentials?.name}. Share the login credentials below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Credentials Card */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 space-y-3">
                  <div>
                    <Label className="text-xs text-green-700 uppercase tracking-wide">Email</Label>
                    <p className="font-mono text-lg font-semibold text-green-900 select-all">{inviteCredentials?.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-green-700 uppercase tracking-wide">Temporary Password</Label>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <code className="text-2xl font-mono font-bold text-green-900 select-all break-all flex-1">
                        {inviteCredentials?.tempPassword}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (inviteCredentials?.tempPassword) {
                            const success = await copyToClipboard(inviteCredentials.tempPassword);
                            if (success) toast.success('Password copied!');
                            else toast.error('Copy failed. Please select and copy manually.');
                          }
                        }}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-red-600 font-semibold">
                  This password is shown only once. Copy it before closing this dialog!
                </p>

                <Alert className="bg-blue-50 border-blue-300 border-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Next Steps:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Share the email and temporary password with <strong>{inviteCredentials?.name}</strong></li>
                      <li>They can sign in immediately at the login page</li>
                      <li>They will be prompted to change their password on first login</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (inviteCredentials) {
                      const text = `Login Credentials for ${inviteCredentials.name}:\nEmail: ${inviteCredentials.email}\nTemporary Password: ${inviteCredentials.tempPassword}\n\nPlease sign in and change your password immediately.`;
                      const success = await copyToClipboard(text);
                      if (success) toast.success('Full credentials copied!');
                      else toast.error('Copy failed. Please copy manually.');
                    }
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setIsInviteCredentialsDialogOpen(false);
                    setInviteCredentials(null);
                  }} 
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <PermissionsManager userRole={user.role} />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <FixInvalidOrgIds />
          <FindMissingUser />
          <UserRecovery 
            currentUserId={user.id} 
            currentOrganizationId={user.organizationId}
            currentUserRole={user.role}
          />
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}

// Function to generate a secure temporary password
function generateSecurePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}