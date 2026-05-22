import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { tenantsAPI } from '../utils/api';
import type { User, Organization } from '../App';
import { PermissionGate } from './PermissionGate';
import { canView, canAdd, canChange, canDelete } from '../utils/permissions';
import { CleanupUnusedOrganizations } from './CleanupUnusedOrganizations';
import { SubscriptionAgreement } from './SubscriptionAgreement';
import { OrganizationModuleManager } from './OrganizationModuleManager';
import { getOrgMode, setOrgMode } from '../utils/settings-client';
import { AVAILABLE_MODULES } from '../lib/global-settings';
import type { OrgUserMode } from '../utils/settings-client';
import { getOrgSubscriptions, type Subscription, type PlanId } from '../utils/subscription-client';
import { createClient } from '../utils/supabase/client';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users as UsersIcon,
  FileText,
  AlertCircle,
  Lock,
  X,
  CheckCircle2,
  Image as ImageIcon,
  CreditCard,
  ArrowLeft,
  DollarSign,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AIToggleSwitch } from './AIToggleSwitch';
import { Switch } from './ui/switch';
import { TenantsModuleHelp } from './TenantsModuleHelp';

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  customPlanPrice?: string;
  userCount: number;
  contactsCount: number;
  createdAt: string;
  updatedAt: string;
  features: string[];
  billingEmail?: string;
  phone?: string;
  address?: string;
  notes?: string;
  logo?: string;
  ai_suggestions_enabled?: boolean;
  marketing_enabled?: boolean;
  inventory_enabled?: boolean;
  import_export_enabled?: boolean;
  documents_enabled?: boolean;
}

interface TenantsProps {
  user: User;
  organization?: Organization | null;
}

export function Tenants({ user, organization }: TenantsProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track which org is being deleted
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewingAgreement, setViewingAgreement] = useState<Tenant | null>(null);
  const [viewingBilling, setViewingBilling] = useState<Tenant | null>(null);
  const [billingData, setBillingData] = useState<(Subscription & { user_email?: string; user_name?: string; user_role?: string })[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingPage, setBillingPage] = useState(1);
  const billingPerPage = 10;

  // Compute all available modules dynamically based on all tenants and defaults
  const availableModules = useMemo(() => {
    const modules = new Set<string>();
    // Add default known modules
    AVAILABLE_MODULES.forEach(m => modules.add(m.id));
    
    // Add any dynamic modules from database records
    tenants.forEach(tenant => {
      Object.keys(tenant).forEach(key => {
        if (key.endsWith('_enabled')) {
          modules.add(key);
        }
      });
    });
    return Array.from(modules);
  }, [tenants]);

  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    domain: '',
    status: 'active',
    plan: 'starter',
    customPlanPrice: '',
    billingEmail: '',
    phone: '',
    address: '',
    notes: '',
    logo: '',
    user_mode: 'multi',
  });

  // Only super_admin can access this module
  const canAccessTenants = canView('tenants', user.role);

  useEffect(() => {
    if (canAccessTenants) {
      loadTenants();
    }
  }, [canAccessTenants]);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const data = await tenantsAPI.getAll();
      setTenants(data.tenants || []);
    } catch (error) {
      showAlert('error', 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleOpenDialog = async (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);

      // Load org mode from KV (async)
      let currentMode: OrgUserMode = 'multi';
      try {
        const modeData = await getOrgMode(tenant.id);
        currentMode = modeData?.user_mode || 'multi';
      } catch (err) {
        
      }

      // Extract existing module flags from tenant
      const moduleFlags: Record<string, boolean> = {};
      availableModules.forEach(key => {
        moduleFlags[key] = Boolean((tenant as any)[key]);
      });

      setFormData({
        name: tenant.name,
        domain: tenant.domain || '',
        status: tenant.status,
        plan: tenant.plan,
        customPlanPrice: tenant.customPlanPrice || '',
        billingEmail: tenant.billingEmail || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        notes: tenant.notes || '',
        logo: tenant.logo || '',
        user_mode: currentMode,
        ...moduleFlags,
      });
    } else {
      setEditingTenant(null);
      
      const defaultModules: Record<string, boolean> = {};
      availableModules.forEach(key => {
        defaultModules[key] = false;
      });

      setFormData({
        name: '',
        domain: '',
        status: 'active',
        plan: 'starter',
        customPlanPrice: '',
        billingEmail: '',
        phone: '',
        address: '',
        notes: '',
        logo: '',
        user_mode: 'multi',
        ...defaultModules,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      showAlert('error', 'Organization name is required');
      return;
    }

    try {
      setIsSaving(true);

      const dynamicFlags: Record<string, boolean> = {};
      availableModules.forEach(key => {
        dynamicFlags[key] = Boolean(formData[key]);
      });

      const tenantData = {
        name: formData.name,
        domain: formData.domain,
        status: formData.status,
        plan: formData.plan,
        customPlanPrice: formData.customPlanPrice,
        billingEmail: formData.billingEmail,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        features: getPlanFeatures(formData.plan),
        logo: formData.logo,
        ...dynamicFlags,
      };

      if (editingTenant) {
        await tenantsAPI.update(editingTenant.id, tenantData);
        // Save user mode to KV
        try {
          await setOrgMode(editingTenant.id, formData.user_mode);
        } catch (modeErr) {
          
        }
        showAlert('success', 'Organization updated successfully');
      } else {
        const result = await tenantsAPI.create(tenantData);
        // tenantsAPI.create already sets mode to 'multi', but if user toggled it in the form, update
        if (result?.tenant?.id && formData.user_mode !== 'multi') {
          try {
            await setOrgMode(result.tenant.id, formData.user_mode);
          } catch (modeErr) {
            
          }
        }
        showAlert('success', 'Organization created successfully');
      }

      setShowDialog(false);
      loadTenants();
    } catch (error) {
      showAlert('error', 'Failed to save organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone and will affect all users in this organization.')) {
      return;
    }

    try {
      setIsDeleting(id);
      const result = await tenantsAPI.delete(id);
      showAlert('success', 'Organization deleted successfully');
      await loadTenants();
    } catch (error: any) {
      showAlert('error', `Failed to delete organization: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert('error', 'Logo file size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showAlert('error', 'Please upload an image file');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logo: reader.result as string });
    };
    reader.onerror = () => {
      showAlert('error', 'Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: '' });
  };

  const handleViewBilling = async (tenant: Tenant) => {
    setViewingBilling(tenant);
    setIsBillingLoading(true);
    setBillingPage(1);
    try {
      const supabaseClient = createClient();
      // Read all profiles for users in this org (including free/null billing_plan)
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, email, name, role, status, billing_plan, updated_at')
        .eq('organization_id', tenant.id);

      // Build subscription-like records for display
      const planPrices: Record<string, number> = { starter: 29, professional: 79, enterprise: 199 };
      const enriched = (profiles || []).map(p => {
        const plan = p.billing_plan || 'free';
        return {
          id: `plan:${p.id}`,
          organization_id: tenant.id,
          user_id: p.id,
          plan_id: plan as PlanId,
          status: (plan === 'free' ? 'free' : 'active') as string,
          billing_interval: 'month' as const,
          current_period_start: p.updated_at || '',
          current_period_end: '',
          cancel_at_period_end: false,
          amount: planPrices[plan] || 0,
          currency: 'USD',
          created_at: p.updated_at || '',
          updated_at: p.updated_at || '',
          user_email: p.email || null,
          user_name: p.name || null,
          user_role: p.role || null,
        };
      });

      setBillingData(enriched);
    } catch (error) {
      showAlert('error', 'Failed to load billing data');
      setBillingData([]);
    } finally {
      setIsBillingLoading(false);
    }
  };

  const getPlanDisplayName = (planId: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      starter: 'Standard User',
      professional: 'Professional',
      enterprise: 'Enterprise',
    };
    return names[planId] || planId;
  };

  const getPlanPrice = (planId: string, interval: string = 'month') => {
    const prices: Record<string, { month: number; year: number }> = {
      starter: { month: 29, year: 290 },
      professional: { month: 79, year: 790 },
      enterprise: { month: 199, year: 1990 },
    };
    return prices[planId]?.[interval as 'month' | 'year'] || 0;
  };

  const getPlanFeatures = (plan: string): string[] => {
    const features: Record<string, string[]> = {
      free: ['Basic features', 'Email support'],
      starter: ['Core CRM (Contacts, Deals, Tasks)', 'Email integration', 'Basic reports', 'Community support'],
      professional: ['Everything in Standard User', 'Marketing automation', 'Inventory management', 'Document management', 'Project Wizards (3D planners)', 'Advanced reports & analytics', 'Customer portal', 'Email support'],
      enterprise: ['Everything in Professional', 'Dedicated account manager', 'Custom integrations', 'SSO / SAML support', 'Audit log', 'Priority support (24/7)', 'API access', 'Custom onboarding'],
    };
    return features[plan] || [];
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-muted text-foreground border-border',
      suspended: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-muted text-foreground border-border';
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant.domain && tenant.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tenant.billingEmail && tenant.billingEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    totalUsers: tenants.reduce((sum, t) => sum + t.userCount, 0),
    totalContacts: tenants.reduce((sum, t) => sum + (t.contactsCount || 0), 0),
  };

  if (!canAccessTenants) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive" className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Access Denied. Only Super Administrators can manage tenant organizations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If viewing agreement, show that instead
  if (viewingAgreement) {
    const orgData: Organization = {
      id: viewingAgreement.id,
      name: viewingAgreement.name,
      ai_suggestions_enabled: viewingAgreement.ai_suggestions_enabled,
      marketing_enabled: viewingAgreement.marketing_enabled,
      inventory_enabled: viewingAgreement.inventory_enabled,
      import_export_enabled: viewingAgreement.import_export_enabled,
      documents_enabled: viewingAgreement.documents_enabled,
    };
    
    return (
      <SubscriptionAgreement 
        organization={orgData} 
        onBack={() => setViewingAgreement(null)}
      />
    );
  }

  // If viewing billing, show billing breakdown
  if (viewingBilling) {
    const activeSubs = billingData.filter(s => s.status === 'active' || s.status === 'trialing');
    const paidSubs = billingData.filter(s => s.plan_id !== 'free' && (s.status === 'active' || s.status === 'trialing'));
    const freeSubs = billingData.filter(s => s.plan_id === 'free' || s.status === 'free');
    const totalPages = Math.ceil(billingData.length / billingPerPage);
    const paginatedData = billingData.slice((billingPage - 1) * billingPerPage, billingPage * billingPerPage);
    const totalMonthly = paidSubs.reduce((sum, s) => {
      if (s.billing_interval === 'year') return sum + (s.amount / 12);
      return sum + s.amount;
    }, 0);
    const totalAnnual = totalMonthly * 12;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setViewingBilling(null); setBillingData([]); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {viewingBilling.logo && (
            <img src={viewingBilling.logo} alt="" className="h-10 w-10 rounded-lg object-contain border border-border bg-background p-1" />
          )}
          <div>
            <h2 className="text-xl font-semibold text-foreground">{viewingBilling.name}</h2>
            <p className="text-sm text-muted-foreground">Billing Breakdown</p>
          </div>
          <Badge className={getPlanColor(viewingBilling.plan)}>{getPlanDisplayName(viewingBilling.plan)}</Badge>
          <Badge className={getStatusColor(viewingBilling.status)}>{viewingBilling.status}</Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Active Plans</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{paidSubs.length}</p>
              <p className="text-xs text-muted-foreground mt-1">of {billingData.length} total ({freeSubs.length} free)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
              <p className="text-2xl font-bold text-foreground">${totalMonthly.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">effective monthly</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">Annual Revenue</p>
              </div>
              <p className="text-2xl font-bold text-foreground">${totalAnnual.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">projected yearly</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <p className="text-xs text-muted-foreground">Org Plan</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{getPlanDisplayName(viewingBilling.plan)}</p>
              {viewingBilling.customPlanPrice && (
                <p className="text-xs text-amber-600 mt-1">Custom: ${viewingBilling.customPlanPrice}/mo</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Billing Plans by User</h3>
            {isBillingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading billing data...</span>
              </div>
            ) : billingData.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No individual billing plans found for this organization.</p>
                <p className="text-xs text-muted-foreground mt-1">Users in this organization have not been assigned individual plans yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Billing</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Period End</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedData.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">{sub.user_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{sub.user_email || '—'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs capitalize text-muted-foreground">{sub.user_role?.replace('_', ' ') || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getPlanColor(sub.plan_id)}>{getPlanDisplayName(sub.plan_id)}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            sub.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                            sub.status === 'trialing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            sub.status === 'past_due' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            sub.status === 'free' ? 'bg-muted text-muted-foreground border-border' :
                            'bg-muted text-foreground border-border'
                          }>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-muted-foreground capitalize">{sub.billing_interval}ly</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sub.amount > 0 ? (
                            <>
                              <span className="font-medium text-foreground">${sub.amount.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">/{sub.billing_interval === 'year' ? 'yr' : 'mo'}</span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">$0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-muted-foreground">
                            {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {billingData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted">
                        <td colSpan={5} className="py-3 px-4 text-sm font-medium text-foreground">
                          Total ({paidSubs.length} paid, {freeSubs.length} free)
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-foreground">${totalMonthly.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Showing {(billingPage - 1) * billingPerPage + 1}–{Math.min(billingPage * billingPerPage, billingData.length)} of {billingData.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={billingPage <= 1}
                        onClick={() => setBillingPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={page === billingPage ? 'default' : 'outline'}
                          size="sm"
                          className="min-w-[32px]"
                          onClick={() => setBillingPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={billingPage >= totalPages}
                        onClick={() => setBillingPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PermissionGate user={user} module="tenants" action="view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex gap-2">
          <TenantsModuleHelp
            userId={user.id}
            totalOrganizations={stats.total}
            activeOrganizations={stats.active}
            onRefreshOrganizations={loadTenants}
            onOpenAddOrganization={() => handleOpenDialog()}
            onOpenSearchExample={(query) => {
              setStatusFilter('all');
              setSearchQuery(query);
            }}
            onClearSearchAndFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            onShowActiveOnly={() => setStatusFilter('active')}
            onOpenAgreementView={() => {
              if (filteredTenants.length > 0) {
                setViewingAgreement(filteredTenants[0]);
              }
            }}
          />
          <Button variant="outline" onClick={() => loadTenants()} title="Refresh data">
            Refresh
          </Button>
          {canAdd('tenants', user.role) && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          )}
        </div>
      </div>

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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Organizations</p>
                <p className="text-2xl text-foreground mt-1">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Organizations</p>
                <p className="text-2xl text-foreground mt-1">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl text-foreground mt-1">{stats.totalUsers}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
                <p className="text-2xl text-foreground mt-1">{stats.totalContacts.toLocaleString()}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading organizations...
            </CardContent>
          </Card>
        ) : filteredTenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-muted-foreground">No organizations found</p>
              {canAdd('tenants', user.role) && (
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Organization
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTenants.map(tenant => (
            <Card key={tenant.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {tenant.logo ? (
                          <div className="h-12 w-12 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                            <img 
                              src={tenant.logo} 
                              alt={`${tenant.name} logo`} 
                              className="h-full w-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg text-foreground">{tenant.name}</h3>
                            <Badge variant="outline" className={getStatusColor(tenant.status)}>
                              {tenant.status}
                            </Badge>
                            <Badge variant="outline" className={getPlanColor(tenant.plan)}>
                              {tenant.plan}
                            </Badge>
                            {tenant.customPlanPrice && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                ${parseFloat(tenant.customPlanPrice).toFixed(2)}/mo
                              </Badge>
                            )}
                          </div>
                          {tenant.domain && (
                            <p className="text-sm text-muted-foreground mt-1">{tenant.domain}</p>
                          )}
                          {tenant.billingEmail && (
                            <p className="text-sm text-muted-foreground">{tenant.billingEmail}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center rounded-md text-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-foreground h-9 w-9"
                          disabled={isDeleting === tenant.id}
                        >
                          {isDeleting === tenant.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user?.role === 'SUPERADMIN' && (
                            <DropdownMenuItem onClick={() => setViewingAgreement(tenant)} disabled={isDeleting === tenant.id}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Agreement
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleViewBilling(tenant)} disabled={isDeleting === tenant.id}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            View Billing
                          </DropdownMenuItem>
                          {canChange('tenants', user.role) && (
                            <DropdownMenuItem onClick={() => handleOpenDialog(tenant)} disabled={isDeleting === tenant.id}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete('tenants', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(tenant.id)}
                              disabled={isDeleting === tenant.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isDeleting === tenant.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Users</p>
                        <p className="text-sm text-foreground mt-1">
                          {tenant.userCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Contacts</p>
                        <p className="text-sm text-foreground mt-1">
                          {(tenant.contactsCount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm text-foreground mt-1">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Updated</p>
                        <p className="text-sm text-foreground mt-1">
                          {new Date(tenant.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {tenant.features && tenant.features.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">Plan Features:</p>
                        <div className="flex flex-wrap gap-2">
                          {tenant.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Edit Organization' : 'Create New Organization'}</DialogTitle>
            <DialogDescription>
              {editingTenant ? 'Update organization details and subscription plan' : 'Add a new tenant organization to your CRM system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Organization Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div>
                  <Label>Domain</Label>
                  <Input
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="acme.com"
                  />
                </div>
                <div>
                  <Label>Billing Email</Label>
                  <Input
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                    placeholder="billing@acme.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Organization Logo</h3>
              <div>
                <Label>Upload Logo</Label>
                <div className="mt-2">
                  {formData.logo ? (
                    <div className="flex items-start gap-4">
                      <img 
                        src={formData.logo} 
                        alt="Organization logo" 
                        className="h-20 w-20 object-contain rounded-lg border border-border bg-background p-2"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Logo uploaded successfully</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRemoveLogo}
                          type="button"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, GIF up to 2MB
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    This logo will be displayed on the organization pages
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Subscription & Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plan</Label>
                  <Select value={formData.plan} onValueChange={(value: any) => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">
                        <div className="flex flex-col">
                          <span>Free</span>
                          <span className="text-xs text-muted-foreground">Basic features, email support</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="starter">
                        <div className="flex flex-col">
                          <span>Standard User — $29/mo</span>
                          <span className="text-xs text-muted-foreground">Core CRM, email integration, basic reports</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="professional">
                        <div className="flex flex-col">
                          <span>Professional — $79/mo</span>
                          <span className="text-xs text-muted-foreground">Marketing, inventory, 3D planners, advanced reports</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="enterprise">
                        <div className="flex flex-col">
                          <span>Enterprise — $199/mo</span>
                          <span className="text-xs text-muted-foreground">SSO, API access, custom integrations, 24/7 support</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Custom Plan Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.customPlanPrice}
                      onChange={(e) => setFormData({ ...formData, customPlanPrice: e.target.value })}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Override the default plan price for this customer (per month)
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Modules Access */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">Modules Access</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableModules.map(key => {
                  const moduleDef = AVAILABLE_MODULES.find(m => m.id === key);
                  const label = moduleDef ? moduleDef.label : key.replace('_enabled', '').replace(/_/g, ' ');
                  return (
                  <div key={key}>
                    <Label className="capitalize">{label} Module</Label>
                    <div className="mt-2">
                      <Switch
                        checked={!!formData[key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                      />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* User Mode */}
            <div className="space-y-4">
              <h3 className="text-sm text-foreground">User Mode</h3>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                      {formData.user_mode === 'single' ? 'Single User' : 'Multi User'}
                    </Label>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      formData.user_mode === 'multi'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-muted text-foreground'
                    }`}>
                      {formData.user_mode === 'multi' ? 'Team' : 'Solo'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.user_mode === 'single'
                      ? 'Solo workspace — team management features are hidden'
                      : 'Team workspace — roles, space access, and user management enabled'}
                  </p>
                </div>
                <Switch
                  checked={formData.user_mode === 'multi'}
                  onCheckedChange={(checked) => setFormData({ ...formData, user_mode: checked ? 'multi' : 'single' })}
                />
              </div>
            </div>

            {/* Plan Features Preview */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-foreground mb-2">Plan Features:</p>
              <div className="flex flex-wrap gap-2">
                {getPlanFeatures(formData.plan).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (Internal)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this organization..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingTenant ? 'Update Organization' : 'Create Organization'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Manager */}
      {user.role === 'super_admin' && (
        <OrganizationModuleManager user={user} />
      )}

      {/* Cleanup Unused Organizations */}
      <CleanupUnusedOrganizations />
    </div>
    </PermissionGate>
  );
}