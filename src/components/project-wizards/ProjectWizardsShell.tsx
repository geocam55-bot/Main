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
  ChevronDown,
  LayoutDashboard,
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
import { useTheme } from '../ThemeProvider';
import { ProfileThemeSwitch } from '../ProfileThemeSwitch';

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading 3D Planner...</p>
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
          <div className="text-center max-w-md mx-auto p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 shadow-xl dark:shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-amber-600 dark:text-amber-400"
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Planner Unavailable
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              The 3D planner module could not be loaded. This feature requires
              additional dependencies that may not be available.
            </p>
            <button
              onClick={() => this.props.onNavigate('home')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
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
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<PlannerView>('home');
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

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

          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-sm md:text-base font-bold tracking-tight block truncate text-slate-900 dark:text-white">
              Project Wizards
            </span>
            <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider block text-slate-500 dark:text-slate-400">
              3D Planners
            </span>
          </div>
        </div>

        {/* Horizontal Navigation Tab Bar */}
        <nav className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-1 -mx-2 md:mx-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs font-semibold cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500/40'
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
              <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all text-left cursor-pointer bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 shadow-inner">
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

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-auto text-slate-900 dark:text-slate-100" style={{ background: 'var(--gradient, var(--color-background))' }}>
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const plannerCards: {
    id: PlannerView | 'import-export';
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    gradient: string;
    iconBg: string;
    adminOnly?: boolean;
    module?: string;
    itOnly?: boolean;
  }[] = [
    {
      id: 'contacts',
      label: 'Contacts',
      description: 'Open customer records while planning projects, pricing materials, and preparing design quotes.',
      icon: Users,
      gradient: 'from-sky-500 to-cyan-600',
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
      module: 'contacts',
    },
    {
      id: 'deck-planner',
      label: 'Deck Planner',
      description: 'Configure decks with real-time 2D/3D visualisation, railing styles, and full material estimates.',
      icon: Hammer,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    },
    {
      id: 'garage-planner',
      label: 'Garage Planner',
      description: 'Design garages with foundations, framing, roofing, doors, windows, and electrical layouts.',
      icon: Warehouse,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    },
    {
      id: 'shed-planner',
      label: 'Shed Planner',
      description: 'Create shed designs with dimensions, roofing types, siding options, and door configurations.',
      icon: Home,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    },
    {
      id: 'roof-planner',
      label: 'Roof Planner',
      description: 'Plan roofs by type, pitch, material, edge details, and generate full material lists.',
      icon: Triangle,
      gradient: 'from-cyan-500 to-blue-600',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
    },
    {
      id: 'kitchen-planner',
      label: 'Kitchen Planner',
      description: '3D kitchen layout tool with appliance placement, cabinetry, and integrated pricing.',
      icon: ChefHat,
      gradient: 'from-orange-500 to-red-600',
      iconBg: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    },
    {
      id: 'interior-finishing',
      label: 'Interior Finishing',
      description: 'Wall finishes, flooring, paint, and fixtures — preview and estimate interior projects.',
      icon: Brush,
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
      adminOnly: true,
    },
    {
      id: 'import-export',
      label: 'Import / Export',
      description: 'Bulk import contacts, deals, and inventory. Export data in CSV and other formats.',
      icon: ArrowLeft,
      gradient: 'from-cyan-400 to-emerald-500',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
      module: 'import-export',
      adminOnly: false,
      itOnly: true,
    },
  ];

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
    <div className="p-8 lg:p-12 max-w-5xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user.full_name?.split(' ')[0] || 'Designer'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Choose a 3D planner or open contacts to start your next project.
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          const isTooltipActive = activeTooltip === card.id;

          return (
            <div
              key={card.id}
              className="relative group"
              onMouseEnter={() => setActiveTooltip(card.id)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <button
                type="button"
                onClick={() => onNavigate(card.id as PlannerView)}
                className="w-full bg-white hover:bg-slate-50/90 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg dark:shadow-lg flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-80 group-hover:opacity-100`} />
                <div className={`w-14 h-14 rounded-2xl ${card.iconBg} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300 transition-colors mb-1">
                  {card.label}
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Module
                </span>
              </button>

              {isTooltipActive && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md z-50 text-left pointer-events-none">
                  <div className="flex items-center space-x-1.5 mb-1 text-xs font-bold text-slate-900 dark:text-white">
                    <span>{card.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {card.description}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    <span>Click to open planner</span>
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
