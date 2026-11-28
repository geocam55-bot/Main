import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import {
  Monitor,
  UserCog,
  Shield,
  History,
  Settings,
  Building2,
  Upload,
  CreditCard,
  FileText,
  Globe,
  MessageSquare,
  Clock,
  Wrench,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { createClient } from '../../utils/supabase/client';
import { canView, onPermissionsChanged, getNormalizedRole } from '../../utils/permissions';
import { tenantsAPI } from '../../utils/api';
import type { User } from '../../App';
import { useTheme } from '../ThemeProvider';
import { ProfileThemeSwitch } from '../ProfileThemeSwitch';

// ── Lazy-load admin sub-components ──
const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) =>
  lazy(() =>
    factory().then((m) => ({ default: m[name] as React.ComponentType<any> }))
  );

const Users = lazyNamed(() => import('../Users'), 'Users');
const Tenants = lazyNamed(() => import('../Tenants'), 'Tenants');
const SettingsComponent = lazyNamed(() => import('../Settings'), 'Settings');
const Security = lazyNamed(() => import('../Security'), 'Security');
const AuditLog = lazyNamed(() => import('../AuditLog'), 'AuditLog');
const ImportExport = lazyNamed(() => import('../ImportExport'), 'ImportExport');
const ScheduledJobs = lazyNamed(() => import('../ScheduledJobs'), 'ScheduledJobs');
const SubscriptionBilling = lazyNamed(() => import('../subscription/SubscriptionBilling'), 'SubscriptionBilling');
const SubscriptionAgreement = lazyNamed(() => import('../SubscriptionAgreement'), 'SubscriptionAgreement');
const PortalMessagesAdmin = lazyNamed(() => import('../MessagingHub'), 'MessagingHub');
const AdminFixUsers = lazyNamed(() => import('../AdminFixUsers'), 'AdminFixUsers');
const Contacts = lazyNamed(() => import('../Contacts'), 'Contacts');

type ITView =
  | 'home'
  | 'contacts'
  | 'users'
  | 'tenants'
  | 'security'
  | 'audit-log'
  | 'settings'
  | 'import-export'
  | 'scheduled-jobs'
  | 'billing'
  | 'agreement'
  | 'portal-admin'
  | 'fix-users';

interface NavItem {
  id: ITView;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  superAdminOnly?: boolean;
  module?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'contacts',       label: 'Contacts',             icon: UsersIcon,  color: 'text-sky-600',     bgColor: 'bg-sky-50',     module: 'contacts' },
  { id: 'users',          label: 'Users',                icon: UserCog,    color: 'text-violet-600',  bgColor: 'bg-violet-50',  module: 'users' },
  { id: 'tenants',        label: 'Organizations',        icon: Building2,  color: 'text-indigo-600',  bgColor: 'bg-indigo-50',  superAdminOnly: true, module: 'tenants' },
  { id: 'security',       label: 'Security',             icon: Shield,     color: 'text-purple-600',  bgColor: 'bg-purple-50',  module: 'security' },
  { id: 'audit-log',      label: 'Audit Log',            icon: History,    color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-50', module: 'security' },
  { id: 'settings',       label: 'Settings',             icon: Settings,   color: 'text-slate-600',   bgColor: 'bg-slate-100',  module: 'settings' },
  { id: 'import-export',  label: 'Import / Export',      icon: Upload,     color: 'text-cyan-600',    bgColor: 'bg-cyan-50',    module: 'import-export' },
  { id: 'billing',        label: 'Billing',              icon: CreditCard, color: 'text-emerald-600', bgColor: 'bg-emerald-50', module: 'admin' },
  { id: 'agreement',      label: 'Subscription',         icon: FileText,   color: 'text-blue-600',    bgColor: 'bg-blue-50',    superAdminOnly: true, module: 'admin' },
  { id: 'portal-admin',   label: 'Message Space',        icon: MessageSquare, color: 'text-rose-600', bgColor: 'bg-rose-50', module: 'messages' },
  { id: 'fix-users',      label: 'Fix Users',            icon: Wrench,     color: 'text-orange-600',  bgColor: 'bg-orange-50',  superAdminOnly: true, module: 'admin' },
];

function ModuleLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

interface ITShellProps {
  user: User;
  accessToken?: string;
  onLogout: () => void;
}

export function ITShell({ user, accessToken, onLogout }: ITShellProps) {
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<ITView>('home');
  const [organization, setOrganization] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => onPermissionsChanged(() => setPermissionVersion((version) => version + 1)), []);

  const normalizedRole = getNormalizedRole(currentUser?.role, currentUser?.email);
  const roleStr = String(currentUser?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const emailStr = String(currentUser?.email || '').toLowerCase().trim();

  const isSuperAdmin =
    normalizedRole === 'super_admin' ||
    roleStr === 'super_admin' ||
    roleStr === 'superadmin' ||
    roleStr.includes('super') ||
    emailStr.includes('superadmin') ||
    emailStr.includes('george.campbell') ||
    emailStr.includes('geocam');

  const isAdmin =
    isSuperAdmin ||
    normalizedRole === 'admin' ||
    roleStr === 'admin' ||
    roleStr.includes('admin') ||
    emailStr.includes('admin');

  const hasNavAccess = useCallback((item: NavItem) => {
    if (isAdmin || isSuperAdmin) return true;
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.module && !canView(item.module, currentUser.role)) return false;
    return true;
  }, [isSuperAdmin, isAdmin, currentUser.role]);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => hasNavAccess(item)
  );

  useEffect(() => {
    if (currentView === 'home') return;
    const currentNav = NAV_ITEMS.find((item) => item.id === currentView);
    if (!currentNav) {
      setCurrentView('home');
      return;
    }
    if (!hasNavAccess(currentNav)) {
      setCurrentView('home');
    }
  }, [currentView, hasNavAccess]);

  // Load organization on mount
  useEffect(() => {
    const rawOrgId = user?.organization_id || user?.organizationId;
    if (!rawOrgId) return;
    const orgId = (rawOrgId === 'rona_atlantic' || rawOrgId === 'org_001' || rawOrgId === 'default-org' || rawOrgId === 'default_org')
      ? '34638283-7b3d-47e2-bec8-a9e600e28c4a'
      : rawOrgId;
    const supabase = createClient();
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle()
      .then(
        async ({ data }) => {
          if (data) {
            setOrganization(data);
          } else {
            try {
              const { tenant } = await tenantsAPI.getById(orgId);
              if (tenant) setOrganization(tenant);
            } catch {}
          }
        },
        async () => {
          try {
            const { tenant } = await tenantsAPI.getById(orgId);
            if (tenant) setOrganization(tenant);
          } catch {}
        }
      );
  }, [user?.organization_id, user?.organizationId]);

  const handleNavigate = useCallback((view: ITView) => {
    setCurrentView(view);
  }, []);

  const handleBackToSpaces = () => {
    window.location.href = '/?view=space-chooser';
  };

  const handleOpenProfile = () => {
    setCurrentView('settings');
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // silently continue
    }
    onLogout();
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden text-slate-900 dark:text-slate-100"
      style={{
        background: 'var(--gradient, var(--color-background))',
      }}
    >
      {/* ── Top Sticky Navbar ── */}
      <header
        className="sticky top-0 z-50 w-full shrink-0 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 bg-white/90 text-slate-900 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100 backdrop-blur-md px-4 md:px-6 py-2.5 md:py-0 md:h-16 gap-3 md:gap-4 shadow-sm"
      >
        {/* Brand & Left Control */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleBackToSpaces}
            className="flex items-center justify-center p-2 rounded-xl transition-colors shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
            title="Back to Spaces"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
            <Monitor className="h-5 w-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-sm md:text-base font-bold tracking-tight block truncate text-slate-900 dark:text-white">
              IT Space
            </span>
            <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider block text-slate-500 dark:text-slate-400">
              Administration
            </span>
          </div>
        </div>

        {/* Horizontal Navigation Tab Bar */}
        <nav className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-1 -mx-2 md:mx-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs font-semibold cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20 border border-violet-500/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side: account menu */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all text-left cursor-pointer bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0 shadow-inner">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate hidden md:inline-block text-slate-900 dark:text-white">
                  {currentUser.full_name?.split(' ')[0] || currentUser.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60 text-slate-500 dark:text-slate-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-60 mt-1 bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{currentUser.full_name || currentUser.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">{currentUser.email || 'No email'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <ProfileThemeSwitch variant="menu" />
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <DropdownMenuItem onClick={handleOpenProfile} className="dark:focus:bg-slate-800 dark:focus:text-white cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBackToSpaces} className="dark:focus:bg-slate-800 dark:focus:text-white cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Spaces Main Page
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-600 dark:text-rose-400 dark:focus:bg-rose-950/50 dark:focus:text-rose-300 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log Off
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto text-slate-900 dark:text-slate-100" style={{ background: 'var(--gradient, var(--color-background))' }}>
        {currentView === 'home' && (
          <HomeView user={currentUser} navItems={visibleNavItems} onNavigate={handleNavigate} />
        )}

        <ErrorBoundary>
          <Suspense fallback={<ModuleLoading />}>
            {currentView === 'contacts' && <Contacts user={currentUser} />}
            {currentView === 'users' && <Users user={currentUser} organization={organization} onOrganizationUpdate={setOrganization} />}
            {currentView === 'tenants' && <Tenants user={currentUser} organization={organization} />}
            {currentView === 'security' && <Security user={currentUser} />}
            {currentView === 'audit-log' && <AuditLog user={currentUser} />}
            {currentView === 'settings' && <SettingsComponent user={currentUser} organization={organization} onUserUpdate={setCurrentUser} onOrganizationUpdate={setOrganization} />}
            {currentView === 'import-export' && <ImportExport user={currentUser} onNavigate={handleNavigate} />}
            {currentView === 'scheduled-jobs' && <ScheduledJobs user={currentUser} onNavigate={handleNavigate} />}
            {currentView === 'billing' && <SubscriptionBilling user={currentUser} />}
            {currentView === 'agreement' && <SubscriptionAgreement organization={organization} onBack={() => handleNavigate('home')} />}
            {currentView === 'portal-admin' && <PortalMessagesAdmin user={currentUser} />}
            {currentView === 'fix-users' && <AdminFixUsers />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

/* ── Home / dashboard view ── */
function HomeView({
  user,
  navItems,
  onNavigate,
}: {
  user: User;
  navItems: NavItem[];
  onNavigate: (view: ITView) => void;
}) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const cardMeta: Record<string, { description: string; gradient: string; iconBg: string }> = {
    contacts:        { description: 'View and manage shared CRM contacts inside IT Space while following the current space access rules.', gradient: 'from-sky-500 to-cyan-600', iconBg: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20' },
    users:           { description: 'Manage user accounts, roles, space access, and team member access across the platform.',            gradient: 'from-violet-500 to-indigo-600', iconBg: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' },
    tenants:         { description: 'Create and manage organizations, configure org-level settings, and control tenant access.',        gradient: 'from-indigo-500 to-blue-600', iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
    security:        { description: 'Configure space access, security policies, two-factor authentication, session controls, and IP whitelists.', gradient: 'from-purple-500 to-violet-600', iconBg: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' },
    'audit-log':     { description: 'Review a complete audit trail of user actions, data changes, and system events.',              gradient: 'from-fuchsia-500 to-pink-600', iconBg: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20' },
    settings:        { description: 'Global platform settings, custom fields, workflow automation, and system configuration.',       gradient: 'from-slate-500 to-gray-600', iconBg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20' },
    'import-export': { description: 'Bulk import contacts, deals, and inventory. Export data in CSV and other formats.',            gradient: 'from-cyan-500 to-teal-600', iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' },
    'scheduled-jobs':{ description: 'Monitor and manage background jobs, scheduled tasks, and automated system processes.',         gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    billing:         { description: 'Manage subscription plans, payment methods, invoices, and billing history.',                   gradient: 'from-emerald-500 to-green-600', iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    agreement:       { description: 'View and manage your subscription agreement and service terms.',                               gradient: 'from-blue-500 to-indigo-600', iconBg: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    'portal-admin':  { description: 'Manage customer portal messages, access requests, and client communications.',                 gradient: 'from-rose-500 to-pink-600', iconBg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
    'fix-users':     { description: 'Diagnostic tool to fix user profile issues, sync problems, and data inconsistencies.',         gradient: 'from-orange-500 to-red-600', iconBg: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' },
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Welcome back, {user.full_name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Your IT administration center. Hover over any module for details or click to launch.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {navItems.filter(n => n.id !== ('home' as any)).map((item) => {
          const Icon = item.icon;
          const meta = cardMeta[item.id] || { description: '', gradient: 'from-slate-500 to-gray-600', iconBg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20' };
          const isTooltipActive = activeTooltip === item.id;

          return (
            <div
              key={item.id}
              className="relative group"
              onMouseEnter={() => setActiveTooltip(item.id)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className="w-full bg-white hover:bg-slate-50/90 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 hover:border-violet-400 dark:border-slate-800 dark:hover:border-violet-500/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg dark:shadow-lg flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.gradient} opacity-80 group-hover:opacity-100`} />
                <div className={`w-14 h-14 rounded-2xl ${meta.iconBg} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300 transition-colors mb-1">
                  {item.label}
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Module
                </span>
              </button>

              {isTooltipActive && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md z-50 text-left pointer-events-none">
                  <div className="flex items-center space-x-1.5 mb-1 text-xs font-bold text-slate-900 dark:text-white">
                    <span>{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {meta.description}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
                    <span>Click to open module</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
