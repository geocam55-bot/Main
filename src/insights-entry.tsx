import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { InsightsShell } from './components/insights-app/InsightsShell';
import { SpaceAccessNotice } from './components/SpaceAccessNotice';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { createClient } from './utils/supabase/client';
import { canAccessSpace, initializePermissions } from './utils/permissions';
import type { User, UserRole } from './App';
import type { Session } from '@supabase/supabase-js';
import { DesktopOnlyAccess } from './components/DesktopOnlyAccess';
import './index.css';

function InsightsApp() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('prospaces_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | undefined>();
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

    supabase.auth.getSession().then(({ data: { session } }) => {
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role, organization_id, name, avatar_url')
        .eq('id', session.user.id)
        .single() as { data: any };

      if (profile) {
        if (profile.organization_id) {
          localStorage.setItem('currentOrgId', profile.organization_id);
        }

        await initializePermissions(profile.role);

        if (!canAccessSpace('insights', profile.role as UserRole, 'view')) {
          setUser(null);
          setAccessDeniedMessage('You are signed in, but your account does not currently have access to Insights Space. Please choose another space or contact your administrator if you need access.');
          setLoading(false);
          return;
        }

        setAccessDeniedMessage(null);

        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role as UserRole,
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

  const handleLogin = async (loggedInUser: User, token: string) => {
    await initializePermissions(loggedInUser.role);
    if (loggedInUser.organizationId || loggedInUser.organization_id) {
      const orgId = loggedInUser.organizationId || loggedInUser.organization_id;
      if (orgId) localStorage.setItem('currentOrgId', orgId);
    }
    setUser(loggedInUser);
    setAccessToken(token);
  };

  const handleLogout = () => {
    setUser(null);
    setSession(null);
    setAccessToken(undefined);
  };

  if (isMobile) {
    return <DesktopOnlyAccess spaceName="Insights Space" accentColorClass="bg-sky-600" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading Insights Space...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Toaster />
        <SpaceAccessNotice
          spaceName="Insights Space"
          accentColorClass="bg-sky-600"
          mode={accessDeniedMessage ? 'access-denied' : 'login-required'}
          message={accessDeniedMessage || undefined}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider userId={user.id}>
        <Toaster />
        <InsightsShell user={user} accessToken={accessToken} onLogout={handleLogout} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<InsightsApp />);
