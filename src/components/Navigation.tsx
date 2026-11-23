import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Gauge,
  Users,
  CheckSquare,
  Calendar,
  FileText,
  StickyNote,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  Mail,
  MessageSquare,
  Shield,
  User,
  Upload,
  Folder,
  UsersRound,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Home,
  CreditCard,
  History,
  Info,
  Clock,
  ArrowLeft,
  Globe,
  HelpCircle,
  Search,
  Command
} from 'lucide-react';
import { AttioCommandPalette } from './attio/AttioCommandPalette';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import type { User as UserType } from '../App';
import type { Organization } from '../App';
import { canView, getNormalizedRole } from '../utils/permissions';
import { Logo } from './Logo';
import { useTheme } from './ThemeProvider';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useUnreadEmails } from '../hooks/useUnreadEmails';
import { useBidNotifications } from '../hooks/useBidNotifications';
import { useTaskNotifications } from '../hooks/useTaskNotifications';
import { useAppointmentNotifications } from '../hooks/useAppointmentNotifications';
import { getCurrentSubscription } from '../utils/subscription-client';
import { TrialCountdown } from './TrialCountdown';
import { ProfileThemeSwitch } from './ProfileThemeSwitch';

interface NavigationProps {
  user: UserType;
  organization: Organization | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Navigation({
  user,
  organization,
  currentView,
  onNavigate,
  onLogout,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { suggestions } = useAISuggestions(user);
  const { unreadCount } = useUnreadEmails(user);
  const { unreadCount: unreadBidsCount, markAsRead: markBidsRead } = useBidNotifications(user);
  const { taskCount } = useTaskNotifications(user);
  const { appointmentCount } = useAppointmentNotifications(user);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Load subscription plan to gate enterprise features
  useEffect(() => {
    let cancelled = false;
    getCurrentSubscription()
      .then((sub) => {
        if (!cancelled && sub) {
          setCurrentPlanId(sub.plan_id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Attio-style universal Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const normalizedRole = getNormalizedRole(user?.role, user?.email);
  const roleStr = String(user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isSuperAdmin = normalizedRole === 'super_admin' || roleStr === 'super_admin' || roleStr === 'superadmin' || roleStr.includes('super');
  const isAdmin = isSuperAdmin || normalizedRole === 'admin' || roleStr === 'admin' || roleStr.includes('admin');
  const isManagerOrDirector = normalizedRole === 'manager' || normalizedRole === 'director';

  // Base navigation items
  const baseNavItems = [
    { id: 'main-panels', label: 'Home', icon: LayoutDashboard },
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    ...(organization?.ai_suggestions_enabled
      ? [{ id: 'ai-suggestions', label: 'AI Suggestions', icon: Sparkles, count: suggestions.length }]
      : []),
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'bids', label: 'Deals', icon: FileText, count: unreadBidsCount },
    { id: 'messages', label: 'Message Space', icon: MessageSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'knowledge-base', label: 'Help', icon: HelpCircle },
  ];

  const managerNavItems =
    (isManagerOrDirector || isAdmin || isSuperAdmin)
      ? [{ id: 'team-dashboard', label: 'Team Dashboard', icon: UsersRound }]
      : [];

  // Build Admin submenu items
  const buildAdminSubmenu = () => {
    const submenuItems = [];

    if (isSuperAdmin) {
      submenuItems.push(
        { id: 'tenants', label: 'Organizations', icon: Building2 },
        { id: 'users', label: 'Users', icon: UserCog },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'import-export', label: 'Import/Export', icon: Upload },
        { id: 'scheduled-jobs', label: 'Scheduled Jobs', icon: Clock }
      );
    } else {
      if (canView('users', user.role) || isAdmin) {
        submenuItems.push({ id: 'users', label: 'Users', icon: UserCog });
      }
      if (canView('security', user.role) || isAdmin) {
        submenuItems.push({ id: 'security', label: 'Security', icon: Shield });
      }
      if (isAdmin || isManagerOrDirector) {
        submenuItems.push({ id: 'portal-admin', label: 'Customer Portal', icon: Globe });
      }
      if ((canView('import-export', user.role) || isAdmin) && organization?.import_export_enabled !== false) {
        submenuItems.push({ id: 'import-export', label: 'Import/Export', icon: Upload });
        submenuItems.push({ id: 'scheduled-jobs', label: 'Scheduled Jobs', icon: Clock });
      }
    }

    if (isAdmin && currentPlanId === 'enterprise') {
      submenuItems.push({ id: 'audit-log', label: 'Audit Log', icon: History });
    }

    if (canView('settings', user.role) || isAdmin) {
      submenuItems.push({ id: 'settings', label: 'Settings', icon: Settings });
    }

    if (isAdmin) {
      submenuItems.push({ id: 'subscription-billing', label: 'Billing', icon: CreditCard });
    }

    if (isSuperAdmin || isAdmin) {
      submenuItems.push({ id: 'subscription-agreement', label: 'Subscription Agreement', icon: FileText });
    }

    return submenuItems;
  };

  const adminSubmenu = buildAdminSubmenu();

  const handleNavClick = (view: string) => {
    if (view === 'bids') {
      markBidsRead();
    }
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const handleBackToSpaces = () => {
    window.location.href = '/?view=space-chooser';
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const { theme } = useTheme();
  const isDark = theme.isDark;

  // Highlight Email menu if its children are active
  const isEmailActive =
    currentView === 'email' || currentView === 'tasks' || currentView === 'appointments';

  // Highlight Admin menu if its children are active
  const isAdminActive = adminSubmenu.some((sub) => currentView === sub.id);

  return (
    <>
      {/* ── Top Header and Sticky Navigation ── */}
      <header
        className={`sticky top-0 z-50 w-full shrink-0 flex flex-col md:flex-row md:items-center justify-between border-b px-4 md:px-6 py-2.5 md:py-0 md:h-16 gap-3 md:gap-4 shadow-sm ${
          isDark ? 'bg-slate-950/90 backdrop-blur-md border-slate-800 text-slate-100' : ''
        }`}
        style={
          isDark
            ? undefined
            : {
                background: theme.colors.navBackground,
                borderColor: theme.colors.border,
                color: theme.colors.navText,
              }
        }
      >
        {/* Left Side: Space Branding & Navigation back */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleBackToSpaces}
            className={`flex items-center justify-center p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : ''
            }`}
            title="Back to Spaces"
            style={isDark ? undefined : { color: theme.colors.textMuted }}
            onMouseEnter={(e) => {
              if (!isDark) {
                e.currentTarget.style.backgroundColor = theme.colors.navHover;
                e.currentTarget.style.color = theme.colors.navText;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDark) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textMuted;
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <Logo size="sm" className="h-9 w-auto shrink-0" showText={false} />
          <div className="overflow-hidden">
            <span
              className={`text-sm md:text-base font-bold tracking-tight block truncate ${isDark ? 'text-white' : ''}`}
              style={isDark ? undefined : { color: theme.colors.navText }}
            >
              Sales Space
            </span>
          </div>
        </div>

        {/* Middle Side: Horizontal Navigation Tab bar */}
        <nav className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-1 -mx-2 md:mx-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {baseNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const hasCount = item.count !== undefined && item.count > 0;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs font-semibold relative cursor-pointer ${
                  isActive
                    ? (isDark
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/40'
                        : 'text-white shadow-sm border border-transparent font-semibold')
                    : (isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent font-medium'
                        : 'font-medium')
                }`}
                style={
                  isDark
                    ? undefined
                    : {
                        color: isActive ? '#FFFFFF' : theme.colors.navText,
                        backgroundColor: isActive ? theme.colors.navActive : 'transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isDark && !isActive) e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  if (!isDark && !isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {hasCount && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-slate-950 rounded-full leading-none">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Email Dropdown (Contains Email Inbox, Tasks, Appointments) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs relative focus:outline-none cursor-pointer ${
                isEmailActive
                  ? (isDark
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/40 font-semibold'
                      : 'shadow-sm border border-transparent font-semibold text-white')
                  : (isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent font-medium'
                      : 'font-medium')
              }`}
              style={
                isDark
                  ? undefined
                  : {
                      backgroundColor: isEmailActive ? theme.colors.navActive : 'transparent',
                      color: isEmailActive ? '#FFFFFF' : theme.colors.navText,
                    }
              }
              onMouseEnter={(e) => {
                if (!isDark && !isEmailActive) e.currentTarget.style.backgroundColor = theme.colors.navHover;
              }}
              onMouseLeave={(e) => {
                if (!isDark && !isEmailActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
              {(unreadCount > 0 || taskCount > 0 || appointmentCount > 0) && (
                <span className="h-2 w-2 rounded-full bg-rose-500 absolute top-1 right-1.5" />
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <DropdownMenuLabel className="dark:text-slate-300">Email Channels</DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <DropdownMenuItem
                onClick={() => handleNavClick('email')}
                className={`cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white ${currentView === 'email' ? 'bg-accent font-semibold dark:bg-slate-800 dark:text-white' : ''}`}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Inbox
                {unreadCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleNavClick('tasks')}
                className={`cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white ${currentView === 'tasks' ? 'bg-accent font-semibold dark:bg-slate-800 dark:text-white' : ''}`}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Tasks
                {taskCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5">
                    {taskCount}
                  </span>
                )}
              </DropdownMenuItem>
              {organization?.appointments_enabled !== false && canView('appointments', user.role) && (
                <DropdownMenuItem
                  onClick={() => handleNavClick('appointments')}
                  className={`cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white ${currentView === 'appointments' ? 'bg-accent font-semibold dark:bg-slate-800 dark:text-white' : ''}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Appointments
                  {appointmentCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-purple-500 text-white rounded-full px-1.5 py-0.5">
                      {appointmentCount}
                    </span>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Documents Tab */}
          {organization?.documents_enabled !== false && canView('documents', user.role) && (
            <button
              onClick={() => handleNavClick('documents')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs cursor-pointer ${
                currentView === 'documents'
                  ? (isDark
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/40 font-semibold'
                      : 'text-white shadow-sm border border-transparent font-semibold')
                  : (isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent font-medium'
                      : 'font-medium')
              }`}
              style={
                isDark
                  ? undefined
                  : {
                      color: currentView === 'documents' ? '#FFFFFF' : theme.colors.navText,
                      backgroundColor: currentView === 'documents' ? theme.colors.navActive : 'transparent',
                    }
              }
              onMouseEnter={(e) => {
                if (!isDark && currentView !== 'documents') e.currentTarget.style.backgroundColor = theme.colors.navHover;
              }}
              onMouseLeave={(e) => {
                if (!isDark && currentView !== 'documents') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>Documents</span>
            </button>
          )}

          {/* Team Dashboard Tab */}
          {managerNavItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs cursor-pointer ${
                  isActive
                    ? (isDark
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/40 font-semibold'
                        : 'text-white shadow-sm border border-transparent font-semibold')
                    : (isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent font-medium'
                        : 'font-medium')
                }`}
                style={
                  isDark
                    ? undefined
                    : {
                        color: isActive ? '#FFFFFF' : theme.colors.navText,
                        backgroundColor: isActive ? theme.colors.navActive : 'transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isDark && !isActive) e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  if (!isDark && !isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <UsersRound className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Dropdown Menu */}
          {adminSubmenu.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 transition-all duration-150 shrink-0 text-xs focus:outline-none cursor-pointer ${
                  isAdminActive
                    ? (isDark
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/40 font-semibold'
                        : 'shadow-sm border border-transparent font-semibold text-white')
                    : (isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent font-medium'
                        : 'font-medium')
                }`}
                style={
                  isDark
                    ? undefined
                    : {
                        backgroundColor: isAdminActive ? theme.colors.navActive : 'transparent',
                        color: isAdminActive ? '#FFFFFF' : theme.colors.navText,
                      }
                }
                onMouseEnter={(e) => {
                  if (!isDark && !isAdminActive) e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  if (!isDark && !isAdminActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Admin settings</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 max-h-96 overflow-y-auto bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <DropdownMenuLabel className="dark:text-slate-300">Admin Operations</DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-slate-800" />
                {adminSubmenu.map((subItem) => {
                  const SubIcon = subItem.icon;
                  return (
                    <DropdownMenuItem
                      key={subItem.id}
                      onClick={() => handleNavClick(subItem.id)}
                      className={`cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white ${currentView === subItem.id ? 'bg-accent font-semibold dark:bg-slate-800 dark:text-white' : ''}`}
                    >
                      <SubIcon className="mr-2 h-4 w-4" />
                      <span>{subItem.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Right Side: Trialcountdown & Account Profile menu */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto pb-2 md:pb-0">
          {/* Attio-Style Quick Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-2xs transition-all cursor-pointer"
            title="Search or Quick Actions (⌘K)"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline text-[11.5px] font-medium">Search</span>
            <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Trial countdown (visible on wider screens) */}
          <div className="hidden xl:block">
            <TrialCountdown variant="badge" className="mr-1" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all text-left cursor-pointer ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200' : ''
                }`}
                style={isDark ? undefined : { backgroundColor: theme.colors.backgroundTertiary || 'rgba(0,0,0,0.02)' }}
                onMouseEnter={(e) => {
                  if (!isDark) e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  if (!isDark) e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary || 'rgba(0,0,0,0.02)';
                }}
              >
                <Avatar className="h-7 w-7 rounded-full shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                    {getInitials(user.full_name || user.email || '')}
                  </AvatarFallback>
                </Avatar>
                <span className={`text-xs font-medium max-w-[100px] truncate hidden md:inline-block ${isDark ? 'text-white' : ''}`} style={isDark ? undefined : { color: theme.colors.text }}>
                  {user.full_name?.split(' ')[0] || user.email}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 opacity-60 ${isDark ? 'text-slate-400' : ''}`} style={isDark ? undefined : { color: theme.colors.textMuted }} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-60 mt-1 bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{user.full_name || user.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">{user.email || 'No email'}</p>
                </div>
              </DropdownMenuLabel>
              {organization && (
                <>
                  <DropdownMenuSeparator className="dark:bg-slate-800" />
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Organization</p>
                        <p className="text-xs font-medium truncate text-slate-800 dark:text-slate-200">{organization.name}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </>
              )}
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <ProfileThemeSwitch variant="menu" />
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <DropdownMenuItem onClick={() => handleNavClick('settings')} className="cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white">
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBackToSpaces} className="cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Spaces Main Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavClick('about')} className="cursor-pointer dark:focus:bg-slate-800 dark:focus:text-white">
                <Info className="mr-2 h-4 w-4" />
                About
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <DropdownMenuItem onClick={onLogout} className="text-rose-500 dark:text-rose-400 dark:focus:bg-rose-950/50 dark:focus:text-rose-300 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log Off
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* ── Mobile Sidebar Slide-out menus ── */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className={`fixed inset-y-0 left-0 w-[88vw] max-w-72 flex flex-col h-full overflow-y-auto border-r ${
              isDark ? 'bg-[#0A0F1D] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={isDark ? undefined : { background: theme.colors.background || '#ffffff' }}
          >
            {/* Drawer header */}
            <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <Logo size="sm" className="h-9 w-auto shrink-0" showText={false} />
              <div className="overflow-hidden flex-1 min-w-0">
                <span className={`text-base font-bold tracking-tight block truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Sales Space
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile navigation content */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {baseNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all ${
                      isDark
                        ? (isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-900 hover:text-white')
                        : (isActive ? 'font-semibold' : 'hover:bg-slate-100')
                    }`}
                    style={
                      isDark
                        ? undefined
                        : {
                            backgroundColor: isActive ? theme.colors.navActive : 'transparent',
                            color: isActive ? '#FFFFFF' : theme.colors.text,
                          }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 opacity-75" />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="ml-2 text-[10px] bg-amber-500 text-slate-950 font-bold rounded-full px-1.5 py-0.5">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              <DropdownMenuSeparator />

              {/* Email Options in mobile menu */}
              {!isSuperAdmin && (
                <div className="space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email Modules</p>
                  <button
                    onClick={() => handleNavClick('email')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all pl-6"
                    style={{
                      backgroundColor: currentView === 'email' ? theme.colors.navActive : 'transparent',
                      color: currentView === 'email' ? '#FFFFFF' : theme.colors.text,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 opacity-70" />
                      <span>Email Inbox</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleNavClick('tasks')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all pl-6"
                    style={{
                      backgroundColor: currentView === 'tasks' ? theme.colors.navActive : 'transparent',
                      color: currentView === 'tasks' ? '#FFFFFF' : theme.colors.text,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 opacity-70" />
                      <span>Tasks</span>
                    </div>
                    {taskCount > 0 && (
                      <span className="text-[10px] bg-green-500 text-white rounded-full px-1.5 py-0.5">{taskCount}</span>
                    )}
                  </button>
                  {organization?.appointments_enabled !== false && canView('appointments', user.role) && (
                    <button
                      onClick={() => handleNavClick('appointments')}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all pl-6"
                      style={{
                        backgroundColor: currentView === 'appointments' ? theme.colors.navActive : 'transparent',
                        color: currentView === 'appointments' ? '#FFFFFF' : theme.colors.text,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 opacity-70" />
                        <span>Appointments</span>
                      </div>
                      {appointmentCount > 0 && (
                        <span className="text-[10px] bg-purple-500 text-white rounded-full px-1.5 py-0.5">{appointmentCount}</span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {managerNavItems.length > 0 && (
                <div className="space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Management</p>
                  {managerNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all"
                      style={{
                        backgroundColor: currentView === item.id ? theme.colors.navActive : 'transparent',
                        color: currentView === item.id ? '#FFFFFF' : theme.colors.text,
                      }}
                    >
                      <UsersRound className="h-5 w-5 opacity-70" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {adminSubmenu.length > 0 && (
                <div className="space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Admin Panel</p>
                  {adminSubmenu.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavClick(subItem.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all pl-6"
                        style={{
                          backgroundColor: currentView === subItem.id ? theme.colors.navActive : 'transparent',
                          color: currentView === subItem.id ? '#FFFFFF' : theme.colors.text,
                        }}
                      >
                        <SubIcon className="h-4 w-4 opacity-70" />
                        <span>{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </nav>

            {/* Mobile drawer footer account settings */}
            <div className="border-t p-4 shrink-0" style={{ borderColor: theme.colors.border }}>
              <div
                onClick={() => {
                  handleNavClick('settings');
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer"
                style={{ backgroundColor: theme.colors.backgroundTertiary }}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {getInitials(user.full_name || user.email || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                    {user.full_name || user.email}
                  </p>
                  <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                    Profile Settings
                  </p>
                </div>
              </div>
              <ProfileThemeSwitch variant="menu" className="px-0 pt-3 pb-1" />
              <div className="flex items-center justify-around mt-3">
                <button
                  onClick={handleBackToSpaces}
                  className="text-xs transition-colors"
                  style={{ color: theme.colors.textMuted }}
                >
                  Spaces Main Page
                </button>
                <span className="opacity-30">|</span>
                <button
                  onClick={onLogout}
                  className="text-xs text-red-600 hover:underline"
                >
                  Log Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attio Universal Command Palette (⌘K) */}
      <AttioCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onNavigate}
        user={user}
        onOpenAddContact={() => onNavigate('contacts')}
      />
    </>
  );
}
