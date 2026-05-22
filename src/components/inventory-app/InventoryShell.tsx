import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import {
  Package,
  BarChart3,
  AlertTriangle,
  Search,
  LayoutDashboard,
  MessageSquare,
  Tag,
  LogOut,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  User as UserIcon,
  Wrench,
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
import { canAccessSpace, canView, onPermissionsChanged } from '../../utils/permissions';
import type { User } from '../../App';

// ── Lazy-load inventory sub-component ──
const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) =>
  lazy(() =>
    factory().then((m) => ({ default: m[name] as React.ComponentType<any> }))
  );

const Inventory = lazyNamed(
  () => import('../Inventory'),
  'Inventory'
);
const MessagingHub = lazyNamed(() => import('../MessagingHub'), 'MessagingHub');
const SettingsComponent = lazyNamed(
  () => import('../Settings'),
  'Settings'
);

type InventoryView = 'home' | 'catalog' | 'messages' | 'profile';

interface NavItem {
  id: InventoryView;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  module?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'catalog', label: 'Inventory Catalog', icon: Package, color: 'text-emerald-600', bgColor: 'bg-emerald-50', module: 'inventory' },
  { id: 'messages', label: 'Message Space', icon: MessageSquare, color: 'text-violet-600', bgColor: 'bg-violet-50', module: 'messages' },
];

function ModuleLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

interface InventoryShellProps {
  user: User;
  accessToken?: string;
  onLogout: () => void;
}

export function InventoryShell({ user, accessToken, onLogout }: InventoryShellProps) {
  const [currentView, setCurrentView] = useState<InventoryView>('home');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => onPermissionsChanged(() => setPermissionVersion((version) => version + 1)), []);

  const canOpenCatalog = canAccessSpace('inventory', currentUser.role, 'view') || canView('inventory', currentUser.role);

  const hasNavAccess = useCallback((item: NavItem) => {
    if (item.id === 'catalog') return canOpenCatalog;
    if (item.module && !canView(item.module, currentUser.role)) return false;
    return true;
  }, [canOpenCatalog, currentUser.role]);

  const visibleNavItems = NAV_ITEMS.filter((item) => hasNavAccess(item));

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

  const handleNavigate = useCallback((view: InventoryView) => {
    setCurrentView(view);
  }, []);

  const handleBackToSpaces = () => {
    window.location.href = '/?view=space-chooser';
  };

  const handleOpenProfile = () => {
    setCurrentView('profile');
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <span className="text-base font-bold text-slate-900 tracking-tight block truncate">
                Inventory Space
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Desktop
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
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
                    ? `${item.bgColor} ${item.color} font-semibold shadow-sm`
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div
                  className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                    isActive ? item.bgColor : 'group-hover:bg-slate-100'
                  }`}
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
        <div className="border-t border-slate-100 p-3 space-y-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full focus:outline-none">
              <div
                title={isCollapsed ? 'Open account menu' : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-slate-50 text-left transition-all hover:bg-slate-100 ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
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
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {currentUser.full_name || currentUser.email}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Account menu
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
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
      <main className="flex-1 overflow-auto">
        {currentView === 'home' && (
          <HomeView user={currentUser} onNavigate={handleNavigate} canOpenCatalog={canOpenCatalog} />
        )}

        <Suspense fallback={<ModuleLoading />}>
          {currentView === 'catalog' && canOpenCatalog && <Inventory user={currentUser} />}
          {currentView === 'messages' && canView('messages', currentUser.role) && <MessagingHub user={currentUser} />}
          {currentView === 'profile' && (
            <SettingsComponent
              user={currentUser}
              organization={null}
              onUserUpdate={setCurrentUser}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

/* ── Home / dashboard view ── */
function HomeView({
  user,
  onNavigate,
  canOpenCatalog,
}: {
  user: User;
  onNavigate: (view: InventoryView) => void;
  canOpenCatalog: boolean;
}) {
  const cards: {
    id: InventoryView;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    gradient: string;
    shadow: string;
  }[] = [
    {
      id: 'catalog',
      label: 'Inventory Catalog',
      description: 'Browse, search, add, and manage your full product catalog with SKU tracking, multi-tier pricing, stock levels, and reorder alerts.',
      icon: Package,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Welcome back, {user.full_name?.split(' ')[0] || 'Manager'}
        </h1>
        <p className="mt-2 text-slate-500 text-lg">
          Your inventory command center. Choose a module to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.filter((card) => card.id !== 'catalog' || canOpenCatalog).map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className={`group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-left hover:border-slate-300 hover:shadow-lg ${card.shadow} transition-all duration-200`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}
              />
              <div
                className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} mb-4`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                {card.label}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {card.description}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600 group-hover:gap-3 transition-all">
                Open module
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400 font-medium">Modules</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">1</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400 font-medium">Your Role</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 capitalize">
            {user.role.replace('_', ' ')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400 font-medium">Environment</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">Desktop</p>
        </div>
      </div>
    </div>
  );
}
