import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  BarChart3,
  ShieldCheck,
  FileText,
  DollarSign,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { createClient, getSupabaseUrl } from '../../utils/supabase/client';
import { publicAnonKey } from '../../utils/supabase/info';
import { ChangePasswordDialog } from '../ChangePasswordDialog';
import { canAccessSpace, initializePermissions } from '../../utils/permissions';
import type { User, UserRole } from '../../App';

type LoginDestination = 'insights' | 'crm';

interface InsightsLoginProps {
  onLogin: (user: User, token: string) => void;
}

export function InsightsLogin({ onLogin }: InsightsLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ user: User; token: string } | null>(null);
  const [destination, setDestination] = useState<LoginDestination>('insights');

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    if (pendingUser) {
      onLogin(pendingUser.user, pendingUser.token);
      setPendingUser(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setIsResetLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(`Failed to send reset email: ${err.message}`);
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      let activeSignIn = signInData;
      let activeError = signInError;

      if (activeError) {
        if (
          activeError.message.toLowerCase().includes('email not confirmed') ||
          activeError.message.includes('Invalid login credentials')
        ) {
          try {
            const confirmResp = await fetch(
              `${getSupabaseUrl()}/functions/v1/make-server-8405be07/confirm-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({ email }),
              }
            );
            if (confirmResp.ok) {
              const { data: retryData, error: retryError } =
                await supabase.auth.signInWithPassword({ email, password });
              if (!retryError && retryData?.session && retryData?.user) {
                activeSignIn = retryData;
                activeError = null;
              }
            }
          } catch {
            // non-critical
          }
        }

        if (activeError) {
          if (activeError.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Your email is not confirmed yet. Check your inbox.');
          }
          if (activeError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password.');
          }
          if (activeError.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server.');
          }
          throw new Error(activeError.message);
        }
      }

      if (!activeSignIn?.session || !activeSignIn?.user) {
        throw new Error('Invalid server response.');
      }

      // Fetch profile
      let profile: any = null;
      try {
        const serverResp = await fetch(
          `${getSupabaseUrl()}/functions/v1/make-server-8405be07/profiles/ensure`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'X-User-Token': activeSignIn.session.access_token,
            },
          }
        );
        const serverResult = await serverResp.json();
        if (serverResp.ok && serverResult.profile) {
          profile = serverResult.profile;
        }
      } catch {
        // fallback below
      }

      if (!profile) {
        const { data: byId } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeSignIn.user.id)
          .maybeSingle();
        profile = byId;
      }

      if (!profile) {
        throw new Error('Could not load your user profile.');
      }

      // Role check for Insights Space
      if (profile.organization_id) localStorage.setItem('currentOrgId', profile.organization_id);
      await initializePermissions(profile.role as UserRole);
      if (destination === 'insights' && !canAccessSpace('insights', profile.role as UserRole, 'view')) {
        throw new Error('You do not have access to Insights Space. Contact your administrator.');
      }

      // Force password change
      if (profile.needs_password_change) {
        const user: User = {
          id: activeSignIn.user.id,
          email: activeSignIn.user.email || email,
          role: profile.role as UserRole,
          full_name: profile.name || 'User',
          organization_id: profile.organization_id,
          organizationId: profile.organization_id,
        };
        setPendingUser({ user, token: activeSignIn.session.access_token });
        setShowChangePassword(true);
        setIsLoading(false);
        return;
      }

      const user: User = {
        id: activeSignIn.user.id,
        email: activeSignIn.user.email || email,
        role: profile.role as UserRole,
        full_name: profile.name || 'User',
        avatar_url: profile.avatar_url,
        organization_id: profile.organization_id,
        organizationId: profile.organization_id,
      };

      // Update last_login
      try {
        await (supabase.from('profiles') as any)
          .update({ last_login: new Date().toISOString(), status: 'active' })
          .eq('id', activeSignIn.user.id);
      } catch {
        // non-critical
      }

      // Route to destination
      if (destination === 'crm') {
        window.location.href = '/';
        return;
      }

      onLogin(user, activeSignIn.session.access_token);
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const featureIcons = [
    { icon: BarChart3, label: 'Summary', color: 'text-indigo-400' },
    { icon: FileText, label: 'Deals', color: 'text-amber-400' },
    { icon: DollarSign, label: 'Revenue', color: 'text-emerald-400' },
    { icon: TrendingUp, label: 'Trends', color: 'text-cyan-400' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Left Panel — Hero ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glowing orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between p-14 text-white w-full">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight">Insights Space</span>
                <span className="block text-xs text-indigo-300/80 font-medium tracking-wide uppercase">
                  by ProSpaces
                </span>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="space-y-10">
            <div className="space-y-4">
              <h2 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
                Measure. Analyze.
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Drive decisions with data.
                </span>
              </h2>
              <p className="text-lg text-white/60 max-w-lg leading-relaxed">
                Executive summaries, deal analytics, revenue tracking, and team performance — all in
                one insights command center.
              </p>
            </div>

            {/* Feature cards */}
            <div className="flex gap-4">
              {featureIcons.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] px-5 py-4 hover:bg-white/[0.1] transition-colors"
                >
                  <Icon className={`h-8 w-8 ${color}`} />
                  <span className="text-xs text-white/50 font-medium whitespace-nowrap">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <ShieldCheck className="h-4 w-4 text-emerald-400/70" />
              <span>Secure access</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Lock className="h-4 w-4 text-indigo-400/70" />
              <span>Encrypted</span>
            </div>
            <span className="text-xs text-white/25 ml-auto">
              &copy; {new Date().getFullYear()} ProSpaces CRM
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12 bg-white relative">
        {/* Back to landing */}
        <a
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </a>

        <div className="w-full max-w-md space-y-8">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Insights Space
            </span>
          </div>

          {/* Destination Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setDestination('insights')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                destination === 'insights'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Insights Space
            </button>
            <button
              type="button"
              onClick={() => setDestination('crm')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                destination === 'crm'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="h-4 w-4" />
              ProSpaces CRM
            </button>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="mt-2 text-slate-500">
              {destination === 'insights'
                ? 'Sign in to your Insights Space.'
                : 'Sign in to access the full ProSpaces CRM.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {successMessage && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-sm text-emerald-800">{successMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ins-email" className="text-sm font-medium text-slate-700">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="ins-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                    setSuccessMessage('');
                  }}
                  required
                  className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500/20 text-base text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ins-password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetLoading}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                >
                  {isResetLoading ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="ins-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                  className="pl-10 pr-12 h-12 rounded-xl border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500/20 text-base text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full h-12 rounded-xl text-white font-medium text-base shadow-lg transition-all duration-200 ${
                destination === 'insights'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-blue-500/40'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : destination === 'insights' ? (
                'Sign In to Insights Space'
              ) : (
                'Sign In to ProSpaces CRM'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-4 text-center space-y-3">
            <div className="flex items-center gap-4 justify-center text-xs text-slate-400">
              <a href="/?view=privacy-policy" className="hover:text-slate-600 transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-300">|</span>
              <a href="/?view=terms-of-service" className="hover:text-slate-600 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      {showChangePassword && pendingUser && (
        <ChangePasswordDialog
          open={showChangePassword}
          onClose={handlePasswordChanged}
          userId={pendingUser.user.id}
        />
      )}
    </div>
  );
}
