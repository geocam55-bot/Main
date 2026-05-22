import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  Wand2,
  Hammer,
  Warehouse,
  Home,
  Triangle,
  ChefHat,
  Brush,
  MessageSquare,
  LogOut,
  Settings,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  User as UserIcon,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ChangePasswordDialog } from '../ChangePasswordDialog';
import { ProjectWizardsModuleHelp } from './ProjectWizardsModuleHelp';
import { ImportScreen } from '../../modules/import-export/components/ImportScreen';
import { createClient } from '../../utils/supabase/client';
import { canView, onPermissionsChanged } from '../../utils/permissions';
import type { User } from '../../App';

// ── Lazy-load planners (same chunks as main CRM) ──
const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) =>
  lazy(() =>
    factory().then((m) => ({ default: m[name] as React.ComponentType<any> }))
  );

const KitchenPlanner = lazyNamed(
  () => import('../planners/KitchenPlanner'),
  'KitchenPlanner'
);
const DeckPlanner = lazyNamed(
  () => import('../planners/DeckPlanner'),
  'DeckPlanner'
);
const GaragePlanner = lazyNamed(
  () => import('../planners/GaragePlanner'),
  'GaragePlanner'
);
const ShedPlanner = lazyNamed(
  () => import('../planners/ShedPlanner'),
  'ShedPlanner'
);
const RoofPlanner = lazyNamed(
  () => import('../planners/RoofPlanner'),
  'RoofPlanner'
);
const InteriorFinishingPlanner = lazyNamed(
  () => import('../planners/InteriorFinishingPlanner'),
  'InteriorFinishingPlanner'
);
const Contacts = lazyNamed(() => import('../Contacts'), 'Contacts');
const MessagingHub = lazyNamed(() => import('../MessagingHub'), 'MessagingHub');
const SettingsComponent = lazyNamed(() => import('../Settings'), 'Settings');

type PlannerView =
  | 'home'
  | 'contacts'
  | 'messages'
  | 'kitchen-planner'
  | 'deck-planner'
  | 'garage-planner'
  | 'shed-planner'
  | 'roof-planner'
  | 'interior-finishing'
  | 'profile';

interface NavItem {
  id: PlannerView;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  adminOnly?: boolean;
  module?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'contacts', label: 'Contacts', icon: Users, color: 'text-sky-600', bgColor: 'bg-sky-50', module: 'contacts' },
  { id: 'messages', label: 'Message Space', icon: MessageSquare, color: 'text-violet-600', bgColor: 'bg-violet-50', module: 'messages' },
  { id: 'deck-planner', label: 'Deck Planner', icon: Hammer, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'garage-planner', label: 'Garage Planner', icon: Warehouse, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'shed-planner', label: 'Shed Planner', icon: Home, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'roof-planner', label: 'Roof Planner', icon: Triangle, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  { id: 'kitchen-planner', label: 'Kitchen Planner', icon: ChefHat, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { id: 'interior-finishing', label: 'Interior Finishing', icon: Brush, color: 'text-purple-600', bgColor: 'bg-purple-50', adminOnly: true },
];

function PlannerLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading 3D Planner...</p>
      </div>
    </div>
  );
}

interface EBProps {
  children: React.ReactNode;
  onNavigate: (view: PlannerView) => void;
  plannerKey: string;
}
interface EBState {
  hasError: boolean;
}

// Error boundary that isolates planner crashes
class PlannerErrorBoundary extends React.Component<EBProps, EBState> {
  declare props: EBProps;
  declare state: EBState;
  declare setState: React.Component<EBProps, EBState>['setState'];
  
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }
  componentDidCatch() {}
  componentDidUpdate(prevProps: EBProps) {
    if (prevProps.plannerKey !== this.props.plannerKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Planner Unavailable
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              The 3D planner module could not be loaded. This feature requires
              additional dependencies that may not be available.
            </p>
            <button
              onClick={() => this.props.onNavigate('home')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProjectWizardsShellProps {
  user: User;
  onLogout: () => void;
}

export function ProjectWizardsShell({ user, onLogout }: ProjectWizardsShellProps) {
  const [currentView, setCurrentView] = useState<PlannerView>('home');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => onPermissionsChanged(() => setPermissionVersion((version) => version + 1)), []);

  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  const visibleNav = NAV_ITEMS.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.module || canView(item.module, currentUser.role))
  );

  const handleNavigate = useCallback((view: PlannerView) => {
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
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <span className="text-base font-bold text-slate-900 tracking-tight block truncate">
                Project Wizards
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
          {visibleNav.map((item) => {
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
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
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

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-auto">
        {currentView === 'home' && (
          <HomeView user={currentUser} onNavigate={handleNavigate} isAdmin={isAdmin} />
        )}

        <Suspense fallback={<PlannerLoading />}>
          {currentView === 'contacts' && <Contacts user={currentUser} />}
          {currentView === 'messages' && <MessagingHub user={currentUser} />}
          {currentView === 'profile' && (
            <SettingsComponent
              user={currentUser}
              organization={null}
              onUserUpdate={setCurrentUser}
            />
          )}
          {currentView === 'kitchen-planner' && (
            <PlannerErrorBoundary onNavigate={handleNavigate} plannerKey="kitchen-planner">
              <KitchenPlanner user={currentUser} />
            </PlannerErrorBoundary>
          )}
          {currentView === 'deck-planner' && (
            <PlannerErrorBoundary onNavigate={handleNavigate} plannerKey="deck-planner">
              <DeckPlanner user={currentUser} />
            </PlannerErrorBoundary>
          )}
          {currentView === 'garage-planner' && (
            <PlannerErrorBoundary onNavigate={handleNavigate} plannerKey="garage-planner">
              <GaragePlanner user={currentUser} />
            </PlannerErrorBoundary>
          )}
          {currentView === 'shed-planner' && (
            <PlannerErrorBoundary onNavigate={handleNavigate} plannerKey="shed-planner">
              <ShedPlanner user={currentUser} />
            </PlannerErrorBoundary>
          )}
          {currentView === 'roof-planner' && (
            <PlannerErrorBoundary onNavigate={handleNavigate} plannerKey="roof-planner">
              <RoofPlanner user={currentUser} />
            </PlannerErrorBoundary>
          )}
          {currentView === 'interior-finishing' && (
            <PlannerErrorBoundary onNavigate={handleNavigate} plannerKey="interior-finishing">
              <InteriorFinishingPlanner user={currentUser} />
            </PlannerErrorBoundary>
          )}
          {currentView === 'import-export' && <ImportScreen />}
        </Suspense>
      </main>
    </div>
  );
}

/* ── Home / dashboard view ── */
function HomeView({
  user,
  onNavigate,
  isAdmin,
}: {
  user: User;
  onNavigate: (view: PlannerView) => void;
  isAdmin: boolean;
}) {
  const plannerCards: {
    id: PlannerView | 'import-export';
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    gradient: string;
    shadow: string;
    adminOnly?: boolean;
    module?: string;
    itOnly?: boolean;
  }[] = [
    // ...existing cards...
    {
      id: 'contacts',
      label: 'Contacts',
      description: 'Open customer records while planning projects, pricing materials, and preparing design quotes.',
      icon: Users,
      gradient: 'from-sky-500 to-cyan-600',
      shadow: 'shadow-sky-500/20',
      module: 'contacts',
    },
    {
      id: 'deck-planner',
      label: 'Deck Planner',
      description: 'Configure decks with real-time 2D/3D visualisation, railing styles, and full material estimates.',
      icon: Hammer,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
    },
    {
      id: 'garage-planner',
      label: 'Garage Planner',
      description: 'Design garages with foundations, framing, roofing, doors, windows, and electrical layouts.',
      icon: Warehouse,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
    },
    {
      id: 'shed-planner',
      label: 'Shed Planner',
      description: 'Create shed designs with dimensions, roofing types, siding options, and door configurations.',
      icon: Home,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      id: 'roof-planner',
      label: 'Roof Planner',
      description: 'Plan roofs by type, pitch, material, edge details, and generate full material lists.',
      icon: Triangle,
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/20',
    },
    {
      id: 'kitchen-planner',
      label: 'Kitchen Planner',
      description: '3D kitchen layout tool with appliance placement, cabinetry, and integrated pricing.',
      icon: ChefHat,
      gradient: 'from-orange-500 to-red-600',
      shadow: 'shadow-orange-500/20',
    },
    {
      id: 'interior-finishing',
      label: 'Interior Finishing',
      description: 'Wall finishes, flooring, paint, and fixtures — preview and estimate interior projects.',
      icon: Brush,
      gradient: 'from-purple-500 to-pink-600',
      shadow: 'shadow-purple-500/20',
      adminOnly: true,
    },
    // Import/Export card (admin or IT Space)
    {
      id: 'import-export',
      label: 'Import / Export',
      description: 'Bulk import contacts, deals, and inventory. Export data in CSV and other formats.',
      icon: ArrowLeft, // Use a relevant icon
      gradient: 'from-cyan-400 to-emerald-500',
      shadow: 'shadow-cyan-400/20',
      module: 'import-export',
      adminOnly: false,
      itOnly: true,
    },
  ];

  // Show Import/Export if admin or in IT Space
  const isIT = user.role === 'super_admin' || user.role === 'admin' || (user.space && user.space === 'it');
  const visibleCards = plannerCards.filter(
    (card) =>
      (!card.adminOnly || isAdmin) &&
      (!card.module || canView(card.module, user.role)) &&
      (!card.itOnly || isIT)
  );

  const visiblePlannerCount = visibleCards.filter((card) =>
    [
      'deck-planner',
      'garage-planner',
      'shed-planner',
      'roof-planner',
      'kitchen-planner',
      'interior-finishing',
    ].includes(card.id)
  ).length;

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user.full_name?.split(' ')[0] || 'Designer'}
          </h1>
          <p className="mt-2 text-slate-500 text-lg">
            Choose a planner or open contacts to start your next project.
          </p>
        </div>
        <ProjectWizardsModuleHelp
          userId={user.id}
          plannerCount={visiblePlannerCount}
          hasFinishingPlanner={isAdmin}
          onOpenContacts={() => onNavigate('contacts')}
          onOpenMessages={() => onNavigate('messages')}
          onOpenDeckPlanner={() => onNavigate('deck-planner')}
          onOpenGaragePlanner={() => onNavigate('garage-planner')}
          onOpenShedPlanner={() => onNavigate('shed-planner')}
          onOpenRoofPlanner={() => onNavigate('roof-planner')}
          onOpenKitchenPlanner={() => onNavigate('kitchen-planner')}
          onOpenFinishingPlanner={() => onNavigate('interior-finishing')}
          onOpenSettings={() => onNavigate('profile')}
        />
      </div>

      {/* Planner grid — wide cards for desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className={`group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-left hover:border-slate-300 hover:shadow-lg ${card.shadow} transition-all duration-200`}
            >
              {/* Gradient accent bar */}
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

              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-3 transition-all">
                Open planner
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick stats / recent designs placeholder */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400 font-medium">Available Tools</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{visibleCards.length}</p>
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
