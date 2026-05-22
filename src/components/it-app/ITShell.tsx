import { ImportScreen } from '../../modules/import-export/components/ImportScreen';
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
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
import { canView, onPermissionsChanged } from '../../utils/permissions';
import type { User } from '../../App';
import { useTheme } from '../ThemeProvider';

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
// const ImportExport = lazyNamed(() => import('../ImportExport'), 'ImportExport');
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
  { id: 'scheduled-jobs', label: 'Scheduled Jobs',       icon: Clock,      color: 'text-amber-600',   bgColor: 'bg-amber-50',   module: 'admin' },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => onPermissionsChanged(() => setPermissionVersion((version) => version + 1)), []);

  const isSuperAdmin = currentUser.role === 'super_admin';
  const hasNavAccess = useCallback((item: NavItem) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.module && !canView(item.module, currentUser.role)) return false;
    return true;
  }, [isSuperAdmin, currentUser.role]);

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
    const orgId = user.organization_id || user.organizationId;
    if (!orgId) return;
    const supabase = createClient();
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        if (data) setOrganization(data);
      });
  }, [user.organization_id, user.organizationId]);

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
      className="flex h-screen overflow-hidden"
      style={{
        background: theme.colors.backgroundSecondary,
        color: theme.colors.text,
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
        style={{
          background: theme.colors.navBackground,
          borderRight: `1px solid ${theme.colors.border}`,
          color: theme.colors.navText,
        }}
      >
        {/* Brand header */}
        <div
          className="flex items-center gap-3 px-5 h-16 shrink-0"
          style={{ borderBottom: `1px solid ${theme.colors.border}` }}
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Monitor className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <span className="text-base font-bold tracking-tight block truncate" style={{ color: theme.colors.navText }}>
                IT Space
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: theme.colors.textMuted }}>
                Administration
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto transition-colors p-1 rounded-lg"
            style={{ color: theme.colors.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.navHover;
              e.currentTarget.style.color = theme.colors.navText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textMuted;
            }}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 group ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
                } ${
                  isActive
                    ? `${item.color} font-semibold shadow-sm`
                    : ''
                }`}
                style={{
                  color: isActive ? undefined : theme.colors.navText,
                  backgroundColor: isActive ? theme.colors.navActive : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                    isActive ? item.bgColor : ''
                  }`}
                  style={!isActive ? { backgroundColor: 'transparent' } : undefined}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-sm truncate">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: account menu */}
        <div className="p-3 space-y-2 shrink-0" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full focus:outline-none">
              <div
                title={isCollapsed ? 'Open account menu' : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                style={{ backgroundColor: theme.colors.backgroundTertiary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-4 w-4 text-white" />
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                        {currentUser.full_name || currentUser.email}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: theme.colors.textMuted }}>
                        Account menu
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0" style={{ color: theme.colors.textMuted }} />
                  </>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{currentUser.full_name || currentUser.email}</p>
                  <p className="text-xs text-muted-foreground font-normal mt-1">{currentUser.email || 'No email'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenProfile}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBackToSpaces}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Spaces Main Page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log Off
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto" style={{ background: theme.colors.backgroundSecondary }}>
        {currentView === 'home' && (
          <HomeView user={currentUser} navItems={visibleNavItems} onNavigate={handleNavigate} />
        )}

        <Suspense fallback={<ModuleLoading />}>
          {currentView === 'contacts' && <Contacts user={currentUser} />}
          {currentView === 'users' && <Users user={currentUser} organization={organization} onOrganizationUpdate={setOrganization} />}
          {currentView === 'tenants' && <Tenants user={currentUser} organization={organization} />}
          {currentView === 'security' && <Security user={currentUser} />}
          {currentView === 'audit-log' && <AuditLog user={currentUser} />}
          {currentView === 'settings' && <SettingsComponent user={currentUser} organization={organization} onUserUpdate={setCurrentUser} onOrganizationUpdate={setOrganization} />}
          {currentView === 'import-export' && <ImportScreen />}
          {currentView === 'scheduled-jobs' && <ScheduledJobs user={currentUser} />}
          {currentView === 'billing' && <SubscriptionBilling user={currentUser} />}
          {currentView === 'agreement' && <SubscriptionAgreement organization={organization} onBack={() => handleNavigate('home')} />}
          {currentView === 'portal-admin' && <PortalMessagesAdmin user={currentUser} />}
          {currentView === 'fix-users' && <AdminFixUsers />}
        </Suspense>
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
  const { theme } = useTheme();
  const cardMeta: Record<string, { description: string; gradient: string; shadow: string }> = {
    contacts:        { description: 'View and manage shared CRM contacts inside IT Space while following the current space access rules.', gradient: 'from-sky-500 to-cyan-600',       shadow: 'shadow-sky-500/20' },
    users:           { description: 'Manage user accounts, roles, space access, and team member access across the platform.',            gradient: 'from-violet-500 to-indigo-600',  shadow: 'shadow-violet-500/20' },
    tenants:         { description: 'Create and manage organizations, configure org-level settings, and control tenant access.',        gradient: 'from-indigo-500 to-blue-600',    shadow: 'shadow-indigo-500/20' },
    security:        { description: 'Configure space access, security policies, two-factor authentication, session controls, and IP whitelists.', gradient: 'from-purple-500 to-violet-600',  shadow: 'shadow-purple-500/20' },
    'audit-log':     { description: 'Review a complete audit trail of user actions, data changes, and system events.',              gradient: 'from-fuchsia-500 to-pink-600',   shadow: 'shadow-fuchsia-500/20' },
    settings:        { description: 'Global platform settings, custom fields, workflow automation, and system configuration.',       gradient: 'from-slate-500 to-gray-600',     shadow: 'shadow-slate-500/20' },
    'import-export': { description: 'Bulk import contacts, deals, and inventory. Export data in CSV and other formats.',            gradient: 'from-cyan-500 to-teal-600',      shadow: 'shadow-cyan-500/20' },
    'scheduled-jobs':{ description: 'Monitor and manage background jobs, scheduled tasks, and automated system processes.',         gradient: 'from-amber-500 to-orange-600',   shadow: 'shadow-amber-500/20' },
    billing:         { description: 'Manage subscription plans, payment methods, invoices, and billing history.',                   gradient: 'from-emerald-500 to-green-600',  shadow: 'shadow-emerald-500/20' },
    agreement:       { description: 'View and manage your subscription agreement and service terms.',                               gradient: 'from-blue-500 to-indigo-600',    shadow: 'shadow-blue-500/20' },
    'portal-admin':  { description: 'Manage customer portal messages, access requests, and client communications.',                 gradient: 'from-rose-500 to-pink-600',      shadow: 'shadow-rose-500/20' },
    'fix-users':     { description: 'Diagnostic tool to fix user profile issues, sync problems, and data inconsistencies.',         gradient: 'from-orange-500 to-red-600',     shadow: 'shadow-orange-500/20' },
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
          Welcome back, {user.full_name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="mt-2 text-lg" style={{ color: theme.colors.textMuted }}>
          Your IT administration center. Choose a module to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {navItems.filter(n => n.id !== 'home' as any).map((item) => {
          const Icon = item.icon;
          const meta = cardMeta[item.id] || { description: '', gradient: 'from-slate-500 to-gray-600', shadow: 'shadow-slate-500/20' };
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left hover:shadow-lg ${meta.shadow} transition-all duration-200`}
              style={{
                backgroundColor: theme.colors.card,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.gradient}`}
              />
              <div
                className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${meta.gradient} shadow-lg ${meta.shadow} mb-4`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold" style={{ color: theme.colors.text }}>
                {item.label}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
                {meta.description}
              </p>
              <div
                className="mt-4 flex items-center gap-1.5 text-sm font-medium transition-all group-hover:gap-3"
                style={{ color: theme.colors.primary }}
              >
                Open module
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}` }}>
          <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Modules</p>
          <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>{navItems.length}</p>
        </div>
        <div className="rounded-2xl p-6" style={{ backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}` }}>
          <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Your Role</p>
          <p className="text-3xl font-bold mt-1 capitalize" style={{ color: theme.colors.text }}>
            {user.role.replace('_', ' ')}
          </p>
        </div>
        <div className="rounded-2xl p-6" style={{ backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}` }}>
          <p className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>Environment</p>
          <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>Desktop</p>
        </div>
      </div>
    </div>
  );
}
