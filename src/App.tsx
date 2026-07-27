import React, { useState, useEffect, Suspense, useCallback, lazy } from 'react';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router';
import { Navigation } from './components/Navigation';

// ── Eagerly loaded (always needed on auth'd shell) ──
import { BackgroundJobProcessor } from './components/BackgroundJobProcessor';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { preloadEmailAccounts, resetEmailPreloader } from './utils/email-preloader';
import { ThemeProvider } from './components/ThemeProvider';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { DailyBriefingPopup } from './components/DailyBriefingPopup';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary, { ErrorBoundaryFallback } from './components/ErrorBoundary';
import { toast } from 'sonner@2.0.3';
import { createClient } from './utils/supabase/client';
import { canAccessSpace, initializePermissions } from './utils/permissions';
import { getTheme } from './utils/themes';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// ── Code-split: lazy-loaded page modules (only fetched when navigated to) ──
const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) => lazy(() => 
  factory()
    .then((m) => ({ default: m[name] as React.ComponentType<any> }))
    .catch((err) => {
      const isDynamicImportError = 
        err.message?.includes('Failed to fetch dynamically imported module') ||
        err.message?.includes('Importing a module script failed') ||
        err.message?.includes('chunk') ||
        err.name === 'TypeError';

      if (isDynamicImportError) {
        const lastReload = sessionStorage.getItem('last-chunk-reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('last-chunk-reload', String(now));
          window.location.reload();
        }
      }
      throw err;
    })
);

// Lazy load non-critical authentication or secondary dashboard entry screens
const LandingPage = lazyNamed(() => import('./components/LandingPage'), 'LandingPage');
const SpaceChooser = lazyNamed(() => import('./components/SpaceChooser'), 'SpaceChooser');
const SpaceAccessNotice = lazyNamed(() => import('./components/SpaceAccessNotice'), 'SpaceAccessNotice');
const Login = lazyNamed(() => import('./components/Login'), 'Login');
const MemberLogin = lazyNamed(() => import('./components/MemberLogin'), 'MemberLogin');
const FreeSignup = lazyNamed(() => import('./components/FreeSignup'), 'FreeSignup');
const PlanSelection = lazyNamed(() => import('./components/subscription/PlanSelection'), 'PlanSelection');

// Lazy load heavy public-facing pages and developmental tools
const OAuthCallback = lazyNamed(() => import('./components/OAuthCallback'), 'OAuthCallback');
const PrivacyPolicy = lazyNamed(() => import('./components/PrivacyPolicy'), 'PrivacyPolicy');
const TermsOfService = lazyNamed(() => import('./components/TermsOfService'), 'TermsOfService');
const CustomerPortal = lazyNamed(() => import('./components/portal/CustomerPortal'), 'CustomerPortal');
const PublicLandingPage = lazyNamed(() => import('./components/marketing/PublicLandingPage'), 'PublicLandingPage');
const TrackingRedirect = lazyNamed(() => import('./components/TrackingRedirect'), 'TrackingRedirect');
const PublicQuoteView = lazyNamed(() => import('./components/PublicQuoteView'), 'PublicQuoteView');
const PromoSlideshow = lazyNamed(() => import('./components/PromoSlideshow'), 'PromoSlideshow');
const FaviconGenerator = lazyNamed(() => import('./components/FaviconGenerator'), 'FaviconGenerator');
const LandingPageDebug = lazyNamed(() => import('./components/LandingPageDebug'), 'LandingPageDebug');
const LandingPageDiagnostic = lazyNamed(() => import('./components/marketing/LandingPageDiagnostic'), 'LandingPageDiagnostic');
const LandingPageDiagnosticTest = lazyNamed(() => import('./components/marketing/LandingPageDiagnosticTest'), 'LandingPageDiagnosticTest');

const Dashboard = lazyNamed(() => import('./components/Dashboard'), 'Dashboard');
const MainPanels = lazyNamed(() => import('./components/MainPanels'), 'MainPanels');
const Contacts = lazyNamed(() => import('./components/Contacts'), 'Contacts');
const Tasks = lazyNamed(() => import('./components/Tasks'), 'Tasks');
const Appointments = lazyNamed(() => import('./components/Appointments'), 'Appointments');
const Notes = lazyNamed(() => import('./components/Notes'), 'Notes');
const Email = lazyNamed(() => import('./components/Email'), 'Email');
const Marketing = lazyNamed(() => import('./components/Marketing'), 'Marketing');
const Inventory = lazyNamed(() => import('./components/Inventory'), 'Inventory');
const Documents = lazyNamed(() => import('./components/Documents'), 'Documents');
const Users = lazyNamed(() => import('./components/Users'), 'Users');
const Tenants = lazyNamed(() => import('./components/Tenants'), 'Tenants');
const Settings = lazyNamed(() => import('./components/Settings'), 'Settings');
const Reports = lazyNamed(() => import('./components/Reports'), 'Reports');
const Bids = lazyNamed(() => import('./components/Bids'), 'Bids');
const ManagerDashboard = lazyNamed(() => import('./components/ManagerDashboard'), 'ManagerDashboard');
const Security = lazyNamed(() => import('./components/Security'), 'Security');
const AuditLog = lazyNamed(() => import('./components/AuditLog'), 'AuditLog');
const ImportExport = lazyNamed(() => import('./components/ImportExport'), 'ImportExport');
const SubscriptionAgreement = lazyNamed(() => import('./components/SubscriptionAgreement'), 'SubscriptionAgreement');
const ScheduledJobs = lazyNamed(() => import('./components/ScheduledJobs'), 'ScheduledJobs');
const BackgroundImportManager = lazyNamed(() => import('./components/BackgroundImportManager'), 'BackgroundImportManager');
const AITaskSuggestions = lazyNamed(() => import('./components/AITaskSuggestions'), 'AITaskSuggestions');
const AdminFixUsers = lazyNamed(() => import('./components/AdminFixUsers'), 'AdminFixUsers');
const About = lazyNamed(() => import('./components/About'), 'About');
const PortalMessagesAdmin = lazyNamed(() => import('./components/MessagingHub'), 'MessagingHub');
const SubscriptionBilling = lazyNamed(() => import('./components/subscription/SubscriptionBilling'), 'SubscriptionBilling');
const KnowledgeBase = lazyNamed(() => import('./components/KnowledgeBase'), 'KnowledgeBase');
// Planners
const KitchenPlanner = lazyNamed(() => import('./components/planners/KitchenPlanner'), 'KitchenPlanner');
const DeckPlanner = lazyNamed(() => import('./components/planners/DeckPlanner'), 'DeckPlanner');
const GaragePlanner = lazyNamed(() => import('./components/planners/GaragePlanner'), 'GaragePlanner');
const ShedPlanner = lazyNamed(() => import('./components/planners/ShedPlanner'), 'ShedPlanner');
const RoofPlanner = lazyNamed(() => import('./components/planners/RoofPlanner'), 'RoofPlanner');
const InteriorFinishingPlanner = lazyNamed(() => import('./components/planners/InteriorFinishingPlanner'), 'InteriorFinishingPlanner');

export type UserRole = 'standard_user' | 'manager' | 'director' | 'admin' | 'super_admin' | 'marketing' | 'designer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  organization_id?: string;
  // Add camelCase alias for components
  organizationId?: string;
}

export interface Organization {
  id: string;
  name: string;
  ai_suggestions_enabled?: boolean;
  appointments_enabled?: boolean;
  documents_enabled?: boolean;
  marketing_enabled?: boolean;
  inventory_enabled?: boolean;
  import_export_enabled?: boolean;
  project_wizards_enabled?: boolean;
  user_mode?: 'single' | 'multi';
}

const supabase = createClient();

// Loading fallback for lazy-loaded planner modules
// (force recompile v2)
function PlannerLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-slate-500 text-sm">Loading 3D Planner...</p>
      </div>
    </div>
  );
}

// Error boundary that wraps each lazy-loaded planner so a failed dynamic
// import only affects that planner, not the entire app.
class PlannerErrorBoundary extends React.Component<
  { children: React.ReactNode; onNavigate: (view: string) => void; plannerKey: string },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
  }
  componentDidUpdate(prevProps: { plannerKey: string }) {
    // Reset error state when switching to a different planner
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
              <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">3D Planner Unavailable</h3>
            <p className="text-slate-500 text-sm mb-4">
              The 3D planner module could not be loaded. This feature requires additional dependencies that may not be available in this environment.
            </p>
            <button
              onClick={() => this.props.onNavigate('dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Check if accessing special public routes (no auth required)
function getPublicRoute(): React.ReactElement | null {
  const urlParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  // OAuth callback: detect by path OR by ?code=&state= params on any path
  // (handles hosting platforms without SPA routing, e.g. Vercel without rewrites)
  if (path === '/oauth-callback') return <OAuthCallback />;
  if (urlParams.has('code') && urlParams.has('state') && !urlParams.has('view')) {
    return <OAuthCallback />;
  }

  const isLandingPage = path.startsWith('/landing/');
  const landingPageSlug = isLandingPage ? path.split('/landing/')[1]?.split('?')[0] : null;
  if (isLandingPage && landingPageSlug) return <PublicLandingPage slug={landingPageSlug} />;

  const landingPageQuerySlug = urlParams.get('slug');
  if (urlParams.get('view') === 'landing' && landingPageQuerySlug) return <PublicLandingPage slug={landingPageQuerySlug} />;

  if (urlParams.get('view') === 'redirect') return <TrackingRedirect />;
  if (urlParams.get('view') === 'promo') return <PromoSlideshow />;
  if (urlParams.get('view') === 'public-quote') return <PublicQuoteView />;
  if (urlParams.get('view') === 'favicon-generator') return <FaviconGenerator />;
  if (urlParams.get('view') === 'landing-page-debug') return <LandingPageDebug />;
  if (urlParams.get('view') === 'landing-page-diagnostic') return <LandingPageDiagnostic />;
  if (urlParams.get('view') === 'landing-page-diagnostic-test') return <LandingPageDiagnosticTest />;
  if (urlParams.get('view') === 'member-login' || path === '/member-login') return null; // handled in main App flow
  if (urlParams.get('view') === 'privacy-policy' || path === '/privacy-policy') return <PrivacyPolicy />;
  if (urlParams.get('view') === 'terms-of-service' || path === '/terms-of-service') return <TermsOfService />;
  if (urlParams.get('view') === 'customer-portal' || path === '/portal') return <CustomerPortal />;

  return null;
}

// Wrapper to enforce desktop-only view for planners
function DesktopOnlyPlanner({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Desktop Only</h2>
        <p className="text-slate-600 max-w-md">
          The 3D Planners require a larger screen for the best experience. Please switch to a desktop or laptop computer to use this feature.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('prospaces_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [organization, setOrganization] = useState<Organization | null>(() => {
    try {
      const cached = localStorage.getItem('prospaces_cached_organization');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Synchronize authenticated user profile to local storage for instant loading next time
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('prospaces_cached_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('prospaces_cached_user');
      }
    } catch {
      // Ignore storage errors safely
    }
  }, [user]);

  // Synchronize authenticated organization settings to local storage for instant loading
  useEffect(() => {
    try {
      if (organization) {
        localStorage.setItem('prospaces_cached_organization', JSON.stringify(organization));
      } else {
        localStorage.removeItem('prospaces_cached_organization');
      }
    } catch {
      // Ignore storage errors safely
    }
  }, [organization]);

  const [currentView, setCurrentView] = useState(() => {
    // Restore persisted view on refresh (only if there's a session hint)
    const saved = sessionStorage.getItem('prospaces_current_view');
    return saved || 'landing';
  });

  // Listen for hash changes to support navigation fallback (e.g., from ImportExport)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#scheduled-jobs') {
        setCurrentView('scheduled-jobs');
      }
      // Add more hash-based navigation if needed
    };
    window.addEventListener('hashchange', handleHashChange);
    // Check on mount in case hash is already set
    handleHashChange();
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  const [loading, setLoading] = useState(() => {
    try {
      // If there is no Supabase auth token in localStorage, we can safely bypass the loading mask
      // and display the landing page immediately to avoid a flickering spinner.
      const hasAuthToken = Object.keys(localStorage).some(key => key.includes('-auth-token'));
      if (!hasAuthToken) {
        return false;
      }
      // If we have both a cached user and cached organization, we can initialize loading to false,
      // displaying the authenticated shell instantly while we validate sessions in the background.
      const cachedUser = localStorage.getItem('prospaces_cached_user');
      if (cachedUser) {
        return false;
      }
    } catch {
      // Fallback if localStorage access is blocked/disabled
    }
    return true;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('prospaces_sidebar_collapsed');
    return saved === 'true';
  });
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Landing + Enter ProSpaces should always use default light visual tokens,
  // independent of each user's selected theme.
  useEffect(() => {
    const isThemeIsolatedPublicPage = (!session || !user) && (currentView === 'landing' || currentView === 'space-chooser');
    if (!isThemeIsolatedPublicPage) return;

    const light = getTheme('light');
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.setProperty('--color-background', light.colors.background);
    root.style.setProperty('--color-background-secondary', light.colors.backgroundSecondary);
    root.style.setProperty('--color-background-tertiary', light.colors.backgroundTertiary);
    root.style.setProperty('--color-text', light.colors.text);
    root.style.setProperty('--color-text-secondary', light.colors.textSecondary);
    root.style.setProperty('--color-text-muted', light.colors.textMuted);
    root.style.setProperty('--color-primary', light.colors.primary);
    root.style.setProperty('--color-primary-hover', light.colors.primaryHover);
    root.style.setProperty('--color-primary-text', light.colors.primaryText);
    root.style.setProperty('--color-border', light.colors.border);
    root.style.setProperty('--color-card', light.colors.card);
    root.style.setProperty('--color-nav-background', light.colors.navBackground);
    root.style.setProperty('--color-nav-text', light.colors.navText);
    root.style.setProperty('--color-nav-hover', light.colors.navHover);
    root.style.setProperty('--color-nav-active', light.colors.navActive);
    root.style.setProperty('--color-topbar-background', light.colors.topBarBackground);
    root.style.setProperty('--color-topbar-text', light.colors.topBarText);
  }, [session, user, currentView]);

  // Stable callback references to prevent unnecessary child re-renders
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Persist currentView to sessionStorage whenever it changes
  useEffect(() => {
    if (currentView && currentView !== 'landing' && currentView !== 'login' && currentView !== 'member-login') {
      sessionStorage.setItem('prospaces_current_view', currentView);
    }
  }, [currentView]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('prospaces_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Check if URL indicates a specific entry view on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const requestedView = urlParams.get('view');

    if (requestedView === 'member-login' || path === '/member-login') {
      setCurrentView('member-login');
      return;
    }

    if (requestedView === 'space-chooser') {
      setCurrentView('space-chooser');
    }
  }, []);

  useEffect(() => {
    // High-level safety timeout to prevent permanent loading screens in case of network/domain failure
    const loadSafetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        handleLogout();
        setLoading(false);
        clearTimeout(loadSafetyTimer);
        return;
      }
      
      setSession(session);
      if (session?.user) {
        loadUserData(session.user).finally(() => {
          clearTimeout(loadSafetyTimer);
        });
      } else {
        setLoading(false);
        clearTimeout(loadSafetyTimer);
      }
    }).catch(() => {
      setLoading(false);
      clearTimeout(loadSafetyTimer);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Clear state immediately
        setSession(null);
        setUser(null);
        setOrganization(null);
        setCurrentView('landing');
        setLoading(false);
        sessionStorage.removeItem('prospaces_current_view');
        return;
      }

      // For token refreshes (e.g. tab regains focus), just update the session
      // reference — do NOT reload user data or reset the current view.
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return;
      }

      setSession(session);
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setUser(null);
        setOrganization(null);
        setCurrentView('landing');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Periodically check if user needs to change password (in case admin resets while user is logged in)
  useEffect(() => {
    if (!user || !session) return;

    const checkPasswordChangeRequired = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('needs_password_change')
          .eq('id', user.id)
          .single();

        if (profile?.needs_password_change === true && !showChangePassword) {
          setShowChangePassword(true);
        }
      } catch (error) {
        // Silently fail - this is just a background check
      }
    };

    // Check immediately
    checkPasswordChangeRequired();

    // Then check every 5 minutes (reduced from 30s to minimize background DB queries)
    const interval = setInterval(checkPasswordChangeRequired, 300000);

    return () => clearInterval(interval);
  }, [user?.id, !!session]);

  // Check if trial has expired and redirect to plan selection
  useEffect(() => {
    if (!user || !session || currentView === 'plan-selection') return;

    const checkTrialExpiration = async () => {
      try {
        // Dynamically import to avoid circular dependencies
        const { getCurrentSubscription } = await import('./utils/subscription-client');
        const sub = await getCurrentSubscription();

        // If user is on a trial and it has expired, redirect to plan selection
        if (sub?.status === 'trialing' && sub.trial_end) {
          const trialEndDate = new Date(sub.trial_end);
          if (trialEndDate < new Date()) {
            // Trial has expired - redirect to plan selection
            setCurrentView('plan-selection');
          }
        }
      } catch (error) {
        // Silently fail - this is just a background check
      }
    };

    // Check immediately on mount
    checkTrialExpiration();

    // Then check every minute
    const interval = setInterval(checkTrialExpiration, 60000);

    return () => clearInterval(interval);
  }, [user?.id, !!session]);

  const loadUserData = async (supabaseUser: SupabaseUser, isInitialLoad = true) => {
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    try {
      let profile = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role, organization_id, manager_id, needs_password_change, name, avatar_url')
          .eq('id', supabaseUser.id)
          .single();
        if (error || !data) throw error || new Error('No profile data');
        profile = data;
      } catch (err) {
        console.warn('Profile fetch failed in App.tsx, attempting KV store lookup for:', supabaseUser.email);
        let kvUser: any = null;
        try {
          if (supabaseUser.email) {
            const { data: emailData } = await supabase
              .from('kv_store_8405be07')
              .select('value')
              .eq('key', 'user:email:' + supabaseUser.email.toLowerCase().trim())
              .maybeSingle();
            if (emailData && emailData.value) {
              const userId = emailData.value;
              const { data: userData } = await supabase
                .from('kv_store_8405be07')
                .select('value')
                .eq('key', 'user:' + userId)
                .maybeSingle();
              if (userData && userData.value) {
                kvUser = userData.value;
                console.log('Successfully found user details in KV store for App.tsx:', kvUser);
              }
            }
          }
        } catch (kvErr) {
          console.error('Failed to resolve user from KV store in App.tsx fallback:', kvErr);
        }

        profile = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          role: kvUser?.role || supabaseUser.user_metadata?.role || user?.role || 'admin',
          name: kvUser?.name || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || user?.full_name || supabaseUser.email?.split('@')[0],
          avatar_url: kvUser?.avatar_url || supabaseUser.user_metadata?.avatar_url || user?.avatar_url,
          organization_id: kvUser?.organizationId || supabaseUser.user_metadata?.organization_id || user?.organization_id || 'org_001',
          manager_id: null,
          needs_password_change: false,
        };

        // Proactively insert fallback profile into database profiles table to restore RLS functionality
        try {
          let dbOrgId: string | null = null;
          if (profile.organization_id) {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidPattern.test(profile.organization_id)) {
              dbOrgId = profile.organization_id;
            } else {
              const { data: defaultOrg } = await supabase
                .from('organizations')
                .select('id')
                .eq('name', 'ProSpaces CRM')
                .maybeSingle();
              if (defaultOrg) {
                dbOrgId = defaultOrg.id;
                profile.organization_id = dbOrgId;
              }
            }
          }
          await supabase.from('profiles').insert({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            organization_id: dbOrgId,
            status: 'active'
          });
        } catch (dbErr) {
          console.error('Proactive profile insert failed:', dbErr);
        }
      }

      if (profile) {
        // Check if user needs to change password
        if (profile.needs_password_change === true) {
          setShowChangePassword(true);
        }

        // Persist orgId to localStorage BEFORE initializing permissions,
        // so the permissions module can use the real org ID for server lookups.
        if (profile.organization_id) {
          localStorage.setItem('currentOrgId', profile.organization_id);
        }

        // Initialize permissions and fetch organization details concurrently to drastically reduce initial load latency.
        const permissionsPromise = initializePermissions(profile.role);
        
        let orgPromise = Promise.resolve(null);
        if (profile.organization_id) {
          orgPromise = supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single()
            .then(({ data }) => data);
        }

        const [, org] = await Promise.all([permissionsPromise, orgPromise]);

        // Load user preferences to get profile picture
        // Note: user_preferences table may not exist; profile.avatar_url is the primary source
        let avatarUrl = profile.avatar_url;

        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          full_name: profile.name,
          avatar_url: avatarUrl,
          organization_id: profile.organization_id,
          // Add camelCase alias for components
          organizationId: profile.organization_id,
        });

        if (org) {
          setOrganization(org);
        }

        // Only set the default view on initial login — never on data refreshes,
        // otherwise switching tabs / token refreshes would kick the user back to home.
        if (isInitialLoad) {
          // If there's a persisted view from sessionStorage (page refresh), keep it.
          // Only set the default view on a fresh login (no saved view).
          const savedView = sessionStorage.getItem('prospaces_current_view');
          if (savedView) {
            setCurrentView(savedView);
          } else {
            setCurrentView('space-chooser');
          }
        }

        // Eagerly preload email accounts + trigger background sync so the
        // Email tab is ready instantly when the user navigates to it.
        try {
          preloadEmailAccounts();
        } catch (preloadErr) {
        }
      }
    } catch (error) {
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
    } finally {
      setUser(null);
      setOrganization(null);
      setCurrentView('member-login');
      setSession(null);
      // Clear persisted view so user doesn't land on a protected page after logout
      sessionStorage.removeItem('prospaces_current_view');
      // Reset email preloader cache
      try {
        resetEmailPreloader();
      } catch (err) {
      }
    }
  };

  // Handle public routes (no auth needed) - checked AFTER hooks
  const publicRoute = getPublicRoute();
  if (publicRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          {publicRoute}
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleMemberLogin = async (user: User, token: string) => {
    if (user.organizationId || user.organization_id) {
      const orgId = user.organizationId || user.organization_id;
      if (orgId) {
        localStorage.setItem('currentOrgId', orgId);
      }

      await initializePermissions(user.role);

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId!)
        .single();
      if (org) setOrganization(org);
    } else {
      await initializePermissions(user.role);
    }
    
    setUser(user);
    setCurrentView('space-chooser');
  };

  if (!session || !user) {
    return (
      <ErrorBoundary>
        <Toaster />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 font-sans">Loading...</p>
            </div>
          </div>
        }>
          {currentView === 'member-login' || currentView === 'space-chooser' ? (
            <MemberLogin
              onLogin={handleMemberLogin}
              onBack={() => setCurrentView('landing')}
            />
          ) : currentView === 'login' ? (
            <Login 
              onBack={() => setCurrentView('landing')} 
              onLogin={handleMemberLogin} 
            />
          ) : currentView === 'free-signup' ? (
            <FreeSignup
              onSignupSuccess={() => setCurrentView('member-login')}
              onBack={() => setCurrentView('landing')}
            />
          ) : (
            <LandingPage 
              onGetStarted={() => setCurrentView('free-signup')} 
              onMemberLogin={() => setCurrentView('member-login')} 
            />
          )}
        </Suspense>
      </ErrorBoundary>
    );
  }

  const canAccessSalesSpace = canAccessSpace('sales', user.role, 'view');

  if (!canAccessSalesSpace && currentView !== 'space-chooser') {
    return (
      <ErrorBoundary>
        <Toaster />
        <SpaceAccessNotice
          spaceName="Sales Space"
          accentColorClass="bg-blue-600"
          mode="access-denied"
          message="You are signed in, but your account does not currently have access to Sales Space. Please choose another space or contact your administrator if you need access."
        />
      </ErrorBoundary>
    );
  }

  if (currentView === 'plan-selection') {
    return (
      <ErrorBoundary>
        <Toaster />
        <PlanSelection
          onSelectPlan={async (planId) => {
            const toastId = toast.loading('Upgrading subscription to ' + planId + '...');
            try {
              const { upgradeFromTrial } = await import('./utils/subscription-client');
              const res = await upgradeFromTrial(planId);
              if (res.success) {
                toast.success('Your subscription has been successfully upgraded!', { id: toastId });
                // Refresh and clear current plan selection view
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                toast.error('Could not complete upgrade. Please try again or contact support.', { id: toastId });
              }
            } catch (err: any) {
              console.error('Subscription upgrade failed:', err);
              toast.error(err.message || 'Error occurred during upgrade', { id: toastId });
              throw err;
            }
          }}
          onContactSupport={() => {
            window.location.href = 'mailto:support@prospacescrm.ca';
          }}
          onLogout={handleLogout}
        />
      </ErrorBoundary>
    );
  }

  if (currentView === 'space-chooser') {
    return (
      <ErrorBoundary>
        <Toaster />
        <SpaceChooser
          userRole={user.role}
          onSelectSalesSpace={() => setCurrentView('main-panels')}
          onSelectDesignSpace={() => { window.location.href = '/project-wizards.html'; }}
          onSelectMarketingSpace={() => { window.location.href = '/marketing.html'; }}
          onSelectInsightsSpace={() => { window.location.href = '/insights.html'; }}
          onSelectInventorySpace={() => { window.location.href = '/inventory.html'; }}
          onSelectITSpace={() => { window.location.href = '/it.html'; }}
          onSelectMessagingSpace={() => { setCurrentView('messages'); }}
          onSelectLogisticsSpace={() => { window.location.href = '/logistics.html'; }}
          onBack={async () => {
            await handleLogout();
          }}
        />

        {/* Enforce temp-password change before users enter any space */}
        {showChangePassword && user && (
          <ChangePasswordDialog
            open={showChangePassword}
            onClose={() => {
              setShowChangePassword(false);
              if (session?.user) {
                loadUserData(session.user, false);
              }
            }}
            userId={user.id}
          />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider userId={user?.id}>
        <Toaster />
        {/* Always-mounted background job processor — auto-processes pending import jobs */}
        <BackgroundJobProcessor user={user} onNavigate={setCurrentView} />
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-background)' }}>
          <Navigation
            user={user}
            organization={organization}
            currentView={currentView}
            onNavigate={setCurrentView}
            onLogout={handleLogout}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />

          <main 
            className="flex-1 overflow-auto transition-all duration-300"
            style={{ background: 'var(--color-background-secondary)' }}
          >
            <OfflineIndicator />
            <PWAInstallPrompt />

            <div>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              {currentView === 'main-panels' && <MainPanels user={user} organization={organization} onNavigate={setCurrentView} />}
              {currentView === 'dashboard' && <Dashboard user={user} organization={organization} onNavigate={setCurrentView} />}
              {currentView === 'ai-suggestions' && <AITaskSuggestions user={user} onNavigate={setCurrentView} />}
              {currentView === 'contacts' && (
                <Contacts
                  user={user}
                />
              )}
              {currentView === 'tasks' && <Tasks user={user} />}
              {currentView === 'bids' && <Bids user={user} />}
              {currentView === 'messages' && <PortalMessagesAdmin user={user} />}
              {currentView === 'notes' && <Notes user={user} />}
              {currentView === 'appointments' && <Appointments user={user} />}
              {currentView === 'documents' && <Documents user={user} />}
              {currentView === 'email' && <Email user={user} />}
              {currentView === 'marketing' && <Marketing user={user} accessToken={session?.access_token} />}
              {currentView === 'inventory' && <Inventory user={user} onNavigate={setCurrentView} />}
              {currentView === 'reports' && <Reports user={user} organization={organization} />}
              {currentView === 'team-dashboard' && <ManagerDashboard user={user} organization={organization} />}
              {currentView === 'users' && <Users user={user} organization={organization} onOrganizationUpdate={setOrganization} />}
              {currentView === 'tenants' && <Tenants user={user} />}
              {currentView === 'settings' && <Settings user={user} organization={organization} onUserUpdate={setUser} onOrganizationUpdate={setOrganization} />}
              {currentView === 'security' && <Security user={user} />}
              {currentView === 'audit-log' && <AuditLog user={user} />}
              {currentView === 'import-export' && <ImportExport user={user} onNavigate={setCurrentView} />}
              {currentView === 'scheduled-jobs' && <ScheduledJobs user={user} onNavigate={setCurrentView} />}
              {currentView === 'background-imports' && <BackgroundImportManager user={user} onNavigate={setCurrentView} />}
              {currentView === 'kitchen-planner' && <DesktopOnlyPlanner><PlannerErrorBoundary onNavigate={setCurrentView} plannerKey="kitchen-planner"><Suspense fallback={<PlannerLoading />}><KitchenPlanner user={user} /></Suspense></PlannerErrorBoundary></DesktopOnlyPlanner>}
              {currentView === 'deck-planner' && <DesktopOnlyPlanner><PlannerErrorBoundary onNavigate={setCurrentView} plannerKey="deck-planner"><Suspense fallback={<PlannerLoading />}><DeckPlanner user={user} /></Suspense></PlannerErrorBoundary></DesktopOnlyPlanner>}
              {currentView === 'garage-planner' && <DesktopOnlyPlanner><PlannerErrorBoundary onNavigate={setCurrentView} plannerKey="garage-planner"><Suspense fallback={<PlannerLoading />}><GaragePlanner user={user} /></Suspense></PlannerErrorBoundary></DesktopOnlyPlanner>}
              {currentView === 'shed-planner' && <DesktopOnlyPlanner><PlannerErrorBoundary onNavigate={setCurrentView} plannerKey="shed-planner"><Suspense fallback={<PlannerLoading />}><ShedPlanner user={user} /></Suspense></PlannerErrorBoundary></DesktopOnlyPlanner>}
              {currentView === 'roof-planner' && <DesktopOnlyPlanner><PlannerErrorBoundary onNavigate={setCurrentView} plannerKey="roof-planner"><Suspense fallback={<PlannerLoading />}><RoofPlanner user={user} /></Suspense></PlannerErrorBoundary></DesktopOnlyPlanner>}
              {currentView === 'interior-finishing' && <DesktopOnlyPlanner><PlannerErrorBoundary onNavigate={setCurrentView} plannerKey="interior-finishing"><Suspense fallback={<PlannerLoading />}><InteriorFinishingPlanner user={user} /></Suspense></PlannerErrorBoundary></DesktopOnlyPlanner>}
              {currentView === 'portal-admin' && <PortalMessagesAdmin user={user} />}
              {currentView === 'subscription-billing' && <SubscriptionBilling user={user} />}
              {currentView === 'subscription-agreement' && <SubscriptionAgreement organization={organization} />}
              {currentView === 'about' && <About />}
              {currentView === 'admin-fix-users' && <AdminFixUsers user={user} />}
              {currentView === 'knowledge-base' && <KnowledgeBase />}
              </Suspense>
            </div>
          </main>

          {/* Password Change Dialog - Shows when user needs to change temporary password */}
          {showChangePassword && user && (
            <ChangePasswordDialog
              open={showChangePassword}
              onClose={() => {
                setShowChangePassword(false);
                // Reload user data to ensure password-change flag is cleared,
                // but do NOT reset the current view (isInitialLoad = false).
                if (session?.user) {
                  loadUserData(session.user, false);
                }
              }}
              userId={user.id}
            />
          )}

          {user && (
            <DailyBriefingPopup
              user={user}
              onNavigate={setCurrentView}
              organization={organization}
              currentView={currentView}
            />
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function RouterErrorBoundary() {
  const error = useRouteError() as any;
  console.error("Router caught an error:", error);

  // If it's a dynamic import / chunk loading error, refresh the page to get the latest bundle/manifest
  const isDynamicImportError = 
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('chunk') ||
    error?.name === 'TypeError';

  if (isDynamicImportError) {
    const lastReload = sessionStorage.getItem('last-chunk-reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('last-chunk-reload', String(now));
      window.location.reload();
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-sm font-medium animate-pulse">Updating application with latest version...</p>
        </div>
      );
    }
  }

  return <ErrorBoundaryFallback error={error} />;
}

// Router definition — Data mode pattern (parent layout + wildcard child)
const router = createBrowserRouter([
  {
    path: "/",
    Component: AppContent,
    ErrorBoundary: RouterErrorBoundary,
    children: [
      // Catch-all child so React Router never reports "no route matched"
      { path: "*", Component: () => null },
    ],
  },
]);

import { LOGO_BASE64, FAVICON_BASE64, APPLE_ICON_BASE64 } from './components/LogoBase64';
const logoAsset = LOGO_BASE64;
const faviconAsset = FAVICON_BASE64;
const appleIconAsset = APPLE_ICON_BASE64;

import { registerServiceWorker, unregisterServiceWorker } from './utils/pwa';

// Default export: RouterProvider wrapper (required by Figma Make diagnostic)
export default function App() {
  useEffect(() => {
    // Remove existing favicons
    document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']").forEach(e => e.remove());
    
    // Add new dynamic favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = faviconAsset;
    document.head.appendChild(link);
    
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = appleIconAsset;
    document.head.appendChild(appleLink);

    // Temporary safety: keep service workers unregistered so deployed clients
    // always load fresh JS while we stabilize guided tour onboarding behavior.
    unregisterServiceWorker().catch(() => {
      // Ignore failures; app works without SW.
    });
  }, []);

  return <RouterProvider router={router} />;
}