import { useState, useEffect } from 'react';
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
  TrendingUp,
  Package,
  Shield,
  User,
  Upload,
  Target,
  Folder,
  UsersRound,
  BarChart3,
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronRight,
  ChefHat,
  Hammer,
  Warehouse,
  Home,
  Triangle,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  History,
  Info,
  Brush,
} from 'lucide-react';
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
import { canView } from '../utils/permissions';
import { Logo } from './Logo';
import { useTheme } from './ThemeProvider';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useUnreadEmails } from '../hooks/useUnreadEmails';
import { useBidNotifications } from '../hooks/useBidNotifications';
import { useTaskNotifications } from '../hooks/useTaskNotifications';
import { useAppointmentNotifications } from '../hooks/useAppointmentNotifications';
import { getCurrentSubscription } from '../utils/subscription-client';
import { TrialCountdown } from './TrialCountdown';

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
  onToggleSidebar
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { suggestions } = useAISuggestions(user);
  const { unreadCount } = useUnreadEmails(user);
  const { unreadCount: unreadBidsCount, markAsRead: markBidsRead } = useBidNotifications(user);
  const { taskCount } = useTaskNotifications(user);
  const { appointmentCount } = useAppointmentNotifications(user);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'email': false,
    'admin': false,
    'project-wizards': false,
  });
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

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
    return () => { cancelled = true; };
  }, []);

  // Toggle submenu expansion
  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Base navigation items with submenu structure
  const baseNavItems = user.role !== 'super_admin' ? [
    { id: 'main-panels', label: 'Home', icon: LayoutDashboard },
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    // Only show AI Suggestions if enabled for the organization
    ...(organization?.ai_suggestions_enabled ? [{ id: 'ai-suggestions', label: 'AI Suggestions', icon: Sparkles }] : []),
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'bids', label: 'Deals', icon: FileText },
    { id: 'messages', label: 'Message Space', icon: MessageSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    // Show Appointments for all users (including Admin for calendar sync testing)
    { 
      id: 'email', 
      label: 'Email', 
      icon: Mail,
      hasSubmenu: true,
      submenu: [
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        ...(organization?.appointments_enabled !== false && canView('appointments', user.role) ? [{ id: 'appointments', label: 'Appointments', icon: Calendar }] : []),
      ]
    },
    // Only show Documents if enabled for the organization
    ...(organization?.documents_enabled !== false ? [{ id: 'documents', label: 'Documents', icon: Folder }] : []),
  ] : [];

  // Manager/Admin specific items (team dashboard - hidden from SUPER_ADMIN)
  const managerNavItems = 
    (user.role === 'manager' || user.role === 'director' || user.role === 'admin') && user.role !== 'super_admin'
      ? [{ id: 'team-dashboard', label: 'Team Dashboard', icon: UsersRound }]
      : [];

  // Build Admin submenu items based on role and permissions
  const buildAdminSubmenu = () => {
    const submenuItems = [];
    
    if (user.role === 'super_admin') {
      submenuItems.push(
        { id: 'tenants', label: 'Organizations', icon: Building2 },
        { id: 'users', label: 'Users', icon: UserCog },
        { id: 'security', label: 'Security', icon: Shield }
      );
    } else {
      // For non-super_admin, use canView to determine visibility
      if (canView('users', user.role)) {
        submenuItems.push({ id: 'users', label: 'Users', icon: UserCog });
      }
      if (canView('security', user.role)) {
        submenuItems.push({ id: 'security', label: 'Security', icon: Shield });
      }
      if (['admin', 'manager', 'director'].includes(user.role)) {
        submenuItems.push({ id: 'portal-admin', label: 'Customer Portal', icon: Globe });
      }
      if (canView('import-export', user.role) && organization?.import_export_enabled !== false) {
        submenuItems.push({ id: 'import-export', label: 'Import/Export', icon: Upload });
      }
    }
    
    // Add Audit Log for admin roles on Enterprise plan
    if (['admin', 'super_admin'].includes(user.role) && currentPlanId === 'enterprise') {
      submenuItems.push({ id: 'audit-log', label: 'Audit Log', icon: History });
    }

    // Add Settings for roles that can view it
    if (canView('settings', user.role)) {
      submenuItems.push({ id: 'settings', label: 'Settings', icon: Settings });
    }

    // Add Billing for admin roles
    if (['admin', 'super_admin'].includes(user.role)) {
      submenuItems.push({ id: 'subscription-billing', label: 'Billing', icon: CreditCard });
    }

    // Add Subscription Agreement for super_admin only
    if (user.role === 'super_admin') {
      submenuItems.push({ id: 'subscription-agreement', label: 'Subscription Agreement', icon: FileText });
    }
    
    return submenuItems;
  };

  const adminSubmenu = buildAdminSubmenu();

  // Combine and filter based on permissions
  const navItems = [
    ...baseNavItems,
    ...managerNavItems,
    ...(adminSubmenu.length > 0
      ? [{ id: 'admin', label: 'Admin', icon: Shield, hasSubmenu: true, submenu: adminSubmenu }]
      : []),
  ].filter(item => {
    // Admin parent menu: show if it has submenu items (already filtered above)
    if (item.id === 'admin') return true;
    if (item.id === 'main-panels') return true;
    // Settings standalone: always show if it got here (already filtered above)
    if (item.id === 'settings') return true;
    // Everything else: check canView
    return canView(item.id, user.role);
  });

  const safeNavItems = navItems.length > 0
    ? navItems
    : [{ id: 'main-panels', label: 'Home', icon: LayoutDashboard }];

  // Auto-expand parent menu when child is active
  useEffect(() => {
    safeNavItems.forEach((item) => {
      if (item.submenu) {
        const hasActiveChild = item.submenu.some((sub: any) => sub.id === currentView);
        if (hasActiveChild && !expandedMenus[item.id]) {
          setExpandedMenus(prev => ({
            ...prev,
            [item.id]: true
          }));
        }
      }
    });
  }, [currentView, safeNavItems, expandedMenus]);

  const handleNavClick = (view: string) => {
    if (view === 'bids') {
      markBidsRead();
    }
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const handleBackToSpaces = () => {
    handleNavClick('space-chooser');
  };

  // Render navigation item (with or without submenu)
  const renderNavItem = (item: any, isSubmenuItem = false) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    const isExpanded = expandedMenus[item.id];
    const hasActiveChild = item.submenu?.some((sub: any) => sub.id === currentView);

    if (item.hasSubmenu) {
      return (
        <div key={item.id}>
          <div className="relative" title={isSidebarCollapsed ? item.label : undefined}>
            {/* For Admin menu and Project Wizards, make entire button toggle (no navigation). For others, split between navigate and toggle */}
            {(item.id === 'admin' || item.id === 'project-wizards') ? (
              <button
                onClick={() => toggleSubmenu(item.id)}
                className={`w-full group flex items-center ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'} text-sm rounded-xl transition-all duration-150 ${
                  isSubmenuItem && !isSidebarCollapsed ? 'pl-6' : ''
                }`}
                style={{
                  backgroundColor: hasActiveChild ? theme.colors.navActive : 'transparent',
                  color: theme.colors.navText,
                }}
                onMouseEnter={(e) => {
                  if (!hasActiveChild) {
                    e.currentTarget.style.backgroundColor = theme.colors.navHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasActiveChild) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                  <Icon className={`${isSidebarCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0`} 
                    style={{ opacity: hasActiveChild ? 1 : 0.7 }}
                  />
                  {!isSidebarCollapsed && item.label}
                </div>
                {!isSidebarCollapsed && (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" style={{ opacity: 0.7 }} />
                  ) : (
                    <ChevronRight className="h-4 w-4" style={{ opacity: 0.7 }} />
                  )
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full group flex items-center ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'pr-10 px-4 py-3'} text-sm rounded-xl transition-all duration-150 ${
                    isSubmenuItem && !isSidebarCollapsed ? 'pl-6' : ''
                  }`}
                  style={{
                    backgroundColor: (isActive || hasActiveChild) ? theme.colors.navActive : 'transparent',
                    color: theme.colors.navText,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !hasActiveChild) {
                      e.currentTarget.style.backgroundColor = theme.colors.navHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !hasActiveChild) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon className={`${isSidebarCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0`} 
                    style={{ opacity: (isActive || hasActiveChild) ? 1 : 0.7 }}
                  />
                  {!isSidebarCollapsed && item.label}
                </button>
                {!isSidebarCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubmenu(item.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 transition-colors hover:bg-background/10"
                    aria-label={isExpanded ? 'Collapse submenu' : 'Expand submenu'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" style={{ opacity: 0.7 }} />
                    ) : (
                      <ChevronRight className="h-4 w-4" style={{ opacity: 0.7 }} />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
          {(isExpanded || (isSidebarCollapsed && hasActiveChild)) && item.submenu && (
            <div className="mt-1 space-y-1">
              {item.submenu.map((subItem: any) => renderNavItem(subItem, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full group flex items-center ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} text-sm rounded-xl transition-all duration-150 ${
          isSubmenuItem && !isSidebarCollapsed ? 'pl-11' : ''
        }`}
        style={{
          backgroundColor: isActive ? theme.colors.navActive : 'transparent',
          color: theme.colors.navText,
        }}
        title={isSidebarCollapsed ? item.label : undefined}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = theme.colors.navHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Icon className={`${isSidebarCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0`} 
          style={{ opacity: isActive ? 1 : 0.7 }}
        />
        {!isSidebarCollapsed && item.label}
      </button>
    );
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const { theme } = useTheme();

  // Get page title based on current view
  const getPageTitle = (view: string) => {
    // Check main items
    const item = safeNavItems.find(item => item.id === view);
    if (item) return item.label;
    
    // Check submenu items
    for (const navItem of safeNavItems) {
      if (navItem.submenu) {
        const subItem = navItem.submenu.find((sub: any) => sub.id === view);
        if (subItem) return subItem.label;
      }
    }
    
    return 'Dashboard';
  };

  // Get page icon based on current view
  const getPageIcon = (view: string) => {
    // Check main items
    const item = safeNavItems.find(item => item.id === view);
    if (item) return item.icon;
    
    // Check submenu items
    for (const navItem of safeNavItems) {
      if (navItem.submenu) {
        const subItem = navItem.submenu.find((sub: any) => sub.id === view);
        if (subItem) return subItem.icon;
      }
    }
    
    return LayoutDashboard;
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 border-b border-slate-200 bg-white z-50">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size="sm" className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <span className="text-base font-bold text-slate-900 tracking-tight block truncate">
                Sales Space
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                CRM Workspace
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {/* AI Suggestions Icon */}
            {suggestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                onClick={() => handleNavClick('ai-suggestions')}
                title={`${suggestions.length} AI Suggestions`}
              >
                <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {suggestions.length > 9 ? '9+' : suggestions.length}
                </span>
              </Button>
            )}

            {/* Bid Notifications Icon */}
            {unreadBidsCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden rounded-full p-1.5 transition-colors hover:bg-slate-100 sm:inline-flex"
                onClick={() => handleNavClick('bids')}
                title={`${unreadBidsCount} Deal Updates`}
              >
                <FileText className="h-4 w-4 text-orange-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadBidsCount > 9 ? '9+' : unreadBidsCount}
                </span>
              </Button>
            )}

            {/* Task Notifications Icon */}
            {taskCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden rounded-full p-1.5 transition-colors hover:bg-slate-100 sm:inline-flex"
                onClick={() => handleNavClick('tasks')}
                title={`${taskCount} Pending Tasks`}
              >
                <CheckSquare className="h-4 w-4 text-green-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {taskCount > 9 ? '9+' : taskCount}
                </span>
              </Button>
            )}

            {/* Appointment Notifications Icon */}
            {appointmentCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden rounded-full p-1.5 transition-colors hover:bg-slate-100 sm:inline-flex"
                onClick={() => handleNavClick('appointments')}
                title={`${appointmentCount} Upcoming Appointments`}
              >
                <Calendar className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {appointmentCount > 9 ? '9+' : appointmentCount}
                </span>
              </Button>
            )}

            {/* Email Icon */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                onClick={() => handleNavClick('email')}
                title={`${unreadCount} Unread Emails`}
              >
                <Mail className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getInitials(user.full_name || user.email || '')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                    <p className="text-xs text-muted-foreground font-normal mt-1">{user.email || 'No email'}</p>
                  </div>
                </DropdownMenuLabel>
                {organization && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-normal">Organization</p>
                          <p className="text-sm font-medium">{organization.name}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBackToSpaces}>
                  <Home className="mr-2 h-4 w-4" />
                  Spaces Main Page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavClick('settings')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavClick('about')}>
                  <Info className="mr-2 h-4 w-4" />
                  About
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Off
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-1.5 hover:bg-slate-100 text-slate-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
        style={{
          background: theme.colors.navBackground,
          borderRight: `1px solid ${theme.colors.border}`,
          color: theme.colors.navText,
        }}
      >
        <div
          className="flex items-center gap-3 px-5 h-16 shrink-0"
          style={{ borderBottom: `1px solid ${theme.colors.border}` }}
        >
          <Logo size="sm" className="h-9 w-9 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="overflow-hidden">
              <span className="text-base font-bold tracking-tight block truncate" style={{ color: theme.colors.navText }}>
                Sales Space
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: theme.colors.textMuted }}>
                CRM Workspace
              </span>
            </div>
          )}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
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
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {safeNavItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="p-3 space-y-2 shrink-0" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
          {/* Trial Countdown Badge */}
          {!isSidebarCollapsed && (
            <div className="mb-2">
              <TrialCountdown variant="badge" className="w-full justify-center" />
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full focus:outline-none">
              <div
                title={isSidebarCollapsed ? 'Open account menu' : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isSidebarCollapsed ? 'justify-center' : ''
                }`}
                style={{ backgroundColor: theme.colors.backgroundTertiary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.navHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getInitials(user.full_name || user.email || '')}
                  </AvatarFallback>
                </Avatar>
                {!isSidebarCollapsed && (
                  <div className="overflow-hidden flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                      {user.full_name || user.email || 'User'}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: theme.colors.textMuted }}>
                      Account menu
                    </p>
                  </div>
                )}
                {!isSidebarCollapsed && <ChevronDown className="h-4 w-4 shrink-0" style={{ color: theme.colors.textMuted }} />}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                  <p className="text-xs text-muted-foreground font-normal mt-1">{user.email || 'No email'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavClick('settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBackToSpaces}>
                <Home className="mr-2 h-4 w-4" />
                Spaces Main Page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log Off
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href="?view=privacy-policy"
                className="text-xs transition-colors"
                style={{ color: theme.colors.navText, opacity: 0.5 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
              >
                Privacy
              </a>
              <span className="text-xs" style={{ color: theme.colors.navText, opacity: 0.3 }}>·</span>
              <a
                href="?view=terms-of-service"
                className="text-xs transition-colors"
                style={{ color: theme.colors.navText, opacity: 0.5 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
              >
                Terms
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 pt-1">
              <a
                href="?view=privacy-policy"
                className="text-[10px] transition-colors"
                style={{ color: theme.colors.navText, opacity: 0.5 }}
                title="Privacy Policy"
              >
                Privacy
              </a>
              <a
                href="?view=terms-of-service"
                className="text-[10px] transition-colors"
                style={{ color: theme.colors.navText, opacity: 0.5 }}
                title="Terms of Service"
              >
                Terms
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900 bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="fixed inset-y-0 left-0 w-[88vw] max-w-72 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col overflow-y-auto pb-4">
              {/* Drawer header */}
              <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
                <Logo size="sm" className="h-9 w-9 shrink-0" />
                <div className="overflow-hidden flex-1 min-w-0">
                  <span className="text-base font-bold text-slate-900 tracking-tight block truncate">Sales Space</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">CRM Workspace</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="ml-auto text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="mt-3 flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                  const NavIcon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { handleNavClick(item.id); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <NavIcon className="h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Mobile footer account block */}
              <div className="border-t border-slate-100 p-3 mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full focus:outline-none">
                    <div className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-slate-50 text-left transition-all hover:bg-slate-100">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {getInitials(user.full_name || user.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{user.full_name || user.email || 'User'}</p>
                        <p className="text-[11px] text-slate-400 truncate">Account menu</p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-56">
                    <DropdownMenuLabel>
                      <div>
                        <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                        <p className="text-xs text-muted-foreground font-normal mt-1">{user.email || 'No email'}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handleNavClick('settings'); setIsMobileMenuOpen(false); }}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handleBackToSpaces(); setIsMobileMenuOpen(false); }}>
                      <Home className="mr-2 h-4 w-4" />
                      Spaces Main Page
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Off
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a href="?view=privacy-policy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacy</a>
                  <span className="text-xs text-slate-300">·</span>
                  <a href="?view=terms-of-service" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Terms</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}