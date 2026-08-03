import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from './Logo';
import { createClient, getSupabaseUrl } from '../utils/supabase/client';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { User, UserRole } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface MemberLoginProps {
  onLogin: (user: User, token: string) => void;
  onBack?: () => void;
}

export function MemberLogin({ onLogin, onBack }: MemberLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ user: User; token: string } | null>(null);

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
      setShowForgotPassword(false);
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

      // If sign-in failed, try auto-confirm email fix for admin-created users
      if (activeError) {
        if (activeError.message.toLowerCase().includes('email not confirmed') ||
            activeError.message.includes('Invalid login credentials')) {
          try {
            const confirmResp = await fetch(
              `${getSupabaseUrl()}/functions/v1/make-server-8405be07/confirm-email`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
                body: JSON.stringify({ email }),
              }
            );
            const confirmResult = await confirmResp.json();
            
            if (confirmResp.ok) {
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
              if (!retryError && retryData?.session && retryData?.user) {
                activeSignIn = retryData;
                activeError = null;
              }
            }
          } catch (confirmErr) {
            // Auto-confirm attempt failed – non-critical
          }
        }

        if (activeError) {
          if (activeError.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Your email is not confirmed yet. Check your inbox for a confirmation link.');
          }
          if (activeError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          
          if (activeError.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please check your internet connection or verify that the Supabase project is active.');
          }

          throw new Error(activeError.message);
        }
      }

      if (!activeSignIn?.session || !activeSignIn?.user) {
        throw new Error('Invalid server response.');
      }

      // Always call /profiles/ensure first — it finds or creates the profile,
      // auto-fixes org mismatches, ID mismatches, and missing needs_password_change
      let profile: any = null;

      try {
        const serverResp = await fetch(
          `${getSupabaseUrl()}/functions/v1/make-server-8405be07/profiles/ensure`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-Token': activeSignIn.session.access_token,
            },
          }
        );
        const serverResult = await serverResp.json();

        if (serverResp.ok && serverResult.profile) {
          profile = serverResult.profile;
        } else if (serverResp.ok && serverResult.profileId) {
          const { data: refetched } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', activeSignIn.user.id)
            .maybeSingle();
          if (refetched) profile = refetched;
        } else {
          // Server /profiles/ensure did not return profile – will fallback
        }
      } catch (ensureErr) {
        // Server-side profile ensure failed – falling back to client-side fetch
      }

      // Fallback: fetch profile client-side by ID, then by email
      if (!profile) {
        const { data: byId } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeSignIn.user.id)
          .maybeSingle();
        if (byId) {
          profile = byId;
        } else if (activeSignIn.user.email) {
          const { data: byEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', activeSignIn.user.email.toLowerCase())
            .maybeSingle();
          if (byEmail) {
            // Attempt server-side ID fix
            try {
              const fixResp = await fetch(
                `${getSupabaseUrl()}/functions/v1/make-server-8405be07/fix-profile-mismatch`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
                  body: JSON.stringify({
                    email: activeSignIn.user.email,
                    currentUserId: activeSignIn.user.id,
                    oldUserId: byEmail.id,
                  }),
                }
              );
              const fixResult = await fixResp.json();
              profile = (fixResp.ok && fixResult.success && fixResult.profile) ? fixResult.profile : { ...byEmail, id: activeSignIn.user.id };
            } catch {
              profile = { ...byEmail, id: activeSignIn.user.id };
            }
          }
        }
      }

      if (!profile) {
        throw new Error('Could not load or create your user profile. Please contact your administrator.');
      }

      // Check if user needs to change password
      if (profile.needs_password_change) {
        const user: User = {
          id: activeSignIn.user.id,
          email: activeSignIn.user.email || email,
          role: (profile.role as UserRole) || 'standard_user',
          full_name: profile.name || 'User',
          organization_id: profile.organization_id,
          organizationId: profile.organization_id,
        };
        setPendingUser({ user, token: activeSignIn.session.access_token });
        setShowChangePassword(true);
        setIsLoading(false);
        return;
      }

      // Load avatar — use profile.avatar_url directly (user_preferences table may not exist)
      let avatarUrl = profile.avatar_url;

      const user: User = {
        id: activeSignIn.user.id,
        email: activeSignIn.user.email || email,
        role: (profile.role as UserRole) || 'standard_user',
        full_name: profile.name || 'User',
        avatar_url: avatarUrl,
        organization_id: profile.organization_id,
        organizationId: profile.organization_id,
      };

      // Update last_login timestamp in profiles
      try {
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString(), status: 'active' })
          .eq('id', activeSignIn.user.id);
      } catch (lastLoginErr) {
        // Failed to update last_login – non-critical
      }

      localStorage.setItem('prospaces_keep_logged_in', keepLoggedIn ? 'true' : 'false');
      sessionStorage.setItem('prospaces_keep_logged_in', keepLoggedIn ? 'true' : 'false');
      sessionStorage.setItem('prospaces_session_active', 'true');

      onLogin(user, activeSignIn.session.access_token);
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex light">
      {/* Left Panel - Branding / Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1765277789186-04b71a9afd40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMGNvbnN0cnVjdGlvbiUyMG1vZGVybiUyMGludGVyaW9yfGVufDF8fHx8MTc3MTU4OTE2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Home renovation construction"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-indigo-900/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div />

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Welcome back,<br />
              <span className="text-blue-300">team member.</span>
            </h2>
            <p className="text-lg text-white/70 max-w-md leading-relaxed">
              Access your CRM dashboard, manage contacts, track bids, and collaborate with your team — all in one place.
            </p>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Secure access</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Lock className="h-4 w-4 text-blue-400" />
                <span>Encrypted</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} ProSpaces CRM. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-muted px-6 py-12 sm:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            {onBack && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to home
                </button>
              </div>
            )}

            {/* Logo at the top of the sign in content area */}
            <div className="flex justify-center mb-6">
              <Logo size="md" />
            </div>

            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Members Sign In
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enter your credentials to access your workspace.
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
              <Label htmlFor="member-email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                    setSuccessMessage('');
                  }}
                  required
                  className="pl-10 h-12 rounded-xl border-border bg-background focus:border-blue-500 focus:ring-blue-500/20 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="member-password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetLoading}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  {isResetLoading ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                  className="pl-10 pr-12 h-12 rounded-xl border-border bg-background focus:border-blue-500 focus:ring-blue-500/20 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label htmlFor="member-keep-logged-in" className="flex items-center gap-2 cursor-pointer text-sm text-foreground select-none">
                <input
                  id="member-keep-logged-in"
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-medium text-xs sm:text-sm">Keep me logged in</span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="pt-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Need desktop design tools?{' '}
              <a href="/project-wizards.html" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">
                Open Project Wizards
              </a>
              {' · '}
              <a href="/marketing.html" className="font-medium text-rose-600 hover:text-rose-800 transition-colors">
                Open Marketing Space
              </a>
              {' · '}
              <a href="/insights.html" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                Open Insights Space
              </a>
            </p>
            <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
              <a href="?view=privacy-policy" className="hover:text-muted-foreground transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-300">|</span>
              <a href="?view=terms-of-service" className="hover:text-muted-foreground transition-colors">
                Terms of Service
              </a>
            </div>
            <p className="text-xs text-muted-foreground lg:hidden">
              &copy; {new Date().getFullYear()} ProSpaces CRM
            </p>
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