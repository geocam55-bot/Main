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
  ChevronRight,
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading...</p>
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
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: theme.colors.backgroundSecondary,
        color: theme.colors.text,
      }}
    >
      {/* ── Top Sticky Navbar ── */}
      <header
        className="sticky top-0 z-50 w-full shrink-0 flex flex-col md:flex-row md:items-center justify-between border-b px-4 md:px-6 py-2.5 md:py-0 md:h-16 gap-3 md:gap-4 shadow-sm"
        style={{
          background: theme.colors.navBackground,
          borderColor: theme.colors.border,
          color: theme.colors.navText,
        }}
      >
        {/* Brand & Left Control */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleBackToSpaces}
            className="flex items-center justify-center p-2 rounded-xl transition-colors shrink-0"
            title="Back to Spaces"
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
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-sm md:text-base font-bold tracking-tight block truncate" style={{ color: theme.colors.navText }}>
              Marketing Space
            </span>
            <span className="text-[9px] md:text-[10px] font-medium uppercase tracking-wider block" style={{ color: theme.colors.textMuted }}>
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
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-150 shrink-0 text-xs font-medium ${
                  isActive ? `${item.color} ${item.bgColor} shadow-sm border border-current/10 font-semibold` : ''
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
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all text-left cursor-pointer"
                style={{ backgroundColor: theme.colors.backgroundTertiary || 'rgba(0,0,0,0.02)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary || 'rgba(0,0,0,0.02)';
                }}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center shrink-0">
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
                <span className="text-xs font-medium max-w-[100px] truncate hidden md:inline-block" style={{ color: theme.colors.text }}>
                  {currentUser.full_name?.split(' ')[0] || currentUser.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" style={{ color: theme.colors.textMuted }} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-56 mt-1">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium text-sm">{currentUser.full_name || currentUser.email}</p>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5 truncate">{currentUser.email || 'No email'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenProfile}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile Settings
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
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto" style={{ background: theme.colors.backgroundSecondary }}>
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
  const cards: {
    id: MarketingView;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    gradient: string;
    shadow: string;
    module?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Overview of campaigns, leads, open rates, conversions, and revenue metrics at a glance.',
      icon: BarChart3,
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-500/20',
      module: 'dashboard',
    },
    {
      id: 'contacts',
      label: 'Contacts',
      description: 'Open your CRM contacts directly inside Marketing Space for outreach, segmentation, and follow-up.',
      icon: Users,
      gradient: 'from-sky-500 to-cyan-600',
      shadow: 'shadow-sky-500/20',
      module: 'contacts',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      description: 'Create and manage email, SMS, and social campaigns with scheduling and audience segmentation.',
      icon: Mail,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      module: 'marketing',
    },
    {
      id: 'leads',
      label: 'Lead Scoring',
      description: 'Define scoring rules by engagement, interest, and intent. Rank leads as hot, warm, or cold.',
      icon: Target,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      module: 'marketing',
    },
    {
      id: 'journeys',
      label: 'Journeys',
      description: 'Build automated customer journeys with triggers, delays, and multi-step workflows.',
      icon: Zap,
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/20',
      module: 'marketing',
    },
    {
      id: 'pages',
      label: 'Landing Pages',
      description: 'WYSIWYG builder with templates, SEO settings, and conversion tracking for your campaigns.',
      icon: Globe,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      module: 'marketing',
    },
    {
      id: 'email-design',
      label: 'Email Design',
      description: 'Lifecycle Composer with live CRM preview, conditional blocks, MJML-ready output, and campaign draft tracking.',
      icon: PenTool,
      gradient: 'from-rose-500 to-orange-600',
      shadow: 'shadow-rose-500/20',
      module: 'marketing',
    },
    {
      id: 'referrals',
      label: 'Referrals',
      description: 'Manage referral programs with tracking links, reward tiers, and automated payouts.',
      icon: Users,
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/20',
      module: 'marketing',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Campaign performance analytics — open rates, clicks, conversions, and multi-channel insights.',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-600',
      shadow: 'shadow-orange-500/20',
      module: 'reports',
    },
  ];

  const { theme } = useTheme();
  const visibleCards = cards.filter((card) => !card.module || canView(card.module, user.role));

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.text }}>
          Welcome back, {user.full_name?.split(' ')[0] || 'Marketer'}
        </h1>
        <p className="mt-2 text-lg font-medium" style={{ color: theme.colors.textMuted }}>
          Your marketing command center. Choose a module to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group relative overflow-hidden rounded-2xl border p-6 text-left hover:shadow-lg transition-all duration-200"
              style={{
                backgroundColor: theme.colors.card || '#ffffff',
                borderColor: theme.colors.border,
                color: theme.colors.cardText,
              }}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}
              />
              <div
                className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} mb-4`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5" style={{ color: theme.colors.text }}>
                {card.label}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
                {card.description}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-rose-600 group-hover:gap-3 transition-all">
                Open module
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.colors.card || '#ffffff', borderColor: theme.colors.border }}>
          <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>Modules</p>
          <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>{visibleCards.length}</p>
        </div>
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.colors.card || '#ffffff', borderColor: theme.colors.border }}>
          <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>Your Role</p>
          <p className="text-3xl font-bold mt-1 capitalize" style={{ color: theme.colors.text }}>
            {user.role.replace('_', ' ')}
          </p>
        </div>
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.colors.card || '#ffffff', borderColor: theme.colors.border }}>
          <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>Environment</p>
          <p className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>Desktop</p>
        </div>
      </div>
    </div>
  );
}
