import { useState, useEffect, FormEvent } from 'react';
import { Tenant, User, UserRole } from '../types';
import { 
  Plus, Edit2, Trash2, Check, X, Shield, Landmark, Globe, 
  Sparkles, RefreshCw, AlertTriangle, Database, Users, 
  Mail, Lock, Eye, EyeOff, UserPlus, ShieldAlert, KeyRound, UserCheck 
} from 'lucide-react';

// Custom fetch utility to automatically inject custom Supabase headers for stateless backend resilience
async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input && 'url' in (input as any) ? (input as any).url : ''));
  if (url && (url.startsWith('/api/') || url.includes('/api/'))) {
    const savedUrl = localStorage.getItem('prospaces_custom_supabase_url');
    const savedKey = localStorage.getItem('prospaces_custom_supabase_key');
    if (savedUrl && savedKey) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has('x-custom-supabase-url')) {
        headers.set('x-custom-supabase-url', savedUrl);
      }
      if (!headers.has('x-custom-supabase-key')) {
        headers.set('x-custom-supabase-key', savedKey);
      }
      init.headers = headers;
    }
  }
  return window.fetch(input, init);
}

interface SuperAdminTenantsViewProps {
  tenants: Tenant[];
  onAddTenant: (t: Tenant) => Promise<void>;
  onUpdateTenant: (t: Tenant) => Promise<void>;
  onDeleteTenant: (id: string) => Promise<void>;
  supabaseStatus: {
    configured: boolean;
    connected: boolean;
    error: string | null;
  } | null;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function SuperAdminTenantsView({
  tenants,
  onAddTenant,
  onUpdateTenant,
  onDeleteTenant,
  supabaseStatus,
  currentUser
}: SuperAdminTenantsViewProps) {
  // Tabs: 'tenants' (Ecosystem Tenants) or 'users' (Tenant Users Setup)
  const [activeAdminTab, setActiveAdminTab] = useState<'tenants' | 'users'>('tenants');
  
  // Tenant states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Tenant Form fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [logoBadge, setLogoBadge] = useState('🏢');
  const [regionalFocus, setRegionalFocus] = useState('');
  const [primaryColor, setPrimaryColor] = useState<'blue' | 'emerald' | 'indigo' | 'slate'>('blue');
  
  // Global messaging
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Users Setup Tab states
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  
  // User Form fields
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState<'User' | 'Driver' | 'Dispatcher' | 'Admin'>('User');
  const [userStatus, setUserStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [showPasswordRaw, setShowPasswordRaw] = useState<boolean>(false);

  // Check if role is Admin (has access, but cannot modify Tenants)
  const isTenantAdminOnly = currentUser?.role === 'Admin';

  // Load users when selected tenant changes in the Users tab
  useEffect(() => {
    if (activeAdminTab === 'users' && selectedTenantId) {
      fetchTenantUsers(selectedTenantId);
    }
  }, [selectedTenantId, activeAdminTab]);

  // Initial tab selection helper
  useEffect(() => {
    if (tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  // Load users setup from DB or localStorage cache
  const fetchTenantUsers = async (tenantId: string) => {
    if (!tenantId) {
      setTenantUsers([]);
      return;
    }
    setLoadingUsers(true);
    setError(null);
    try {
      const res = await customFetch(`/api/tenant/state?tenantId=${tenantId}`);
      const data = await res.json();
      setTenantUsers(data.users || []);
      
      // Keep offline/local cache synced
      localStorage.setItem(`prospaces_users_tenant_${tenantId}`, JSON.stringify(data.users || []));
    } catch (err) {
      console.warn("Retrying offline user credentials from browser cache:", err);
      const cached = localStorage.getItem(`prospaces_users_tenant_${tenantId}`);
      if (cached) {
        setTenantUsers(JSON.parse(cached));
      } else {
        setTenantUsers([]);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const resetTenantForm = () => {
    setId('');
    setName('');
    setCode('');
    setDescription('');
    setLogoBadge('🏢');
    setRegionalFocus('');
    setPrimaryColor('blue');
    setError(null);
    setEditingId(null);
    setIsEditing(false);
  };

  const resetUserForm = () => {
    setUserEmail('');
    setUserPassword('');
    setUserFullName('');
    setUserRole('User');
    setUserStatus('Active');
    setEditingUserId(null);
    setConfirmDeleteUserId(null);
  };

  const startEditTenant = (t: Tenant) => {
    if (isTenantAdminOnly) return;
    setEditingId(t.id);
    setId(t.id);
    setName(t.name);
    setCode(t.code);
    setDescription(t.description || '');
    setLogoBadge(t.logoBadge || '🏢');
    setRegionalFocus(t.regionalFocus || '');
    setPrimaryColor(t.primaryColor || 'blue');
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleTenantSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isTenantAdminOnly) {
      setError("Operation Forbidden. Tenant administration actions are restricted.");
      return;
    }
    setError(null);
    setSuccess(null);

    // Basic Validations
    if (!id.trim() || !name.trim() || !code.trim() || !logoBadge.trim() || !regionalFocus.trim()) {
      setError('All fields except description are required to construct an active corporate tenant space.');
      return;
    }

    const tenantIdSlug = id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const tenantCodeUpper = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (tenantCodeUpper.length < 2 || tenantCodeUpper.length > 5) {
      setError('Tenant Code must be between 2 and 5 alphanumeric characters.');
      return;
    }

    // Check uniqueness when creating a new tenant
    if (!editingId) {
      if (tenants.some(t => t.id === tenantIdSlug)) {
        setError(`A tenant with the ID "${tenantIdSlug}" already exists. Provide a unique name to generate a discrete ID.`);
        return;
      }
      if (tenants.some(t => t.code === tenantCodeUpper)) {
        setError(`A tenant with the unique short code "${tenantCodeUpper}" already exists.`);
        return;
      }
    }

    setBusy(true);
    try {
      const payload: Tenant = {
        id: editingId || tenantIdSlug,
        name: name.trim(),
        code: tenantCodeUpper,
        description: description.trim(),
        logoBadge: logoBadge.trim(),
        regionalFocus: regionalFocus.trim(),
        primaryColor
      };

      if (editingId) {
        await onUpdateTenant(payload);
        setSuccess(`Successfully updated logistics partner "${payload.name}" in the enterprise ecosystem.`);
      } else {
        await onAddTenant(payload);
        setSuccess(`Successfully synchronized and commissioned brand-new tenant space "${payload.name}"!`);
      }
      resetTenantForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while writing tenant details to the storage provider.');
    } finally {
      setBusy(false);
    }
  };

  const handleTenantDelete = async (targetId: string, targetName: string) => {
    if (isTenantAdminOnly) {
      setError("Operation Forbidden. Deleting tenants is restricted to SuperAdmins.");
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      await onDeleteTenant(targetId);
      setSuccess(`Decommissioned and deleted "${targetName}" from the enterprise database core.`);
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not complete destruction request.');
    } finally {
      setBusy(false);
    }
  };

  // User Administration Operations
  const handleUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      setError("Please select a target workspace Tenant first.");
      return;
    }
    if (!userFullName.trim() || !userEmail.trim()) {
      setError("Email and Full Name are required to setup the user account.");
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      // 1. Fetch target tenant's active collections so we preserve deliveries/trucks/branches
      let fullState = { deliveries: [], trucks: [], branches: [], users: [] };
      try {
        const res = await customFetch(`/api/tenant/state?tenantId=${selectedTenantId}`);
        fullState = await res.json();
      } catch (err) {
        console.warn("Using fallback browser local storage caches in offline active mode");
        const ld = localStorage.getItem(`prospaces_deliveries_tenant_${selectedTenantId}`);
        const lt = localStorage.getItem(`prospaces_trucks_tenant_${selectedTenantId}`);
        const lb = localStorage.getItem(`prospaces_branches_tenant_${selectedTenantId}`);
        const lu = localStorage.getItem(`prospaces_users_tenant_${selectedTenantId}`);
        if (ld) fullState.deliveries = JSON.parse(ld);
        if (lt) fullState.trucks = JSON.parse(lt);
        if (lb) fullState.branches = JSON.parse(lb);
        if (lu) fullState.users = JSON.parse(lu);
      }

      let updatedUsers = [...(fullState.users || [])];

      if (editingUserId) {
        // Edit User Record
        updatedUsers = updatedUsers.map(u => u.id === editingUserId ? {
          ...u,
          name: userFullName.trim(),
          email: userEmail.trim().toLowerCase(),
          password: userPassword,
          role: userRole,
          status: userStatus
        } : u);
      } else {
        // Verify unique email address
        if (updatedUsers.some(u => u.email.toLowerCase() === userEmail.trim().toLowerCase())) {
          setError(`A user profile with email "${userEmail.trim()}" already exists in this tenant.`);
          setBusy(false);
          return;
        }

        const newUserId = `USR-${Math.floor(Math.random() * 90000) + 10000}`;
        const newUser: User = {
          id: newUserId,
          name: userFullName.trim(),
          email: userEmail.trim().toLowerCase(),
          role: userRole,
          password: userPassword,
          status: userStatus,
          associatedStoreId: selectedTenantId === 'bay-of-fundy' ? 'BOF_MONCTON_DC' : selectedTenantId === 'cabot-trail' ? 'CTC_HAWKESBURY_DC' : 'WINDMILL_DC'
        };
        updatedUsers.push(newUser);
      }

      // 2. Commit states back safely
      const res = await customFetch("/api/tenant/save-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          deliveries: fullState.deliveries,
          trucks: fullState.trucks,
          branches: fullState.branches,
          users: updatedUsers
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to synchronize states to live Supabase server (Status Code: ${res.status}).`);
      }

      // 3. Keep fallback cache synced
      localStorage.setItem(`prospaces_users_tenant_${selectedTenantId}`, JSON.stringify(updatedUsers));
      setTenantUsers(updatedUsers);

      setSuccess(
        editingUserId 
          ? `Successfully modified employee profile: "${userFullName}"`
          : `Successfully registered new employees account: "${userFullName}" to the target tenant!`
      );
      resetUserForm();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving user record details.');
    } finally {
      setBusy(false);
    }
  };

  const handleUserDelete = async (userId: string, userName: string) => {
    if (!selectedTenantId) return;
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      // Fetch full state for sync
      let fullState = { deliveries: [], trucks: [], branches: [], users: [] };
      try {
        const res = await customFetch(`/api/tenant/state?tenantId=${selectedTenantId}`);
        fullState = await res.json();
      } catch (err) {
        const ld = localStorage.getItem(`prospaces_deliveries_tenant_${selectedTenantId}`);
        const lt = localStorage.getItem(`prospaces_trucks_tenant_${selectedTenantId}`);
        const lb = localStorage.getItem(`prospaces_branches_tenant_${selectedTenantId}`);
        const lu = localStorage.getItem(`prospaces_users_tenant_${selectedTenantId}`);
        if (ld) fullState.deliveries = JSON.parse(ld);
        if (lt) fullState.trucks = JSON.parse(lt);
        if (lb) fullState.branches = JSON.parse(lb);
        if (lu) fullState.users = JSON.parse(lu);
      }

      const updatedUsers = (fullState.users || []).filter((u: any) => u.id !== userId);

      // Save state
      try {
        await customFetch("/api/tenant/save-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: selectedTenantId,
            deliveries: fullState.deliveries,
            trucks: fullState.trucks,
            branches: fullState.branches,
            users: updatedUsers
          })
        });

        // Delete permanently on database level
        await customFetch(`/api/tenant/delete-record?table=users&id=${userId}&tenantId=${selectedTenantId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn("Could not remove live user record, deleted using local browser caching.");
      }

      localStorage.setItem(`prospaces_users_tenant_${selectedTenantId}`, JSON.stringify(updatedUsers));
      setTenantUsers(updatedUsers);
      setSuccess(`Decommissioned and deleted employee profile "${userName}" successfully.`);
      setConfirmDeleteUserId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to remove user from database storage.");
    } finally {
      setBusy(false);
    }
  };

  const fillUserEdit = (user: User) => {
    setEditingUserId(user.id);
    setUserEmail(user.email);
    setUserPassword(user.password || '');
    setUserFullName(user.name);
    setUserRole(user.role as any || 'User');
    setUserStatus(user.status || 'Active');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6 text-slate-100" id="super-admin-view-panel">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-700/60 pb-px space-x-2" id="admin-main-tabs">
        <button
          onClick={() => {
            setActiveAdminTab('tenants');
            setError(null);
            setSuccess(null);
          }}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeAdminTab === 'tenants'
              ? 'border-amber-400 text-amber-400 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🏢 Corporate Tenants Management
        </button>
        <button
          onClick={() => {
            setActiveAdminTab('users');
            setError(null);
            setSuccess(null);
            if (!selectedTenantId && tenants.length > 0) {
              setSelectedTenantId(tenants[0].id);
            }
          }}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeAdminTab === 'users'
              ? 'border-amber-400 text-amber-400 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          👥 Tenant Users Setup
        </button>
      </div>

      {/* Role Alert warning for Resident Tenant Admin */}
      {isTenantAdminOnly && (
        <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-xs font-semibold flex items-start space-x-2.5 shadow-md">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-400 shrink-0" />
          <div>
            <strong className="text-amber-200">Tenant Administrator Session:</strong>
            <p className="mt-0.5 text-amber-400 font-medium">
              You possess active system credentials. You can view registered tenants and configure active users, drivers, dispatchers, or administrators. Adding, modifying, or decommissioning tenant logistics spaces is restricted to the Global SuperAdmin.
            </p>
          </div>
        </div>
      )}

      {/* Alert Messaging Box */}
      {(error || success) && (
        <div className="animate-fade-in">
          {error && (
            <div className="bg-rose-955 border border-rose-500/35 text-rose-200 p-4 rounded-xl text-xs font-semibold flex items-start space-x-2.5 shadow-sm bg-rose-950/50">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-emerald-955 border border-emerald-500/35 text-emerald-250 p-4 rounded-xl text-xs font-semibold flex items-start space-x-2.5 shadow-sm bg-emerald-950/40">
              <Check className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* RENDER SPACE: TENANTS MANAGEMENT */}
      {activeAdminTab === 'tenants' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tenants-tab-view">
          
          {/* Left Block: Tenant Editor (Only visible/enabled if SUPER_ADMIN) */}
          <div className={`${isTenantAdminOnly ? 'hidden' : 'lg:col-span-5'} bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl`}>
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg">
                  <Landmark className="h-4 w-4" />
                </div>
                <h3 className="font-sans font-black text-slate-100 text-xs uppercase tracking-wider">
                  {editingId ? 'Modify Workspace Tenant' : 'Register New Tenant Partner'}
                </h3>
              </div>
              {isEditing && (
                <button 
                  onClick={resetTenantForm} 
                  className="text-xs text-slate-400 hover:text-slate-100 font-mono font-bold flex items-center space-x-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            <form onSubmit={handleTenantSubmit} className="space-y-4">
              {/* Unique Tenant Domain Identifier */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Unique Domain/Database ID Slug
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingId || isTenantAdminOnly}
                  placeholder="e.g. maritime-freight-corp"
                  value={id}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                    setId(val);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 focus:bg-slate-900 outline-none transition-all disabled:text-slate-500"
                />
                <p className="text-[9.5px] text-slate-400 font-mono mt-1">
                  System slug used for database isolation keys. Alphanumeric and dashes only.
                </p>
              </div>

              {/* Partner Legal Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Corporate partner Name
                </label>
                <input
                  type="text"
                  required
                  disabled={isTenantAdminOnly}
                  placeholder="e.g. Maritime Freight Systems Ltd."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId) {
                      const slug = e.target.value.toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-');
                      setId(slug);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Short Unique Code */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    Tenant Code (e.g. MFS)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isTenantAdminOnly}
                    placeholder="e.g. MFS"
                    maxLength={5}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                  />
                </div>

                {/* Logo Badge Icon Emoji */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    Logo Badge Emoji
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isTenantAdminOnly}
                    placeholder="e.g. 🚛"
                    value={logoBadge}
                    onChange={(e) => setLogoBadge(e.target.value)}
                    className="text-center w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-500 text-center mt-1">Emoji, maximum 1-2 symbols</p>
                </div>
              </div>

              {/* Regional Focus */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Regional Logistics Focus Space
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isTenantAdminOnly}
                    placeholder="e.g. Maine Corridor, Bangor Hubs"
                    value={regionalFocus}
                    onChange={(e) => setRegionalFocus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Brand Theme Accent Color selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                  Workspace Brand Accent Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'blue', label: 'Classic Blue', bg: 'bg-blue-600' },
                    { value: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-600' },
                    { value: 'indigo', label: 'Indigo Tech', bg: 'bg-indigo-600' },
                    { value: 'slate', label: 'Slate Charcoal', bg: 'bg-slate-600' }
                  ].map((col) => {
                    const isSelected = primaryColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        disabled={isTenantAdminOnly}
                        onClick={() => setPrimaryColor(col.value as any)}
                        className={`py-2 rounded-xl text-[10.5px] font-bold border flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-amber-400 bg-slate-900 ring-2 ring-amber-500/15' 
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full ${col.bg}`} />
                        <span className="text-[9.5px]">{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Partner Description
                </label>
                <textarea
                  rows={2}
                  disabled={isTenantAdminOnly}
                  placeholder="Briefly state service scope and stores/DC layout..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                />
              </div>

              {/* Submit Commission Button */}
              <button
                type="submit"
                disabled={busy || isTenantAdminOnly}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center space-x-2"
              >
                {busy ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Writing to Storage Database Core...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{editingId ? 'Modify Commission' : 'Commission Workspace'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Block: Active Organizations Directory Listing */}
          <div className={`${isTenantAdminOnly ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-sans font-black text-slate-100 text-xs uppercase tracking-wider">
                    Active Logistical Organizations ({tenants.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    These active corporate partitions have isolated dispatch databases, freight fleets, and local OCR templates.
                  </p>
                </div>

                <div className={`p-2 rounded-xl text-[10px] font-mono flex items-center space-x-1.5 border leading-none shrink-0 ${
                  supabaseStatus?.connected
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}>
                  <Database className="h-3.5 w-3.5 text-current" />
                  <span>{supabaseStatus?.connected ? 'Live Database Active' : 'Local Active Store'}</span>
                </div>
              </div>

              {/* Tenants Loop */}
              <div className="space-y-3.5" id="admin-tenants-list">
                {tenants.map((t) => {
                  const colorBadgeBg = 
                    t.primaryColor === 'blue' ? 'bg-blue-950/50 text-blue-300 border-blue-800/40' :
                    t.primaryColor === 'emerald' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40' :
                    t.primaryColor === 'indigo' ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800/40' :
                    'bg-slate-900 text-slate-300 border-slate-800';

                  const borderAccent = 
                    t.primaryColor === 'blue' ? 'group-hover:border-blue-500/50' :
                    t.primaryColor === 'emerald' ? 'group-hover:border-emerald-500/50' :
                    t.primaryColor === 'indigo' ? 'group-hover:border-indigo-500/50' :
                    'group-hover:border-slate-500/50';

                  return (
                    <div 
                      key={t.id}
                      className={`group bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 rounded-xl p-4 transition-all duration-200 hover:shadow-lg border-l-4 border-l-amber-500 ${borderAccent}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-3xl select-none shrink-0 mt-0.5">{t.logoBadge || '🏢'}</span>
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="font-sans font-black text-slate-100 text-xs uppercase tracking-wide leading-tight">
                                {t.name}
                              </h4>
                              <span className="bg-slate-850 text-amber-400 text-[9.5px] font-black px-2 py-0.5 rounded font-mono border border-slate-700">
                                {t.code}
                              </span>
                              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${colorBadgeBg}`}>
                                theme: {t.primaryColor || 'blue'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-normal font-medium">
                              {t.description || 'No detailed corporate description available.'}
                            </p>
                            <div className="flex items-center space-x-1 text-[10.5px] text-slate-400 font-medium">
                              <Globe className="h-3.5 w-3.5 text-slate-500" />
                              <span>Region: <strong className="text-slate-200">{t.regionalFocus || 'Unassigned'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Modification Actions (Only rendered if NOT Restricted) */}
                        {!isTenantAdminOnly && (
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => startEditTenant(t)}
                              className="p-1 px-2.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs transition-all flex items-center space-x-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            
                            {/* Protect system-admin-tenant from arbitrary deletes */}
                            {t.id !== 'system-admin-tenant' && (
                              confirmDeleteId === t.id ? (
                                <div className="flex items-center space-x-1 animate-fade-in">
                                  <span className="text-[10px] text-rose-400 font-bold font-mono animate-pulse">Confirm?</span>
                                  <button
                                    onClick={() => handleTenantDelete(t.id, t.name)}
                                    className="p-1 px-2 rounded bg-rose-750 text-white font-bold text-xs hover:bg-rose-700 transition"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 px-2 rounded bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(t.id)}
                                  className="p-1 px-2.5 rounded bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/60 hover:border-rose-800 text-rose-400 font-bold text-xs transition-all flex items-center space-x-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/40 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-mono">
                        <span>Unique DB Slug: <strong className="text-slate-350">{t.id}</strong></span>
                        <span>&bull;</span>
                        <span>Isolated Logistical Registry Node</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* RENDER SPACE: TENANT USERS SETUP (Email, Password, Name, Role, Status) */}
      {activeAdminTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="users-tab-view">
          
          {/* Left Block: Configuration Form */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="font-sans font-black text-slate-100 text-xs uppercase tracking-wider">
                  {editingUserId ? 'Modify Employee Profile' : 'Setup Tenant Employee'}
                </h3>
              </div>
              {editingUserId && (
                <button 
                  onClick={resetUserForm} 
                  className="text-xs text-slate-400 hover:text-slate-100 font-mono font-bold flex items-center space-x-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4 font-sans text-xs">
              
              {/* Target Workspace Tenant Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Target Workspace Tenant
                </label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                    resetUserForm();
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="" disabled>-- Choose a Corporate Tenant --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.logoBadge} {t.name} ({t.code})
                    </option>
                  ))}
                </select>
                <p className="text-[9.5px] text-slate-500 font-mono mt-1">
                  The user will be placed into this tenant's isolated directory and database partition.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Cormier"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Account Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. robert.c@maritimefreight.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Passcode */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type={showPasswordRaw ? "text" : "password"}
                    required
                    placeholder="Enter login password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-xs font-semibold text-slate-200 focus:border-amber-500 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordRaw(!showPasswordRaw)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350"
                  >
                    {showPasswordRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-500 font-mono mt-1">
                  Stored as a flat passcode string for ease of administrative support and audit testing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role dropdown Option: User, Driver, Dispatcher, Admin */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    System Role Name
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="User">User</option>
                    <option value="Driver">Driver</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                {/* Status selector: Active, Inactive */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    Profile Status
                  </label>
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Submit User button */}
              <button
                type="submit"
                disabled={busy || !selectedTenantId}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-850 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center space-x-2"
              >
                {busy ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Saving account to Tenant DB...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>{editingUserId ? "Update User Account" : "Register User Profile"}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Block: Selected Tenant User Listings directories */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-sans font-black text-slate-100 text-xs uppercase tracking-wider">
                    Registered Tenant Employees List
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Displaying active directory users registered in isolated namespace of the chosen tenant.
                  </p>
                </div>
                
                {selectedTenantId && (
                  <button
                    onClick={() => fetchTenantUsers(selectedTenantId)}
                    title="Reload users"
                    className="p-1 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded border border-slate-850 font-mono text-[10px] transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reload List</span>
                  </button>
                )}
              </div>

              {/* Select target tenant context banner if none loaded */}
              {!selectedTenantId ? (
                <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                  Select a tenant inside the form to display and manage corresponding client users.
                </div>
              ) : loadingUsers ? (
                <div className="text-center py-10 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                  <span className="font-mono text-xs">Querying tenant accounts...</span>
                </div>
              ) : tenantUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                  <p>No account records found in this isolated tenant space yet.</p>
                  <p className="text-[10px] text-slate-500 font-mono">Default credentials will load if user attempts fallback login.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1" id="tenant-users-list">
                  {tenantUsers.map((u) => {
                    const isUserInactive = u.status === 'Inactive';
                    
                    const roleBadgeColor = 
                      u.role === 'Admin' ? 'bg-indigo-950 text-indigo-300 border-indigo-900/60' :
                      u.role === 'Dispatcher' ? 'bg-amber-950 text-amber-300 border-amber-900/60' :
                      u.role === 'Driver' ? 'bg-blue-950 text-blue-300 border-blue-900/60' :
                      'bg-slate-900 text-slate-350 border-slate-850';

                    return (
                      <div 
                        key={u.id}
                        className={`p-3.5 bg-slate-900/50 hover:bg-slate-900 border ${
                          isUserInactive ? 'border-rose-950 bg-rose-950/5' : 'border-slate-850'
                        } rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5`}
                      >
                        <div className="flex items-start space-x-3 text-left">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isUserInactive ? 'bg-rose-950/40 text-rose-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            <Users className="h-4.5 w-4.5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="font-sans font-bold text-[13px] text-slate-100 leading-none">
                                {u.name}
                              </h4>
                              <span className={`text-[9px] font-mono uppercase font-black px-1.5 py-0.5 rounded border ${roleBadgeColor}`}>
                                {u.role || 'User'}
                              </span>
                              
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                isUserInactive 
                                  ? 'bg-rose-955 border-rose-900 text-rose-350 bg-rose-950/40' 
                                  : 'bg-emerald-955 border-emerald-900 text-emerald-300 bg-emerald-950/40'
                              } border text-[8.5px]`}>
                                {u.status || 'Active'}
                              </span>
                            </div>

                            <p className="font-mono text-[10.5px] text-slate-400 leading-none break-all">
                              {u.email}
                            </p>

                            <p className="font-mono text-[10px] text-slate-450 flex items-center space-x-1.5 pt-0.5">
                              <span className="text-slate-500 font-bold shrink-0">Passcode:</span>
                              <span className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 tracking-wider">
                                {u.password || 'ProSpaces2026!'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* User configuration actions */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-center pr-1 shrink-0">
                          <button
                            onClick={() => fillUserEdit(u)}
                            className="p-1 px-2.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-705 hover:bg-slate-800 text-slate-200 font-bold text-xs font-mono transition"
                          >
                            Edit
                          </button>

                          {confirmDeleteUserId === u.id ? (
                            <div className="flex items-center space-x-1 animate-fade-in">
                              <span className="text-[10px] font-bold text-rose-400 font-mono animate-pulse">Sure?</span>
                              <button
                                onClick={() => handleUserDelete(u.id, u.name)}
                                className="p-1 px-2 rounded bg-rose-750 text-white font-bold text-xs font-mono hover:bg-rose-700 transition"
                              >
                                Del
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUserId(null)}
                                className="p-1 px-2 rounded bg-slate-800 text-slate-300 font-black text-xs font-mono hover:bg-slate-750 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteUserId(u.id)}
                              className="p-1 px-2.5 rounded bg-rose-950/40 border border-rose-900/40 text-rose-400 hover:bg-rose-950/60 font-bold text-xs font-mono transition"
                            >
                              Delete
                            </button>
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
      )}

      {/* Guideline Informational Panel */}
      <div className="bg-slate-950 border border-slate-800 text-slate-300 rounded-2xl p-5 space-y-3 shadow-md" id="admin-summary-rules">
        <div className="flex items-center space-x-2.5 text-amber-400">
          <Shield className="h-4 w-4" />
          <h4 className="font-sans font-black text-[10.5px] uppercase tracking-widest font-mono">System Administrative Regulations</h4>
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 font-medium">
          <li>
            Employee roles include: <strong className="text-slate-200">Admin</strong>, <strong className="text-slate-200">Dispatcher</strong>, <strong className="text-slate-200">Driver</strong>, and <strong className="text-slate-200">User</strong>.
          </li>
          <li>
            Inactive account accounts are automatically rejected on login by database gatekeepers.
          </li>
          <li>
            Each dynamic Tenant is segregated in storage. Drivers, route dispatches, and setups never mix.
          </li>
          <li>
            Tenant <strong className="text-slate-200">Admin</strong> has access to view tenant systems but is blocked from Add/Change/Delete structural tenants.
          </li>
        </ul>
      </div>

    </div>
  );
}
