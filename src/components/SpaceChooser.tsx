import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Wand2, Building2, ChevronRight, TrendingUp, BarChart3, Package, Monitor, MessageSquare, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { TrialCountdown } from './TrialCountdown';
import { canAccessSpace, canView, onPermissionsChanged } from '../utils/permissions';
import type { UserRole } from '../App';

/* ── Asset imports (shared with LandingPage) ── */
import grainOverlay from '../assets/landing/backgrounds/grain-overlay.svg';

let environmentBg: string | null = null;
try {
  // @ts-ignore
  environmentBg = new URL(/* @vite-ignore */ '../assets/landing/backgrounds/environment-bg.webp', import.meta.url).href;
} catch { /* no-op */ }

interface SpaceChooserProps {
  userRole: UserRole;
  onSelectSalesSpace: () => void;
  onSelectDesignSpace: () => void;
  onSelectMarketingSpace: () => void;
  onSelectInsightsSpace: () => void;
  onSelectInventorySpace: () => void;
  onSelectITSpace: () => void;
  onSelectMessagingSpace: () => void;
  onBack: () => void;
}

export function SpaceChooser({ userRole, onSelectSalesSpace, onSelectDesignSpace, onSelectMarketingSpace, onSelectInsightsSpace, onSelectInventorySpace, onSelectITSpace, onSelectMessagingSpace, onBack }: SpaceChooserProps) {
  const [hoveredCard, setHoveredCard] = useState<'sales' | 'design' | 'marketing' | 'insights' | 'inventory' | 'it' | 'messaging' | null>(null);
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
      setMobileNotice(`${spaceLabel} is desktop only. Please switch to a desktop or laptop to continue.`);
      return;
    }
    setMobileNotice(null);
    onDesktopSelect();
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden"
      style={{
        background: environmentBg
          ? `url(${environmentBg}) center / cover no-repeat`
          : 'linear-gradient(160deg, #F8FAFC 0%, #E2E8F0 50%, #F1F5F9 100%)',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Grain overlay */}
      {grainOverlay && (
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            backgroundImage: `url(${grainOverlay})`,
            backgroundRepeat: 'repeat',
            opacity: 0.4,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-6 pt-6 sm:pt-10 pb-12">
        {/* Top Header Row with Back button and Logo on the same line */}
        <div className="grid grid-cols-3 items-center w-full mb-8 sm:mb-10">
          {/* Back button (Left column) */}
          <div className="flex justify-start">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:gap-3 group"
              style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <LogOut className="h-4 w-4 transition-transform" />
              Exit ProSpaces CRM
            </motion.button>
          </div>

          {/* Logo (Center column) */}
          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Logo size="md" />
            </motion.div>
          </div>

          {/* Placeholder (Right column to balance the centering) */}
          <div className="flex justify-end invisible sm:visible">
            {/* Empty space */}
          </div>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-center mb-10"
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Choose your Space
          </h1>
          <p style={{ fontSize: 16, color: '#64748B', marginTop: 8 }}>
            You’re signed in — choose the space you want to enter.
          </p>

          {mobileNotice && (
            <div className="mt-4 inline-flex max-w-xl items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-left">
              <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.4 }}>{mobileNotice}</p>
            </div>
          )}
        </motion.div>

        {/* Trial Countdown Banner */}
        <TrialCountdown variant="banner" className="mb-6" />

        {/* Space cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sales Space → CRM */}
          {canAccessSpace('sales', userRole, 'view') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            onClick={onSelectSalesSpace}
            onMouseEnter={() => setHoveredCard('sales')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'sales'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'sales'
                  ? '1.5px solid rgba(30,111,217,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'sales'
                  ? '0 20px 50px rgba(30,111,217,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'sales' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #1E6FD9, #4DA3FF)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #1E6FD9 0%, #4DA3FF 100%)',
                  boxShadow: '0 8px 24px rgba(30,111,217,0.3)',
                }}
              >
                <Building2 className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Sales Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Access your CRM dashboard, manage contacts, track opportunities, and collaborate with your team.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#1E6FD9', fontWeight: 600, fontSize: 14 }}>
                Enter Sales Space
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}

          {/* Design Space → Project Wizards */}
          {canAccessSpace('design', userRole, 'view') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            onClick={() => handleDesktopOnlyClick('Design Space', onSelectDesignSpace)}
            onMouseEnter={() => setHoveredCard('design')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'design'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'design'
                  ? '1.5px solid rgba(99,102,241,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'design'
                  ? '0 20px 50px rgba(99,102,241,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'design' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #6366F1, #A78BFA)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                }}
              >
                <Wand2 className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Design Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Desktop 3D design tools for decks, garages, sheds, roofs, and kitchens with real-time material estimates.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#6366F1', fontWeight: 600, fontSize: 14 }}>
                Open Project Wizards
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}

          {/* Marketing Space */}
          {canAccessSpace('marketing', userRole, 'view') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            onClick={() => handleDesktopOnlyClick('Marketing Space', onSelectMarketingSpace)}
            onMouseEnter={() => setHoveredCard('marketing')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'marketing'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'marketing'
                  ? '1.5px solid rgba(225,29,72,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'marketing'
                  ? '0 20px 50px rgba(225,29,72,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'marketing' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #E11D48, #F97316)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #E11D48 0%, #F97316 100%)',
                  boxShadow: '0 8px 24px rgba(225,29,72,0.3)',
                }}
              >
                <TrendingUp className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Marketing Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Campaign automation, lead scoring, customer journeys, landing pages, referrals, and analytics.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#E11D48', fontWeight: 600, fontSize: 14 }}>
                Open Marketing Space
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}

          {/* Insights Space → Reports */}
          {canAccessSpace('insights', userRole, 'view') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            onClick={() => handleDesktopOnlyClick('Insights Space', onSelectInsightsSpace)}
            onMouseEnter={() => setHoveredCard('insights')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'insights'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'insights'
                  ? '1.5px solid rgba(99,102,241,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'insights'
                  ? '0 20px 50px rgba(99,102,241,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'insights' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                }}
              >
                <BarChart3 className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Insights Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Executive summaries, deal analytics, revenue tracking, and team performance reports.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#6366F1', fontWeight: 600, fontSize: 14 }}>
                Open Insights Space
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}

          {/* Inventory Space */}
          {canAccessSpace('inventory', userRole, 'view') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            onClick={() => handleDesktopOnlyClick('Inventory Space', onSelectInventorySpace)}
            onMouseEnter={() => setHoveredCard('inventory')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'inventory'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'inventory'
                  ? '1.5px solid rgba(16,185,129,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'inventory'
                  ? '0 20px 50px rgba(16,185,129,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'inventory' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #10B981, #14B8A6)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                }}
              >
                <Package className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Inventory Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Product catalog, SKU tracking, multi-tier pricing, stock levels, and reorder management.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#10B981', fontWeight: 600, fontSize: 14 }}>
                Open Inventory Space
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}

          {/* IT Space */}
          {canAccessSpace('it', userRole, 'view') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            onClick={onSelectITSpace}
            onMouseEnter={() => setHoveredCard('it')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'it'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'it'
                  ? '1.5px solid rgba(139,92,246,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'it'
                  ? '0 20px 50px rgba(139,92,246,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'it' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
                }}
              >
                <Monitor className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                IT Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                User management, security, billing, audit logs, scheduled jobs, and platform administration.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#8B5CF6', fontWeight: 600, fontSize: 14 }}>
                Open IT Space
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}

          {/* Messaging Space */}
          {canView('messages', userRole) && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.75 }}
            onClick={onSelectMessagingSpace}
            onMouseEnter={() => setHoveredCard('messaging')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <div
              className="relative overflow-hidden transition-all duration-300"
              style={{
                borderRadius: 20,
                padding: '36px 28px',
                background: hoveredCard === 'messaging'
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredCard === 'messaging'
                  ? '1.5px solid rgba(6,182,212,0.35)'
                  : '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: hoveredCard === 'messaging'
                  ? '0 20px 50px rgba(6,182,212,0.15), 0 8px 24px rgba(0,0,0,0.06)'
                  : '0 8px 32px rgba(0,0,0,0.06)',
                transform: hoveredCard === 'messaging' ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {/* Top gradient bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, #06B6D4, #0EA5E9)' }}
              />

              {/* Icon */}
              <div
                className="flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
                  boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
                }}
              >
                <MessageSquare className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Messaging Space
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Team chats, direct messages, customer portal conversations, and internal notes — all in one place.
              </p>

              {/* Arrow link */}
              <div className="flex items-center gap-1.5 transition-all duration-200 group-hover:gap-3" style={{ color: '#06B6D4', fontWeight: 600, fontSize: 14 }}>
                Open Messaging Space
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.button>
          )}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center mt-10"
          style={{ fontSize: 12, color: '#94A3B8' }}
        >
          &copy; {new Date().getFullYear()} ProSpaces CRM. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
