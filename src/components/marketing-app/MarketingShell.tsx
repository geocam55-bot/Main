import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  LayoutDashboard,
  Mail,
  PenTool,
  MessageSquare,
  Target,
  Zap,
  Globe,
  Users,
  LogOut,
  ChevronDown,
  ArrowLeft,
  User as UserIcon,
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
import { ProfileThemeSwitch } from '../ProfileThemeSwitch';

// ── Lazy-load marketing sub-components ──
const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) =>
  lazy(() =>
    factory().then((m) => ({ default: m[name] as React.ComponentType<any> }))
  );

const MarketingDashboard = lazyNamed(
  () => import('../marketing/MarketingDashboard'),
  'MarketingDashboard'
);
const CampaignManager = lazyNamed(
  () => import('../marketing/CampaignManager'),
  'CampaignManager'
);
const LeadScoring = lazyNamed(
  () => import('../marketing/LeadScoring'),
  'LeadScoring'
);
const JourneyBuilder = lazyNamed(
  () => import('../marketing/JourneyBuilder'),
  'JourneyBuilder'
);
const LandingPageBuilder = lazyNamed(
  () => import('../marketing/LandingPageBuilder'),
  'LandingPageBuilder'
);
const EmailDesignStudio = lazyNamed(
  () => import('../marketing/EmailDesignStudio'),
  'EmailDesignStudio'
);
const MarketingAnalytics = lazyNamed(
  () => import('../marketing/MarketingAnalytics'),
  'MarketingAnalytics'
);
const Contacts = lazyNamed(() => import('../Contacts'), 'Contacts');
const MessagingHub = lazyNamed(() => import('../MessagingHub'), 'MessagingHub');
const ReferralsTab = lazyNamed(
  () => import('../marketing/referrals/ReferralsTab'),
  'ReferralsTab'
);
const SettingsComponent = lazyNamed(
  () => import('../Settings'),
  'Settings'
);

type MarketingView =
  | 'home'
  | 'dashboard'
  | 'contacts'
  | 'messages'
  | 'campaigns'
  | 'leads'
  | 'journeys'
  | 'pages'
  | 'email-design'
  | 'referrals'
  | 'analytics'
  | 'profile';

interface NavItem {
  id: MarketingView;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  module?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-rose-600', bgColor: 'bg-rose-50', module: 'dashboard' },
  { id: 'contacts', label: 'Contacts', icon: Users, color: 'text-sky-600', bgColor: 'bg-sky-50', module: 'contacts' },
  { id: 'messages', label: 'Message Space', icon: MessageSquare, color: 'text-violet-600', bgColor: 'bg-violet-50', module: 'messages' },
  { id: 'campaigns', label: 'Campaigns', icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-50', module: 'marketing' },
  { id: 'leads', label: 'Lead Scoring', icon: Target, color: 'text-amber-600', bgColor: 'bg-amber-50', module: 'marketing' },
  { id: 'journeys', label: 'Journeys', icon: Zap, color: 'text-cyan-600', bgColor: 'bg-cyan-50', module: 'marketing' },
  { id: 'pages', label: 'Landing Pages', icon: Globe, color: 'text-emerald-600', bgColor: 'bg-emerald-50', module: 'marketing' },
  { id: 'email-design', label: 'Email Design', icon: PenTool, color: 'text-rose-600', bgColor: 'bg-rose-50', module: 'marketing' },
  { id: 'referrals', label: 'Referrals', icon: Users, color: 'text-violet-600', bgColor: 'bg-violet-50', module: 'marketing' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50', module: 'reports' },
];

function ModuleLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

interface MarketingShellProps {
  user: User;
  accessToken?: string;
  onLogout: () => void;
}

export function MarketingShell({ user, accessToken, onLogout }: MarketingShellProps) {
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<MarketingView>('home');
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => onPermissionsChanged(() => setPermissionVersion((version) => version + 1)), []);

  const hasNavAccess = useCallback((item: NavItem) => {
    if (item.module && !canView(item.module, currentUser.role)) return false;
    return true;
  }, [currentUser.role]);

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

  const handleNavigate = useCallback((view: MarketingView) => {
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

          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shrink-0 shadow-md">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-sm md:text-base font-bold tracking-tight block truncate text-slate-900 dark:text-white">
              Marketing Space
            </span>
            <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider block text-slate-500 dark:text-slate-400">
              Campaigns & Channels
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
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 border border-rose-500/40'
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
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center shrink-0 shadow-inner">
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
          <HomeView user={currentUser} onNavigate={handleNavigate} />
        )}

        <Suspense fallback={<ModuleLoading />}>
          {currentView === 'dashboard' && canView('dashboard', currentUser.role) && <MarketingDashboard user={currentUser} />}
          {currentView === 'contacts' && canView('contacts', currentUser.role) && <Contacts user={currentUser} />}
          {currentView === 'messages' && canView('messages', currentUser.role) && <MessagingHub user={currentUser} />}
          {currentView === 'campaigns' && canView('marketing', currentUser.role) && <CampaignManager user={currentUser} />}
          {currentView === 'leads' && canView('marketing', currentUser.role) && <LeadScoring user={currentUser} />}
          {currentView === 'journeys' && canView('marketing', currentUser.role) && <JourneyBuilder user={currentUser} />}
          {currentView === 'pages' && canView('marketing', currentUser.role) && <LandingPageBuilder user={currentUser} accessToken={accessToken} />}
          {currentView === 'email-design' && canView('marketing', currentUser.role) && <EmailDesignStudio user={currentUser} />}
          {currentView === 'referrals' && canView('marketing', currentUser.role) && <ReferralsTab user={currentUser} />}
          {currentView === 'analytics' && canView('reports', currentUser.role) && <MarketingAnalytics user={currentUser} />}
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
}: {
  user: User;
  onNavigate: (view: MarketingView) => void;
}) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const cards: {
    id: MarketingView;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    gradient: string;
    iconBg: string;
    module?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Overview of campaigns, leads, open rates, conversions, and revenue metrics at a glance.',
      icon: BarChart3,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      module: 'dashboard',
    },
    {
      id: 'contacts',
      label: 'Contacts',
      description: 'Open your CRM contacts directly inside Marketing Space for outreach, segmentation, and follow-up.',
      icon: Users,
      gradient: 'from-sky-500 to-cyan-600',
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
      module: 'contacts',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      description: 'Create and manage email, SMS, and social campaigns with scheduling and audience segmentation.',
      icon: Mail,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      module: 'marketing',
    },
    {
      id: 'leads',
      label: 'Lead Scoring',
      description: 'Define scoring rules by engagement, interest, and intent. Rank leads as hot, warm, or cold.',
      icon: Target,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      module: 'marketing',
    },
    {
      id: 'journeys',
      label: 'Journeys',
      description: 'Build automated customer journeys with triggers, delays, and multi-step workflows.',
      icon: Zap,
      gradient: 'from-cyan-500 to-blue-600',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
      module: 'marketing',
    },
    {
      id: 'pages',
      label: 'Landing Pages',
      description: 'WYSIWYG builder with templates, SEO settings, and conversion tracking for your campaigns.',
      icon: Globe,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      module: 'marketing',
    },
    {
      id: 'email-design',
      label: 'Email Design',
      description: 'Lifecycle Composer with live CRM preview, conditional blocks, MJML-ready output, and campaign draft tracking.',
      icon: PenTool,
      gradient: 'from-rose-500 to-orange-600',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      module: 'marketing',
    },
    {
      id: 'referrals',
      label: 'Referrals',
      description: 'Manage referral programs with tracking links, reward tiers, and automated payouts.',
      icon: Users,
      gradient: 'from-violet-500 to-purple-600',
      iconBg: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
      module: 'marketing',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Campaign performance analytics — open rates, clicks, conversions, and multi-channel insights.',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-600',
      iconBg: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
      module: 'reports',
    },
  ];

  const visibleCards = cards.filter((card) => !card.module || canView(card.module, user.role));

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Welcome back, {user.full_name?.split(' ')[0] || 'Marketer'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Your marketing command center. Hover over any module for details or click to launch.
        </p>
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
                onClick={() => onNavigate(card.id)}
                className="w-full bg-white hover:bg-slate-50/90 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 hover:border-rose-400 dark:border-slate-800 dark:hover:border-rose-500/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg dark:shadow-lg flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-80 group-hover:opacity-100`} />
                <div className={`w-14 h-14 rounded-2xl ${card.iconBg} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 dark:text-white dark:group-hover:text-rose-300 transition-colors mb-1">
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
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
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
