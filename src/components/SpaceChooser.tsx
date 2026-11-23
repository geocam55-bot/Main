import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wand2, Building2, TrendingUp, BarChart3, Package, Monitor, MessageSquare, LogOut, Truck, Sparkles, ShieldCheck, Info } from 'lucide-react';
import { Logo } from './Logo';
import { TrialCountdown } from './TrialCountdown';
import { ProfileThemeSwitch } from './ProfileThemeSwitch';
import { useTheme } from './ThemeProvider';
import { canAccessSpace, canView, onPermissionsChanged } from '../utils/permissions';
import type { UserRole } from '../App';

import grainOverlay from '../assets/landing/backgrounds/grain-overlay.svg';

interface SpaceChooserProps {
  userRole: UserRole;
  onSelectSalesSpace: () => void;
  onSelectDesignSpace: () => void;
  onSelectMarketingSpace: () => void;
  onSelectInsightsSpace: () => void;
  onSelectInventorySpace: () => void;
  onSelectITSpace: () => void;
  onSelectMessagingSpace: () => void;
  onSelectLogisticsSpace?: () => void;
  onBack: () => void;
}

interface SpaceConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderGlow: string;
  iconBg: string;
  textColor: string;
  onSelect: () => void;
  hasAccess: boolean;
  isDesktopOnly?: boolean;
}

export function SpaceChooser({
  userRole,
  onSelectSalesSpace,
  onSelectDesignSpace,
  onSelectMarketingSpace,
  onSelectInsightsSpace,
  onSelectInventorySpace,
  onSelectITSpace,
  onSelectMessagingSpace,
  onSelectLogisticsSpace,
  onBack,
}: SpaceChooserProps) {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileNotice, setMobileNotice] = useState<string | null>(null);
  const [, setPermissionVersion] = useState(0);

  useEffect(() => {
    return onPermissionsChanged(() => setPermissionVersion(v => v + 1));
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDesktopOnlyClick = (spaceLabel: string, onDesktopSelect: () => void) => {
    if (isMobile) {
      setMobileNotice(`${spaceLabel} is desktop-optimized. Please switch to a desktop or laptop to continue.`);
      return;
    }
    setMobileNotice(null);
    onDesktopSelect();
  };

  const formattedRoleName = String(userRole || 'User')
    .replace(/[_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  const spaces: SpaceConfig[] = [
    {
      id: 'sales',
      name: 'Sales Space',
      description: 'CRM dashboard, contacts, pipeline opportunities, customer quotes, meetings, and team accounts.',
      category: 'CRM & Sales',
      icon: Building2,
      gradient: 'from-blue-600 to-cyan-500',
      borderGlow: 'hover:border-blue-400 dark:hover:border-blue-500/50',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      onSelect: onSelectSalesSpace,
      hasAccess: canAccessSpace('sales', userRole, 'view'),
    },
    {
      id: 'design',
      name: 'Design Space',
      description: 'Desktop 3D design tools for decks, kitchens, sheds, and garages with instant material breakdowns.',
      category: '3D / Wizards',
      icon: Wand2,
      gradient: 'from-indigo-600 to-purple-500',
      borderGlow: 'hover:border-indigo-400 dark:hover:border-indigo-500/50',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      onSelect: () => handleDesktopOnlyClick('Design Space', onSelectDesignSpace),
      hasAccess: canAccessSpace('design', userRole, 'view'),
      isDesktopOnly: true,
    },
    {
      id: 'marketing',
      name: 'Marketing Space',
      description: 'Campaign automation, lead scoring, customer journeys, referral programs, and email outreach.',
      category: 'Growth',
      icon: TrendingUp,
      gradient: 'from-rose-600 to-orange-500',
      borderGlow: 'hover:border-rose-400 dark:hover:border-rose-500/50',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      textColor: 'text-rose-600 dark:text-rose-400',
      onSelect: () => handleDesktopOnlyClick('Marketing Space', onSelectMarketingSpace),
      hasAccess: canAccessSpace('marketing', userRole, 'view'),
      isDesktopOnly: true,
    },
    {
      id: 'insights',
      name: 'Insights Space',
      description: 'Executive summaries, revenue analytics, deal velocity metrics, and team performance dashboards.',
      category: 'Analytics',
      icon: BarChart3,
      gradient: 'from-sky-600 to-teal-500',
      borderGlow: 'hover:border-sky-400 dark:hover:border-sky-500/50',
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
      textColor: 'text-sky-600 dark:text-sky-400',
      onSelect: () => handleDesktopOnlyClick('Insights Space', onSelectInsightsSpace),
      hasAccess: canAccessSpace('insights', userRole, 'view'),
      isDesktopOnly: true,
    },
    {
      id: 'inventory',
      name: 'Inventory Space',
      description: 'SKU catalog, multi-tier pricing, stock level adjustments, warehouse tracking, and reorder alerts.',
      category: 'Stock',
      icon: Package,
      gradient: 'from-emerald-600 to-green-500',
      borderGlow: 'hover:border-emerald-400 dark:hover:border-emerald-500/50',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      onSelect: () => handleDesktopOnlyClick('Inventory Space', onSelectInventorySpace),
      hasAccess: canAccessSpace('inventory', userRole, 'view'),
      isDesktopOnly: true,
    },
    {
      id: 'logistics',
      name: 'Logistics & Fleet',
      description: 'Commercial fleet tracking, live OCR document parsing, freight boards, cargo manifests, and driver portals.',
      category: 'Fleet & Dispatch',
      icon: Truck,
      gradient: 'from-blue-600 to-indigo-600',
      borderGlow: 'hover:border-blue-400 dark:hover:border-blue-500/50',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      onSelect: () => (onSelectLogisticsSpace ? onSelectLogisticsSpace() : (sessionStorage.setItem('accessed_from_crm', 'true'), window.location.href = '/logistics?from=crm')),
      hasAccess: canAccessSpace('logistics', userRole, 'view'),
    },
    {
      id: 'it',
      name: 'IT Space',
      description: 'User role assignments, security controls, billing, audit logs, import/export, and tenant settings.',
      category: 'Admin & Security',
      icon: Monitor,
      gradient: 'from-purple-600 to-pink-500',
      borderGlow: 'hover:border-purple-400 dark:hover:border-purple-500/50',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      onSelect: onSelectITSpace,
      hasAccess: canAccessSpace('it', userRole, 'view'),
    },
    {
      id: 'messaging',
      name: 'Messaging Space',
      description: 'Team chats, direct messages, customer conversation threads, and shared notes in real time.',
      category: 'Communication',
      icon: MessageSquare,
      gradient: 'from-cyan-600 to-blue-500',
      borderGlow: 'hover:border-cyan-400 dark:hover:border-cyan-500/50',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      onSelect: onSelectMessagingSpace,
      hasAccess: canView('messages', userRole),
    },
  ];

  const accessibleSpaces = spaces.filter(s => s.hasAccess);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200"
      style={{
        background: 'var(--gradient, var(--color-background))',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background radial glow & grain */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(30,111,217,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_60%)] pointer-events-none" />
      {grainOverlay && isDark && (
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            backgroundImage: `url(${grainOverlay})`,
            backgroundRepeat: 'repeat',
            opacity: 0.2,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Main Container */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-6 pt-6 pb-16 flex flex-col min-h-screen justify-between">
        <div>
          {/* Top Navigation / Brand Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all bg-white/90 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit CRM</span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center space-x-3"
            >
              <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Logo size="sm" />
              </div>
            </motion.div>

            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Role: <strong className="text-slate-900 dark:text-white">{formattedRoleName}</strong></span>
              </div>
              <ProfileThemeSwitch variant="pill" />
            </div>
          </div>

          {/* Title Header */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-center mb-8 space-y-2"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>Workspace Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Select Your Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Hover over any workspace icon for details, or click to launch your authorized environment.
            </p>

            {mobileNotice && (
              <div className="mt-3 inline-flex max-w-md items-center rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 px-3 py-2 text-left dark:text-amber-200 text-xs">
                <span>{mobileNotice}</span>
              </div>
            )}
          </motion.div>

          {/* Trial Countdown Banner */}
          <div className="mb-6">
            <TrialCountdown variant="banner" className="bg-white/90 border-slate-200 text-slate-700 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300 rounded-xl" />
          </div>

          {/* Refined Compact Icon Grid with Tooltips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {accessibleSpaces.map((space, index) => {
              const IconComponent = space.icon;
              const isTooltipActive = activeTooltip === space.id;

              return (
                <motion.div
                  key={space.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative group"
                  onMouseEnter={() => setActiveTooltip(space.id)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <button
                    type="button"
                    onClick={space.onSelect}
                    className={`w-full bg-white/95 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 ${space.borderGlow} rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg dark:shadow-lg flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1`}
                  >
                    {/* Top gradient indicator */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${space.gradient} opacity-80 group-hover:opacity-100`} />

                    {/* Refined Icon */}
                    <div className={`w-14 h-14 rounded-2xl ${space.iconBg} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                      <IconComponent className="h-7 w-7" />
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300 transition-colors mb-1">
                      {space.name}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {space.category}
                    </span>
                  </button>

                  {/* Modern Floating Tooltip on Hover */}
                  {isTooltipActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md z-50 text-left pointer-events-none"
                    >
                      <div className="flex items-center space-x-1.5 mb-1 text-xs font-bold text-slate-900 dark:text-white">
                        <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{space.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {space.description}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        <span>Click to launch workspace</span>
                        <span>&rarr;</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center mt-12 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500"
        >
          &copy; {new Date().getFullYear()} ProSpaces CRM. Modern Workspace Launcher.
        </motion.div>
      </div>
    </div>
  );
}

