import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ITShell } from './components/it-app/ITShell';
import { SpaceAccessNotice } from './components/SpaceAccessNotice';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { createClient, handleAuthError } from './utils/supabase/client';
import { canAccessSpace, initializePermissions, getNormalizedRole } from './utils/permissions';
import type { User, UserRole } from './App';
import type { Session } from '@supabase/supabase-js';
import { unregisterServiceWorker } from './utils/pwa';
import { ITLogin } from './components/it-app/ITLogin';
import { getServerHeaders, clearAppSessionToken } from './utils/server-headers';
import './index.css';

const PRIMARY_ORG_UUID = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

function normalizeITOrgId(orgId?: string | null): string {
  const trimmed = String(orgId || '').trim();
  if (!trimmed || trimmed === 'rona_atlantic' || trimmed === 'org_001' || trimmed === 'default-org' || trimmed === 'default_org') {
    return PRIMARY_ORG_UUID;
  }
  return trimmed;
}

function ITApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('prospaces_active_user') || localStorage.getItem('prospaces_cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && (parsed.email || parsed.id)) {
          const orgId = normalizeITOrgId(parsed.organizationId || parsed.organization_id || localStorage.getItem('currentOrgId'));
          const normRole = getNormalizedRole(parsed.role || 'admin', parsed.email);
          return {
            ...parsed,
            role: normRole,
            full_name: parsed.full_name || parsed.name || parsed.email?.split('@')[0] || 'User',
            organization_id: orgId,
            organizationId: orgId,
          };
        }
      }
    } catch {}
    return null;
  });
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !user);

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
    (window as any).__IT_SPACE_MOUNTED__ = true;
    unregisterServiceWorker().catch(() => {});

    const loadSafetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const hydrateFromServerSession = async () => {
      try {
        const headers = await getServerHeaders();
        const resp = await fetch('/api/auth/session-profile', {
          method: 'GET',
          headers,
          credentials: 'same-origin',
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (data?.success && data?.user) {
            const normOrgId = normalizeITOrgId(data.user.organization_id || data.user.organizationId);
            const normRole = getNormalizedRole(data.user.role, data.user.email);
            const hydratedUser: User = {
              id: data.user.id,
              email: data.user.email,
              role: normRole,
              full_name: data.user.full_name || data.user.name || data.user.email?.split('@')[0] || 'User',
              avatar_url: data.user.avatar_url,
              organization_id: normOrgId,
              organizationId: normOrgId,
            };
            if (data.session?.access_token && data.session?.refresh_token) {
              try {
                const { data: setSessData } = await supabase.auth.setSession({
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token,
                });
                if (setSessData?.session) {
                  setSession(setSessData.session);
                  setAccessToken(setSessData.session.access_token);
                }
              } catch {}
            }
            localStorage.setItem('currentOrgId', normOrgId);
            localStorage.setItem('prospaces_cached_user', JSON.stringify(hydratedUser));
            localStorage.setItem('prospaces_active_user', JSON.stringify({ ...hydratedUser, name: hydratedUser.full_name }));
            await initializePermissions(normRole);
            setUser(hydratedUser);
            return;
          }
        }
        if (resp.status === 401) {
          setUser(null);
          localStorage.removeItem('prospaces_cached_user');
          localStorage.removeItem('prospaces_active_user');
        }
      } catch {}
    };

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        handleAuthError(error);
        await hydrateFromServerSession();
        setLoading(false);
        clearTimeout(loadSafetyTimer);
        return;
      }
      setSession(session);
      setAccessToken(session?.access_token);
      if (session?.user) {
        await loadProfile(session);
        clearTimeout(loadSafetyTimer);
      } else {
        await hydrateFromServerSession();
        setLoading(false);
        clearTimeout(loadSafetyTimer);
      }
    }).catch(async (err) => {
      handleAuthError(err);
      await hydrateFromServerSession();
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
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (session: Session) => {
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    try {
      let profile: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, role, organization_id, name, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle() as { data: any };
        profile = data;
      } catch (err) {
        console.warn('Profile fetch failed, trying session-profile fallback:', err);
      }

      if (!profile) {
        try {
          const headers = await getServerHeaders();
          const resp = await fetch('/api/auth/session-profile', { headers, credentials: 'same-origin' });
          if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            if (data?.user) {
              profile = {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role,
                name: data.user.full_name || data.user.name,
                avatar_url: data.user.avatar_url,
                organization_id: data.user.organization_id,
              };
            }
          }
        } catch {}
      }

      if (!profile) {
        profile = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || user?.role || 'admin',
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || user?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || user?.avatar_url,
          organization_id: session.user.user_metadata?.organization_id || user?.organization_id || PRIMARY_ORG_UUID,
        };
      }

      if (profile) {
        const normOrgId = normalizeITOrgId(profile.organization_id);
        localStorage.setItem('currentOrgId', normOrgId);

        const normalizedRole = getNormalizedRole(profile.role, profile.email);
        await initializePermissions(normalizedRole);
        setAccessDeniedMessage(null);

        setUser({
          id: profile.id,
          email: profile.email,
          role: normalizedRole,
          full_name: profile.name,
          avatar_url: profile.avatar_url,
          organization_id: normOrgId,
          organizationId: normOrgId,
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
    const orgId = normalizeITOrgId(loggedInUser.organizationId || loggedInUser.organization_id);
    localStorage.setItem('currentOrgId', orgId);
    const normalizedUser = { ...loggedInUser, organization_id: orgId, organizationId: orgId };
    await initializePermissions(normalizedUser.role);
    setUser(normalizedUser);
    setAccessToken(token);
  };

  const handleLogout = async () => {
    setUser(null);
    setSession(null);
    setAccessToken(undefined);
    try {
      clearAppSessionToken();
      localStorage.removeItem('prospaces_cached_user');
      localStorage.removeItem('prospaces_active_user');
      localStorage.removeItem('currentOrgId');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      }).catch(() => {});
    } catch {}
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0F1D]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading IT Space...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Toaster />
        {accessDeniedMessage ? (
          <SpaceAccessNotice
            spaceName="IT Space"
            accentColorClass="bg-violet-600"
            mode="access-denied"
            message={accessDeniedMessage}
          />
        ) : (
          <ITLogin onLogin={handleLogin} />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider userId={user.id}>
        <Toaster />
        <ITShell user={user} accessToken={accessToken} onLogout={handleLogout} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<ITApp />);
