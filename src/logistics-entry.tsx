import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import LogisticsAppModule from './components/logistics-app/App';
import { SpaceAccessNotice } from './components/SpaceAccessNotice';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { createClient, handleAuthError } from './utils/supabase/client';
import { canAccessSpace, initializePermissions } from './utils/permissions';
import type { User, UserRole } from './App';
import type { Session } from '@supabase/supabase-js';
import './index.css';

function syncLogisticsUserSession(userObj: any) {
  if (!userObj) return;
  try {
    if (!localStorage.getItem('prospaces_active_tenant')) {
      localStorage.setItem('prospaces_active_tenant', JSON.stringify({
        id: userObj.organization_id || userObj.organizationId || 'rona_atlantic',
        name: 'RONA Atlantic Logistics',
        code: 'RONA',
        description: 'Corporate logistics tracking for RONA distributor and dealer stores in Atlantic Canada.',
        logoBadge: '🏢',
        regionalFocus: 'Atlantic Canada (Dartmouth, Tantallon, Halifax, PEI)',
        primaryColor: 'blue'
      }));
    }
    const currentActiveStr = localStorage.getItem('prospaces_active_user');
    const currentActive = currentActiveStr ? JSON.parse(currentActiveStr) : null;

    const email = userObj.email || "george.campbell@ronaatlantic.ca";
    const name = userObj.full_name || userObj.name || (email ? email.split('@')[0] : "George Campbell");
    const role = (userObj.role === 'SUPER_ADMIN' || userObj.role === 'Super_Admin' || userObj.role === 'super_admin' || email === 'superadmin@prospaces.com' || email === 'george.campbell@prospaces.com')
      ? "SUPER_ADMIN"
      : ((userObj.role === 'admin' || userObj.role === 'Admin') ? "Admin" : (userObj.role || "Admin"));
    const id = userObj.id || "USR-57008";

    if (!currentActive || currentActive.email !== email || currentActive.id !== id) {
      localStorage.setItem('prospaces_active_user', JSON.stringify({
        id,
        name,
        email,
        role,
        phone: userObj.phone || "(902) 555-0199",
        status: "Active",
        associatedStoreId: "DC-WINAMILL"
      }));
    }
  } catch (e) {
    console.error("Error syncing logistics user session:", e);
  }
}

function LogisticsEntryApp() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      sessionStorage.setItem('accessed_from_crm', 'true');
      sessionStorage.setItem('prospaces_session_active', 'true');

      const cached = localStorage.getItem('prospaces_cached_user') || localStorage.getItem('prospaces_active_user');
      const parsed = cached ? JSON.parse(cached) : null;
      if (parsed) {
        syncLogisticsUserSession(parsed);
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [, setAccessToken] = useState<string | undefined>();
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    try {
      const hasAuthToken = Object.keys(localStorage).some(key => key.includes('-auth-token'));
      if (!hasAuthToken) {
        return false;
      }
      const cachedUser = localStorage.getItem('prospaces_cached_user');
      if (cachedUser) {
        return false;
      }
    } catch {
      // Bypassed
    }
    return true;
  });

  const supabase = createClient();

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('prospaces_cached_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('prospaces_cached_user');
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadSafetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        handleAuthError(error);
        setLoading(false);
        clearTimeout(loadSafetyTimer);
        return;
      }
      setSession(session);
      setAccessToken(session?.access_token);
      if (session?.user) {
        loadProfile(session).finally(() => {
          clearTimeout(loadSafetyTimer);
        });
      } else {
        setLoading(false);
        clearTimeout(loadSafetyTimer);
      }
    }).catch((err) => {
      handleAuthError(err);
      setLoading(false);
      clearTimeout(loadSafetyTimer);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAccessDeniedMessage(null);
        setAccessToken(undefined);
        setLoading(false);
        localStorage.removeItem('prospaces_active_tenant');
        localStorage.removeItem('prospaces_active_user');
        localStorage.removeItem('prospaces_cached_user');
        localStorage.removeItem('prospaces_driver_auth');
        localStorage.removeItem('prospaces_keep_logged_in');
        sessionStorage.removeItem('prospaces_session_active');
        sessionStorage.removeItem('accessed_from_crm');
        sessionStorage.removeItem('prospaces_keep_logged_in');
        return;
      }
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        setAccessToken(session?.access_token);
        return;
      }
      setSession(session);
      setAccessToken(session?.access_token);
      if (session?.user) {
        loadProfile(session);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (session: Session) => {
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    try {
      let profile = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role, organization_id, name, avatar_url')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          throw error;
        }
        profile = data;
      } catch (err) {
        console.warn('Profile fetch failed, using fallback from session or cache:', err);
        profile = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || user?.role || 'admin',
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || user?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || user?.avatar_url,
          organization_id: session.user.user_metadata?.organization_id || user?.organization_id || 'org_001',
        };
      }

      if (profile) {
        if (profile.organization_id) {
          localStorage.setItem('currentOrgId', profile.organization_id);
        }

        await initializePermissions(profile.role);

        if (!canAccessSpace('logistics', profile.role as UserRole, 'view')) {
          setUser(null);
          setAccessDeniedMessage('You are signed in, but your account does not currently have access to Logistics Space. Please choose another space or contact your administrator if you need access.');
          setLoading(false);
          return;
        }

        setAccessDeniedMessage(null);

        syncLogisticsUserSession(profile);

        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role as UserRole,
          name: profile.name || (profile.email ? profile.email.split('@')[0] : 'User'),
          full_name: profile.name,
          avatar_url: profile.avatar_url,
          organization_id: profile.organization_id,
          organizationId: profile.organization_id,
        });
      }
    } catch {
      // Profile load failed
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setSession(null);
    setAccessToken(undefined);
    setAccessDeniedMessage(null);
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem('prospaces_active_tenant');
      localStorage.removeItem('prospaces_active_user');
      localStorage.removeItem('prospaces_cached_user');
      localStorage.removeItem('prospaces_driver_auth');
      localStorage.removeItem('prospaces_keep_logged_in');
      localStorage.removeItem('prospaces_crm_user');
      sessionStorage.clear();
    } catch {}
  };

  // Allow full mobile access for Logistics & Fleet Space

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading Logistics & Fleet Space...</p>
        </div>
      </div>
    );
  }

  if (accessDeniedMessage) {
    return (
      <ErrorBoundary>
        <Toaster />
        <SpaceAccessNotice
          spaceName="Logistics & Fleet Space"
          accentColorClass="bg-blue-600"
          mode="access-denied"
          message={accessDeniedMessage}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider userId={user?.id || 'guest'}>
        <Toaster />
        <LogisticsAppModule onLogout={handleLogout} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<LogisticsEntryApp />);
